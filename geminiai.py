import google.generativeai as genai
import os, json
#import PIL.Image

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
"""
generation_config = {
    "max_output_tokens": 8192,
}
"""
model = genai.GenerativeModel(model_name='gemini-1.5-pro-latest', 
                              #system_instruction="你是语言分析与写作专家，避免输出过于简略化", 
                              safety_settings=safety_settings)
#model_v = genai.GenerativeModel('gemini-pro-vision', safety_settings)

def gemini_response_stream(query):
    response = model.generate_content(query, stream=True)

    for chunk in response:
        print(chunk.text)
        print("_"*80)
        yield(f"data: {json.dumps({'data': chunk.text})}\n\n")

def gemini_response(query):
    response = model.generate_content(query)
    return response.text