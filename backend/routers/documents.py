from fastapi import APIRouter
from services.db import get_all_documents, delete_document
from logger_config  import get_logger

router =APIRouter()
logger = get_logger(__name__)

@router.get("/documents")
async def list_documents():
    try:
        documents=get_all_documents()
        return {"documents": documents}
    except Exception as e:
        logger.error(f"Failed to list documents: {str(e)}")
        return {"error": str(e)}
    
@router.delete("/documents/{document_name}")
async def remove_document(document_name : str):
    try:
        deleted_count = delete_document(document_name)
        if deleted_count == 0:
            return {"error": f"No document found with name '{document_name}'"}
        return {
            "message": "Document deleted successfully",
            "document_name": document_name,
            "chunks_deleted": deleted_count
        }
    except Exception as e:
        logger.error(f"Failed to delete document '{document_name}': {str(e)}")
        return {"error": str(e)}
    
    

 