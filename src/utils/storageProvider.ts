import { UnifiedProject } from './projectStorage';
import { User, Role } from '../types/auth';

const API_URL = 'http://localhost:8080/api';

export interface StorageProvider {
    // Projects
    saveProject(project: UnifiedProject, adminEmail?: string, adminPin?: string): Promise<void>;
    getProject(id: string): Promise<UnifiedProject | undefined>;
    getAllProjects(pmId?: string, operatorId?: string): Promise<UnifiedProject[]>;
    deleteProject(id: string, adminEmail?: string, adminPin?: string): Promise<void>;
    updateProject(id: string, updates: Partial<UnifiedProject>, adminEmail?: string, adminPin?: string): Promise<void>;

    // Users
    // Users
    saveUser(user: Omit<User, 'id'> & { manualPin?: string; projectId?: string; projectTitle?: string }, callerEmail: string, callerPin: string): Promise<User>;
    updateUser(id: string, updates: Partial<User & { manualPin?: string }>, callerEmail: string, callerPin: string): Promise<User>;
    getUserByEmail(email: string): Promise<User | undefined>;
    getUserById(id: string): Promise<User | undefined>;
    getAllUsers(): Promise<User[]>;
    deleteUser(id: string, callerEmail: string, callerPin: string): Promise<void>;
    getOperatorById(id: string): Promise<User | undefined>;

    // Remote Assignments
    assignTeamLead(projectId: string, teamLeadId: string, callerEmail: string, callerPin: string): Promise<void>;
    assignOperator(projectId: string, operatorId: string, callerEmail: string, callerPin: string): Promise<void>;
    removeOperator(projectId: string, operatorId: string, callerEmail: string, callerPin: string): Promise<void>;
}

class BackendProvider implements StorageProvider {
    async saveProject(project: UnifiedProject, adminEmail?: string, adminPin?: string): Promise<void> {
        const response = await fetch(`${API_URL}/projects?adminEmail=${encodeURIComponent(adminEmail || '')}&adminPin=${encodeURIComponent(adminPin || '')}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: project.name,
                description: project.overview || '',
                projectManagerId: project.projectManager?.id,
                adminEmail,
                adminPin
            })
        });
        if (!response.ok) throw new Error('Failed to save project');
    }

    async getProject(id: string): Promise<UnifiedProject | undefined> {
        const response = await fetch(`${API_URL}/projects/${id}`);
        if (!response.ok) return undefined;
        return response.json();
    }

    async getAllProjects(pmId?: string, operatorId?: string): Promise<UnifiedProject[]> {
        let url = `${API_URL}/projects`;
        const params = new URLSearchParams();
        if (pmId) params.append('projectManagerId', pmId);
        if (operatorId) params.append('operatorId', operatorId);
        if (params.toString()) url += `?${params.toString()}`;

        const response = await fetch(url);
        if (!response.ok) return [];
        return response.json();
    }

    async deleteProject(id: string, adminEmail?: string, adminPin?: string): Promise<void> {
        const response = await fetch(`${API_URL}/projects/${id}?adminEmail=${encodeURIComponent(adminEmail || '')}&adminPin=${encodeURIComponent(adminPin || '')}`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error('Failed to delete project');
    }

    async updateProject(id: string, updates: Partial<UnifiedProject>, adminEmail?: string, adminPin?: string): Promise<void> {
        const body = { ...updates } as any;
        if (adminEmail && adminPin) {
            body.adminEmail = adminEmail;
            body.adminPin = adminPin;
        }

        // Handle projectManager nested object mapping to ID for backend
        if (updates.projectManager && typeof updates.projectManager === 'object') {
            body.projectManagerId = (updates.projectManager as any).id;
        }

        const response = await fetch(`${API_URL}/projects/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (!response.ok) throw new Error('Failed to update project');
    }

    async saveUser(user: Omit<User, 'id'> & { manualPin?: string; projectId?: string; projectTitle?: string }, callerEmail: string, callerPin: string): Promise<User> {
        const response = await fetch(`${API_URL}/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...user, callerEmail, callerPin })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to save user');
        return data.user;
    }

    async updateUser(id: string, updates: Partial<User & { manualPin?: string }>, callerEmail: string, callerPin: string): Promise<User> {
        const body = {
            ...updates,
            pin: updates.manualPin, // Map manualPin to pin for the update endpoint if present
            callerEmail,
            callerPin
        };
        const response = await fetch(`${API_URL}/users/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to update user');
        return data.user;
    }

    async login(email: string, pin: string): Promise<{ user: User; message: string }> {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, pin })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Login failed');
        return data;
    }

