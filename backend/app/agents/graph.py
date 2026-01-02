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
    """Supervisor: Menentukan jenis tugas (Updated Logic)."""
    messages = state["messages"]
    last_msg = messages[-1].content 

    prompt = """
    Kamu adalah AI Router. Tugasmu mengkategorikan niat (intent) user.
    
    ANALISA NIAT USER DENGAN TELITI:

    1. 'GAMBAR' 
       - Pilih ini JIKA user minta visual: "buatkan poster", "logo", "gambar", "desain banner".

    2. 'KONTEN' 
       - Pilih ini JIKA user minta DIBUATKAN TEKS JADI/NASKAH.
       - Contoh: "buatkan caption IG", "tuliskan script tiktok", "ide status WA".
       - Ciri: User ingin hasil berupa teks kreatif siap posting.

    3. 'REVIEW' 
       - Pilih ini JIKA user minta membalas ulasan/komplain: "balas review bintang 1", "jawab komplain customer".

    4. 'UMUM' 
       - Pilih ini untuk KONSULTASI, TIPS, STRATEGI, atau OBROLAN BIASA.
       - Contoh: "Tips agar warung ramai", "Cara marketing efektif", "Apa itu HPP", "Halo", "Siapa kamu".
       - PENTING: Jika user minta ILMU/SARAN, itu masuk UMUM, bukan KONTEN.

    Output HANYA satu kata: GAMBAR, KONTEN, REVIEW, atau UMUM.
    """
    
    response = llm.invoke([SystemMessage(content=prompt), HumanMessage(content=last_msg)])
    raw_kategori = response.content.strip().upper()

    # Cleaning output (jaga-jaga kalau LLM jawab panjang)
    if "GAMBAR" in raw_kategori:
        kategori = "GAMBAR"
    elif "KONTEN" in raw_kategori:
        kategori = "KONTEN"
    elif "REVIEW" in raw_kategori:
        kategori = "REVIEW"
    else:
        kategori = "UMUM"
    
    print(f"🔀 Router Decision: {kategori} (Input: {last_msg})") # Print untuk debug di terminal
    return {"tugas_saat_ini": kategori}

def artist_node(state: AgentState):
    """
    Artist Node Pintar (Dual Mode):
    1. Menganalisis apakah user meminta LOGO atau POSTER.
    2. Meracik prompt visual yang sesuai dengan jenis permintaannya.
    """
    last_msg = state["messages"][-1].content
    print(f"🎨 Artist menerima tugas: {last_msg}")

    classifier_prompt = """
    Tugasmu adalah mengklasifikasikan permintaan user menjadi salah satu dari dua kategori: 'LOGO' atau 'POSTER'.
    
    - Pilih 'LOGO' jika user meminta: ikon, simbol, lambang, identitas brand, desain simpel untuk profil.
    - Pilih 'POSTER' jika user meminta: iklan, promosi, brosur, flyer, menu, atau gambar yang membutuhkan layout teks dan visual kompleks.
    
    JIKA RAGU, pilih 'POSTER'.
    Output HANYA satu kata: LOGO atau POSTER.
    """

    classification_response = llm.invoke([
        SystemMessage(content=classifier_prompt),
        HumanMessage(content=last_msg)
    ])
    jenis_gambar = classification_response.content.strip().upper()
    print(f"🤔 Klasifikasi Artist: {jenis_gambar}")

    is_poster_mode = False

    if "LOGO" in jenis_gambar:
        is_poster_mode = False
        prompt_engineer_system = """
        Kamu adalah Brand Identity Designer profesional. Buat deskripsi visual untuk LOGO UMKM.
        FOKUS: Minimalis, ikon vektor, simbol kreatif, garis bersih, professional branding.
        HINDARI: Foto realistik, teks panjang, background ramai.
        WAJIB: Akhiri prompt dengan 'clean solid background'.
        Output HANYA deskripsi prompt bahasa Inggris.
        """
        reply_prefix = "Berikut adalah draf desain LOGO untuk Usaha Anda:"
    else:
        is_poster_mode = True
        prompt_engineer_system = """
        Kamu adalah Creative Director untuk desain iklan. Buat deskripsi visual untuk POSTER PROMOSI.
        FOKUS: Layout iklan yang menarik, hierarki visual, elemen grafis modern, dan penempatan teks headline.
        INSTRUKSI TEKS: Jika user meminta teks spesifik, instruksikan agar teks tersebut ditulis besar, tebal, dan jelas dalam desain (contoh: "with bold text 'PROMO' at the top").
        Output HANYA deskripsi prompt bahasa Inggris.
        """
        reply_prefix = "Berikut adalah draf desain POSTER untuk Usaha Anda:"
    
    # Minta LLM meracik prompt logo
    design_prompt_response = llm.invoke([
        SystemMessage(content=prompt_engineer_system),
        HumanMessage(content=f"Buatkan desain logo untuk: {last_msg}")
    ])
    
    final_prompt = design_prompt_response.content
    print(f"✨ Prompt Visual Final ({jenis_gambar}): {final_prompt[:100]}...")

    # Kirim ke Tool Gambar
    image_url = generate_image_url(final_prompt, is_poster=is_poster_mode)

    # Balas ke user
    response_text = f"Berikut adalah draf desain creative untuk usaha Anda:\n\n![Desain Logo]({image_url})\n\nSaya menggunakan konsep visual: *{final_prompt[:100]}...* Semoga cocok dengan identitas bisnis Anda! ✨"
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