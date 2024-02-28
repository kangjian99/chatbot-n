from flask import Flask, request, jsonify, Response, session, render_template
from flask_cors import CORS
from openai import OpenAI
import json, threading
from datetime import timedelta
from db_process import *
from RAG_with_langchain_keyword import load_and_process_document, response_from_rag_chain, response_from_retriver
from templates import *
from utils import *
#from geminiai import gemini_response, gemini_response_key_words
from pplx import perplexity_response
#from werkzeug.utils import secure_filename
#from pypinyin import lazy_pinyin

app = Flask(__name__)
CORS(app, supports_credentials=True)
app.config['SECRET_KEY'] = SESSION_SECRET_KEY
app.config['SESSION_PERMANENT'] = True
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(hours=24)  # 无交互session过期（重登录）时间
# 全局设置会话cookie的属性（仅为Azure部署需求）
app.config.update(
    SESSION_COOKIE_SECURE=True,     # cookie只能通过HTTPS协议发送，如果标记了SameSite=None，则必须同时设置Secure属性
    SESSION_COOKIE_HTTPONLY=True,   # cookie不能通过客户端脚本访问
    SESSION_COOKIE_SAMESITE='None'  # cookie将在所有上下文中发送，包括跨站点请求。跨域AJAX请求中发送cookie这是必需的。
)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

param_temperature = 0.5
param_n = 3

def Chat_Completion(model, question, tem, messages, stream, n=param_n):
    try:
        messages.append({"role": "user", "content": question})
        print("generate_text:", messages)
        response = client.chat.completions.create(
        model= model,
        messages= messages,
        temperature=tem,
        stream=stream,
        top_p=1.0,
        n=n,
        frequency_penalty=0,
        presence_penalty=0
        )
        if not stream:
            print(f"{response.usage}\n")
            session['tokens'] = response.usage.total_tokens
            return response.choices[0].message.content
        else:
            text=[''] * n
            chunk_count = 0

            for chunk in response:
                if not chunk or not chunk.choices[0].delta:
                    continue

                choice = chunk.choices[0]
                # print("Decoded chunk:", choice)  # 添加这一行以打印解码的块
                content = choice.delta.content if choice.delta.content else ""
                
                if choice.index == 0:
                    # 对于第一个choice，立即输出并重置chunk_count
                    chunk_count = 0
                    yield {'content': content}
                else:
                    # 对于其他choices，暂存内容
                    text[choice.index] += content
                    # print(choice.index, text[choice.index])
                    chunk_count += 1
                    if chunk_count > 6:
                        yield {'content': "\n***请等待全部输出完毕***"}

                if choice.finish_reason == "stop":
                    break
        # 在所有响应处理完毕后，输出暂存变量中的内容
        if text[1]:
            combined_content = '\n'.join([f"{'-'*10}\n回复 {n+2}：\n{choice}" for n, choice in enumerate(text[1:])])
            yield {'content': '\n'+combined_content}
        return response
        
    except Exception as e:
        print(e)
        return "Connection Error! Please try again."


@app.route('/prompts')
def get_prompts():
    prompts = get_prompt_templates()  # 获取 prompts 数据
    prompts_list = list(prompts.items())
    return jsonify(prompts_list) #传递给前端

@app.route('/upload', methods=['POST'])
def upload_file():
    # user_id = session.get('user_id', 'test')
    if 'file' not in request.files:
        return 'No file part', 400
    file = request.files['file']
    user_id = request.form.get('user_id')

    # 如果用户没有选择文件或选择了空文件，浏览器可能会提交没有文件名的空部分
    if file.filename == '':
        return 'No selected file', 400
    if file and allowed_file(file.filename):
        #filename = secure_filename(''.join(lazy_pinyin(file.filename)))
        filename = safe_filename(file.filename)
        file.save(os.path.join(app.config['UPLOAD_FOLDER'], user_id+'_'+filename))
        session['uploaded_filename'] = filename  # 将文件名保存到会话中
        print("\n#Session after file uploaded:", session)
        if save_doc_name(user_id, filename):  # 如已存在相同文件则不执行
            # 使用多线程执行create_vectorstore
            def execute_create_vectorstore():
                load_and_process_document(user_id, filename)         
            # 启动新线程执行create_vectorstore
            cache_thread = threading.Thread(target=execute_create_vectorstore)
            cache_thread.start()

        return 'File uploaded successfully', 200        
    else:
        return 'File type not allowed', 400
    
