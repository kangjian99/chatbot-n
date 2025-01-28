from flask import Flask, request, jsonify, Response, render_template
from flask_cors import CORS
#from openai import OpenAI
import json
from db_process import *
from RAG_with_langchain import load_and_process_document, response_from_rag_chain, response_from_retriver
from webloader import *
from templates import template_QUERY, template_WRITER, template_WRITER_R, template_WRITER_S, template_SUMMARY
from utils import *
from openai_func import interact_with_openai, param_n
from claude import claude_response_stream, interact_with_claude, claude_response

from geminiai import interact_with_gemini, gemini_schema_response
from payload import interact_with_LLM
from groq_func import groq_response, groq_response_stream, interact_with_groq
from deepseek_func import interact_with_deepseek

from session_db import get_db, get_session, create_session, update_session, print_session_info

app = Flask(__name__)
CORS(app, supports_credentials=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

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
        db = next(get_db())
        update_session(db, user_id, uploaded_filename=filename)
        #print("\n#Session after file uploaded:")
        #print_session_info(db, user_id)
        new_doc = save_doc_name(user_id, filename)
        if new_doc == True:  # 如已存在相同文件则不执行
            # 使用多线程执行create_vectorstore
            #def execute_create_vectorstore():
            info = load_and_process_document(user_id, filename)
            return Response(f'\u2705 文档上传成功 ("{filename}" {info})，较长文档需等待系统预处理10秒以上再检索。', mimetype='text/plain')
            # 启动新线程执行create_vectorstore
            #cache_thread = threading.Thread(target=execute_create_vectorstore)
            #cache_thread.start()
        elif new_doc == False:
            return Response(f'\u2757 同名文档已存在无法上传："{filename}"，如需覆盖请先清除已上传文档。', mimetype='text/plain')
        else:
            return Response('\u274C 文档上传失败，请重新操作。', mimetype='text/plain')

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

    data = request.json
    print(data)
    user_id = data.get('user_id')
    user_input = data['user_input']
    thread_id = data.get('thread_id')
    selected_template = data['selected_template']  # 接收选择的模板编号
    uploaded_filename = data.get('selected_file')  # 接收选择的上传文件
    n = data.get('n', param_n)
    max_k = data.get('max_k', 10)
    k = data.get('k', 4)
    user_model = data.get('user_model')
    prompt_template = data.get('prompt_template')

    db = next(get_db())
    db_session = get_session(db, user_id)
    last_selected = db_session.selected_template if db_session else '0'
    #print("接收信息后session：", db_session)
    # 判断是否用户变更模版，如果是则清空信息
    if last_selected != selected_template or user_input.startswith("忘掉"):
        clear_messages(user_id)
        update_session(db, user_id, selected_template=selected_template)
        #print("Session after template change:")
        #print_session_info(db, user_id)
    
    interact_func = {
        "Claude": interact_with_claude,
        "Llama3": interact_with_groq,
        "distill": interact_with_groq,
        "Gemma2": interact_with_groq,
        "flash": interact_with_gemini,
        "nemo": interact_with_LLM,
        "V3": interact_with_deepseek,
        "R1": interact_with_deepseek,
    }.get(user_model, interact_with_openai)

    if interact_func == interact_with_groq or interact_func == interact_with_deepseek:
        n = user_model
    
    if user_input.startswith("写作") and user_model == "default" and not MODEL.startswith("gpt-4-"):
        interact_func = interact_with_claude

    if '文档' not in prompt_template[0]:
        if '总结' in prompt_template[0]:
            content = url_process(user_input)
            prompt = f"{prompt_template[1].format(question=content)!s}"
            response = interact_func(user_id, thread_id, user_input, prompt, prompt_template, n)
        else: 
            messages = get_user_messages(user_id) if 'Chat' in prompt_template[0] else []
            prompt = f"{prompt_template[1].format(question=user_input)!s}" if messages == [] else user_input
            # 添加与OpenAI交互的逻辑
            #n = 1
            response = interact_func(user_id, thread_id, user_input, prompt, prompt_template, n, messages)
    else:
        if user_input.startswith('#clear'):
            clear_files_with_prefix(user_id)
            return Response('data: {"data": "Cleared."}\n\n', mimetype='text/event-stream')
        if user_input.startswith('#file'):
            filelist = get_files_with_prefix(user_id) or "\u2757 没有文件上传。"
            return Response(f'data: {json.dumps({"data": filelist})}\n\n', mimetype='text/event-stream')
        if user_input.startswith('#name#'):
            update_chat_name(user_id, thread_id, user_input[6:])
            return Response('data: {"data": "请刷新页面。"}\n\n', mimetype='text/event-stream')

        if not uploaded_filename:
            return Response('data: {"data": "\u2757 请先选择或上传文档。"}\n\n', mimetype='text/event-stream')
        if uploaded_filename=='多文档检索' and user_input.startswith('总结'):
            return Response('data: {"data": "\u2757 请选择需要总结的对应文档。"}\n\n', mimetype='text/event-stream')
        if get_credits(user_id) <= 0:
            return Response('data: {"data": "\u2757 额度耗尽，请缴费后继续使用。"}\n\n', mimetype='text/event-stream')

        if user_input.startswith(('总结', '写作')):
            key_words = user_input
            if user_input.startswith('写作') and (num_tokens(user_input) <= 20):
                # 处理提取关键词逻辑
                try:
                    response = response_from_retriver(user_id, user_id + '_' + uploaded_filename, uploaded_filename, max_k, 2)
                    key_words = claude_response(f"提取以下内容的关键词，以/分隔显示，不超过5个：\n{response}")
                    #print("\n#Session after key words extracted:", session)        
                except Exception as e:
                    key_words = uploaded_filename
                key_words = user_input + '\n' + key_words  # 为用户提问增添关键词
        else:   # 对于文档检索需求用key_words获取信息
            try:
                key_words = groq_response(f"提取下面文本中的关键词，关键词只可能是名词或动词，不要把完整的词拆开（仅输出关键词，忽略写作指令）：\n[文本]\n{user_input}")
                print("关键词：", key_words)
            except:
                key_words = user_input

        fullpath_filename = user_id + '_' + uploaded_filename
        #if n==1:
        #    response = response_from_rag_chain(user_id, thread_id, fullpath_filename, user_input, True)
        #else:
        docs = response_from_retriver(user_id, fullpath_filename, key_words, max_k, k)
        #if '模仿' in prompt_template[0]:
        #    docchat_template = template_mimic
        #else:
        #docchat_template = template_WRITER if user_input.startswith(('写作')) else template_QUERY
        if user_input.startswith('写作'):
            if user_model == "R1" or MODEL_base.endswith("R1") and user_model == "default":
                prompt = f"{template_WRITER_R.format(question=user_input, context=docs)!s}"
            else:
                prompt = f"{template_WRITER.format(question=user_input, context=docs)!s}"
        elif '写' in user_input:  # 短文写作
            prompt = f"{template_WRITER_S.format(question=user_input, context=docs)!s}"
        elif user_input.startswith('总结'):
            prompt = f"{template_SUMMARY.format(context=docs)!s}"
        else:
            prompt = f"{template_QUERY.format(question=user_input, context=docs)!s}"

        response = interact_func(user_id, thread_id, user_input, prompt, prompt_template, n)
        #response = interact_with_pplx(user_id, thread_id, user_input, prompt, prompt_template, n)
        #response = multi_LLM_response(user_id, thread_id, user_input, prompt)
        #response = gemini_response_stream(prompt)

    return Response(response, mimetype='text/event-stream') #流式必须要用Response

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
        db = next(get_db())
        create_session(db, username, {'logged_in': True, 'user_id': username})
        #print_session_info(db, username)
        clear_messages(username)
        return jsonify({"message": "登录成功"}), 200
    else:
        return jsonify({"message": "用户名或密码错误"}), 401
    
@app.route('/check_session', methods=['GET'])
def check_session():
    user_id = request.args.get('user_id')
    db = next(get_db())
    session = get_session(db, user_id)
    if session and session.data.get('logged_in'):
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

@app.route('/check_credits')
def check_credits():
    user_id = request.args.get('user_id')
    credits = get_credits(user_id)
    if credits:
        return jsonify({"credits": credits}), 200
    else:
        return jsonify({"credits": False}), 401

@app.route('/generate-cards', methods=['POST'])
def generate_cards():
    try:
        # 获取请求数据
        content = url_process(request.json.get('content'))

        # 构建 prompt
        prompt = f"""
        分析以下文章内容,提取其中的关键概念,生成:
        1. 一个主标题
        2. 为每个概念生成:
           - 标题(简短有力)
           - 描述(50字以内)
           - 图标
        3. 根据文章内容的情感和主题,生成一个合适的渐变背景色方案
           - 使用深色系 HEX 颜色代码
           - 两个颜色都必须是深色(亮度值小于50%)
           - 建议使用以下颜色范围:
             * 深蓝色系: #1e3a8a ~ #1e40af
             * 深紫色系: #5b21b6 ~ #7c3aed
             * 深青色系: #164e63 ~ #0e7490
             * 深绿色系: #065f46 ~ #047857
           - 确保颜色搭配协调且具有视觉吸引力
           - 必须确保白色文字在此背景上清晰可见

        必须用中文输出,以JSON格式返回:
        {{
          "maintitle": "主标题",
          "background": {{
            "startColor": "#起始深色",
            "endColor": "#结束深色"
          }},
          "cards": [
            {{
              "icon": "选择的图标名",
              "title": "概念标题",
              "description": "概念描述"
            }}
          ]
        }}
        
        文章内容:
        {content}
        """
        
        # 调用 Gemini API
        response_text = gemini_schema_response(prompt)
        response_data = json.loads(response_text)
        
        return jsonify(response_data)
        
    except Exception as error:
        print('Error generating cards:', str(error))
        return jsonify({
            'error': '生成卡片时出错',
            'details': str(error)
        }), 500

@app.route('/')
def index():
    return render_template('index.html')

#if __name__ == '__main__':
#    app.run(debug=True, host='0.0.0.0', port=5858)