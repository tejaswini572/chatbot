from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import upload
from routers import chat
from routers import documents
from routers import conversations

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload.router)
app.include_router(chat.router)
app.include_router(documents.router)
app.include_router(conversations.router)