import React, { useState, useRef, useEffect } from 'react';
import './App.css';

function App() {
  const [activeView, setActiveView] = useState('chat');
  const [uploadedDocs, setUploadedDocs] = useState([]);
  const [status, setStatus] = useState('');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [docSearch, setDocSearch] = useState('');
  const [docFilter, setDocFilter] = useState('all');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const fileInputRef = useRef(null);

  const fetchDocuments = async () => {
    try {
      const response = await fetch('http://localhost:8000/documents');
      const data = await response.json();
      if (data.documents) {
        setUploadedDocs(data.documents);
      }
    } catch (err) {
      setStatus('Failed to load documents: ' + err.message);
    }
  };

  const loadConversations = async () => {
    try {
      const response = await fetch('http://localhost:8000/conversations', {
        method: 'GET',
      });
      const data = await response.json();
      setChatHistory(data.conversations || []);
    } catch (err) {
      console.error('Failed to load conversations: ', err);
    }
  };

  useEffect(() => {
    fetchDocuments();
    loadConversations();
  }, []);

  const handleFileChange = async (e) => {
    const selected = Array.from(e.target.files);
    if (selected.length === 0) return;

    setStatus('Uploading...');

    for (const file of selected) {
      const formData = new FormData();
      formData.append('document', file);
      try {
        const response = await fetch('http://localhost:8000/upload', {
          method: 'POST',
          body: formData,
        });
        await response.json();
      } catch (err) {
        setStatus('Upload failed: ' + err.message);
        return;
      }
    }

    setStatus('All files uploaded successfully!');
    fetchDocuments();
    e.target.value = '';
  };

  const handleDelete = async (documentName) => {
    try {
      const response = await fetch(
        `http://localhost:8000/documents/${encodeURIComponent(documentName)}`,
        { method: 'DELETE' }
      );
      const data = await response.json();
      if (data.error) {
        setStatus('Delete failed: ' + data.error);
        return;
      }
      setStatus(`Deleted "${documentName}" successfully.`);
      fetchDocuments();
    } catch (err) {
      setStatus('Delete failed: ' + err.message);
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    let currentConvId = conversationId;

    if (!currentConvId) {
      const convRes = await fetch('http://localhost:8000/conversations', { method: 'POST' });
      const convData = await convRes.json();
      currentConvId = convData.id;
      setConversationId(currentConvId);
    }

    const userMessage = input;
    setMessages((prev) => [...prev, { role: 'user', text: userMessage }]);
    setInput('');

    try {
      const response = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: userMessage, conversation_id: currentConvId }),
      });
      const data = await response.json();

      if (data.error) {
        setMessages((prev) => [
          ...prev,
          { role: 'bot', text: 'Something went wrong: ' + data.error },
        ]);
        return;
      }

      setMessages((prev) => [...prev, { role: 'bot', text: cleanBotText(data.answer) }]);
      loadConversations();
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'bot', text: 'Something went wrong. Please try again.' },
      ]);
    }
  };

  const handleNewChat = async () => {
    try {
      const response = await fetch('http://localhost:8000/conversations', {
        method: 'POST',
      });
      const data = await response.json();
      setConversationId(data.id);
      setMessages([]);
      setActiveView('chat');
      loadConversations();
    } catch (err) {
      console.error('Failed to create conversation: ', err);
    }
  };

  const handleSelectConversation = async (id) => {
    try {
      const response = await fetch(`http://localhost:8000/conversations/${id}/messages`);
      const data = await response.json();
      const loadedMessages = data.messages.map((m) => ({
        role: m.role === 'user' ? 'user' : 'bot',
        text: m.text,
      }));
      setMessages(loadedMessages);
      setConversationId(id);
      setActiveView('chat');
    } catch (err) {
      console.error('Failed to load messages: ', err);
    }
  };

  const filteredFiles = uploadedDocs.filter((f) => {
    const matchesSearch = f.document_name.toLowerCase().includes(docSearch.toLowerCase());
    const ext = f.document_name.split('.').pop().toLowerCase();
    const matchesFilter =
      docFilter === 'all' ||
      (docFilter === 'pdf' && ext === 'pdf') ||
      (docFilter === 'doc' && (ext === 'doc' || ext === 'docx')) ||
      (docFilter === 'txt' && ext === 'txt');
    return matchesSearch && matchesFilter;
  });

  const cleanBotText = (text) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/^#+\s*/gm, '')
      .replace(/^[-•]\s*/gm, '')
      .replace(/`([^`]*)`/g, '$1')
      .trim();
  };

  return (
    <div className="app-container">
      <div className="sidebar">
        <div className="sidebar-scroll">
          <button className="new-chat-btn" onClick={handleNewChat}>+ New chat</button>

          <div
            className={`nav-item ${activeView === 'chat' ? 'active' : ''}`}
            onClick={() => setActiveView('chat')}
          >
            Chatbot
          </div>
          <div
            className={`nav-item ${activeView === 'documents' ? 'active' : ''}`}
            onClick={() => setActiveView('documents')}
          >
            Documents
          </div>

          {activeView === 'chat' && (
            <>
              <div className="section-label">Recent chats</div>
              {chatHistory.map((c) => (
                <div
                  key={c.id}
                  className={`chat-history-item ${conversationId === c.id ? 'active' : ''}`}
                  onClick={() => handleSelectConversation(c.id)}
                >
                  {c.title}
                </div>
              ))}
            </>
          )}
        </div>

        <div className="user-footer">
          {showUserMenu && (
            <div className="user-dropdown">
              <div className="user-dropdown-item">Profile</div>
              <div className="user-dropdown-item">Settings</div>
              <div className="user-dropdown-item">Help</div>
              <div className="user-dropdown-item logout">Log out</div>
            </div>
          )}
          <div className="user-row" onClick={() => setShowUserMenu(!showUserMenu)}>
            <div className="user-avatar">TE</div>
            <div className="user-info-text">
              <span className="user-name">Tejaswini</span>
              <span className="user-status">Intern</span>
            </div>
          </div>
        </div>
      </div>

      {activeView === 'chat' ? (
        <div className="chat-main">
          <div className="chat-header">Chat with your documents</div>
          <div className="chat-messages">
            {messages.length === 0 ? (
              <div className="empty-state">
                <h3>No messages yet</h3>
                <p>Upload a document and ask a question to get started.</p>
              </div>
            ) : (
              messages.map((m, i) => (
                <div key={i} className={`message ${m.role}`}>
                  {m.role === 'bot' ? cleanBotText(m.text) : m.text}
                </div>
              ))
            )}
          </div>
          <div className="chat-input-area">
            <input
              className="chat-input"
              placeholder="Ask something about your documents..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            />
            <button className="send-btn" onClick={handleSend}>Send</button>
          </div>
        </div>
      ) : (
        <div className="docs-page">
          <div className="docs-page-header">
            <h2>Documents</h2>
            <div className="doc-actions-row" style={{ maxWidth: 160 }}>
              <button className="doc-action-btn primary" onClick={() => fileInputRef.current.click()}>
                Upload files
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                multiple
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
            </div>
          </div>

          <div className="docs-page-filter-row">
            <input
              className="doc-search"
              placeholder="Find documents..."
              value={docSearch}
              onChange={(e) => setDocSearch(e.target.value)}
            />
            <select
              className="doc-filter-select"
              value={docFilter}
              onChange={(e) => setDocFilter(e.target.value)}
            >
              <option value="all">All types</option>
              <option value="pdf">PDF</option>
              <option value="doc">DOC/DOCX</option>
              <option value="txt">TXT</option>
            </select>
          </div>

          {filteredFiles.length === 0 ? (
            <div className="no-docs">No documents uploaded yet.</div>
          ) : (
            <table className="docs-page-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Size</th>
                  <th>Uploaded</th>
                  <th>Chunks</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredFiles.map((f, i) => (
                  <tr key={i}>
                    <td>{f.document_name}</td>
                    <td>{f.file_size ? (f.file_size / 1024).toFixed(1) + ' KB' : '—'}</td>
                    <td>{f.uploaded_at ? new Date(f.uploaded_at).toLocaleDateString() : '—'}</td>
                    <td>{f.chunk_count}</td>
                    <td>
                      <button
                        className="doc-row-delete"
                        onClick={() => handleDelete(f.document_name)}
                        title="Delete"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="status-text">{status}</div>
        </div>
      )}
    </div>
  );
}

export default App;