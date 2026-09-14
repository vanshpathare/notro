import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorState from '../components/ErrorState';
import NoteCard from '../components/NoteCard';

interface Note {
    id: string;
    title: string;
    subject: string;
    course?: string;
    price: number;
    page_count: number;
    cover_image_key?: string | null;
    seller?: {
        name: string;
    };
}

export default function Notes() {
    const [notes, setNotes] = useState<Note[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        fetchNotes();
    }, [searchQuery]);

    const fetchNotes = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await api.get('/notes', {
                params: {
                    search: searchQuery.length >= 2 ? searchQuery : undefined,
                    limit: 50
                }
            });
            if (response.data && response.data.notes) {
                setNotes(response.data.notes);
            }
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to load notes catalog.');
        }
        setIsLoading(false);
    };

    return (
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#111', margin: 0 }}>All Notes Catalog</h1>
                <input
                    type="text"
                    placeholder="Search catalog..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ padding: '10px 16px', borderRadius: 10, border: '1px solid #ddd', width: 280, fontSize: '0.95rem' }}
                />
            </div>

            {isLoading ? (
                <LoadingSpinner message="Loading notes..." />
            ) : error ? (
                <ErrorState message={error} onRetry={fetchNotes} />
            ) : notes.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 0', color: '#666' }}>No notes found in the catalog.</div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
                    {notes.map((note) => (
                        <NoteCard key={note.id} note={note as any} />
                    ))}
                </div>
            )}
        </div>
    );
}