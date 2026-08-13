import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from auth import hash_password
from db import get_connection

def create_user(username, password, role):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO users (username, hashed_password, role) VALUES (%s, %s, %s)",
        (username, hash_password(password), role)
    )
    conn.commit()
    cur.close()
    conn.close()
    print(f"Created user '{username}' with role '{role}'")

create_user("admin1", "adminpass123", "admin")
create_user("user1", "userpass123", "user")