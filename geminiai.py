import google.generativeai as genai
import os, json
#import PIL.Image

genai.configure(api_key=os.getenv('GOOGLE_API_KEY'))

model = genai.GenerativeModel('gemini-pro')
#odel_v = genai.GenerativeModel('gemini-pro-vision')

def gemini_response(query):
    response = model.generate_content(query, stream=False)
    return response.text