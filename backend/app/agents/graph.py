from langgraph.graph import StateGraph, START, END
from langgraph.prebuilt import ToolNode
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
from langchain_groq import ChatGroq
from app.core.config import settings
from .state import AgentState
from .tools import search_engine
from .image_tool import generate_image_url

llm = ChatGroq(
    api_key=settings.GROQ_API_KEY,
    model="llama-3.3-70b-versatile",
    temperature=0.3
)

def router_node(state: AgentState):
    """Supervisor: Menentukan jenis tugas."""
    messages = state["messages"]
    last_msg = messages[-1].content 

    prompt = """
    1. 'GAMBAR' (Jika minta dibuatkan foto, poster, visual, gambar produk).
    2. 'KONTEN' (Jika minta ide posting teks, caption, tren sosmed).
    3. 'REVIEW' (Jika membalas komplain, testimoni, ulasan).
    4. 'UMUM' (Chat biasa).
    
    Output HANYA satu kata: GAMBAR, KONTEN, REVIEW, atau UMUM.
    """
    
    response = llm.invoke([SystemMessage(content=prompt), HumanMessage(content=last_msg)])
    kategori = response.content.strip().upper()

    if kategori not in ["GAMBAR", "KONTEN", "REVIEW", "UMUM"]:
        kategori = "UMUM"

    return {"tugas_saat_ini": kategori}

def artist_node(state: AgentState):
    """
    Artist Node dengan spesialisasi DESAIN LOGO UMKM.
    """
    last_msg = state["messages"][-1].content
    print(f"🎨 User minta Logo: {last_msg}")

    prompt_engineer = """
    Kamu adalah Brand Identity Designer profesional yang berspesialisasi dalam membuat LOGO UMKM yang modern dan minimalis.
    Tugasmu adalah meracik prompt visual untuk AI Image Generator berdasarkan permintaan user.

    ATURAN PERACIKAN PROMPT (WAJIB):
    1.  **GAYA VISUAL:** Fokus pada 'minimalist logo', 'vector icon', 'flat design symbol', 'clean lines', dan 'professional branding'.
    2.  **SIMBOLISME:** Ubah jenis usaha menjadi ikon yang kreatif tapi simpel. Contoh: 'Usaha Kopi' -> 'stylized coffee bean and cup icon combined'. 'Usaha Laundry' -> 'abstract hanger and water drop symbol'.
    3.  **HINDARI:** Jangan gunakan kata 'photo', 'realistic', 'poster', atau banyak teks panjang.
    4.  **BACKGROUND:** Selalu minta 'clean white background' atau 'solid neutral background' agar logonya menonjol.
    5.  **OUTPUT:** Hanya berikan deskripsi prompt bahasa Inggris final yang fokus pada bentuk ikon logo tersebut.
    """
    
    # Minta LLM meracik prompt logo
    design_prompt_response = llm.invoke([
        SystemMessage(content=prompt_engineer),
        HumanMessage(content=f"Buatkan desain logo untuk: {last_msg}")
    ])
    
    final_prompt = design_prompt_response.content
    print(f"✨ Prompt Logo Racikan AI: {final_prompt}")

    # Kirim ke Tool Gambar
    image_url = generate_image_url(final_prompt)

    # Balas ke user
    response_text = f"Berikut adalah draf desain logo untuk usaha Anda:\n\n![Desain Logo]({image_url})\n\nSaya menggunakan konsep visual: *{final_prompt[:100]}...* Semoga cocok dengan identitas bisnis Anda! ✨"

    return {"messages": [AIMessage(content=response_text)]}

def researcher_node(state: AgentState):
    """Mencari data tren di internet"""
    last_msg = state["messages"][-1].content
    print(f"🕵️ Riset untuk: {last_msg}")

    query = f"Ide konten dan tren terkini untuk: {last_msg}"
    try:
        response = search_engine.run(query)
    except Exception as e:
        response = f"Error: {e}"

    return {"hasil_riset": response}

def content_writer_node(state: AgentState):
    """Menulis caption sosmed"""
    riset = state.get("hasil_riset", "")
    prompt = f"""
    Kamu adalah Social Media Specialist. Buat konten berdasarkan data berikut:
    DATA RISET: {riset}
    
    Gunakan gaya bahasa menarik, emoji, dan hashtag relevan.
    """

    response = llm.invoke([SystemMessage(content=prompt)] + state["messages"])
    
    return {"messages": [response]}

def review_responder_node(state: AgentState):
    """Menangani komplain/ulasan."""
    prompt = """
    Kamu adalah Customer Service Manager. Balas ulasan pelanggan dengan empati.
    Jika komplain: Minta maaf dan beri solusi.
    Jika pujian: Berterima kasih dengan antusias.
    """

    response = llm.invoke([SystemMessage(content=prompt)] + state["messages"])
    return {"messages": [response]}

def general_node(state: AgentState):
    """Chatbot Umum"""
    response = llm.invoke(state["messages"])
    return {"messages": [response]}

# --- WORKFLOW ---
workflow = StateGraph(AgentState)

workflow.add_node("router", router_node)
workflow.add_node("artist", artist_node)
workflow.add_node("researcher", researcher_node)
workflow.add_node("writer", content_writer_node)
workflow.add_node("responder", review_responder_node)
workflow.add_node("general", general_node)

# Edges
workflow.add_edge(START, "router")

def route_decision(state: AgentState):
    task = state["tugas_saat_ini"]
    if "GAMBAR" in task:
        return "artist"
    elif "KONTEN" in task:
        return "researcher"
    elif "REVIEW" in task:
        return "responder"
    else:
        return "general"
    
workflow.add_conditional_edges(
    "router",
    route_decision,
    {
        "artist": "artist",
        "researcher": "researcher",
        "responder": "responder",
        "general": "general",
    }
)

workflow.add_edge("artist", END)
workflow.add_edge("researcher", "writer")
workflow.add_edge("writer", END)
workflow.add_edge("responder", END)
workflow.add_edge("general", END)

# Compile
umkm_graph = workflow.compile()