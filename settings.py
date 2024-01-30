import os
from openai import OpenAI
#from dotenv import load_dotenv

#load_dotenv()
API_KEY = os.environ.get('OPENAI_API_KEY')
model="gpt-3.5-turbo-1106"
#model="gpt-4-0125-preview"

client = OpenAI(api_key = API_KEY)

WEAVIATE_URL = os.environ.get('WEAVIATE_URL')
WEAVIATE_API_KEY = os.environ.get('WEAVIATE_API_KEY')

SESSION_SECRET_KEY = os.environ.get('SESSION_SECRET_KEY')

server = 'kj99.database.windows.net'
database = 'database'
#db_username = os.environ.get('DB_USERNAME')
#db_password = os.environ.get('DB_PASSWORD')

DIRECTORY = 'session_messages'
