import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { storage } from '../utils/storageProvider';
import { hashPin, Operator } from '../utils/operatorStorage';

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
        const op: Operator | undefined = await storage.getOperatorByEmail(email.toLowerCase().trim());
        if (!op) {
            return { success: false, error: 'No account found with that email.' };
        }

        const pinDigest = await hashPin(pin);
        if (pinDigest !== op.pinHash) {
            return { success: false, error: 'Incorrect PIN.' };
        }

        const session: OperatorSession = { id: op.id, name: op.name, email: op.email };
        setOperator(session);
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
        return { success: true };
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
