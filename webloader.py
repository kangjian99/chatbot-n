from langchain_community.document_loaders import AsyncChromiumLoader
from langchain_community.document_transformers import BeautifulSoupTransformer
from langchain_community.document_loaders import WebBaseLoader
import re
from utils import num_tokens

def url_process(input, model):
    url_pattern = re.compile(r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+')    
    # 在文本开头查找第一个匹配的URL
    match = url_pattern.search(input[:128])
    if match:
        url = match.group()
        loader = WebBaseLoader(url, header_template={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36'}, 
    encoding='utf-8', requests_kwargs={'verify':False})
        content = loader.load()
        content = re.sub('\n{3,}', '\n\n', re.sub('\t{2,}', '\t', content[0].page_content))
        #print(content)
        if not model.endswith('32k') and num_tokens(content) > 12000:
            content = content[:12000]
    else:
        content = input
    return content

def webloader_html(url):
    # Load HTML
    loader = AsyncChromiumLoader(url)
    html = loader.load()

    # Transform
    bs_transformer = BeautifulSoupTransformer()
    docs_transformed = bs_transformer.transform_documents(
        html, tags_to_extract=["p", "li", "div", "a"]
    )

    print(docs_transformed[0].page_content[0:500])