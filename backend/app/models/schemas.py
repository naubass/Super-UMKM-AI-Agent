from pydantic import BaseModel
from typing import Optional

class ChatRequest(BaseModel):
    message: str
    user_id: Optional[str] = "guest"

class ChatResponse(BaseModel):
    response: str
    task_type: str
    