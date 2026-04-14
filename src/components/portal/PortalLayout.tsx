import { Outlet, Navigate } from 'react-router-dom';
import { OperatorAuthProvider, useOperatorAuth } from '../../contexts/OperatorAuthContext';
import OperatorLogin from './OperatorLogin';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Role } from '../../types/auth';

function PortalGate() {
    const { operator, loading } = useOperatorAuth();
    const { authSession } = useAuth();

    if (authSession?.role === Role.ADMIN) {
        return <Navigate to="/dashboard" replace />;
    }

    if (authSession?.role === Role.TEAM_LEAD) {
        return <Navigate to="/teamlead-dashboard" replace />;
    }

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
