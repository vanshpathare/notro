import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { sendEmailOtp, verifyEmailRegister } from '../api/client';
import { useAuth } from '../contexts/AuthContext';

type AccountType = 'student' | 'business' | 'youtube';

interface AccountOption {
    type: AccountType;
    emoji: string;
    title: string;
    description: string;
}

const ACCOUNT_OPTIONS: AccountOption[] = [
    {
        type: 'student',
        emoji: '🎓',
        title: 'Student / Individual',
        description: 'Buy notes from peers. Sell your own notes.'
    },
    {
        type: 'business',
        emoji: '🏢',
        title: 'Business / Academy',
        description: 'Coaching centres, tuition classes, and academies.'
    },
    {
        type: 'youtube',
        emoji: '▶️',
        title: 'YouTube Creator',
        description: 'Content creators selling educational material.'
    }
];

export default function Register() {
    const navigate = useNavigate();
    const { login } = useAuth();

    // Steps: 1. Account Type -> 2. Phone OTP -> 3. Profile Details -> 4. Email OTP
    const [step, setStep] = useState<'type' | 'phone' | 'details' | 'email_otp'>('type');
    const [selectedType, setSelectedType] = useState<AccountType>('student');

    // Phone state
    const [phone, setPhone] = useState('');
    const [phoneOtp, setPhoneOtp] = useState('');
    const [registrationToken, setRegistrationToken] = useState<string | null>(null);
    const [phoneResendTimer, setPhoneResendTimer] = useState(0);

    // Profile details state
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [orgName, setOrgName] = useState('');

    // Email OTP state
    const [emailOtp, setEmailOtp] = useState('');
    const [emailTimer, setEmailTimer] = useState(0);

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Resend countdown timers
    useEffect(() => {
        if (phoneResendTimer <= 0) return;
        const interval = setInterval(() => setPhoneResendTimer(p => p - 1), 1000);
        return () => clearInterval(interval);
    }, [phoneResendTimer]);

    useEffect(() => {
        if (emailTimer <= 0) return;
        const interval = setInterval(() => setEmailTimer(p => p - 1), 1000);
        return () => clearInterval(interval);
    }, [emailTimer]);

    // ── STEP 1: Select Type ──
    const handleSelectType = (type: AccountType) => {
        setSelectedType(type);
        setError(null);
        setStep('phone');
    };

    // ── STEP 2A: Send Mobile OTP ──
    const handleSendPhoneOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (phone.length !== 10) return setError('Enter a valid 10-digit mobile number');
        setIsLoading(true);
        setError(null);
        try {
            await api.post('/auth/send-otp', { phone });
            setPhoneResendTimer(30);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to send OTP. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    // ── STEP 2B: Verify Mobile OTP ──
    const handleVerifyPhoneOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (phoneOtp.length !== 6) return setError('Please enter the 6-digit code');
        setIsLoading(true);
        setError(null);
        try {
            const res = await api.post('/auth/verify-otp', { phone, code: phoneOtp });
            const data = res.data;

            // If existing user, log them in straight away
            if (data.token && data.user) {
                login(data.token, data.user);
                navigate('/');
                return;
            }

            // New user registration flow
            if (data.registrationToken) {
                setRegistrationToken(data.registrationToken);
                setStep('details');
            } else {
                setError('Unable to initiate registration. Please try again.');
            }
        } catch (err: any) {
            setError(err.response?.data?.error || 'Invalid OTP code');
        } finally {
            setIsLoading(false);
        }
    };

    // ── STEP 3: Send Email OTP ──
    const handleSendEmailOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return setError('Please enter your full name');
        if (!email.trim() || !email.includes('@')) return setError('Please enter a valid email address');
        if (!orgName.trim()) {
            return setError(
                selectedType === 'student' ? 'Please enter your institute/college name' :
                selectedType === 'business' ? 'Please enter your academy/coaching name' :
                'Please enter your channel name'
            );
        }

        setIsLoading(true);
        setError(null);
        try {
            await sendEmailOtp(registrationToken!, email.trim());
            setEmailTimer(30);
            setStep('email_otp');
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to send email verification code');
        } finally {
            setIsLoading(false);
        }
    };

    // ── STEP 4: Complete Registration ──
    const handleCompleteRegistration = async (e: React.FormEvent) => {
        e.preventDefault();
        if (emailOtp.length < 4) return setError('Enter the complete verification code');

        setIsLoading(true);
        setError(null);
        try {
            const res = await verifyEmailRegister({
                registrationToken: registrationToken!,
                email: email.trim(),
                code: emailOtp.trim(),
                registrationData: {
                    name: name.trim(),
                    college: orgName.trim(),
                    account_type: selectedType
                }
            });

            if (res.data?.token && res.data?.user) {
                login(res.data.token, res.data.user);
                navigate('/');
            }
        } catch (err: any) {
            setError(err.response?.data?.error || 'Invalid or expired email code');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="register-page-container">
            <style>{`
                .register-page-container {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    min-height: calc(100vh - 64px);
                    padding: 24px 16px;
                    box-sizing: border-box;
                    width: 100%;
                }
                .register-card-box {
                    max-width: 440px;
                    width: 100%;
                    background: var(--surface, #fff);
                    border: 1px solid var(--border, #eaeaea);
                    border-radius: 20px;
                    padding: 32px 24px;
                    box-shadow: 0 8px 30px rgba(0,0,0,0.06);
                    box-sizing: border-box;
                }
                .reg-hero-icon {
                    font-size: 2.8rem;
                    margin-bottom: 8px;
                }
                .reg-title {
                    font-size: 1.5rem;
                    font-weight: 700;
                    margin: 0 0 4px;
                    color: var(--text-primary, #111);
                }
                .reg-subtitle {
                    color: var(--text-secondary, #666);
                    font-size: 0.9rem;
                    margin: 0 0 24px;
                }
                .reg-account-list {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                }
                .reg-account-card {
                    display: flex;
                    align-items: center;
                    padding: 14px 16px;
                    border-radius: 14px;
                    border: 1px solid var(--border, #e0e0e0);
                    cursor: pointer;
                    text-align: left;
                    background: var(--surface, #fff);
                    transition: all 0.15s ease;
                }
                .reg-account-card:hover {
                    border-color: #1A73E8;
                    box-shadow: 0 4px 12px rgba(26,115,232,0.08);
                }
                .reg-emoji {
                    font-size: 1.8rem;
                    margin-right: 14px;
                    flex-shrink: 0;
                }
                .reg-card-title {
                    font-weight: 600;
                    font-size: 0.95rem;
                    color: var(--text-primary, #111);
                }
                .reg-card-desc {
                    font-size: 0.8rem;
                    color: var(--text-secondary, #666);
                    margin-top: 2px;
                }

                /* 📱 Mobile Edge-to-Edge & Zero-Scroll Fit */
                @media (max-width: 640px) {
                    .register-page-container {
                        padding: 12px 16px !important;
                        min-height: calc(100dvh - 64px) !important;
                        align-items: center;
                    }
                    .register-card-box {
                        max-width: 100% !important;
                        border: none !important;
                        border-radius: 0 !important;
                        padding: 0 !important;
                        box-shadow: none !important;
                        background: transparent !important;
                    }
                    .reg-hero-icon {
                        font-size: 2.2rem !important;
                        margin-bottom: 4px !important;
                    }
                    .reg-title {
                        font-size: 1.35rem !important;
                        margin-bottom: 2px !important;
                    }
                    .reg-subtitle {
                        font-size: 0.82rem !important;
                        margin-bottom: 16px !important;
                    }
                    .reg-account-card {
                        padding: 11px 14px !important;
                        border-radius: 12px !important;
                    }
                    .reg-emoji {
                        font-size: 1.5rem !important;
                        margin-right: 12px !important;
                    }
                    .reg-card-title {
                        font-size: 0.9rem !important;
                    }
                    .reg-card-desc {
                        font-size: 0.76rem !important;
                        line-height: 1.25;
                    }
                    .reg-login-btn {
                        margin-top: 16px !important;
                    }
                }
            `}</style>

            <div className="register-card-box">
                {error && (
                    <div style={{
                        padding: '10px 14px',
                        background: '#FCE8E6',
                        color: '#C5221F',
                        borderRadius: 10,
                        fontSize: '0.85rem',
                        marginBottom: 16
                    }}>
                        {error}
                    </div>
                )}

                {/* ── 1. ACCOUNT TYPE SELECTION ── */}
                {step === 'type' && (
                    <div style={{ textAlign: 'center' }}>
                        <div className="reg-hero-icon">📚</div>
                        <h1 className="reg-title">Welcome to EduCrit</h1>
                        <p className="reg-subtitle">India's student notes marketplace</p>

                        <h2 style={{ fontSize: '0.92rem', fontWeight: 600, textAlign: 'left', marginBottom: 10, color: 'var(--text-primary, #111)' }}>
                            Select account type
                        </h2>

                        <div className="reg-account-list">
                            {ACCOUNT_OPTIONS.map(opt => (
                                <div
                                    key={opt.type}
                                    onClick={() => handleSelectType(opt.type)}
                                    className="reg-account-card"
                                >
                                    <span className="reg-emoji">{opt.emoji}</span>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div className="reg-card-title">{opt.title}</div>
                                        <div className="reg-card-desc">{opt.description}</div>
                                    </div>
                                    <span style={{ color: '#1A73E8', fontSize: '1.3rem', fontWeight: 700, marginLeft: 8 }}>›</span>
                                </div>
                            ))}
                        </div>

                        <button
                            type="button"
                            onClick={() => navigate('/login')}
                            className="reg-login-btn"
                            style={{
                                background: 'none',
                                border: 'none',
                                color: '#1A73E8',
                                fontWeight: 600,
                                fontSize: '0.88rem',
                                marginTop: 22,
                                cursor: 'pointer'
                            }}
                        >
                            Already have an account? Log in
                        </button>
                    </div>
                )}

                {/* ── 2. PHONE VERIFICATION ── */}
                {step === 'phone' && (
                    <div>
                        <button type="button" onClick={() => setStep('type')} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', marginBottom: 8, padding: 0 }}>← Back</button>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 4px', color: 'var(--text-primary, #111)' }}>Enter Mobile Number</h2>
                        <p style={{ color: 'var(--text-secondary, #666)', fontSize: '0.85rem', marginBottom: 16 }}>We'll send a WhatsApp verification code</p>

                        {!phoneResendTimer && !registrationToken ? (
                            <form onSubmit={handleSendPhoneOtp} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', background: '#f5f5f5', border: '1px solid #ddd', borderRadius: 12, padding: '0 14px', fontWeight: 600 }}>+91</div>
                                    <input
                                        type="text"
                                        maxLength={10}
                                        placeholder="Mobile Number"
                                        value={phone}
                                        onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                                        style={inputStyle}
                                        required
                                    />
                                </div>
                                <button type="submit" disabled={isLoading || phone.length !== 10} style={buttonPrimaryStyle}>
                                    {isLoading ? 'Sending...' : 'Send OTP'}
                                </button>
                            </form>
                        ) : (
                            <form onSubmit={handleVerifyPhoneOtp} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                <input
                                    type="text"
                                    maxLength={6}
                                    placeholder="Enter 6-digit OTP"
                                    value={phoneOtp}
                                    onChange={e => setPhoneOtp(e.target.value.replace(/\D/g, ''))}
                                    style={{ ...inputStyle, textAlign: 'center', fontSize: '1.2rem', letterSpacing: '2px' }}
                                    required
                                />
                                <button type="submit" disabled={isLoading || phoneOtp.length !== 6} style={buttonPrimaryStyle}>
                                    {isLoading ? 'Verifying...' : 'Verify Phone'}
                                </button>
                                <button
                                    type="button"
                                    disabled={phoneResendTimer > 0 || isLoading}
                                    onClick={handleSendPhoneOtp}
                                    style={{ background: 'none', border: 'none', color: phoneResendTimer > 0 ? '#999' : '#1A73E8', cursor: phoneResendTimer > 0 ? 'not-allowed' : 'pointer', fontSize: '0.85rem', fontWeight: 600 }}
                                >
                                    {phoneResendTimer > 0 ? `Resend OTP in ${phoneResendTimer}s` : 'Resend Code'}
                                </button>
                            </form>
                        )}
                    </div>
                )}

                {/* ── 3. PROFILE DETAILS ── */}
                {step === 'details' && (
                    <div>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 4px', color: 'var(--text-primary, #111)' }}>Personal Details</h2>
                        <p style={{ color: 'var(--text-secondary, #666)', fontSize: '0.82rem', marginBottom: 16 }}>
                            Setting up <strong style={{ textTransform: 'capitalize', color: '#1A73E8' }}>{selectedType}</strong> profile for +91 {phone}
                        </p>

                        <form onSubmit={handleSendEmailOtp} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>Full Name</label>
                                <input type="text" placeholder="Your full name" value={name} onChange={e => setName(e.target.value)} style={inputStyle} required />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>
                                    {selectedType === 'student' ? 'College / University' : selectedType === 'business' ? 'Academy Name' : 'Channel / Platform Name'}
                                </label>
                                <input type="text" placeholder={selectedType === 'student' ? 'e.g. Vidyalankar Institute of Technology' : 'e.g. Apex Academy'} value={orgName} onChange={e => setOrgName(e.target.value)} style={inputStyle} required />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>Email Address</label>
                                <input type="email" placeholder="name@domain.com" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} required />
                            </div>
                            <button type="submit" disabled={isLoading} style={buttonPrimaryStyle}>
                                {isLoading ? 'Sending code...' : 'Continue to Verification'}
                            </button>
                        </form>
                    </div>
                )}

                {/* ── 4. EMAIL OTP ── */}
                {step === 'email_otp' && (
                    <div>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 4px', color: 'var(--text-primary, #111)' }}>Verify Email</h2>
                        <p style={{ color: 'var(--text-secondary, #666)', fontSize: '0.82rem', marginBottom: 16 }}>
                            We sent a verification code to <strong>{email}</strong>
                        </p>

                        <form onSubmit={handleCompleteRegistration} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <input
                                type="text"
                                maxLength={6}
                                placeholder="Enter code"
                                value={emailOtp}
                                onChange={e => setEmailOtp(e.target.value.replace(/\D/g, ''))}
                                style={{ ...inputStyle, textAlign: 'center', fontSize: '1.2rem', letterSpacing: '2px' }}
                                required
                            />
                            <button type="submit" disabled={isLoading || emailOtp.length < 4} style={buttonPrimaryStyle}>
                                {isLoading ? 'Creating Account...' : 'Complete Registration'}
                            </button>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                                <button type="button" onClick={() => setStep('details')} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '0.82rem' }}>← Edit Details</button>
                                <button
                                    type="button"
                                    disabled={emailTimer > 0 || isLoading}
                                    onClick={handleSendEmailOtp}
                                    style={{ background: 'none', border: 'none', color: emailTimer > 0 ? '#999' : '#1A73E8', cursor: emailTimer > 0 ? 'not-allowed' : 'pointer', fontSize: '0.82rem', fontWeight: 600 }}
                                >
                                    {emailTimer > 0 ? `Resend in ${emailTimer}s` : 'Resend Code'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
}

const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '13px 15px',
    borderRadius: 12,
    border: '1px solid var(--border, #ddd)',
    fontSize: '0.95rem',
    background: 'var(--surface, #fff)',
    color: 'var(--text-primary, #111)',
    outline: 'none',
    boxSizing: 'border-box'
};

const buttonPrimaryStyle: React.CSSProperties = {
    width: '100%',
    background: '#1A73E8',
    color: 'white',
    border: 'none',
    padding: '14px',
    borderRadius: 12,
    fontWeight: 600,
    fontSize: '1rem',
    cursor: 'pointer',
    marginTop: 6
};