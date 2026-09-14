import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorState from '../components/ErrorState';

export default function NoteDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [note, setNote] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    useEffect(() => {
        // Fetch current logged-in user info to check if they are the owner
        const fetchUserAndNote = async () => {
            setIsLoading(true);
            setError(null);
            try {
                // Fetch user profile session if available
                const userRes = await api.get('/users/me').catch(() => null);
                if (userRes && userRes.data) {
                    setCurrentUserId(userRes.data.user?.id || userRes.data.id);
                }

                const response = await api.get(`/notes/${id}`);
                if (response.data && response.data.note) {
                    setNote(response.data.note);
                } else {
                    setError('Note not found or has been removed.');
                }
            } catch (err: any) {
                console.error("PDF Preview Load Error:", err);
                setError(err.response?.data?.error || 'Failed to load note details.');
            }
            setIsLoading(false);
        };

        if (id) {
            fetchUserAndNote();
        }
    }, [id]);

    if (isLoading) return <LoadingSpinner message="Loading note..." />;
    if (error || !note) return <ErrorState message={error || 'Note not found'} onRetry={() => window.location.reload()} />;

    const hasPurchased = note.has_purchased === true;
    const isOwner = note.seller_id === currentUserId;

    return (
        <div style={{ maxWidth: 800, margin: '40px auto', padding: '0 16px', color: 'var(--text-primary)' }}>
            {/* Back Button */}
            <button
                onClick={() => navigate(-1)}
                style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 600, cursor: 'pointer', marginBottom: 20, fontSize: '0.95rem' }}
            >
                ← Back
            </button>

            {/* Main Content Card */}
            <div style={{ background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--border)', padding: 32, boxShadow: 'var(--shadow-sm)' }}>
                
                {/* Title */}
                <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: '0 0 12px 0' }}>{note.title}</h1>

                {/* Subject & Course Chips */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
                    {note.subject && (
                        <span style={{ background: 'var(--primary-light)', color: 'var(--primary)', padding: '6px 14px', borderRadius: 16, fontSize: '0.85rem', fontWeight: 600 }}>
                            {note.subject}
                        </span>
                    )}
                    {note.course && (
                        <span style={{ background: 'var(--surface-secondary, #F0F2F5)', color: 'var(--text-primary)', padding: '6px 14px', borderRadius: 16, fontSize: '0.85rem', fontWeight: 600 }}>
                            {note.course}
                        </span>
                    )}
                </div>

                {/* Seller Card Banner */}
                {note.seller && (
                    <div 
                        onClick={() => navigate(`/sellers/${note.seller.id}`)}
                        style={{ display: 'flex', alignItems: 'center', padding: 16, background: 'var(--surface-secondary, #F8F9FA)', borderRadius: 12, border: '1px solid var(--border)', cursor: 'pointer', marginBottom: 24 }}
                    >
                        <span style={{ fontSize: '1.75rem', marginRight: 12 }}>👤</span>
                        <div style={{ flex: 1 }}>
                            <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>{note.seller.name}</h4>
                            {note.seller.verification_status === 'approved' && note.seller.account_type !== 'student' && (
                                <span style={{ color: 'var(--primary)', fontSize: '0.8rem', fontWeight: 600 }}>✓ Verified seller</span>
                            )}
                        </div>
                        <span style={{ color: 'var(--primary)', fontWeight: 'bold', fontSize: '1.2rem' }}>›</span>
                    </div>
                )}

                {/* Rating & Sales Row */}
                {note.rating_count > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                        <span style={{ color: 'var(--star-gold, #FFC107)' }}>★</span>
                        <strong style={{ color: 'var(--text-primary)' }}>{note.average_rating}</strong>
                        <span>· {note.rating_count} ratings · {note.purchase_count} sold</span>
                    </div>
                )}

                {/* Description */}
                {note.description && (
                    <div style={{ marginBottom: 20 }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 6 }}>About</h3>
                        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>{note.description}</p>
                    </div>
                )}

                {/* Contents */}
                {note.index_contents && (
                    <div style={{ marginBottom: 20 }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 6 }}>Contents</h3>
                        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>{note.index_contents}</p>
                    </div>
                )}

                {/* Tags */}
                {note.tags && note.tags.length > 0 && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
                        {note.tags.map((tag: string, idx: number) => (
                            <span key={idx} style={{ background: 'var(--surface-secondary, #F0F2F5)', color: 'var(--text-secondary)', padding: '4px 10px', borderRadius: 8, fontSize: '0.8rem' }}>
                                #{tag}
                            </span>
                        ))}
                    </div>
                )}

                {/* Page Count */}
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 24 }}>
                    {note.page_count} pages {note.preview_pages?.length ? `· ${note.preview_pages.length} preview pages` : '· No preview'}
                </p>

                <hr style={{ border: 'none', borderTop: '1px solid var(--border)', marginBottom: 24 }} />

                {/* Dynamic Action Buttons */}
               {/* Dynamic Action Buttons */}
<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
    {isOwner ? (
        <>
            <button
                onClick={() => navigate(`/notes/${id}/edit`)}
                className="btn-outline"
                style={{ width: '100%' }}
            >
                ✏️ Edit Note
            </button>
            <button
                onClick={() => navigate(`/notes/${id}/analytics`)}
                className="btn-outline"
                style={{ width: '100%' }}
            >
                📊 View Analytics
            </button>
        </>
    ) : hasPurchased ? (
        <>
            {/* FIXED: purchased notes are NOT viewable on website — redirect to app */}
            <div style={{
                background: '#E8F5E9', borderRadius: 12, padding: 20, textAlign: 'center'
            }}>
                <p style={{ fontSize: '1.5rem' }}>✅</p>
                <p style={{ fontWeight: 700, color: '#2E7D32', marginTop: 8 }}>
                    View your note in the app
                </p>
                <p style={{ color: '#555', fontSize: '0.85rem', marginTop: 4 }}>
                    For your protection, purchased notes can only be opened
                    inside the EduCrit app.
                </p>
            </div>
            <a href="#" style={{
                display: 'block', background: 'var(--primary)', color: 'white',
                padding: 14, borderRadius: 12, fontWeight: 700,
                textAlign: 'center', textDecoration: 'none'
            }}>
                📱 Open in EduCrit App
            </a>
             
            
        </>
    ) : (
        <>
            {note.preview_pages?.length > 0 && note.preview_r2_key && (
                <button
                    onClick={() => navigate(`/notes/${id}/preview`)}
                    className="btn-outline"
                    style={{ width: '100%' }}
                >
                    👁 Preview ({note.preview_pages.length} free pages)
                </button>
            )}
            <div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)', marginBottom: 12 }}>
                    ₹{Math.round(note.price)}
                </div>
                <button
    onClick={() => navigate(`/notes/${id}/payment`)}
    className="btn-primary"
    style={{ width: '100%' }}
>
    Buy Now — ₹{Math.round(note.price)}
</button>
            </div>
        </>
    )}
</div>

            </div>
        </div>
    );
}