from flask import Flask, request, jsonify, Response, session, render_template
#from flask_cors import CORS
from openai import OpenAI
import json, threading
from datetime import datetime
from db_process import *
from RAG_with_langchain import get_cache, get_cache_serial, response_from_rag_chain, response_from_retriver, template, template_writer
from utils import *
#from werkzeug.utils import secure_filename
#from pypinyin import lazy_pinyin

app = Flask(__name__)
#CORS(app, supports_credentials=True)
app.config['SECRET_KEY'] = SESSION_SECRET_KEY
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

param_temperature = 0.5
param_n = 3
max_k = 10

def Chat_Completion(model, question, tem, messages, stream, n=1):
    try:
        messages.append({"role": "user", "content": question})
        print("对话长度：", len(messages), "generate_text:", messages)
        response = client.chat.completions.create(
        model= model,
        messages= messages,
        temperature=tem,
        stream=stream,
        top_p=1.0,
        frequency_penalty=0,
        presence_penalty=0,
        n=n
        )
        if not stream:
            print(f"{response.usage}\n")
            session['tokens'] = response.usage.total_tokens
            combined_content = '\n'.join([f"******\n回复{n+1}:\n{choice.message.content}" for n, choice in enumerate(response.choices)])
            return combined_content
        return response
        
    except Exception as e:
        print(e)
        return "Connection Error! Please try again."

def send_gpt(model, prompt, tem, messages, user_id):
    partial_words = ""
    response = Chat_Completion(model, prompt, tem, messages, True)

    for chunk in response:
        if chunk:
            # print("Decoded chunk:", chunk)  # 添加这一行以打印解码的块
            try:
                if chunk.choices[0].delta:
                    finish_reason = chunk.choices[0].finish_reason
                    if finish_reason == "stop":
                        break
                    if chunk.choices[0].delta.content:
                        partial_words += chunk.choices[0].delta.content
                        # print("Content found:", partial_words)  # 添加这一行以打印找到的内容
                        yield {'content': partial_words}
                    else:
                        print("No content found in delta:", chunk.choices[0].delta)  # 添加这一行以打印没有内容的 delta
                else:
                    pass
            except json.JSONDecodeError:
                pass

#        print(f"{response['usage']}\n")
#        session['tokens'] = response['usage']['total_tokens']
        
def count_chars(text, user_id, messages):
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

    return 'success'


user_id = 'test'
clear_messages(user_id)

@app.route('/prompts')
def get_prompts():
    prompts = get_prompt_templates()  # 获取 prompts 数据
    prompts_keys = list(prompts.keys())  # 获取所有键
    return jsonify(prompts_keys) #传递给前端

@app.route('/upload', methods=['POST'])
def upload_file():
    user_id = session.get('user_id', 'test')
    if 'file' not in request.files:
        return 'No file part', 400
    file = request.files['file']
    # 如果用户没有选择文件或选择了空文件，浏览器可能会提交没有文件名的空部分
    if file.filename == '':
        return 'No selected file', 400
    if file and allowed_file(file.filename):
        #filename = secure_filename(''.join(lazy_pinyin(file.filename)))
        filename = safe_filename(file.filename)
        file.save(os.path.join(app.config['UPLOAD_FOLDER'], user_id+'_'+filename))
        session['uploaded_filename'] = filename  # 将文件名保存到会话中
        print("Session after file uploaded:", session)
        # 使用多线程执行get_cache
        def execute_get_cache():
            get_cache(user_id+'_'+filename)
        
        # 启动新线程执行get_cache
        cache_thread = threading.Thread(target=execute_get_cache)
        cache_thread.start()
        
        return 'File uploaded successfully', 200
    else:
        return 'File type not allowed', 400
    
@app.route('/message', methods=['GET', 'POST']) #必须要有GET
def handle_message():
    print(session)
    user_id = session.get('user_id', 'test')
    last_selected = session.get('selected_template', '0')
    uploaded_filename = session.get('uploaded_filename', '')
    
    data = request.json
    # print(data)
    user_input = data['user_input']
    selected_template = data['prompt_template']  # 接收选择的模板编号
    # 判断是否用户变更模版，如果是则清空信息
    if last_selected != selected_template:
        clear_messages(user_id)
        session['selected_template'] = selected_template
        print("Session after template change:", session)

    prompts = get_prompt_templates()
    prompt_template = list(prompts.items())[int(selected_template)] #元组
    if '文档' not in prompt_template[0]:
        messages = get_user_messages(user_id)
        if messages == []:
            prompt = f"{prompt_template[1].format(keyword=user_input)!s}"
        else:
            prompt = user_input
        # 添加与OpenAI交互的逻辑
        response = interact_with_openai(user_id, prompt, prompt_template, messages)
    else:
        if user_input.startswith('#clear'):
            clear_files_with_prefix(user_id)
            session['uploaded_filename'] = ''
            return jsonify('Cleared.')
        elif user_input.startswith('#file'):
            filelist = get_files_with_prefix(user_id)
            return jsonify(f'{filelist}') 
        elif user_input.startswith('#cache'):
            session['cache_list'] = get_cache_serial()
            return jsonify(f"{session['cache_list']}")
        elif user_input.startswith('#set#'):
            matched_filename = match_file(user_input, get_cache_serial())
            if matched_filename:
                session['uploaded_filename'] = matched_filename
                uploaded_filename = session['uploaded_filename']
                return jsonify(f'{uploaded_filename}')
            else:
                return jsonify('无文档匹配')
        elif uploaded_filename == '' or is_file_in_directory(user_id + '_' + uploaded_filename) == False:
            return jsonify('请先上传文档')
        else:
            uploaded_filename = user_id + '_' + uploaded_filename
            #response = response_from_rag_chain(uploaded_filename, user_input, False)
            response = response_from_retriver(uploaded_filename, user_input, max_k)
            docchat_template = template_writer if user_input.startswith(('总结', '写作')) else template
            prompt = f"{docchat_template.format(question=user_input, context=response)!s}"
            response = interact_with_openai(user_id, prompt, prompt_template)

    return jsonify(response) # 非流式

def interact_with_openai(user_id, prompt, prompt_template, n=param_n, messages=None):
    messages = [] if messages is None else messages
    res = Chat_Completion(model, prompt, param_temperature, messages, False, n) # 非流式调用
    
    messages.append({"role": "assistant", "content": res})
    join_message = "".join([msg["content"] for msg in messages])
    print("精简前messages:", messages)
    rows = history_messages(user_id, prompt_template[0]) # 历史记录条数
    if len(messages) > rows:
        messages = messages[-rows:] #对话仅保留最新rows条
    if rows == 0:
        save_user_messages(user_id, []) # 清空历史记录
    else:
        save_user_messages(user_id, messages)
    # session['messages'] = messages
    count_chars(join_message, user_id, messages)
    return res # 非流式

@app.route('/')
def index():
    return render_template('index.html')

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5858)