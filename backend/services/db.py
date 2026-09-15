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

def store_chunks(document_name, chunks, embeddings, user_id , file_size=None):
    try:
        conn = get_connection()
        cur = conn.cursor()

        data = [
            (document_name, chunk, embedding, file_size ,user_id)
            for chunk, embedding in zip(chunks, embeddings)
        ]

        execute_values(
            cur,
            """
            INSERT INTO document_chunks (document_name, chunk_text, embedding, file_size , user_id)
            VALUES %s
            """,
            data,
            template="(%s, %s, %s::vector, %s , %s)"
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

def search_similar_chunks(query_embedding, user_id, is_admin=False, top_k=10):
    try:
        conn = get_connection()
        cur = conn.cursor()

        if is_admin:
            cur.execute(
                """
                SELECT document_name, chunk_text, embedding <-> %s::vector AS distance
                FROM document_chunks
                ORDER BY distance ASC
                LIMIT %s
                """,
                (query_embedding, top_k)
            )
        else:
            cur.execute(
                """
                SELECT document_name, chunk_text, embedding <-> %s::vector AS distance
                FROM document_chunks
                WHERE user_id = %s
                ORDER BY distance ASC
                LIMIT %s
                """,
                (query_embedding, user_id, top_k)
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

        logger.info(f"Found {len(results)} similar chunks for query (user_id={user_id}, is_admin={is_admin})")

        cur.close()
        conn.close()

        return results

    except Exception as e:
        logger.error(f"Failed to search similar chunks: {str(e)}")
        raise

def get_all_documents(user_id, is_admin=False):
    try:
        conn = get_connection()
        cur = conn.cursor()

        if is_admin:
            cur.execute(
                """
                SELECT dc.document_name,
                       COUNT(*) AS chunk_count,
                       MAX(dc.file_size) AS file_size,
                       MAX(dc.uploaded_at) AS uploaded_at,
                       dc.user_id,
                       u.username
                FROM document_chunks dc
                LEFT JOIN users u ON dc.user_id = u.id
                GROUP BY dc.document_name, dc.user_id, u.username
                ORDER BY uploaded_at DESC
                """
            )
        else:
            cur.execute(
                """
                SELECT document_name,
                       COUNT(*) AS chunk_count,
                       MAX(file_size) AS file_size,
                       MAX(uploaded_at) AS uploaded_at,
                       user_id
                FROM document_chunks
                WHERE user_id = %s
                GROUP BY document_name, user_id
                ORDER BY uploaded_at DESC
                """,
                (user_id,)
            )

        rows = cur.fetchall()

        if is_admin:
            results = [
                {
                    "document_name": r[0],
                    "chunk_count": r[1],
                    "file_size": r[2],
                    "uploaded_at": r[3].isoformat() if r[3] else None,
                    "user_id": r[4],
                    "owner_username": r[5],
                }
                for r in rows
            ]
        else:
            results = [
                {
                    "document_name": r[0],
                    "chunk_count": r[1],
                    "file_size": r[2],
                    "uploaded_at": r[3].isoformat() if r[3] else None,
                    "user_id": r[4],
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

def get_document_owner(document_name):
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute(
            "SELECT DISTINCT user_id FROM document_chunks WHERE document_name = %s",
            (document_name,)
        )
        rows = cur.fetchall()
        cur.close()
        conn.close()

        if not rows:
            return None
        # Normally one owner per document_name; return the first
        return rows[0][0]
    except Exception as e:
        logger.error(f"Failed to fetch owner for document '{document_name}': {str(e)}")
        raise

def delete_document(document_name, user_id, is_admin=False):
    try:
        conn = get_connection()
        cur = conn.cursor()

        if is_admin:
            cur.execute(
                "DELETE FROM document_chunks WHERE document_name = %s",
                (document_name,)
            )
        else:
            cur.execute(
                "DELETE FROM document_chunks WHERE document_name = %s AND user_id = %s",
                (document_name, user_id)
            )

        deleted_count = cur.rowcount
        conn.commit()

        logger.info(f"Deleted {deleted_count} chunks for document '{document_name}' (user_id={user_id}, is_admin={is_admin})")

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
        cur.execute("INSERT INTO conversations (title , user_id ) VALUES (%s , %s) RETURNING id",(title,))

        conversation_id = cur.fetchone()[0]
        conn.commit()
        logger.info(f"Created conversation {conversation_id} with title '{title}'")
        cur.close()
        conn.close()
        return conversation_id
    except Exception as e:
        logger.error(f"Failed to create conversation: {str(e)}")
        raise
def create_conversation(user_id, title="New chat"):
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO conversations (title, user_id ) VALUES (%s , %s) RETURNING id",
            (title, user_id )
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


def get_all_conversations(user_id, is_admin = False):
    try:
        conn = get_connection()
        cur = conn.cursor()

        if is_admin:
            cur.execute(
                """
                SELECT c.id, c.title, c.created_at, c.user_id, u.username
                FROM conversations c
                LEFT JOIN users u ON c.user_id = u.id
                ORDER BY c.created_at DESC
                """
            )
        else:
            cur.execute(
                """
                SELECT c.id, c.title, c.created_at, c.user_id, u.username
                FROM conversations c
                LEFT JOIN users u ON c.user_id = u.id
                WHERE c.user_id = %s
                ORDER BY c.created_at DESC
                """,
                (user_id,)
            )

        rows = cur.fetchall()
        results = [
            {
                "id": r[0],
                "title": r[1],
                "created_at": r[2].isoformat() if r[2] else None,
                "user_id": r[3],
                "owner_username": r[4],
            }
            for r in rows
        ]
        cur.close()
        conn.close()
        return results
    except Exception as e:
        logger.error(f"Failed to fetch conversations: {str(e)}")
        raise


def save_message(conversation_id, role, text, sources=None):
    try:
        conn = get_connection()
        cur = conn.cursor()

        cur.execute(
            """
            INSERT INTO messages
            (conversation_id, role, text, sources)
            VALUES (%s, %s, %s, %s)
            """,
            (conversation_id, role, text, sources)
        )

        conn.commit()
        cur.close()
        conn.close()

    except Exception as e:
        logger.error(
            f"Failed to save message: {str(e)}"
        )
        raise

def get_messages_for_conversation(conversation_id):
    try:
        conn = get_connection()
        cur = conn.cursor()

        cur.execute(
            """
            SELECT role, text, sources
            FROM messages
            WHERE conversation_id = %s
            ORDER BY id ASC
            """,
            (conversation_id,)
        )

        rows = cur.fetchall()

        results = [
            {
                "role": r[0],
                "text": r[1],
                "sources": r[2] or []
            }
            for r in rows
        ]

        cur.close()
        conn.close()

        return results

    except Exception as e:
        logger.error(
            f"Failed to fetch messages for conversation {conversation_id}: {str(e)}"
        )
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

def delete_conversation(conversation_id):
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("DELETE FROM messages WHERE conversation_id = %s", (conversation_id,))
        cur.execute("DELETE FROM conversations WHERE id = %s",(conversation_id,))
        conn.commit()
        cur.close()
        conn.close()
    except Exception as e:
        logger.error(f"Failed to delete conversation {conversation_id}: {str(e)}")
        raise

def get_user_by_username(username):
    try:
        conn = get_connection()
        cur = conn.cursor()

        cur.execute(
            """
            SELECT
                id,
                username,
                hashed_password,
                role,
                is_blocked,
                role_id
            FROM users
            WHERE username = %s
            """,
            (username,)
        )

        row = cur.fetchone()

        cur.close()
        conn.close()

        if row is None:
            return None

        return {
            "id": row[0],
            "username": row[1],
            "hashed_password": row[2],
            "role": row[3],
            "is_blocked": row[4],
            "role_id": row[5]
        }

    except Exception as e:
        logger.error(
            f"Failed to fetch user '{username}': {str(e)}"
        )
        raise
def create_user(username, hashed_password, role="user"):
    try:
        conn = get_connection()
        cur = conn.cursor()

        cur.execute(
            "INSERT INTO users (username, hashed_password, role) VALUES (%s, %s, %s) RETURNING id",
            (username, hashed_password, role)
        )
        user_id = cur.fetchone()[0]

        conn.commit()
        cur.close()
        conn.close()

        logger.info(f"Created user '{username}' with role '{role}'")
        return user_id
    except Exception as e:
        logger.error(f"Failed to create user '{username}': {str(e)}")
        raise

def get_conversation(conversation_id):
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute(
            "SELECT id, title, user_id FROM conversations WHERE id = %s",
            (conversation_id,)
        )
        row = cur.fetchone()
        cur.close()
        conn.close()

        if row is None:
            return None

        return {"id": row[0], "title": row[1], "user_id": row[2]}
    except Exception as e:
        logger.error(f"Failed to fetch conversation {conversation_id}: {str(e)}")
def set_user_online(user_id):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute(
        """
        UPDATE users
        SET is_online = TRUE,
            last_login = NOW()
        WHERE id = %s
        """,
        (user_id,)
    )

    conn.commit()
    cur.close()
    conn.close()

def set_user_offline(user_id):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute(
        """
        UPDATE users
        SET is_online = FALSE
        WHERE id = %s
        """,
        (user_id,)
    )

    conn.commit()
    cur.close()
    conn.close()

def get_online_users():
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        SELECT username,
               role,
               is_online,
               last_login
        FROM users
        ORDER BY username
    """)

    rows = cur.fetchall()

    cur.close()
    conn.close()

    return [
        {
            "username": r[0],
            "role": r[1],
            "is_online": r[2],
            "last_login": r[3].isoformat() if r[3] else None
        }
        for r in rows
    ]

def get_all_users():
    try:
        conn = get_connection()
        cur = conn.cursor()

        cur.execute("""
            SELECT
                id,
                username,
                role,
                role_id,
                is_online,
                last_login,
                is_blocked
            FROM users
            ORDER BY username
        """)

        rows = cur.fetchall()

        cur.close()
        conn.close()

        return [
            {
                "id": r[0],
                "username": r[1],
                "role": r[2],
                "role_id": r[3],
                "is_online": r[4],
                "last_login": r[5].isoformat() if r[5] else None,
                "is_blocked": r[6]
            }
            for r in rows
        ]

    except Exception as e:
        logger.error(f"Failed to fetch users: {str(e)}")
        raise
def update_user_role(user_id, role_id):
    try:
        conn = get_connection()
        cur = conn.cursor()

        cur.execute(
            """
            SELECT name
            FROM roles
            WHERE id = %s
            """,
            (role_id,)
        )

        role_row = cur.fetchone()

        if not role_row:
            cur.close()
            conn.close()
            return False

        role_name = role_row[0]

        cur.execute(
            """
            UPDATE users
            SET role_id = %s,
                role = %s
            WHERE id = %s
            """,
            (role_id, role_name, user_id)
        )

        if cur.rowcount == 0:
            conn.rollback()
            cur.close()
            conn.close()
            return False

        conn.commit()

        cur.close()
        conn.close()

        return True

    except Exception as e:
        logger.error(
            f"Failed to update role for user_id={user_id}: {str(e)}"
        )
        raise
def set_user_blocked(user_id, blocked):
    try:
        conn = get_connection()
        cur = conn.cursor()

        cur.execute(
            """
            UPDATE users
            SET is_blocked = %s
            WHERE id = %s
            """,
            (blocked, user_id)
        )

        if cur.rowcount == 0:
            conn.rollback()
            cur.close()
            conn.close()
            return False

        conn.commit()

        cur.close()
        conn.close()

        logger.info(
            f"User_id={user_id} blocked={blocked}"
        )

        return True

    except Exception as e:
        logger.error(
            f"Failed to update block status for user_id={user_id}: {str(e)}"
        )
        raise

def log_activity(user_id, username, action, details=None):
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO activity_log (user_id, username, action, details) VALUES (%s, %s, %s, %s)",
            (user_id, username, action, details)
        )
        conn.commit()
        cur.close()
        conn.close()
    except Exception as e:
        logger.error(f"Failed to log activity for '{username}': {str(e)}")

def get_activity_log(limit=100):
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute(
            "SELECT username, action, details, created_at FROM activity_log ORDER BY created_at DESC LIMIT %s",
            (limit,)
        )
        rows = cur.fetchall()
        cur.close()
        conn.close()
        return [
            {"username": r[0], "action": r[1], "details": r[2], "created_at": r[3].isoformat() if r[3] else None}
            for r in rows
        ]
    except Exception as e:
        logger.error(f"Failed to fetch activity log: {str(e)}")
        raise

def get_widget_configuration():
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        SELECT
            primary_color,
            bot_name,
            welcome_message,
            button_position,
            widget_size,
            avatar_url
        FROM widget_configuration
        WHERE id = 1
    """)

    row = cur.fetchone()

    cur.close()
    conn.close()

    if not row:
        return None

    return {
        "primaryColor": row[0],
        "botName": row[1],
        "welcomeMessage": row[2],
        "buttonPosition": row[3],
        "widgetSize": row[4],
        "avatarUrl": row[5]
    }

def update_widget_configuration(config):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        UPDATE widget_configuration
        SET
            primary_color=%s,
            bot_name=%s,
            welcome_message=%s,
            button_position=%s,
            widget_size=%s,
            avatar_url=%s
        WHERE id=1
    """,
    (
        config["primaryColor"],
        config["botName"],
        config["welcomeMessage"],
        config["buttonPosition"],
        config["widgetSize"],
        config["avatarUrl"]
    ))

    conn.commit()

    cur.close()
    conn.close()

def get_all_roles():
    try:
        conn = get_connection()
        cur = conn.cursor()

        cur.execute("""
            SELECT id, name
            FROM roles
            ORDER BY name
        """)

        rows = cur.fetchall()

        cur.close()
        conn.close()

        return [
            {
                "id": r[0],
                "name": r[1]
            }
            for r in rows
        ]

    except Exception as e:
        logger.error(f"Failed to fetch roles: {str(e)}")
        raise


def get_role_by_id(role_id):
    try:
        conn = get_connection()
        cur = conn.cursor()

        cur.execute(
            """
            SELECT id, name
            FROM roles
            WHERE id = %s
            """,
            (role_id,)
        )

        row = cur.fetchone()

        cur.close()
        conn.close()

        if not row:
            return None

        return {
            "id": row[0],
            "name": row[1]
        }

    except Exception as e:
        logger.error(f"Failed to fetch role {role_id}: {str(e)}")
        raise


def get_permissions_for_role(role_id):
    try:
        conn = get_connection()
        cur = conn.cursor()

        cur.execute(
            """
            SELECT p.name
            FROM permissions p
            JOIN role_permissions rp
                ON rp.permission_id = p.id
            WHERE rp.role_id = %s
            ORDER BY p.name
            """,
            (role_id,)
        )

        rows = cur.fetchall()

        cur.close()
        conn.close()

        return [r[0] for r in rows]

    except Exception as e:
        logger.error(
            f"Failed to fetch permissions for role_id={role_id}: {str(e)}"
        )
        raise


def get_user_permissions(user_id):
    try:
        conn = get_connection()
        cur = conn.cursor()

        cur.execute(
            """
            SELECT p.name
            FROM user_permissions up
            JOIN permissions p
                ON p.id = up.permission_id
            WHERE up.user_id = %s
            ORDER BY p.name
            """,
            (user_id,)
        )

        rows = cur.fetchall()

        cur.close()
        conn.close()

        return [r[0] for r in rows]

    except Exception as e:
        logger.error(
            f"Failed to fetch permissions for user_id={user_id}: {str(e)}"
        )
        raise
def update_user_password(user_id, hashed_password):
    try:
        conn = get_connection()
        cur = conn.cursor()

        cur.execute(
            """
            UPDATE users
            SET hashed_password = %s
            WHERE id = %s
            """,
            (hashed_password, user_id)
        )

        if cur.rowcount == 0:
            conn.rollback()
            cur.close()
            conn.close()
            return False

        conn.commit()

        cur.close()
        conn.close()

        logger.info(
            f"Password reset for user_id={user_id}"
        )

        return True

    except Exception as e:
        logger.error(
            f"Failed to reset password for user_id={user_id}: {str(e)}"
        )
        raise
def delete_user(user_id):
    conn = None
    cur = None

    try:
        conn = get_connection()
        cur = conn.cursor()

        # First check whether the user exists
        cur.execute(
            """
            SELECT username
            FROM users
            WHERE id = %s
            """,
            (user_id,)
        )

        user = cur.fetchone()

        if not user:
            cur.close()
            conn.close()
            return False

        # Delete messages belonging to the user's conversations
        cur.execute(
            """
            DELETE FROM messages
            WHERE conversation_id IN (
                SELECT id
                FROM conversations
                WHERE user_id = %s
            )
            """,
            (user_id,)
        )

        # Delete conversations
        cur.execute(
            """
            DELETE FROM conversations
            WHERE user_id = %s
            """,
            (user_id,)
        )

        # Delete uploaded document chunks
        cur.execute(
            """
            DELETE FROM document_chunks
            WHERE user_id = %s
            """,
            (user_id,)
        )

        # Delete activity logs for that user
        cur.execute(
            """
            DELETE FROM activity_log
            WHERE user_id = %s
            """,
            (user_id,)
        )

        # Finally delete the user
        cur.execute(
            """
            DELETE FROM users
            WHERE id = %s
            """,
            (user_id,)
        )

        conn.commit()

        cur.close()
        conn.close()

        logger.info(
            f"Deleted user_id={user_id}"
        )

        return True

    except Exception as e:

        if conn:
            conn.rollback()

        logger.error(
            f"Failed to delete user_id={user_id}: {str(e)}"
        )

        raise

    finally:
        if cur and not cur.closed:
            cur.close()

        if conn and not conn.closed:
            conn.close()

def get_all_permissions():
    try:
        conn = get_connection()
        cur = conn.cursor()

        cur.execute(
            """
            SELECT id, name
            FROM permissions
            ORDER BY name
            """
        )

        rows = cur.fetchall()

        cur.close()
        conn.close()

        return [
            {
                "id": r[0],
                "name": r[1]
            }
            for r in rows
        ]

    except Exception as e:
        logger.error(
            f"Failed to fetch all permissions: {str(e)}"
        )
        raise
def update_user_permissions(user_id, permission_ids):
    conn = None
    cur = None

    try:
        conn = get_connection()
        cur = conn.cursor()

        cur.execute(
            """
            SELECT id
            FROM users
            WHERE id = %s
            """,
            (user_id,)
        )

        if not cur.fetchone():
            return False

        cur.execute(
            """
            DELETE FROM user_permissions
            WHERE user_id = %s
            """,
            (user_id,)
        )

        for permission_id in permission_ids:
            cur.execute(
                """
                INSERT INTO user_permissions
                    (user_id, permission_id)
                VALUES (%s, %s)
                ON CONFLICT DO NOTHING
                """,
                (user_id, permission_id)
            )

        conn.commit()

        return True

    except Exception as e:
        if conn:
            conn.rollback()

        logger.error(
            f"Failed to update permissions for user_id={user_id}: {str(e)}"
        )
        raise

    finally:
        if cur:
            cur.close()

        if conn:
            conn.close()
def create_admin_user(username, hashed_password, role_id, permission_ids):
    conn = None
    cur = None

    try:
        conn = get_connection()
        cur = conn.cursor()

        # Check if username already exists
        cur.execute(
            """
            SELECT id
            FROM users
            WHERE username = %s
            """,
            (username,)
        )

        if cur.fetchone():
            return None

        # Get role name from role_id
        cur.execute(
            """
            SELECT name
            FROM roles
            WHERE id = %s
            """,
            (role_id,)
        )

        role = cur.fetchone()

        if not role:
            return False

        role_name = role[0]

        # Create user
        cur.execute(
            """
            INSERT INTO users (
                username,
                hashed_password,
                role,
                role_id,
                is_online,
                is_blocked
            )
            VALUES (%s, %s, %s, %s, FALSE, FALSE)
            RETURNING id
            """,
            (
                username,
                hashed_password,
                role_name,
                role_id
            )
        )

        user_id = cur.fetchone()[0]

        # Add selected permissions
        for permission_id in permission_ids:
            cur.execute(
                """
                INSERT INTO user_permissions (
                    user_id,
                    permission_id
                )
                VALUES (%s, %s)
                ON CONFLICT DO NOTHING
                """,
                (
                    user_id,
                    permission_id
                )
            )

        conn.commit()

        logger.info(
            f"Admin created user_id={user_id}"
        )

        return user_id

    except Exception as e:
        if conn:
            conn.rollback()

        logger.error(
            f"Failed to create admin user: {str(e)}"
        )

        raise

    finally:
        if cur:
            cur.close()

        if conn:
            conn.close()

def get_dashboard_stats(date_range="all" , user_id=None):
    conn = None
    cur= None
    date_condition = ""
    params = []

    if date_range == "today":
        date_condition = "AND created_at::date = CURRENT_DATE"

    elif date_range == "7days":
        date_condition = "AND created_at >= CURRENT_DATE - INTERVAL '6 days'"

    elif date_range == "30days":
        date_condition = "AND created_at >= CURRENT_DATE - INTERVAL '29 days'"
    user_condition = ""
    message_user_condition = ""
    conversation_params = []
    message_params = []
    if user_id is not None:
        user_condition = "AND user_id = %s"
        message_user_condition = "AND c.user_id = %s"
        conversation_params = []
        message_params = []

    if user_id is not None:
        conversation_params.append(user_id)
        message_params.append(user_id)
    try:
        conn= get_connection()
        cur=conn.cursor()

        cur.execute("""
        select COUNT(*) FROM users """)
        total_users=cur.fetchone()[0]
       

        cur.execute("""
        select COUNT(*) from users WHERE is_online = TRUE """ )
        online_users=cur.fetchone()[0]
        
        cur.execute("""
        select count(*) from users where is_blocked = TRUE """)
        blocked_users=cur.fetchone()[0]

        cur.execute(
            f"""
        SELECT COUNT(*)
    FROM conversations
    WHERE 1=1
    {date_condition}
     {user_condition} """,
     conversation_params)
        total_conversations =cur.fetchone()[0]

        cur.execute("""
        select count(*) from conversations where created_at::date = CURRENT_DATE"""
        )
        conversations_today = cur.fetchone()[0]

        cur.execute(
           f"""
    SELECT COUNT(*)
    FROM messages m
    JOIN conversations c
        ON m.conversation_id = c.id
    WHERE 1=1
    {date_condition.replace("created_at", "m.created_at")}
    {message_user_condition}
    """,
    message_params)
        total_messages = cur.fetchone()[0]

        cur.execute("""
            SELECT COUNT(*)
            FROM messages
            WHERE created_at::date = CURRENT_DATE
        """)
        messages_today = cur.fetchone()[0]

        cur.execute("""
            SELECT COUNT(DISTINCT document_name)
            FROM document_chunks
        """)
        total_documents = cur.fetchone()[0]

        cur.execute("""
            SELECT COUNT(*)
            FROM document_chunks
        """)
        total_document_chunks = cur.fetchone()[0]

        return {
            "total_users": total_users,
            "online_users": online_users,
            "blocked_users": blocked_users,
            "total_conversations": total_conversations,
            "conversations_today": conversations_today,
            "total_messages": total_messages,
            "messages_today": messages_today,
            "total_documents": total_documents,
            "total_document_chunks": total_document_chunks
        }

    except Exception as e:
        logger.error(
            f"Failed to fetch dashboard stats: {str(e)}"
        )
        raise

    finally:
        if cur:
            cur.close()

        if conn:
            conn.close()
def get_conversations_over_time(
    date_range="all",
    user_id=None
):
    conn = None
    cur = None

    date_condition = ""
    user_condition = ""
    params = []

    if date_range == "today":
        date_condition = "AND created_at::date = CURRENT_DATE"

    elif date_range == "7days":
        date_condition = """
            AND created_at >= CURRENT_DATE - INTERVAL '6 days'
        """

    elif date_range == "30days":
        date_condition = """
            AND created_at >= CURRENT_DATE - INTERVAL '29 days'
        """

    if user_id is not None:
        user_condition = "AND user_id = %s"
        params.append(user_id)

    try:
        conn = get_connection()
        cur = conn.cursor()

        cur.execute(
            f"""
            SELECT
                created_at::date AS date,
                COUNT(*) AS count
            FROM conversations
            WHERE 1=1
            {date_condition}
            {user_condition}
            GROUP BY created_at::date
            ORDER BY created_at::date
            """,
            params
        )

        rows = cur.fetchall()

        return [
            {
                "date": str(row[0]),
                "count": row[1]
            }
            for row in rows
        ]

    except Exception as e:
        logger.error(
            f"Failed to fetch conversation analytics: {str(e)}"
        )
        raise

    finally:
        if cur:
            cur.close()

        if conn:
            conn.close()

def get_messages_over_time(
    date_range="all",
    user_id=None
):
    conn = None
    cur = None

    date_condition = ""
    user_condition = ""
    params = []

    if date_range == "today":
        date_condition = "AND m.created_at::date = CURRENT_DATE"

    elif date_range == "7days":
        date_condition = """
            AND m.created_at >= CURRENT_DATE - INTERVAL '6 days'
        """

    elif date_range == "30days":
        date_condition = """
            AND m.created_at >= CURRENT_DATE - INTERVAL '29 days'
        """

    if user_id is not None:
        user_condition = "AND c.user_id = %s"
        params.append(user_id)

    try:
        conn = get_connection()
        cur = conn.cursor()

        cur.execute(
            f"""
            SELECT
                m.created_at::date AS date,
                COUNT(*) AS count
            FROM messages m
            JOIN conversations c
                ON m.conversation_id = c.id
            WHERE 1=1
            {date_condition}
            {user_condition}
            GROUP BY m.created_at::date
            ORDER BY m.created_at::date
            """,
            params
        )

        rows = cur.fetchall()

        return [
            {
                "date": str(row[0]),
                "count": row[1]
            }
            for row in rows
        ]

    except Exception as e:
        logger.error(
            f"Failed to fetch message analytics: {str(e)}"
        )
        raise

    finally:
        if cur:
            cur.close()

        if conn:
            conn.close()