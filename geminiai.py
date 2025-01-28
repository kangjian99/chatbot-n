import google.generativeai as genai
import os, json
#import PIL.Image
from db_process import save_user_memory, save_user_messages
from utils import count_chars, TEMPLATE_SAVE

genai.configure(api_key=os.getenv('GOOGLE_API_KEY'))

safety_settings = [
    {
        "category": "HARM_CATEGORY_HARASSMENT",
        "threshold": "BLOCK_NONE"
    },
    {
        "category": "HARM_CATEGORY_HATE_SPEECH",
        "threshold": "BLOCK_NONE"
    },
    {
        "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
        "threshold": "BLOCK_ONLY_HIGH"
    },
    {
        "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
        "threshold": "BLOCK_NONE"
    }
]

generation_config = {
    "max_output_tokens": 8192,
}

MODEL = os.getenv('GEMINI_MODEL') or "gemini-2.0-flash-exp"
#model = genai.GenerativeModel(model_name="gemini-exp-1206",
#model = genai.GenerativeModel(model_name="gemini-2.0-flash-thinking-exp-01-21",
model = genai.GenerativeModel(model_name=MODEL, 
                              #system_instruction="你是语言分析与写作专家，避免输出过于简略化", 
                              safety_settings=safety_settings,
                              generation_config=generation_config)
#model_v = genai.GenerativeModel('gemini-pro-vision', safety_settings)

def gemini_response_stream(query):
    response = model.generate_content(query,
                                      generation_config={"max_output_tokens": 8192},
                                      stream=True)

    for chunk in response:
        print(chunk.text)
        print("_"*80)
        yield(f"data: {json.dumps({'data': chunk.text})}\n\n")

def gemini_response(query):
    response = model.generate_content(query)
    return response.text

def interact_with_gemini(user_id, thread_id, user_input, query, prompt_template, n, messages=None):
    messages = [] if messages is None else messages
    chat = model.start_chat(history = messages)
    response = chat.send_message(query, stream=True)

    full_message = ''
    for chunk in response:
        full_message += chunk.text
        yield(f"data: {json.dumps({'data': chunk.text})}\n\n")

    messages.append({"role": "user", "parts": query})
    messages.append({"role": "model", "parts": full_message})

    if full_message and any(item in prompt_template[0] for item in TEMPLATE_SAVE):
        join_message = "".join([str(msg["parts"]) for msg in messages])
        info = count_chars(join_message, user_id)
        save_user_memory(user_id, thread_id, user_input, full_message, info)

    if 'Chat' in prompt_template[0]:
        # print("精简前messages:", messages[-1])
        if len(messages) > 2:
            messages = messages[-2:] #对话仅保留最新2条
        save_user_messages(user_id, messages)
