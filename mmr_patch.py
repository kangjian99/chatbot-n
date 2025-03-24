from typing import Any, Dict, List, Optional
import numpy as np
from langchain_core.documents import Document
from langchain_community.vectorstores.utils import maximal_marginal_relevance

def max_marginal_relevance_search(
    vectorstore,
    query: str,
    k: int = 4,
    fetch_k: int = 50,
    lambda_mult: float = 0.5,
    filter: Optional[Dict[str, Any]] = None,
    **kwargs: Any,
) -> List[Document]:

    embedding = vectorstore._embedding.embed_query(query)
    result = vectorstore.similarity_search_by_vector_returning_embeddings(
        embedding, fetch_k, filter=filter
    )
    
    filtered_tuple = [item for item in result if len(item[0].page_content) >= 20 and item[1] > 0.3] # 过滤过短及相关性过低的内容
    filtered_tuple = filtered_tuple or [item for item in result if len(item[0].page_content) >= 20] # 如果结果为空则去除相关性要求

    matched_documents, scores, matched_embeddings = zip(*filtered_tuple) # 分别赋值为元组的第一个、第二个和第三个元素

    if len(matched_documents) > k:
        mmr_selected = maximal_marginal_relevance(
            np.array([embedding], dtype=np.float32),
            matched_embeddings,
            k=k,
            lambda_mult=lambda_mult,
        )

        #docs = [matched_documents[i] for i in mmr_selected]

        mmr_with_sml = list(set(mmr_selected) | set(range(min(10, k))))
        docs = [matched_documents[i] for i in mmr_with_sml]

        print(scores, mmr_with_sml, mmr_selected, [scores[i] for i in mmr_selected])
    else:
        docs = matched_documents
       
    return docs