import json, os
from openai import OpenAI
from flask import session
from db_process import save_user_memory, save_user_messages, history_messages
from utils import count_chars

#model = "deepseek-chat"
#model_r = "deepseek-reasoner"
#client = OpenAI(api_key = os.environ.get('DEEPSEEK_API_KEY'), base_url = "https://api.deepseek.com/v1")
#model = os.getenv('SF_MODEL') or "Qwen/Qwen2-7B-Instruct"
model = "deepseek-ai/DeepSeek-V3"
#model_r = "deepseek-ai/DeepSeek-R1"
client = OpenAI(api_key = os.environ.get('SF_API_KEY'), base_url = "https://api.siliconflow.cn/v1")
#client_tpp = OpenAI(api_key = os.environ.get('TOGETHER_API_KEY'), base_url = "https://api.together.xyz/v1")
model_r = "accounts/fireworks/models/deepseek-r1"
client_tpp = OpenAI(api_key = os.environ.get('FIREWORKS_API_KEY'), base_url = "https://api.fireworks.ai/inference/v1")

param_temperature = 1 if model.startswith('deepseek') else 0.5
param_n = 1

def Chat_Completion(model, question, tem, messages, max_output_tokens, stream, n=param_n):
    try:
        messages.append({"role": "system", "content": "原则：避免输出简略化。"})
        messages.append({"role": "user", "content": question})
        print("generate_text:", messages[-1]["content"][:250])
        print("MODEL:", model)

        params = {
            "model": model,
            "messages": messages,
            "temperature": tem if not 'R1' in model else 0.7,  # 仅为 together 特殊设置
            "stream": stream,
            "top_p": 1.0,
            "n": n,
            "max_tokens": max_output_tokens,
            "frequency_penalty": 0,
            "presence_penalty": 0
        }

        client_act = client_tpp if 'r1' in model.lower() else client
        response = client_act.chat.completions.create(**params)
        
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

def interact_with_deepseek(user_id, thread_id, user_input, prompt, prompt_template, user_model, messages=None):
    messages = [] if messages is None else messages
    res = None
    full_message = ''
    max_output_tokens = 8192
    tem = 1.3 if user_input.startswith(('总结', '写作')) or any(item in prompt_template[0] for item in ['写作', '改写' '脚本']) else param_temperature

    model_ds = {
        "V3": model,
        "R1": model_r,
    }.get(user_model, model)

    try:
        for res in Chat_Completion(model_ds, prompt, tem, messages, max_output_tokens, True):
            if 'content' in res and res['content']:
                markdown_message = res['content']  # generate_markdown_message(res['content'])
                # print(f"Yielding markdown_message: {markdown_message}")  # 添加这一行
                # token_counter += 1
                full_message += res['content'] if not res['content'].lstrip().startswith('*-*') else ''
                yield f"data: {json.dumps({'data': markdown_message})}\n\n" # 将数据序列化为JSON字符串
    finally:
        messages.append({"role": "assistant", "content": full_message})
        if full_message and any(item in prompt_template[0] for item in ['文档', '总结', '写', '润色']):
            join_message = "".join([str(msg["content"]) for msg in messages])
            info = count_chars(join_message, user_id, messages)
            save_user_memory(user_id, thread_id, user_input, full_message, info)
        if 'Chat' in prompt_template[0]:
            # print("精简前messages:", messages[-1])
            if len(messages) > 4:
                messages = messages[-4:] #对话仅保留最新rows条
            save_user_messages(user_id, messages) # 清空历史记录
