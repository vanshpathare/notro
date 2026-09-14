interface Props {
    message?: string
}

export default function LoadingSpinner({ message = 'Loading...' }: Props) {
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '60px 24px',
            gap: 16
        }}>
            <div style={{
                width: 40,
                height: 40,
                border: '3px solid #E8F0FE',
                borderTop: '3px solid #1A73E8',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite'
            }} />
            <p style={{ color: '#666', fontSize: '0.95rem' }}>{message}</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    )
}