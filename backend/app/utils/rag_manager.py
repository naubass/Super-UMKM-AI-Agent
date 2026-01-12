import os
import pandas as pd
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_experimental.agents.agent_toolkits import create_pandas_dataframe_agent
from langchain_groq import ChatGroq
from app.core.config import settings

DB_FAISS_PATH = "vectorstore/db_faiss"
os.makedirs("vectorstore", exist_ok=True)
os.makedirs("uploads", exist_ok=True) 

embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")

# Simpan state file terakhir di memori
current_file_path = None
current_file_type = None

def process_document(file_path: str, file_type: str):
    """
    Router:
    - Jika PDF -> Masuk FAISS (RAG)
    - Jika Excel -> Simpan Path saja (Pandas Agent akan baca langsung nanti)
    """
    global current_file_path, current_file_type
    
    # Simpan info file ke global variable
    current_file_path = file_path
    current_file_type = file_type

    # Proses Chunking & Embedding document
    if file_type == "pdf":
        loader = PyPDFLoader(file_path)
        docs = loader.load()
        
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=1500, chunk_overlap=200)
        final_documents = text_splitter.split_documents(docs)

        db = FAISS.from_documents(final_documents, embeddings)
        db.save_local(DB_FAISS_PATH)
        return "File PDF berhasil dipelajari! Anda bisa bertanya tentang isinya."
    elif file_type in ["xlsx", "xls", "csv"]:
        # Cek apakah file bisa dibaca
        try:
            if "csv" in file_type:
                df = pd.read_csv(file_path)
            else:
                df = pd.read_excel(file_path)
            
            # Preview data sedikit untuk memastikan
            return f"File Excel berhasil dimuat! \nTotal Baris: {len(df)}. \nKolom: {', '.join(df.columns)}. \nSilakan minta hitungan (Total, Rata-rata, dll)."
        except Exception as e:
            return f"Error membaca Excel: {str(e)}"
            
    return "Format file tidak didukung."

def analyze_data_query(query: str):
    """
    Fungsi Pintar: Memilih antara RAG (Cari Teks) atau Pandas Agent (Hitung Angka)
    """
    global current_file_path, current_file_type

    # Cek apakah ada file yang aktif
    if not current_file_path or not os.path.exists(current_file_path):
        return None, "NO_FILE"

    if current_file_type in ["xlsx", "xls", "csv"]:
        try:
            # Load Dataframe
            if "csv" in current_file_type:
                df = pd.read_csv(current_file_path)
            else:
                df = pd.read_excel(current_file_path)

            # Inisialisasi LLM untuk Coding Python
            llm_pandas = ChatGroq(
                api_key=settings.GROQ_API_KEY,
                model="llama-3.3-70b-versatile",
                temperature=0 
            )

            agent = create_pandas_dataframe_agent(
                llm_pandas, 
                df, 
                verbose=True,
                allow_dangerous_code=True,
                max_iterations=5,
                handle_parsing_errors=True
            ) 

            final_prompt = f"User bertanya: '{query}'. \nJawablah dengan bahasa Indonesia yang jelas. Jika berupa angka, formatlah dengan ribuan (contoh: Rp 1.000.000)."
            result = agent.invoke(final_prompt)
            
            return result['output'], "DIRECT_ANSWER"

        except Exception as e:
            return f"Gagal menghitung data: {str(e)}", "DIRECT_ANSWER"
    else:
        if not os.path.exists(DB_FAISS_PATH):
            return "Database belum siap.", "NO_FILE"

        new_db = FAISS.load_local(DB_FAISS_PATH, embeddings, allow_dangerous_deserialization=True)
        retriever = new_db.as_retriever(search_kwargs={"k": 6})
        docs = retriever.invoke(query)
        context_text = "\n\n".join([d.page_content for d in docs])
        
        return context_text, "CONTEXT"