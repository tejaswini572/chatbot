import React, { useState, useRef, useEffect } from 'react';
import './App.css';
import Login from './Login';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Widget from './components/Widget/Widget';
import WidgetConfiguration from './components/Widget/WidgetConfiguration';

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
  const [roles, setRoles] = useState([]);

  // Permissions of currently logged-in user
  const [permissions, setPermissions] = useState([]);

  // Permission management
  const [allPermissions, setAllPermissions] = useState([]);
  const [selectedUserPermissions, setSelectedUserPermissions] =
    useState([]);
  const [permissionUser, setPermissionUser] = useState(null);

  // Create user
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [createUserLoading, setCreateUserLoading] = useState(false);

  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    role_id: '',
    permission_ids: []
  });

  const [openActionMenu, setOpenActionMenu] = useState(null);

  // Widget history
  const [widgetSessions, setWidgetSessions] = useState([]);
  const [selectedWidgetSession, setSelectedWidgetSession] =
    useState(null);
  const [widgetSessionLoading, setWidgetSessionLoading] =
    useState(false);
  const [widgetSessionSearch, setWidgetSessionSearch] = useState('');

  const [authToken, setAuthToken] = useState(
    localStorage.getItem('authToken')
  );

  const [currentUser, setCurrentUser] = useState(() => {
    const stored = localStorage.getItem('authUser');
    return stored ? JSON.parse(stored) : null;
  });

  const isAdmin = currentUser?.role === 'admin';

  // ============================================================
  // AUTH
  // ============================================================

  const handleLoginSuccess = ({
    token,
    username,
    role
  }) => {
    setShowUserMenu(false);

    localStorage.setItem(
      'authToken',
      token
    );

    localStorage.setItem(
      'authUser',
      JSON.stringify({
        username,
        role
      })
    );

    setAuthToken(token);

    setCurrentUser({
      username,
      role
    });
  };

  const handleLogout = async (
    expired = false
  ) => {
    try {
      await authFetch(
        `${API_BASE}/logout`,
        {
          method: 'POST'
        }
      );
    } catch (err) {
      console.error(
        'Logout request failed:',
        err
      );
    }

    localStorage.removeItem(
      'authToken'
    );

    localStorage.removeItem(
      'authUser'
    );

    setAuthToken(null);
    setCurrentUser(null);

    setMessages([]);
    setConversationId(null);
    setChatHistory([]);

    setUploadedDocs([]);
    setStatus('');

    setPermissions([]);

    setWidgetSessions([]);
    setSelectedWidgetSession(null);
    setWidgetSessionSearch('');

    setSessionExpired(expired);
  };

  const authFetch = async (
    url,
    options = {}
  ) => {
    const headers = {
      ...(options.headers || {}),

      Authorization:
        `Bearer ${authToken}`
    };

    const response =
      await fetch(
        url,
        {
          ...options,
          headers
        }
      );

    if (
      response.status === 401
    ) {
      handleLogout(true);

      throw new Error(
        'Session expired. Please log in again.'
      );
    }

    return response;
  };

  // ============================================================
  // CURRENT USER PERMISSIONS
  // ============================================================

  const fetchPermissions =
    async () => {

      try {
        const response =
          await authFetch(
            `${API_BASE}/permissions`
          );

        if (!response.ok) {
          throw new Error(
            'Failed to fetch permissions'
          );
        }

        const data =
          await response.json();

        setPermissions(
          data.permissions || []
        );

      } catch (err) {
        console.error(
          'Failed to fetch permissions:',
          err
        );
      }
    };

  // ============================================================
  // DOCUMENTS
  // ============================================================

  const fetchDocuments =
    async () => {

      try {
        const response =
          await authFetch(
            `${API_BASE}/documents`
          );

        if (!response.ok) {
          return;
        }

        const data =
          await response.json();

        if (data.documents) {
          setUploadedDocs(
            data.documents
          );
        }

      } catch (err) {
        setStatus(
          'Failed to load documents: ' +
          err.message
        );
      }
    };

  // ============================================================
  // NORMAL CHAT CONVERSATIONS
  // ============================================================

  const loadConversations =
    async () => {

      try {
        const response =
          await authFetch(
            `${API_BASE}/conversations`,
            {
              method: 'GET'
            }
          );

        if (!response.ok) {
          return;
        }

        const data =
          await response.json();

        setChatHistory(
          data.conversations || []
        );

      } catch (err) {
        console.error(
          'Failed to load conversations:',
          err
        );
      }
    };

  // ============================================================
  // ADMIN / USER MANAGEMENT
  // ============================================================

  const fetchOnlineUsers =
    async () => {

      try {
        const response =
          await authFetch(
            `${API_BASE}/admin/users`
          );

        if (!response.ok) {
          throw new Error(
            'Failed to fetch users'
          );
        }

        const data =
          await response.json();

        setOnlineUsers(data);

      } catch (err) {
        console.error(
          'Failed to fetch users:',
          err
        );
      }
    };

  const fetchRoles =
    async () => {

      try {
        const response =
          await authFetch(
            `${API_BASE}/admin/roles`
          );

        if (!response.ok) {
          throw new Error(
            'Failed to fetch roles'
          );
        }

        const data =
          await response.json();

        setRoles(data);

      } catch (err) {
        console.error(
          'Failed to fetch roles:',
          err
        );
      }
    };

  const fetchAllPermissions =
    async () => {

      try {
        const response =
          await authFetch(
            `${API_BASE}/admin/permissions`
          );

        if (!response.ok) {
          throw new Error(
            'Failed to fetch permissions'
          );
        }

        const data =
          await response.json();

        setAllPermissions(data);

      } catch (err) {
        console.error(
          'Failed to fetch all permissions:',
          err
        );
      }
    };

  // ============================================================
  // OPEN PERMISSION EDITOR
  // ============================================================

  const openPermissionEditor =
    async (user) => {

      try {
        const response =
          await authFetch(
            `${API_BASE}/admin/users/${user.id}/permissions`
          );

        if (!response.ok) {
          throw new Error(
            'Failed to fetch user permissions'
          );
        }

        const data =
          await response.json();

        setPermissionUser(user);

        setSelectedUserPermissions(
          data.permissions || []
        );

        setOpenActionMenu(null);

        setShowCreateUser(false);

      } catch (err) {
        console.error(
          'Failed to load user permissions:',
          err
        );
      }
    };

  // ============================================================
  // SAVE EXISTING USER PERMISSIONS
  // ============================================================

  const handleSavePermissions =
    async () => {

      if (!permissionUser) {
        return;
      }

      try {
        const permissionIds =
          allPermissions
            .filter(
              (permission) =>
                selectedUserPermissions
                  .includes(
                    permission.name
                  )
            )
            .map(
              (permission) =>
                permission.id
            );

        const response =
          await authFetch(
            `${API_BASE}/admin/users/${permissionUser.id}/permissions`,
            {
              method: 'PUT',

              headers: {
                'Content-Type':
                  'application/json'
              },

              body:
                JSON.stringify({
                  permission_ids:
                    permissionIds
                })
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.detail ||
            'Failed to update permissions'
          );
        }

        alert(
          'Permissions updated successfully.'
        );

        setPermissionUser(null);

        setSelectedUserPermissions(
          []
        );

      } catch (err) {
        console.error(
          'Failed to update permissions:',
          err
        );

        alert(err.message);
      }
    };

  // ============================================================
  // CREATE USER
  // ============================================================

  const closeCreateUser = () => {

    setShowCreateUser(false);

    setNewUser({
      username: '',
      password: '',
      role_id: '',
      permission_ids: []
    });
  };

  const handleCreateUser =
    async (e) => {

      e.preventDefault();

      const username =
        newUser.username.trim();

      if (!username) {
        alert(
          'Please enter a username or email.'
        );

        return;
      }

      if (
        newUser.password.length < 6
      ) {
        alert(
          'Password must be at least 6 characters long.'
        );

        return;
      }

      if (!newUser.role_id) {
        alert(
          'Please select a role.'
        );

        return;
      }

      setCreateUserLoading(true);

      try {

        const response =
          await authFetch(
            `${API_BASE}/admin/users`,
            {
              method: 'POST',

              headers: {
                'Content-Type':
                  'application/json'
              },

              body:
                JSON.stringify({
                  username:
                    username,

                  password:
                    newUser.password,

                  role_id:
                    Number(
                      newUser.role_id
                    ),

                  permission_ids:
                    newUser
                      .permission_ids
                })
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.detail ||
            'Failed to create user'
          );
        }

        alert(
          'User created successfully.'
        );

        closeCreateUser();

        await fetchOnlineUsers();

      } catch (err) {

        console.error(
          'Failed to create user:',
          err
        );

        alert(err.message);

      } finally {

        setCreateUserLoading(
          false
        );
      }
    };

  // ============================================================
  // CHANGE ROLE
  // ============================================================

  const handleRoleChange =
    async (
      userId,
      roleId
    ) => {

      try {

        const response =
          await authFetch(
            `${API_BASE}/admin/users/${userId}/role?role_id=${roleId}`,
            {
              method: 'PUT'
            }
          );

        if (!response.ok) {
          throw new Error(
            'Failed to update role'
          );
        }

        await fetchOnlineUsers();

      } catch (err) {

        console.error(
          'Failed to update user role:',
          err
        );
      }
    };

  // ============================================================
  // BLOCK / UNBLOCK USER
  // ============================================================

  const handleToggleBlock =
    async (
      userId,
      currentBlocked
    ) => {

      try {

        const newStatus =
          !currentBlocked;

        const response =
          await authFetch(
            `${API_BASE}/admin/users/${userId}/block?blocked=${newStatus}`,
            {
              method: 'PUT'
            }
          );

        if (!response.ok) {

          const data =
            await response.json();

          throw new Error(
            data.detail ||
            'Failed to update block status'
          );
        }

        await fetchOnlineUsers();

      } catch (err) {

        console.error(
          'Failed to block/unblock user:',
          err
        );
      }
    };

  // ============================================================
  // DELETE USER
  // ============================================================

  const handleDeleteUser =
    async (userId) => {

      const confirmed =
        window.confirm(
          'Are you sure you want to delete this user?'
        );

      if (!confirmed) {
        return;
      }

      try {

        const response =
          await authFetch(
            `${API_BASE}/admin/users/${userId}`,
            {
              method: 'DELETE'
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.detail ||
            'Failed to delete user'
          );
        }

        setOpenActionMenu(
          null
        );

        if (
          permissionUser?.id ===
          userId
        ) {
          setPermissionUser(
            null
          );

          setSelectedUserPermissions(
            []
          );
        }

        await fetchOnlineUsers();

      } catch (err) {

        console.error(
          'Failed to delete user:',
          err
        );

        alert(err.message);
      }
    };

  // ============================================================
  // RESET PASSWORD
  // ============================================================

  const handleResetPassword =
    async (userId) => {

      const newPassword =
        window.prompt(
          'Enter the new password:'
        );

      if (
        newPassword === null
      ) {
        return;
      }

      if (
        newPassword.length < 6
      ) {

        alert(
          'Password must be at least 6 characters long.'
        );

        return;
      }

      try {

        const response =
          await authFetch(
            `${API_BASE}/admin/users/${userId}/reset-password`,
            {
              method: 'PUT',

              headers: {
                'Content-Type':
                  'application/json'
              },

              body:
                JSON.stringify({
                  new_password:
                    newPassword
                })
            }
          );

        const data =
          await response.json();

        if (!response.ok) {

          throw new Error(
            data.detail ||
            'Failed to reset password'
          );
        }

        setOpenActionMenu(
          null
        );

        alert(
          'Password reset successfully.'
        );

      } catch (err) {

        console.error(
          'Failed to reset password:',
          err
        );

        alert(err.message);
      }
    };

  // ============================================================
  // ACTIVITY LOG
  // ============================================================

  const fetchActivityLog =
    async () => {

      try {

        const response =
          await authFetch(
            `${API_BASE}/admin/activity-log`
          );

        if (!response.ok) {
          throw new Error(
            'Failed to fetch activity log'
          );
        }

        const data =
          await response.json();

        setActivityLog(data);

      } catch (err) {

        console.error(
          'Failed to fetch activity log:',
          err
        );
      }
    };

  // ============================================================
  // WIDGET HISTORY
  // ============================================================

  const fetchWidgetSessions =
    async () => {

      try {

        const response =
          await authFetch(
            `${API_BASE}/widget-history/sessions`
          );

        if (!response.ok) {
          return;
        }

        const data =
          await response.json();

        setWidgetSessions(
          data.sessions || []
        );

      } catch (err) {

        console.error(
          'Failed to fetch widget sessions:',
          err
        );
      }
    };

  const fetchWidgetSession =
    async (sessionId) => {

      setWidgetSessionLoading(
        true
      );

      try {

        const response =
          await authFetch(
            `${API_BASE}/widget-history/sessions/${encodeURIComponent(
              sessionId
            )}`
          );

        if (!response.ok) {
          throw new Error(
            'Failed to fetch widget session'
          );
        }

        const data =
          await response.json();

        setSelectedWidgetSession(
          data
        );

      } catch (err) {

        console.error(
          'Failed to fetch widget session:',
          err
        );

      } finally {

        setWidgetSessionLoading(
          false
        );
      }
    };

  // ============================================================
  // INITIAL PERMISSION LOAD
  // ============================================================

  useEffect(() => {

    if (authToken) {
      fetchPermissions();
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken]);

  // ============================================================
  // LOAD DATA BASED ON PERMISSIONS
  // ============================================================

  useEffect(() => {

    if (!authToken) {
      return;
    }

    if (
      permissions.includes(
        'documents'
      )
    ) {
      fetchDocuments();
    }

    if (
      permissions.includes(
        'chatbot'
      )
    ) {
      loadConversations();
    }

    if (
      permissions.includes(
        'widget_history'
      )
    ) {
      fetchWidgetSessions();
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    permissions,
    authToken
  ]);

  // ============================================================
  // PAGE SPECIFIC DATA
  // ============================================================

  useEffect(() => {

    if (
      activeView === 'users' &&
      permissions.includes(
        'users'
      )
    ) {

      fetchOnlineUsers();

      fetchRoles();

      fetchAllPermissions();
    }

    if (
      activeView ===
        'activity' &&
      permissions.includes(
        'activity_logs'
      )
    ) {

      fetchActivityLog();
    }

    if (
      activeView ===
        'widgetHistory' &&
      permissions.includes(
        'widget_history'
      )
    ) {

      fetchWidgetSessions();
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeView,
    permissions
  ]);

  // ============================================================
  // SWITCH TO FIRST ALLOWED PAGE
  // ============================================================

  useEffect(() => {

    if (
      permissions.length === 0
    ) {
      return;
    }

    const allowedViews = [

      {
        permission:
          'chatbot',

        view:
          'chat'
      },

      {
        permission:
          'documents',

        view:
          'documents'
      },

      {
        permission:
          'widget_configuration',

        view:
          'widgetConfig'
      },

      {
        permission:
          'widget_history',

        view:
          'widgetHistory'
      },

      {
        permission:
          'users',

        view:
          'users'
      },

      {
        permission:
          'activity_logs',

        view:
          'activity'
      }
    ];

    const currentAllowed =
      allowedViews.some(
        (item) =>
          item.view ===
            activeView &&
          permissions.includes(
            item.permission
          )
      );

    if (!currentAllowed) {

      const firstAllowed =
        allowedViews.find(
          (item) =>
            permissions.includes(
              item.permission
            )
        );

      if (firstAllowed) {

        setActiveView(
          firstAllowed.view
        );
      }
    }

  }, [
    permissions,
    activeView
  ]);

  // ============================================================
  // FILE UPLOAD
  // ============================================================

  const handleFileChange =
    async (e) => {

      const selected =
        Array.from(
          e.target.files
        );

      if (
        selected.length === 0
      ) {
        return;
      }

      setStatus(
        'Uploading...'
      );

      for (
        const file of selected
      ) {

        const formData =
          new FormData();

        formData.append(
          'document',
          file
        );

        try {

          const response =
            await authFetch(
              `${API_BASE}/upload`,
              {
                method:
                  'POST',

                body:
                  formData
              }
            );

          await response.json();

        } catch (err) {

          setStatus(
            'Upload failed: ' +
            err.message
          );

          return;
        }
      }

      setStatus(
        'All files uploaded successfully!'
      );

      fetchDocuments();

      e.target.value = '';
    };

  const handleDelete =
    async (documentName) => {

      try {

        const response =
          await authFetch(
            `${API_BASE}/documents/${encodeURIComponent(
              documentName
            )}`,
            {
              method:
                'DELETE'
            }
          );

        const data =
          await response.json();

        if (data.error) {

          setStatus(
            'Delete failed: ' +
            data.error
          );

          return;
        }

        setStatus(
          `Deleted "${documentName}" successfully.`
        );

        fetchDocuments();

      } catch (err) {

        setStatus(
          'Delete failed: ' +
          err.message
        );
      }
    };

  // ============================================================
  // DELETE CHAT
  // ============================================================

  const handleDeleteConversation =
    async (id) => {

      try {

        await authFetch(
          `${API_BASE}/conversations/${id}`,
          {
            method:
              'DELETE'
          }
        );

        if (
          conversationId === id
        ) {

          setMessages([]);

          setConversationId(
            null
          );
        }

        loadConversations();

      } catch (err) {

        console.error(
          'Failed to delete conversation:',
          err
        );
      }
    };

  // ============================================================
  // SEND MESSAGE
  // ============================================================

  const handleSend =
    async () => {

      if (!input.trim()) {
        return;
      }

      let currentConvId =
        conversationId;

      if (!currentConvId) {

        const convRes =
          await authFetch(
            `${API_BASE}/conversations`,
            {
              method:
                'POST'
            }
          );

        const convData =
          await convRes.json();

        currentConvId =
          convData.id;

        setConversationId(
          currentConvId
        );
      }

      const userMessage =
        input;

      setMessages(
        prev => [
          ...prev,

          {
            role:
              'user',

            text:
              userMessage
          }
        ]
      );

      setInput('');

      try {

        const response =
          await authFetch(
            `${API_BASE}/chat`,
            {
              method:
                'POST',

              headers: {
                'Content-Type':
                  'application/json'
              },

              body:
                JSON.stringify({
                  query:
                    userMessage,

                  conversation_id:
                    currentConvId
                })
            }
          );

        const data =
          await response.json();

        if (data.error) {

          setMessages(
            prev => [
              ...prev,

              {
                role:
                  'bot',

                text:
                  'Something went wrong: ' +
                  data.error
              }
            ]
          );

          return;
        }

        setMessages(
          prev => [
            ...prev,

            {
              role:
                'bot',

              text:
                data.answer,

              sources:
                data.sources || []
            }
          ]
        );

        loadConversations();

      } catch (err) {

        setMessages(
          prev => [
            ...prev,

            {
              role:
                'bot',

              text:
                'Something went wrong. Please try again.'
            }
          ]
        );
      }
    };

  // ============================================================
  // NEW CHAT
  // ============================================================

  const handleNewChat =
    async () => {

      try {

        const response =
          await authFetch(
            `${API_BASE}/conversations`,
            {
              method:
                'POST'
            }
          );

        const data =
          await response.json();

        setConversationId(
          data.id
        );

        setMessages([]);

        setActiveView(
          'chat'
        );

        loadConversations();

      } catch (err) {

        console.error(
          'Failed to create conversation:',
          err
        );
      }
    };

  // ============================================================
  // SELECT CHAT
  // ============================================================

  const handleSelectConversation =
    async (id) => {

      try {

        const response =
          await authFetch(
            `${API_BASE}/conversations/${id}/messages`
          );

        const data =
          await response.json();

        const loadedMessages =
          data.messages.map(
            (m) => ({
              role:
                m.role ===
                'user'
                  ? 'user'
                  : 'bot',

              text:
                m.text,

              sources:
                m.sources || []
            })
          );

        setMessages(
          loadedMessages
        );

        setConversationId(
          id
        );

        setActiveView(
          'chat'
        );

      } catch (err) {

        console.error(
          'Failed to load messages:',
          err
        );
      }
    };

  // ============================================================
  // MIME TYPE
  // ============================================================

  const getMimeType =
    (filename) => {

      const ext =
        filename
          .split('.')
          .pop()
          .toLowerCase();

      const map = {

        pdf:
          'application/pdf',

        doc:
          'application/msword',

        docx:
          'application/msword',

        txt:
          'text/plain'
      };

      return (
        map[ext] ||
        'unknown'
      );
    };

  // ============================================================
  // DOCUMENT FILTER
  // ============================================================

  const filteredFiles =
    uploadedDocs.filter(
      (f) => {

        const matchesSearch =
          f.document_name
            .toLowerCase()
            .includes(
              docSearch
                .toLowerCase()
            );

        const ext =
          f.document_name
            .split('.')
            .pop()
            .toLowerCase();

        const matchesFilter =
          docFilter ===
            'all' ||

          (
            docFilter ===
              'pdf' &&
            ext ===
              'pdf'
          ) ||

          (
            docFilter ===
              'doc' &&

            (
              ext ===
                'doc' ||

              ext ===
                'docx'
            )
          ) ||

          (
            docFilter ===
              'txt' &&

            ext ===
              'txt'
          );

        return (
          matchesSearch &&
          matchesFilter
        );
      }
    );

  // ============================================================
  // MARKDOWN
  // ============================================================

  const renderMessageText =
    (text) => (

      <ReactMarkdown
        remarkPlugins={[
          remarkGfm
        ]}
      >
        {text || ''}
      </ReactMarkdown>
    );

  // ============================================================
  // WIDGET SEARCH
  // ============================================================

  const filteredWidgetSessions =
    widgetSessions.filter(
      (session) =>
        session.session_id
          ?.toLowerCase()
          .includes(
            widgetSessionSearch
              .toLowerCase()
          )
    );

  // ============================================================
  // LOGIN
  // ============================================================

  if (!authToken) {

    return (

      <Login
        onLogin={
          handleLoginSuccess
        }

        sessionExpired={
          sessionExpired
        }
      />
    );
  }

  // ============================================================
  // PERMISSION HELPER
  // ============================================================

  const hasPermission =
    (permission) => {

      return permissions.includes(
        permission
      );
    };

  // ============================================================
  // MAIN UI
  // ============================================================

  return (

    <div className="app-container">

      {/* =====================================================
          SIDEBAR
      ===================================================== */}

      <div className="sidebar">

        <div className="sidebar-scroll">

          {hasPermission(
            'chatbot'
          ) && (

            <button
              className="new-chat-btn"

              onClick={
                handleNewChat
              }
            >
              + New chat
            </button>

          )}

          {hasPermission(
            'chatbot'
          ) && (

            <div
              className={`nav-item ${
                activeView ===
                'chat'
                  ? 'active'
                  : ''
              }`}

              onClick={() =>
                setActiveView(
                  'chat'
                )
              }
            >
              Chatbot
            </div>

          )}

          {hasPermission(
            'documents'
          ) && (

            <div
              className={`nav-item ${
                activeView ===
                'documents'
                  ? 'active'
                  : ''
              }`}

              onClick={() =>
                setActiveView(
                  'documents'
                )
              }
            >
              Documents
            </div>

          )}

          {hasPermission(
            'widget_configuration'
          ) && (

            <div
              className={`nav-item ${
                activeView ===
                'widgetConfig'
                  ? 'active'
                  : ''
              }`}

              onClick={() =>
                setActiveView(
                  'widgetConfig'
                )
              }
            >
              Widget Configuration
            </div>

          )}

          {hasPermission(
            'widget_history'
          ) && (

            <div
              className={`nav-item ${
                activeView ===
                'widgetHistory'
                  ? 'active'
                  : ''
              }`}

              onClick={() =>
                setActiveView(
                  'widgetHistory'
                )
              }
            >
              Conversations
            </div>

          )}

          {hasPermission(
            'users'
          ) && (

            <div
              className={`nav-item ${
                activeView ===
                'users'
                  ? 'active'
                  : ''
              }`}

              onClick={() =>
                setActiveView(
                  'users'
                )
              }
            >
              Users
            </div>

          )}

          {hasPermission(
            'activity_logs'
          ) && (

            <div
              className={`nav-item ${
                activeView ===
                'activity'
                  ? 'active'
                  : ''
              }`}

              onClick={() =>
                setActiveView(
                  'activity'
                )
              }
            >
              Activity Logs
            </div>

          )}

          {/* RECENT CHATS */}

          {activeView ===
            'chat' &&

            hasPermission(
              'chatbot'
            ) && (

            <>

              <div className="section-label">
                Recent chats
              </div>

              {chatHistory.map(
                (c) => (

                  <div
                    key={
                      c.id
                    }

                    className={`chat-history-item-row ${
                      conversationId ===
                        c.id
                        ? 'active'
                        : ''
                    }`}
                  >

                    <span
                      className="chat-history-title"

                      onClick={() =>
                        handleSelectConversation(
                          c.id
                        )
                      }
                    >

                      {c.title}

                      {isAdmin &&
                      c.owner_username
                        ? ` — ${c.owner_username}`
                        : ''}

                    </span>

                    <button
                      className="chat-history-delete-btn"

                      title="Delete chat"

                      onClick={(e) => {

                        e.stopPropagation();

                        handleDeleteConversation(
                          c.id
                        );
                      }}
                    >
                      🗑
                    </button>

                  </div>

                )
              )}

            </>

          )}

        </div>

        {/* USER FOOTER */}

        <div className="user-footer">

          {showUserMenu && (

            <div className="user-dropdown">

              <div className="user-dropdown-item">
                Profile
              </div>

              <div className="user-dropdown-item">
                Settings
              </div>

              <div className="user-dropdown-item">
                Help
              </div>

              <div
                className="user-dropdown-item logout"

                onClick={() =>
                  handleLogout(
                    false
                  )
                }
              >
                Log out
              </div>

            </div>

          )}

          <div
            className="user-row"

            onClick={() =>
              setShowUserMenu(
                prev =>
                  !prev
              )
            }
          >

            <div className="user-avatar">

              {currentUser
                ?.username

                ? currentUser
                    .username
                    .slice(
                      0,
                      2
                    )
                    .toUpperCase()

                : '??'}

            </div>

            <div className="user-info-text">

              <span className="user-name">

                {currentUser
                  ?.username ||
                  'Unknown'}

              </span>

              <span className="user-status">

                {currentUser
                  ?.role ||
                  'User'}

              </span>

            </div>

          </div>

        </div>

      </div>

      {/* =====================================================
          CHAT
      ===================================================== */}

      {activeView ===
        'chat' &&

        hasPermission(
          'chatbot'
        ) && (

        <div className="chat-main">

          <div className="chat-header">

            AI Document Assistant

          </div>

          <div className="chat-messages">

            {messages.length ===
              0
              ? (

                <div className="empty-state">

                  <h3>
                    No messages yet
                  </h3>

                  <p>
                    Upload a document and ask a question to get started.
                  </p>

                </div>

              )
              : (

                messages.map(
                  (
                    m,
                    i
                  ) => (

                    <div
                      key={
                        i
                      }

                      className={`message ${m.role}`}
                    >

                      {m.role ===
                        'bot'

                        ? renderMessageText(
                            m.text
                          )

                        : m.text}

                      {m.role ===
                        'bot' &&

                        m.sources
                          ?.length >
                          0 && (

                        <div className="message-sources">

                          <strong>
                            Source:
                          </strong>{' '}

                          {m.sources.join(
                            ', '
                          )}

                        </div>

                      )}

                    </div>

                  )
                )

              )}

          </div>

          <div className="chat-input-area">

            <input
              className="chat-input"

              placeholder="Ask something about your documents..."

              value={
                input
              }

              onChange={(e) =>
                setInput(
                  e.target.value
                )
              }

              onKeyDown={(e) =>
                e.key ===
                  'Enter' &&
                handleSend()
              }
            />

            <button
              className="send-btn"

              onClick={
                handleSend
              }
            >
              Send
            </button>

          </div>

        </div>

      )}

      {/* =====================================================
          DOCUMENTS
      ===================================================== */}

      {activeView ===
        'documents' &&

        hasPermission(
          'documents'
        ) && (

        <div className="docs-page">

          <div className="docs-page-header">

            <h2>
              Documents
            </h2>

            <div
              className="doc-actions-row"

              style={{
                maxWidth:
                  160
              }}
            >

              <button
                className="doc-action-btn primary"

                onClick={() =>
                  fileInputRef
                    .current
                    .click()
                }
              >
                Upload files
              </button>

              <input
                ref={
                  fileInputRef
                }

                type="file"

                accept=".pdf,.doc,.docx,.txt"

                multiple

                onChange={
                  handleFileChange
                }

                style={{
                  display:
                    'none'
                }}
              />

            </div>

          </div>

          <div className="docs-page-filter-row">

            <input
              className="doc-search"

              placeholder="Find documents..."

              value={
                docSearch
              }

              onChange={(e) =>
                setDocSearch(
                  e.target.value
                )
              }
            />

            <select
              className="doc-filter-select"

              value={
                docFilter
              }

              onChange={(e) =>
                setDocFilter(
                  e.target.value
                )
              }
            >

              <option value="all">
                All types
              </option>

              <option value="pdf">
                PDF
              </option>

              <option value="doc">
                DOC/DOCX
              </option>

              <option value="txt">
                TXT
              </option>

            </select>

          </div>

          {filteredFiles.length ===
            0
            ? (

              <div className="no-docs">
                No documents uploaded yet.
              </div>

            )
            : (

              <div className="table-container">

                <table className="docs-page-table">

                  <thead>

                    <tr>

                      <th>
                        Name
                      </th>

                      <th>
                        Size
                      </th>

                      <th>
                        Uploaded
                      </th>

                      <th>
                        MIME Type
                      </th>

                      {isAdmin && (

                        <th>
                          Owner
                        </th>

                      )}

                      {isAdmin && (

                        <th></th>

                      )}

                    </tr>

                  </thead>

                  <tbody>

                    {filteredFiles.map(
                      (
                        f,
                        i
                      ) => (

                        <tr
                          key={
                            i
                          }
                        >

                          <td>

                            {f.document_name}

                          </td>

                          <td>

                            {f.file_size

                              ? (
                                  f.file_size /
                                  1024
                                ).toFixed(
                                  1
                                ) +
                                ' KB'

                              : '—'}

                          </td>

                          <td>

                            {f.uploaded_at

                              ? new Date(
                                  f.uploaded_at
                                )
                                  .toLocaleDateString()

                              : '—'}

                          </td>

                          <td>

                            {getMimeType(
                              f.document_name
                            )}

                          </td>

                          {isAdmin && (

                            <td>

                              {f.owner_username ||
                                '—'}

                            </td>

                          )}

                          {isAdmin && (

                            <td>

                              <button
                                className="doc-row-delete"

                                title="Delete"

                                onClick={() =>
                                  handleDelete(
                                    f.document_name
                                  )
                                }
                              >
                                🗑
                              </button>

                            </td>

                          )}

                        </tr>

                      )
                    )}

                  </tbody>

                </table>

              </div>

            )}

          <div className="status-text">

            {status}

          </div>

        </div>

      )}

      {/* =====================================================
          WIDGET CONFIGURATION
      ===================================================== */}

      {activeView ===
        'widgetConfig' &&

        hasPermission(
          'widget_configuration'
        ) && (

        <WidgetConfiguration />

      )}

      {/* =====================================================
          WIDGET HISTORY
      ===================================================== */}

      {activeView ===
        'widgetHistory' &&

        hasPermission(
          'widget_history'
        ) && (

        <div className="docs-page">

          <div className="docs-page-header">

            <h2>
              Widget Sessions
            </h2>

          </div>

          <div className="widget-history-layout">

            <div className="widget-session-list">

              <h3>
                Sessions
              </h3>

              <input
                type="text"

                className="doc-search"

                placeholder="Search sessions..."

                value={
                  widgetSessionSearch
                }

                onChange={(e) =>
                  setWidgetSessionSearch(
                    e.target.value
                  )
                }
              />

              {filteredWidgetSessions
                .length ===
                0
                ? (

                  <div className="widget-no-sessions">

                    {widgetSessionSearch
                      ? 'No matching sessions found.'
                      : 'No widget sessions found.'}

                  </div>

                )
                : (

                  <div className="table-container">

                    <table className="docs-page-table widget-session-table">

                      <thead>

                        <tr>

                          <th>
                            #
                          </th>

                          <th>
                            Session ID
                          </th>

                        </tr>

                      </thead>

                      <tbody>

                        {filteredWidgetSessions.map(
                          (
                            session,
                            index
                          ) => (

                            <tr
                              key={
                                session
                                  .session_id
                              }

                              className={
                                selectedWidgetSession
                                  ?.session_id ===
                                session
                                  .session_id

                                  ? 'widget-session-row active'

                                  : 'widget-session-row'
                              }

                              onClick={() =>
                                fetchWidgetSession(
                                  session
                                    .session_id
                                )
                              }
                            >

                              <td>
                                {index + 1}
                              </td>

                              <td>

                                {
                                  session
                                    .session_id
                                }

                              </td>

                            </tr>

                          )
                        )}

                      </tbody>

                    </table>

                  </div>

                )}

            </div>

            <div className="widget-session-details">

              {widgetSessionLoading
                ? (

                  <div className="widget-session-loading">

                    Loading conversation...

                  </div>

                )

                : selectedWidgetSession
                  ? (

                    <>

                      <div className="chat-header">

                        Widget Conversation

                      </div>

                      <div className="chat-messages">

                        {selectedWidgetSession
                          .messages
                          ?.length >
                          0
                          ? (

                            selectedWidgetSession
                              .messages
                              .map(
                                (
                                  msg,
                                  index
                                ) => {

                                  const messageText =
                                    msg.text ||
                                    msg.message ||
                                    msg.content ||
                                    '';

                                  const messageRole =
                                    msg.sender ||
                                    msg.role ||
                                    'bot';

                                  const isBot =
                                    messageRole ===
                                      'bot' ||

                                    messageRole ===
                                      'assistant';

                                  return (

                                    <div
                                      key={
                                        index
                                      }

                                      className={`message ${
                                        isBot
                                          ? 'bot'
                                          : 'user'
                                      }`}
                                    >

                                      {isBot

                                        ? renderMessageText(
                                            messageText
                                          )

                                        : messageText}

                                    </div>

                                  );
                                }
                              )

                          )
                          : (

                            <div className="widget-no-messages">

                              No messages in this session.

                            </div>

                          )}

                      </div>

                    </>

                  )
                  : (

                    <div className="empty-state">

                      <h3>
                        Select a session
                      </h3>

                      <p>
                        Select a widget session from the left to view its conversation.
                      </p>

                    </div>

                  )}

            </div>

          </div>

        </div>

      )}

      {/* =====================================================
          USERS
      ===================================================== */}

      {activeView ===
        'users' &&

        hasPermission(
          'users'
        ) && (

        <div className="docs-page">

          {/* USERS HEADER */}

          <div className="docs-page-header">

            <h2>
              Users
            </h2>

         <button
  className="create-user-btn"
  onClick={() => {
    setPermissionUser(null);
    setSelectedUserPermissions([]);
    setShowCreateUser(true);
  }}
>
  + Create User
</button>

          </div>

          {/* =================================================
              CREATE USER FORM
          ================================================= */}

          {showCreateUser && (

            <form
              className="permission-panel"

              onSubmit={
                handleCreateUser
              }
            >

              <div className="permission-panel-header">

                <div>

                  <h3>
                    Create User
                  </h3>

                  <p>
                    Create an account and choose exactly which sections the user can access.
                  </p>

                </div>

                <button
                  type="button"

                  className="permission-close-btn"

                  disabled={
                    createUserLoading
                  }

                  onClick={
                    closeCreateUser
                  }
                >
                  ×
                </button>

              </div>

              {/* USERNAME / PASSWORD / ROLE */}

              <div className="docs-page-filter-row">

                <input
                  type="text"

                  className="doc-search"

                  placeholder="Email / Username"

                  value={
                    newUser.username
                  }

                  disabled={
                    createUserLoading
                  }

                  onChange={(e) =>
                    setNewUser(
                      (prev) => ({
                        ...prev,

                        username:
                          e.target.value
                      })
                    )
                  }
                />

                <input
                  type="password"

                  className="doc-search"

                  placeholder="Password"

                  value={
                    newUser.password
                  }

                  disabled={
                    createUserLoading
                  }

                  onChange={(e) =>
                    setNewUser(
                      (prev) => ({
                        ...prev,

                        password:
                          e.target.value
                      })
                    )
                  }
                />

                <select
                  className="user-role-select"

                  value={
                    newUser.role_id
                  }

                  disabled={
                    createUserLoading
                  }

                  onChange={(e) =>
                    setNewUser(
                      (prev) => ({
                        ...prev,

                        role_id:
                          e.target.value
                      })
                    )
                  }
                >

                  <option value="">
                    Select role
                  </option>

                  {roles.map(
                    (role) => (

                      <option
                        key={
                          role.id
                        }

                        value={
                          role.id
                        }
                      >
                        {role.name}
                      </option>

                    )
                  )}

                </select>

              </div>

              {/* CREATE USER PERMISSIONS */}

              <div
                className="section-label"

                style={{
                  marginTop:
                    18,

                  marginBottom:
                    10
                }}
              >
                Permissions
              </div>

              <div className="permission-list">

                {allPermissions.map(
                  (permission) => {

                    const isChecked =
                      newUser
                        .permission_ids
                        .includes(
                          permission.id
                        );

                    return (

                      <label
                        key={
                          permission.id
                        }

                        className="permission-item"
                      >

                        <input
                          type="checkbox"

                          checked={
                            isChecked
                          }

                          disabled={
                            createUserLoading
                          }

                          onChange={() => {

                            setNewUser(
                              (prev) => {

                                const alreadySelected =
                                  prev
                                    .permission_ids
                                    .includes(
                                      permission.id
                                    );

                                return {

                                  ...prev,

                                  permission_ids:
                                    alreadySelected

                                      ? prev
                                          .permission_ids
                                          .filter(
                                            (id) =>
                                              id !==
                                              permission.id
                                          )

                                      : [
                                          ...prev
                                            .permission_ids,

                                          permission.id
                                        ]
                                };
                              }
                            );

                          }}
                        />

                        <span>

                          {permission
                            .name
                            .replaceAll(
                              '_',
                              ' '
                            )}

                        </span>

                      </label>

                    );
                  }
                )}

              </div>

              {/* CREATE USER BUTTONS */}

              <div
                style={{
                  display:
                    'flex',

                  gap:
                    10
                }}
              >

                <button
                  type="button"

                  className="doc-action-btn"

                  disabled={
                    createUserLoading
                  }

                  onClick={
                    closeCreateUser
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"

                  className="permission-save-btn"

                  disabled={
                    createUserLoading
                  }
                >

                  {createUserLoading
                    ? 'Creating...'
                    : 'Create User'}

                </button>

              </div>

            </form>

          )}

          {/* =================================================
              USERS TABLE
          ================================================= */}

          <div className="table-container users-table-container">

            <table className="docs-page-table">

              <thead>

                <tr>

                  <th>
                    Status
                  </th>

                  <th>
                    Email
                  </th>

                  <th>
                    Role
                  </th>

                  <th>
                    Account
                  </th>

                  <th>
                    Last Login
                  </th>

                  <th>
                    Actions
                  </th>

                </tr>

              </thead>

              <tbody>

                {onlineUsers.map(
                  (user) => {

                    const isCurrentUser =
                      user.username ===
                      currentUser
                        ?.username;

                    return (

                      <tr
                        key={
                          user.id
                        }
                      >

                        <td>

                          {user.is_online
                            ? '🟢 Online'
                            : '🔴 Offline'}

                        </td>

                        <td>

                          {user.username}

                        </td>

                        {/* ROLE */}

                        <td className="user-role-cell">

                          <select
                            className="user-role-select"

                            value={
                              user.role_id ||
                              ''
                            }

                            disabled={
                              isCurrentUser
                            }

                            onChange={(e) =>
                              handleRoleChange(
                                user.id,

                                Number(
                                  e.target.value
                                )
                              )
                            }
                          >

                            {roles.map(
                              (role) => (

                                <option
                                  key={
                                    role.id
                                  }

                                  value={
                                    role.id
                                  }
                                >
                                  {role.name}
                                </option>

                              )
                            )}

                          </select>

                        </td>

                        {/* ACCOUNT */}

                        <td>

                          {user.is_blocked
                            ? 'Blocked'
                            : 'Active'}

                        </td>

                        {/* LAST LOGIN */}

                        <td>

                          {user.last_login

                            ? new Date(
                                user.last_login
                              )
                                .toLocaleString()

                            : '-'}

                        </td>

                        {/* ACTION MENU */}

                        <td className="user-actions-cell">

                          <div className="user-actions-wrapper">

                            <button
                              className="user-actions-btn"

                              disabled={
                                isCurrentUser
                              }

                              title="Actions"

                              onClick={() =>
                                setOpenActionMenu(

                                  openActionMenu ===
                                    user.id

                                    ? null

                                    : user.id
                                )
                              }
                            >
                              ⋮
                            </button>

                            {openActionMenu ===
                              user.id && (

                              <div className="user-actions-menu">

                                {/* BLOCK */}

                                <button
                                  onClick={async () => {

                                    await handleToggleBlock(
                                      user.id,
                                      user.is_blocked
                                    );

                                    setOpenActionMenu(
                                      null
                                    );
                                  }}
                                >

                                  {user.is_blocked
                                    ? 'Unblock'
                                    : 'Block'}

                                </button>

                                {/* RESET PASSWORD */}

                                <button
                                  onClick={() =>
                                    handleResetPassword(
                                      user.id
                                    )
                                  }
                                >
                                  Reset Password
                                </button>

                                {/* MANAGE PERMISSIONS */}

                                <button
                                  onClick={() =>
                                    openPermissionEditor(
                                      user
                                    )
                                  }
                                >
                                  Manage Permissions
                                </button>

                                {/* DELETE USER */}

                                <button
                                  className="danger"

                                  onClick={() =>
                                    handleDeleteUser(
                                      user.id
                                    )
                                  }
                                >
                                  Delete User
                                </button>

                              </div>

                            )}

                          </div>

                        </td>

                      </tr>

                    );
                  }
                )}

              </tbody>

            </table>

          </div>

          {/* =================================================
              MANAGE EXISTING USER PERMISSIONS
          ================================================= */}

          {permissionUser && (

            <div className="permission-panel">

              <div className="permission-panel-header">

                <div>

                  <h3>
                    Manage Permissions
                  </h3>

                  <p>
                    {permissionUser.username}
                  </p>

                </div>

                <button
                  className="permission-close-btn"

                  onClick={() => {

                    setPermissionUser(
                      null
                    );

                    setSelectedUserPermissions(
                      []
                    );
                  }}
                >
                  ×
                </button>

              </div>

              <div className="permission-list">

                {allPermissions.map(
                  (permission) => {

                    const isChecked =
                      selectedUserPermissions
                        .includes(
                          permission.name
                        );

                    return (

                      <label
                        key={
                          permission.id
                        }

                        className="permission-item"
                      >

                        <input
                          type="checkbox"

                          checked={
                            isChecked
                          }

                          onChange={() => {

                            if (
                              isChecked
                            ) {

                              setSelectedUserPermissions(

                                selectedUserPermissions
                                  .filter(
                                    (name) =>
                                      name !==
                                      permission.name
                                  )
                              );

                            } else {

                              setSelectedUserPermissions([
                                ...selectedUserPermissions,

                                permission.name
                              ]);
                            }

                          }}
                        />

                        <span>

                          {permission.name
                            .replaceAll(
                              '_',
                              ' '
                            )}

                        </span>

                      </label>

                    );
                  }
                )}

              </div>

              <button
                className="permission-save-btn"

                onClick={
                  handleSavePermissions
                }
              >
                Save Permissions
              </button>

            </div>

          )}

        </div>

      )}

      {/* =====================================================
          ACTIVITY LOGS
      ===================================================== */}

      {activeView ===
        'activity' &&

        hasPermission(
          'activity_logs'
        ) && (

        <div className="docs-page">

          <div className="docs-page-header">

            <h2>
              Activity Logs
            </h2>

          </div>

          <div className="table-container">

            <table className="docs-page-table">

              <thead>

                <tr>

                  <th>
                    User
                  </th>

                  <th>
                    Action
                  </th>

                  <th>
                    Details
                  </th>

                  <th>
                    Time
                  </th>

                </tr>

              </thead>

              <tbody>

                {activityLog.map(
                  (
                    entry,
                    i
                  ) => (

                    <tr
                      key={
                        i
                      }
                    >

                      <td>

                        {entry.username ||
                          '—'}

                      </td>

                      <td>

                        {entry.action}

                      </td>

                      <td>

                        {entry.details ||
                          '—'}

                      </td>

                      <td>

                        {entry.created_at

                          ? new Date(
                              entry.created_at
                            )
                              .toLocaleString()

                          : '—'}

                      </td>

                    </tr>

                  )
                )}

              </tbody>

            </table>

          </div>

        </div>

      )}

      {/* =====================================================
          FLOATING WIDGET
      ===================================================== */}

      <div
        style={{
          display:
            activeView ===
              'widgetConfig'

              ? 'none'

              : 'block'
        }}
      >

        <Widget />

      </div>

    </div>
  );
}

export default App;