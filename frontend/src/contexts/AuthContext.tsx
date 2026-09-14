import {
    createContext,
    useContext,
    useState,
    useEffect,
    ReactNode
} from 'react'
import { UserProfile } from '../api/client'

interface AuthContextType {
    user: UserProfile | null
    loading: boolean
    registrationToken: string | null
    reactivationToken: string | null
    setRegistrationToken: (token: string | null) => void
    setReactivationToken: (token: string | null) => void
    login: (token: string, userData: UserProfile) => void
    logout: () => Promise<void>
    isLoggedIn: () => boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<UserProfile | null>(null)
    const [loading, setLoading] = useState(true)
    const [registrationToken, setRegistrationToken] = useState<string | null>(null)
    const [reactivationToken, setReactivationToken] = useState<string | null>(null)

    useEffect(() => {
        const token = localStorage.getItem('educrit_token')
        const savedUser = localStorage.getItem('educrit_user')
        if (token && savedUser) {
            try {
                setUser(JSON.parse(savedUser) as UserProfile)
            } catch (_) {}
        }
        setLoading(false)
    }, [])

    const login = (token: string, userData: UserProfile) => {
        localStorage.setItem('educrit_token', token)
        localStorage.setItem('educrit_user', JSON.stringify(userData))
        setUser(userData)
    }

    const logout = async () => {
        try {
            await import('../api/client').then(m => m.logout())
        } catch (_) {}
        localStorage.removeItem('educrit_token')
        localStorage.removeItem('educrit_user')
        setUser(null)
    }

    const isLoggedIn = () => !!user && !!localStorage.getItem('educrit_token')

    return (
        <AuthContext.Provider value={{
            user, loading, login, logout, isLoggedIn,
            registrationToken, setRegistrationToken,
            reactivationToken, setReactivationToken
        }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth(): AuthContextType {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error('useAuth must be used within AuthProvider')
    return ctx
}