import React, { useState } from 'react';
import api from '../api/client';

interface GateProps {
  onSuccess: () => void;
}

export default function AdminSecurityGate({ onSuccess }: GateProps) {
  const [pass1, setPass1] = useState('');
  const [pass2, setPass2] = useState('');
  const [showPass1, setShowPass1] = useState(false);
  const [showPass2, setShowPass2] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pass1.length < 16 || pass2.length < 16) {
      setError('Both passphrases must be at least 16 characters long.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const storedToken = localStorage.getItem('educrit_token');
      const headers: Record<string, string> = {};
      if (storedToken) {
        headers['Authorization'] = `Bearer ${storedToken}`;
      }

      await api.post('/admin/verify-gate', { pass1, pass2 }, { headers });
      onSuccess();
    } catch (err: any) {
      const message = err.response?.data?.error || 'Verification failed. Invalid credentials or rate limit reached.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const eyeButtonStyle: React.CSSProperties = {
    position: 'absolute',
    right: 12,
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '1rem',
    padding: 4,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#6b7280',
    userSelect: 'none',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 42px 10px 14px',
    borderRadius: 8,
    border: '1px solid var(--border, #d1d5db)',
    fontSize: '0.95rem',
    letterSpacing: '0.05em',
    outline: 'none',
    boxSizing: 'border-box',
  };

  return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <form
        onSubmit={handleSubmit}
        style={{
          background: 'var(--surface, #ffffff)',
          border: '1px solid var(--border, #e5e7eb)',
          borderRadius: 16,
          padding: '32px 24px',
          width: '100%',
          maxWidth: 420,
          boxShadow: 'var(--shadow-sm, 0 4px 6px rgba(0,0,0,0.05))',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: '2rem', marginBottom: 8 }}>🔒</div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            Elevated Clearance
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 4 }}>
            Enter your secondary access passphrases to proceed.
          </p>
        </div>

        {error && (
          <div style={{ background: '#FEE2E2', color: '#DC2626', padding: '10px 14px', borderRadius: 8, fontSize: '0.85rem', marginBottom: 16, fontWeight: 500 }}>
            {error}
          </div>
        )}

        {/* Passphrase 1 */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>
            SECURITY KEYPHRASE 1
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type={showPass1 ? 'text' : 'password'}
              value={pass1}
              onChange={(e) => setPass1(e.target.value)}
              placeholder="••••••••••••••••"
              required
              autoComplete="off"
              style={inputStyle}
            />
            <button
              type="button"
              onClick={() => setShowPass1((prev) => !prev)}
              style={eyeButtonStyle}
              tabIndex={-1}
              aria-label={showPass1 ? 'Hide passphrase 1' : 'Show passphrase 1'}
            >
              {showPass1 ? '🙈' : '👁️'}
            </button>
          </div>
        </div>

        {/* Passphrase 2 */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>
            SECURITY KEYPHRASE 2
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type={showPass2 ? 'text' : 'password'}
              value={pass2}
              onChange={(e) => setPass2(e.target.value)}
              placeholder="••••••••••••••••"
              required
              autoComplete="off"
              style={inputStyle}
            />
            <button
              type="button"
              onClick={() => setShowPass2((prev) => !prev)}
              style={eyeButtonStyle}
              tabIndex={-1}
              aria-label={showPass2 ? 'Hide passphrase 2' : 'Show passphrase 2'}
            >
              {showPass2 ? '🙈' : '👁️'}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          style={{
            width: '100%',
            padding: '12px',
            background: 'var(--primary, #2563eb)',
            color: '#fff',
            border: 'none',
            borderRadius: 10,
            fontWeight: 700,
            fontSize: '0.95rem',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          {isLoading ? 'Verifying...' : 'Authenticate'}
        </button>
      </form>
    </div>
  );
}