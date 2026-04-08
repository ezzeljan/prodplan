import { Outlet } from 'react-router-dom';
import { OperatorAuthProvider, useOperatorAuth } from '../../contexts/OperatorAuthContext';
import OperatorLogin from './OperatorLogin';
import { Loader2 } from 'lucide-react';

function PortalGate() {
    const { operator, loading } = useOperatorAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center gradient-bg">
                <Loader2 className="w-8 h-8 text-[var(--accent-secondary)] animate-spin" />
            </div>
        );
    }

    if (!operator) {
        return <OperatorLogin />;
    }

    return <Outlet />;
}

export default function PortalLayout() {
    return (
        <OperatorAuthProvider>
            <PortalGate />
        </OperatorAuthProvider>
    );
}
