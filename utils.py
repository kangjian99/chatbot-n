import os, re, json
from datetime import datetime
from db_process import read_table_data
from urllib.parse import unquote
import tiktoken

enc = tiktoken.get_encoding("cl100k_base") # 以 token 计算文本块长度
def num_tokens(text: str) -> int:
    return len(enc.encode(text))

def get_prompt_templates():
    tablename = 'prompts'
    data = read_table_data(tablename)
    # 将数据转换为字典
    prompts = {row["name"]: row["prompt"] for row in data}
    
    return prompts

def count_chars(text, user_id, messages=[]):
    cn_pattern = re.compile(r'[\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef]') #匹配中文字符及标点符号
    cn_chars = cn_pattern.findall(text)

    en_pattern = re.compile(r'[a-zA-Z]') #匹配英文字符
    en_chars = en_pattern.findall(text)

    cn_char_count = len(cn_chars)
    en_char_count = len(en_chars)

    now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    
    tokens = num_tokens(text)
    # 将当前统计结果添加为字典
    stats = {'user_id': user_id, 'datetime': now, 'cn_char_count': cn_char_count, 'en_char_count': en_char_count, 'tokens': tokens}
    print(stats)

    #if stats:
    #    insert_db(stats, user_id, messages)

    time_and_tokens = f"'{now}', '{tokens}'"

    return time_and_tokens

# 设置文件上传的目录
UPLOAD_FOLDER = './docs'
ALLOWED_EXTENSIONS = {'txt', 'docx', 'pdf'}
# FILE_PATH = 'lushanriji.docx'

# 确保上传的目录存在
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def safe_filename(file_name):
    file_name = unquote(file_name)
    
    # 移除或替换文件名中的特殊字符
    file_name = re.sub(r'[\\/*?:"<>|]', '', file_name)

    # 避免路径遍历
    file_name = os.path.basename(file_name)
    
    # 对于过长的文件名进行截断
    max_length = 255
    if len(file_name) > max_length:
        file_name = file_name[:max_length]
    
    return file_name

def clear_files_with_prefix(prefix, folder=UPLOAD_FOLDER):
    """
    清除指定目录下所有以特定前缀开头的文件
    参数:
    - prefix: 文件名前缀
    """
    try:
        # 获取目录中的所有文件
        files = os.listdir(folder)

        # 遍历文件并删除以特定前缀开头的文件
        for file in files:
            if file.startswith(prefix + "_") or file == prefix:
                file_path = os.path.join(folder, file)
                os.remove(file_path)
                print(f"Deleted: {file_path}")

        print(f"All files with prefix '{prefix}' cleared in {folder}")

    except Exception as e:
        print(f"Error: {e}")

def get_files_with_prefix(prefix):
    """
    获取指定目录下所有以特定前缀开头的文件名字符串
    参数:
    - prefix: 文件名前缀
    返回值:
    - 文件名字符串
    """
    try:
        files = os.listdir(UPLOAD_FOLDER)
        # 选择以特定前缀开头的文件
        matching_files = [file for file in files if file.startswith(prefix + "_") or file == prefix]
        files_string = ", ".join(matching_files)

        print(f"All files with prefix '{prefix}' in {UPLOAD_FOLDER}: {files_string}")

        return files_string

    except Exception as e:
        print(f"Error: {e}")
        return ""
