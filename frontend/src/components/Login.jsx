import React, { useState } from 'react';

export default function Login({ onLoginSuccess }) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const endpoint = isRegistering ? '/api/auth/register' : '/api/auth/login';
    const payload = isRegistering 
      ? { username, email, password }
      : { email, password };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Something went wrong');
      }

      onLoginSuccess(data.user, data.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">MANIT Focus</div>
          <div className="auth-subtitle">
            {isRegistering 
              ? 'Create your account to start tracking study hours' 
              : 'Sign in to access your study study statistics'}
          </div>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {error && <div className="auth-error">{error}</div>}

          {isRegistering && (
            <div className="field">
              <label style={{ color: 'var(--indigo)' }}>Username</label>
              <input
                type="text"
                placeholder="Enter your name"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                style={{ padding: '4px 0', fontSize: '14px' }}
              />
            </div>
          )}

          <div className="field">
            <label style={{ color: 'var(--indigo)' }}>Email Address</label>
            <input
              type="email"
              placeholder="name@nitbhopal.ac.in"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ padding: '4px 0', fontSize: '14px' }}
            />
          </div>

          <div className="field">
            <label style={{ color: 'var(--indigo)' }}>Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ padding: '4px 0', fontSize: '14px' }}
            />
          </div>

          <button className="auth-btn" type="submit" disabled={loading}>
            {loading ? 'Processing...' : (isRegistering ? 'Register Account' : 'Sign In')}
          </button>
        </form>

        <div className="auth-footer">
          {isRegistering ? (
            <>
              Already have an account?{' '}
              <a 
                href="#login" 
                className="auth-link" 
                onClick={(e) => {
                  e.preventDefault();
                  setIsRegistering(false);
                  setError('');
                }}
              >
                Sign In
              </a>
            </>
          ) : (
            <>
              New to MANIT Focus?{' '}
              <a 
                href="#register" 
                className="auth-link" 
                onClick={(e) => {
                  e.preventDefault();
                  setIsRegistering(true);
                  setError('');
                }}
              >
                Register Now
              </a>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
