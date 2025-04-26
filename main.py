from fastapi import FastAPI, HTTPException, Query, File, UploadFile, Form, Request, Depends
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import json
from sqlalchemy.orm import Session
from session_db import get_db, get_session, create_session, update_session
from db_process import *
from RAG_with_langchain import load_and_process_document, response_from_rag_chain, response_from_retriver
from webloader import *
from templates import template_QUERY, template_WRITER, template_WRITER_R, template_WRITER_S, template_SUMMARY
from utils import *
from openai_func import interact_with_openai, param_n
from claude import claude_response_stream, interact_with_claude, claude_response

from geminiai import interact_with_gemini
from payload import interact_with_LLM
from groq_func import groq_response, groq_response_stream, interact_with_groq
from deepseek_func import interact_with_deepseek

#from test_LLMs import multi_LLM_response

app = FastAPI()

# 以下对应FastAPI在zeabur跨域部署
# 从环境变量获取允许的跨域来源（多个来源用逗号分隔）
origins = os.getenv("ALLOWED_ORIGINS", "*").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # FastAPI携带凭据时要求显式指定，不允许["*"]所有来源
    allow_credentials=True,  # 允许携带 Cookie 认证
    allow_methods=["*"],  # 允许所有 HTTP 方法
    allow_headers=["*"],  # 允许所有请求头
)

# Pydantic models for request bodies

class LoginData(BaseModel):
    username: str
    password: str

class MessageData(BaseModel):
    user_id: str
    user_input: str
    thread_id: str
    selected_template: str
    selected_file: Optional[str] = None
    max_k: int = 10
    k: int = 4
    user_model: str
    prompt_template: list[str]

@app.get('/prompts')
async def get_prompts():
    prompts = get_prompt_templates()
    prompts_list = list(prompts.items())
    return JSONResponse(content=prompts_list)

@app.post('/upload')
async def upload_file(file: UploadFile = File(...), user_id: str = Form(...), db: Session = Depends(get_db)):
    if file and allowed_file(file.filename):    
        filename = safe_filename(file.filename)
        file_path = os.path.join(UPLOAD_FOLDER, f"{user_id}_{filename}")
        
        with open(file_path, "wb") as buffer:
            buffer.write(await file.read())
        
        update_session(db, user_id, uploaded_filename=filename)
        
        new_doc = save_doc_name(user_id, filename)
        if new_doc == True:
            info = load_and_process_document(user_id, filename)
            return JSONResponse(content=f'\u2705 文档上传成功 ("{filename}" {info})，较长文档需等待系统预处理10秒以上再检索。')
        elif new_doc == False:
            return JSONResponse(content=f'\u2757 同名文档已存在无法上传："{filename}"，如需覆盖请先清除已上传文档。')
        else:
            raise HTTPException(status_code=400, detail='\u274C 文档上传失败，请重新操作。')
    else:
        return 'File type not allowed', 400
    
@app.get('/get-filenames')
async def get_filenames(user_id: str):
    file_names = get_doc_names(user_id)
    return JSONResponse(content=file_names)

def check_writing(user_input):
    prompt = f"""
    判断下面需求是否属于写文章的需求，仅返回JSON格式：{{"is_writing": "Y"}} 或 {{"is_writing": "N"}}

    需求如下：
    {user_input}
    """
    try:
        res = groq_response(prompt)
        is_writing = json.loads(res).get("is_writing", "N")  # 默认是 "N"
        print("是否写作需求：", res)
    except json.JSONDecodeError:
        is_writing = "N"
        print("***Server Error***")
    return is_writing=='Y'

