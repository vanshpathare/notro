import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'

export default function AdminLayout() {
    const [input, setInput] = useState('')
    const [authenticated, setAuthenticated] = useState(!!sessionStorage.getItem('admin_token'))

    const handleLogin = () => {
        sessionStorage.setItem('admin_token', input)
        setAuthenticated(true)
    }

    if (!authenticated) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F0F4FF', padding: 24 }}>
                <div style={{ background: 'white', borderRadius: 20, padding: 40, maxWidth: 400, width: '100%', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
                    <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 24 }}>🔐 Admin Access</h1>
                    <input
                        type="password"
                        className="input-field"
                        placeholder="Admin token"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleLogin()}
                        style={{ marginBottom: 16 }}
                    />
                    <button className="btn-primary" onClick={handleLogin}
                        style={{ width: '100%', justifyContent: 'center', border: 'none' }}>
                        Enter
                    </button>
                </div>
            </div>
        )
    }

    const linkStyle = (isActive: boolean): React.CSSProperties => ({
        display: 'block', padding: '10px 16px', borderRadius: 10,
        color: isActive ? '#1A73E8' : '#555',
        background: isActive ? '#E8F0FE' : 'transparent',
        fontWeight: isActive ? 600 : 400, fontSize: '0.95rem',
        marginBottom: 4, textDecoration: 'none'
    })

    return (
        <div style={{ display: 'flex', minHeight: '100vh' }}>
            <div style={{ width: 220, background: 'white', borderRight: '1px solid #E0E0E0', padding: 20, flexShrink: 0, position: 'relative' }}>
                <p style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 24, color: '#1A73E8' }}>🛡️ Admin Panel</p>
                <NavLink to="/admin" end style={({ isActive }) => linkStyle(isActive)}>📊 Dashboard</NavLink>
                <NavLink to="/admin/notes" style={({ isActive }) => linkStyle(isActive)}>📝 Note Review</NavLink>
                <NavLink to="/admin/withdrawals" style={({ isActive }) => linkStyle(isActive)}>💸 Withdrawals</NavLink>
                <NavLink to="/admin/reports" style={({ isActive }) => linkStyle(isActive)}>🚩 Reports</NavLink>
                <NavLink to="/admin/users" style={({ isActive }) => linkStyle(isActive)}>👥 Users</NavLink>
                <NavLink to="/admin/orphans" style={({ isActive }) => linkStyle(isActive)}>🗑️ Orphan Files</NavLink>
                <button onClick={() => { sessionStorage.removeItem('admin_token'); setAuthenticated(false) }}
                    style={{ position: 'absolute', bottom: 24, background: 'none', color: '#EA4335', fontSize: '0.9rem', fontWeight: 500, border: 'none', cursor: 'pointer' }}>
                    Log out
                </button>
            </div>
            <div style={{ flex: 1, padding: 32, background: '#F8F9FA', overflowY: 'auto' }}>
                <Outlet />
            </div>
        </div>
    )
}