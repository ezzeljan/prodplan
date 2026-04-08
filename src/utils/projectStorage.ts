import { SpreadsheetData } from '../types/spreadsheet';

export interface UnifiedProject {
    id: string;
    name: string;
    overview?: string;
    goal: number;
    unit: string;
    startDate: string;
    endDate: string;
    resources: string[];
    createdAt: string;
    updatedAt: string;
    spreadsheetData: SpreadsheetData;
    googleSheetUrl?: string;
    status: 'active' | 'completed' | 'archived' | 'draft';
    outputs: any[]; // Daily production records for dashboard metrics
}

const DB_NAME = 'ProjectsDB';
const STORE_NAME = 'projects';
const DB_VERSION = 1;

const openDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = (e) => {
            const db = (e.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                store.createIndex('createdAt', 'createdAt', { unique: false });
                store.createIndex('status', 'status', { unique: false });
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

export const saveProject = async (project: UnifiedProject): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(project);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
};

export const getProject = async (id: string): Promise<UnifiedProject | undefined> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const request = tx.objectStore(STORE_NAME).get(id);
        request.onsuccess = () => resolve(request.result || undefined);
        request.onerror = () => reject(request.error);
    });
};

export const getAllProjects = async (): Promise<UnifiedProject[]> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const request = tx.objectStore(STORE_NAME).getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
    });
};

export const deleteProjectFromDB = async (id: string): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
};

export const updateProject = async (id: string, updates: Partial<UnifiedProject>): Promise<void> => {
    const project = await getProject(id);
    if (!project) return;
    const updated = { ...project, ...updates, updatedAt: new Date().toISOString() };
    await saveProject(updated);
};

export const clearAllProjects = async (): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
};
