import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { ReactNode } from 'react'
import Navbar from './components/Navbar'
import Sidebar from './components/Sidebar'
import Footer from './components/Footer'
import BottomNav from './components/BottomNav'
import ProtectedRoute from './components/ProtectedRoute'
import OtpVerification from './pages/OtpVerification'

import Home from './pages/Home'
import Notes from './pages/Notes'
import NoteDetail from './pages/NoteDetail'
import PreviewPdf from './pages/PreviewPdf'
import SellerProfile from './pages/SellerProfile'
import Login from './pages/Login'
import Register from './pages/Register'
import Library from './pages/Library'
import Profile from './pages/Profile'
import PaymentSuccess from './pages/PaymentSuccess'
import Privacy from './pages/Privacy'
import Terms from './pages/Terms'
import NotFound from './pages/NotFound'
import Payment from './pages/Payment'
import AdminLayout from './pages/admin/AdminLayout'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminNotes from './pages/admin/AdminNotes'
import AdminWithdrawals from './pages/admin/AdminWithdrawals'
import AdminReports from './pages/admin/AdminReports'
import AdminUsers from './pages/admin/AdminUsers'
import AdminOrphans from './pages/admin/AdminOrphans'

import './styles/global.css'

// Load Razorpay once
if (!document.getElementById('razorpay-script')) {
    const script = document.createElement('script')
    script.id = 'razorpay-script'
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    document.head.appendChild(script)
}

// Declare Razorpay on window for TypeScript
declare global {
    interface Window {
        Razorpay: new (options: RazorpayOptions) => RazorpayInstance
    }
}

export interface RazorpayOptions {
    key: string
    amount: number
    currency: string
    order_id: string
    name: string
    description?: string
    prefill?: { name?: string; contact?: string; email?: string }
    theme?: { color?: string }
    handler?: (response: RazorpayResponse) => void
}

export interface RazorpayResponse {
    razorpay_order_id: string
    razorpay_payment_id: string
    razorpay_signature: string
}

export interface RazorpayInstance {
    open: () => void
    on: (event: string, handler: () => void) => void
}

function Layout({ children }: { children: ReactNode }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            <Navbar />
            <div style={{ display: 'flex', flex: 1, width: '100%', position: 'relative' }}>
                {/* Sidebar shows on desktop and tablet */}
                <div className="desktop-sidebar-wrapper">
                    <Sidebar />
                </div>
                <main style={{ flex: 1, minHeight: 'calc(100vh - 64px)', overflowX: 'hidden', paddingBottom: '80px' }}>
                    {children}
                </main>
            </div>
            {/* BottomNav hidden on tablet and laptop via CSS */}
            <div className="mobile-bottom-nav-wrapper">
                <BottomNav />
            </div>
        </div>
    )
}


export default function App() {
    return (
        <AuthProvider>
            <ThemeProvider>
                <BrowserRouter>
                    <Routes>
                        <Route path="/" element={<Layout><Home /></Layout>} />
                        <Route path="/notes" element={<Layout><Notes /></Layout>} />
                        <Route path="/notes/:id/preview" element={<PreviewPdf />} />
                        <Route path="/notes/:id/payment" element={
    <Layout><ProtectedRoute><Payment /></ProtectedRoute></Layout>
} />
                        <Route path="/notes/:id" element={<Layout><NoteDetail /></Layout>} />
                        <Route path="/sellers/:id" element={<Layout><SellerProfile /></Layout>} />
                        <Route path="/login" element={<Login />} />
                        <Route path="/otp/:phone" element={<OtpVerification />} />
                        <Route path="/register" element={<Layout><Register /></Layout>} />
                         
                        <Route path="/privacy" element={<Layout><Privacy /></Layout>} />
                        <Route path="/terms" element={<Layout><Terms /></Layout>} />
                        
                        <Route path="/library" element={
                            <Layout><ProtectedRoute><Library /></ProtectedRoute></Layout>
                        } />
                        <Route path="/profile" element={
                            <Layout><ProtectedRoute><Profile /></ProtectedRoute></Layout>
                        } />
                        <Route path="/payment-success/:id" element={
                            <Layout><ProtectedRoute><PaymentSuccess /></ProtectedRoute></Layout>
                        } />
                        <Route path="/admin" element={<AdminLayout />}>
                            <Route index element={<AdminDashboard />} />
                            <Route path="notes" element={<AdminNotes />} />
                            <Route path="withdrawals" element={<AdminWithdrawals />} />
                            <Route path="reports" element={<AdminReports />} />
                            <Route path="users" element={<AdminUsers />} />
                            <Route path="orphans" element={<AdminOrphans />} />
                        </Route>
                        <Route path="*" element={<Layout><NotFound /></Layout>} />
                    </Routes>
                </BrowserRouter>
            </ThemeProvider>
        </AuthProvider>
    )
}