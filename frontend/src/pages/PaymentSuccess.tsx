import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function PaymentSuccess() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const noteId = searchParams.get('noteId');

    useEffect(() => {
        // Automatically redirect to note detail or library after a brief moment
        const timer = setTimeout(() => {
            if (noteId) {
                navigate(`/notes/${noteId}`);
            } else {
                navigate('/library');
            }
        }, 3000);
        return () => clearTimeout(timer);
    }, [noteId, navigate]);

    return (
        <div style={{ textAlign: 'center', padding: '100px 20px', maxWidth: 500, margin: '0 auto' }}>
            <div style={{ fontSize: '4rem', marginBottom: 16 }}>🎉</div>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#111', marginBottom: 8 }}>Payment Successful!</h1>
            <p style={{ color: '#666', fontSize: '1rem', marginBottom: 32 }}>
                Your payment was processed successfully. The note has been unlocked and added to your library!
            </p>
            <button
                onClick={() => navigate(noteId ? `/notes/${noteId}` : '/library')}
                style={{
                    background: '#34A853',
                    color: 'white',
                    border: 'none',
                    padding: '12px 28px',
                    borderRadius: 10,
                    fontWeight: 600,
                    fontSize: '1rem',
                    cursor: 'pointer'
                }}
            >
                Open Note Now
            </button>
        </div>
    );
}