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
    if not os.path.exists(DIRECTORY):
        os.mkdir(DIRECTORY)
    with open(f'{DIRECTORY}/{user_id}.txt', 'w') as file:
        file.truncate(0)
            
def get_user_messages(user_id, directory=DIRECTORY):
    messages = []
    try:
        with open(f'{directory}/{user_id}.txt', 'r') as f:
            for line in f.readlines():
                messages.append(json.loads(line.strip()))
    except FileNotFoundError:
        return None
    return messages

def get_user_memory(user_id, directory='memory'):
    messages = []
    try:
        with open(f'{directory}/{user_id}_memory.json', 'r') as f:
            for line in f.readlines():
                data = json.loads(line.strip())
                for key, value in data.items():
                    messages.append(f"{key}:\n{value}\n")
                # messages.append("-"*20)
    except FileNotFoundError:
        return []
    return messages
        
def save_user_messages(user_id, messages, directory=DIRECTORY):
    if not os.path.exists(directory):
        os.mkdir(directory)
    with open(f'{directory}/{user_id}.txt', 'w') as f:
        for message in messages:
            f.write(json.dumps(message, ensure_ascii=False) + '\n')

def save_user_memory(user_id, user_input, messages, max_lines=0, directory='memory'):
    if not os.path.exists(directory):
        os.mkdir(directory)

    data = {
        "User": user_input,
        "Assistant": messages
    }

    file_path = os.path.join(directory, f'{user_id}_memory.json')

    if max_lines > 0:
        # 读取文件中的行数
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                lines = f.readlines()
        except FileNotFoundError:
            lines = []
        # 如果超过max_lines，则删除旧的行
        if len(lines) > max_lines:
            lines = lines[-(max_lines):]
            with open(file_path, 'w', encoding='utf-8') as f:
                for line in lines:
                    f.write(line)

    else:
        with open(file_path, 'a', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False)
            f.write('\n')  # 添加换行符以分隔每次写入

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