@app.post('/message')
async def handle_message(data: MessageData, db: Session = Depends(get_db)):
    print(data.model_dump())
    user_id = data.user_id
    user_input = data.user_input
    thread_id = data.thread_id
    selected_template = data.selected_template
    uploaded_filename = data.selected_file
    max_k = data.max_k
    k = data.k
    user_model = data.user_model
    prompt_template = data.prompt_template
    n = param_n

    db_session = get_session(db, user_id)
    last_selected = db_session.selected_template if db_session else '0'
    
    if last_selected != selected_template or user_input.startswith("忘掉"):
        clear_messages(user_id)
        update_session(db, user_id, selected_template=selected_template)
    
    interact_func = {
        "Claude": interact_with_claude,
        "Llama3": interact_with_groq,
        "Gemma": interact_with_groq,
        "qwq": interact_with_groq,
        "flash": interact_with_gemini,
        "exp": interact_with_gemini,
        "mistral": interact_with_LLM,
        "V3": interact_with_deepseek,
        "R1": interact_with_deepseek,
        "reasoner": interact_with_deepseek,
    }.get(user_model, interact_with_openai)

    if interact_func == interact_with_groq or interact_func == interact_with_deepseek:
        n = user_model
    
    is_writing = check_writing(user_input)
    if is_writing:
        user_input = "写作：" + user_input

    if user_input.startswith("写作") and user_model == "default" and not 'r1' in MODEL.lower():  # 写作需求默认模型非R1改为gemini
        interact_func = interact_with_gemini

    if '文档' not in prompt_template[0]:
        if '总结' in prompt_template[0]:
            content = url_process(user_input, MODEL)
            prompt = f"{prompt_template[1].format(question=content)!s}"
            response = interact_func(user_id, thread_id, user_input, prompt, prompt_template, n)
        else: 
            messages = get_user_messages(user_id) if 'Chat' in prompt_template[0] else []
            prompt = f"{prompt_template[1].format(question=user_input)!s}" if messages == [] else user_input
            # 添加与OpenAI交互的逻辑
            n = 1
            response = interact_func(user_id, thread_id, user_input, prompt, prompt_template, n, messages)
    else:
        if user_input.startswith('#clear'):
            clear_files_with_prefix(user_id)
            return StreamingResponse('data: {"data": "Cleared."}\n\n', media_type='text/event-stream')
        if user_input.startswith('#file'):
            filelist = get_files_with_prefix(user_id) or "\u2757 没有文件上传。"
            return StreamingResponse(f'data: {json.dumps({"data": filelist})}\n\n', media_type='text/event-stream')
        if user_input.startswith('#name#'):
            update_chat_name(user_id, thread_id, user_input[6:])
            return StreamingResponse('data: {"data": "请刷新页面。"}\n\n', media_type='text/event-stream')

        if not uploaded_filename:
            return StreamingResponse('data: {"data": "\u2757 请先选择或上传文档。"}\n\n', media_type='text/event-stream')
        if uploaded_filename=='多文档检索' and user_input.startswith('总结'):
            return StreamingResponse('data: {"data": "\u2757 请选择需要总结的对应文档。"}\n\n', media_type='text/event-stream')
        if get_credits(user_id) <= 0:
            return StreamingResponse('data: {"data": "\u2757 额度耗尽，请缴费后继续使用。"}\n\n', media_type='text/event-stream')

        if user_input.startswith(('总结', '写作')) or is_writing:
            key_words = user_input
            if user_input.startswith('写作') and (num_tokens(user_input) <= 20):
                # 处理提取关键词逻辑
                try:
                    response = response_from_retriver(user_id, user_id + '_' + uploaded_filename, uploaded_filename, is_writing, max_k, 2)
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
        docs = response_from_retriver(user_id, fullpath_filename, key_words, is_writing, max_k, k)
        #if '模���' in prompt_template[0]:
        #    docchat_template = template_mimic
        #else:
        #docchat_template = template_WRITER if user_input.startswith(('写作')) else template_QUERY

        if is_writing:
            if ('r1' in MODEL.lower() and user_model == "default") or user_model in ["R1", "reasoner", "qwq"]:
                prompt = f"{template_WRITER_R.format(question=user_input, context=docs)!s}"
            else:
                prompt = f"{template_WRITER.format(question=user_input, context=docs)!s}"
        #elif '写' in user_input:
        #    prompt = f"{template_WRITER_S.format(question=user_input, context=docs)!s}"
        elif user_input.startswith('总结'):
            prompt = f"{template_SUMMARY.format(context=docs)!s}"
        else:
            prompt = f"{template_QUERY.format(question=user_input, context=docs)!s}"

        response = interact_func(user_id, thread_id, user_input, prompt, prompt_template, n)
        #response = interact_with_pplx(user_id, thread_id, user_input, prompt, prompt_template, n)
        #response = multi_LLM_response(user_id, thread_id, user_input, prompt)
        #response = gemini_response_stream(prompt)

    return StreamingResponse(response, media_type='text/event-stream') #流式必须要用Response

@app.get('/clear')
async def clear_file(user_id: str, file_name: str):
    if file_name:
        delete_doc_from_database(user_id, file_name)
    return JSONResponse(content="Files and cache cleared successfully")

@app.post('/login')
async def login(data: LoginData, db: Session = Depends(get_db)):
    if authenticate_user(data.username, data.password):
        create_session(db, data.username, data={"logged_in": True})
        clear_messages(data.username)
        return JSONResponse(content={"message": "登录成功"})
    else:
        raise HTTPException(status_code=401, detail="用户名或密码错误")

@app.get('/check_session')
async def check_session(user_id: str = Query(...), db: Session = Depends(get_db)):
    if user_id:
        db_session = get_session(db, user_id)
        if db_session and db_session.data.get("logged_in"):
            return JSONResponse(content={"logged_in": True, "user_id": user_id})
    return JSONResponse(status_code=401, content={"logged_in": False})

@app.get('/memory')
async def load_memory(user_id: str = Query(...), thread_id: str = Query(...),):
    messages = get_user_memory(user_id, thread_id)
    return JSONResponse(content=messages)

@app.get('/get-threads')
async def get_threads(user_id: str = Query(...), length: int = Query(...), table: str = 'memory_by_thread'):
    threads = []
    limit = 5 if length == 0 else 1

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

    return JSONResponse(threads)

@app.get('/check_credits')
async def check_credits(user_id: str):
    credits = get_credits(user_id)
    if credits:
        return JSONResponse(content={"credits": credits})
    else:
        raise HTTPException(status_code=401, detail="Credits not available")
