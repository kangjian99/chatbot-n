import os
from openai import OpenAI
#from dotenv import load_dotenv
#load_dotenv()

API_KEY = os.environ.get('OPENAI_API_KEY')

MODEL=os.getenv('GPT_MODEL') or "gpt-4o-2024-08-06" # chatgpt-4o-latest "gpt-3.5-turbo-0125"
#MODEL="gpt-4-turbo-2024-04-09"
#model_8k = "moonshot-v1-8k"
#model_32k = "moonshot-v1-32k"

#claude_model = os.environ.get('CLAUDE', '').lower() == 'true'   # 全局采用Claude模型
#claude_model = False   # 测试句

hub = os.environ.get('HUB')   # 是否用原生OpenAI方式
#hub = "sf"  # 测试句
if hub == "burn":
    API_KEY_HUB = os.environ.get('OPENAI_API_KEY_HUB')
    BASE_URL = "https://burn.hair/v1"
elif hub == "deepseek":
    API_KEY_HUB = os.environ.get('DEEPSEEK_API_KEY')
    BASE_URL = "https://api.deepseek.com/v1"
    MODEL = "deepseek-chat"
elif hub == "sf":
    API_KEY_HUB = os.environ.get('SF_API_KEY')
    BASE_URL = "https://api.siliconflow.cn/v1"
    MODEL = os.getenv('SF_MODEL') or "Vendor-A/Qwen/Qwen2.5-72B-Instruct"
elif hub == "nv":
    API_KEY_HUB = os.environ.get('NV_API_KEY') 
    BASE_URL = "https://integrate.api.nvidia.com/v1"
    MODEL = "deepseek-ai/deepseek-r1"
#elif hub == "moonshot":
#    API_KEY_HUB = os.environ.get('MOONSHOT_API_KEY') 
#    BASE_URL = "https://api.moonshot.cn/v1"
#    MODEL = "moonshot-v1-8k"
elif hub == "tg":
    API_KEY_HUB = os.environ.get('TOGETHER_API_KEY') 
    BASE_URL = "https://api.together.xyz/v1"
    MODEL = "deepseek-ai/DeepSeek-R1"
elif hub == "fw":
    API_KEY_HUB = os.environ.get('FIREWORKS_API_KEY') 
    BASE_URL = "https://api.fireworks.ai/inference/v1"
    MODEL = "accounts/fireworks/models/deepseek-r1"
elif hub == "nb":
    API_KEY_HUB = os.environ.get('NEBIUS_API_KEY')
    BASE_URL = "https://api.studio.nebius.ai/v1"
    MODEL = "deepseek-ai/DeepSeek-R1" + (os.getenv('FAST_SUFFIX') or "")
elif hub:
    API_KEY_HUB = os.environ.get('BASE_API_KEY')
    BASE_URL = os.environ.get('BASE_URL') or "https://llm.indrin.cn/v1"
    MODEL = os.environ.get('BASE_MODEL') or "Qwen/Qwen2.5-72B-Instruct"
else:
    API_KEY_HUB = None
    BASE_URL = None

CLIENT = OpenAI(api_key = API_KEY_HUB, base_url = BASE_URL) if hub else OpenAI(api_key = API_KEY)
#MODEL_alt = ""
#CLIENT_alt = OpenAI(api_key = os.environ.get('GROQ_API_KEY'), base_url = "https://api.groq.com/openai/v1")
MODEL_alt = "gemini-2.0-flash"
CLIENT_alt = OpenAI(api_key = os.environ.get('GOOGLE_API_KEY'), base_url = "https://generativelanguage.googleapis.com/v1beta/openai/")

model_alt_map = {
    "sf": "deepseek-ai/DeepSeek-V3",
    "nv": "mistralai/mistral-small-24b-instruct",
    "tg": "mistralai/Mistral-Small-24B-Instruct-2501",
    "fw": "accounts/fireworks/models/deepseek-v3",
}

DB_URL: str = os.environ.get("SUPABASE_URL")
DB_KEY: str = os.environ.get("SUPABASE_KEY")
#WEAVIATE_URL = os.environ.get('WEAVIATE_URL')
#WEAVIATE_API_KEY = os.environ.get('WEAVIATE_API_KEY')

SESSION_SECRET_KEY = os.environ.get('SESSION_SECRET_KEY')

#server = 'kj99.database.windows.net'
#database = 'database'
#db_username = os.environ.get('DB_USERNAME')
#db_password = os.environ.get('DB_PASSWORD')

DIRECTORY = 'session_messages'
