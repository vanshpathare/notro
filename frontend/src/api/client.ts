import axios, { AxiosResponse } from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

// ── Types ──
export interface Note {
    id: string
    title: string
    description?: string
    subject: string
    course?: string
    price: number
    purchase_count: number
    view_count: number
    average_rating: number
    rating_count: number
    tags?: string[]
    index_contents?: string
    cover_image_key?: string
    preview_r2_key?: string
    page_count: number
    preview_pages?: number[]
    status: string
    seller_id: string
    created_at: string
    has_purchased?: boolean
    seller?: {
        id: string
        name: string
        avatar_url?: string
        account_type: string
        verification_status?: string
    }
}

export interface UserProfile {
    id: string
    phone: string
    email?: string
    name: string
    account_type: string
    is_seller: boolean
    is_banned: boolean
    is_deleted: boolean
    avatar_url?: string
    verification_status?: string
    mute_sale_notifications?: boolean
    extra_details?: Record<string, unknown>
    created_at: string
}

export interface Purchase {
    id: string
    note_id: string
    buyer_id: string
    seller_id: string
    amount_paid: number
    paid_at?: string
    created_at: string
    note?: Note
}

export interface SellerProfile {
    id: string
    name: string
    avatar_url?: string
    account_type: string
    verification_status?: string
    is_verified: boolean
    is_following: boolean
    stats: {
        total_notes: number
        total_sold: number
        average_rating: number
        follower_count: number
    }
    notes: Note[]
}

export interface PaginatedNotes {
    notes: Note[]
    pagination: {
        total: number
        page: number
        limit: number
        total_pages: number
    }
}

export interface Order {
    orderId: string
    keyId: string
    amount: number
    currency: string
    noteId: string
}

export interface Withdrawal {
    id: string
    amount: number
    status: string
    upi_id: string
    utr_number?: string
    notes?: string
    created_at: string
    paid_at?: string
    seller?: {
        name: string
        account_type: string
    }
}

export interface Report {
    id: string
    note_id: string
    reason: string
    description?: string
    status: string
    created_at: string
    note?: { title: string }
    reporter?: { name: string }
}

export interface OrphanFile {
    id: string
    r2_key: string
    seller_id: string
    created_at: string
}

export interface NoteFilters {
    search?: string
    subject?: string
    course?: string
    min_price?: number
    max_price?: number
    sort_by?: string
    page?: number
    limit?: number
}

// ── Main API client ──
const api = axios.create({
    baseURL: BASE_URL,
    headers: { 'Content-Type': 'application/json' },
    withCredentials: true
})

api.interceptors.request.use(config => {
    const token = localStorage.getItem('educrit_token')
    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
})

api.interceptors.response.use(
    response => response,
    error => {
        if (error.response?.status === 401) {
            // 1. Always purge stale credentials
            localStorage.removeItem('educrit_token')
            localStorage.removeItem('educrit_user')

            // 2. Define public paths that anyone is allowed to view
            const publicPaths = ['/', '/login', '/register', '/privacy', '/terms']
            const currentPath = window.location.pathname
            const isPublicPage = publicPaths.includes(currentPath) || 
                                currentPath.startsWith('/notes/') || 
                                currentPath.startsWith('/sellers/')

            // 3. Only redirect to /login if the user is attempting to access a protected page
            if (!isPublicPage) {
                window.location.href = '/register'
            }
        }
        return Promise.reject(error)
    }
)

// ── Admin API client ──
const adminApi = axios.create({
    baseURL: BASE_URL,
    headers: { 'Content-Type': 'application/json' },
    withCredentials: true
})

adminApi.interceptors.request.use(config => {
    const adminToken = sessionStorage.getItem('admin_token')
    if (adminToken) {
        config.headers['x-admin-token'] = adminToken
    }
    return config
})

// ── Auth ──
export const sendOtp = (phone: string) =>
    api.post('/auth/send-otp', { phone })

export const verifyOtp = (phone: string, code: string) =>
    api.post<{
        token?: string
        user?: UserProfile
        isNewUser?: boolean
        registrationToken?: string
        requiresReactivation?: boolean
        reactivationToken?: string
    }>('/auth/verify-otp', { phone, code })

export const sendEmailOtp = (registrationToken: string, email: string) =>
    api.post('/auth/send-email-otp', { registrationToken, email })

export const verifyEmailRegister = (data: {
    registrationToken: string
    email: string
    code: string
    registrationData: Record<string, unknown>
}) => api.post<{ token: string; user: UserProfile }>('/auth/verify-email-register', data)

