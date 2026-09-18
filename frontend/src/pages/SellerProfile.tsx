import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/client';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorState from '../components/ErrorState';
import NoteCard from '../components/NoteCard';

interface SellerStats {
    total_notes: number;
    total_sold: number;
    average_rating: number;
    follower_count: number;
}

interface SellerProfileData {
    id: string;
    name: string;
    avatar_url?: string;
    account_type?: string;
    is_verified?: boolean;
    is_following: boolean;
    stats: SellerStats;
    notes: any[];
}

export default function SellerProfile() {
    const { id } = useParams<{ id: string }>();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [seller, setSeller] = useState<SellerProfileData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isFollowing, setIsFollowing] = useState(false);
    const [isFollowLoading, setIsFollowLoading] = useState(false);

    const isOwnProfile = Boolean(user && (user.id === id || user.id === seller?.id));

    useEffect(() => {
        if (id) {
            fetchSellerProfile(id);
        }
    }, [id]);

    const fetchSellerProfile = async (sellerId: string) => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await api.get(`/sellers/${sellerId}/profile`);
            if (response.data && response.data.seller) {
                const sellerData = response.data.seller;
                setSeller(sellerData);
                setIsFollowing(sellerData.is_following || false);
            }
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to load seller profile.');
        }
        setIsLoading(false);
    };

    const handleFollowToggle = async () => {
        if (!id || isFollowLoading || isOwnProfile) return;
        setIsFollowLoading(true);
        try {
            if (isFollowing) {
                await api.delete(`/sellers/${id}/follow`);
            } else {
                await api.post(`/sellers/${id}/follow`);
            }
            setIsFollowing(!isFollowing);
            // Update follower count locally for smooth UI feedback
            setSeller(prev => prev ? {
                ...prev,
                stats: {
                    ...prev.stats,
                    follower_count: prev.stats.follower_count + (isFollowing ? -1 : 1)
                }
            } : null);
        } catch (e) {
            console.error('Failed to update follow state', e);
        }
        setIsFollowLoading(false);
    };

    if (isLoading) return <LoadingSpinner message="Loading seller profile..." />;
    if (error || !seller) return <ErrorState message={error || 'Seller not found'} onRetry={() => id && fetchSellerProfile(id)} />;

    return (
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px' }}>
            {/* Top Bar / Back Button & Subscribe Button */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <button
                    onClick={() => navigate(-1)}
                    style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 600, cursor: 'pointer', fontSize: '0.95rem' }}
                >
                    ← Back
                </button>

                {!isOwnProfile && (
                    <button
                        onClick={handleFollowToggle}
                        disabled={isFollowLoading}
                        style={{
                            background: isFollowing ? 'var(--surface-secondary, #F0F2F5)' : 'var(--primary)',
                            color: isFollowing ? 'var(--text-primary)' : 'white',
                            border: 'none',
                            padding: '8px 20px',
                            borderRadius: 20,
                            fontWeight: 600,
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            boxShadow: 'var(--shadow-sm)'
                        }}
                    >
                        {isFollowing ? 'Subscribed ✓' : 'Subscribe'}
                    </button>
                )}
            </div>

            {/* Seller Header Info Card */}
            <div style={{ background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--border)', padding: '32px 24px', marginBottom: 32, textAlign: 'center', boxShadow: 'var(--shadow-sm)' }}>
                {/* Avatar */}
                <div style={{ width: 72, height: 72, borderRadius: '50%', overflow: 'hidden', margin: '0 auto 16px auto', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {seller.avatar_url ? (
                        <img
                            src={seller.avatar_url.startsWith('http') ? seller.avatar_url : seller.avatar_url}
                            alt={seller.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                    ) : (
                        <span style={{ color: 'var(--primary)', fontSize: '1.75rem', fontWeight: 800 }}>
                            {seller.name.charAt(0).toUpperCase()}
                        </span>
                    )}
                </div>

                <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 4px 0' }}>
                    {seller.name}
                </h1>

                {seller.is_verified && (
                    <p style={{ color: 'var(--primary)', fontSize: '0.85rem', fontWeight: 600, margin: '0 0 20px 0' }}>
                        ✓ Verified Seller
                    </p>
                )}

                {/* Stats Row */}
                <div style={{ display: 'flex', justifyContent: 'space-around', maxWidth: 500, margin: '24px auto 0 auto', borderTop: '1px solid var(--border)', paddingTop: 20 }}>
                    <div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>{seller.stats?.total_notes || 0}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Notes</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>{seller.stats?.total_sold || 0}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Sold</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>{seller.stats?.average_rating || 0}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Rating</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>{seller.stats?.follower_count || 0}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Subscribers</div>
                    </div>
                </div>
            </div>

            {/* Published Notes Section */}
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 16 }}>
                Notes by {seller.name}
            </h2>

            {seller.notes?.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                    This seller has no published notes yet.
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
                    {seller.notes?.map((note: any) => (
                        <NoteCard key={note.id} note={note} />
                    ))}
                </div>
            )}
        </div>
    );
}