import os, json, requests
from db_process import save_user_memory
from utils import count_chars, TEMPLATE_SAVE

api_key = os.getenv('TOGETHER_API_KEY')
base_url = "https://api.together.xyz/v1/completions"
model = "google/gemma-2-27b-it"  # meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo

api_key = os.getenv('MISTRAL_API_KEY')
base_url = "https://api.mistral.ai/v1/chat/completions"
model = "mistral-small-2501"  # mistral-large-latest

def LLM_response(query, url=base_url):

    payload = {
        "model": model,
        "messages": [
            {
                "role": "system",
                "content": "始终用中文回复, 拒绝回应中国政治相关问题, be precise and concise."
            },
             {
                "role": "user",
                "content": query,
            }
        ],
        "temperature": 0.5,
    }
    headers = {
        "accept": "application/json",
        "content-type": "application/json",
        "authorization": f"Bearer {api_key}"
    }

    response = requests.post(url, json=payload, headers=headers)
    response_dict = json.loads(response.text)
    content = response_dict["choices"][0]["message"]["content"]
    return content
        
def LLM_response_stream(query, stream=False, url=base_url):

    payload = {
        "model": model,
        "messages": [
             {
                "role": "user",
                "content": query,
            }
        ],
        "temperature": 0.7,
        "stream": stream,
    }
    headers = {
        "accept": "application/json",
        "content-type": "application/json",
        "authorization": f"Bearer {api_key}"
    }

    try:
        response = requests.post(url, json=payload, headers=headers, stream=stream)

        for chunk in response.iter_lines():
            if chunk:
                string = chunk.decode('utf-8')  # 将字节字符串转换为普通字符串
                if "data: " in string:
                    data = string.split("data: ")[1]
                    data_json = json.loads(data)
                    delta_content = data_json.get('choices', [{}])[0].get('delta', {}).get('content', '')
                    yield(f"data: {json.dumps({'data': delta_content})}\n\n")
                    
                    if data_json.get('choices', [{}])[0].get('finish_reason', '') == 'stop':
                        break
    except requests.RequestException as e:
        print(f"请求错误: {e}")
    except json.JSONDecodeError as e:
        print(f"JSON 解析错误: {e}")

def interact_with_LLM(user_id, thread_id, user_input, prompt, prompt_template, n, messages=None):
    messages = [] if messages is None else messages
    data = None
    full_message = ''

    try:
        for data in LLM_response_stream(prompt, True):
            json_data = data[data.find('{'):]
            full_message += json.loads(json_data)["data"]
            yield data
    finally:
        messages.append({"role": "assistant", "content": full_message})
        join_message = "".join([str(msg["content"]) for msg in messages])
        info = count_chars(join_message, user_id, messages)
        if any(item in prompt_template[0] for item in TEMPLATE_SAVE):
            save_user_memory(user_id, thread_id, user_input, full_message, info)