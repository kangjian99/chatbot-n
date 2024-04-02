import anthropic
import os, json
from db_process import save_user_memory
from utils import count_chars

c_api_key = os.getenv('CLAUDE_API_KEY')
#model="claude-3-sonnet-20240229"
model_s="claude-3-haiku-20240307"
model_l="claude-3-opus-20240229"
model=os.getenv('CLAUDE_MODEL') or model_s

client = anthropic.Anthropic(api_key=c_api_key)

def claude_response(query, model=model_s):
    response = client.messages.create(
        system="Skip the preamble.",
        messages=[{"role": "user", "content": query}],
        model=model,
        max_tokens=1024,
    )
    return response.content[0].text

def claude_response_stream(query):

    with client.messages.stream(
        messages=[{"role": "user", "content": query}],
        model=model,
        max_tokens=4096,
    ) as stream:

        for chunk in stream.text_stream:
            if chunk:
                yield(f"data: {json.dumps({'data': chunk})}\n\n")

def interact_with_claude(user_id, thread_id, user_input, prompt, prompt_template, n, messages=None):
    messages = [] if messages is None else messages
    full_message = ''

    #if '文档' in prompt_template[0] and user_input.startswith(('总结', '写作')) or '润色' in prompt_template[0] :
    #    model = model_l

    messages.append({"role": "user", "content": prompt})
    messages.append({"role": "assistant", "content": "我的回复会避免简略化："})   # Prefill
    with client.messages.stream(
        system="对于写作需求，避免输出过于简略化",
        messages=messages,
        model=model,
        max_tokens=4096,
    ) as stream:
        try:
            for chunk in stream.text_stream:
                if chunk:
                    full_message += chunk
                    yield(f"data: {json.dumps({'data': chunk})}\n\n")
        finally:
            messages.append({"role": "assistant", "content": full_message})
            join_message = "".join([str(msg["content"]) for msg in messages])
            info = count_chars(join_message, user_id, messages)
            if any(item in prompt_template[0] for item in ['文档', '总结', '文章', '润色']):
                save_user_memory(user_id, thread_id, user_input, full_message, info)