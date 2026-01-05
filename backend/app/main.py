from fastapi import FastAPI, HTTPException, Depends, status
from sqlalchemy.orm import Session
from app.core.database import engine, get_db, Base
from app.models.user import User
from app.schemas.user import UserCreate, UserLogin, UserResponse
from app.auth.security import get_password_hash, verify_password, create_access_token
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.models.schemas import ChatRequest, ChatResponse
from langchain_core.messages import HumanMessage
from app.agents.graph import umkm_graph
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from app.core.config import settings
from app.models.history import ChatHistory
from sqlalchemy import desc
from datetime import timedelta
from fastapi.staticfiles import StaticFiles
import os

Base.metadata.create_all(bind=engine)

app = FastAPI(title=settings.PROJECT_NAME)

os.makedirs("static/images", exist_ok=True)

app.mount("/static", StaticFiles(directory="static"), name="static")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/login")

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise credentials_exception
    return user

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
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": db_user.email},
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_info": {
            "id": db_user.id,
            "name": db_user.full_name
        }
    }

@app.get("/api/history")
def get_chat_history(
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    # Ambil chat user ini
    # Kita pakai .asc() agar chat terlama ada di atas (seperti WhatsApp)
    chats = db.query(ChatHistory)\
        .filter(ChatHistory.user_id == current_user.id)\
        .order_by(ChatHistory.created_at.asc())\
        .all()
    
    return chats

@app.post("/api/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        user_msg = ChatHistory(user_id=current_user.id, role="user", content=request.message)
        db.add(user_msg)
        db.commit()

        inputs = {"messages": [HumanMessage(content=request.message)]}
        result = umkm_graph.invoke(inputs)

        bot_response = result["messages"][-1].content
        task_type = result.get("tugas_saat_ini", "UMUM")

        bot_msg = ChatHistory(user_id=current_user.id, role="assistant", content=bot_response)
        db.add(bot_msg)
        db.commit()

        return ChatResponse(response=bot_response, task_type=task_type)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.delete("/api/history/reset")
def reset_chat_history(
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    # Hapus semua chat milik user yang sedang login
    db.query(ChatHistory).filter(ChatHistory.user_id == current_user.id).delete()
    db.commit()
    return {"message": "Riwayat chat berhasil dihapus"}