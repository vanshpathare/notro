import { Link } from 'react-router-dom'

interface Props {
    message?: string
    onRetry?: (() => void) | null
    backTo?: string | null
    backLabel?: string
}

export default function ErrorState({
    message = 'Something went wrong',
    onRetry = null,
    backTo = null,
    backLabel = 'Go back'
}: Props) {
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '60px 24px',
            textAlign: 'center'
        }}>
            <p style={{ fontSize: '3rem', marginBottom: 16 }}>😕</p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginBottom: 24, maxWidth: 400 }}>
                {message}
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
                {onRetry && (
                    <button onClick={onRetry} style={{
                        background: 'var(--primary)', color: 'white',
                        padding: '10px 24px', borderRadius: 'var(--radius-sm)',
                        fontWeight: 600, cursor: 'pointer', border: 'none'
                    }}>
                        Try Again
                    </button>
                )}
                {backTo && (
                    <Link to={backTo} style={{
                        background: 'var(--card)', color: 'var(--text-primary)',
                        padding: '10px 24px', borderRadius: 'var(--radius-sm)', fontWeight: 600
                    }}>
                        {backLabel}
                    </Link>
                )}
            </div>
        </div>
    )
}