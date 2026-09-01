from fastapi import APIRouter, Depends, HTTPException
from services.db import get_all_documents, delete_document, get_document_owner,log_activity
from services.auth import get_current_user , require_permission
from logger_config import get_logger

router = APIRouter()
logger = get_logger(__name__)

@router.get("/documents")
async def list_documents(
    current_user: dict = Depends(require_permission("documents"))
):
    try:
        is_admin = current_user["role"] == "admin"
        documents = get_all_documents(current_user["id"], is_admin)
        return {"documents": documents}
    except Exception as e:
        logger.error(f"Failed to list documents: {str(e)}")
        return {"error": str(e)}

@router.delete("/documents/{document_name}")
async def remove_document(document_name: str, current_user: dict = Depends(require_permission("documents"))
):
    try:
        owner_id = get_document_owner(document_name)

        if owner_id is None:
            return {"error": f"No document found with name '{document_name}'"}

        is_admin = current_user["role"] == "admin"
        is_owner = str(owner_id) == str(current_user["id"])

        if not (is_owner or is_admin):
            raise HTTPException(status_code=403, detail="Not allowed to delete this document")
        log_activity(current_user["id"], current_user["username"], "delete_document", document_name)
        deleted_count = delete_document(document_name, current_user["id"], is_admin)
        return {
            "message": "Document deleted successfully",
            "document_name": document_name,
            "chunks_deleted": deleted_count
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete document '{document_name}': {str(e)}")
        return {"error": str(e)}