from langchain_community.tools import DuckDuckGoSearchRun
from langchain_core.tools import tool

search_engine = DuckDuckGoSearchRun()

@tool
def cari_tren_terkini(query: str):
    """Mencari tren, berita, atau fakta terkini di internet"""
    return search_engine.run(query)

tools_list = [cari_tren_terkini]
