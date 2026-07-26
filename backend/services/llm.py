import os
import time
from dotenv import load_dotenv
from google import genai
from logger_config import get_logger

load_dotenv()

logger = get_logger(__name__)
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))


MODELS_TO_TRY = ["gemini-3.5-flash", "gemini-3.1-flash-lite"]


def generate_answer(query: str, chunks: list[dict], max_retries: int = 2) -> str:
    context = "\n\n".join(
        f"[Source: {chunk['document_name']}]\n{chunk['chunk_text']}"
        for chunk in chunks
    )

    prompt = f"""You are a helpful assistant answering questions based only on the provided document excerpts.

Context:
{context}

Question: {query}

Instructions:
- Answer using only the information in the context above.
- If the context doesn't contain enough information to answer, say so clearly.
- Be concise and direct.

Answer:"""

    last_error = None

    for model_name in MODELS_TO_TRY:
        for attempt in range(1, max_retries + 1):
            start_time = time.time()
            try:
                logger.info(f"[LLM] Trying model={model_name} attempt={attempt}/{max_retries}")

                response = client.models.generate_content(
                    model=model_name,
                    contents=prompt,
                )

                elapsed = time.time() - start_time
                usage = getattr(response, "usage_metadata", None)

                if usage:
                    logger.info(
                        f"[LLM] Success | model={model_name} time={elapsed:.2f}s "
                        f"prompt_tokens={usage.prompt_token_count} "
                        f"output_tokens={usage.candidates_token_count} "
                        f"total_tokens={usage.total_token_count}"
                    )
                else:
                    logger.info(f"[LLM] Success | model={model_name} time={elapsed:.2f}s (no usage metadata)")

                return response.text

            except Exception as e:
                elapsed = time.time() - start_time
                last_error = e
                logger.warning(
                    f"[LLM] Failed | model={model_name} attempt={attempt}/{max_retries} "
                    f"time={elapsed:.2f}s error={str(e)}"
                )
                if attempt < max_retries:
                    wait = 2 ** attempt
                    logger.info(f"[LLM] Retrying in {wait}s...")
                    time.sleep(wait)

        logger.warning(f"[LLM] Giving up on model={model_name}, trying next fallback if available")

    logger.error(f"[LLM] All models and retries exhausted. Last error: {str(last_error)}")
    return "I'm having trouble reaching the AI service right now. Please try again in a moment."