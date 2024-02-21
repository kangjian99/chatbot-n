from typing import Any, Dict, List, Optional
import numpy as np
from langchain_core.documents import Document
from langchain_community.vectorstores.utils import maximal_marginal_relevance

def max_marginal_relevance_search(
    vectorstore,
    query: str,
    k: int = 4,
    fetch_k: int = 20,
    lambda_mult: float = 0.5,
    filter: Optional[Dict[str, Any]] = None,
    **kwargs: Any,
) -> List[Document]:

    embedding = vectorstore._embedding.embed_query(query)
    result = vectorstore.similarity_search_by_vector_returning_embeddings(
        embedding, fetch_k, filter=filter
    )
    
    filtered_tuple = [item for item in result if len(item[0].page_content) >= 20 and item[1] > 0.3] # 过滤过短及相关性过低的内容

    matched_documents, scores, matched_embeddings = zip(*filtered_tuple) # 分别赋值为元组的第一个、第二个和第三个元素

    mmr_selected = maximal_marginal_relevance(
        np.array([embedding], dtype=np.float32),
        matched_embeddings,
        k=k,
        lambda_mult=lambda_mult,
    )

    docs = [matched_documents[i] for i in mmr_selected]
    print(scores, mmr_selected, [scores[i] for i in mmr_selected])
       
    return docs