from langchain_community.document_loaders import TextLoader, PyPDFLoader, Docx2txtLoader
from langchain_community.vectorstores import SupabaseVectorStore
from langchain.text_splitter import CharacterTextSplitter, RecursiveCharacterTextSplitter
from langchain.prompts import ChatPromptTemplate, PromptTemplate
from langchain_openai import ChatOpenAI
from langchain_openai import OpenAIEmbeddings
from langchain.schema.runnable import RunnablePassthrough
from langchain.schema.output_parser import StrOutputParser
from langchain.output_parsers import StructuredOutputParser, ResponseSchema
import os, json, re
from settings import API_KEY, API_KEY_HUB, model, hub, BASE_URL
from utils import UPLOAD_FOLDER, count_chars
import tiktoken
from templates import *
from db_process import supabase, save_user_memory, read_table_data
from mmr_patch import max_marginal_relevance_search
from langchain.chains import LLMChain

#from langchain.docstore.document import Document
#from llamaParse import parsed_from_pdf
import pandas as pd

#cache = {}
#max_cache_size = 10
tem = 0.3
top_k = 4
max_k = 10

enc = tiktoken.get_encoding("cl100k_base") # 以 token 计算文本块长度
def length_function(text: str) -> int:
    return len(enc.encode(text))

text_splitter = RecursiveCharacterTextSplitter(
                #separators=['\n\n','\n'],
                chunk_size=500,
                chunk_overlap=50,
                length_function=length_function,
                add_start_index = True,)

#prompt = ChatPromptTemplate.from_template(template)

if hub:
    llm = ChatOpenAI(openai_api_key = API_KEY_HUB, openai_api_base = BASE_URL, model_name = model, temperature = tem)
else:
    llm = ChatOpenAI(openai_api_key = API_KEY, model_name = model, temperature = tem)

def get_keywords(user_id):
    tablename = 'keywords'
    data = read_table_data(tablename)
    target_row = next((row for row in data if row['user_id'] == user_id), None)
    print("keyword list:", target_row)
    return target_row

def get_expansion_queries(user_id, query):
    # 结构化方式提取关键词
    #keyword_list = "英仕派/艾力绅/HR-V/问界"
    row = get_keywords(user_id)
    if row:
        name = row['name']
        keyword_list = row['keywords']
    else:
        return ""
    keyword_schema = ResponseSchema(name=f"{name}", description=f"提取{name}关键词, must be one of {keyword_list}, if not exists leave blank")
    response_schemas = [keyword_schema] # 可以多个元素
    output_parser = StructuredOutputParser.from_response_schemas(response_schemas)
    format_instructions = output_parser.get_format_instructions()
    #print(format_instructions)

    KEYWORD_PROMPT = PromptTemplate(
        input_variables=["question"],
        template="""You are an AI language model assistant. Your task is to extract keywords from the given user question.
        User question: {question}
        RESPONSE: {format_instructions}""",
        partial_variables={"format_instructions": format_instructions}
    )

    llm_chain = LLMChain(llm=llm, prompt=KEYWORD_PROMPT)
    queries = llm_chain.invoke(input={"question" : query})
    keywords = output_parser.parse(queries.get("text"))
    print("keywords extracted:", keywords)
    return keywords[f"{name}"]

def format_docs(docs):
    df = pd.DataFrame([doc.page_content for doc in docs], columns=["content"])
    print(df)
    df.to_csv("search_results.csv")    
    return "\n\n".join(doc.page_content for doc in docs)

def chunks_process(user_id, chunks, file_path, keyword):
    df = pd.DataFrame(columns=["source", "chunk_no", "content"])
    filename = os.path.basename(file_path)
    i = 0
    for chunk in chunks:
        metadata = {
            "user_id": user_id,
        }
        chunk.metadata.update(metadata)
        if keyword and keyword not in chunk.page_content:
            chunk.page_content = keyword + '\n' + chunk.page_content
        i += 1
        df = pd.concat([df, pd.DataFrame({"source": filename, "chunk_no": i, "content": chunk.page_content}, index=[0])])

    if length_function(chunks[-1].page_content) < 100:
        chunks[-2].page_content += chunks[-1].page_content
        chunks = chunks[:-1]

    # df["ID"] = df["source"].str.replace(".txt", "", regex=False) + "-" + df["chunk_no"].astype(str)
    # df = df[["ID", "source", "chunk_no", "content"]]

    df = df.reset_index(drop=True)
    print(df.head(3))
    df.to_csv("chunks.csv")
    
    return chunks

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
        # llamaParse
        #documents = [Document(page_content="", metadata={"source": file_path})]
        #documents[0].page_content = parsed_from_pdf(file_path)
    else:
        raise ValueError("Unsupported file extension")
    
    documents[0].page_content = re.sub(r'\n+', '\n', documents[0].page_content) #去除多余换行符
    # print(documents[0].page_content[:200]) # 打印文档的第一页内容的前200个字符

    #keyword_extracted = get_expansion_queries(user_id, file_name) # 直接返回关键词
    #keyword = keywords['auto_name'] # 如果返回字典，分别提取关键词
    # 分割文档
    chunks = text_splitter.split_documents(documents)
    chunks = chunks_process(user_id, chunks, file_path, keyword_extracted='')
    print("Chunks length:", len(chunks))

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
    filter = { "user_id": user_id } if file_name.endswith("_多文档检索") else { "source": os.path.join(UPLOAD_FOLDER, file_name) }

    if query.startswith(('总结', '写作')):
        #docs = vectorstore.max_marginal_relevance_search(query, k=top_k, filter={ "user_id": user_id })
        docs = max_marginal_relevance_search(vectorstore, query=query, k=top_k, filter=filter) # 返回最大边际相关性检索结果
    else:
        docs = vectorstore.similarity_search(query, k=top_k, filter=filter) # 返回检索结果
        #docs = vectorstore.max_marginal_relevance_search(query, k=top_k, filter={ "source": file_name })
    print('\n检索数量：', file_name, len(docs))
    return format_docs(docs)
