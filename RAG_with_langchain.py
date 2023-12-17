from langchain.document_loaders import TextLoader, PyPDFLoader, Docx2txtLoader
from langchain.embeddings import OpenAIEmbeddings
from langchain.vectorstores import Weaviate
from langchain.text_splitter import CharacterTextSplitter, RecursiveCharacterTextSplitter
from langchain.prompts import ChatPromptTemplate
from langchain.chat_models import ChatOpenAI
from langchain.schema.runnable import RunnablePassthrough
from langchain.schema.output_parser import StrOutputParser
import weaviate, os
from weaviate.embedded import EmbeddedOptions
from settings import API_KEY, model, WEAVIATE_URL, WEAVIATE_API_KEY
from utils import UPLOAD_FOLDER
from db_process import tiktoken, json

cache = {}
max_cache_size = 10
tem = 0
top_k = 4

enc = tiktoken.get_encoding("cl100k_base") # 以 token 计算文本块长度
def length_function(text: str) -> int:
    return len(enc.encode(text))

text_splitter = RecursiveCharacterTextSplitter(
                #separators=['\n\n','\n'],
                chunk_size=500,
                chunk_overlap=50,
                length_function=length_function,
                add_start_index = True,)

weaviate_client = weaviate.Client(
    url=WEAVIATE_URL,
    auth_client_secret=weaviate.AuthApiKey(api_key=WEAVIATE_API_KEY),
)

template = """You are an assistant for question-answering tasks.
Use the following pieces of retrieved context to answer the question only in Chinese.
If you don't know the answer, just politely say that you don't know. 
Question: {question} 
Context: {context} 
Assistant answer based on most relevant sentences in the context:
""" # 最后一句非常关键
template_writer = """你是一位语言优美的写作专家，Use the following pieces of context to rewrite an detailed and structual article in Chinese based on the user question.
POSITIVE:先思考大纲，用重新组织的文字输出，文章结构包括主标题和子标题，符合用户的字数要求。
NEGATIVE:Copy whole paragraphs from context.
Think before response. If you don't know the answer, just say "Sorry, I don't know", don't try to make up an answer. 
Question: {question}
###
{context}
###
Assistant write article:
""" # 

#prompt = ChatPromptTemplate.from_template(template)

llm = ChatOpenAI(openai_api_key = API_KEY, model_name = model, temperature = tem)

def format_docs(docs):
    return "\n\n".join(doc.page_content for doc in docs)

def load_and_process_document(file_name):
    file_path = os.path.join(UPLOAD_FOLDER, file_name)
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

    print(documents[0].page_content[:200]) # 打印文档的第一页内容的前200个字符

    # 分割文档
    chunks = text_splitter.split_documents(documents)
    print("Chunks length:", len(chunks))

    # 创建向量存储
    vectorstore = Weaviate.from_documents(
        client=weaviate_client,    
        documents=chunks,
        embedding=OpenAIEmbeddings(openai_api_key=API_KEY),
        by_text=False
    )
    return vectorstore

def retrieve(prompt, top_k, vectorstore):
    # 创建检索器
    retriever = vectorstore.as_retriever(search_kwargs={"k": top_k})

    rag_chain = (
        {"context": retriever | format_docs,  "question": RunnablePassthrough()} 
        | prompt 
        | llm
        | StrOutputParser() 
    )
    return retriever, rag_chain

def get_cache(file_name):
    print('Cache length:', len(cache), list[cache.keys()], cache)
    cache_id = file_name

    if cache_id not in cache:
        if len(cache) >= max_cache_size:
            # 删除最早添加的缓存条目
            oldest_key = next(iter(cache))
            del cache[oldest_key]        
        # 添加新的缓存条目
        try:
            cache[cache_id] = load_and_process_document(file_name)
        except Exception as e:
            print(f"Error loading and processing document: {e}")
            return None

    return cache[cache_id]

#retriever, rag_chain = get_cache(file_path)

def response_from_rag_chain(file_name, query, stream=False):
    vectorstore = get_cache(file_name)
    top_k = 10 if query.startswith(('总结', '写作')) else 4
    prompt = ChatPromptTemplate.from_template(template_writer)if query.startswith(('总结', '写作')) else ChatPromptTemplate.from_template(template)
    retriever, rag_chain = retrieve(prompt, top_k, vectorstore)
    docs = retriever.get_relevant_documents(query) # 返回检索结果
    #print(format_docs(docs), '\n检索数量：', len(docs))

    if not stream:
        response = rag_chain.invoke(query)
        return(response)
    else:
        partial_text = ''
        for chunk in rag_chain.stream(query):
            partial_text += chunk
            yield(f"data: {json.dumps({'data': partial_text})}\n\n")

def response_from_retriver(file_name, query, k):
    vectorstore = get_cache(file_name)
    top_k = k if query.startswith(('总结', '写作')) else 4
    #prompt = ChatPromptTemplate.from_template(template_writer)if query.startswith(('总结', '写作')) else ChatPromptTemplate.from_template(template)
    retriever = vectorstore.as_retriever(search_kwargs={"k": top_k})

    docs = retriever.get_relevant_documents(query) # 返回检索结果
    print('\n检索数量：', len(docs))
    return format_docs(docs)

def get_cache_serial():
    """
    为cache中的每个键生成一个唯一的序列号，并返回新的字典。
    
    Parameters:
    cache (dict): 包含键值对的字典。

    Returns:
    dict: 包含序列号和cache键的新字典。
    """
    serial_number = 1  # 初始序列号
    result_dict = {}

    for key in cache:
        parts = key.split("_", 1)
        formatted_key = parts[1] if len(parts) > 1 else None
        result_dict[serial_number] = formatted_key
        serial_number += 1

    return result_dict