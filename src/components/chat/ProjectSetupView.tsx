import React, { useState, useEffect } from 'react';
import { FolderOpen, ArrowRight, Loader2, AlertCircle, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { storage } from '../../utils/storageProvider';
import { useAuth } from '../../contexts/AuthContext';
import type { UnifiedProject } from '../../utils/projectStorage';

interface ProjectSetupViewProps {
    onComplete: (projectName: string, projectId: string) => void;
    onReset: () => void;
}

export default function ProjectSetupView({ onComplete, onReset }: ProjectSetupViewProps) {
    const { authSession } = useAuth();
    const [projects, setProjects] = useState<UnifiedProject[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const load = async () => {
            if (!authSession?.id) return;
            try {
                const all = await storage.getAllProjects(authSession.id);
                setProjects(all);
            } catch (err) {
                setError('Could not load projects. Please try again.');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [authSession?.id]);

    const handleSelect = (project: UnifiedProject) => {
        onComplete(project.name, project.id);
    };

    return (
        <div className="h-full flex items-center justify-center p-6 gradient-bg overflow-hidden relative">
            <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-[var(--accent-primary)]/10 rounded-full blur-[100px]" />
            <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-[var(--accent-secondary)]/10 rounded-full blur-[120px]" />

            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="glass-card max-w-lg w-full p-10 relative z-10 shadow-2xl"
            >
                <div className="flex flex-col items-center text-center mb-8">
                    <div className="w-16 h-16 rounded-2xl bg-[var(--accent-primary)]/20 flex items-center justify-center mb-6 ring-1 ring-[var(--accent-secondary)]/30">
                        <FolderOpen className="w-8 h-8 text-[var(--accent-secondary)]" />
                    </div>
                    <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-2">Select a Project</h2>
                    <p className="text-[var(--text-secondary)] text-sm max-w-sm">
                        Choose a project to generate its production plan with the AI Agent.
                    </p>
                </div>

                {loading && (
                    <div className="flex items-center justify-center py-10 gap-3 text-[var(--text-secondary)]">
                        <Loader2 className="w-5 h-5 animate-spin text-[var(--accent-secondary)]" />
                        <span className="text-sm">Loading your projects...</span>
                    </div>
                )}

                {!loading && error && (
                    <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-4">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        {error}
                    </div>
                )}

                {!loading && !error && projects.length === 0 && (
                    <div className="text-center py-8 text-[var(--text-muted)] text-sm">
                        No projects assigned to you yet. Ask your admin to assign you to a project.
                    </div>
                )}

                {!loading && !error && projects.length > 0 && (
                    <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                        {projects.map((project) => (
                            <button
                                key={project.id}
                                onClick={() => handleSelect(project)}
                                className="w-full flex items-center justify-between gap-4 px-5 py-4 rounded-xl border border-[var(--text-muted)]/20 bg-[var(--accent-primary)]/5 hover:bg-[var(--accent-primary)]/15 hover:border-[var(--accent-secondary)]/40 transition-all group text-left"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-8 h-8 rounded-lg bg-[var(--accent-primary)]/20 flex items-center justify-center shrink-0">
                                        <span className="text-xs font-bold text-[var(--accent-secondary)]">
                                            {project.name.charAt(0).toUpperCase()}
                                        </span>
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{project.name}</p>
                                        <p className="text-xs text-[var(--text-muted)]">
                                            {project.startDate} → {project.endDate}
                                        </p>
                                    </div>
                                </div>
                                <ArrowRight className="w-4 h-4 text-[var(--accent-secondary)] shrink-0 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                            </button>
                        ))}
                    </div>
                )}

                <div className="flex items-center justify-center gap-2 text-[var(--text-muted)] text-xs pt-6 pb-2">
                    <Sparkles className="w-3.5 h-3.5 text-[var(--accent-secondary)]" />
                    <span>AI Agent will be configured for the selected project only</span>
                </div>
            </motion.div>
        </div>
    );
}