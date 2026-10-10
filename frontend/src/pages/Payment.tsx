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

  // Promo Code States
  const [isPromoOpen, setIsPromoOpen] = useState(false); // Controls collapsed/expanded input view
  const [promoInput, setPromoInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<{
    code: string;
    discountPercentage: number;
    discountAmount: number;
    finalPrice: number;
  } | null>(null);
  const [isValidatingPromo, setIsValidatingPromo] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);

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

  const handleApplyPromo = async () => {
    if (!promoInput.trim()) return;
    setIsValidatingPromo(true);
    setPromoError(null);

    try {
      const res = await api.post('/payments/validate-promo', {
        code: promoInput.trim(),
        noteId: id
      });
      // Overwrites any existing promo code — guarantees NO stacking
      setAppliedPromo(res.data);
      setPromoInput('');
      setIsPromoOpen(false); // Collapse input on successful apply
    } catch (err: any) {
      setPromoError(err.response?.data?.error || 'Invalid promo code');
      setAppliedPromo(null);
    } finally {
      setIsValidatingPromo(false);
    }
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoError(null);
    setPromoInput('');
  };

  const handleRazorpayPayment = async () => {
    setIsCreatingOrder(true);
    setError(null);

    if (!(window as any).Razorpay) {
      setError('Razorpay SDK failed to load. Please check your internet connection.');
      setIsCreatingOrder(false);
      return;
    }

    try {
      const res = await api.post('/payments/create-order', {
        noteId: id,
        promoCode: appliedPromo?.code || null
      });
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
            await api.post('/payments/verify', {
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature
            });
            navigate(`/payment-success/${id}`);
          } catch (verifyErr) {
            setError('Payment verification failed. Please contact support.');
          }
        },
        theme: { color: '#1A73E8' }
      };

      const rzp = new (window as any).Razorpay(options);
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
        <p style={{ color: 'var(--error, #EA4335)', fontWeight: 600 }}>{error}</p>
        <Link to={`/notes/${id}`} style={{ color: 'var(--primary, #1A73E8)', display: 'inline-block', marginTop: 16 }}>
          ← Back to note
        </Link>
      </div>
    );
  }

  const originalPrice = Math.round(note?.price || 0);
  const finalPayable = appliedPromo ? appliedPromo.finalPrice : originalPrice;

  return (
    <div style={{ maxWidth: 600, margin: '40px auto', padding: '0 16px' }}>
      <button
  type="button"
  onClick={() => navigate(-1)}
  style={{
    background: 'none',
    border: 'none',
    padding: 0,
    color: 'var(--primary, #1A73E8)',
    fontWeight: 600,
    fontSize: '0.95rem',
    cursor: 'pointer',
    display: 'inline-block',
    marginBottom: 20
  }}
>
  ← Back
</button>

      <div
        style={{
          background: 'var(--surface, #fff)',
          borderRadius: 16,
          border: '1px solid var(--border, #E5E7EB)',
          padding: 32,
          boxShadow: 'var(--shadow-sm, 0 1px 3px rgba(0,0,0,0.1))'
        }}
      >
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 20 }}>Order Summary</h1>

        {/* Note Card Breakdown */}
        <div
          style={{
            background: 'var(--surface-secondary, #F8F9FA)',
            padding: 20,
            borderRadius: 12,
            border: '1px solid var(--border, #E5E7EB)',
            marginBottom: 20
          }}
        >
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 6px 0' }}>{note?.title}</h3>
          <p style={{ color: 'var(--text-secondary, #5F6368)', fontSize: '0.85rem', margin: '0 0 4px 0' }}>
            by {note?.seller?.name || ''}
          </p>
          <p style={{ color: 'var(--text-secondary, #5F6368)', fontSize: '0.85rem', margin: 0 }}>
            {note?.page_count} pages
          </p>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border, #E5E7EB)', margin: '16px 0' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.95rem' }}>
            <span>Listing Price</span>
            <span>₹{originalPrice}</span>
          </div>

          {appliedPromo && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                color: '#137333',
                fontWeight: 600,
                marginBottom: 8,
                fontSize: '0.95rem'
              }}
            >
              <span>Promo ({appliedPromo.code} - {appliedPromo.discountPercentage}%)</span>
              <span>-₹{appliedPromo.discountAmount}</span>
            </div>
          )}

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 12,
              paddingTop: 12,
              borderTop: '1px solid var(--border, #E5E7EB)'
            }}
          >
            <span style={{ fontWeight: 700, fontSize: '1.05rem' }}>Total Payable</span>
            <span style={{ fontWeight: 800, fontSize: '1.4rem', color: 'var(--primary, #1A73E8)' }}>
              ₹{finalPayable}
            </span>
          </div>
        </div>

        {/* Promo Code Section */}
        <div style={{ marginBottom: 24 }}>
          {appliedPromo ? (
            /* 1. Applied State */
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#E6F4EA',
                padding: '10px 14px',
                borderRadius: 10,
                gap: 8,
                flexWrap: 'wrap'
              }}
            >
              <span style={{ color: '#137333', fontWeight: 600, fontSize: '0.88rem' }}>
                ✓ <strong>{appliedPromo.code}</strong> applied ({appliedPromo.discountPercentage}% off)
              </span>
              <button
                type="button"
                onClick={handleRemovePromo}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#EA4335',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  padding: '4px 0'
                }}
              >
                Remove
              </button>
            </div>
          ) : !isPromoOpen ? (
            /* 2. Collapsed State: Clickable link/button */
            <button
              type="button"
              onClick={() => {
                setIsPromoOpen(true);
                setPromoError(null);
              }}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                color: 'var(--primary, #1A73E8)',
                fontWeight: 600,
                fontSize: '0.95rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <span>🏷️</span> Apply a PROMO code
            </button>
          ) : (
            /* 3. Expanded State: Mobile-safe with minWidth: 0 */
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%' }}>
                {/* Input container */}
                <div
                  style={{
                    flex: 1,
                    minWidth: 0, // 👈 Fix: allows flex child to shrink below native input width
                    display: 'flex',
                    alignItems: 'center',
                    border: '1px solid var(--border, #ddd)',
                    borderRadius: 10,
                    padding: '0 8px 0 12px',
                    background: '#fff'
                  }}
                >
                  <input
                    type="text"
                    placeholder="PROMO CODE"
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                    autoFocus
                    style={{
                      flex: 1,
                      minWidth: 0, // 👈 Fix: crucial for mobile shrink
                      padding: '11px 0',
                      border: 'none',
                      fontSize: '0.9rem',
                      outline: 'none',
                      textTransform: 'uppercase',
                      background: 'transparent'
                    }}
                  />
                  {promoInput && (
                    <button
                      type="button"
                      onClick={() => setPromoInput('')}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#999',
                        fontSize: '1rem',
                        cursor: 'pointer',
                        padding: '0 4px'
                      }}
                    >
                      ×
                    </button>
                  )}
                </div>

                {/* Apply Button */}
                <button
                  type="button"
                  onClick={handleApplyPromo}
                  disabled={isValidatingPromo || !promoInput.trim()}
                  style={{
                    padding: '11px 16px',
                    borderRadius: 10,
                    border: 'none',
                    background: '#111',
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: '0.88rem',
                    cursor: isValidatingPromo || !promoInput.trim() ? 'not-allowed' : 'pointer',
                    opacity: isValidatingPromo || !promoInput.trim() ? 0.6 : 1,
                    whiteSpace: 'nowrap',
                    flexShrink: 0
                  }}
                >
                  {isValidatingPromo ? '...' : 'Apply'}
                </button>

                {/* Close / Cancel Button */}
                <button
                  type="button"
                  onClick={() => {
                    setIsPromoOpen(false);
                    setPromoError(null);
                    setPromoInput('');
                  }}
                  title="Close"
                  style={{
                    padding: '8px 10px',
                    borderRadius: 8,
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--text-secondary, #666)',
                    fontSize: '1.1rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    flexShrink: 0,
                    lineHeight: 1
                  }}
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {promoError && (
            <p style={{ color: '#EA4335', fontSize: '0.82rem', margin: '6px 0 0 4px', fontWeight: 500 }}>
              {promoError}
            </p>
          )}
        </div>

        {error && (
          <div
            style={{
              background: 'var(--error-container, #FDE8E8)',
              color: 'var(--error, #EA4335)',
              padding: 12,
              borderRadius: 8,
              fontSize: '0.85rem',
              marginBottom: 20,
              fontWeight: 600
            }}
          >
            {error}
          </div>
        )}

        <button
          onClick={handleRazorpayPayment}
          disabled={isCreatingOrder}
          className="btn-primary"
          style={{ width: '100%', marginBottom: 16 }}
        >
          {isCreatingOrder ? 'Processing...' : `Pay ₹${finalPayable} with Razorpay`}
        </button>

        <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-secondary, #5F6368)', margin: 0 }}>
          🔒 Secured by Razorpay
        </p>
      </div>
    </div>
  );
}