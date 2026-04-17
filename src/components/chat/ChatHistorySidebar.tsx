// src/components/chat/ChatHistorySidebar.tsx
// CHANGED: Removed all localStorage logic. Sessions now come from the DB via props.

import { useState } from 'react';
import { Plus, Trash2, AlertTriangle, Database, ChevronRight, Folder } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { DBThread } from '../../utils/chatService';

// ---- Types kept for the rest of the app ----
export interface Message {
    id: string;
    role: 'agent' | 'user';
    content: string;
    type?: 'text' | 'file' | 'preview' | 'google-sheet';
    fileData?: { name: string; buffer?: any; url?: string };
    previewData?: any;
}

// ChatSession shape — maps 1-to-1 with a DBThread for easy use in the parent
export interface ChatSession {
    id: string;          // thread id (string version of DB id)
    title: string;
    createdAt: string;
    messages: Message[];
    projectId?: string;
    projectName?: string;
}

// Helper: convert DBThread → ChatSession (used in the parent)
export function dbThreadToChatSession(thread: DBThread): ChatSession {
    return {
        id: String(thread.id),
        title: thread.title,
        createdAt: thread.createdAt,
        messages: [], // messages loaded separately & managed in parent state
        projectId: String(thread.projectId),
        projectName: thread.projectName,
    };
}

// ---- Sidebar Component ----

interface ChatHistorySidebarProps {
    sessions: ChatSession[];
    activeSessionId: string;
    showSidebar: boolean;
    onNewSession: () => void;
    onLoadSession: (session: ChatSession) => void;
    onDeleteSession: (sessionId: string) => void;
    onDeleteAllSessions: () => void;
    onDeleteAllData: () => void;
}

interface ProjectGroup {
    projectId: string;
    projectName: string;
    sessions: ChatSession[];
}

function groupSessionsByProject(sessions: ChatSession[]): ProjectGroup[] {
    const map = new Map<string, ProjectGroup>();
    [...sessions].reverse().forEach(session => {
        const key = session.projectId ?? '__none__';
        const name = session.projectName ?? 'General';
        if (!map.has(key)) map.set(key, { projectId: key, projectName: name, sessions: [] });
        map.get(key)!.sessions.push(session);
    });
    const groups = Array.from(map.values());
    groups.sort((a, b) => {
        if (a.projectId === '__none__') return 1;
        if (b.projectId === '__none__') return -1;
        return a.projectName.localeCompare(b.projectName);
    });
    return groups;
}

