from settings import CLIENT, HUB, MODEL, model_alt_map, client_alt_map, MODEL_alt, CLIENT_alt, HUB_alt, HUB_reasoning_content
import json, random, time
from flask import session
from db_process import save_user_memory, save_user_messages, history_messages
from utils import count_chars, num_tokens, is_writing_request, TEMPLATE_SAVE

param_temperature = 0.5 if not MODEL.startswith("o") else 1
param_n = 1 #if hub and BASE_URL == "https://api.moonshot.cn/v1" else 2
MAX_OUTPUT_TOKENS = 16384  # GPT-4o与R1的最大输出限制

ChatGPT_system = "You are ChatGPT, a large language model trained by OpenAI. " if not HUB or HUB == "burn" else ""
system_message_content = "原则：避免输出简略化。"

def gpt_response(question, model=MODEL):
    messages = [{"role": "user", "content": question}]
    response = CLIENT.chat.completions.create(
    model= model,
    messages= messages,
    temperature=param_temperature,
    top_p=1.0,
    frequency_penalty=0,
    presence_penalty=0
    )
    return response.choices[0].message.content

def process_reasoning_chunk(choice, think_opened, think_closed):
    content = ""  # 初始化 content 变量
    reasoning_content = getattr(choice.delta, 'reasoning_content', None)
    content_part = getattr(choice.delta, 'content', None)
    
    # 处理 reasoning_content
    if reasoning_content:
        if not think_opened:
            content += "<think>\n"  # 第一次出现 reasoning_content 时加上 <think>
            think_opened = True
        content += reasoning_content

    # 处理 content_part
    if think_opened and not think_closed and content_part:
        content += "</think>"  # 在第一次出现 content 时加上 </think>
        think_closed = True

    if content_part:
        content += content_part

    return content, think_opened, think_closed

def Chat_Completion(client, model, question, tem, messages, hub, stream, n=param_n):
    try:
        if not any(x in model.lower() for x in ['r1', 'reason']) and not model.startswith(('ep-', 'o')):
            messages.append({"role": "system", "content": ChatGPT_system + system_message_content})
        messages.append({"role": "user", "content": question})
        print("generate_text:", messages[-1]["content"][:250])
        if hub == "burn":
            tem += round(random.uniform(-0.1, 0.1), 2)
            
        params = {
            "model": model,
            "messages": messages,
            "temperature": tem,
            "stream": stream,
            "top_p": 1.0,
            "n": n,
            #"frequency_penalty": 0,
            #"presence_penalty": 0
        }
        #print("MODEL:", model)
        max_output_tokens = 8192 if hub == 'ark' or hub == 'tg' else MAX_OUTPUT_TOKENS
        if 'r1' in model.lower() or model.startswith("ep-") or model.startswith("gpt-4o"):
            params["max_tokens"] = max_output_tokens
        
        start_time = time.time()
        try:
            response = client.chat.completions.create(**params)
            # 检查是否超时
            latency = time.time() - start_time
            if latency > 10:
                print("*主客户端响应超时，切换到备用客户端*\n")
                model_alt = model_alt_map.get(HUB_alt, model)
                client_alt = client_alt_map.get(HUB_alt, client)
                messages = []
                yield from Chat_Completion(
                    client_alt, 
                    model_alt, 
                    question, 
                    tem, 
                    messages, 
                    HUB_alt, 
                    stream, 
                    n
                )
                return
            else:
                print(f"*主客户端响应时间*: {hub} {model}: {latency:.2f}s")
        except Exception as e:
            print(f"*主客户端请求失败*:\n {e}")
            model_alt = model_alt_map.get(HUB_alt, model)
            client_alt = client_alt_map.get(HUB_alt, client)
            messages = []
            yield from Chat_Completion(
                client_alt, 
                model_alt, 
                question, 
                tem, 
                messages, 
                HUB_alt, 
                stream, 
                n
            )
            return

        if not stream:
            print(f"{response.usage}\n")
            session['tokens'] = response.usage.total_tokens
            return response.choices[0].message.content
        else:
            text=[''] * n
            chunk_count = 0
            think_opened = False  # 用来标记 <think> 是否已经打开
            think_closed = False  # 用来标记 </think> 是否已经关闭
            response_info = {
                'latency': latency,
                'model': model,
                'hub': hub
            }
            
            for chunk in response:
                if not chunk or not chunk.choices[0].delta:
                    continue

                choice = chunk.choices[0]
                # print("Decoded chunk:", choice)  # 添加这一行以打印解码的块
                
                if hub in HUB_reasoning_content:
                    content, think_opened, think_closed = process_reasoning_chunk(choice, think_opened, think_closed)
                else:
                    content = choice.delta.content if choice.delta.content else ""

                if choice.index == 0:
                    # 对于第一个choice，立即输出并重置chunk_count
                    chunk_count = 0
                    yield {'content': content, **response_info}
                else:
                    # 对于其他choices，暂存内容
                    text[choice.index] += content
                    # print(choice.index, text[choice.index])
                    chunk_count += 1
                    if chunk_count > 6:
                        yield {'content': "\n*-*请等待全部输出完毕*-*"}

                if choice.finish_reason == "stop":
                    break
            # 在所有响应处理完毕后，输出暂存变量中的内容
            if text[1]:
                combined_content = '\n'.join([f"{'*'*3}\n回复 {n+2}：\n{choice}" for n, choice in enumerate(text[1:])])
                yield {'content': '\n'+combined_content}
        
    except Exception as e:
        print(e)
        return "Connection Error! Please try again."

