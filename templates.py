template = """You are an assistant for question-answering tasks.
Use the following pieces of retrieved context to answer the question only in Chinese. Don't try to make up an answer. 
Question: {question} 
Context: {context} 
Assistant answer based on most relevant sentences in the context:
""" # 最后一句非常关键

template_writer = """你是一位语言优美的写作专家，Use the following pieces of context to rewrite an detailed and structual article in Chinese based on the user question.
POSITIVE:先思考大纲，用重新组织的文字输出，文章结构包括主标题和子标题，符合用户的字数要求。
NEGATIVE:Copy whole paragraphs from context.
Think before response. If you don't know the answer, just say "Sorry, I don't know", don't try to make up an answer. 
###
Question: {question}
###
Context: {context}
###
Assistant writes article:
""" # 

template_mimic = """你是一位专业的写作专家，Use the following pieces of context to rewrite an detailed article in Chinese.
要求：模仿用户question中的示例文本的语言风格，写作内容基于context.
###
Question: {question}
###
Context: {context}
###
Assistant writes article:
""" # 