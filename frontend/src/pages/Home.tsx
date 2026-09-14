import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getNotes, searchSellers } from '../api/client';
import NoteCard from '../components/NoteCard';

export default function Home() {
    const [notes, setNotes] = useState<any[]>([]);
    const [sellers, setSellers] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTab, setSelectedTab] = useState('newest');
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

    const requestIdRef = useRef(0);

    const filterOptions = [
        { key: 'sellers', label: 'Sellers' },
        { key: 'newest', label: 'Newest' },
        { key: 'most_bought', label: 'Most Bought' },
        { key: 'top_rated', label: 'Top Rated' },
        { key: 'price_low', label: 'Price: Low to High' },
        { key: 'price_high', label: 'Price: High to Low' },
    ];

    const isViewingSellers = selectedTab === 'sellers';

    useEffect(() => {
        const timer = setTimeout(() => {
            if (isViewingSellers) {
                fetchSellers();
            } else {
                fetchNotes();
            }
        }, 300);

        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchQuery, selectedTab]);

    const fetchNotes = async () => {
        const myRequestId = ++requestIdRef.current;
        setIsLoading(true);
        try {
            const response = await getNotes({
                search: searchQuery.length >= 2 ? searchQuery : undefined,
                sort_by: selectedTab,
                page: 1,
                limit: 50
            });

            if (myRequestId === requestIdRef.current) {
                if (response.data && response.data.notes) {
                    let fetchedNotes = [...response.data.notes];

                    if (selectedTab === 'newest') {
                        fetchedNotes.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
                    } else if (selectedTab === 'most_bought') {
                        fetchedNotes.sort((a, b) => (b.purchase_count || 0) - (a.purchase_count || 0));
                    } else if (selectedTab === 'top_rated') {
                        fetchedNotes.sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0));
                    } else if (selectedTab === 'price_low') {
                        fetchedNotes.sort((a, b) => (a.price || 0) - (a.price || 0));
                    } else if (selectedTab === 'price_high') {
                        fetchedNotes.sort((a, b) => (b.price || 0) - (a.price || 0));
                    }

                    setNotes(fetchedNotes);
                }
            }
        } catch (e) {
            console.error('Failed to load notes', e);
        }
        if (myRequestId === requestIdRef.current) {
            setIsLoading(false);
        }
    };

    const fetchSellers = async () => {
        if (searchQuery.length < 2) {
            setSellers([]);
            setIsLoading(false);
            return;
        }
        const myRequestId = ++requestIdRef.current;
        setIsLoading(true);
        try {
            const response = await searchSellers(searchQuery);

            if (myRequestId === requestIdRef.current) {
                if (response.data && response.data.sellers) {
                    setSellers(response.data.sellers);
                }
            }
        } catch (e) {
            console.error('Failed to load sellers', e);
        }
        if (myRequestId === requestIdRef.current) {
            setIsLoading(false);
        }
    };

    return (
        <div style={{ width: '100%', boxSizing: 'border-box', padding: '24px 16px', overflowX: 'hidden' }}>
            <style>{`
                .home-wrapper {
                    max-width: 1200px;
                    margin: 0 auto;
                    width: 100%;
                    box-sizing: border-box;
                }
                .content-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
                    gap: 20px;
                    width: 100%;
                    box-sizing: border-box;
                }
                .sellers-container {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                    gap: 20px;
                    width: 100%;
                    box-sizing: border-box;
                }
                .seller-card-item {
                    background: var(--surface);
                    border-radius: 16px;
                    padding: 24px;
                    border: 1px solid var(--border);
                    cursor: pointer;
                    text-align: center;
                    box-shadow: var(--shadow-sm);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    box-sizing: border-box;
                }
                .seller-avatar {
                    width: 60px;
                    height: 60px;
                    background: var(--primary-light);
                    color: var(--primary);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.5rem;
                    font-weight: 800;
                    margin-bottom: 12px;
                }
                .seller-info {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                }
                .seller-arrow {
                    display: none;
                }

                /* Target layout application sidebar visibility: hidden on mobile (< 768px), visible on tablet/laptop */
                .sidebar, nav.sidebar, aside {
                    display: block;
                }

                @media (max-width: 767px) {
                    .sidebar, nav.sidebar, aside {
                        display: none !important;
                    }
                    .home-wrapper {
                        padding-left: 0 !important;
                        padding-right: 0 !important;
                    }
                }

                @media (max-width: 1024px) {
                    .sellers-container {
                        display: flex;
                        flex-direction: column;
                        gap: 0;
                        background: var(--surface);
                        border-radius: 12px;
                        border: 1px solid var(--border);
                        overflow: hidden;
                    }
                    .seller-card-item {
                        flex-direction: row;
                        align-items: center;
                        justify-content: space-between;
                        padding: 12px 16px;
                        border: none;
                        border-bottom: 1px solid var(--border);
                        border-radius: 0;
                        box-shadow: none;
                        text-align: left;
                        background: transparent;
                    }
                    .seller-card-item:last-child {
                        border-bottom: none;
                    }
                    .seller-avatar {
                        width: 44px;
                        height: 44px;
                        font-size: 1.2rem;
                        margin-bottom: 0;
                        margin-right: 16px;
                        flex-shrink: 0;
                    }
                    .seller-info {
                        align-items: flex-start;
                        flex: 1;
                    }
                    .seller-arrow {
                        display: block;
                        font-size: 1.2rem;
                        font-weight: bold;
                        color: var(--primary);
                        margin-left: 12px;
                    }
                }
            `}</style>

            <div className="home-wrapper">
                {/* Search Input */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 32, width: '100%', boxSizing: 'border-box' }}>
                    <input
                        type="text"
                        placeholder={isViewingSellers ? "Search creators by name or academy..." : "Search notes, subjects, or courses..."}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{ width: '100%', padding: '14px 18px', borderRadius: 12, border: '1px solid var(--border)', fontSize: '1rem', outline: 'none', background: 'var(--surface)', color: 'var(--text-primary)', boxSizing: 'border-box' }}
                    />

                    {/* Filter Chips */}
                    <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, width: '100%', boxSizing: 'border-box', WebkitOverflowScrolling: 'touch' }}>
                        {filterOptions.map(opt => (
                            <button
                                key={opt.key}
                                onClick={() => setSelectedTab(opt.key)}
                                style={{
                                    background: selectedTab === opt.key ? 'var(--primary)' : 'var(--surface-secondary, #F0F2F5)',
                                    color: selectedTab === opt.key ? 'white' : 'var(--text-primary)',
                                    border: 'none',
                                    padding: '8px 16px',
                                    borderRadius: 20,
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap',
                                    flexShrink: 0
                                }}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content Feed Grid / List */}
                {isLoading ? (
                    <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-secondary)' }}>Loading...</div>
                ) : isViewingSellers ? (
                    searchQuery.length < 2 ? (
                        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-secondary)' }}>
                            <p style={{ fontSize: '2rem', marginBottom: '8px' }}>🔍</p>
                            <p style={{ fontWeight: 600, fontSize: '1.1rem', color: 'var(--text-primary)' }}>Type at least two characters</p>
                            <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>Search creators by name or academy</p>
                        </div>
                    ) : sellers.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-secondary)' }}>
                            <p style={{ fontSize: '2rem', marginBottom: '8px' }}>📭</p>
                            <p style={{ fontWeight: 600, fontSize: '1.1rem', color: 'var(--text-primary)' }}>No results found for "{searchQuery}"</p>
                        </div>
                    ) : (
                        <div className="sellers-container">
                            {sellers.map(seller => (
                                <div
                                    key={seller.id}
                                    onClick={() => navigate(`/sellers/${seller.id}`)}
                                    className="seller-card-item"
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                                        <div style={{ width: 60, height: 60, borderRadius: '50%', overflow: 'hidden', margin: '0 auto 12px auto', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            {seller.avatar_url ? (
                                                <img 
                                                    src={seller.avatar_url.startsWith('http') ? seller.avatar_url : seller.avatar_url} 
                                                    alt={seller.name} 
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                />
                                            ) : (
                                                <span style={{ color: 'var(--primary)', fontSize: '1.5rem', fontWeight: 800 }}>
                                                    {seller.name.charAt(0).toUpperCase()}
                                                </span>
                                            )}
                                        </div>
                                        <div className="seller-info" style={{ marginLeft: '16px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>{seller.name}</h3>
                                                {seller.verification_status === 'approved' && seller.account_type !== 'student' && (
                                                    <span style={{ color: 'var(--primary)', fontWeight: 'bold', fontSize: '0.9rem' }}>✓</span>
                                                )}
                                            </div>
                                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '2px 0 0 0', textTransform: 'capitalize' }}>
                                                {seller.account_type === 'business' ? 'Business' : seller.account_type === 'creator' ? 'YouTube Creator' : 'Student Seller'}
                                            </p>
                                        </div>
                                        <div className="seller-arrow">›</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )
                ) : (
                    notes.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-secondary)' }}>
                            <p style={{ fontSize: '2rem', marginBottom: '8px' }}>📭</p>
                            <p style={{ fontWeight: 600, fontSize: '1.1rem', color: 'var(--text-primary)' }}>
                                {searchQuery.length >= 2 ? `No results found for "${searchQuery}"` : "No notes found."}
                            </p>
                        </div>
                    ) : (
                        <div className="content-grid">
                            {notes.map((note) => (
                                <NoteCard key={note.id} note={note} />
                            ))}
                        </div>
                    )
                )}
            </div>
        </div>
    );
}