import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';

export default function Login() {
    const [phone, setPhone] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleSendOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (phone.length !== 10) {
            setError('Enter a valid 10-digit mobile number');
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            await api.post('/auth/send-otp', { phone });
            navigate(`/otp/${phone}`);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to send OTP. Please try again.');
        }
        setIsLoading(false);
    };

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            width: '100%',
            boxSizing: 'border-box',
            padding: '16px'
        }}>
            <div style={{ 
                maxWidth: 420, 
                width: '100%', 
                boxSizing: 'border-box',
                padding: '32px 24px', 
                background: 'white', 
                borderRadius: 16, 
                border: '1px solid #eaeaea', 
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)' 
            }}>
                <h1 style={{ fontSize: '1.15rem', fontWeight: 500, marginBottom: 8, color: '#111' }}>Enter your mobile number</h1>
                <p style={{ color: '#666', fontSize: '0.95rem', marginBottom: 32 }}>We'll send a verification code via WhatsApp</p>

                <form onSubmit={handleSendOtp}>
                    <div style={{ marginBottom: 10 }}>
                         
                        <div style={{ display: 'flex', gap: 8, width: '100%', boxSizing: 'border-box' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5', border: '1px solid #ddd', borderRadius: 12, padding: '0 14px', fontWeight: 600, fontSize: '0.95rem', flexShrink: 0 }}>
                                +91
                            </div>
                            <input
                                type="text"
                                maxLength={10}
                                placeholder="Mobile Number"
                                value={phone}
                                onChange={(e) => {
                                    setPhone(e.target.value.replace(/\D/g, ''));
                                    setError(null);
                                }}
                                style={{ 
                                    flex: 1, 
                                    minWidth: 0, 
                                    boxSizing: 'border-box',
                                    padding: '12px 16px', 
                                    borderRadius: 12, 
                                    border: '1px solid #ddd', 
                                    fontSize: '1rem', 
                                    outline: 'none' 
                                }}
                            />
                        </div>
                    </div>

                    {error && (
                        <div style={{ padding: '10px 14px', background: '#FCE8E6', color: '#C5221F', borderRadius: 8, fontSize: '0.85rem', marginBottom: 20 }}>
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading || phone.length !== 10}
                        style={{
                            width: '100%',
                            background: '#1A73E8',
                            color: 'white',
                            border: 'none',
                            padding: '14px',
                            borderRadius: 12,
                            fontWeight: 600,
                            fontSize: '1rem',
                            cursor: 'pointer',
                            opacity: isLoading || phone.length !== 10 ? 0.7 : 1
                        }}
                    >
                        {isLoading ? 'Sending...' : 'Send OTP'}
                    </button>
                </form>
            </div>
        </div>
    );
}