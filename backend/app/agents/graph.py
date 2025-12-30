from langgraph.graph import StateGraph, START, END
from langgraph.prebuilt import ToolNode
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_groq import ChatGroq
from app.core.config import settings
from .state import AgentState
from .tools import search_engine

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
    Klasifikasikan pesan user ke salah satu kategori:
    1. 'KONTEN' (Jika minta ide posting, caption, tren sosmed)
    2. 'REVIEW' (Jika membalas komplain, testimoni, ulasan)
    3. 'UMUM' (Chat biasa)
    
    Output HANYA satu kata: KONTEN, REVIEW, atau UMUM.
    """
    
    response = llm.invoke([SystemMessage(content=prompt), HumanMessage(content=last_msg)])
    kategori = response.content.strip().upper()

    if kategori not in ["KONTEN", "REVIEW", "UMUM"]:
        kategori = "UMUM"

    return {"tugas_saat_ini": kategori}

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
workflow.add_node("researcher", researcher_node)
workflow.add_node("writer", content_writer_node)
workflow.add_node("responder", review_responder_node)
workflow.add_node("general", general_node)

# Edges
workflow.add_edge(START, "router")

def route_decision(state: AgentState):
    task = state["tugas_saat_ini"]
    if "KONTEN" in task:
        return "researcher"
    elif "REVIEW" in task:
        return "responder"
    else:
        return "general"
    
workflow.add_conditional_edges(
    "router",
    route_decision,
    {
        "researcher": "researcher",
        "responder": "responder",
        "general": "general",
    }
)

workflow.add_edge("researcher", "writer")
workflow.add_edge("writer", END)
workflow.add_edge("responder", END)
workflow.add_edge("general", END)

# Compile
umkm_graph = workflow.compile()