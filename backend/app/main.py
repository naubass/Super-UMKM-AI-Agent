from fastapi import FastAPI, HTTPException, Depends, status
from sqlalchemy.orm import Session
from app.core.database import engine, get_db, Base
from app.models.user import User
from app.schemas.user import UserCreate, UserLogin, UserResponse
from app.auth.security import get_password_hash, verify_password
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.models.schemas import ChatRequest, ChatResponse
from langchain_core.messages import HumanMessage
from app.agents.graph import umkm_graph

Base.metadata.create_all(bind=engine)

app = FastAPI(title=settings.PROJECT_NAME)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
@app.post("/api/register", response_model=UserResponse)
def register_user(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_pw = get_password_hash(user.password)

    new_user = User(email=user.email, full_name=user.full_name, hashed_password=hashed_pw)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user

@app.post("/api/login")
def login_user(user: UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()

    if not db_user or not verify_password(user.password, db_user.hashed_password):
        raise HTTPException(status_code=401, detail="Email atau Password Salah")
    
    return {
        "message": "Login Berhasil", 
        "user_id": db_user.id, 
        "name": db_user.full_name
    }

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