    async getUserByEmail(email: string): Promise<User | undefined> {
        const users = await this.getAllUsers();
        return users.find(u => u.email.toLowerCase() === email.toLowerCase());
    }

    async getUserById(id: string): Promise<User | undefined> {
        const response = await fetch(`${API_URL}/users/${id}`);
        if (!response.ok) return undefined;
        return response.json();
    }

    async getAllUsers(): Promise<User[]> {
        const response = await fetch(`${API_URL}/users`);
        if (!response.ok) return [];
        return response.json();
    }

    async deleteUser(id: string, callerEmail: string, callerPin: string): Promise<void> {
        const response = await fetch(`${API_URL}/users/${id}?callerEmail=${encodeURIComponent(callerEmail)}&callerPin=${encodeURIComponent(callerPin)}`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error('Failed to delete user');
    }

    async getOperatorById(id: string): Promise<User | undefined> {
        return this.getUserById(id);
    }

    async assignTeamLead(projectId: string, teamLeadId: string, callerEmail: string, callerPin: string): Promise<void> {
        const response = await fetch(`${API_URL}/projects/${projectId}?callerEmail=${encodeURIComponent(callerEmail)}&callerPin=${encodeURIComponent(callerPin)}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectManagerId: teamLeadId, callerEmail, callerPin })
        });
        if (!response.ok) throw new Error('Failed to assign team lead');
    }

    async assignOperator(projectId: string, operatorId: string, callerEmail: string, callerPin: string): Promise<void> {
        const response = await fetch(`${API_URL}/projects/${projectId}/operators/${operatorId}?callerEmail=${encodeURIComponent(callerEmail)}&callerPin=${encodeURIComponent(callerPin)}`, {
            method: 'POST'
        });
        if (!response.ok) throw new Error('Failed to assign operator');
    }

    async removeOperator(projectId: string, operatorId: string, callerEmail: string, callerPin: string): Promise<void> {
        const response = await fetch(`${API_URL}/projects/${projectId}/operators/${operatorId}?callerEmail=${encodeURIComponent(callerEmail)}&callerPin=${encodeURIComponent(callerPin)}`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error('Failed to remove operator');
    }
}

class IndexedDBProvider implements StorageProvider {
    async saveProject(project: UnifiedProject): Promise<void> {
        return Promise.resolve(); // Placeholder, we use BackendProvider now
    }

    async getProject(id: string): Promise<UnifiedProject | undefined> {
        return undefined;
    }

    async getAllProjects(): Promise<UnifiedProject[]> {
        return [];
    }

    async deleteProject(id: string): Promise<void> {
        return Promise.resolve();
    }

    async updateProject(id: string, updates: Partial<UnifiedProject>): Promise<void> {
        return Promise.resolve();
    }

    async saveUser(user: Omit<User, 'id'>): Promise<User> {
        return {} as User;
    }

    async updateUser(id: string, updates: Partial<User>): Promise<User> {
        return {} as User;
    }

    async getUserByEmail(email: string): Promise<User | undefined> {
        return undefined;
    }

    async getUserById(id: string): Promise<User | undefined> {
        return undefined;
    }

    async getAllUsers(): Promise<User[]> {
        return [];
    }

    async deleteUser(id: string): Promise<void> {
        return Promise.resolve();
    }

    async getOperatorById(id: string): Promise<User | undefined> {
        return Promise.resolve(undefined);
    }

    async assignTeamLead(): Promise<void> {
        return Promise.resolve();
    }

    async assignOperator(): Promise<void> {
        return Promise.resolve();
    }

    async removeOperator(): Promise<void> {
        return Promise.resolve();
    }
}

export const storage: StorageProvider = new BackendProvider();
