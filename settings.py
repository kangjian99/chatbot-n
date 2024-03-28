import os
from openai import OpenAI
#from dotenv import load_dotenv
#load_dotenv()

API_KEY = os.environ.get('OPENAI_API_KEY')
API_KEY_HUB = os.environ.get('MOONSHOT_API_KEY') 
BASE_URL = "https://api.moonshot.cn/v1"
API_KEY_HUB = os.environ.get('OPENAI_API_KEY_HUB')   # 中转 测试句
BASE_URL = "https://burn.hair/v1"    # 测试句

MODEL="gpt-3.5-turbo-0125"
#MODEL="gpt-4-0125-preview"
model_8k = "moonshot-v1-8k"
model_32k = "moonshot-v1-32k"

claude_model = os.environ.get('CLAUDE_MODEL', '').lower() == 'true'
#claude_model = False   # 测试句

hub = bool(os.environ.get('HUB'))

#BASE_URL = "https://api.lingyiwanwu.com/v1"
#MODEL="yi-34b-chat-200k"

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
