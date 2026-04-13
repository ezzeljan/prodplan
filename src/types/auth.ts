export enum Role {
    ADMIN = 'admin',
    PROJECT_MANAGER = 'manager',
    TEAM_LEAD = 'teamlead',
    OPERATOR = 'operator'
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
