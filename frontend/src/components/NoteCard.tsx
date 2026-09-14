import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getImageUrl, Note } from '../api/client'
import { getSubjectColor } from '../theme/colors'
import { useTheme } from '../contexts/ThemeContext'

interface Props {
    note: Note
}

export default function NoteCard({ note }: Props) {
    const [coverUrl, setCoverUrl] = useState<string | null>(null)
    const { isDarkMode } = useTheme()
    const bgColor = getSubjectColor(note.subject)

    // Log the exact key coming from the database for each card
    console.log(`Note ID ${note.id} (${note.title}) cover_image_key:`, note.cover_image_key);

    useEffect(() => {
        if (!note.cover_image_key) return

        if (note.cover_image_key.startsWith('http')) {
            setCoverUrl(note.cover_image_key)
        } else {
            getImageUrl(note.cover_image_key)
                .then((r: any) => {
                    console.log("Image URL response for key:", note.cover_image_key, r);
                    const resolvedUrl = r?.data?.url || r?.data || r?.url || r;
                    if (typeof resolvedUrl === 'string') {
                        setCoverUrl(resolvedUrl);
                    }
                })
                .catch((err) => {
                    console.error("Failed to load cover image URL for key:", note.cover_image_key, err);
                })
        }
    }, [note.cover_image_key])

    return (
        <Link to={`/notes/${note.id}`} style={{ textDecoration: 'none' }}>
            <div
                className="card"
                style={{
                    padding: 0,
                    overflow: 'hidden',
                    height: '100%',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column'
                }}
                onMouseEnter={e => {
                    (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)'
                }}
                onMouseLeave={e => {
                    (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'
                }}
            >
                {/* 16:9 thumbnail — matches NoteCard.kt aspectRatio(16f/9f) */}
                <div style={{ aspectRatio: '16/9', position: 'relative', overflow: 'hidden' }}>
                    {note.cover_image_key && coverUrl ? (
                        <img src={coverUrl} alt={note.title}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                        <div style={{
                            width: '100%',
                            height: '100%',
                            background: bgColor,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 16
                        }}>
                            <span style={{ fontSize: '2.2rem', lineHeight: 1 }}>📄</span>
                            <p style={{
                                color: 'white',
                                fontWeight: 700,
                                fontSize: '1rem',
                                textAlign: 'center',
                                marginTop: 8,
                                maxWidth: '100%',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                            }}>{note.subject}</p>
                            {note.course && (
                                <p style={{
                                    color: 'rgba(255,255,255,0.8)',
                                    fontSize: '0.8rem',
                                    textAlign: 'center',
                                    marginTop: 4,
                                    maxWidth: '100%',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis'
                                }}>{note.course}</p>
                            )}
                        </div>
                    )}
                    {/* Subject pill — matches app: light gray bg light mode, black bg dark mode */}
                    <div style={{
                        position: 'absolute', top: 8, left: 8,
                        background: isDarkMode ? 'rgba(0,0,0,0.8)' : '#F5F5F5',
                        color: isDarkMode ? 'white' : '#1A1A1A',
                        padding: '3px 10px', borderRadius: 20,
                        fontSize: '0.75rem', fontWeight: 600
                    }}>
                        {note.subject}
                    </div>
                </div>

                {/* Content details section matching exact Android inner spacing */}
                <div style={{ padding: '4px 12px 4px 12px', display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
                    <div>
                        <h3 style={{
                            fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)',
                            marginBottom: 2, display: '-webkit-box',
                            WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden'
                        }}>
                            {note.title}
                        </h3>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 6 }}>
                            by {note.seller?.name || 'Unknown'}
                        </p>

                        {(note.rating_count > 0 || (note.purchase_count ?? 0) > 0) && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                {note.rating_count > 0 && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                        <span style={{ color: 'var(--star-gold)' }}>★</span>
                                        <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{note.average_rating}</span>
                                        <span>({note.rating_count})</span>
                                    </div>
                                )}
                                {note.purchase_count > 0 && (
                                    <span>{note.purchase_count} sold</span>
                                )}
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 0 }}>
                        <span style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--primary)' }}>
                            ₹{Math.round(note.price)}
                        </span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            {note.page_count} pages
                        </span>
                    </div>
                </div>
            </div>
        </Link>
    )
}