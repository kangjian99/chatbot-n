import hashlib
import json
import tiktoken
from settings import *
from supabase import create_client, Client

supabase: Client = create_client(DB_URL, DB_KEY)

def hash_password(password):
    # 使用 SHA-256 散列算法
    hashed = hashlib.sha256(password.encode()).hexdigest()
    return hashed
    
def authenticate_user(username, password):
    response = supabase.table('users').select('password').eq('username', username).execute()

    if 'error' in response:
        print('Error:', response.error)
        return False

    user_data = response.data

    if user_data:
        stored_password = user_data[0]['password']
        if stored_password == password:
            return True

    return False

def read_table_data(table_name):
    # 从表中读取数据
    query = supabase.table(table_name).select("*").order("id.asc") # 按照id升序读取
    response = query.execute()

    # 检查错误
    if 'error' in response:
        raise RuntimeError(f"Error reading table {table_name}: {response.text}")

    return response.data
       
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

def get_user_memory(user_id, thread_id, limit=10, table='memory_by_thread'):
    # 从Supabase中读取数据
    response = supabase.table(table).select('history').eq('user_id', user_id).eq('thread_id', thread_id).execute()
    # print(len(response.data[0]['history']))
    # 检查结果
    if 'error' in response:
        print('Error:', response.error)
    else:
        messages = []
        # 假设history字段是一个包含多个条目的jsonb数组
        history = response.data[0]['history'] if response.data else []
        for entry in history:
            user_data = {"User": entry["user"]}
            assistant_data = {"Assistant": entry["assistant"]}
            info_data = {"Info": entry["info"]}
            messages.append(user_data)
            messages.append(assistant_data)
            messages.append(info_data)

    return messages[-limit*3:]
        
def save_user_messages(user_id, messages, directory=DIRECTORY):
    if not os.path.exists(directory):
        os.mkdir(directory)
    with open(f'{directory}/{user_id}.txt', 'w') as f:
        for message in messages:
            f.write(json.dumps(message, ensure_ascii=False) + '\n')

def increment_counter(username):
    response = supabase.table('users').select('counter').eq('username', username).execute()

    if 'error' in response:
        print('Error:', response.error)
        return

    user_data = response.data

    if user_data:
        current_counter = user_data[0]['counter']
        supabase.table('users').update({'counter': current_counter + 1}).eq('username', username).execute()

def save_user_memory(user_id, thread_id, user_input, messages, info, table='memory_by_thread', max_entries=10):

    new_entry = {
        "user": user_input,
        "assistant": messages,
        "info": info
    }

    # 检索现有记录
    response = supabase.table(table).select('history', 'chat_name').eq('user_id', user_id).eq('thread_id', thread_id).execute()

    if 'error' in response:
        print('Error:', response.error)
        return

    # 检查是否已有记录
    existing_records = response.data
    if existing_records:
        # 如果记录存在，更新history字段
        history = existing_records[0]['history']
        if len(history) >= max_entries:
            history = history[-(max_entries-1):]
        history.append(new_entry)
        response = supabase.table(table).update({'history': history}).eq('user_id', user_id).eq('thread_id', thread_id).execute()
    else:
        # 如果记录不存在，插入新记录
        record = {
            "user_id": user_id,
            "thread_id": thread_id,
            "history": [new_entry],  # history字段是一个包含new_entry的列表
            "chat_name": user_input[:25]  # chat_name字段是user_input的前25个字符
        }
        response = supabase.table(table).insert(record).execute()

    if 'error' in response:
        print('Error:', response.error)
    
    increment_counter(user_id)

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

def get_doc_names(user_id, limit=9):
    # 执行查询
    table = "doc_names"
    response = supabase.table(table).select('doc_name').eq('user_id', user_id).order('id', desc=True).limit(limit).execute()

    # 检查查询结果是否成功
    if 'error' in response:
        return "error: Failed to fetch document names"
    
    # 提取文档名称并返回
    doc_names = [row["doc_name"] for row in response.data]
    if len(doc_names) > 1:
        doc_names.insert(0, "多文档检索")
    print("doc_names", doc_names)
    return doc_names

def save_doc_name(user_id, doc_name):
    new_doc = True
    table = "doc_names"
    response = supabase.table(table).select('*').eq('user_id', user_id).eq('doc_name', doc_name).execute()
    existing_record = response.data
    if existing_record:
        existing_record_id = existing_record[0]['id']  # 获取第一个记录的唯一标识符
        # 删除重复项
        delete_response = supabase.table(table).delete().eq('id', existing_record_id).execute()
        new_doc = False
    
    data = {"user_id": user_id, "doc_name": doc_name}
    response = supabase.table(table).insert(data).execute()
    print("Inserted new record:", response)

    # 检查插入结果是否成功
    if 'error' in response:
        return "error: Failed to insert document name"
    else:
        return new_doc
    
def delete_doc_from_database(user_id, doc_name):
    # 删除 doc_names 表中的记录
    table = "doc_names"
    response_doc_names = supabase.table(table).delete().eq('user_id', user_id).eq('doc_name', doc_name).execute()

    # 删除 documents 表中匹配条件的元数据行
    table = "documents"
    response_documents = supabase.table(table).delete().like('metadata->>source', f'%{user_id}_{doc_name}').execute()

    # 检查删除结果是否成功
    if 'error' in response_doc_names or 'error' in response_documents:
        return "error: Failed to delete document name or metadata"
    else:
        return "Document name and associated metadata deleted successfully"
