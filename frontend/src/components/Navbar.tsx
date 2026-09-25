import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Navbar() {
    const { user, logout, isLoggedIn } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()
    const [menuOpen, setMenuOpen] = useState(false)

    const handleLogout = async () => {
        await logout()
        navigate('/')
    }

    const isActive = (path: string) => location.pathname === path

    const navLinkStyle = (active: boolean): React.CSSProperties => ({
        color: 'white',
        padding: '8px 12px',
        borderRadius: 8,
        fontSize: '0.95rem',
        fontWeight: active ? 700 : 400,
        background: active ? 'rgba(255,255,255,0.15)' : 'transparent',
        textDecoration: 'none',
        display: 'inline-block'
    })

    const mobileLinkStyle: React.CSSProperties = {
        color: 'white',
        display: 'block',
        padding: '10px 0',
        fontSize: '1rem',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        textDecoration: 'none'
    }

    const authenticated = typeof isLoggedIn === 'function' ? isLoggedIn() : !!user

    return (
        <nav style={{
            background: 'var(--primary)',
            position: 'sticky',
            top: 0,
            zIndex: 100,
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
        }}>
            <div className="container" style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                height: 64,
                maxWidth: 1200,
                margin: '0 auto',
                padding: '0 16px',
                boxSizing: 'border-box'
            }}>
                <Link to="/" style={{
                    color: 'white',
                    fontWeight: 700,
                    fontSize: '1.4rem',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8
                }}>
                    📚 Notezho
                </Link>

                {/* Desktop Navigation */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} className="desktop-nav">
                     
                    {authenticated ? (
                        <>
                             <Link to="/profile" style={navLinkStyle(isActive('/profile'))}>
                                {user?.name?.split(' ')[0] || 'Profile'}
                            </Link>
                            <button
                                onClick={handleLogout}
                                style={{
                                    background: 'rgba(255,255,255,0.15)',
                                    color: 'white',
                                    padding: '8px 16px',
                                    borderRadius: 8,
                                    fontSize: '0.9rem',
                                    fontWeight: 500,
                                    border: 'none',
                                    cursor: 'pointer'
                                }}
                            >
                                Log out
                            </button>
                        </>
                    ) : (
                        <>
                            <Link to="/login" style={navLinkStyle(isActive('/login'))}>Log in</Link>
                            <Link
                                to="/register"
                                style={{
                                    background: 'white',
                                    color: 'var(--primary, #1A73E8)',
                                    padding: '8px 20px',
                                    borderRadius: 8,
                                    fontSize: '0.9rem',
                                    fontWeight: 700,
                                    textDecoration: 'none',
                                    boxShadow: isActive('/register') ? '0 0 0 2px rgba(255,255,255,0.8)' : 'none'
                                }}
                            >
                                Sign up
                            </Link>
                        </>
                    )}
                </div>

                {/* Mobile Hamburger */}
                <button
                    onClick={() => setMenuOpen(!menuOpen)}
                    className="hamburger"
                    style={{
                        background: 'none',
                        color: 'white',
                        fontSize: '1.5rem',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'none'
                    }}
                >
                    {menuOpen ? '✕' : '☰'}
                </button>
            </div>

            {/* Mobile Dropdown */}
            {menuOpen && (
                <div style={{ background: 'var(--primary-dark, #0d47a1)', padding: '12px 24px 16px' }}>
                     
                    {authenticated ? (
                        <>
                             <button
                                onClick={() => { handleLogout(); setMenuOpen(false); }}
                                style={{
                                    color: 'white',
                                    background: 'none',
                                    fontSize: '1rem',
                                    padding: '10px 0',
                                    display: 'block',
                                    width: '100%',
                                    textAlign: 'left',
                                    border: 'none',
                                    cursor: 'pointer'
                                }}
                            >
                                Log out
                            </button>
                        </>
                    ) : (
                        <>
                            <Link to="/login" onClick={() => setMenuOpen(false)} style={mobileLinkStyle}>Log in</Link>
                            <Link to="/register" onClick={() => setMenuOpen(false)} style={mobileLinkStyle}>Sign up</Link>
                        </>
                    )}
                </div>
            )}

            <style>{`
                @media (max-width: 768px) {
                    .desktop-nav { display: none !important; }
                    .hamburger { display: block !important; }
                }
            `}</style>
        </nav>
    )
}