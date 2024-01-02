import hashlib
import json
import tiktoken
from settings import *

def hash_password(password):
    # 使用 SHA-256 散列算法
    hashed = hashlib.sha256(password.encode()).hexdigest()
    return hashed
    
def authenticate_user(username, password):
    with open('checknm.txt', 'r') as file:
        lines = file.readlines()

        for line in lines:
            user_id, stored_hashed_password = line.strip().split(',')
            hashed_password = hash_password(password)

            if user_id == username and stored_hashed_password == hashed_password:
                return True

    return False

def insert_db(result, user_id=None, messages=[]):
    # 连接到数据库
    cnxn = pyodbc.connect(f'DRIVER={driver};SERVER={server};PORT=1433;DATABASE={database};UID={db_username};PWD={db_password}')
    
    # 获取要插入的结果数据
    now = result.get('datetime')
    user_id = result.get('user_id')
    cn_char_count = result.get('cn_char_count')
    en_char_count = result.get('en_char_count')
    tokens = result.get('tokens')
    
    # 构建插入语句并执行
    query = "INSERT INTO stats (user_id, datetime, cn_char_count, en_char_count, tokens) VALUES (?, ?, ?, ?, ?);"
    params = (user_id, now, cn_char_count, en_char_count, tokens)
    cursor = cnxn.cursor()
    cursor.execute(query, params)
    
    if user_id:
        messages_str = json.dumps(messages, ensure_ascii=False)
        # 构建插入语句并执行
        query = "INSERT INTO session (user_id, messages) VALUES (?, ?);"
        params = (user_id, messages_str)
        cursor = cnxn.cursor()
        cursor.execute(query, params)
        
    cnxn.commit()
    cnxn.close()
    
def read_table_data(table_name):
    cnxn = pyodbc.connect(f'DRIVER={driver};SERVER={server};PORT=1433;DATABASE={database};UID={db_username};PWD={db_password}')
    cursor = cnxn.cursor()

    # 从表格中读取数据
    cursor.execute(f"SELECT * FROM {table_name}")
    rows = cursor.fetchall()

    # 将数据转换为字典
    prompts_dict = {row.name.strip('"'): row.prompt.strip('"') for row in rows}

    cursor.close()
    cnxn.close()

    return prompts_dict
       
def clear_messages(user_id):
    if not os.path.exists(directory):
        os.mkdir(directory)
    with open(f'{directory}/messages_{user_id}.txt', 'w') as file:
        file.truncate(0)
        
def save_user_messages(user_id, messages):
    if not os.path.exists(directory):
        os.mkdir(directory)
    with open(f'{directory}/messages_{user_id}.txt', 'w') as f:
        for message in messages:
            f.write(json.dumps(message, ensure_ascii=False) + '\n')
            
def get_user_messages(user_id):
    messages = []
    try:
        with open(f'{directory}/messages_{user_id}.txt', 'r') as f:
            for line in f.readlines():
                messages.append(json.loads(line.strip()))
    except FileNotFoundError:
        pass
    return messages

def history_messages(user_id, prompt_template):
    rows = 0
    if user_id == 'sonic' or 'auto' in prompt_template:
        rows = 4
    if 'smart' in prompt_template:
        rows = 5
    if 'Chat' in prompt_template:
        rows = 2
    return rows

def num_tokens(string: str) -> int:
    encoding = tiktoken.encoding_for_model(model)
    num_tokens = len(encoding.encode(string))
    return num_tokens