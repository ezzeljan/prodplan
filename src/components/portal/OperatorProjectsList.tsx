import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOperatorAuth } from '../../contexts/OperatorAuthContext';
import { storage } from '../../utils/storageProvider';
import type { UnifiedProject } from '../../utils/projectStorage';
import { Loader2, FolderOpen, Calendar, LogOut, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';
import logo from '../../assets/lifewood-logo.png';

export default function OperatorProjectsList() {
    const { operator, logout } = useOperatorAuth();
    const navigate = useNavigate();
    const [projects, setProjects] = useState<UnifiedProject[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadProjects();
    }, [operator]);

    // FIX: Re-fetch projects whenever the operator tab regains focus.
    // This ensures the list reflects assignments made while the tab was in the background.
    useEffect(() => {
        const handleFocus = () => loadProjects();
        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
    }, [operator]);

    const loadProjects = async () => {
        if (!operator) return;
        setLoading(true);
        try {
            const mine = await storage.getAllProjects(undefined, operator.id);
            setProjects(mine);
        } catch (err) {
            console.error('Failed to load projects:', err);
        } finally {
            setLoading(false);
        }
    };

    if (!operator) return null;

    return (
        <div className="min-h-screen gradient-bg">
            {/* Header */}
            <header className="sticky top-0 z-30 bg-[#133020]/90 backdrop-blur-xl border-b border-white/10">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
                    <img
                        src={logo}
                        alt="Lifewood"
                        className="h-8 w-auto object-contain brightness-0 invert"
                    />
                    <div className="flex items-center gap-3">
                        <div className="text-right hidden sm:block">
                            <p className="text-xs font-semibold text-[var(--text-primary)] leading-tight">
                                {operator.name}
                            </p>
                            <p className="text-[10px] text-[var(--text-muted)]">{operator.email}</p>
                        </div>
                        <button
                            onClick={logout}
                            className="glass-card p-2 hover:bg-white/10 transition-colors cursor-pointer"
                            title="Sign out"
                        >
                            <LogOut className="w-4 h-4 text-[var(--text-secondary)]" />
                        </button>
                    </div>
                </div>
            </header>

            {/* Content */}
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
                <div className="mb-8">
                    <h1 className="text-xl font-bold text-[var(--text-primary)]">My Projects</h1>
                    <p className="text-sm text-[var(--text-secondary)] mt-1">
                        Projects where you have assigned output
                    </p>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-6 h-6 text-[var(--accent-secondary)] animate-spin" />
                    </div>
                ) : projects.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col items-center justify-center py-20 text-center"
                    >
                        <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
                            <FolderOpen className="w-8 h-8 text-[var(--text-muted)]" />
                        </div>
                        <h2 className="text-base font-semibold text-[var(--text-primary)]">
                            No projects yet
                        </h2>
                        <p className="text-sm text-[var(--text-secondary)] mt-1 max-w-xs">
                            You haven't been assigned to any projects. Contact your admin for access.
                        </p>
                    </motion.div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {projects.map((project, i) => (
                            <motion.button
                                key={project.id}
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05, duration: 0.35 }}
                                onClick={() => navigate(`/portal/project/${project.id}`)}
                                className="glass-card glass-card-hover p-5 text-left cursor-pointer group"
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className="w-10 h-10 rounded-xl bg-[var(--accent-primary)]/15 flex items-center justify-center">
                                        <span className="text-sm font-bold text-[var(--accent-secondary)]">
                                            {project.name.charAt(0).toUpperCase()}
                                        </span>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--accent-secondary)] transition-colors" />
                                </div>

                                <h3 className="text-sm font-semibold text-[var(--text-primary)] truncate mb-1">
                                    {project.name}
                                </h3>

                                {project.overview && (
                                    <p className="text-xs text-[var(--text-secondary)] line-clamp-2 mb-3">
                                        {project.overview}
                                    </p>
                                )}

                                <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted)]">
                                    <Calendar className="w-3 h-3" />
                                    <span>
                                        {new Date(project.startDate).toLocaleDateString()} — {new Date(project.endDate).toLocaleDateString()}
                                    </span>
                                </div>

                                <div className="mt-3">
                                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${
                                        project.status === 'active'
                                            ? 'bg-[var(--metric-green)]/10 text-[var(--metric-green)]'
                                            : project.status === 'completed'
                                            ? 'bg-[var(--metric-blue)]/10 text-[var(--metric-blue)]'
                                            : 'bg-white/5 text-[var(--text-muted)]'
                                    }`}>
                                        {project.status}
                                    </span>
                                </div>
                            </motion.button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}