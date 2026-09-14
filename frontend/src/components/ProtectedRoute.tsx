import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import LoadingSpinner from './LoadingSpinner'
import { ReactNode } from 'react'

export default function ProtectedRoute({ children }: { children: ReactNode }) {
    const { isLoggedIn, loading } = useAuth()
    if (loading) return <LoadingSpinner />
    if (!isLoggedIn()) return <Navigate to="/login" replace />
    return <>{children}</>
}