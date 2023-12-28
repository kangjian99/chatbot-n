import google.generativeai as genai
import os, json
#import PIL.Image

genai.configure(api_key=os.getenv('GOOGLE_API_KEY'))

model = genai.GenerativeModel('gemini-pro')
#odel_v = genai.GenerativeModel('gemini-pro-vision')

def gemini_response(query):
    response = model.generate_content(query, stream=True)

    partial_text = ''
    for chunk in response:
        print(chunk.text)
        print("_"*80)
        partial_text += chunk.text
        yield(f"data: {json.dumps({'data': partial_text})}\n\n")

def gemini_response_key_words(query):
    response = model.generate_content(query, stream=False)
    return response.text