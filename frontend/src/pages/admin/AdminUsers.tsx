import { useState } from 'react'
import { adminSearchUsers, adminBanUser, adminUnbanUser, UserProfile } from '../../api/client'

function getAccountTypeColor(type: string): { bg: string; text: string } {
    const map: Record<string, { bg: string; text: string }> = {
        student: { bg: '#E8F0FE', text: '#1A73E8' },
        business: { bg: '#FFF8E1', text: '#F57F17' },
        youtube: { bg: '#FFEBEE', text: '#C62828' }
    }
    return map[type] || { bg: '#F5F5F5', text: '#666' }
}

export default function AdminUsers() {
    const [searchQuery, setSearchQuery] = useState('')
    const [users, setUsers] = useState<UserProfile[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [actionLoading, setActionLoading] = useState('')

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!searchQuery.trim()) return
        setLoading(true)
        setError('')
        try {
            const res = await adminSearchUsers(searchQuery)
            setUsers(res.data.users || [])
        } catch (_) {
            setError('Search failed')
        }
        setLoading(false)
    }

    const handleBan = async (userId: string, currentlyBanned: boolean) => {
        setActionLoading(userId)
        try {
            if (currentlyBanned) await adminUnbanUser(userId)
            else await adminBanUser(userId)
            setUsers(prev => prev.map(u =>
                u.id === userId ? { ...u, is_banned: !currentlyBanned } : u
            ))
        } catch (e: unknown) {
            const err = e as { response?: { data?: { error?: string } } }
            alert(err.response?.data?.error || 'Action failed')
        }
        setActionLoading('')
    }

    return (
        <div>
            <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: '1.6rem', fontWeight: 700 }}>User Management</h1>
                <p style={{ color: '#666', marginTop: 4 }}>Search and manage user accounts</p>
            </div>

            <form onSubmit={handleSearch} style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
                <input
                    className="input-field"
                    placeholder="Search by name or phone..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    style={{ flex: 1, maxWidth: 400 }}
                />
                <button type="submit" disabled={loading}
                    style={{ background: '#1A73E8', color: 'white', padding: '12px 24px', borderRadius: 10, fontWeight: 600, cursor: 'pointer', border: 'none' }}>
                    {loading ? 'Searching...' : 'Search'}
                </button>
            </form>

            {error && (
                <div style={{ background: '#FFEBEE', color: '#C62828', padding: 16, borderRadius: 12, marginBottom: 16 }}>
                    {error}
                </div>
            )}

            {users.length > 0 && (
                <div style={{ background: 'white', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                    {users.map((user, i) => {
                        const tc = getAccountTypeColor(user.account_type)
                        return (
                            <div key={user.id} style={{
                                padding: '16px 20px',
                                borderBottom: i < users.length - 1 ? '1px solid #F0F0F0' : 'none',
                                display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap'
                            }}>
                                <div style={{
                                    width: 44, height: 44, borderRadius: '50%', background: '#E8F0FE',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontWeight: 700, color: '#1A73E8', fontSize: '1.1rem', flexShrink: 0
                                }}>
                                    {user.name?.charAt(0).toUpperCase() || '?'}
                                </div>
                                <div style={{ flex: 1, minWidth: 160 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
                                        <p style={{ fontWeight: 600 }}>{user.name}</p>
                                        <span style={{ background: tc.bg, color: tc.text, fontSize: '0.72rem', fontWeight: 600, padding: '2px 8px', borderRadius: 20 }}>
                                            {user.account_type}
                                        </span>
                                        {user.is_seller && (
                                            <span style={{ background: '#E8F5E9', color: '#2E7D32', fontSize: '0.72rem', fontWeight: 600, padding: '2px 8px', borderRadius: 20 }}>
                                                Seller
                                            </span>
                                        )}
                                        {user.is_banned && (
                                            <span style={{ background: '#FFEBEE', color: '#C62828', fontSize: '0.72rem', fontWeight: 600, padding: '2px 8px', borderRadius: 20 }}>
                                                Banned
                                            </span>
                                        )}
                                    </div>
                                    <p style={{ color: '#666', fontSize: '0.85rem' }}>
                                        +91 {user.phone}
                                        {user.email && ` · ${user.email}`}
                                    </p>
                                    <p style={{ color: '#bbb', fontSize: '0.78rem', marginTop: 2 }}>
                                        Joined {new Date(user.created_at).toLocaleDateString('en-IN')}
                                    </p>
                                </div>
                                <button
                                    onClick={() => handleBan(user.id, user.is_banned)}
                                    disabled={actionLoading === user.id}
                                    style={{
                                        background: user.is_banned ? '#E8F5E9' : '#FFEBEE',
                                        color: user.is_banned ? '#2E7D32' : '#C62828',
                                        padding: '8px 16px', borderRadius: 8,
                                        fontWeight: 600, fontSize: '0.85rem',
                                        cursor: 'pointer', border: 'none'
                                    }}
                                >
                                    {actionLoading === user.id ? '...' : user.is_banned ? 'Unban' : 'Ban'}
                                </button>
                            </div>
                        )
                    })}
                </div>
            )}

            {!loading && users.length === 0 && searchQuery && (
                <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
                    No users found for "{searchQuery}"
                </div>
            )}

            {!searchQuery && (
                <div style={{ background: 'white', borderRadius: 16, padding: 48, textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                    <p style={{ fontSize: '2.5rem', marginBottom: 16 }}>🔍</p>
                    <p style={{ color: '#666' }}>Search by name or phone number to find users</p>
                </div>
            )}
        </div>
    )
}