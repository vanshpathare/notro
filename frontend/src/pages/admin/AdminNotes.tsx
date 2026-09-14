import { useState, useEffect } from 'react'
import {
    adminGetPendingNotes,
    adminViewNote,
    adminApproveNote,
    adminRejectNote,
    Note
} from '../../api/client'
import LoadingSpinner from '../../components/LoadingSpinner'

export default function AdminNotes() {
    const [notes, setNotes] = useState<Note[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [viewingUrl, setViewingUrl] = useState<string | null>(null)
    const [viewingTitle, setViewingTitle] = useState('')
    const [rejectingId, setRejectingId] = useState<string | null>(null)
    const [rejectReason, setRejectReason] = useState('')
    const [actionLoading, setActionLoading] = useState('')

    const load = () => {
        setLoading(true)
        adminGetPendingNotes()
            .then(r => setNotes(r.data.notes))
            .catch((e: unknown) => {
                const err = e as { response?: { data?: { error?: string } } }
                setError(err.response?.data?.error || 'Failed to load')
            })
            .finally(() => setLoading(false))
    }

    useEffect(() => { load() }, [])

    const handleView = async (noteId: string, title: string) => {
        try {
            const r = await adminViewNote(noteId)
            setViewingUrl(r.data.url)
            setViewingTitle(title)
        } catch (_) {
            alert('Failed to load PDF')
        }
    }

    const handleApprove = async (noteId: string) => {
        setActionLoading(noteId)
        try {
            await adminApproveNote(noteId)
            setNotes(prev => prev.filter(n => n.id !== noteId))
        } catch (e: unknown) {
            const err = e as { response?: { data?: { error?: string } } }
            alert(err.response?.data?.error || 'Failed to approve')
        }
        setActionLoading('')
    }

    const handleReject = async () => {
        if (!rejectingId) return
        if (!rejectReason.trim()) { alert('Please enter a reason'); return }
        setActionLoading(rejectingId)
        try {
            await adminRejectNote(rejectingId, rejectReason)
            setNotes(prev => prev.filter(n => n.id !== rejectingId))
            setRejectingId(null)
            setRejectReason('')
        } catch (e: unknown) {
            const err = e as { response?: { data?: { error?: string } } }
            alert(err.response?.data?.error || 'Failed to reject')
        }
        setActionLoading('')
    }

    if (loading) return <LoadingSpinner message="Loading pending notes..." />

    return (
        <div>
            <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: '1.6rem', fontWeight: 700 }}>Note Review</h1>
                <p style={{ color: '#666', marginTop: 4 }}>
                    {notes.length} note{notes.length !== 1 ? 's' : ''} pending review
                </p>
            </div>

            {error && (
                <div style={{ background: '#FFEBEE', color: '#C62828', padding: 16, borderRadius: 12, marginBottom: 20 }}>
                    {error}
                </div>
            )}

            {/* PDF Viewer Modal */}
            {viewingUrl && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ background: '#1a1a1a', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <p style={{ color: 'white', fontWeight: 600 }}>{viewingTitle}</p>
                        <button onClick={() => setViewingUrl(null)}
                            style={{ background: 'none', color: 'white', fontSize: '1.5rem', border: 'none', cursor: 'pointer' }}>
                            ✕
                        </button>
                    </div>
                    <iframe src={viewingUrl} style={{ flex: 1, border: 'none', background: 'white' }} title="PDF Preview" />
                </div>
            )}

            {/* Reject Modal */}
            {rejectingId && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
                    <div style={{ background: 'white', borderRadius: 20, padding: 32, maxWidth: 480, width: '100%' }}>
                        <h3 style={{ fontWeight: 700, marginBottom: 16 }}>Reject Note</h3>
                        <p style={{ color: '#666', marginBottom: 16 }}>Provide a reason — the seller will see this.</p>
                        <textarea
                            className="input-field"
                            placeholder="Reason for rejection..."
                            value={rejectReason}
                            onChange={e => setRejectReason(e.target.value)}
                            rows={3}
                            style={{ marginBottom: 16, resize: 'vertical' }}
                        />
                        <div style={{ display: 'flex', gap: 12 }}>
                            <button onClick={handleReject} disabled={!!actionLoading}
                                style={{ flex: 1, background: '#EA4335', color: 'white', padding: '12px', borderRadius: 10, fontWeight: 600, cursor: 'pointer', border: 'none' }}>
                                {actionLoading === rejectingId ? 'Rejecting...' : 'Reject'}
                            </button>
                            <button onClick={() => { setRejectingId(null); setRejectReason('') }}
                                style={{ flex: 1, background: '#F5F5F5', color: '#333', padding: '12px', borderRadius: 10, fontWeight: 600, cursor: 'pointer', border: 'none' }}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {notes.length === 0 ? (
                <div style={{ background: 'white', borderRadius: 16, padding: 48, textAlign: 'center' }}>
                    <p style={{ fontSize: '3rem' }}>✅</p>
                    <h3 style={{ marginTop: 16, color: '#666' }}>All caught up!</h3>
                    <p style={{ color: '#999', marginTop: 8 }}>No notes pending review</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {notes.map(note => (
                        <div key={note.id} style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                                <div style={{ flex: 1 }}>
                                    <h3 style={{ fontWeight: 700, marginBottom: 4 }}>{note.title}</h3>
                                    <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: 4 }}>
                                        {note.subject}
                                        {note.course && ` · ${note.course}`}
                                        {` · ₹${note.price} · ${note.page_count} pages`}
                                    </p>
                                    <p style={{ color: '#999', fontSize: '0.85rem' }}>
                                        by {note.seller?.name} ({note.seller?.account_type})
                                    </p>
                                    <p style={{ color: '#bbb', fontSize: '0.8rem', marginTop: 4 }}>
                                        Uploaded {new Date(note.created_at).toLocaleString('en-IN')}
                                    </p>
                                </div>
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                    <button onClick={() => handleView(note.id, note.title)}
                                        style={{ background: '#E8F0FE', color: '#1A73E8', padding: '8px 16px', borderRadius: 8, fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', border: 'none' }}>
                                        👁 View PDF
                                    </button>
                                    <button onClick={() => handleApprove(note.id)} disabled={actionLoading === note.id}
                                        style={{ background: '#E8F5E9', color: '#2E7D32', padding: '8px 16px', borderRadius: 8, fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', border: 'none' }}>
                                        {actionLoading === note.id ? '...' : '✓ Approve'}
                                    </button>
                                    <button onClick={() => setRejectingId(note.id)}
                                        style={{ background: '#FFEBEE', color: '#C62828', padding: '8px 16px', borderRadius: 8, fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', border: 'none' }}>
                                        ✕ Reject
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