import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function NotFound() {
    const navigate = useNavigate();

    return (
        <div style={{ textAlign: 'center', padding: '100px 20px', maxWidth: 500, margin: '0 auto' }}>
            <div style={{ fontSize: '4rem', marginBottom: 16 }}>🔍</div>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#111', marginBottom: 8 }}>Page Not Found</h1>
            <p style={{ color: '#666', fontSize: '1rem', marginBottom: 32 }}>
                The page you are looking for doesn't exist or has been moved.
            </p>
            <button
                onClick={() => navigate('/')}
                style={{
                    background: '#1A73E8',
                    color: 'white',
                    border: 'none',
                    padding: '12px 28px',
                    borderRadius: 10,
                    fontWeight: 600,
                    fontSize: '1rem',
                    cursor: 'pointer'
                }}
            >
                Back to Home
            </button>
        </div>
    );
}