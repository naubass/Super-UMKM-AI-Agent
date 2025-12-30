from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.models.schemas import ChatRequest, ChatResponse
from langchain_core.messages import HumanMessage
from app.agents.graph import umkm_graph

app = FastAPI(title=settings.PROJECT_NAME)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    try:
        inputs = {"messages": [HumanMessage(content=request.message)]}
        result = umkm_graph.invoke(inputs)

        bot_response = result["messages"][-1].content
        task_type = result.get("tugas_saat_ini", "UMUM")

        return ChatResponse(response=bot_response, task_type=task_type)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))