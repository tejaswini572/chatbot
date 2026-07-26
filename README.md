# AI Chatbot with Document Upload

An AI-powered chatbot that allows users to upload PDF documents and ask questions based on their content. The application extracts text from uploaded PDFs, generates embeddings, retrieves relevant information, and produces context-aware responses using a Large Language Model (LLM).

---

## Features

- Upload PDF documents
- Extract text from uploaded files
- Split documents into manageable text chunks
- Generate embeddings for semantic search
- Retrieve the most relevant document context
- Ask questions about uploaded documents
- Conversation history support
- React-based responsive user interface
- FastAPI backend with REST APIs

---

## Tech Stack

### Frontend
- React.js
- JavaScript
- CSS
- Fetch API

### Backend
- FastAPI
- Python
- pdfplumber
- Sentence Transformers
- SQLite
- Uvicorn

---

## Project Structure

```
chatbot_project/
│
├── backend/
│   ├── routers/
│   ├── services/
│   ├── main.py
│   ├── logger_config.py
│   └── requirements.txt
│
├── frontend/
│   ├── public/
│   ├── src/
│   ├── package.json
│   └── README.md
│
└── README.md
```

---

## Installation

### Clone the repository

```bash
git clone https://github.com/tejaswini572/chatbot.git
cd chatbot
```

---

## Backend Setup

Navigate to the backend directory.

```bash
cd backend
```

Create a virtual environment.

```bash
python -m venv venv
```

Activate the virtual environment.

### Windows

```bash
venv\Scripts\activate
```

### Linux/macOS

```bash
source venv/bin/activate
```

Install dependencies.

```bash
pip install -r requirements.txt
```

Run the backend server.

```bash
uvicorn main:app --reload
```

Backend runs on:

```
http://localhost:8000
```

---

## Frontend Setup

Navigate to the frontend directory.

```bash
cd frontend
```

Install dependencies.

```bash
npm install
```

Start the development server.

```bash
npm start
```

Frontend runs on:

```
http://localhost:3000
```

---

## API Endpoints

| Method | Endpoint | Description |
|---------|----------|-------------|
| POST | `/upload` | Upload PDF document |
| POST | `/chat` | Ask questions |
| GET | `/conversation` | Retrieve conversation history |

---

## Workflow

1. Upload a PDF document.
2. Text is extracted from the PDF.
3. The extracted text is divided into chunks.
4. Embeddings are generated for each chunk.
5. User submits a question.
6. Relevant chunks are retrieved using semantic similarity.
7. The LLM generates an answer based on the retrieved context.
8. Conversation history is stored and displayed.

---

## Future Improvements

- Support multiple document formats (DOCX, TXT)
- User authentication
- Streaming chatbot responses
- Vector database integration (ChromaDB/Pinecone/FAISS)
- Chat history management
- Docker deployment
- Dark mode
- Export conversations

---

## Screenshots

Add screenshots of:

- Home Page
- Document Upload
- Chat Interface
- Conversation History

---

## Author

**Tejaswini B**

Computer Science Engineering Student

Government Model Engineering College, Thrikkakara

GitHub: https://github.com/tejaswini572
