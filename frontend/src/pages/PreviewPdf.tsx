import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import * as pdfjsLib from 'pdfjs-dist';

// Point to jsDelivr CDN syncing with installed pdfjs-dist version
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

export default function PreviewPdf() {
    const { id } = useParams<{ id: string }>();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [pageCount, setPageCount] = useState(0);
    
    const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
    const renderTasksRef = useRef<any[]>([]);

    const buyerName = user?.name || 'Guest User';
    const buyerPhone = user?.phone || 'EduCrit Web';

    useEffect(() => {
        if (!id) return;
        let isCancelled = false;

        const loadPreview = async () => {
            try {
                setLoading(true);
                setError('');

                // 1. Fetch the preview URL from the backend
                const res = await api.get(`/notes/${id}/preview-url`);
                const url = res.data?.previewUrl || res.data?.url;

                if (isCancelled) return;

                if (!url) {
                    setError('No preview available for this note');
                    setLoading(false);
                    return;
                }

                // 2. Load the PDF document via PDF.js
                const loadingTask = pdfjsLib.getDocument({ url });
                const pdf = await loadingTask.promise;

                if (isCancelled) return;

                setPageCount(pdf.numPages);
                setLoading(false);

                // 3. Render each page onto its canvas element sequentially
                for (let i = 1; i <= pdf.numPages; i++) {
                    if (isCancelled) break;

                    const page = await pdf.getPage(i);
                    const canvas = canvasRefs.current[i - 1];
                    if (!canvas) continue;

                    const viewport = page.getViewport({ scale: 1.5 });
                    canvas.width = viewport.width;
                    canvas.height = viewport.height;

                    const ctx = canvas.getContext('2d');
                    if (!ctx) continue;

                    // Cancel any previous active render task on this canvas
                    if (renderTasksRef.current[i - 1]) {
                        try {
                            renderTasksRef.current[i - 1].cancel();
                        } catch (e) {
                            // Ignore cancellation exceptions from previous runs
                        }
                    }

                    const renderTask = page.render({ canvasContext: ctx, viewport, canvas });
                    renderTasksRef.current[i - 1] = renderTask;

                    try {
                        await renderTask.promise;
                        if (!isCancelled) {
                            drawWatermark(ctx, canvas.width, canvas.height, buyerName, buyerPhone);
                        }
                    } catch (renderErr: any) {
                        if (renderErr?.name !== 'RenderingCancelledException') {
                            console.error(`Page ${i} render error:`, renderErr);
                        }
                    }
                }
            } catch (err: any) {
                if (!isCancelled) {
                    console.error("PDF Preview Load Error:", err);
                    setError(`Preview Error: ${err.message || 'Failed to load document preview'}`);
                    setLoading(false);
                }
            }
        };

        loadPreview();

        return () => {
            isCancelled = true;
            // Cleanup and cancel any active render tasks on unmount
            renderTasksRef.current.forEach(task => {
                if (task) {
                    try { task.cancel(); } catch (e) {}
                }
            });
        };
    }, [id, buyerName, buyerPhone]);

    const drawWatermark = (ctx: CanvasRenderingContext2D, w: number, h: number, name: string, phone: string) => {
        ctx.save();
        ctx.globalAlpha = 0.08;
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 18px Arial';
        const hMargin = w * 0.12;
        ctx.fillText(name, hMargin, h * 0.08);
        const phoneWidth = ctx.measureText(phone).width;
        ctx.fillText(phone, w - phoneWidth - hMargin, h * 0.08);
        ctx.fillText(phone, hMargin, h * 0.92);
        const nameWidth = ctx.measureText(name).width;
        ctx.fillText(name, w - nameWidth - hMargin, h * 0.92);
        ctx.restore();
    };

    if (loading) return <LoadingSpinner message="Loading document preview..." />;

    if (error) {
        return (
            <div style={{ textAlign: 'center', padding: '80px 20px', maxWidth: 600, margin: '0 auto' }}>
                <p style={{ fontSize: '3rem', marginBottom: 12 }}>⚠️</p>
                <p style={{ color: '#d32f2f', fontSize: '1.05rem', fontWeight: 600, marginBottom: 20, wordBreak: 'break-word' }}>
                    {error}
                </p>
                <Link
                    to={`/notes/${id}`}
                    style={{
                        color: '#1A73E8',
                        background: '#E8F0FE',
                        padding: '10px 20px',
                        borderRadius: 10,
                        fontWeight: 600,
                        textDecoration: 'none',
                        display: 'inline-block'
                    }}
                >
                    ← Back to note details
                </Link>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <Link to={`/notes/${id}`} style={{ color: '#1A73E8', fontWeight: 600, textDecoration: 'none' }}>
                    ← Back to Note
                </Link>
                <span style={{ background: '#FFF3E0', color: '#E65100', padding: '6px 14px', borderRadius: 20, fontSize: '0.85rem', fontWeight: 600 }}>
                    Preview — {pageCount} free pages
                </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {Array.from({ length: pageCount }).map((_, i) => (
                    <div
                        key={i}
                        style={{
                            borderRadius: 12,
                            overflow: 'hidden',
                            boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                            userSelect: 'none',
                            background: 'white'
                        }}
                    >
                        <canvas
                            ref={el => { canvasRefs.current[i] = el; }}
                            style={{ width: '100%', display: 'block' }}
                        />
                    </div>
                ))}
            </div>

            <div style={{
                background: 'linear-gradient(135deg, #1A73E8, #0d47a1)',
                borderRadius: 20,
                padding: '36px 24px',
                textAlign: 'center',
                marginTop: 40,
                color: 'white',
                boxShadow: '0 8px 24px rgba(26,115,232,0.2)'
            }}>
                <p style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: 8 }}>End of Preview</p>
                <p style={{ opacity: 0.9, marginBottom: 24, fontSize: '1rem' }}>
                    Purchase this note to unlock all pages and view it directly inside your EduCrit mobile app library!
                </p>
                <Link
                    to={`/notes/${id}`}
                    style={{
                        background: 'white',
                        color: '#1A73E8',
                        padding: '14px 32px',
                        borderRadius: 12,
                        fontWeight: 700,
                        fontSize: '1rem',
                        display: 'inline-block',
                        textDecoration: 'none',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }}
                >
                    Buy this Note Now →
                </Link>
            </div>

            <style>{`canvas { pointer-events: none; }`}</style>
        </div>
    );
}