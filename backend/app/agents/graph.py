from langgraph.graph import StateGraph, START, END
from langgraph.prebuilt import ToolNode
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
from langchain_groq import ChatGroq
from app.core.config import settings
from app.utils.rag_manager import get_answer_from_doc
from .state import AgentState
from .tools import search_engine
from .image_tool import generate_image_url

llm = ChatGroq(
    api_key=settings.GROQ_API_KEY,
    model="llama-3.3-70b-versatile",
    temperature=0.3
)

SYSTEM_PROMPT = """
Kamu adalah "Super Agent", Creative Copywriter kelas dunia yang spesialis menangani brand viral.
Musuh terbesarmu adalah konten yang MEMBOSANKAN.

TUGASMU:
Buat caption sosial media yang "Stopping Power" (membuat orang berhenti scroll) dan sangat persuasif.

ATURAN "CREATIVE MODE" (WAJIB):

1. 🎭 PERSONA & TONE:
   - Jangan bicara seperti robot/CS kaku.
   - Bicara seperti teman dekat (Bestie) yang antusias merekomendasikan sesuatu.
   - Gunakan bahasa yang luwes, kekinian, dan mengalir (bisa campur slang sopan jika cocok).
   - Tunjukkan EMPATI (Pahami rasa sakit/kebutuhan pelanggan).

2. 🎣 TEKNIK HOOK (PENDAHULUAN):
   - JANGAN mulai dengan "Halo" atau "Selamat Pagi". Itu membosankan.
   - Mulai dengan:
     - Pertanyaan Retoris ("Pernah gak sih ngerasa...?")
     - Pernyataan Mengejutkan ("Hati-hati! Produk ini bikin ketagihan...")
     - Storytelling Singkat ("Tadi pagi aku nemu ini dan langsung jatuh cinta...")

3. 📝 STRUKTUR KONTEN (MINIMAL 3 BAGIAN):
   [HOOK/HEADLINE YANG BIKIN KEPO + EMOJI]
   (Jarak)
   [STORYTELLING/MASALAH] -> Ceritakan situasi yang relate dengan pembaca.
   (Jarak)
   [SOLUSI/BENEFIT] -> Jelaskan kenapa produk ini jawabannya.
   - Gunakan Bullet Points (✅/✨) untuk fitur utama.
   - Gunakan kata-kata sensorik (Contoh: "Lumer di mulut", "Wangi semerbak", "Adem banget").
   (Jarak)
   [OFFER/PROMO] -> Bikin urgensi (Terbatas/Khusus Hari Ini).
   (Jarak)
   👉 [CTA] -> Ajak action yang jelas tapi santai.
   (Jarak)
   [HASHTAGS]

4. 🚫 PANTANGAN:
   - Dilarang membuat caption pendek (kurang dari 3 paragraf).
   - Dilarang menggunakan kalimat pasif yang membosankan.
   - Dilarang mengulang kata-kata yang sama terus menerus.

Jadilah KREATIF, ASIK, dan MENJUAL!
"""

