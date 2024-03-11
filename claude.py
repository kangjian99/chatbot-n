import anthropic
import os, json
from db_process import save_user_memory
from utils import count_chars

c_api_key = os.getenv('CLAUDE_API_KEY')
model="claude-3-sonnet-20240229"

client = anthropic.Anthropic(api_key=c_api_key)
      
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

    with client.messages.stream(
        messages=[{"role": "user", "content": prompt}],
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
            if any(item in prompt_template[0] for item in ['文档', '总结']):
                save_user_memory(user_id, thread_id, user_input, full_message, info)