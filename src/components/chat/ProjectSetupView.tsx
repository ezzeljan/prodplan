import React, { useState } from 'react';
import { FolderPlus, ArrowRight, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

interface ProjectSetupViewProps {
    onComplete: (projectName: string) => void;
    onReset: () => void;
}

export default function ProjectSetupView({ onComplete, onReset }: ProjectSetupViewProps) {
    const [name, setName] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim()) {
            onComplete(name.trim());
        }
    };

    return (
        <div className="h-full flex items-center justify-center p-6 gradient-bg overflow-hidden relative">
            {/* Background elements */}
            <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-[var(--accent-primary)]/10 rounded-full blur-[100px]" />
            <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-[var(--accent-secondary)]/10 rounded-full blur-[120px]" />

            <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="glass-card max-w-lg w-full p-10 relative z-10 shadow-2xl"
            >
                <div className="flex flex-col items-center text-center mb-8">
                    <div className="w-16 h-16 rounded-2xl bg-[var(--accent-primary)]/20 flex items-center justify-center mb-6 ring-1 ring-[var(--accent-secondary)]/30">
                        <FolderPlus className="w-8 h-8 text-[var(--accent-secondary)]" />
                    </div>
                    <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-2">Create Project Folder</h2>
                    <p className="text-[var(--text-secondary)] text-sm max-w-sm">
                        Give your project a name to initialize your AI assistant and workspace.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] ml-1">
                            Project Name
                        </label>
                        <input
                            autoFocus
                            type="text"
                            placeholder="e.g., Video Production Q1"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="glass-input w-full px-5 py-4 text-lg font-medium outline-none focus:ring-2 focus:ring-[var(--accent-secondary)] transition-all"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={!name.trim()}
                        className="glass-btn w-full py-4 text-lg flex items-center justify-center gap-3 group disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <span>Initialize Workspace</span>
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                    
                    <div className="flex items-center justify-center gap-2 text-[var(--text-muted)] text-xs pt-4 pb-2">
                        <Sparkles className="w-3.5 h-3.5 text-[var(--accent-secondary)]" />
                        <span>AI Agent will be configured for this project only</span>
                    </div>

                    <div className="pt-4 mt-4 border-t border-[var(--text-muted)]/10">
                        <button
                            type="button"
                            onClick={() => {
                                if (window.confirm("ARE YOU SURE? This will permanently delete ALL projects, chat history, and generated plans to let you start completely fresh.")) {
                                    onReset();
                                }
                            }}
                            className="w-full py-2 text-xs font-semibold uppercase tracking-widest text-[#FFB347] hover:text-red-400 transition-colors"
                        >
                            Delete All Data & Start Fresh
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
}
