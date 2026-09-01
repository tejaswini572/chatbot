from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URL = "mongodb://localhost:27017"

client = AsyncIOMotorClient(MONGO_URL)

mongo_db = client["widget_history"]

conversations_collection = mongo_db["conversations"]

import asyncio


async def test_connection():
    try:
        await client.admin.command("ping")
        print("MongoDB connection successful!")
    except Exception as e:
        print("MongoDB connection failed:", e)


if __name__ == "__main__":
    asyncio.run(test_connection())