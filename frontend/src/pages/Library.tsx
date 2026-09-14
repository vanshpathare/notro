import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorState from '../components/ErrorState';

interface Purchase {
    id: string;
    note?: {
        id: string;
        title: string;
        subject: string;
        page_count: number;
    };
}

export default function Library() {
    const [purchases, setPurchases] = useState<Purchase[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        fetchLibrary();
    }, []);

    const fetchLibrary = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await api.get('/payments/my-purchases');
            if (response.data && response.data.purchases) {
                setPurchases(response.data.purchases);
            }
        } catch (e: any) {
            setError(e.response?.data?.error || 'Failed to load library');
        }
        setIsLoading(false);
    };

    if (isLoading) return <LoadingSpinner message="Loading your notes..." />;
    if (error) return <ErrorState message={error} onRetry={fetchLibrary} />;

    return (
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: 24, color: '#111' }}>My Library</h1>

            {purchases.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', background: 'white', borderRadius: 16, border: '1px solid #eaeaea' }}>
                    <div style={{ fontSize: '3rem', marginBottom: 16 }}>📚</div>
                    <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 8, color: '#111' }}>No purchased notes yet</h2>
                    <p style={{ color: '#666', fontSize: '0.95rem', marginBottom: 24 }}>Notes you buy on the web or app will appear here for reference.</p>
                    <button
                        onClick={() => navigate('/')}
                        style={{ background: '#1A73E8', color: 'white', border: 'none', padding: '10px 24px', borderRadius: 10, fontWeight: 600, cursor: 'pointer' }}
                    >
                        Browse notes
                    </button>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {purchases.map((purchase) => {
                        const note = purchase.note;
                        return (
                            <div
                                key={purchase.id}
                                onClick={() => note && navigate(`/notes/${note.id}`)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    background: 'white',
                                    padding: '16px 20px',
                                    borderRadius: 14,
                                    border: '1px solid #eaeaea',
                                    cursor: 'pointer',
                                    boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                    <div style={{ fontSize: '1.8rem' }}>📄</div>
                                    <div>
                                        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 4px 0', color: '#111' }}>
                                            {note?.title || 'Unknown note'}
                                        </h3>
                                        <p style={{ fontSize: '0.85rem', color: '#666', margin: 0 }}>
                                            {note?.subject || ''} {note?.page_count ? `· ${note.page_count} pages` : ''}
                                        </p>
                                    </div>
                                </div>
                                <span style={{ color: '#1A73E8', fontSize: '1.2rem', fontWeight: 700 }}>›</span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}