import { createContext, useContext, ReactNode, useState, useEffect } from 'react';

interface AuthContextType {
    isSignedIn: boolean;
    googleToken: string | null;
    login: () => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [isSignedIn, setIsSignedIn] = useState<boolean>(() => {
        return localStorage.getItem('prodplan-auth') === 'true';
    });

    const login = () => {
        setIsSignedIn(true);
        localStorage.setItem('prodplan-auth', 'true');
    };

    const logout = () => {
        setIsSignedIn(false);
        localStorage.removeItem('prodplan-auth');
    };

    const value: AuthContextType = {
        isSignedIn,
        googleToken: null,
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
