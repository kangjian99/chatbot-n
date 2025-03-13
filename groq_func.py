import os, json
from groq import Groq
from db_process import save_user_memory
from utils import count_chars, TEMPLATE_SAVE

client = Groq(
    api_key=os.environ.get("GROQ_API_KEY"),
)

model = "gemma2-9b-it"

def groq_response(query):
    chat_completion = client.chat.completions.create(
        messages=[{"role": "system", "content": "用中文回复，Skip the preamble."}, {"role": "user", "content": query}],
        model=model,
    )
    return chat_completion.choices[0].message.content

def groq_response_stream(query):
    response = client.chat.completions.create(
        messages=[{"role": "system", "content": "用中文回复"}, {"role": "user", "content": query}],
        model=model,
        stream=True
    )
    for chunk in response:
        if not chunk or not chunk.choices[0].delta:
            continue
        choice = chunk.choices[0]
        content = choice.delta.content if choice.delta.content else ""
        if content:
            yield f"data: {json.dumps({'data': content})}\n\n"

        if choice.finish_reason == "stop":
            break

def interact_with_groq(user_id, thread_id, user_input, prompt, prompt_template, user_model, messages=None):
    messages = [] if messages is None else messages
    full_message = ''

    messages.append({"role": "system", "content": "用中文回复,避免输出简略化"})
    messages.append({"role": "user", "content": prompt})

    model_groq = {
        "Llama3": "llama-3.3-70b-versatile",
        "Gemma": "gemma2-9b-it",
        "qwq": "qwen-qwq-32b",
    }.get(user_model, model)

    response = client.chat.completions.create(
        messages=messages,
        model=model_groq,
        stream=True
    )
    for chunk in response:
        if not chunk or not chunk.choices[0].delta:
            continue
        choice = chunk.choices[0]
        content = choice.delta.content if choice.delta.content else ""
        if content:
            full_message += content
            yield f"data: {json.dumps({'data': content})}\n\n"

        if choice.finish_reason == "stop":
            break

    if full_message and any(item in prompt_template[0] for item in TEMPLATE_SAVE):
        messages.append({"role": "assistant", "content": full_message})
        join_message = "".join([str(msg["content"]) for msg in messages])
        info = count_chars(join_message, user_id, messages)
        save_user_memory(user_id, thread_id, user_input, full_message, info)
