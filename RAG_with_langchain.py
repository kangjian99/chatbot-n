from langchain_community.document_loaders import TextLoader, PyPDFLoader, Docx2txtLoader
from langchain_community.vectorstores import SupabaseVectorStore
from langchain.text_splitter import CharacterTextSplitter, RecursiveCharacterTextSplitter
from langchain.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from langchain_openai import OpenAIEmbeddings
from langchain.schema.runnable import RunnablePassthrough
from langchain.schema.output_parser import StrOutputParser
import os, json, re
from settings import API_KEY, model
from utils import UPLOAD_FOLDER, count_chars
import tiktoken
from templates import *
from db_process import supabase, save_user_memory

#cache = {}
#max_cache_size = 10
tem = 0
top_k = 4
max_k = 10

enc = tiktoken.get_encoding("cl100k_base") # 以 token 计算文本块长度
def length_function(text: str) -> int:
    return len(enc.encode(text))

text_splitter = RecursiveCharacterTextSplitter(
                #separators=['\n\n','\n'],
                chunk_size=350,
                chunk_overlap=50,
                length_function=length_function,
                add_start_index = True,)

template = template
template_writer = template_writer

#prompt = ChatPromptTemplate.from_template(template)

llm = ChatOpenAI(openai_api_key = API_KEY, model_name = model, temperature = tem)

def format_docs(docs):
    return "\n\n".join(doc.page_content for doc in docs)

def load_and_process_document(user_id, file_name):
    file_path = os.path.join(UPLOAD_FOLDER, user_id+'_'+file_name)
    # 获取文件扩展名
    _, file_extension = os.path.splitext(file_path)
    file_extension = file_extension.lower()

    # 根据文件扩展名选择合适的加载器
    if file_extension == '.txt':
        loader = TextLoader(file_path)
        documents = loader.load()
    elif file_extension == '.docx':
        loader = Docx2txtLoader(file_path)
        documents = loader.load()
    elif file_extension == '.pdf':
        loader = PyPDFLoader(file_path)
        documents = loader.load_and_split()
    else:
        raise ValueError("Unsupported file extension")
    
    documents[0].page_content = re.sub(r'\n+', '\n', documents[0].page_content) #去除多余换行符
    print(documents[0].page_content[:200]) # 打印文档的第一页内容的前200个字符

    # 分割文档
    chunks = text_splitter.split_documents(documents)
    print("Chunks length:", len(chunks))
    for chunk in chunks:
        metadata = {
            "user_id": user_id,
        }
        chunk.metadata.update(metadata)
                
    # 创建向量存储
    vectorstore = SupabaseVectorStore.from_documents(
        client=supabase,    
        documents=chunks,
        embedding=OpenAIEmbeddings(openai_api_key=API_KEY, model="text-embedding-3-small"),
        table_name="documents",
        query_name="match_documents",
    )
    return vectorstore

def retrieve(prompt, top_k, vectorstore, filter):
    # 创建检索器
    retriever = vectorstore.as_retriever(search_kwargs={"k": top_k, "filter": filter})

    rag_chain = (
        {"context": retriever | format_docs,  "question": RunnablePassthrough()} 
        | prompt 
        | llm
        | StrOutputParser() 
    )
    return retriever, rag_chain

def response_from_rag_chain(user_id, thread_id, file_name, query, stream=False):
    vectorstore = SupabaseVectorStore(
        client=supabase,    
        embedding=OpenAIEmbeddings(openai_api_key=API_KEY, model="text-embedding-3-small"),
        table_name="documents",
        query_name="match_documents",
    )
    top_k = max_k if query.startswith(('总结', '写作')) else 4
    prompt = ChatPromptTemplate.from_template(template_writer)if query.startswith(('总结', '写作')) else ChatPromptTemplate.from_template(template)
    filter = { "user_id": user_id } if file_name.endswith("_多文档检索") else { "source": os.path.join(UPLOAD_FOLDER, file_name) }
    print("***filter***:", filter)
    retriever, rag_chain = retrieve(prompt, top_k, vectorstore, filter)
    #docs = retriever.get_relevant_documents(query) # 返回检索结果
    #print(format_docs(docs), '\n检索数量：', len(docs))

    full_message = ''
    if not stream:
        response = rag_chain.invoke(query)
        return(response)
    else:
        try:
            for chunk in rag_chain.stream(query):
                full_message += chunk
                yield(f"data: {json.dumps({'data': chunk})}\n\n")
        finally:
            save_user_memory(user_id, thread_id, query, full_message, count_chars(query+full_message, user_id))

def response_from_retriver(user_id, file_name, query, k=top_k):
    vectorstore = SupabaseVectorStore(
        client=supabase,    
        embedding=OpenAIEmbeddings(openai_api_key=API_KEY, model="text-embedding-3-small"),
        table_name="documents",
        query_name="match_documents",
    )
    top_k = max_k if query.startswith(('总结', '写作')) else k
    #prompt = ChatPromptTemplate.from_template(template_writer)if query.startswith(('总结', '写作')) else ChatPromptTemplate.from_template(template)
    #retriever = vectorstore.as_retriever(search_kwargs={"k": top_k})
    if file_name.endswith("_多文档检索"):
        docs = vectorstore.similarity_search(query, k=top_k, filter={ "user_id": user_id })
    else:
        file_name = os.path.join(UPLOAD_FOLDER, file_name)
        docs = vectorstore.similarity_search(query, k=top_k, filter={ "source": file_name }) # 返回检索结果
    print('\n检索数量：', file_name, len(docs))
    return format_docs(docs)
