import { createContext, useContext, ReactNode } from 'react';

interface AuthContextType {
    isSignedIn: boolean;
    googleToken: string | null;
    login: () => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const value: AuthContextType = {
        isSignedIn: false,
        googleToken: null,
        login: () => {},
        logout: () => {},
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
