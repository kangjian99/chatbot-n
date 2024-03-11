import os
from openai import OpenAI
#from dotenv import load_dotenv
#load_dotenv()

API_KEY = os.environ.get('OPENAI_API_KEY')
API_KEY_HUB = os.environ.get('OPENAI_API_KEY_HUB')   # 中转

model="gpt-3.5-turbo-0125"
#model="gpt-4-0125-preview"
#BASE_URL = "https://openai.ehco-relay.cc/v1"
claude_model = False

hub = bool(os.environ.get('HUB'))
BASE_URL = "https://api.moonshot.cn/v1"
if hub:
    model="moonshot-v1-8k"

client = OpenAI(api_key = API_KEY_HUB, base_url = BASE_URL) if hub else OpenAI(api_key = API_KEY)

DB_URL: str = os.environ.get("SUPABASE_URL")
DB_KEY: str = os.environ.get("SUPABASE_KEY")
#WEAVIATE_URL = os.environ.get('WEAVIATE_URL')
#WEAVIATE_API_KEY = os.environ.get('WEAVIATE_API_KEY')

SESSION_SECRET_KEY = os.environ.get('SESSION_SECRET_KEY')

server = 'kj99.database.windows.net'
database = 'database'
#db_username = os.environ.get('DB_USERNAME')
#db_password = os.environ.get('DB_PASSWORD')

DIRECTORY = 'session_messages'