def router_node(state: AgentState):
    """Supervisor: Menentukan jenis tugas (Updated Logic v3)."""
    messages = state["messages"]
    last_msg = messages[-1].content 

    prompt = """
    Kamu adalah AI Router. Tugasmu adalah mengkategorikan niat (intent) user dengan sangat presisi.
    
    ANALISA INPUT USER DAN PILIH SALAH SATU KATEGORI BERIKUT:

    1. 'SPY' (Riset Kompetitor)
       - Ciri: User mengirim LINK (Instagram/Shopee/Tokopedia) atau nama toko lain untuk dianalisa.
       - Keyword: "analisa kompetitor", "cek toko sebelah", "riset link ini", "spy", "mata-matai", "apa kelebihan toko ini".

    2. 'GAMBAR' 
       - Keyword: "poster", "logo", "gambar", "desain", "foto".

    3. 'SEO' (Marketplace)
       - Keyword: "shopee", "tokopedia", "judul produk", "deskripsi produk", "seo".

    4. 'JADWAL' (Content Calendar / Planning)
       - Ciri UTAMA: Minta rencana/jadwal untuk BEBERAPA HARI/WAKTU.
       - Keyword: "jadwal", "kalender", "schedule", "rencana konten", "seminggu", "sebulan", "ide konten seminggu".
       - PENTING: Jika ada kata "jadwal" atau "kalender", PASTI masuk sini, meskipun ada kata "konten".

    5. 'KONTEN' (Social Media Caption / Script)
       - Ciri: Minta dibuatkan teks/naskah untuk SATU postingan.
       - Keyword: "caption", "script", "status wa", "buatkan konten", "ide konten" (jika tunggal).
       - PENTING: Jangan pilih ini jika user minta "Jadwal" atau "Rencana".

    6. 'REVIEW' 
       - Keyword: "balas review", "komplain", "ulasan".

    7. 'DATA' (Analisa Dokumen/File)
       - Ciri UTAMA: User bertanya tentang file yang diupload atau meminta angka/data spesifik.
       - Keyword: "dari file tadi", "analisa laporan", "rangkum pdf", "berapa total", "berapa jumlah", "cari data", "total retur", "omset".
       - PENTING: Jika user tanya angka (uang/jumlah) dan ada konteks bisnis, masukkan ke DATA.

    8. 'UMUM' 
       - Keyword: "halo", "tips", "cara", "strategi", "siapa kamu".

    Output HANYA satu kata: SPY, GAMBAR, SEO, JADWAL, KONTEN, REVIEW, DATA atau UMUM.
    """
    
    response = llm.invoke([SystemMessage(content=prompt), HumanMessage(content=last_msg)])
    raw_kategori = response.content.strip().upper()

    if "SPY" in raw_kategori:       
        kategori = "SPY"
    elif "GAMBAR" in raw_kategori:
        kategori = "GAMBAR"
    elif "SEO" in raw_kategori:
        kategori = "SEO"
    elif "JADWAL" in raw_kategori:
        kategori = "JADWAL"
    elif "KONTEN" in raw_kategori:
        kategori = "KONTEN"
    elif "REVIEW" in raw_kategori:
        kategori = "REVIEW"
    elif "DATA" in raw_kategori:
        kategori = "DATA"
    else:
        kategori = "UMUM"
    
    print(f"🔀 Router Decision: {kategori} (Input: {last_msg})") 
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
    """Menulis caption sosmed (Updated Creative Mode)"""
    riset = state.get("hasil_riset", "")
    
    final_prompt = f"""
    {SYSTEM_PROMPT} 
    
    TUGAS SPESIFIK SAAT INI:
    Buat caption sosial media berdasarkan data riset di bawah ini.
    
    PENTING: 
    1. JANGAN sekadar meringkas data riset. Ubah jadi cerita yang emosional.
    2. Gunakan format struktur (Hook -> Story -> Benefit -> Offer -> CTA) yang ada di SYSTEM_PROMPT.
    3. Pastikan output panjang, mengalir, dan enak dibaca (bukan list kaku).

    DATA RISET: {riset}
    """

    # Masukkan instruksi ke SystemMessage
    messages = [SystemMessage(content=final_prompt)] + state["messages"]
    
    response = llm.invoke(messages)
    
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

