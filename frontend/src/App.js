import React, { useState, useRef, useEffect } from 'react';
import './App.css';
import Login from './Login';
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Widget from "./components/Widget/Widget";
import WidgetConfiguration from "./components/Widget/WidgetConfiguration";

const API_BASE = 'http://localhost:8000';

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
  const [sessionExpired, setSessionExpired] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [activityLog, setActivityLog] = useState([]);

  const [authToken, setAuthToken] = useState(localStorage.getItem('authToken'));
  const [currentUser, setCurrentUser] = useState(() => {
    const stored = localStorage.getItem('authUser');
    return stored ? JSON.parse(stored) : null;
  });
  const isAdmin = currentUser?.role === 'admin';

  const handleLoginSuccess = ({ token, username, role }) => {
    setShowUserMenu(false);
    localStorage.setItem('authToken', token);
    localStorage.setItem('authUser', JSON.stringify({ username, role }));
    setAuthToken(token);
    setCurrentUser({ username, role });
  };

  const handleLogout = async (expired = false) => {
    try {
      await authFetch(`${API_BASE}/logout`, { method: 'POST' });
    } catch (err) {
      console.error('Logout request failed:', err);
    }
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
    setAuthToken(null);
    setCurrentUser(null);
    setMessages([]);
    setConversationId(null);
    setChatHistory([]);
    setUploadedDocs([]);
    setStatus('');
    setSessionExpired(expired);
  };

  const authFetch = async (url, options = {}) => {
    const headers = {
      ...(options.headers || {}),
      Authorization: `Bearer ${authToken}`,
    };
    const response = await fetch(url, { ...options, headers });

    if (response.status === 401) {
      handleLogout(true);
      throw new Error('Session expired. Please log in again.');
    }

    return response;
  };

  const fetchDocuments = async () => {
    try {
      const response = await authFetch(`${API_BASE}/documents`);
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
      const response = await authFetch(`${API_BASE}/conversations`, { method: 'GET' });
      const data = await response.json();
      setChatHistory(data.conversations || []);
    } catch (err) {
      console.error('Failed to load conversations: ', err);
    }
  };

  const fetchOnlineUsers = async () => {
    try {
      const response = await authFetch(`${API_BASE}/admin/users`);
      const data = await response.json();
      setOnlineUsers(data);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  };

  const fetchActivityLog = async () => {
    try {
      const response = await authFetch(`${API_BASE}/admin/activity-log`);
      const data = await response.json();
      setActivityLog(data);
    } catch (err) {
      console.error('Failed to fetch activity log:', err);
    }
  };

  useEffect(() => {
    if (authToken) {
      fetchDocuments();
      loadConversations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken]);

  useEffect(() => {
    if (!isAdmin) return;

    if (activeView === "users") {
      fetchOnlineUsers();
    }

    if (activeView === "activity") {
      fetchActivityLog();
    }
  }, [activeView, isAdmin]);

  const handleFileChange = async (e) => {
    const selected = Array.from(e.target.files);
    if (selected.length === 0) return;

    setStatus('Uploading...');

    for (const file of selected) {
      const formData = new FormData();
      formData.append('document', file);
      try {
        const response = await authFetch(`${API_BASE}/upload`, {
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
      const response = await authFetch(
        `${API_BASE}/documents/${encodeURIComponent(documentName)}`,
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

  const handleDeleteConversation = async (id) => {
    try {
      await authFetch(`${API_BASE}/conversations/${id}`, { method: 'DELETE' });
      if (conversationId === id) {
        setMessages([]);
        setConversationId(null);
      }
      loadConversations();
    } catch (err) {
      console.error('Failed to delete conversation:', err);
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    let currentConvId = conversationId;

    if (!currentConvId) {
      const convRes = await authFetch(`${API_BASE}/conversations`, { method: 'POST' });
      const convData = await convRes.json();
      currentConvId = convData.id;
      setConversationId(currentConvId);
    }

    const userMessage = input;
    setMessages((prev) => [...prev, { role: 'user', text: userMessage }]);
    setInput('');

    try {
      const response = await authFetch(`${API_BASE}/chat`, {
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

      setMessages((prev) => [...prev, { role: 'bot', text: data.answer }]);
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
      const response = await authFetch(`${API_BASE}/conversations`, { method: 'POST' });
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
      const response = await authFetch(`${API_BASE}/conversations/${id}/messages`);
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

  const getMimeType = (filename) => {
    const ext = filename.split('.').pop().toLowerCase();
    const map = {
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/msword',
      txt: 'text/plain',
    };
    return map[ext] || 'unknown';
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

  const renderMessageText = (text) => (
    <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
  );

  if (!authToken) {
    return <Login onLogin={handleLoginSuccess} sessionExpired={sessionExpired} />;
  }

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
          <div
            className={`nav-item ${activeView === "widgetConfig" ? "active" : ""}`}
            onClick={() => setActiveView("widgetConfig")}
          >
            Widget Configuration
          </div>
          {isAdmin && (
            <>
              <div
                className={`nav-item ${activeView === 'users' ? 'active' : ''}`}
                onClick={() => setActiveView('users')}
              >
                Users
              </div>

              <div
                className={`nav-item ${activeView === 'activity' ? 'active' : ''}`}
                onClick={() => setActiveView('activity')}
              >
                Activity Logs
              </div>
            </>
          )}

          {activeView === 'chat' && (
            <>
              <div className="section-label">Recent chats</div>
              {chatHistory.map((c) => (
                <div
                  key={c.id}
                  className={`chat-history-item-row ${conversationId === c.id ? 'active' : ''}`}
                >
                  <span onClick={() => handleSelectConversation(c.id)} className="chat-history-title">
                    {c.title}{isAdmin && c.owner_username ? ` — ${c.owner_username}` : ''}
                  </span>
                  <button
                    className="chat-history-delete-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteConversation(c.id);
                    }}
                    title="Delete chat"
                  >
                     🗑
                  </button>
                </div>
              ))}
            </>
          )}
        </div>
        {/* sidebar-scroll closed above; user-footer now sits outside the scroll area,
            so it stays pinned instead of scrolling with the nav/chat list */}

        <div className="user-footer">
          {showUserMenu && (
            <div className="user-dropdown">
              <div className="user-dropdown-item">Profile</div>
              <div className="user-dropdown-item">Settings</div>
              <div className="user-dropdown-item">Help</div>
              <div className="user-dropdown-item logout" onClick={() => handleLogout(false)}>Log out</div>
            </div>
          )}
          <div
            className="user-row"
            onClick={() => setShowUserMenu((prev) => !prev)}
          >
            <div className="user-avatar">
              {currentUser?.username ? currentUser.username.slice(0, 2).toUpperCase() : '??'}
            </div>
            <div className="user-info-text">
              <span className="user-name">{currentUser?.username || 'Unknown'}</span>
              <span className="user-status">{isAdmin ? 'Admin' : 'User'}</span>
            </div>
          </div>
        </div>
      </div>

      {activeView === 'chat' && (
        <div className="chat-main">
          <div className="chat-header">AI Document Assistant</div>
          <div className="chat-messages">
            {messages.length === 0 ? (
              <div className="empty-state">
                <h3>No messages yet</h3>
                <p>Upload a document and ask a question to get started.</p>
              </div>
            ) : (
              messages.map((m, i) => (
                <div key={i} className={`message ${m.role}`}>
                  {m.role === 'bot' ? renderMessageText(m.text) : m.text}
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
      )}

      {activeView === 'documents' && (
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
            <div className="table-container">
              <table className="docs-page-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Size</th>
                    <th>Uploaded</th>
                    <th>MIME Type</th>
                    {isAdmin && <th>Owner</th>}
                    {isAdmin && <th></th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredFiles.map((f, i) => (
                    <tr key={i}>
                      <td>{f.document_name}</td>
                      <td>{f.file_size ? (f.file_size / 1024).toFixed(1) + ' KB' : '—'}</td>
                      <td>{f.uploaded_at ? new Date(f.uploaded_at).toLocaleDateString() : '—'}</td>
                      <td>{getMimeType(f.document_name)}</td>
                      {isAdmin && <td>{f.owner_username || '—'}</td>}
                      {isAdmin && (
                        <td>
                          <button
                            className="doc-row-delete"
                            onClick={() => handleDelete(f.document_name)}
                            title="Delete"
                          >
                            🗑
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="status-text">{status}</div>
        </div>
      )}

      {activeView === "widgetConfig" && (
        <WidgetConfiguration />
      )}

      {activeView === "users" && isAdmin && (
        <div className="docs-page">
          <div className="docs-page-header">
            <h2>Users</h2>
          </div>

          <div className="table-container">
            <table className="docs-page-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Last Login</th>
                </tr>
              </thead>

              <tbody>
                {onlineUsers.map((user) => (
                  <tr key={user.username}>
                    <td>{user.is_online ? "🟢 Online" : "🔴 Offline"}</td>
                    <td>{user.username}</td>
                    <td>{user.role}</td>
                    <td>
                      {user.last_login
                        ? new Date(user.last_login).toLocaleString()
                        : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {activeView === "activity" && isAdmin && (
        <div className="docs-page">
          <div className="docs-page-header">
            <h2>Activity Logs</h2>
          </div>

          <div className="table-container">
            <table className="docs-page-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Action</th>
                  <th>Details</th>
                  <th>Time</th>
                </tr>
              </thead>

              <tbody>
                {activityLog.map((entry, i) => (
                  <tr key={i}>
                    <td>{entry.username || "—"}</td>
                    <td>{entry.action}</td>
                    <td>{entry.details || "—"}</td>
                    <td>
                      {entry.created_at
                        ? new Date(entry.created_at).toLocaleString()
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
       <div style={{ display: activeView === "widgetConfig" ? "none" : "block" }}>
        <Widget />
      </div>


    </div>
  );
}

export default App;