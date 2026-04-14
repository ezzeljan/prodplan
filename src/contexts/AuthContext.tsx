import { createContext, useContext, ReactNode, useState } from 'react';
import { Role } from '../types/auth';

interface AuthSession {
    id: string;
    name: string;
    email: string;
    role: Role;
    pin: string;
}

interface AuthContextType {
    isSignedIn: boolean;
    authSession: AuthSession | null;
    login: (session: AuthSession) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_KEY = 'prodplan-auth';
const SESSION_KEY = 'admin-session';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [authSession, setAuthSession] = useState<AuthSession | null>(() => {
        const stored = sessionStorage.getItem(SESSION_KEY);
        try {
            return stored ? JSON.parse(stored) : null;
        } catch (e) {
            return null;
        }
    });

    const isSignedIn = authSession !== null;

    const login = (session: AuthSession) => {
        setAuthSession(session);
        localStorage.setItem(AUTH_KEY, 'true');
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    };

    const logout = () => {
        setAuthSession(null);
        localStorage.removeItem(AUTH_KEY);
        sessionStorage.removeItem(SESSION_KEY);
    };

    const value: AuthContextType = {
        isSignedIn,
        authSession,
        login,
        logout,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
