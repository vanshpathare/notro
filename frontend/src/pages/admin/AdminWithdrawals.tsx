import { useState, useEffect } from 'react'
import {
    adminGetPendingWithdrawals,
    adminMarkPaid,
    adminRejectWithdrawal,
    Withdrawal
} from '../../api/client'
import LoadingSpinner from '../../components/LoadingSpinner'

export default function AdminWithdrawals() {
    const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([])
    const [loading, setLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState('')
    const [markingId, setMarkingId] = useState<string | null>(null)
    const [utrNumber, setUtrNumber] = useState('')
    const [rejectingId, setRejectingId] = useState<string | null>(null)
    const [rejectReason, setRejectReason] = useState('')

    const load = () => {
        setLoading(true)
        adminGetPendingWithdrawals()
            .then(r => setWithdrawals(r.data.withdrawals))
            .catch(() => {})
            .finally(() => setLoading(false))
    }

    useEffect(() => { load() }, [])

    const handleMarkPaid = async () => {
        if (!markingId) return
        setActionLoading(markingId)
        try {
            await adminMarkPaid(markingId, utrNumber)
            setWithdrawals(prev => prev.filter(w => w.id !== markingId))
            setMarkingId(null)
            setUtrNumber('')
        } catch (e: unknown) {
            const err = e as { response?: { data?: { error?: string } } }
            alert(err.response?.data?.error || 'Failed')
        }
        setActionLoading('')
    }

    const handleReject = async () => {
        if (!rejectingId) return
        setActionLoading(rejectingId)
        try {
            await adminRejectWithdrawal(rejectingId, rejectReason)
            setWithdrawals(prev => prev.filter(w => w.id !== rejectingId))
            setRejectingId(null)
            setRejectReason('')
        } catch (e: unknown) {
            const err = e as { response?: { data?: { error?: string } } }
            alert(err.response?.data?.error || 'Failed')
        }
        setActionLoading('')
    }

    if (loading) return <LoadingSpinner message="Loading withdrawal requests..." />

    const modalOverlay: React.CSSProperties = {
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
        zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24
    }
    const modalBox: React.CSSProperties = {
        background: 'white', borderRadius: 20, padding: 32, maxWidth: 440, width: '100%'
    }

    return (
        <div>
            <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: '1.6rem', fontWeight: 700 }}>Withdrawal Requests</h1>
                <p style={{ color: '#666', marginTop: 4 }}>
                    {withdrawals.length} pending request{withdrawals.length !== 1 ? 's' : ''}
                </p>
            </div>

            {/* Mark Paid Modal */}
            {markingId && (
                <div style={modalOverlay}>
                    <div style={modalBox}>
                        <h3 style={{ fontWeight: 700, marginBottom: 16 }}>Mark as Paid</h3>
                        <p style={{ color: '#666', marginBottom: 16 }}>Enter the UTR number from your payment app</p>
                        <input className="input-field" placeholder="UTR number (optional)"
                            value={utrNumber} onChange={e => setUtrNumber(e.target.value)}
                            style={{ marginBottom: 16 }} />
                        <div style={{ display: 'flex', gap: 12 }}>
                            <button onClick={handleMarkPaid} disabled={!!actionLoading}
                                style={{ flex: 1, background: '#34A853', color: 'white', padding: '12px', borderRadius: 10, fontWeight: 600, cursor: 'pointer', border: 'none' }}>
                                {actionLoading ? 'Processing...' : '✓ Confirm Payment'}
                            </button>
                            <button onClick={() => { setMarkingId(null); setUtrNumber('') }}
                                style={{ flex: 1, background: '#F5F5F5', color: '#333', padding: '12px', borderRadius: 10, fontWeight: 600, cursor: 'pointer', border: 'none' }}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reject Modal */}
            {rejectingId && (
                <div style={modalOverlay}>
                    <div style={modalBox}>
                        <h3 style={{ fontWeight: 700, marginBottom: 16 }}>Reject Request</h3>
                        <textarea className="input-field" placeholder="Reason for rejection..."
                            value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                            rows={3} style={{ marginBottom: 16, resize: 'vertical' }} />
                        <div style={{ display: 'flex', gap: 12 }}>
                            <button onClick={handleReject} disabled={!!actionLoading}
                                style={{ flex: 1, background: '#EA4335', color: 'white', padding: '12px', borderRadius: 10, fontWeight: 600, cursor: 'pointer', border: 'none' }}>
                                {actionLoading ? 'Rejecting...' : 'Reject'}
                            </button>
                            <button onClick={() => { setRejectingId(null); setRejectReason('') }}
                                style={{ flex: 1, background: '#F5F5F5', color: '#333', padding: '12px', borderRadius: 10, fontWeight: 600, cursor: 'pointer', border: 'none' }}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {withdrawals.length === 0 ? (
                <div style={{ background: 'white', borderRadius: 16, padding: 48, textAlign: 'center' }}>
                    <p style={{ fontSize: '3rem' }}>✅</p>
                    <h3 style={{ marginTop: 16, color: '#666' }}>No pending withdrawals</h3>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {withdrawals.map(w => (
                        <div key={w.id} style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                                <div>
                                    <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1A73E8' }}>₹{w.amount}</p>
                                    <p style={{ color: '#333', fontWeight: 500, marginTop: 4 }}>
                                        {w.seller?.name}
                                        <span style={{ color: '#666', fontWeight: 400 }}> ({w.seller?.account_type})</span>
                                    </p>
                                    <p style={{ color: '#666', fontSize: '0.9rem', marginTop: 2 }}>
                                        UPI: <strong>{w.upi_id}</strong>
                                    </p>
                                    <p style={{ color: '#999', fontSize: '0.8rem', marginTop: 4 }}>
                                        Requested {new Date(w.created_at).toLocaleString('en-IN')}
                                    </p>
                                </div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button onClick={() => setMarkingId(w.id)}
                                        style={{ background: '#E8F5E9', color: '#2E7D32', padding: '10px 18px', borderRadius: 8, fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', border: 'none' }}>
                                        ✓ Mark Paid
                                    </button>
                                    <button onClick={() => setRejectingId(w.id)}
                                        style={{ background: '#FFEBEE', color: '#C62828', padding: '10px 18px', borderRadius: 8, fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', border: 'none' }}>
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