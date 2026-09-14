import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorState from '../components/ErrorState';

interface UserProfile {
    name?: string;
    phone?: string;
    email?: string;
    account_type?: string;
    is_seller?: boolean;
    avatar_url?: string | null;
    extra_details?: {
        college?: string;
        [key: string]: any;
    };
    mute_sale_notifications?: boolean;
}

export default function Profile() {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [followerCount, setFollowerCount] = useState<number>(0);
    const navigate = useNavigate();

    useEffect(() => {
        fetchProfileAndFollowers();
    }, []);

    const fetchProfileAndFollowers = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const profileResponse = await api.get('/users/me');
            const userData = profileResponse.data?.user || profileResponse.data;
            setProfile(userData);

            // Fetch followers count only if is_seller is true
            if (userData?.is_seller) {
                try {
                    const followersResponse = await api.get('/users/followers/count');
                    if (followersResponse.data && typeof followersResponse.data.count === 'number') {
                        setFollowerCount(followersResponse.data.count);
                    }
                } catch {
                    // Ignore if endpoint fails
                }
            }
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to load profile.');
        } finally {
            setIsLoading(false);
        }
    };

    const getAvatarSrc = (url?: string | null) => {
        if (!url) return null;
        if (url.startsWith('http')) {
            const separator = url.includes('?') ? '&' : '?';
            return `${url}${separator}t=${Date.now()}`;
        }
        return url;
    };

    const getAccountTypeLabel = (type?: string) => {
        switch (type) {
            case 'business': return 'Business Account';
            case 'youtube': return 'Creator Account';
            default: return 'Student Account';
        }
    };

    if (isLoading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                <LoadingSpinner message="Loading profile..." />
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ maxWidth: 600, margin: '40px auto', padding: '0 16px' }}>
                <ErrorState message={error} onRetry={fetchProfileAndFollowers} />
            </div>
        );
    }

    const currentCollege = profile?.extra_details?.college || 'Not set';
    const isSeller = Boolean(profile?.is_seller);

    return (
        <div style={{ maxWidth: 600, margin: '0 auto', padding: '40px 16px' }}>
            <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '40px 24px' }}>
                
                {/* Avatar Section */}
                <div style={{ position: 'relative', width: 90, height: 90, marginBottom: 12 }}>
                    <div style={{
                        width: 90,
                        height: 90,
                        borderRadius: '50%',
                        background: 'var(--primary-light)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        border: '2px solid var(--border)'
                    }}>
                        {profile?.avatar_url ? (
                            <img
                                src={getAvatarSrc(profile.avatar_url) || ''}
                                alt="Profile"
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                        ) : (
                            <span style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--primary)' }}>
                                {(profile?.name?.charAt(0) || '?').toUpperCase()}
                            </span>
                        )}
                    </div>
                </div>

                {/* Name & Account Type */}
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                    {profile?.name || 'User'}
                </h1>
                <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginBottom: 32 }}>
                    {getAccountTypeLabel(profile?.account_type)}
                </p>

                {/* Info Cards Stack */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', textAlign: 'left' }}>
                    
                    <div className="card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', boxShadow: 'none', border: '1.5px solid var(--border)' }}>
                        <span style={{ width: 80, fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Phone :</span>
                        <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>{profile?.phone || 'Not set'}</span>
                    </div>

                    <div className="card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', boxShadow: 'none', border: '1.5px solid var(--border)' }}>
                        <span style={{ width: 80, fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Email :</span>
                        <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>{profile?.email || 'Not set'}</span>
                    </div>

                    <div className="card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', boxShadow: 'none', border: '1.5px solid var(--border)' }}>
                        <span style={{ width: 80, fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Institute :</span>
                        <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>{currentCollege}</span>
                    </div>

                    {/* Dynamically shown based on backend is_seller flag */}
                    {isSeller && (
                        <>
                            <div className="card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', boxShadow: 'none', border: '1.5px solid var(--border)' }}>
                                <span style={{ width: 80, fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Followers :</span>
                                <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>{followerCount}</span>
                            </div>

                            <div className="card" style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: 'none', border: '1.5px solid var(--border)' }}>
                                <div>
                                    <div style={{ fontSize: '0.95rem', fontWeight: 500, color: 'var(--text-primary)' }}>Sale notifications</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                        {profile?.mute_sale_notifications ? 'Muted' : 'Active'}
                                    </div>
                                </div>
                                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: profile?.mute_sale_notifications ? 'var(--text-hint)' : 'var(--success)' }}>
                                    {profile?.mute_sale_notifications ? 'Off' : 'On'}
                                </span>
                            </div>

                            <button
                                onClick={() => navigate('/library')}
                                className="btn-outline"
                                style={{ width: '100%', marginTop: '8px', textAlign: 'center' }}
                            >
                                My Listings
                            </button>
                        </>
                    )}
                </div>

            </div>
        </div>
    );
}