def interact_with_openai(user_id, thread_id, user_input, prompt, prompt_template, n, messages=None):
    messages = [] if messages is None else messages
    res = None
    full_message = ''
    tem = 0.7 if is_writing_request(user_input, prompt_template) else param_temperature
    hub = HUB
    model = MODEL
    client = CLIENT

    if hub in model_alt_map:
        hub =["tg", "nv", "nov", "sf"][random.randint(0, 3)]
        model = model_alt_map[hub]
        client = client_alt_map[hub]
        print(f"随机分配客户端: {hub} {model}")

    if model == "gpt-4o-free" and num_tokens(prompt) < 1200:
        model = "gpt-4o"
    if hub in model_alt_map and any(item in model.lower() for item in ('r1', 'ep-')) and not is_writing_request(user_input, prompt_template):
        #model = model_alt_map[hub]
        model = MODEL_alt
        client = CLIENT_alt
    if "deepseek" in model:
        tem = 0.6

    try:
        for res in Chat_Completion(client, model, prompt, tem, messages, hub, True, n):
            if 'content' in res and res['content']:
                markdown_message = res['content']  # generate_markdown_message(res['content'])
                # print(f"Yielding markdown_message: {markdown_message}")  # 添加这一行
                # token_counter += 1
                full_message += res['content'] if not res['content'].lstrip().startswith('*-*') else ''
                yield f"data: {json.dumps({'data': markdown_message})}\n\n" # 将数据序列化为JSON字符串
    finally:
        messages.append({"role": "assistant", "content": full_message})
        join_message = "".join([str(msg["content"]) for msg in messages])
        if 'latency' in res:
            latency_info = f"({res['hub']}){res['model']}: {res['latency']:.2f}s"
        info = count_chars(join_message, user_id)
        if full_message and any(item in prompt_template[0] for item in TEMPLATE_SAVE):
            save_user_memory(user_id, thread_id, user_input, full_message, info, latency_info)
        rows = 2 if 'Chat' in prompt_template[0] else 0 # history_messages(user_id, prompt_template[0]) # 获取对应的历史记录条数
        if rows != 0:
            print("精简前messages:", messages[-1])
            if len(messages) > rows:
                messages = messages[-rows:] #对话仅保留最新rows条
            save_user_messages(user_id, messages) # 清空历史记录
        # session['messages'] = messages
