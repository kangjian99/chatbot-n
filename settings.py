import os, random
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

HUB = os.environ.get('HUB')   # 是否用原生OpenAI方式
#HUB = "sf"  # 测试句
if HUB == "burn":
    API_KEY_HUB = os.environ.get('OPENAI_API_KEY_HUB')
    BASE_URL = "https://burn.hair/v1"
elif HUB == "deepseek":
    API_KEY_HUB = os.environ.get('DEEPSEEK_API_KEY')
    BASE_URL = "https://api.deepseek.com/v1"
    MODEL = "deepseek-chat"
elif HUB == "sf":
    API_KEY_HUB = os.environ.get('SF_API_KEY')
    BASE_URL = "https://api.siliconflow.cn/v1"
    MODEL = os.getenv('SF_MODEL') or "deepseek-ai/DeepSeek-R1"
elif HUB == "nv":
    API_KEY_HUB = os.environ.get('NV_API_KEY') 
    BASE_URL = "https://integrate.api.nvidia.com/v1"
    MODEL = "deepseek-ai/deepseek-r1"
#elif HUB == "moonshot":
#    API_KEY_HUB = os.environ.get('MOONSHOT_API_KEY') 
#    BASE_URL = "https://api.moonshot.cn/v1"
#    MODEL = "moonshot-v1-8k"
elif HUB == "tg":
    API_KEY_HUB = os.environ.get('TOGETHER_API_KEY') 
    BASE_URL = "https://api.together.xyz/v1"
    MODEL = "deepseek-ai/DeepSeek-R1-0528-tput"
elif HUB == "fw":
    API_KEY_HUB = os.environ.get('FIREWORKS_API_KEY') 
    BASE_URL = "https://api.fireworks.ai/inference/v1"
    MODEL = "accounts/fireworks/models/deepseek-r1-basic"
elif HUB == "nb":
    API_KEY_HUB = os.environ.get('NEBIUS_API_KEY')
    BASE_URL = "https://api.studio.nebius.ai/v1"
    MODEL = "deepseek-ai/DeepSeek-R1" + os.getenv('FAST_SUFFIX', '')
elif HUB == "nov":
    API_KEY_HUB = os.environ.get('NOVITA_API_KEY')
    BASE_URL = "https://api.novita.ai/v3/openai"
    MODEL = "deepseek/deepseek-r1"
elif HUB == "ark":
    API_KEY_HUB = os.environ.get('ARK_API_KEY')
    BASE_URL = "https://ark.cn-beijing.volces.com/api/v3"
    MODEL = "ep-20250218083204-w9cc9"
elif HUB:
    API_KEY_HUB = os.environ.get('OPENROUTER_API_KEY')
    BASE_URL = os.environ.get('BASE_URL') or "https://openrouter.ai/api/v1"
    MODEL = os.environ.get('BASE_MODEL') or "deepseek/deepseek-chat-v3-0324:free"  # deepseek/deepseek-r1:free
    #API_KEY_HUB = os.environ.get('BASE_API_KEY')
    #BASE_URL = os.environ.get('BASE_URL') or "https://llm.indrin.cn/v1"
    #MODEL = os.environ.get('BASE_MODEL') or "Qwen/Qwen2.5-72B-Instruct"
else:
    API_KEY_HUB = None
    BASE_URL = None

CLIENT = OpenAI(api_key = API_KEY_HUB, base_url = BASE_URL) if HUB else OpenAI(api_key = API_KEY)

op_free_models = ["deepseek/deepseek-r1-0528:free", "qwen/qwen3-235b-a22b:free"]
model_alt_map = {
    "sf": "deepseek-ai/DeepSeek-R1",
    "nv": "deepseek-ai/deepseek-r1", # "mistralai/mistral-small-24b-instruct",
    "tg": "deepseek-ai/DeepSeek-R1-0528-tput", # "mistralai/Mistral-Small-24B-Instruct-2501",
    "fw": "accounts/fireworks/models/deepseek-r1-0528", # "accounts/fireworks/models/deepseek-v3",
    "nb": "deepseek-ai/DeepSeek-R1-0528", # "deepseek-ai/DeepSeek-V3-0324",
    "inf": "deepseek/deepseek-r1-0528/fp-8", # deepseek/deepseek-v3/fp-8
    "ark": "ep-20250218083204-w9cc9", # "ep-20250331093955-tn2vh",
    #"nov": "deepseek/deepseek-r1-turbo",
    "op": lambda: random.choice(op_free_models),
}

client_alt_map = {
    "sf": OpenAI(api_key=os.environ.get('SF_API_KEY'), base_url="https://api.siliconflow.cn/v1"),
    #"nv": OpenAI(api_key=os.environ.get('NV_API_KEY'), base_url="https://integrate.api.nvidia.com/v1"),
    "tg": OpenAI(api_key=os.environ.get('TOGETHER_API_KEY'), base_url="https://api.together.xyz/v1"),
    "fw": OpenAI(api_key=os.environ.get('FIREWORKS_API_KEY'), base_url="https://api.fireworks.ai/inference/v1"),
    "nb": OpenAI(api_key=os.environ.get('NEBIUS_API_KEY'), base_url="https://api.studio.nebius.ai/v1"),
    "inf": OpenAI(api_key=os.environ.get('INFERENCE_API_KEY'), base_url="https://api.inference.net/v1"),
    "ark": OpenAI(api_key=os.environ.get('ARK_API_KEY'), base_url="https://ark.cn-beijing.volces.com/api/v3"),
    #"nov": OpenAI(api_key=os.environ.get('NOVITA_API_KEY'), base_url="https://api.novita.ai/v3/openai"),
    "op": OpenAI(api_key=os.environ.get('OPENROUTER_API_KEY'), base_url="https://openrouter.ai/api/v1"),
}

# 简单需求替换小模型
#MODEL_alt = "qwen-qwq-32b"
#CLIENT_alt = OpenAI(api_key = os.environ.get('GROQ_API_KEY'), base_url = "https://api.groq.com/openai/v1")
MODEL_alt = "gemini-2.5-flash"
CLIENT_alt = OpenAI(api_key = os.environ.get('GOOGLE_API_KEY'), base_url = "https://generativelanguage.googleapis.com/v1beta/openai/")
#MODEL_alt = "deepseek/deepseek-v3-0324/fp-8"
#CLIENT_alt = client_alt_map["inf"]
#MODEL_alt = "ep-20250331093955-tn2vh"
#CLIENT_alt = client_alt_map["ark"]
#MODEL_alt = "deepseek/deepseek-chat-v3-0324:free"  # openrouter/quasar-alpha
#CLIENT_alt = client_alt_map["op"]

HUB_alt = os.environ.get('HUB_ALT', 'nb')

HUB_reasoning_content = ["ark", "sf", "inf", "op"]

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
