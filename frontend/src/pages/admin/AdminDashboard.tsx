import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { adminGetPendingNotes, adminGetPendingWithdrawals, adminGetReports, adminGetOrphans } from '../../api/client'

interface DashboardStats {
    pendingNotes: number
    pendingWithdrawals: number
    pendingReports: number
    orphanFiles: number
}

export default function AdminDashboard() {
    const [stats, setStats] = useState<DashboardStats | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        Promise.all([
            adminGetPendingNotes().catch(() => ({ data: { notes: [] } })),
            adminGetPendingWithdrawals().catch(() => ({ data: { withdrawals: [] } })),
            adminGetReports().catch(() => ({ data: { reports: [] } })),
            adminGetOrphans().catch(() => ({ data: { count: 0 } }))
        ]).then(([notes, withdrawals, reports, orphans]) => {
            setStats({
                pendingNotes: notes.data.notes?.length ?? 0,
                pendingWithdrawals: withdrawals.data.withdrawals?.length ?? 0,
                pendingReports: reports.data.reports?.length ?? 0,
                orphanFiles: orphans.data.count ?? 0
            })
        }).finally(() => setLoading(false))
    }, [])

    const cards: {
        icon: string
        label: string
        value: number | string
        to: string
        color: string
        textColor: string
        urgent: boolean
    }[] = [
        {
            icon: '📝',
            label: 'Pending Notes',
            value: stats?.pendingNotes ?? '—',
            to: '/admin/notes',
            color: '#FFF8E1',
            textColor: '#F57F17',
            urgent: (stats?.pendingNotes ?? 0) > 0
        },
        {
            icon: '💸',
            label: 'Pending Withdrawals',
            value: stats?.pendingWithdrawals ?? '—',
            to: '/admin/withdrawals',
            color: '#E8F5E9',
            textColor: '#2E7D32',
            urgent: (stats?.pendingWithdrawals ?? 0) > 0
        },
        {
            icon: '🚩',
            label: 'Pending Reports',
            value: stats?.pendingReports ?? '—',
            to: '/admin/reports',
            color: '#FFEBEE',
            textColor: '#C62828',
            urgent: (stats?.pendingReports ?? 0) > 0
        },
        {
            icon: '🗑️',
            label: 'Orphan Files',
            value: stats?.orphanFiles ?? '—',
            to: '/admin/orphans',
            color: '#F3E5F5',
            textColor: '#6A1B9A',
            urgent: false
        }
    ]

    return (
        <div>
            <div style={{ marginBottom: 32 }}>
                <h1 style={{ fontSize: '1.6rem', fontWeight: 700 }}>Dashboard</h1>
                <p style={{ color: '#666', marginTop: 4 }}>EduCrit Admin Overview</p>
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: 16, marginBottom: 40
            }}>
                {cards.map(card => (
                    <Link key={card.label} to={card.to} style={{ textDecoration: 'none' }}>
                        <div
                            style={{
                                background: 'white', borderRadius: 16, padding: 24,
                                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                                border: card.urgent ? `2px solid ${card.textColor}` : '2px solid transparent',
                                transition: 'transform 0.2s, box-shadow 0.2s', cursor: 'pointer'
                            }}
                            onMouseEnter={e => {
                                (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'
                                ;(e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)'
                            }}
                            onMouseLeave={e => {
                                (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'
                                ;(e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'
                            }}
                        >
                            <div style={{
                                width: 48, height: 48, background: card.color, borderRadius: 12,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '1.5rem', marginBottom: 12
                            }}>
                                {card.icon}
                            </div>
                            <p style={{
                                fontSize: '2rem', fontWeight: 700,
                                color: card.urgent ? card.textColor : '#1a1a1a', marginBottom: 4
                            }}>
                                {loading ? '...' : card.value}
                            </p>
                            <p style={{ color: '#666', fontSize: '0.9rem' }}>{card.label}</p>
                            {card.urgent && (
                                <p style={{ color: card.textColor, fontSize: '0.75rem', fontWeight: 600, marginTop: 4 }}>
                                    Needs attention →
                                </p>
                            )}
                        </div>
                    </Link>
                ))}
            </div>

            <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <h2 style={{ fontWeight: 700, marginBottom: 16 }}>Quick Actions</h2>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    {[
                        { label: '📝 Review Notes', to: '/admin/notes' },
                        { label: '💸 Process Withdrawals', to: '/admin/withdrawals' },
                        { label: '🚩 Review Reports', to: '/admin/reports' },
                        { label: '👥 Manage Users', to: '/admin/users' },
                        { label: '🗑️ Cleanup Orphans', to: '/admin/orphans' }
                    ].map(action => (
                        <Link key={action.label} to={action.to} style={{
                            background: '#F0F4FF', color: '#1A73E8',
                            padding: '10px 18px', borderRadius: 10,
                            fontWeight: 600, fontSize: '0.9rem', textDecoration: 'none'
                        }}>
                            {action.label}
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    )
}