import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../contexts/AuthContext';

export default function OtpVerification() {
    const { phone } = useParams<{ phone: string }>();
    const [otp, setOtp] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [resendTimer, setResendTimer] = useState(15);
    const [isResending, setIsResending] = useState(false);
    const [resendSuccess, setResendSuccess] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        let timer: number;
        if (resendTimer > 0) {
            timer = window.setInterval(() => {
                setResendTimer((prev) => prev - 1);
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [resendTimer]);

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (otp.length !== 6) {
            setError('Please enter the complete 6-digit verification code');
            return;
        }

        setIsLoading(true);
        setError(null);
        try {
            const response = await api.post('/auth/verify-otp', { phone, code: otp });
            
            if (response.data && response.data.token && response.data.user) {
                login(response.data.token, response.data.user);
                navigate('/');
            } else {
                setError('Authentication response was invalid.');
            }
        } catch (err: any) {
            setError(err.response?.data?.error || 'Invalid OTP. Please try again.');
        }
        setIsLoading(false);
    };

    const handleResendOtp = async () => {
        if (resendTimer > 0 || isResending) return;
        setIsResending(true);
        setError(null);
        setResendSuccess(false);
        try {
            await api.post('/auth/send-otp', { phone });
            setResendTimer(15);
            setResendSuccess(true);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to resend OTP. Please try again.');
        }
        setIsResending(false);
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
                padding: '32px 20px', 
                background: 'white', 
                borderRadius: 16, 
                border: '1px solid #eaeaea', 
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)', 
                textAlign: 'left',
                overflow: 'hidden'
            }}>
                <h1 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 8, color: '#111' }}>Enter verification code</h1>
                <p style={{ color: '#666', fontSize: '0.95rem', marginBottom: 32, wordBreak: 'break-word' }}>
                    We sent a code via WhatsApp to <span style={{ fontWeight: 600, color: '#111' }}>+91 {phone}</span>
                </p>

                <form onSubmit={handleVerifyOtp} style={{ width: '100%', boxSizing: 'border-box' }}>
                    <div style={{ marginBottom: 24, width: '100%' }}>
                        <input
                            type="text"
                            maxLength={6}
                            placeholder="Enter 6-digit OTP"
                            value={otp}
                            onChange={(e) => {
                                setOtp(e.target.value.replace(/\D/g, ''));
                                setError(null);
                            }}
                            style={{
                                width: '100%',
                                boxSizing: 'border-box',
                                padding: '14px 16px',
                                borderRadius: 12,
                                border: '1px solid #ddd',
                                fontSize: '1.25rem',
                                letterSpacing: '1px',
                                textAlign: 'left',
                                outline: 'none'
                            }}
                        />
                    </div>

                    {error && (
                        <div style={{ padding: '10px 14px', background: '#FCE8E6', color: '#C5221F', borderRadius: 8, fontSize: '0.85rem', marginBottom: 20, textAlign: 'left' }}>
                            {error}
                        </div>
                    )}

                    {resendSuccess && (
                        <div style={{ padding: '10px 14px', background: '#E6F4EA', color: '#137333', borderRadius: 8, fontSize: '0.85rem', marginBottom: 20, textAlign: 'left' }}>
                            New verification code sent successfully!
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading || otp.length !== 6}
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
                            opacity: isLoading || otp.length !== 6 ? 0.7 : 1,
                            boxSizing: 'border-box',
                            marginBottom: 20
                        }}
                    >
                        {isLoading ? 'Verifying...' : 'Verify'}
                    </button>

                    <div style={{ textAlign: 'center', fontSize: '0.9rem', color: '#666' }}>
                        Didn't receive the code?{' '}
                        <button
                            type="button"
                            onClick={handleResendOtp}
                            disabled={resendTimer > 0 || isResending}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: resendTimer > 0 ? '#999' : '#1A73E8',
                                fontWeight: 600,
                                cursor: resendTimer > 0 ? 'not-allowed' : 'pointer',
                                padding: 0,
                                fontSize: '0.9rem'
                            }}
                        >
                            {resendTimer > 0 ? `Resend in ${resendTimer}s` : (isResending ? 'Sending...' : 'Resend')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}