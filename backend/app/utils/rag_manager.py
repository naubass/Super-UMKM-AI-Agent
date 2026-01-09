import os
import pandas as pd
from langchain_community.vectorstores import FAISS
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import PyPDFLoader
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_core.documents import Document

DB_FAISS_PATH = "vectorstores/db_faiss"
os.makedirs(DB_FAISS_PATH, exist_ok=True)

embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")

def process_document(file_path: str, file_type: str):
    """
    Fungsi sakti untuk mengubah PDF/Excel jadi Database Vektor (FAISS)
    """
    docs = []
    
    if file_type == "pdf":
        loader = PyPDFLoader(file_path)
        docs = loader.load()
    elif file_type in ["xlsx", "xls", "csv"]:
        if "csv" in file_type:
            df = pd.read_csv(file_path)
        else:
            df = pd.read_excel(file_path)

        text_data = ""

        for _, row in df.iterrows():
            row_str = " | ".join([f"{col}: {val}" for col, val in row.items()])
            text_data += row_str + "\n"
        
        docs = [Document(page_content=text_data, metadata={"source": file_path})]
    
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=2000, chunk_overlap=0)
    docs = text_splitter.split_documents(docs)

    db = FAISS.from_documents(docs, embeddings)
    db.save_local(DB_FAISS_PATH)

    return f"Berhasil mengubah {len(docs)} menjadi Database Vektor"

def get_answer_from_doc(query: str):
    """
    Fungsi untuk mencari jawaban di dalam dokumen
    """
    if not os.path.exists(DB_FAISS_PATH):
        return "Belum ada Database Vektor. Silahkan upload dokumen terlebih dahulu."
    
    new_db = FAISS.load_local(DB_FAISS_PATH, embeddings, allow_dangerous_deserialization=True)

    retriever = new_db.as_retriever(searck_kwargs={"k": 15})
    docs = retriever.invoke(query)

    context_text = "\n".join([doc.page_content for doc in docs])
    return context_text