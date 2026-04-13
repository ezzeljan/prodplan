import React, { createContext, useContext, useState, ReactNode } from 'react';

import { Role as UserRole } from '../types/auth';

export interface AppUser {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    avatar?: string;
}

interface UserContextType {
    currentUser: AppUser;
    users: AppUser[];
    switchUser: (userId: string) => void;
    isAdmin: boolean;
    isManager: boolean;
    isTeamLead: boolean;
    isOperator: boolean;
    canEdit: boolean;
    canViewAll: boolean;
}

// Demo users
const DEMO_USERS: AppUser[] = [
    { id: 'admin-1', name: 'Admin User', email: 'admin@lifewood.ph', role: UserRole.ADMIN },
    { id: 'mgr-1', name: 'Project Manager', email: 'manager@lifewood.ph', role: UserRole.PROJECT_MANAGER },
    { id: 'tl-1', name: 'Team Lead', email: 'teamlead@lifewood.ph', role: UserRole.TEAM_LEAD },
    { id: 'op-1', name: 'Maria Santos', email: 'maria@lifewood.ph', role: UserRole.OPERATOR },
    { id: 'op-2', name: 'John Reyes', email: 'john@lifewood.ph', role: UserRole.OPERATOR },
    { id: 'op-3', name: 'Ana Garcia', email: 'ana@lifewood.ph', role: UserRole.OPERATOR },
    { id: 'op-4', name: 'Carlos Cruz', email: 'carlos@lifewood.ph', role: UserRole.OPERATOR },
    { id: 'op-5', name: 'Sofia Mendez', email: 'sofia@lifewood.ph', role: UserRole.OPERATOR },
];

const STORAGE_KEY = 'production-plan-current-user';

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
    const [currentUserId, setCurrentUserId] = useState<string>(() => {
        return localStorage.getItem(STORAGE_KEY) || 'admin-1';
    });

    const currentUser = DEMO_USERS.find(u => u.id === currentUserId) || DEMO_USERS[0];

    const switchUser = (userId: string) => {
        setCurrentUserId(userId);
        localStorage.setItem(STORAGE_KEY, userId);
    };

    const isAdmin = currentUser.role === UserRole.ADMIN;
    const isManager = currentUser.role === UserRole.PROJECT_MANAGER;
    const isTeamLead = currentUser.role === UserRole.TEAM_LEAD;
    const isOperator = currentUser.role === UserRole.OPERATOR;

    const canEdit = isAdmin || isManager;
    const canViewAll = isAdmin || isManager || isTeamLead;

    return (
        <UserContext.Provider value={{
            currentUser,
            users: DEMO_USERS,
            switchUser,
            isAdmin,
            isManager,
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
