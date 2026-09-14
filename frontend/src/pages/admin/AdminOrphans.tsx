import { useState, useEffect } from 'react'
import { adminGetOrphans, adminCleanupOrphans, OrphanFile } from '../../api/client'

interface CleanupResult {
    success: boolean
    message: string
    deleted?: number
    failed?: number
}

export default function AdminOrphans() {
    const [orphans, setOrphans] = useState<OrphanFile[]>([])
    const [count, setCount] = useState(0)
    const [loading, setLoading] = useState(true)
    const [cleaning, setCleaning] = useState(false)
    const [result, setResult] = useState<CleanupResult | null>(null)

    const load = () => {
        setLoading(true)
        adminGetOrphans()
            .then(r => {
                setOrphans(r.data.orphans || [])
                setCount(r.data.count || 0)
            })
            .catch(() => {})
            .finally(() => setLoading(false))
    }

    useEffect(() => { load() }, [])

    const handleCleanup = async () => {
        if (!window.confirm(`Delete ${count} orphan file${count !== 1 ? 's' : ''}? This cannot be undone.`)) return
        setCleaning(true)
        setResult(null)
        try {
            const r = await adminCleanupOrphans()
            setResult({
                success: true,
                message: r.data.message,
                deleted: r.data.deleted,
                failed: r.data.failed
            })
            load()
        } catch (e: unknown) {
            const err = e as { response?: { data?: { error?: string } } }
            setResult({
                success: false,
                message: err.response?.data?.error || 'Cleanup failed'
            })
        }
        setCleaning(false)
    }

    return (
        <div>
            <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: '1.6rem', fontWeight: 700 }}>Orphan File Cleanup</h1>
                <p style={{ color: '#666', marginTop: 4 }}>
                    Files uploaded to R2 but never linked to a note
                </p>
            </div>

            <div style={{ background: '#FFF8E1', borderRadius: 16, padding: 20, marginBottom: 24, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <span style={{ fontSize: '1.5rem' }}>⚠️</span>
                <div>
                    <p style={{ fontWeight: 600, color: '#F57F17', marginBottom: 4 }}>What are orphan files?</p>
                    <p style={{ color: '#666', fontSize: '0.9rem', lineHeight: 1.6 }}>
                        When a seller starts an upload but doesn't complete it, a file gets stored in R2
                        but is never attached to a note. Only files older than 24 hours are included.
                    </p>
                </div>
            </div>

            {result && (
                <div style={{
                    background: result.success ? '#E8F5E9' : '#FFEBEE',
                    color: result.success ? '#2E7D32' : '#C62828',
                    borderRadius: 12, padding: 16, marginBottom: 20, fontWeight: 500
                }}>
                    {result.message}
                    {result.success && (
                        <span style={{ color: '#666', fontWeight: 400, marginLeft: 8 }}>
                            ({result.deleted} deleted, {result.failed} failed)
                        </span>
                    )}
                </div>
            )}

            <div style={{
                background: 'white', borderRadius: 16, padding: 24,
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginBottom: 24,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16
            }}>
                <div>
                    <p style={{ fontSize: '2.5rem', fontWeight: 700, color: count > 0 ? '#EA4335' : '#34A853' }}>
                        {loading ? '...' : count}
                    </p>
                    <p style={{ color: '#666' }}>orphan file{count !== 1 ? 's' : ''} found</p>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                    <button onClick={load} disabled={loading}
                        style={{ background: '#F0F4FF', color: '#1A73E8', padding: '12px 20px', borderRadius: 10, fontWeight: 600, cursor: 'pointer', border: 'none' }}>
                        {loading ? 'Checking...' : '🔄 Refresh'}
                    </button>
                    <button onClick={handleCleanup} disabled={cleaning || count === 0}
                        style={{
                            background: count === 0 ? '#ccc' : '#EA4335', color: 'white',
                            padding: '12px 20px', borderRadius: 10, fontWeight: 600,
                            cursor: count === 0 ? 'not-allowed' : 'pointer', border: 'none'
                        }}>
                        {cleaning ? 'Cleaning...' : `🗑️ Clean ${count} file${count !== 1 ? 's' : ''}`}
                    </button>
                </div>
            </div>

            {orphans.length > 0 && (
                <div style={{ background: 'white', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                    <div style={{ padding: '12px 20px', borderBottom: '1px solid #F0F0F0', background: '#F8F9FA' }}>
                        <p style={{ fontWeight: 600, color: '#666', fontSize: '0.85rem' }}>R2 KEY / CREATED AT</p>
                    </div>
                    {orphans.slice(0, 20).map((orphan, i) => (
                        <div key={orphan.id} style={{
                            padding: '12px 20px',
                            borderBottom: i < Math.min(orphans.length, 20) - 1 ? '1px solid #F0F0F0' : 'none',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12
                        }}>
                            <p style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#555', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 400 }}>
                                {orphan.r2_key}
                            </p>
                            <p style={{ color: '#999', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                                {new Date(orphan.created_at).toLocaleDateString('en-IN')}
                            </p>
                        </div>
                    ))}
                    {orphans.length > 20 && (
                        <div style={{ padding: '12px 20px', background: '#F8F9FA', textAlign: 'center', color: '#666', fontSize: '0.85rem' }}>
                            ... and {orphans.length - 20} more
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}