@app.route('/get-filenames', methods=['GET'])
def get_filenames():
    user_id = request.args.get('user_id')
    file_names = get_doc_names(user_id)
    # 提取文件名作为列表
    #file_names = list(file_names.values())

    return jsonify(file_names)
    
@app.route('/message', methods=['GET', 'POST']) #必须要有GET
def handle_message():
    # print(session)
    # user_id = session.get('user_id', 'test')       
    last_selected = session.get('selected_template', '0')
    # uploaded_filename = session.get('uploaded_filename', '')

    data = request.json
    print(data)
    user_id = data.get('user_id')
    user_input = data['user_input']
    thread_id = data.get('thread_id')
    selected_template = data['selected_template']  # 接收选择的模板编号
    uploaded_filename = data.get('selected_file')  # 接收选择的上传文件
    n = data.get('n', 3)
    print("接收信息后session：", session)
    # 判断是否用户变更模版，如果是则清空信息
    if last_selected != selected_template:
        clear_messages(user_id)
        session['selected_template'] = selected_template
        #print("Session after template change:", session)
    
    prompt_template = data.get('prompt_template')
    if '文档' not in prompt_template[0]:
        if 'beta' in prompt_template[0]: # 选择其它模型
            prompt = f"{prompt_template[1].format(question=user_input)!s}"                
            response = perplexity_response(prompt, True)
        else: 
            messages = get_user_messages(user_id) if 'Chat' in prompt_template[0] else []
            prompt = f"{prompt_template[1].format(question=user_input)!s}" if messages == [] else user_input
            # 添加与OpenAI交互的逻辑
            n = 1
            response = interact_with_openai(user_id, thread_id, user_input, prompt, prompt_template, n, messages)
    else:
        if user_input.startswith('#clear'):
            clear_files_with_prefix(user_id)
            #session['uploaded_filename'] = ''
            #session['key_words'] = {}
            return Response('data: {"data": "Cleared."}\n\n', mimetype='text/event-stream')
        if user_input.startswith('#file'):
            filelist = get_files_with_prefix(user_id) or "没有文件上传。"
            return Response(f'data: {json.dumps({"data": filelist})}\n\n', mimetype='text/event-stream')

        if not uploaded_filename:
            return Response('data: {"data": "请先选择或上传文档。"}\n\n', mimetype='text/event-stream')
        
        if user_input.startswith(('总结', '写作')) and num_tokens(user_input) < 20:
            # 处理提取关键词逻辑
            try:
                response = response_from_retriver(user_id+'_'+uploaded_filename, uploaded_filename, 2)
                key_words = perplexity_response(f"提取以下信息的关键词，以/分隔显示，不超过5个：\n{response}")
                #print("\n#Session after key words extracted:", session)        
            except Exception as e:
                # 提取失败时返回错误消息
                key_words = uploaded_filename
            user_input += '\n' + key_words  # 为用户提问增添关键词
        #else:
        #    user_input += '\n(' + uploaded_filename + ')' # 为用户提问增添补充信息
            print(user_input)
        fullpath_filename = user_id + '_' + uploaded_filename
        if n==1:
            response = response_from_rag_chain(user_id, thread_id, fullpath_filename, user_input, True)
        else:
            docs = response_from_retriver(user_id, fullpath_filename, user_input)
            if '模仿' in prompt_template[0]:
                docchat_template = template_mimic
            else:
                docchat_template = template_writer if user_input.startswith(('总结', '写作')) else template
            prompt = f"{docchat_template.format(question=user_input, context=docs)!s}"
            response = interact_with_openai(user_id, thread_id, user_input, prompt, prompt_template, n)
            #response = interact_with_pplx(user_id, thread_id, user_input, prompt, prompt_template, n)
            #response = ""

    return Response(response, mimetype='text/event-stream') #流式必须要用Response

