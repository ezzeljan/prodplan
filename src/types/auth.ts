export enum Role {
    ADMIN = 'ADMIN',
    TEAM_LEAD = 'TEAM_LEAD',
    OPERATOR = 'OPERATOR'
}

export interface User {
    id: string;
    name: string;
    email: string;
    role: Role;
    pin?: string; // Only available during creation/admin view
    manualPin?: string;
    projectTitle?: string;
}

export interface AdminSession {
    email: string;
    pin: string;
}
