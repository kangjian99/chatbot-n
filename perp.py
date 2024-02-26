import os, json, requests

p_api_key = os.getenv('P_API_KEY')

def perplexity_response(query, stream=False):
    url = "https://api.perplexity.ai/chat/completions"

    payload = {
        "model": "mixtral-8x7b-instruct", #"mixtral-8x7b-instruct",
        "messages": [
            {
                "role": "system",
                "content": "始终用中文回复, be precise and concise."
            },
             {
                "role": "user",
                "content": query,
            }
        ],
        "temperature": 0.5,
        "stream": stream,
    }
    headers = {
        "accept": "application/json",
        "content-type": "application/json",
        "authorization": f"Bearer {p_api_key}"
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