export interface Operator {
    id: string;
    name: string;
    email: string;
    pinHash: string;
    createdAt: string;
}

const DB_NAME = 'OperatorsDB';
const STORE_NAME = 'operators';
const DB_VERSION = 1;

export async function hashPin(pin: string): Promise<string> {
    const encoded = new TextEncoder().encode(pin);
    const buffer = await crypto.subtle.digest('SHA-256', encoded);
    return Array.from(new Uint8Array(buffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

const openDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = (e) => {
            const db = (e.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                store.createIndex('email', 'email', { unique: true });
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

export const saveOperator = async (operator: Operator): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(operator);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
};

export const getOperatorByEmail = async (email: string): Promise<Operator | undefined> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const index = tx.objectStore(STORE_NAME).index('email');
        const request = index.get(email.toLowerCase());
        request.onsuccess = () => resolve(request.result || undefined);
        request.onerror = () => reject(request.error);
    });
};

export const getOperatorById = async (id: string): Promise<Operator | undefined> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const request = tx.objectStore(STORE_NAME).get(id);
        request.onsuccess = () => resolve(request.result || undefined);
        request.onerror = () => reject(request.error);
    });
};

export const getAllOperators = async (): Promise<Operator[]> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const request = tx.objectStore(STORE_NAME).getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
    });
};

export const deleteOperator = async (id: string): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
};

export const updateOperator = async (id: string, updates: Partial<Omit<Operator, 'id'>>): Promise<void> => {
    const operator = await getOperatorById(id);
    if (!operator) return;
    const updated = { ...operator, ...updates };
    await saveOperator(updated);
};
