import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import LoadingSpinner from '../../components/LoadingSpinner';

interface PromoCode {
  id: string;
  code: string;
  discount_percentage: number;
  valid_from: string;
  valid_until: string;
  is_active: boolean;
  used_count: number;
  total_subsidy: number;
  created_at: string;
}

export default function AdminPromos() {
  const [promos, setPromos] = useState<PromoCode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form inputs
  const [code, setCode] = useState('');
  const [discount, setDiscount] = useState('10');
  const [validUntil, setValidUntil] = useState('');

  const fetchPromos = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/admin/promos');
      setPromos(res.data.promos || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch promo codes');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPromos();
  }, []);

  const handleCreatePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const discountVal = parseFloat(discount);
    if (isNaN(discountVal) || discountVal <= 0 || discountVal > 10) {
      setError('Discount must be between 1% and 10%');
      return;
    }

    if (!validUntil) {
      setError('Please select an expiration date');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.post('/admin/promos', {
        code: code.trim().toUpperCase(),
        discount_percentage: discountVal,
        valid_until: new Date(validUntil).toISOString(),
      });

      setSuccess(res.data.message || 'Promo code created successfully!');
      setCode('');
      setDiscount('10');
      setValidUntil('');
      fetchPromos();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create promo code');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    setError(null);
    try {
      await api.patch(`/admin/promos/${id}/toggle`, {
        is_active: !currentStatus,
      });
      setPromos((prev) =>
        prev.map((p) => (p.id === id ? { ...p, is_active: !currentStatus } : p))
      );
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to toggle status');
    }
  };

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '24px 16px' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '0 0 6px' }}>
          Promo Codes Management
        </h1>
        <p style={{ color: 'var(--text-secondary, #666)', fontSize: '0.9rem', margin: 0 }}>
          Create and manage customer discounts. All discounts are deducted solely from platform commission and capped at 10%.
        </p>
      </div>

      {error && (
        <div style={{ background: '#FDE8E8', color: '#EA4335', padding: '12px 16px', borderRadius: 10, fontSize: '0.88rem', fontWeight: 600, marginBottom: 20 }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{ background: '#E6F4EA', color: '#137333', padding: '12px 16px', borderRadius: 10, fontSize: '0.88rem', fontWeight: 600, marginBottom: 20 }}>
          {success}
        </div>
      )}

      {/* CREATE FORM CARD */}
      <div style={{ background: 'var(--surface, #fff)', border: '1px solid var(--border, #eaeaea)', borderRadius: 14, padding: 24, marginBottom: 32, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 16px' }}>
          Create New Promo Code
        </h2>
        <form onSubmit={handleCreatePromo} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, alignItems: 'flex-end' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 6 }}>
              Code Name
            </label>
            <input
              type="text"
              placeholder="e.g. SEMESTER10"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              required
              style={inputStyle}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 6 }}>
              Discount % (Max 10%)
            </label>
            <input
              type="number"
              min="1"
              max="10"
              step="0.5"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              required
              style={inputStyle}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 6 }}>
              Expires At
            </label>
            <input
              type="datetime-local"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
              required
              style={inputStyle}
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '12px',
                background: '#1A73E8',
                color: 'white',
                border: 'none',
                borderRadius: 10,
                fontWeight: 600,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                opacity: isSubmitting ? 0.7 : 1,
              }}
            >
              {isSubmitting ? 'Creating...' : '+ Create Code'}
            </button>
          </div>
        </form>
      </div>

      {/* TABLE LIST */}
      <div style={{ background: 'var(--surface, #fff)', border: '1px solid var(--border, #eaeaea)', borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border, #eaeaea)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>Existing Codes</h3>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary, #666)' }}>{promos.length} codes listed</span>
        </div>

        {isLoading ? (
          <div style={{ padding: 40 }}><LoadingSpinner message="Loading promos..." /></div>
        ) : promos.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#888', fontSize: '0.9rem' }}>No promo codes created yet.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ background: 'var(--surface-secondary, #f8f9fa)', borderBottom: '1px solid var(--border, #eaeaea)' }}>
                  <th style={thStyle}>Code</th>
                  <th style={thStyle}>Discount</th>
                  <th style={thStyle}>Valid Until</th>
                  <th style={thStyle}>Times Used</th>
                  <th style={thStyle}>Total Subsidized</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Action</th>
                </tr>
              </thead>
              <tbody>
                {promos.map((p) => {
                  const isExpired = new Date(p.valid_until) < new Date();
                  return (
                    <tr key={p.id} style={{ borderBottom: '1px solid var(--border, #f1f1f1)' }}>
                      <td style={{ ...tdStyle, fontWeight: 700, letterSpacing: '0.5px' }}>{p.code}</td>
                      <td style={tdStyle}>{p.discount_percentage}%</td>
                      <td style={tdStyle}>
                        {new Date(p.valid_until).toLocaleDateString()} {new Date(p.valid_until).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {isExpired && <span style={{ marginLeft: 6, fontSize: '0.72rem', background: '#FCE8E6', color: '#C5221F', padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>EXPIRED</span>}
                      </td>
                      <td style={tdStyle}>{p.used_count}</td>
                      <td style={{ ...tdStyle, fontWeight: 600 }}>₹{p.total_subsidy}</td>
                      <td style={tdStyle}>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: 6,
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          background: p.is_active && !isExpired ? '#E6F4EA' : '#F1F3F4',
                          color: p.is_active && !isExpired ? '#137333' : '#5F6368',
                        }}>
                          {p.is_active && !isExpired ? 'ACTIVE' : !p.is_active ? 'DISABLED' : 'EXPIRED'}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(p.id, p.is_active)}
                          style={{
                            background: 'none',
                            border: '1px solid var(--border, #ddd)',
                            padding: '4px 10px',
                            borderRadius: 6,
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            color: p.is_active ? '#EA4335' : '#1A73E8',
                          }}
                        >
                          {p.is_active ? 'Disable' : 'Enable'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '11px 13px',
  borderRadius: 10,
  border: '1px solid var(--border, #ddd)',
  fontSize: '0.9rem',
  background: 'var(--surface, #fff)',
  outline: 'none',
  boxSizing: 'border-box',
};

const thStyle: React.CSSProperties = {
  padding: '12px 18px',
  color: 'var(--text-secondary, #555)',
  fontWeight: 600,
  fontSize: '0.82rem',
};

const tdStyle: React.CSSProperties = {
  padding: '14px 18px',
};