import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useGoogleLogin, googleLogout, TokenResponse } from '@react-oauth/google';

interface AuthContextType {
    isSignedIn: boolean;
    googleToken: string | null;
    login: () => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [googleToken, setGoogleToken] = useState<string | null>(() => localStorage.getItem("googleToken"));
    const [isSignedIn, setIsSignedIn] = useState<boolean>(!!googleToken);

    const login = useGoogleLogin({
        onSuccess: (codeResponse: Omit<TokenResponse, "error" | "error_description" | "error_uri">) => {
            setGoogleToken(codeResponse.access_token);
            setIsSignedIn(true);
            localStorage.setItem("googleToken", codeResponse.access_token);
        },
        scope: 'https://www.googleapis.com/auth/drive.file',
        onError: () => console.error('Login Failed'),
    });

    const logout = () => {
        googleLogout();
        setGoogleToken(null);
        setIsSignedIn(false);
        localStorage.removeItem("googleToken");
    };

    useEffect(() => {
        setIsSignedIn(!!googleToken);
    }, [googleToken]);

    return (
        <AuthContext.Provider value={{ isSignedIn, googleToken, login, logout }}>
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
