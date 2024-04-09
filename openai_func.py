from settings import client, hub, BASE_URL, MODEL, MODEL_16k, model_8k, model_32k
import json, random
from flask import session
from db_process import save_user_memory, save_user_messages, history_messages
from utils import num_tokens, count_chars

param_temperature = 0.5
param_n = 1 #if hub and BASE_URL == "https://api.moonshot.cn/v1" else 2

def gpt_response(question, model=MODEL_16k):
    messages = [{"role": "user", "content": question}]
    response = client.chat.completions.create(
    model= model,
    messages= messages,
    temperature=param_temperature,
    top_p=1.0,
    frequency_penalty=0,
    presence_penalty=0
    )
    return response.choices[0].message.content

def Chat_Completion(model, question, tem, messages, max_output_tokens, stream, n=param_n):
    try:
        messages.append({"role": "system", "content": "原则：避免输出简略化。"})
        messages.append({"role": "user", "content": question})
        print("generate_text:", messages[-1]["content"][:250])
        if hub and BASE_URL == "https://burn.hair/v1":
            tem += round(random.uniform(-0.1, 0.1), 2)
            
        params = {
            "model": model,
            "messages": messages,
            "temperature": tem,
            "stream": stream,
            "top_p": 1.0,
            "n": n,
            "frequency_penalty": 0,
            "presence_penalty": 0
        }
        if model.startswith(("moonshot" ,"yi")):
            params["max_tokens"] = max_output_tokens
        response = client.chat.completions.create(**params)
        
        if not stream:
            print(f"{response.usage}\n")
            session['tokens'] = response.usage.total_tokens
            return response.choices[0].message.content
        else:
            text=[''] * n
            chunk_count = 0

            for chunk in response:
                if not chunk or not chunk.choices[0].delta:
                    continue

                choice = chunk.choices[0]
                # print("Decoded chunk:", choice)  # 添加这一行以打印解码的块
                content = choice.delta.content if choice.delta.content else ""
                
                if choice.index == 0:
                    # 对于第一个choice，立即输出并重置chunk_count
                    chunk_count = 0
                    yield {'content': content}
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
        return response
        
    except Exception as e:
        print(e)
        return "Connection Error! Please try again."

def interact_with_openai(user_id, thread_id, user_input, prompt, prompt_template, n, messages=None):
    messages = [] if messages is None else messages
    res = None
    full_message = ''
    max_output_tokens = 4096
    tem = 0.8 if user_input.startswith(('总结', '写作')) or any(item in prompt_template[0] for item in ['写作', '改写' '脚本']) else param_temperature

    if hub and BASE_URL == "https://api.moonshot.cn/v1":
        input_tokens = num_tokens(prompt)
        print(input_tokens)
        if input_tokens <= 6400:
            model = model_8k
            max_output_tokens = 8000-input_tokens
            if n > 1 and max_output_tokens<3000:
                n = 1
        else:
            model = model_32k
    else:
        model = MODEL if user_input.startswith(('总结', '写作')) else MODEL_16k

    try:
        for res in Chat_Completion(model, prompt, tem, messages, max_output_tokens, True, n):
            if 'content' in res and res['content']:
                markdown_message = res['content']  # generate_markdown_message(res['content'])
                # print(f"Yielding markdown_message: {markdown_message}")  # 添加这一行
                # token_counter += 1
                full_message += res['content'] if not res['content'].lstrip().startswith('*-*') else ''
                yield f"data: {json.dumps({'data': markdown_message})}\n\n" # 将数据序列化为JSON字符串
    finally:
        messages.append({"role": "assistant", "content": full_message})
        join_message = "".join([str(msg["content"]) for msg in messages])
        info = count_chars(join_message, user_id, messages)
        if full_message and any(item in prompt_template[0] for item in ['文档', '总结', '写', '润色']):
            save_user_memory(user_id, thread_id, user_input, full_message, info)
        rows = history_messages(user_id, prompt_template[0]) # 获取对应的历史记录条数
        if rows != 0:
            print("精简前messages:", messages[-1])
            if len(messages) > rows:
                messages = messages[-rows:] #对话仅保留最新rows条
            save_user_messages(user_id, messages) # 清空历史记录
        # session['messages'] = messages
