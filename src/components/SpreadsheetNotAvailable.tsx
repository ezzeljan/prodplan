import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { 
    ArrowLeft,
    Clock,
    Zap,
    CheckCircle,
    AlertCircle,
    Loader2
} from 'lucide-react';
import { motion } from 'motion/react';
import { storage } from '../utils/storageProvider';
import type { UnifiedProject } from '../utils/projectStorage';

export default function SpreadsheetNotAvailable() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const [project, setProject] = useState<UnifiedProject | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            if (!id) return;
            try {
                const data = await storage.getProject(id);
                if (data) {
                    setProject(data);
                }
            } catch (err) {
                console.error('Error loading project:', err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [id]);

    const isTeamLeadPath = location.pathname.startsWith('/teamlead-dashboard');
    const backPath = isTeamLeadPath ? '/teamlead-dashboard/projects' : '/projects';

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center bg-[var(--surface-primary)]">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-secondary)]" />
                    <p className="text-[var(--text-muted)] text-sm font-medium uppercase tracking-widest">Loading project...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-full w-full bg-[var(--surface-primary)] p-8 flex flex-col transition-colors duration-300">
            {/* Header with back button */}
            <button
                onClick={() => navigate(backPath)}
                className="flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors mb-12 text-sm font-semibold uppercase tracking-wider"
            >
                <ArrowLeft className="w-4 h-4" />
                Back to Projects
            </button>

            {/* Main content */}
            <div className="flex-1 flex items-center justify-center">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4 }}
                    className="max-w-2xl w-full"
                >
                    <div className="glass-card p-12 space-y-8 text-center">
                        {/* Icon */}
                        <motion.div
                            initial={{ y: -20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.1 }}
                            className="flex justify-center"
                        >
                            <div className="w-24 h-24 rounded-3xl bg-[var(--metric-amber)]/10 flex items-center justify-center transition-colors duration-300">
                                <Clock className="w-12 h-12 text-[var(--metric-amber)] transition-colors duration-300" />
                            </div>
                        </motion.div>

                        {/* Title and description */}
                        <motion.div
                            initial={{ y: 10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="space-y-4"
                        >
                            <h1 className="text-4xl font-black text-[var(--text-primary)] transition-colors duration-300">
                                Spreadsheet Not Ready Yet
                            </h1>
                            <p className="text-lg text-[var(--text-muted)] leading-relaxed transition-colors duration-300">
                                {project?.name || 'This project'} doesn't have an active production spreadsheet available at the moment.
                            </p>
                        </motion.div>

                        {/* Status boxes */}
                        <motion.div
                            initial={{ y: 10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.3 }}
                            className="space-y-4"
                        >
                            <div className="bg-[var(--metric-amber)]/5 border border-[var(--metric-amber)]/20 rounded-lg p-6 text-left space-y-3 transition-colors duration-300">
                                <div className="flex items-start gap-3">
                                    <AlertCircle className="w-5 h-5 text-[var(--metric-amber)] flex-shrink-0 mt-0.5 transition-colors duration-300" />
                                    <div>
                                        <p className="font-semibold text-[var(--text-primary)] mb-1 transition-colors duration-300">What does this mean?</p>
                                        <p className="text-sm text-[var(--text-muted)] transition-colors duration-300">
                                            The team lead for this project hasn't started generating the production spreadsheet yet. The spreadsheet is created once the planning phase is initiated.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-[var(--accent-secondary)]/5 border border-[var(--accent-secondary)]/20 rounded-lg p-6 text-left space-y-3 transition-colors duration-300">
                                <div className="flex items-start gap-3">
                                    <Zap className="w-5 h-5 text-[var(--accent-secondary)] flex-shrink-0 mt-0.5 transition-colors duration-300" />
                                    <div>
                                        <p className="font-semibold text-[var(--text-primary)] mb-1 transition-colors duration-300">What happens next?</p>
                                        <p className="text-sm text-[var(--text-muted)] transition-colors duration-300">
                                            Once the team lead completes the project setup and generates the production plan, the spreadsheet will be ready for viewing and editing here.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-[var(--metric-blue)]/5 border border-[var(--metric-blue)]/20 rounded-lg p-6 text-left space-y-3 transition-colors duration-300">
                                <div className="flex items-start gap-3">
                                    <CheckCircle className="w-5 h-5 text-[var(--metric-blue)] flex-shrink-0 mt-0.5 transition-colors duration-300" />
                                    <div>
                                        <p className="font-semibold text-[var(--text-primary)] mb-1 transition-colors duration-300">In the meantime</p>
                                        <p className="text-sm text-[var(--text-muted)] transition-colors duration-300">
                                            You can review project details, manage team members, and set up team leads and operators for this project. Check back later for the spreadsheet.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        {/* CTA Button */}
                        <motion.button
                            initial={{ y: 10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.4 }}
                            onClick={() => navigate(backPath)}
                            className="w-full py-4 rounded-xl bg-[var(--accent-secondary)] text-white text-sm font-black uppercase tracking-[0.2em] shadow-[0_15px_40px_rgba(4,98,65,0.4)] hover:shadow-[0_20px_60px_rgba(4,98,65,0.6)] hover:-translate-y-1 active:translate-y-0 active:scale-[0.98] transition-all duration-300"
                        >
                            Back to Projects
                        </motion.button>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
