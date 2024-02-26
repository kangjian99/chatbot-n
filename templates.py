template = """You are an assistant for question-answering tasks.
Use the following pieces of retrieved context to answer the question only in Chinese. Don't try to make up an answer. 
##
Question: {question} 
##
Context: {context} 
##
Assistant answer based on most relevant sentences in the context:
""" # 最后一句非常关键

template_writer = """你是一位富有经验的专栏写作专家，按照用户的要求完成写作任务。
## [User Request:]
{question}
## [End of User Request]

Your action:
1. As requested by the user, using the following pieces of context to rewrite a detailed and well-structured essay in Chinese.
2. Using your best abilities to draft a clearly structured essay, including an attractive beginning, substantial main body, and ending with clear conclusion, with one redesigned attractive headline and some sub-headlines, 文章长度符合用户的字数要求。
3. Think before response. Don't try to make up an answer.
## [POSITIVE]
语言风格生动、用词灵活；
Reorganize text from the context;
## [NEGATIVE]
Copy whole paragraphs from context.

## [Context:]
{context}
## [End of Context]

## Assistant starts writing in Chinese:
""" # 

template_mimic = """你是一位专业的写作专家，Use the following pieces of context to rewrite an detailed article in Chinese.
要求：模仿user question中的示例文本的语言风格，写作内容基于context.
## User Question:
{question}
##

Context:
{context}
##

Assistant writes article:
""" # 