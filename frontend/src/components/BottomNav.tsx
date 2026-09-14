import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function BottomNav() {
    const location = useLocation()
    const { isLoggedIn } = useAuth()

    if (!isLoggedIn()) return null

    const isActive = (paths: string[]) => paths.some(p => location.pathname.startsWith(p))

    const items = [
        { icon: '🏠', label: 'Home', to: '/', active: location.pathname === '/' },
        { icon: '📚', label: 'Library', to: '/library', active: isActive(['/library']) },
        { icon: '➕', label: 'Sell', to: '/notes', active: false }, // web has no upload — points to app
        { icon: '👤', label: 'You', to: '/profile', active: isActive(['/profile']) }
    ]

    return (
        <nav className="mobile-bottom-nav" style={{
            position: 'fixed', bottom: 0, left: 0, right: 0,
            background: 'var(--surface)', borderTop: '1px solid var(--border)',
            display: 'none', zIndex: 100
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-around', padding: '8px 0' }}>
                {items.map(item => (
                    <Link key={item.label} to={item.to} style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                        gap: 2, padding: '4px 12px', textDecoration: 'none',
                        color: item.active ? 'var(--primary)' : 'var(--text-secondary)'
                    }}>
                        <span style={{ fontSize: '1.3rem' }}>{item.icon}</span>
                        <span style={{ fontSize: '0.7rem', fontWeight: item.active ? 600 : 400 }}>
                            {item.label}
                        </span>
                    </Link>
                ))}
            </div>
            <style>{`
                @media (max-width: 768px) {
                    .mobile-bottom-nav { display: block !important; }
                }
            `}</style>
        </nav>
    )
}