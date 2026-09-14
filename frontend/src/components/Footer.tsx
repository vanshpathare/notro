import { Link } from 'react-router-dom'

export default function Footer() {
    return (
        <footer className="site-footer" style={{ background: '#1a1a1a', color: '#888', padding: '40px 24px 24px' }}>
            <div className="container">
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                    gap: 32, marginBottom: 40
                }}>
                    <div>
                        <p style={{ color: 'white', fontWeight: 700, fontSize: '1.1rem', marginBottom: 12 }}>
                            📚 EduCrit
                        </p>
                        <p style={{ fontSize: '0.85rem', lineHeight: 1.6 }}>
                            India's student notes marketplace
                        </p>
                    </div>
                    <div>
                        <p style={{ color: 'white', fontWeight: 600, marginBottom: 12 }}>Explore</p>
                        {[
                            { to: '/notes', label: 'Browse Notes' },
                            { to: '/register', label: 'Start Selling' },
                            { to: '/library', label: 'My Library' }
                        ].map(l => (
                            <Link key={l.to} to={l.to} style={{
                                display: 'block', color: '#888',
                                marginBottom: 8, fontSize: '0.9rem',
                                textDecoration: 'none'
                            }}>
                                {l.label}
                            </Link>
                        ))}
                    </div>
                    <div>
                        <p style={{ color: 'white', fontWeight: 600, marginBottom: 12 }}>Legal</p>
                        <Link to="/privacy" style={{
                            display: 'block', color: '#888', marginBottom: 8,
                            fontSize: '0.9rem', textDecoration: 'none'
                        }}>
                            Privacy Policy
                        </Link>
                        <Link to="/terms" style={{
                            display: 'block', color: '#888', fontSize: '0.9rem', textDecoration: 'none'
                        }}>
                            Terms of Service
                        </Link>
                    </div>
                    <div>
                        <p style={{ color: 'white', fontWeight: 600, marginBottom: 12 }}>Contact</p>
                        <a href="mailto:support@educrit.in" style={{ color: '#888', fontSize: '0.9rem' }}>
                            support@educrit.in
                        </a>
                    </div>
                </div>
                <div style={{
                    borderTop: '1px solid #333', paddingTop: 20,
                    display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center', flexWrap: 'wrap', gap: 12
                }}>
                    <p style={{ fontSize: '0.85rem' }}>© 2026 EduCrit. All rights reserved.</p>
                    <p style={{ fontSize: '0.85rem' }}>Payments secured by Razorpay 🔒</p>
                </div>
            </div>

            <style>{`
                @media (max-width: 768px) {
                    .site-footer {
                        display: none !important;
                    }
                }
            `}</style>
        </footer>
    )
}