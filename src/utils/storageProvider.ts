import { UnifiedProject } from './projectStorage';
import { User, Role } from '../types/auth';

const API_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/api`;

const emptySpreadsheetData = { columns: [], rows: [], merges: [] };

const normalizeProject = (project: Partial<UnifiedProject> | undefined): UnifiedProject | undefined => {
    if (!project || !project.id || !project.name) return undefined;

    return {
        id: String(project.id),
        name: project.name || 'Untitled Project',
        overview: project.overview || '',
        goal: typeof project.goal === 'number' ? project.goal : 0,
        unit: project.unit || '',
        startDate: project.startDate || new Date().toLocaleDateString('en-CA'),
        endDate: project.endDate || new Date().toLocaleDateString('en-CA'),
        projectManager: project.projectManager,
        operators: Array.isArray(project.operators) ? project.operators : [],
        resources: Array.isArray(project.resources) ? project.resources : [],
        createdAt: project.createdAt || new Date().toISOString(),
        updatedAt: project.updatedAt || project.createdAt || new Date().toISOString(),
        spreadsheetData: project.spreadsheetData || emptySpreadsheetData,
        googleSheetUrl: project.googleSheetUrl,
        status: project.status || 'active',
        outputs: Array.isArray(project.outputs) ? project.outputs : [],
    };
};

export interface StorageProvider {
    // Projects
    saveProject(project: UnifiedProject, adminEmail?: string, adminPin?: string): Promise<any>;
    getProject(id: string): Promise<UnifiedProject | undefined>;
    getAllProjects(pmId?: string, operatorId?: string): Promise<UnifiedProject[]>;
    deleteProject(id: string, adminEmail?: string, adminPin?: string): Promise<void>;
    updateProject(id: string, updates: Partial<UnifiedProject>, adminEmail?: string, adminPin?: string): Promise<void>;
    // FIX: New method — saves AI-generated spreadsheet data to an existing project
    // using Team Lead credentials. Avoids the ghost-project bug caused by saveProject
    // always doing POST (which ignores the id and creates a new DB record).
    updateProjectSpreadsheet(id: string, project: UnifiedProject, callerEmail: string, callerPin: string): Promise<void>;

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
        const response = await fetch(`${API_URL}/projects`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: project.name,
                description: project.overview || '',
                teamLeadId: project.projectManager?.id ? Number(project.projectManager.id) : null,
                status: project.status,
                goal: project.goal,
                unit: project.unit,
                startDate: project.startDate,
                endDate: project.endDate,
                googleSheetUrl: project.googleSheetUrl,
                spreadsheetData: project.spreadsheetData,
                callerEmail: adminEmail,
                callerPin: adminPin
            })
        });
        if (!response.ok) throw new Error('Failed to save project');
        return response.json();
    }

    async getProject(id: string): Promise<UnifiedProject | undefined> {
        const response = await fetch(`${API_URL}/projects/${id}`);
        if (!response.ok) return undefined;
        return normalizeProject(await response.json());
    }

    async getAllProjects(pmId?: string, operatorId?: string): Promise<UnifiedProject[]> {
        let url = `${API_URL}/projects`;
        const params = new URLSearchParams();
        if (pmId) params.append('teamLeadId', pmId);
        if (operatorId) params.append('operatorId', operatorId);
        if (params.toString()) url += `?${params.toString()}`;

        const response = await fetch(url);
        if (!response.ok) return [];
        const data = await response.json();
        const projects = Array.isArray(data) ? data.map(normalizeProject).filter(Boolean) as UnifiedProject[] : [];
        return projects.filter(p => (p as any).status !== 'deleted');
    }

    async deleteProject(id: string, adminEmail?: string, adminPin?: string): Promise<void> {
        return this.updateProject(id, { status: 'deleted' }, adminEmail, adminPin);
    }

    async updateProject(id: string, updates: Partial<UnifiedProject>, adminEmail?: string, adminPin?: string): Promise<void> {
        const body = { ...updates } as any;
        if (adminEmail && adminPin) {
            body.callerEmail = adminEmail;
            body.callerPin = adminPin;
        }
        if (typeof body.projectManagerId !== 'undefined') {
            delete body.projectManagerId;
        }

        if (updates.projectManager === null) {
            body.teamLeadId = null;
        } else if (updates.projectManager && typeof updates.projectManager === 'object') {
            body.teamLeadId = Number((updates.projectManager as any).id);
        }

        let url = `${API_URL}/projects/${id}`;
        if (adminEmail && adminPin) {
            url += `?callerEmail=${encodeURIComponent(adminEmail)}&callerPin=${encodeURIComponent(adminPin)}`;
        }

        const response = await fetch(url, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to update project: ${errorText || response.statusText}`);
        }
    }

    // FIX: Saves AI-generated spreadsheet data to an existing project using the
    // Team Lead's own credentials. Calls PATCH /{id}/spreadsheet which allows
    // Team Leads (not just Admins) to update their own project's spreadsheet data.
    async updateProjectSpreadsheet(id: string, project: UnifiedProject, callerEmail: string, callerPin: string): Promise<void> {
        const response = await fetch(`${API_URL}/projects/${id}/spreadsheet`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: project.name,
                status: project.status,
                goal: project.goal != null ? Math.round(Number(project.goal)) : null,
                unit: project.unit,
                startDate: project.startDate,
                endDate: project.endDate,
                googleSheetUrl: project.googleSheetUrl,
                spreadsheetData: project.spreadsheetData,
                callerEmail,
                callerPin,
            })
        });
        if (!response.ok) {
            let errMsg = `HTTP ${response.status}`;
            try { const body = await response.json(); errMsg += `: ${JSON.stringify(body)}`; } catch { }
            throw new Error(`Failed to update project spreadsheet — ${errMsg}`);
        }
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
            pin: updates.manualPin,
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
            body: JSON.stringify({ teamLeadId: Number(teamLeadId), callerEmail, callerPin })
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
    async saveProject(project: UnifiedProject): Promise<any> {
        return Promise.resolve();
    }
    async getProject(id: string): Promise<UnifiedProject | undefined> {
        return undefined;
    }
    async getAllProjects(): Promise<UnifiedProject[]> {
        return [];
    }
    async deleteProject(id: string): Promise<void> {
        return this.updateProject(id, { status: 'deleted' });
    }
    async updateProject(id: string, updates: Partial<UnifiedProject>): Promise<void> {
        return Promise.resolve();
    }
    async updateProjectSpreadsheet(id: string, project: UnifiedProject, callerEmail: string, callerPin: string): Promise<void> {
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