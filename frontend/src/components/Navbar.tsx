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
        color: 'white', padding: '8px 12px', borderRadius: 8,
        fontSize: '0.95rem', fontWeight: active ? 700 : 400,
        background: active ? 'rgba(255,255,255,0.15)' : 'transparent',
        textDecoration: 'none'
    })

    const mobileLinkStyle: React.CSSProperties = {
        color: 'white', display: 'block', padding: '10px 0',
        fontSize: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)',
        textDecoration: 'none'
    }

    return (
        <nav style={{
            background: 'var(--primary)', position: 'sticky',
            top: 0, zIndex: 100, boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
        }}>
            <div className="container" style={{
                display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', height: 64
            }}>
                <Link to="/" style={{
                    color: 'white', fontWeight: 700, fontSize: '1.4rem',
                    textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8
                }}>
                    📚 EduCrit
                </Link>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} className="desktop-nav">
                    <Link to="/notes" style={navLinkStyle(isActive('/notes'))}>Browse Notes</Link>
                    {isLoggedIn() && (
                        <Link to="/library" style={navLinkStyle(isActive('/library'))}>My Library</Link>
                    )}
                    {isLoggedIn() ? (
                        <>
                            <Link to="/profile" style={navLinkStyle(isActive('/profile'))}>
                                {user?.name?.split(' ')[0] || 'Profile'}
                            </Link>
                            <button onClick={handleLogout} style={{
                                background: 'rgba(255,255,255,0.15)', color: 'white',
                                padding: '8px 16px', borderRadius: 8, fontSize: '0.9rem',
                                fontWeight: 500, border: 'none', cursor: 'pointer'
                            }}>
                                Log out
                            </button>
                        </>
                    ) : (
                        <>
                            <Link to="/login" style={navLinkStyle(false)}>Log in</Link>
                            <Link to="/register" style={{
                                background: 'white', color: 'var(--primary)',
                                padding: '8px 20px', borderRadius: 8,
                                fontSize: '0.9rem', fontWeight: 700, textDecoration: 'none'
                            }}>
                                Sign up
                            </Link>
                        </>
                    )}
                </div>

                <button onClick={() => setMenuOpen(!menuOpen)} className="hamburger" style={{
                    background: 'none', color: 'white', fontSize: '1.5rem',
                    border: 'none', cursor: 'pointer', display: 'none'
                }}>
                    {menuOpen ? '✕' : '☰'}
                </button>
            </div>

            {menuOpen && (
                <div style={{ background: 'var(--primary-dark)', padding: '12px 24px 16px' }}>
                    <Link to="/notes" onClick={() => setMenuOpen(false)} style={mobileLinkStyle}>Browse Notes</Link>
                    {isLoggedIn() && (
                        <Link to="/library" onClick={() => setMenuOpen(false)} style={mobileLinkStyle}>My Library</Link>
                    )}
                    {isLoggedIn() ? (
                        <>
                            <Link to="/profile" onClick={() => setMenuOpen(false)} style={mobileLinkStyle}>Profile</Link>
                            <button onClick={() => { handleLogout(); setMenuOpen(false) }} style={{
                                color: 'white', background: 'none', fontSize: '1rem',
                                padding: '10px 0', display: 'block', width: '100%',
                                textAlign: 'left', border: 'none', cursor: 'pointer'
                            }}>
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