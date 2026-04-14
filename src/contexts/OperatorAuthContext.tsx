import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { storage } from '../utils/storageProvider';
import { hashPin, Operator } from '../utils/operatorStorage';
import { Role } from '../types/auth';

interface OperatorSession {
    id: string;
    name: string;
    email: string;
}

interface OperatorAuthContextType {
    operator: OperatorSession | null;
    loading: boolean;
    login: (email: string, pin: string) => Promise<{ success: boolean; error?: string }>;
    logout: () => void;
}

const OperatorAuthContext = createContext<OperatorAuthContextType | undefined>(undefined);

const SESSION_KEY = 'operator-session';

export const OperatorAuthProvider = ({ children }: { children: ReactNode }) => {
    const [operator, setOperator] = useState<OperatorSession | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const stored = sessionStorage.getItem(SESSION_KEY);
        if (stored) {
            try {
                const parsed = JSON.parse(stored) as OperatorSession;
                storage.getOperatorById(parsed.id).then((op) => {
                    if (op) {
                        setOperator({ id: op.id, name: op.name, email: op.email });
                    } else {
                        sessionStorage.removeItem(SESSION_KEY);
                    }
                    setLoading(false);
                });
            } catch {
                sessionStorage.removeItem(SESSION_KEY);
                setLoading(false);
            }
        } else {
            setLoading(false);
        }
    }, []);

    const login = useCallback(async (email: string, pin: string) => {
        try {
            const response = await fetch('http://localhost:8080/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, pin })
            });

            const data = await response.json();

            if (!response.ok) {
                return { success: false, error: data.error || 'Login failed' };
            }

            if (String(data.user.role).toUpperCase() !== Role.OPERATOR) {
                return { success: false, error: 'Access denied. Operator credentials required.' };
            }

            const session: OperatorSession = {
                id: data.user.id.toString(),
                name: data.user.name,
                email: data.user.email
            };
            setOperator(session);
            sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
            return { success: true };
        } catch (err) {
            return { success: false, error: 'Could not connect to the server.' };
        }
    }, []);

    const logout = useCallback(() => {
        setOperator(null);
        sessionStorage.removeItem(SESSION_KEY);
    }, []);

    return (
        <OperatorAuthContext.Provider value={{ operator, loading, login, logout }}>
            {children}
        </OperatorAuthContext.Provider>
    );
};

export const useOperatorAuth = () => {
    const context = useContext(OperatorAuthContext);
    if (!context) throw new Error('useOperatorAuth must be used within OperatorAuthProvider');
    return context;
};
