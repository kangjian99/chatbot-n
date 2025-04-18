import os, json
#import PIL.Image
from db_process import save_user_memory, save_user_messages
from utils import count_chars, is_writing_request, TEMPLATE_SAVE
from google import genai
from google.genai import types

client = genai.Client(api_key=os.getenv('GOOGLE_API_KEY'))

safety_settings = [
    types.SafetySetting(
        category=types.HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold=types.HarmBlockThreshold.BLOCK_NONE
    ),
    types.SafetySetting(
        category=types.HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold=types.HarmBlockThreshold.BLOCK_NONE
    ),
    types.SafetySetting(
        category=types.HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold=types.HarmBlockThreshold.BLOCK_ONLY_HIGH
    ),
    types.SafetySetting(
        category=types.HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold=types.HarmBlockThreshold.BLOCK_NONE
    )
]

# Define base generation configs per model
base_generation_configs = {
    "gemini-2.0-flash-thinking-exp-01-21": {"max_output_tokens": 65536},
    "gemini-2.5-flash-preview-04-17": {"max_output_tokens": 65536},
    "gemini-2.5-pro-exp-03-25": {"max_output_tokens": 65536},
}
DEFAULT_MAX_TOKENS = 8192

# Define default models
MODEL_FLASH = "gemini-2.5-flash-preview-04-17"
MODEL_PRO = os.getenv('GEMINI_PRO_MODEL', "gemini-2.5-pro-exp-03-25")
MODEL_PRO = "gemini-2.5-pro-exp-03-25" # Override if needed

# Helper function to create the config object
def get_generation_config(model_name: str, system_instruction: str = None, thinking_budget: int = None) -> types.GenerateContentConfig:
    config_dict = base_generation_configs.get(model_name, {"max_output_tokens": DEFAULT_MAX_TOKENS}).copy()
    if system_instruction:
        config_dict['system_instruction'] = system_instruction
    if thinking_budget is not None:
        config_dict['thinking_config'] = types.ThinkingConfig(thinking_budget=thinking_budget)

    return types.GenerateContentConfig(
        **config_dict,
        safety_settings=safety_settings,
    )

def gemini_response_stream(query, model_name=MODEL_FLASH):
    """Generates content using streaming with the specified model."""
    config = get_generation_config(model_name)

    try:
        response_stream = client.models.generate_content_stream(
            model=model_name,
            contents=query,
            config=config
        )
        for chunk in response_stream:
            if hasattr(chunk, 'text') and chunk.text:
                yield(f"data: {json.dumps({'data': chunk.text})}\n\n")
    except Exception as e:
        yield(f"data: {json.dumps({'error': f'API error: {e}'})}\n\n")


def gemini_response(query, model_name=MODEL_FLASH):
    """Generates content non-streaming with the specified model."""
    config = get_generation_config(model_name)

    try:
        response = client.models.generate_content(
            model=model_name,
            contents=query,
            config=config
        )
        if not response.candidates:
             block_reason = response.prompt_feedback.block_reason if response.prompt_feedback else 'unknown'
             return f"Error: Content blocked ({block_reason})."
        return response.text
    except Exception as e:
        return f"Error: API error - {e}"


def interact_with_gemini(user_id, thread_id, user_input, query, prompt_template, n, messages=None):
    """Handles interactive chat sessions, streaming the response."""
    messages = [] if messages is None else messages

    prompt_key = prompt_template[0] if prompt_template else ""
    use_pro_model = is_writing_request(user_input, prompt_template)
    model_name_to_use = MODEL_PRO if use_pro_model else MODEL_FLASH

    # Format history for the new SDK
    formatted_history = []
    for msg in messages:
        role = msg.get("role")
        parts = msg.get("parts")
        if role and parts is not None:
            part_objects = []
            if isinstance(parts, str):
                part_objects.append(types.Part(text=parts))
            else: # parts 不是字符串
                print(f"Warning: Skipping parts of unexpected type: {type(parts)}")

            formatted_history.append(types.Content(role=role, parts=part_objects))


    system_instruction = "你是语言分析与写作专家，避免输出过于简略化"

    full_message = ''
    try:
        chat = client.chats.create(
            model=model_name_to_use,
            history=formatted_history,
            #system_instruction=system_instruction
        )
        if model_name_to_use == "gemini-2.5-flash-preview-04-17" and not use_pro_model:
            config = get_generation_config(model_name_to_use, system_instruction=None, thinking_budget=0)
            print("关闭思考预算")
        else:
            config = get_generation_config(model_name_to_use)

        response_stream = chat.send_message_stream(
            message=query,
            config=config
        )

        for chunk in response_stream:
            if hasattr(chunk, 'text') and chunk.text:
                full_message += chunk.text
                yield(f"data: {json.dumps({'data': chunk.text})}\n\n")

    except Exception as e:
        yield(f"data: {json.dumps({'error': f'API error: {e}'})}\n\n")
        full_message = "[Error]" # Placeholder

    messages.append({"role": "user", "parts": query})
    if full_message and not full_message.startswith("["): # Append only if not a placeholder
        messages.append({"role": "model", "parts": full_message})

    if full_message and not full_message.startswith("[") and any(item in prompt_key for item in TEMPLATE_SAVE):
        join_message = "".join([str(msg["parts"]) for msg in messages])
        info = count_chars(join_message, user_id)
        save_user_memory(user_id, thread_id, user_input, full_message, info)

    if 'Chat' in prompt_template[0]:
        # print("精简前messages:", messages[-1])
        if len(messages) > 2:
            messages = messages[-2:] #对话仅保留最新2条
        save_user_messages(user_id, messages)

card_schema = {
    "type": "object",
    "properties": {
        "maintitle": {
            "type": "string",
        },
        "background": {
            "type": "object",
            "properties": {
                "startColor": {"type": "string"},
                "endColor": {"type": "string"},
            },
            "required": ["startColor", "endColor"],
        },
        "cards": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "icon": {
                        "type": "string",
                        "enum": [
                            "Brain", "Network", "Settings", "Target", "Cpu", "Layers",
                            "Activity", "AlertCircle", "Archive", "ArrowRight", "Award",
                            "BarChart", "Bell", "Book", "Bookmark", "Box",
                            "Calendar", "Camera", "Check", "Clock",
                            "Cloud", "Code", "Compass", "Database", "Download",
                            "Eye", "File", "Filter", "Flag", "Folder",
                            "Globe", "Heart", "Home", "Image", "Info",
                            "Key", "Link", "Lock", "Mail", "Map",
                            "Message", "Monitor", "Moon", "Music", "Package",
                            "Phone", "Printer", "Search", "Send", "Server",
                            "Shield", "Star", "Sun", "User",
                            "Video", "Wifi", "Zap",
                        ],
                    },
                    "title": {"type": "string"},
                    "description": {"type": "string"},
                },
                "required": ["icon", "title", "description"],
            },
        },
    },
    "required": ["maintitle", "background", "cards"],
}

def gemini_schema_response(query):
    response = client.models.generate_content(
        model=MODEL_FLASH,
        contents=query,
        config=types.GenerateContentConfig(
            response_mime_type = 'application/json',
            response_schema = card_schema,
            safety_settings = safety_settings,
        )
    )
    #print(response, "\n***:", response.text)
    return json.dumps(response.parsed, ensure_ascii=False)
