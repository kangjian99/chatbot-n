import google.generativeai as genai
import os, json
#import PIL.Image

genai.configure(api_key=os.getenv('GOOGLE_API_KEY'))

safety_settings = [
    {
        "category": "HARM_CATEGORY_HARASSMENT",
        "threshold": "BLOCK_ONLY_HIGH"
    },
    {
        "category": "HARM_CATEGORY_HATE_SPEECH",
        "threshold": "BLOCK_ONLY_HIGH"
    },
    {
        "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
        "threshold": "BLOCK_ONLY_HIGH"
    },
    {
        "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
        "threshold": "BLOCK_ONLY_HIGH"
    }
]

model = genai.GenerativeModel('gemini-pro', safety_settings)
#model_v = genai.GenerativeModel('gemini-pro-vision', safety_settings)

def gemini_response(query):
    response = model.generate_content(query, stream=True)

    for chunk in response:
        print(chunk.text)
        print("_"*80)
        yield(f"data: {json.dumps({'data': chunk.text})}\n\n")

def gemini_response_key_words(query):
    response = model.generate_content(query, stream=False)
    return response.text