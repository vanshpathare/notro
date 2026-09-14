import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { getMyProfile, getImageUrl, updateMyProfile, UserProfile } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import LoadingSpinner from '../components/LoadingSpinner';

export default function Profile() {
    const { user, logout } = useAuth();
    const { isDarkMode, toggleDarkMode } = useTheme();
    const navigate = useNavigate();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [showAvatarOptions, setShowAvatarOptions] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [showCollegeDialog, setShowCollegeDialog] = useState(false);
    const [collegeInput, setCollegeInput] = useState('');
    const [savingCollege, setSavingCollege] = useState(false);

    const [muteSaleNotifications, setMuteSaleNotifications] = useState(false);
    const [muteLoading, setMuteLoading] = useState(false);

    const [showLogoutDialog, setShowLogoutDialog] = useState(false);

    useEffect(() => {
        getMyProfile()
            .then(r => {
                setProfile(r.data.user);
                setMuteSaleNotifications(r.data.user.mute_sale_notifications ?? false);
                const key = r.data.user.avatar_url;
                if (key) {
                    if (key.startsWith('http')) setAvatarUrl(key);
                    else getImageUrl(key).then(r2 => setAvatarUrl(r2.data.url)).catch(() => {});
                }
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    const handleAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingAvatar(true);
        try {
            const urlRes = await api.post('/upload/avatar-url', { extension: 'jpg' });
            const { uploadUrl, r2_key } = urlRes.data;
            if (!uploadUrl || !r2_key) throw new Error('upload url failed');

            await fetch(uploadUrl, {
                method: 'PUT',
                headers: { 'Content-Type': 'image/jpeg' },
                body: file
            });

            const confirmRes = await api.post('/upload/avatar-confirm', { r2_key });
            if (confirmRes.data.avatar_url) {
                setAvatarUrl(confirmRes.data.avatar_url);
                setProfile(prev => prev ? { ...prev, avatar_url: confirmRes.data.avatar_url } : prev);
            }
        } catch (_) {}
        setUploadingAvatar(false);
        setShowAvatarOptions(false);
    };

    const handleRemoveAvatar = async () => {
        setUploadingAvatar(true);
        try {
            await api.delete('/users/avatar');
            setAvatarUrl(null);
            setProfile(prev => prev ? { ...prev, avatar_url: undefined } : prev);
        } catch (_) {}
        setUploadingAvatar(false);
        setShowAvatarOptions(false);
    };

    const handleSaveCollege = async () => {
        setSavingCollege(true);
        try {
            const res = await updateMyProfile({ extra_details: { college: collegeInput.trim() } } as Partial<UserProfile>);
            if (res.data.user) setProfile(res.data.user);
            setShowCollegeDialog(false);
        } catch (_) {}
        setSavingCollege(false);
    };

    const handleToggleMute = async () => {
        const newValue = !muteSaleNotifications;
        setMuteLoading(true);
        try {
            await updateMyProfile({ mute_sale_notifications: newValue });
            setMuteSaleNotifications(newValue);
        } catch (_) {}
        setMuteLoading(false);
    };

    const handleLogout = async () => {
        await logout();
        navigate('/');
    };

    if (loading) return <LoadingSpinner message="Loading profile..." />;

    const currentCollege = (profile?.extra_details?.college as string) || '';
    const isSeller = profile?.is_seller ?? false;

    return (
        <div style={{ maxWidth: 600, margin: '32px auto', padding: '0 24px 60px' }}>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: 24, textAlign: 'center', color: 'var(--text-primary)' }}>
                My Profile
            </h1>

            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleAvatarSelect}
            />

            {/* Avatar */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
                <div
                    onClick={() => !uploadingAvatar && setShowAvatarOptions(true)}
                    style={{
                        width: 90, height: 90, borderRadius: '50%',
                        background: 'var(--primary-light, #E8F0FE)', display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', position: 'relative', overflow: 'hidden'
                    }}
                >
                    {uploadingAvatar ? (
                        <div className="spinner-sm" />
                    ) : avatarUrl ? (
                        <img src={avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                        <span style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--primary, #1A73E8)' }}>
                            {profile?.name?.charAt(0).toUpperCase() || '?'}
                        </span>
                    )}
                    <div style={{
                        position: 'absolute', bottom: 0, right: 0,
                        width: 28, height: 28, borderRadius: '50%',
                        background: 'var(--primary, #1A73E8)', display: 'flex',
                        alignItems: 'center', justifyContent: 'center'
                    }}>
                        📷
                    </div>
                </div>
            </div>
            <p style={{ textAlign: 'center', color: 'var(--text-secondary, #666)', fontSize: '0.85rem', marginBottom: 24 }}>
                {uploadingAvatar ? 'Uploading...' : 'Tap to change photo'}
            </p>

            <h2 style={{ textAlign: 'center', fontWeight: 700, marginBottom: 4, color: 'var(--text-primary)' }}>{profile?.name}</h2>
            <p style={{ textAlign: 'center', color: 'var(--text-secondary, #666)', marginBottom: 32, fontSize: '0.9rem' }}>
                {profile?.account_type === 'business' ? 'Business Account'
                    : profile?.account_type === 'youtube' ? 'Creator Account'
                    : 'Student Account'}
            </p>

            {/* Info cards */}
            <InfoRow label="Phone" value={`+91 ${profile?.phone}`} />
            <InfoRow label="Email" value={profile?.email || 'Not set'} />
            <div onClick={() => { setCollegeInput(currentCollege); setShowCollegeDialog(true); }} style={{ cursor: 'pointer' }}>
                <InfoRow label="Institute" value={currentCollege || 'Tap to add institute'} />
            </div>

            {isSeller && (
                <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: 'var(--surface, #fff)', border: '1px solid var(--border, #eaeaea)',
                    borderRadius: 16, padding: 16, marginTop: 12, marginBottom: 12
                }}>
                    <div>
                        <p style={{ fontWeight: 500, color: 'var(--text-primary)' }}>Sale notifications</p>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary, #666)' }}>
                            {muteSaleNotifications ? 'Muted' : 'Active'}
                        </p>
                    </div>
                    <ToggleSwitch checked={!muteSaleNotifications} onChange={handleToggleMute} disabled={muteLoading} />
                </div>
            )}

            {isSeller && (
                <button
                    onClick={() => navigate('/admin')}
                    style={{
                        width: '100%', marginTop: 8, padding: 14,
                        border: '1px solid var(--primary, #1A73E8)', color: 'var(--primary, #1A73E8)',
                        borderRadius: 12, fontWeight: 600, fontSize: '1rem',
                        background: 'var(--surface, #fff)', cursor: 'pointer'
                    }}
                >
                    My Listings
                </button>
            )}

            <div style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid var(--border, #eaeaea)' }}>
                <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: 'var(--surface, #fff)', border: '1px solid var(--border, #eaeaea)',
                    borderRadius: 16, padding: 16
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span>{isDarkMode ? '🌙' : '☀️'}</span>
                        <div>
                            <p style={{ fontWeight: 500, color: 'var(--text-primary)' }}>Dark Mode</p>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary, #666)' }}>
                                {isDarkMode ? 'Currently dark' : 'Currently light'}
                            </p>
                        </div>
                    </div>
                    <ToggleSwitch checked={isDarkMode} onChange={toggleDarkMode} />
                </div>
            </div>

            <button
                onClick={() => setShowLogoutDialog(true)}
                style={{
                    width: '100%', marginTop: 24, padding: 14,
                    border: '2px solid var(--error, #C5221F)', color: 'var(--error, #C5221F)',
                    borderRadius: 12, fontWeight: 600, fontSize: '1rem',
                    background: 'var(--surface, #fff)', cursor: 'pointer'
                }}
            >
                Log out
            </button>

            {/* Avatar options modal */}
            {showAvatarOptions && (
                <Modal onClose={() => setShowAvatarOptions(false)}>
                    <h3 style={{ fontWeight: 700, marginBottom: 16, textAlign: 'center', color: 'var(--text-primary)' }}>Profile Picture</h3>
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                            width: '100%', marginBottom: 8, padding: 12,
                            border: '1px solid var(--border, #ccc)', borderRadius: 10,
                            background: 'var(--surface, #fff)', fontWeight: 600, cursor: 'pointer'
                        }}
                    >
                        📷 Change Profile Picture
                    </button>
                    {avatarUrl && (
                        <button
                            onClick={handleRemoveAvatar}
                            style={{
                                width: '100%', padding: 12, border: '2px solid var(--error, #C5221F)',
                                color: 'var(--error, #C5221F)', borderRadius: 10, fontWeight: 600,
                                background: 'var(--surface, #fff)', cursor: 'pointer'
                            }}
                        >
                            🗑 Remove Profile Picture
                        </button>
                    )}
                </Modal>
            )}

            {/* College dialog */}
            {showCollegeDialog && (
                <Modal onClose={() => setShowCollegeDialog(false)}>
                    <h3 style={{ fontWeight: 700, marginBottom: 16, color: 'var(--text-primary)' }}>Update Institute</h3>
                    <input
                        placeholder="Institute Name"
                        value={collegeInput}
                        onChange={e => setCollegeInput(e.target.value)}
                        style={{
                            width: '100%', padding: '10px 14px', borderRadius: 8,
                            border: '1px solid var(--border, #ccc)', fontSize: '0.95rem',
                            marginBottom: 16, outline: 'none', boxSizing: 'border-box'
                        }}
                    />
                    <div style={{ display: 'flex', gap: 12 }}>
                        <button
                            onClick={handleSaveCollege}
                            disabled={savingCollege}
                            style={{
                                flex: 1, background: 'var(--primary, #1A73E8)', color: 'white',
                                padding: 10, borderRadius: 8, fontWeight: 600, border: 'none', cursor: 'pointer'
                            }}
                        >
                            {savingCollege ? 'Saving...' : 'Save'}
                        </button>
                        <button
                            onClick={() => setShowCollegeDialog(false)}
                            style={{
                                flex: 1, background: 'none', border: '1px solid var(--border, #ccc)',
                                padding: 10, borderRadius: 8, fontWeight: 600, cursor: 'pointer'
                            }}
                        >
                            Cancel
                        </button>
                    </div>
                </Modal>
            )}

            {/* Logout dialog */}
            {showLogoutDialog && (
                <Modal onClose={() => setShowLogoutDialog(false)}>
                    <h3 style={{ fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>Log out</h3>
                    <p style={{ color: 'var(--text-secondary, #666)', marginBottom: 20 }}>
                        Are you sure you want to log out?
                    </p>
                    <div style={{ display: 'flex', gap: 12 }}>
                        <button
                            onClick={handleLogout}
                            style={{
                                flex: 1, background: 'var(--error, #C5221F)', color: 'white',
                                padding: 12, borderRadius: 10, fontWeight: 600, border: 'none', cursor: 'pointer'
                            }}
                        >
                            Log out
                        </button>
                        <button
                            onClick={() => setShowLogoutDialog(false)}
                            style={{
                                flex: 1, background: 'none', border: '1px solid var(--border, #ccc)',
                                padding: 12, borderRadius: 10, fontWeight: 600, cursor: 'pointer'
                            }}
                        >
                            Cancel
                        </button>
                    </div>
                </Modal>
            )}
        </div>
    );
}

function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            background: 'var(--surface, #fff)', border: '1px solid var(--border, #eaeaea)',
            borderRadius: 16, padding: '14px 16px', marginBottom: 8
        }}>
            <span style={{ color: 'var(--text-secondary, #666)' }}>{label}</span>
            <span style={{ fontWeight: 500, color: 'var(--text-primary, #111)' }}>{value}</span>
        </div>
    );
}

function ToggleSwitch({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled?: boolean }) {
    return (
        <div
            onClick={() => !disabled && onChange()}
            style={{
                width: 44, height: 24, borderRadius: 12,
                background: checked ? 'var(--primary, #1A73E8)' : 'var(--border, #ccc)',
                position: 'relative', cursor: disabled ? 'default' : 'pointer',
                transition: 'background 0.2s', opacity: disabled ? 0.6 : 1
            }}
        >
            <div style={{
                width: 18, height: 18, borderRadius: '50%', background: 'white',
                position: 'absolute', top: 3, left: checked ? 23 : 3,
                transition: 'left 0.2s'
            }} />
        </div>
    );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
    return (
        <div onClick={onClose} style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24
        }}>
            <div onClick={e => e.stopPropagation()} style={{
                background: 'var(--surface, #fff)', borderRadius: 20, padding: 28,
                maxWidth: 400, width: '100%'
            }}>
                {children}
            </div>
        </div>
    );
}