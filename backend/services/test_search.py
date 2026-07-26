import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from logger_config import get_logger
from embedding import generate_embedding
from db import search_similar_chunks
from llm import generate_answer

logger = get_logger(__name__)

query = "who is doing this internship?"

logger.info(f"Running test query: {query}")

vec = generate_embedding(query)
results = search_similar_chunks(vec)

print("--- RETRIEVED CHUNKS ---")
for r in results:
    print(r["distance"], r["document_name"], r["chunk_text"][:80])

if not results:
    print("No chunks found — check that a document is uploaded and indexed.")
else:
    answer = generate_answer(query, results)
    print("\n--- QUESTION ---")
    print(query)
    print("\n--- ANSWER ---")
    print(answer)