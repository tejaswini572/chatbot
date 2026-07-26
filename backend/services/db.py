import os
import psycopg2
from dotenv import load_dotenv
from psycopg2.extras import execute_values
from logger_config import get_logger

load_dotenv()

logger = get_logger(__name__)

def get_connection():
    return psycopg2.connect(
        host=os.getenv("DB_HOST"),
        port=os.getenv("DB_PORT"),
        dbname=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD")
    )

def store_chunks(document_name, chunks, embeddings, file_size=None):
    try:
        conn = get_connection()
        cur = conn.cursor()

        data = [
            (document_name, chunk, embedding, file_size)
            for chunk, embedding in zip(chunks, embeddings)
        ]

        execute_values(
            cur,
            """
            INSERT INTO document_chunks (document_name, chunk_text, embedding, file_size)
            VALUES %s
            """,
            data,
            template="(%s, %s, %s::vector, %s)"
        )

        conn.commit()

        logger.info(
            f"Successfully stored {len(chunks)} chunks for '{document_name}' in database"
        )

        cur.close()
        conn.close()

    except Exception as e:
        logger.error(f"Failed to store chunks for '{document_name}': {str(e)}")
        raise

def search_similar_chunks(query_embedding, top_k=10):
    try:
        conn = get_connection()
        cur = conn.cursor()

        cur.execute(
            """
            SELECT document_name, chunk_text, embedding <-> %s::vector AS distance
            FROM document_chunks
            ORDER BY distance ASC
            LIMIT %s
            """,
            (query_embedding, top_k)
        )

        rows = cur.fetchall()

        results = [
            {
                "document_name": r[0],
                "chunk_text": r[1],
                "distance": r[2]
            }
            for r in rows
        ]

        logger.info(f"Found {len(results)} similar chunks for query")

        cur.close()
        conn.close()

        return results

    except Exception as e:
        logger.error(f"Failed to search similar chunks: {str(e)}")
        raise
def get_all_documents():
    try:
        conn = get_connection()
        cur = conn.cursor()

        cur.execute(
            """
            SELECT document_name,
                   COUNT(*) AS chunk_count,
                   MAX(file_size) AS file_size,
                   MAX(uploaded_at) AS uploaded_at
            FROM document_chunks
            GROUP BY document_name
            ORDER BY uploaded_at DESC
            """
        )

        rows = cur.fetchall()

        results = [
            {
                "document_name": r[0],
                "chunk_count": r[1],
                "file_size": r[2],
                "uploaded_at": r[3].isoformat() if r[3] else None
            }
            for r in rows
        ]

        logger.info(f"Fetched {len(results)} distinct documents")

        cur.close()
        conn.close()

        return results

    except Exception as e:
        logger.error(f"Failed to fetch documents: {str(e)}")
        raise


def delete_document(document_name):
    try:
        conn = get_connection()
        cur = conn.cursor()

        cur.execute(
            "DELETE FROM document_chunks WHERE document_name = %s",
            (document_name,)
        )

        deleted_count = cur.rowcount
        conn.commit()

        logger.info(f"Deleted {deleted_count} chunks for document '{document_name}'")

        cur.close()
        conn.close()

        return deleted_count

    except Exception as e:
        logger.error(f"Failed to delete document '{document_name}': {str(e)}")
        raise

def create_conversations(title="New Chat"):
    try:
        conn=get_connection()
        cur = conn.cursor()
        cur.execute("INSERT INTO conversations (title) VALUES (%s) RETURNING id",(title,))

        conversation_id = cur.fetchone()[0]
        conn.commit()
        logger.info(f"Created conversation {conversation_id} with title '{title}'")
        cur.close()
        conn.close()
        return conversation_id
    except Exception as e:
        logger.error(f"Failed to create conversation: {str(e)}")
        raise
def create_conversation(title="New chat"):
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO conversations (title) VALUES (%s) RETURNING id",
            (title,)
        )
        conversation_id = cur.fetchone()[0]
        conn.commit()
        logger.info(f"Created conversation {conversation_id} with title '{title}'")
        cur.close()
        conn.close()
        return conversation_id
    except Exception as e:
        logger.error(f"Failed to create conversation: {str(e)}")
        raise


def get_all_conversations():
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute(
            "SELECT id, title, created_at FROM conversations ORDER BY created_at DESC"
        )
        rows = cur.fetchall()
        results = [
            {"id": r[0], "title": r[1], "created_at": r[2].isoformat() if r[2] else None}
            for r in rows
        ]
        cur.close()
        conn.close()
        return results
    except Exception as e:
        logger.error(f"Failed to fetch conversations: {str(e)}")
        raise


def save_message(conversation_id, role, text):
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO messages (conversation_id, role, text) VALUES (%s, %s, %s)",
            (conversation_id, role, text)
        )
        conn.commit()
        cur.close()
        conn.close()
    except Exception as e:
        logger.error(f"Failed to save message: {str(e)}")
        raise


def get_messages_for_conversation(conversation_id):
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute(
            "SELECT role, text FROM messages WHERE conversation_id = %s ORDER BY id ASC",
            (conversation_id,)
        )
        rows = cur.fetchall()
        results = [{"role": r[0], "text": r[1]} for r in rows]
        cur.close()
        conn.close()
        return results
    except Exception as e:
        logger.error(f"Failed to fetch messages for conversation {conversation_id}: {str(e)}")
        raise


def update_conversation_title(conversation_id, title):
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute(
            "UPDATE conversations SET title = %s WHERE id = %s",
            (title, conversation_id)
        )
        conn.commit()
        cur.close()
        conn.close()
    except Exception as e:
        logger.error(f"Failed to update conversation title: {str(e)}")
        raise