def seo_specialist_node(state: AgentState):
    """Ahli SEO Marketplace (Updated Creative Mode)"""
    last_msg = state["messages"][-1].content

    prompt = """
    Kamu adalah E-commerce SEO Specialist. Tugasmu mengoptimalkan produk UMKM agar muncul di pencarian Shopee/Tokopedia.
    
    TUGAS:
    Buatkan optimasi produk berdasarkan input user.
    
    FORMAT OUTPUT WAJIB:
    1. 🏷️ JUDUL PRODUK (2 Opsi):
       - Buat judul mengandung kata kunci viral/pencarian tinggi.
       - Formula: [Nama Produk] + [Kata Kunci 1] + [Kata Kunci 2] + [Benefit/Fitur].
       - Hindari spam, tetap enak dibaca.
       
    2. 📝 DESKRIPSI PRODUK (Copywriting + SEO):
       - Paragraf 1: Hook emosional (Masalah & Solusi).
       - ✨ Keunggulan Produk (Bullet points).
       - 📦 Spesifikasi Lengkap (Bahan, Ukuran, Berat, Expired).
       - 🛡️ Garansi/Cara Klaim (Penting untuk trust).
       - Hashtag relevan.
       
    Gaya bahasa: Terpercaya, detail, tapi tetap ramah.
    """

    response = llm.invoke([SystemMessage(content=prompt), HumanMessage(content=last_msg)])
    return {"messages": [response]}

def calendar_planner_node(state: AgentState):
    """Pembuat Jadwal Content"""
    last_msg = state["messages"][-1].content

    prompt = """
    Kamu adalah Social Media Strategist. Tugasmu membuat Content Calendar (Jadwal Posting).
    
    TUGAS:
    Buatkan rencana konten terjadwal dalam format TABEL MARKDOWN.
    
    KOLOM TABEL HARUS ADA:
    | Hari | Ide Konten | Hook/Headline | Caption Singkat | CTAs |
    
    ATURAN:
    1. Variasikan jenis konten (Edukasi, Hiburan, Promosi, Testimoni).
    2. Jangan jualan terus (Gunakan aturan 80% edukasi/hiburan, 20% jualan).
    3. Sesuaikan dengan topik yang diminta user.
    """

    response = llm.invoke([SystemMessage(content=prompt), HumanMessage(content=last_msg)])
    return {"messages": [response]}

def competitor_spy_node(state: AgentState):
    """Mata-mata Kompetitor (Updated: Aggressive Search)"""
    last_msg = state["messages"][-1].content
    print(f"🕵️ SPY AGENT AKTIF: {last_msg}")

    # Ekstrak Target (Nama Brand)
    extractor_prompt = "Ambil hanya NAMA BRAND/TOKO dari teks ini. Hapus kata 'https', 'www', 'shopee', 'instagram'. Output HANYA nama bersih."
    target_name = llm.invoke([SystemMessage(content=extractor_prompt), HumanMessage(content=last_msg)]).content.strip()
    print(f"🎯 Target Terdeteksi: {target_name}")

    # Setup Pencarian (Mencoba beberapa variasi query)
    search_results = ""
    queries = [
        f"{target_name} review pelanggan indonesia",
        f"kelebihan kekurangan produk {target_name}",
        f"{target_name} penipuan atau asli", # Pancingan biar keluar review jujur
        f"harga produk {target_name} termurah mahal"
    ]
    
    found_data = False

    try:
        for q in queries:
            print(f"   🔍 Googling: '{q}'...")
            res = search_engine.invoke(q)
            
            # Cek apakah hasil valid
            if "No results" not in res and len(res) > 50:
                search_results += f"\n--- SUMBER: {q} ---\n{res}\n"
                found_data = True
            else:
                print("   ❌ Tidak ada hasil relevan.")

    except Exception as e:
        print(f"⚠️ Error Koneksi Internet: {e}")
        search_results = "GAGAL KONEKSI INTERNET."

    # Analisa Data
    if not found_data:
        final_msg = f"Maaf, saya sudah mencoba mencari data tentang **{target_name}** di internet tapi tidak menemukan hasil yang spesifik. \n\nPastikan nama toko/brand benar atau cukup terkenal di Google."
        return {"messages": [AIMessage(content=final_msg)]}

    # Jika ada data, lakukan analisa
    analysis_prompt = f"""
    Kamu adalah Business Intelligence Analyst.
    Tugasmu adalah menyusun laporan strategi berdasarkan DATA MENTAH hasil pencarian internet di bawah ini.

    DATA PENCARIAN REAL-TIME:
    {search_results}

    INSTRUKSI:
    1. Buat laporan berdasarkan FAKTA di atas.
    2. Kutip review pelanggan jika ada.
    3. Analisa SWOT singkat (Strength, Weakness, Opportunity, Threat).

    FORMAT LAPORAN:
    🕵️ **Target**: {target_name}
    
    ⭐ **Reputasi Online**:
    [Rangkuman sentimen publik berdasarkan data]

    ✅ **Kelebihan (Apa yang disuka?)**:
    - [Poin 1]
    - [Poin 2]

    ❌ **Kelemahan (Apa yang dikeluhkan?)**:
    - [Poin 1]
    
    🚀 **Strategi Mengalahkan Mereka**:
    "Berdasarkan data di atas, kita bisa..."
    """

    final_response = llm.invoke([SystemMessage(content=analysis_prompt), HumanMessage(content="Buat laporan.")])
    
    return {"messages": [final_response]}

