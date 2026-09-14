import { NavLink } from 'react-router-dom';

export default function Sidebar() {
    const mainLinks = [
        { to: '/', label: 'Home', icon: '🏠' },
        { to: '/library', label: 'My Library', icon: '📖' },
        { to: '/profile', label: 'Profile', icon: '👤' },
    ];

    const legalLinks = [
        { to: '/privacy', label: 'Privacy Policy' },
        { to: '/terms', label: 'Terms of Service' },
    ];

    return (
        <aside className="app-sidebar" style={{
            width: '240px',
            background: 'var(--surface)',
            borderRight: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '16px 12px',
            position: 'sticky',
            top: '64px',
            height: 'calc(100vh - 64px)',
            overflowY: 'auto',
            flexShrink: 0,
        }}>
            {/* Top Navigation Links */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {mainLinks.map((link) => (
                    <NavLink
                        key={link.to}
                        to={link.to}
                        style={({ isActive }) => ({
                            display: 'flex',
                            alignItems: 'center',
                            gap: '16px',
                            padding: '12px 16px',
                            borderRadius: '10px',
                            textDecoration: 'none',
                            fontWeight: isActive ? 600 : 500,
                            fontSize: '0.95rem',
                            color: isActive ? 'var(--primary)' : 'var(--text-primary)',
                            background: isActive ? 'var(--primary-light)' : 'transparent',
                            transition: 'background 0.2s',
                        })}
                    >
                        <span style={{ fontSize: '1.2rem' }}>{link.icon}</span>
                        <span>{link.label}</span>
                    </NavLink>
                ))}
            </div>

            {/* Bottom Legal Links Section */}
            <div style={{ 
                paddingTop: '16px', 
                borderTop: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
            }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-hint)', paddingLeft: '16px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Legal
                </div>
                {legalLinks.map((link) => (
                    <NavLink
                        key={link.to}
                        to={link.to}
                        style={({ isActive }) => ({
                            display: 'block',
                            padding: '8px 16px',
                            borderRadius: '8px',
                            textDecoration: 'none',
                            fontSize: '0.85rem',
                            fontWeight: isActive ? 600 : 400,
                            color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                            transition: 'color 0.2s',
                        })}
                    >
                        {link.label}
                    </NavLink>
                ))}
                <div style={{ fontSize: '0.75rem', color: 'var(--text-hint)', padding: '8px 16px 0 16px' }}>
                    © 2026 EduCrit
                </div>
            </div>
        </aside>
    );
}