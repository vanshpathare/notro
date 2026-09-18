import React, { useState, useEffect } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import AdminSecurityGate from '../../components/AdminSecurityGate'
import api from '../../api/client'

export default function AdminLayout() {
  const [authenticated, setAuthenticated] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(true)
  const navigate = useNavigate()

  // 1. Probe the backend on mount to check if the 2-hour elevated session is already active
  useEffect(() => {
    async function checkElevation() {
      try {
        await api.get('/admin/stats')
        setAuthenticated(true)
      } catch {
        setAuthenticated(false)
      } finally {
        setLoading(false)
      }
    }
    checkElevation()
  }, [])

  // 2. Clear the elevated session cookie on logout
  const handleLogout = async () => {
    try {
      await api.post('/admin/logout-gate')
    } catch {
      // Proceed with UI reset even if network call fails
    }
    setAuthenticated(false)
    navigate('/')
  }

  // 3. Loading state while checking cookie validity
  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#F8F9FA',
        }}
      >
        <p style={{ color: '#666', fontWeight: 600 }}>Verifying access...</p>
      </div>
    )
  }

  // 4. If clearance is not elevated, display the two-passphrase security gate
  if (!authenticated) {
    return <AdminSecurityGate onSuccess={() => setAuthenticated(true)} />
  }

  // Sidebar link styles
  const linkStyle = (isActive: boolean): React.CSSProperties => ({
    display: 'block',
    padding: '10px 16px',
    borderRadius: 10,
    color: isActive ? '#1A73E8' : '#555',
    background: isActive ? '#E8F0FE' : 'transparent',
    fontWeight: isActive ? 600 : 400,
    fontSize: '0.95rem',
    marginBottom: 4,
    textDecoration: 'none',
  })

  // 5. Unlocked Admin Panel with persistent sidebar and routed sub-pages
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside
        style={{
          width: 230,
          background: 'white',
          borderRight: '1px solid #E0E0E0',
          padding: 20,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
            <span style={{ fontSize: '1.2rem' }}>🛡️</span>
            <span style={{ fontWeight: 700, fontSize: '1.1rem', color: '#1A73E8' }}>Admin Panel</span>
          </div>

          <nav>
            <NavLink to="/admin" end style={({ isActive }) => linkStyle(isActive)}>
              📊 Dashboard
            </NavLink>
            <NavLink to="/admin/notes" style={({ isActive }) => linkStyle(isActive)}>
              📝 Note Review
            </NavLink>
            <NavLink to="/admin/withdrawals" style={({ isActive }) => linkStyle(isActive)}>
              💸 Withdrawals
            </NavLink>
            <NavLink to="/admin/reports" style={({ isActive }) => linkStyle(isActive)}>
              🚩 Reports
            </NavLink>
            <NavLink to="/admin/users" style={({ isActive }) => linkStyle(isActive)}>
              👥 Users
            </NavLink>
            <NavLink to="/admin/orphans" style={({ isActive }) => linkStyle(isActive)}>
              🗑️ Orphan Files
            </NavLink>
          </nav>
        </div>

        {/* Invalidate elevated session */}
        <button
          onClick={handleLogout}
          style={{
            background: 'none',
            color: '#EA4335',
            fontSize: '0.9rem',
            fontWeight: 600,
            border: 'none',
            cursor: 'pointer',
            textAlign: 'left',
            padding: '8px 0',
          }}
        >
          ✖ Exit Admin Clearance
        </button>
      </aside>

      {/* Dynamic Sub-Page Content */}
      <main style={{ flex: 1, padding: 32, background: '#F8F9FA', overflowY: 'auto' }}>
        <Outlet />
      </main>
    </div>
  )
}