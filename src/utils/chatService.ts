// src/utils/chatService.ts
// Replaces localStorage-based session management.
// All chat threads and messages are now persisted in the database via the backend API.

const API_URL = 'http://localhost:8080/api';

export interface DBMessage {
    id: number;
    role: 'agent' | 'user';
    content: string;
    messageType: string;
    fileData?: { name: string; url?: string } | null;
    previewData?: any;
    createdAt: string;
}

export interface DBThread {
    id: number;
    projectId: number;
    projectName: string;
    teamLeadId: number;
    title: string;
    createdAt: string;
    updatedAt: string;
    messages: DBMessage[];
}

/**
 * Fetch or create the single chat thread for a project+teamLead pair.
 * Returns the thread with all its messages already attached.
 */
export async function getOrCreateThread(
    projectId: string,
    teamLeadId: string,
    callerEmail: string,
    callerPin: string
): Promise<DBThread> {
    const params = new URLSearchParams({
        projectId,
        teamLeadId,
        callerEmail,
        callerPin,
    });
    const res = await fetch(`${API_URL}/chat/thread?${params}`);
    if (!res.ok) throw new Error('Failed to get/create chat thread');
    return res.json();
}

/**
 * Save a single message to the database under the given threadId.
 * Called after every message sent by the user OR after every agent response.
 */
export async function saveMessage(
    threadId: number,
    role: 'agent' | 'user',
    content: string,
    callerEmail: string,
    callerPin: string,
    options?: {
        messageType?: string;
        fileData?: { name: string; url?: string } | null;
        previewData?: any;
    }
): Promise<DBMessage> {
    const res = await fetch(`${API_URL}/chat/thread/${threadId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            role,
            content,
            messageType: options?.messageType ?? 'text',
            fileData: options?.fileData ?? null,
            previewData: options?.previewData ?? null,
            callerEmail,
            callerPin,
        }),
    });
    if (!res.ok) throw new Error('Failed to save message');
    return res.json();
}

/**
 * Delete a single chat thread (and all its messages via cascade).
 */
export async function deleteThread(
    threadId: number,
    callerEmail: string,
    callerPin: string
): Promise<void> {
    await fetch(`${API_URL}/chat/thread/${threadId}?callerEmail=${encodeURIComponent(callerEmail)}&callerPin=${encodeURIComponent(callerPin)}`, {
        method: 'DELETE',
    });
}

/**
 * Delete ALL threads for a team lead across all projects.
 */
export async function deleteAllThreads(
    teamLeadId: string,
    callerEmail: string,
    callerPin: string
): Promise<void> {
    await fetch(`${API_URL}/chat/all?teamLeadId=${teamLeadId}&callerEmail=${encodeURIComponent(callerEmail)}&callerPin=${encodeURIComponent(callerPin)}`, {
        method: 'DELETE',
    });
}

/**
 * Convert a DBMessage (from the backend) into the frontend Message shape
 * that ChatMessage.tsx and the rest of the UI expect.
 */
export function dbMessageToFrontend(m: DBMessage): import('../types/production').Message {
    return {
        id: String(m.id),
        role: m.role,
        content: m.content,
        type: m.messageType as any,
        fileData: m.fileData
            ? { name: m.fileData.name, buffer: undefined, url: m.fileData.url }
            : undefined,
        previewData: m.previewData,
    };
}