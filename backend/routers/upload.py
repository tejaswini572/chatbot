from fastapi import APIRouter, UploadFile, File, Depends
from services.extraction import extract_text
from services.chunking import chunk_text
from services.embedding import generate_embedding
from logger_config import get_logger
from services.db import store_chunks , log_activity
from services.auth import get_current_user

router = APIRouter()
logger = get_logger(__name__)

@router.post("/upload")
async def upload(document: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    try:
        logger.info(f"Received file: {document.filename}")

        try:
            extracted_text = extract_text(document.file, document.filename)
        except ValueError as ve:
            logger.error(f"Unsupported file type: {str(ve)}")
            return {"error": str(ve)}

        logger.info(f"Extracted {len(extracted_text)} characters of text")

        chunks = chunk_text(extracted_text)
        logger.info(f"Created {len(chunks)} chunks")

        embeddings = []
        for i, c in enumerate(chunks):
            emb = generate_embedding(c)
            embeddings.append(emb)
        logger.info(f"Generated embeddings for all {len(chunks)} chunks (dim={len(embeddings[0]) if embeddings else 0})")

        document.file.seek(0, 2)
        file_size = document.file.tell()
        document.file.seek(0)

        store_chunks(document.filename, chunks, embeddings, current_user["id"] ,file_size)
        logger.info(f"Stored {len(chunks)} chunks in database")
        log_activity(current_user["id"] ,  current_user["username"],"upload", document.filename)
        return {
            "message": "File uploaded successfully",
            "filename": document.filename,
            "num_chunks": len(chunks),
            "embedding_dim": len(embeddings[0]) if embeddings else 0
        }
    
    
    except Exception as e:
        logger.error(f"Upload failed: {str(e)}")
        return {"error": str(e)}