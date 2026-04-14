import React, { createContext, useContext, ReactNode, useMemo } from 'react';
import { Role as UserRole } from '../types/auth';
import { useAuth } from './AuthContext';

export interface AppUser {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    avatar?: string;
}

interface UserContextType {
    currentUser: AppUser | null;
    users: AppUser[];
    switchUser: (userId: string) => void;
    isAdmin: boolean;
    isTeamLead: boolean;
    isOperator: boolean;
    canEdit: boolean;
    canViewAll: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
    const { authSession } = useAuth();

    const currentUser = useMemo<AppUser | null>(() => {
        if (!authSession) {
            return null;
        }

        return {
            id: authSession.id,
            name: authSession.name,
            email: authSession.email,
            role: authSession.role,
        };
    }, [authSession]);

    const switchUser = () => {
        return;
    };

    const users = currentUser ? [currentUser] : [];
    const isAdmin = currentUser?.role === UserRole.ADMIN;
    const isTeamLead = currentUser?.role === UserRole.TEAM_LEAD;
    const isOperator = currentUser?.role === UserRole.OPERATOR;

    const canEdit = isAdmin || isTeamLead;
    const canViewAll = isAdmin || isTeamLead;

    return (
        <UserContext.Provider value={{
            currentUser,
            users,
            switchUser,
            isAdmin,
            isTeamLead,
            isOperator,
            canEdit,
            canViewAll,
        }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => {
    const context = useContext(UserContext);
    if (!context) throw new Error('useUser must be used within UserProvider');
    return context;
};