export default function ChatHistorySidebar({
    sessions,
    activeSessionId,
    showSidebar,
    onNewSession,
    onLoadSession,
    onDeleteSession,
    onDeleteAllSessions,
    onDeleteAllData,
}: ChatHistorySidebarProps) {
    const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
    const [openGroups, setOpenGroups] = useState<Set<string>>(new Set(['__none__']));

    const groups = groupSessionsByProject(sessions);
    const activeGroup = sessions.find(s => s.id === activeSessionId);
    const activeGroupKey = activeGroup?.projectId ?? '__none__';

    const toggleGroup = (projectId: string) => {
        setOpenGroups(prev => {
            const next = new Set(prev);
            next.has(projectId) ? next.delete(projectId) : next.add(projectId);
            return next;
        });
    };

    const isGroupOpen = (projectId: string) =>
        openGroups.has(projectId) || projectId === activeGroupKey;

    return (
        <div className={`fixed inset-y-0 left-0 flex flex-col z-[60] transition-transform duration-300 ${showSidebar ? 'translate-x-0 pointer-events-auto' : '-translate-x-full pointer-events-none'}`}>
            <div className="h-full w-[260px] overflow-hidden flex flex-col" style={{ backgroundColor: '#1a3d28', borderRight: '1px solid #046241' }}>

                {/* Header */}
                <div className="p-4 flex items-center justify-between flex-shrink-0" style={{ borderBottom: '1px solid #046241' }}>
                    <span className="font-semibold text-white text-sm">Project Chat History</span>
                    <div className="flex items-center gap-2">
                        {sessions.length > 0 && (
                            <button onClick={() => setShowDeleteAllConfirm(true)} className="p-1.5 rounded-full hover:bg-white/10 text-white/50 hover:text-red-400 transition-colors" title="Delete All History">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                        <button onClick={onNewSession} className="p-1.5 rounded-full hover:opacity-70 transition-opacity" style={{ backgroundColor: '#046241', color: '#FFC370' }} title="New Chat">
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Groups */}
                <div className="flex-1 overflow-y-auto py-2">
                    {sessions.length === 0 && (
                        <p className="text-xs text-center p-4" style={{ color: '#FFC370', opacity: 0.6 }}>No history yet</p>
                    )}
                    {groups.map((group, idx) => {
                        const isOpen = isGroupOpen(group.projectId);
                        return (
                            <div key={group.projectId}>
                                {idx > 0 && <div className="mx-3 my-1" style={{ height: '1px', backgroundColor: 'rgba(255,255,255,0.07)' }} />}
                                <button type="button" onClick={() => toggleGroup(group.projectId)} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/5 transition-colors text-left">
                                    <ChevronRight className="w-3.5 h-3.5 flex-shrink-0 transition-transform duration-200" style={{ color: 'rgba(255,255,255,0.35)', transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)' }} />
                                    <Folder className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#FFC370' }} />
                                    <span className="flex-1 text-xs font-medium text-white/75 truncate">{group.projectName}</span>
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.35)' }}>{group.sessions.length}</span>
                                </button>
                                <AnimatePresence initial={false}>
                                    {isOpen && (
                                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2, ease: 'easeInOut' }} style={{ overflow: 'hidden' }}>
                                            <div className="pb-1">
                                                {group.sessions.map(session => (
                                                    <div key={session.id} className="flex items-center gap-2 mx-2 pl-6 pr-2 py-2 rounded-xl cursor-pointer group transition-opacity hover:opacity-90" style={{ backgroundColor: session.id === activeSessionId ? '#046241' : 'rgba(255,255,255,0.04)' }}>
                                                        <div className="flex-1 min-w-0" onClick={() => onLoadSession(session)}>
                                                            <p className="text-xs font-medium truncate text-white/65">{session.title}</p>
                                                            <p className="text-[10px] mt-0.5" style={{ color: '#6fa882' }}>{new Date(session.createdAt).toLocaleDateString()}</p>
                                                        </div>
                                                        <button type="button" onClick={e => { e.stopPropagation(); onDeleteSession(session.id); }} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full flex-shrink-0" style={{ color: '#FFC370' }}>
                                                            <Trash2 className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        );
                    })}
                </div>

                {/* Delete All Data */}
                <div className="p-4 border-t border-[#046241]">
                    <button onClick={() => { if (window.confirm('ARE YOU SURE? This will permanently delete all projects, chat histories, and production plans.')) onDeleteAllData(); }} className="w-full py-3 px-4 rounded-xl flex items-center justify-center gap-3 text-sm font-bold transition-all hover:scale-[1.02] active:scale-[0.98] bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20">
                        <Database className="w-4 h-4" />
                        <span>Delete All Data</span>
                    </button>
                </div>
            </div>

            {/* Delete All Confirm Modal */}
            <AnimatePresence>
                {showDeleteAllConfirm && (
                    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowDeleteAllConfirm(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                        <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-sm bg-[#1a3d28] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                            <div className="p-6">
                                <div className="flex items-center justify-center w-12 h-12 mb-4 rounded-full bg-red-500/10 text-red-500">
                                    <AlertTriangle className="w-6 h-6" />
                                </div>
                                <h3 className="text-xl font-semibold text-white mb-2">Delete All History</h3>
                                <p className="text-white/60">Are you sure you want to delete all chat history? This action cannot be undone.</p>
                            </div>
                            <div className="flex border-t border-white/10">
                                <button onClick={() => setShowDeleteAllConfirm(false)} className="flex-1 px-4 py-4 text-sm font-medium text-white/70 hover:bg-white/5 transition-colors">Cancel</button>
                                <button onClick={() => { onDeleteAllSessions(); setShowDeleteAllConfirm(false); }} className="flex-1 px-4 py-4 text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors border-l border-white/10">Delete All</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}