def rag_advisor_node(state: AgentState):
    """Node Konsultan Data (RAG)"""
    last_msg = state["messages"][-1].content
    print(f"📂 RAG NODE: Menganalisa dokumen untuk '{last_msg}'")

    context = get_answer_from_doc(last_msg)
    if not context:
        return {"messages": [AIMessage(content="⚠️ Maaf, saya belum menemukan dokumen yang diupload. Silakan upload file PDF/Excel terlebih dahulu ya!")]}
    
    rag_prompt = f"""
    Kamu adalah Data Analyst Profesional untuk UMKM.
    Jawab pertanyaan user HANYA berdasarkan CONTEXT DATA di bawah ini.

    CONTEXT DATA DARI FILE USER:
    {context}

    PERTANYAAN USER: {last_msg}

    ATURAN:
    1. Jika jawaban ada di data, jelaskan dengan detail dan angka.
    2. Jika jawaban TIDAK ADA di data, katakan "Maaf, informasi tersebut tidak ada di dalam dokumen." jangan mengarang.
    3. Gunakan gaya bahasa profesional tapi mudah dimengerti.
    """

    response = llm.invoke([SystemMessage(content=rag_prompt), HumanMessage(content=last_msg)])
    return {"messages": [response]}

def general_node(state: AgentState):
    """Chatbot Umum (Updated Creative Mode)"""
    messages = [SystemMessage(content=SYSTEM_PROMPT)] + state["messages"]
    
    response = llm.invoke(messages)
    return {"messages": [response]}

# --- WORKFLOW ---
workflow = StateGraph(AgentState)

workflow.add_node("router", router_node)
workflow.add_node("artist", artist_node)
workflow.add_node("researcher", researcher_node)
workflow.add_node("writer", content_writer_node)
workflow.add_node("responder", review_responder_node)
workflow.add_node("seo", seo_specialist_node)
workflow.add_node("spy", competitor_spy_node)
workflow.add_node("calendar", calendar_planner_node)
workflow.add_node("rag", rag_advisor_node)
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
    elif "SEO" in task:
        return "seo"
    elif "JADWAL" in task:
        return "calendar"
    elif "SPY" in task:
        return "spy"
    elif "DATA" in task:
        return "rag"
    else:
        return "general"
    
workflow.add_conditional_edges(
    "router",
    route_decision,
    {
        "artist": "artist",
        "researcher": "researcher",
        "seo": "seo",
        "calendar": "calendar",
        "spy": "spy",
        "responder": "responder",
        "rag": "rag",
        "general": "general",
    }
)

workflow.add_edge("artist", END)
workflow.add_edge("researcher", "writer")
workflow.add_edge("writer", END)
workflow.add_edge("responder", END)
workflow.add_edge("seo", END)
workflow.add_edge("calendar", END)
workflow.add_edge("spy", END)
workflow.add_edge("rag", END)
workflow.add_edge("general", END)

# Compile
umkm_graph = workflow.compile()