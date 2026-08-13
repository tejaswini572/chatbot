import React, { useState } from 'react';

function Login({ onLogin, sessionExpired }) {
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");

  const isValidEmail = (value) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!isValidEmail(username)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);

    const endpoint = mode === 'login' ? '/login' : '/signup';

    try {
      const response = await fetch(`http://localhost:8000${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();

      if (data.error) {
        setError(data.error);
        setLoading(false);
        return;
      }
       if (mode === "signup") {
    setSuccess("Account created successfully. Please log in.");

setUsername("");
setPassword("");
setLoading(false);
return;
    
  }


      onLogin({
        token: data.access_token,
        username: data.username,
        role: data.role,
      });
    } catch (err) {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <h2>{mode === 'login' ? 'Log in' : 'Sign up'}</h2>
        {sessionExpired && (
          <div className="login-error">Your session expired. Please log in again.</div>
        )}

        <input
          className="login-input"
          type="email"
          placeholder="Email"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <input
          className="login-input"
          type="password"
          placeholder="Password (min 6 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
        />
      {success && (
  <div className="login-success">
    {success}
  </div>
)}
        {error && <div className="login-error">{error}</div>}

        <button className="login-submit-btn" type="submit" disabled={loading}>
          {loading ? 'Please wait...' : mode === 'login' ? 'Log in' : 'Sign up'}
        </button>

        <div className="login-toggle">
          {mode === 'login' ? (
            <span>Don't have an account?{' '}
              <button type="button" onClick={() => setMode('signup')}>Sign up</button>
            </span>
          ) : (
            <span>Already have an account?{' '}
              <button type="button" onClick={() => setMode('login')}>Log in</button>
            </span>
          )}
        </div>
      </form>
    </div>
  );
}

export default Login;