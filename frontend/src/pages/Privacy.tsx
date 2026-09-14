// export default function Privacy() {
//     const sections = [
//         {
//             title: 'Information We Collect',
//             content: `We collect the following when you use EduCrit:

// Phone Number — used for OTP verification via WhatsApp Business API.
// Email Address — used for account creation and communication.
// Name — used to identify you on the platform.
// Payment Information — processed by Razorpay. We never store card or bank details.
// UPI ID — collected from sellers for payout processing only.
// Device Token — for push notifications via Firebase Cloud Messaging.
// Usage Data — pages viewed, searches, purchases for improving the service.`
//         },
//         {
//             title: 'How We Use Your Information',
//             content: `• Provide and maintain our service
// - Process payments and seller payouts
// - Send OTP verification via WhatsApp
// - Send push notifications about purchases and earnings
// - Improve the platform based on usage patterns
// - Comply with legal obligations`
//         },
//         {
//             title: 'Data Storage',
//             content: `Your data is stored securely on Supabase (PostgreSQL) servers. Files including PDF notes and images are stored on Cloudflare R2 storage. All data is encrypted in transit using HTTPS.`
//         },
//         {
//             title: 'Third Party Services',
//             content: `Razorpay — payment processing (razorpay.com/privacy)
// WhatsApp Business API — OTP delivery (whatsapp.com/legal/privacy-policy)
// Firebase — push notifications (firebase.google.com/support/privacy)
// Cloudflare — file storage and CDN (cloudflare.com/privacypolicy)`
//         },
//         {
//             title: 'Data Retention',
//             content: `We retain your personal data for as long as your account is active. If you delete your account, personal data is removed within 30 days except where required by law.`
//         },
//         {
//             title: 'Your Rights',
//             content: `You have the right to access, correct, or delete your personal data. Contact us at support@educrit.in to exercise these rights.`
//         },
//         {
//             title: "Children's Privacy",
//             content: `Our service is not directed to children under 13. We do not knowingly collect personal data from children under 13.`
//         },
//         {
//             title: 'Contact Us',
//             content: `For questions about this Privacy Policy: support@educrit.in`
//         }
//     ]

//     return (
//         <div style={{ maxWidth: 800, margin: '40px auto', padding: '0 24px 60px' }}>
//             <h1 style={{ fontSize: '2rem', fontWeight: 700, color: '#1A73E8', marginBottom: 8 }}>
//                 Privacy Policy
//             </h1>
//             <p style={{ color: '#999', marginBottom: 40 }}>Last updated: August 2026</p>

//             {sections.map(section => (
//                 <div key={section.title} style={{ marginBottom: 36 }}>
//                     <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 12, color: '#333' }}>
//                         {section.title}
//                     </h2>
//                     <p style={{ color: '#555', lineHeight: 1.8, whiteSpace: 'pre-line' }}>
//                         {section.content}
//                     </p>
//                 </div>
//             ))}
//         </div>
//     )
// }

import React from 'react';
import { Link } from 'react-router-dom';

export default function Privacy() {
    return (
        <div style={{ maxWidth: 800, margin: '40px auto', padding: '0 24px 60px 24px', background: 'white', borderRadius: 16, border: '1px solid #eaeaea', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
            <div style={{ paddingTop: 32, paddingBottom: 24, borderBottom: '1px solid #eaeaea', marginBottom: 32 }}>
                <Link to="/" style={{ color: '#1A73E8', fontWeight: 600, textDecoration: 'none', display: 'inline-block', marginBottom: 16 }}>
                    ← Back to Home
                </Link>
                <h1 style={{ fontSize: '2.2rem', fontWeight: 800, color: '#111', margin: 0 }}>Privacy Policy</h1>
                <p style={{ color: '#666', fontSize: '0.95rem', marginTop: 8 }}>Last updated: September 2026</p>
            </div>

            <div style={{ color: '#333', lineHeight: 1.7, fontSize: '1rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111', marginTop: 24, marginBottom: 12 }}>1. Information We Collect</h2>
                <p style={{ marginBottom: 16 }}>
                    When you register, browse notes, or make purchases on EduCrit, we collect personal information such as your name, mobile number, email address, college details, and payment transaction metadata necessary to fulfill your orders and deliver digital goods.
                </p>

                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111', marginTop: 24, marginBottom: 12 }}>2. How We Use Your Information</h2>
                <p style={{ marginBottom: 16 }}>
                    Your information is utilized strictly to verify accounts via WhatsApp or email OTP, process secure payments (via gateways like Razorpay), track note purchases in your library, and maintain digital rights management (DRM) protection over study materials.
                </p>

                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111', marginTop: 24, marginBottom: 12 }}>3. Data Security</h2>
                <p style={{ marginBottom: 16 }}>
                    We implement robust security controls—including encrypted transmission, restricted database permissions, and session tracking—to safeguard your personal data and digital content from unauthorized access.
                </p>

                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111', marginTop: 24, marginBottom: 12 }}>4. Contact Us</h2>
                <p style={{ marginBottom: 16 }}>
                    If you have any questions or concerns regarding our privacy practices, please contact our support team directly through the platform.
                </p>
            </div>
        </div>
    );
}