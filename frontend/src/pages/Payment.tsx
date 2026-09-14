import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api/client';
import LoadingSpinner from '../components/LoadingSpinner';

export default function Payment() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    
    const [isLoading, setIsLoading] = useState(true);
    const [isCreatingOrder, setIsCreatingOrder] = useState(false);
    const [note, setNote] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchNote = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const response = await api.get(`/notes/${id}`);
                if (response.data && response.data.note) {
                    setNote(response.data.note);
                } else {
                    setError('Note not found');
                }
            } catch (err: any) {
                setError(err.response?.data?.error || 'Failed to load note details.');
            } finally {
                setIsLoading(false);
            }
        };

        if (id) {
            fetchNote();
        }
    }, [id]);

    // const handleRazorpayPayment = async () => {
    //     setIsCreatingOrder(true);
    //     setError(null);

    //     try {
    //         // 1. Create order on backend (matches Android createOrder endpoint)
    //         const res = await api.post('/payments/create-order', { noteId: id });
    //         const { order_id, key_id, amount } = res.data;

    //         const options = {
    //             key: key_id,
    //             amount: amount,
    //             currency: 'INR',
    //             order_id: order_id,
    //             name: 'EduCrit',
    //             description: note?.title || 'Notes',
    //             handler: async (response: any) => {
    //                 try {
    //                     // 2. Verify payment signature on backend
    //                     await api.post('/payments/verify', {
    //                         razorpay_order_id: response.razorpay_order_id,
    //                         razorpay_payment_id: response.razorpay_payment_id,
    //                         razorpay_signature: response.razorpay_signature,
    //                         note_id: id
    //                     });
    //                     // 3. Redirect to success view
    //                     navigate(`/payment-success/${id}`);
    //                 } catch (verifyErr) {
    //                     setError('Payment verification failed. Please contact support.');
    //                 }
    //             },
    //             theme: { color: '#1A73E8' }
    //         };

    //         const rzp = new window.Razorpay(options);
    //         rzp.open();
    //     } catch (err: any) {
    //         const status = err.response?.status;
    //         const msg = err.response?.data?.error;
    //         if (status === 409) {
    //             setError('You have already purchased this note');
    //         } else if (status === 400) {
    //             setError('Cannot buy your own note');
    //         } else {
    //             setError(msg || 'Failed to initialize Razorpay checkout.');
    //         }
    //     } finally {
    //         setIsCreatingOrder(false);
    //     }
    // };

    const handleRazorpayPayment = async () => {
        setIsCreatingOrder(true);
        setError(null);

        // Ensure the Razorpay script has loaded onto the window object
        if (!window.Razorpay) {
            setError('Razorpay SDK failed to load. Please check your internet connection.');
            setIsCreatingOrder(false);
            return;
        }

        try {
            // 1. Create order on backend (using correct noteId key)
            const res = await api.post('/payments/create-order', { noteId: id });
            const { orderId, keyId, amount } = res.data.order;

            const options = {
                key: keyId,
                amount: amount,
                currency: 'INR',
                order_id: orderId,
                name: 'EduCrit',
                description: note?.title || 'Notes',
                handler: async (response: any) => {
                    try {
                        // 2. Verify payment signature on backend
                        await api.post('/payments/verify', {
                            orderId: response.razorpay_order_id,
                            paymentId: response.razorpay_payment_id,
                            signature: response.razorpay_signature
                        });
                        // 3. Redirect to success view
                        navigate(`/payment-success/${id}`);
                    } catch (verifyErr) {
                        setError('Payment verification failed. Please contact support.');
                    }
                },
                theme: { color: '#1A73E8' }
            };

            const rzp = new window.Razorpay(options);
            rzp.open();
        } catch (err: any) {
            const status = err.response?.status;
            const msg = err.response?.data?.error;
            if (status === 409) {
                setError('You have already purchased this note');
            } else if (status === 400) {
                setError(msg || 'Cannot buy your own note');
            } else {
                setError(msg || 'Failed to initialize Razorpay checkout.');
            }
        } finally {
            setIsCreatingOrder(false);
        }
    };

    if (isLoading) return <LoadingSpinner message="Loading..." />;
    if (error && !note) {
        return (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <p style={{ color: 'var(--error)', fontWeight: 600 }}>{error}</p>
                <Link to={`/notes/${id}`} style={{ color: 'var(--primary)', display: 'inline-block', marginTop: 16 }}>← Back to note</Link>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: 600, margin: '40px auto', padding: '0 16px' }}>
            <Link to={`/notes/${id}`} style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none', display: 'inline-block', marginBottom: 20 }}>
                ← Back
            </Link>

            <div style={{ background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--border)', padding: 32, boxShadow: 'var(--shadow-sm)' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 20 }}>Order Summary</h1>

                {/* Note Card Breakdown */}
                <div style={{ background: 'var(--surface-secondary, #F8F9FA)', padding: 20, borderRadius: 12, border: '1px solid var(--border)', marginBottom: 20 }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 6px 0' }}>{note?.title}</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0 0 4px 0' }}>by {note?.seller?.name || ''}</p>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>{note?.page_count} pages</p>
                    
                    <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '16px 0' }} />

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 700, fontSize: '1.05rem' }}>Total</span>
                        <span style={{ fontWeight: 800, fontSize: '1.4rem', color: 'var(--primary)' }}>₹{Math.round(note?.price || 0)}</span>
                    </div>
                </div>

                {error && (
                    <div style={{ background: 'var(--error-container, #FDE8E8)', color: 'var(--error, #EA4335)', padding: 12, borderRadius: 8, fontSize: '0.85rem', marginBottom: 20, fontWeight: 600 }}>
                        {error}
                    </div>
                )}

                <button
                    onClick={handleRazorpayPayment}
                    disabled={isCreatingOrder}
                    className="btn-primary"
                    style={{ width: '100%', marginBottom: 16 }}
                >
                    {isCreatingOrder ? 'Processing...' : `Pay ₹${Math.round(note?.price || 0)} with Razorpay`}
                </button>

                <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                    🔒 Secured by Razorpay
                </p>
            </div>
        </div>
    );
}