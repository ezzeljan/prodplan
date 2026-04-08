import {
    UnifiedProject,
    saveProject as idbSave,
    getProject as idbGet,
    getAllProjects as idbGetAll,
    deleteProjectFromDB as idbDelete,
    updateProject as idbUpdate,
} from './projectStorage';

import {
    Operator,
    saveOperator as idbSaveOp,
    getOperatorByEmail as idbGetOpByEmail,
    getOperatorById as idbGetOpById,
    getAllOperators as idbGetAllOps,
    deleteOperator as idbDeleteOp,
    updateOperator as idbUpdateOp,
} from './operatorStorage';

export interface StorageProvider {
    // Projects
    saveProject(project: UnifiedProject): Promise<void>;
    getProject(id: string): Promise<UnifiedProject | undefined>;
    getAllProjects(): Promise<UnifiedProject[]>;
    deleteProject(id: string): Promise<void>;
    updateProject(id: string, updates: Partial<UnifiedProject>): Promise<void>;

    // Operators
    saveOperator(operator: Operator): Promise<void>;
    getOperatorByEmail(email: string): Promise<Operator | undefined>;
    getOperatorById(id: string): Promise<Operator | undefined>;
    getAllOperators(): Promise<Operator[]>;
    deleteOperator(id: string): Promise<void>;
    updateOperator(id: string, updates: Partial<Omit<Operator, 'id'>>): Promise<void>;
}

class IndexedDBProvider implements StorageProvider {
    async saveProject(project: UnifiedProject): Promise<void> {
        return idbSave(project);
    }

    async getProject(id: string): Promise<UnifiedProject | undefined> {
        return idbGet(id);
    }

    async getAllProjects(): Promise<UnifiedProject[]> {
        return idbGetAll();
    }

    async deleteProject(id: string): Promise<void> {
        return idbDelete(id);
    }

    async updateProject(id: string, updates: Partial<UnifiedProject>): Promise<void> {
        return idbUpdate(id, updates);
    }

    async saveOperator(operator: Operator): Promise<void> {
        return idbSaveOp(operator);
    }

    async getOperatorByEmail(email: string): Promise<Operator | undefined> {
        return idbGetOpByEmail(email);
    }

    async getOperatorById(id: string): Promise<Operator | undefined> {
        return idbGetOpById(id);
    }

    async getAllOperators(): Promise<Operator[]> {
        return idbGetAllOps();
    }

    async deleteOperator(id: string): Promise<void> {
        return idbDeleteOp(id);
    }

    async updateOperator(id: string, updates: Partial<Omit<Operator, 'id'>>): Promise<void> {
        return idbUpdateOp(id, updates);
    }
}

// ─── Swap this to a SupabaseProvider when ready ───
export const storage: StorageProvider = new IndexedDBProvider();
