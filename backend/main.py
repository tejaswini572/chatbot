from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import upload
from routers import chat
from routers import documents
from routers import conversations
from services import auth
from routers.widget import router as widget_router
from routers import widget_chat

from routers import admin

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",       # Main React dev server
        "http://localhost:8000",       # Backend-served pages
        "http://127.0.0.1:5500",      # VS Code Live Server
        "http://localhost:5500",       # VS Code Live Server (alternate)
        "null",                        # file:// origin
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload.router)
app.include_router(chat.router)
app.include_router(documents.router)
app.include_router(conversations.router)
app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(widget_router)
app.include_router(widget_chat.router)

# Path to React build
frontend_build = Path("../frontend/build").resolve()

# Serve static files
app.mount(
    "/static",
    StaticFiles(directory=frontend_build / "static"),
    name="static"
)

@app.get("/")
def serve_widget():
    return FileResponse(frontend_build / "index.html")
@app.get("/embed.js")
def serve_embed_script():
    return FileResponse("static/embed.js", media_type="application/javascript")