export const reactivate = (data: {
    reactivationToken: string
    email: string
    code: string
}) => api.post<{ token: string; user: UserProfile }>('/auth/reactivate', data)

export const logout = () => api.post('/auth/logout')

// ── Notes ──
export const getNotes = (params?: NoteFilters) =>
    api.get<PaginatedNotes>('/notes', { params })

export const getNoteById = (id: string) =>
    api.get<{ success: boolean; note: Note }>(`/notes/${id}`)

export const getPreviewUrl = (id: string) =>
    api.get<{ previewUrl?: string; preview_pages?: number[] }>(`/notes/${id}/preview-url`)

export const getShareMeta = (id: string) =>
    api.get(`/notes/${id}/share-meta`)

// ── Payments ──
export const createOrder = (noteId: string) =>
    api.post<{ success: boolean; order: Order }>('/payments/create-order', { noteId })

export const verifyPayment = (data: {
    orderId: string
    paymentId: string
    signature: string
}) => api.post('/payments/verify', data)

export const getMyPurchases = () =>
    api.get<{ success: boolean; purchases: Purchase[] }>('/payments/my-purchases')

// ── Profile ──
export const getMyProfile = () =>
    api.get<{ success: boolean; user: UserProfile }>('/users/me')

export const updateMyProfile = (data: Partial<UserProfile>) =>
    api.put<{ success: boolean; user: UserProfile }>('/users/me', data)

// ── Sellers ──
export const getSellerProfile = (id: string) =>
    api.get<{ success: boolean; seller: SellerProfile }>(`/sellers/${id}/profile`)

export const followSeller = (id: string) =>
    api.post(`/sellers/${id}/follow`)

export const unfollowSeller = (id: string) =>
    api.delete(`/sellers/${id}/follow`)

// ── Image URL ──
export const getImageUrl = (r2Key: string) =>
    api.get<{ url: string }>('/upload/image-url', { params: { r2_key: r2Key } })

// ── Admin ──
export const adminGetPendingNotes = () =>
    adminApi.get<{ success: boolean; notes: Note[] }>('/admin/notes/pending')

export const adminViewNote = (noteId: string) =>
    adminApi.get<{ success: boolean; url: string; title: string }>(`/admin/notes/view/${noteId}`)

export const adminApproveNote = (noteId: string) =>
    adminApi.patch(`/admin/notes/approve/${noteId}`)

export const adminRejectNote = (noteId: string, reason: string) =>
    adminApi.patch(`/admin/notes/reject/${noteId}`, { reason })

export const adminSoftDeleteNote = (noteId: string, reason: string) =>
    adminApi.patch(`/admin/notes/soft-delete/${noteId}`, { reason })

export const adminGetPendingWithdrawals = () =>
    adminApi.get<{ success: boolean; withdrawals: Withdrawal[] }>('/admin/withdrawals/pending')

export const adminMarkPaid = (id: string, utrNumber: string) =>
    adminApi.patch(`/admin/withdrawals/${id}/mark-paid`, { utrNumber })

export const adminRejectWithdrawal = (id: string, reason: string) =>
    adminApi.patch(`/admin/withdrawals/${id}/reject`, { reason })

export const adminGetReports = () =>
    adminApi.get<{ success: boolean; reports: Report[] }>('/admin/reports/pending')

export const adminActionReport = (id: string, action: string, adminNote: string) =>
    adminApi.patch(`/admin/reports/${id}/action`, { action, adminNote })

export const adminSearchUsers = (q: string) =>
    adminApi.get<{ success: boolean; users: UserProfile[] }>('/admin/users/search', { params: { q } })

export const adminBanUser = (userId: string) =>
    adminApi.patch(`/admin/users/${userId}/ban`, { is_banned: true })

export const adminUnbanUser = (userId: string) =>
    adminApi.patch(`/admin/users/${userId}/unban`, { is_banned: false })

export const adminGetOrphans = () =>
    adminApi.get<{ success: boolean; count: number; orphans: OrphanFile[] }>('/admin/orphans/list')

export const adminCleanupOrphans = () =>
    adminApi.delete<{ success: boolean; deleted: number; failed: number; message: string }>('/admin/orphans/cleanup')

export const searchSellers = async (query: string) => {
    // Explicitly target the /sellers/search endpoint with the 'q' parameter matching your backend router
    return await api.get(`/sellers/search?q=${encodeURIComponent(query)}`);
};

export { adminApi }
export default api