def interact_with_openai(user_id, thread_id, user_input, prompt, prompt_template, n, messages=None):
    messages = [] if messages is None else messages
    res = None
    full_message = ''

    try:
        for res in Chat_Completion(model, prompt, param_temperature, messages, True, n):
            if 'content' in res and res['content']:
                markdown_message = res['content']  # generate_markdown_message(res['content'])
                # print(f"Yielding markdown_message: {markdown_message}")  # 添加这一行
                # token_counter += 1
                full_message += res['content'] if not res['content'].lstrip().startswith('***') else ''
                yield f"data: {json.dumps({'data': markdown_message})}\n\n" # 将数据序列化为JSON字符串
    finally:
        messages.append({"role": "assistant", "content": full_message})
        join_message = "".join([str(msg["content"]) for msg in messages])
        info = count_chars(join_message, user_id, messages)
        if any(item in prompt_template[0] for item in ['文档', 'Chat']):
            save_user_memory(user_id, thread_id, user_input, full_message, info)
        rows = history_messages(user_id, prompt_template[0]) # 获取对应的历史记录条数
        if rows != 0:
            print("精简前messages:", messages[-1])
            if len(messages) > rows:
                messages = messages[-rows:] #对话仅保留最新rows条
            save_user_messages(user_id, messages) # 清空历史记录
        # session['messages'] = messages

def interact_with_pplx(user_id, thread_id, user_input, prompt, prompt_template, n, messages=None):
    messages = [] if messages is None else messages
    data = None
    full_message = ''

    try:
        for data in perplexity_response(prompt, True):
            json_data = data[data.find('{'):]
            full_message += json.loads(json_data)["data"]
            yield data
    finally:
        messages.append({"role": "assistant", "content": full_message})
        join_message = "".join([str(msg["content"]) for msg in messages])
        info = count_chars(join_message, user_id, messages)
        if any(item in prompt_template[0] for item in ['文档', 'Chat']):
            save_user_memory(user_id, thread_id, user_input, full_message, info)

@app.route('/clear')
def clear_file():
    user_id = request.args.get('user_id') 
    file_name = request.args.get('file_name') 
    if file_name:
        delete_doc_from_database(user_id, file_name)
        # session['uploaded_filename'] = ''
    # session['files'] = []
    # clear_cache(user_id)
    return "Files and cache cleared successfully"

@app.route('/login', methods=['POST'])
def login():
    username = request.json.get('username')
    password = request.json.get('password')
    if authenticate_user(username, password):
        session.update(logged_in=True, user_id=username)
        print(session)
        clear_messages(username)
        return jsonify({"message": "登录成功"}), 200
    else:
        return jsonify({"message": "用户名或密码错误"}), 401
    
@app.route('/check_session')
def check_session():
    user_id = session.get('user_id')
    if user_id:
        return jsonify({"logged_in": True, "user_id": user_id}), 200
    else:
        return jsonify({"logged_in": False}), 401
    
@app.route('/memory')
def load_memory():
    user_id = request.args.get('user_id')
    thread_id = request.args.get('thread_id')
    messages = get_user_memory(user_id, thread_id)
    # messages = messages[-5*3:] # 显示5组问答
    return messages

@app.route('/get-threads')
def get_threads(table='memory_by_thread'):
    user_id = request.args.get('user_id')
    thread_length = request.args.get('length')    
    threads = []
    limit = 5 if thread_length == '0' else 1

    # Query the Supabase table for the latest five threads for the user
    response = supabase.table(table).select('*').eq('user_id', user_id).order('id', desc=True).limit(limit).execute()

    if 'error' in response:
        print('Error:', response.error)
        return []

    # Process the response data
    for record in response.data:
        thread_id = record.get('thread_id')
        thread_name = record.get('chat_name')
        thread_data = {"id": thread_id, "name": thread_name}
        threads.append(thread_data)

    return jsonify(threads)

@app.route('/')
def index():
    return render_template('index.html')

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5858)