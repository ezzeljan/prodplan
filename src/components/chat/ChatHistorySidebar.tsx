import { useState } from 'react';
import { Plus, Trash2, AlertTriangle, Database } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface Message {
    id: string;
    role: 'agent' | 'user';
    content: string;
    type?: 'text' | 'file' | 'preview' | 'google-sheet';
    fileData?: {
        name: string;
        buffer?: any;
        url?: string;
    };
    previewData?: any;
}

export interface ChatSession {
    id: string;
    title: string;
    createdAt: string;
    messages: Message[];
    projectId?: string; // Links the chat to the specific project folder
}

export const STORAGE_KEY = 'productionPlanChatHistory';

export const loadSessions = (): ChatSession[] => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const sessions: ChatSession[] = JSON.parse(raw);
        return sessions.map(s => ({
            ...s,
            messages: s.messages.map(m => ({ ...m, fileData: undefined }))
        }));
    } catch { return []; }
};

export const saveSessions = (sessions: ChatSession[]) => {
    try {
        const stripped = sessions.map(s => ({
            ...s,
            messages: s.messages.map(m => ({ ...m, fileData: undefined }))
        }));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stripped));
    } catch { }
};

export const generateSessionTitle = (messages: Message[]): string => {
    const firstUser = messages.find(m => m.role === 'user');
    if (firstUser) return firstUser.content.length > 40 ? firstUser.content.slice(0, 40) + '…' : firstUser.content;
    return 'New Chat';
};

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
    return (
        <div
            className={`fixed inset-y-0 left-0 flex flex-col z-[60] transition-transform duration-300 ${showSidebar ? "translate-x-0 pointer-events-auto" : "-translate-x-full pointer-events-none"}`}
        >
            <div
                className="h-full w-[260px] overflow-hidden flex flex-col"
                style={{ backgroundColor: "#1a3d28", borderRight: "1px solid #046241" }}
            >
                {/* Sidebar Header */}
                <div className="p-4 flex items-center justify-between flex-shrink-0" style={{ borderBottom: "1px solid #046241" }}>
                    <span className="font-semibold text-white text-sm">Chat History</span>
                    <div className="flex items-center gap-2">
                        {sessions.length > 0 && (
                            <button
                                onClick={() => setShowDeleteAllConfirm(true)}
                                className="p-1.5 rounded-full hover:bg-white/10 text-white/50 hover:text-red-400 transition-colors"
                                title="Delete All History"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                        <button
                            onClick={onNewSession}
                            className="p-1.5 rounded-full hover:opacity-70 transition-opacity"
                            style={{ backgroundColor: "#046241", color: "#FFC370" }}
                            title="New Chat"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Session List */}
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {sessions.length === 0 && (
                        <p className="text-xs text-center p-4" style={{ color: "#FFC370", opacity: 0.6 }}>No history yet</p>
                    )}
                    {[...sessions].reverse().map(session => (
                        <div
                            key={session.id}
                            className="flex items-center gap-2 p-3 rounded-xl cursor-pointer group transition-opacity hover:opacity-90"
                            style={{ backgroundColor: session.id === activeSessionId ? "#046241" : "rgba(255,255,255,0.05)" }}
                        >
                            <div
                                className="flex-1 min-w-0"
                                onClick={() => onLoadSession(session)}
                            >
                                <p className="text-xs font-medium truncate text-white">{session.title}</p>
                                <p className="text-xs mt-0.5" style={{ color: "#FFB347", opacity: 0.8 }}>
                                    {new Date(session.createdAt).toLocaleDateString()}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    console.log("delete clicked", session.id);
                                    onDeleteSession(session.id);
                                }}
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full"
                                style={{ color: "#FFC370" }}
                            >
                                <Trash2 className="w-3 h-3" />
                            </button>
                        </div>
                    ))}
                </div>

                {/* Delete All Data Button */}
                <div className="p-4 border-t border-[#046241]">
                    <button
                        onClick={() => {
                            if (window.confirm("ARE YOU SURE? This will permanently delete all projects, chat histories, and production plans across the entire application.")) {
                                onDeleteAllData();
                            }
                        }}
                        className="w-full py-3 px-4 rounded-xl flex items-center justify-center gap-3 text-sm font-bold transition-all hover:scale-[1.02] active:scale-[0.98] bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20"
                    >
                        <Database className="w-4 h-4" />
                        <span>Delete All Data</span>
                    </button>
                </div>
            </div>

            {/* Delete All Confirmation Modal */}
            <AnimatePresence>
                {showDeleteAllConfirm && (
                    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowDeleteAllConfirm(false)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-sm bg-[#1a3d28] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
                        >
                            <div className="p-6">
                                <div className="flex items-center justify-center w-12 h-12 mb-4 rounded-full bg-red-500/10 text-red-500">
                                    <AlertTriangle className="w-6 h-6" />
                                </div>
                                <h3 className="text-xl font-semibold text-white mb-2">Delete All History</h3>
                                <p className="text-white/60">
                                    Are you sure you want to delete all chat history? This action cannot be undone.
                                </p>
                            </div>
                            <div className="flex border-t border-white/10">
                                <button
                                    onClick={() => setShowDeleteAllConfirm(false)}
                                    className="flex-1 px-4 py-4 text-sm font-medium text-white/70 hover:bg-white/5 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        onDeleteAllSessions();
                                        setShowDeleteAllConfirm(false);
                                    }}
                                    className="flex-1 px-4 py-4 text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors border-l border-white/10"
                                >
                                    Delete All
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
