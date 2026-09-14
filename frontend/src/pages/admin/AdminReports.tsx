import { useState, useEffect } from 'react'
import { adminGetReports, adminActionReport, Report } from '../../api/client'
import LoadingSpinner from '../../components/LoadingSpinner'

const REASON_LABELS: Record<string, string> = {
    copyright: 'Copyright Violation',
    blank_pdf: 'Blank / Empty PDF',
    inappropriate: 'Inappropriate Content',
    spam: 'Spam / Misleading',
    misleading: 'Misleading Description'
}

export default function AdminReports() {
    const [reports, setReports] = useState<Report[]>([])
    const [loading, setLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState('')

    const load = () => {
        setLoading(true)
        adminGetReports()
            .then(r => setReports(r.data.reports))
            .catch(() => {})
            .finally(() => setLoading(false))
    }

    useEffect(() => { load() }, [])

    const handleAction = async (id: string, action: string) => {
        setActionLoading(`${id}_${action}`)
        try {
            await adminActionReport(id, action, '')
            setReports(prev => prev.filter(r => r.id !== id))
        } catch (e: unknown) {
            const err = e as { response?: { data?: { error?: string } } }
            alert(err.response?.data?.error || 'Failed')
        }
        setActionLoading('')
    }

    if (loading) return <LoadingSpinner message="Loading reports..." />

    return (
        <div>
            <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: '1.6rem', fontWeight: 700 }}>Content Reports</h1>
                <p style={{ color: '#666', marginTop: 4 }}>
                    {reports.length} pending report{reports.length !== 1 ? 's' : ''}
                </p>
            </div>

            {reports.length === 0 ? (
                <div style={{ background: 'white', borderRadius: 16, padding: 48, textAlign: 'center' }}>
                    <p style={{ fontSize: '3rem' }}>✅</p>
                    <h3 style={{ marginTop: 16, color: '#666' }}>No pending reports</h3>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {reports.map(report => (
                        <div key={report.id} style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                                        <span style={{ background: '#FFEBEE', color: '#C62828', padding: '3px 10px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 600 }}>
                                            {REASON_LABELS[report.reason] || report.reason}
                                        </span>
                                    </div>
                                    <p style={{ fontWeight: 600, marginBottom: 4 }}>
                                        Note: {report.note?.title || report.note_id}
                                    </p>
                                    {report.description && (
                                        <p style={{ color: '#555', fontSize: '0.9rem', marginBottom: 4 }}>
                                            "{report.description}"
                                        </p>
                                    )}
                                    <p style={{ color: '#999', fontSize: '0.8rem' }}>
                                        Reported by {report.reporter?.name || 'User'}
                                        {' · '}
                                        {new Date(report.created_at).toLocaleString('en-IN')}
                                    </p>
                                </div>
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                    <button
                                        onClick={() => handleAction(report.id, 'actioned')}
                                        disabled={!!actionLoading}
                                        style={{ background: '#FFEBEE', color: '#C62828', padding: '8px 16px', borderRadius: 8, fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', border: 'none' }}>
                                        {actionLoading === `${report.id}_actioned` ? '...' : '🚫 Take Down'}
                                    </button>
                                    <button
                                        onClick={() => handleAction(report.id, 'reviewed')}
                                        disabled={!!actionLoading}
                                        style={{ background: '#E8F5E9', color: '#2E7D32', padding: '8px 16px', borderRadius: 8, fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', border: 'none' }}>
                                        {actionLoading === `${report.id}_reviewed` ? '...' : '✓ Reviewed'}
                                    </button>
                                    <button
                                        onClick={() => handleAction(report.id, 'dismissed')}
                                        disabled={!!actionLoading}
                                        style={{ background: '#F5F5F5', color: '#666', padding: '8px 16px', borderRadius: 8, fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', border: 'none' }}>
                                        {actionLoading === `${report.id}_dismissed` ? '...' : 'Dismiss'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}