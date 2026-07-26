from fastapi import APIRouter, UploadFile, File
from services.extraction import text_extract_from_pdf
from services.chunking import chunk_text
from services.embedding import generate_embedding
from logger_config import get_logger
from services.db import store_chunks

router = APIRouter()
logger = get_logger(__name__)

@router.post("/upload")
async def upload(document: UploadFile = File(...)):
    try:
        logger.info(f"Received file: {document.filename}")
        extracted_text = text_extract_from_pdf(document.file)
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

        store_chunks(document.filename, chunks, embeddings, file_size)
        logger.info(f"Stored {len(chunks)} chunks in database")

        return {
            "message": "File uploaded successfully",
            "filename": document.filename,
            "num_chunks": len(chunks),
            "embedding_dim": len(embeddings[0]) if embeddings else 0
        }
    except Exception as e:
        logger.error(f"Upload failed: {str(e)}")
        return {"error": str(e)}