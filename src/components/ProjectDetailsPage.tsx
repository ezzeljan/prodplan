import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { 
    FolderOpen, 
    Calendar, 
    Users, 
    Target, 
    Clock, 
    FileSpreadsheet, 
    ArrowLeft,
    Loader2,
    AlertCircle
} from 'lucide-react';
import { motion } from 'motion/react';
import { storage } from '../utils/storageProvider';
import { useUser } from '../contexts/UserContext';
import type { UnifiedProject } from '../utils/projectStorage';
import TeamManagementModal from './TeamManagementModal';

export default function ProjectDetailsPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const { isAdmin } = useUser();
    const [project, setProject] = useState<UnifiedProject | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'leads' | 'operators'>('operators');

    useEffect(() => {
        const load = async () => {
            if (!id) return;
            setLoading(true);
            try {
                const data = await storage.getProject(id);
                if (data) {
                    setProject(data);
                } else {
                    setError('Project not found');
                }
            } catch (err) {
                console.error('Error loading project:', err);
                setError('Failed to load project details');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [id]);

    const formatDate = (dateStr: string) => {
        try {
            if (!dateStr) return 'N/A';
            return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        } catch { return dateStr || 'N/A'; }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return { text: 'text-[var(--metric-green)]', bg: 'bg-[var(--metric-green)]/10', border: 'border-[var(--metric-green)]/20' };
            case 'completed': return { text: 'text-[var(--metric-blue)]', bg: 'bg-[var(--metric-blue)]/10', border: 'border-[var(--metric-blue)]/20' };
            case 'archived': return { text: 'text-[var(--text-muted)]', bg: 'bg-[var(--text-muted)]/10', border: 'border-[var(--text-muted)]/20' };
            default: return { text: 'text-[var(--text-muted)]', bg: 'bg-[var(--text-muted)]/10', border: 'border-[var(--text-muted)]/20' };
        }
    };

    const isTeamLeadPath = location.pathname.startsWith('/teamlead-dashboard');
    const backPath = isTeamLeadPath ? '/teamlead-dashboard/projects' : '/projects';
    const spreadsheetPath = isTeamLeadPath ? `/teamlead-dashboard/projects/${id}/spreadsheet` : `/projects/${id}/spreadsheet`;

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center bg-[var(--surface-primary)]">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-secondary)]" />
                    <p className="text-[var(--text-muted)] text-sm font-medium uppercase tracking-widest">Loading project workspace...</p>
                </div>
            </div>
        );
    }

    if (error || !project) {
        return (
            <div className="h-full flex items-center justify-center bg-[var(--surface-primary)] p-4">
                <div className="glass-card max-w-md w-full p-8 text-center flex flex-col items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
                        <AlertCircle className="w-8 h-8" />
                    </div>
                    <h2 className="text-xl font-bold text-[var(--text-primary)]">{error || 'Project Error'}</h2>
                    <button onClick={() => navigate(backPath)} className="glass-btn px-6 py-2 text-sm mt-2">
                        Back to Projects
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto custom-scrollbar gradient-bg relative">
            {/* Header & Background */}
            <div className="absolute top-0 left-0 right-0 h-96 bg-gradient-to-b from-[#046241]/20 to-transparent pointer-events-none" />
            
            <div className="relative z-10 max-w-5xl mx-auto px-6 py-10 lg:py-16">
                {/* Back Button */}
                <button 
                    onClick={() => navigate(backPath)}
                    className="flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all text-xs font-bold uppercase tracking-widest mb-10 group"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    Explorer / Projects
                </button>

                {/* Identity Section */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 mb-12">
                    <div className="flex items-center gap-6">
                        <motion.div 
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="w-20 h-20 lg:w-24 lg:h-24 rounded-3xl bg-[var(--accent-primary)]/20 flex items-center justify-center ring-1 ring-[var(--accent-secondary)]/30 shadow-[0_20px_50px_rgba(4,98,65,0.3)] shadow-inner"
                        >
                            <FolderOpen className="w-10 h-10 lg:w-12 lg:h-12 text-[var(--accent-secondary)]" />
                        </motion.div>
                        <div>
                            <motion.h1 
                                initial={{ x: -20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                className="text-4xl lg:text-5xl font-black text-[var(--text-primary)] mb-2"
                            >
                                {project.name}
                            </motion.h1>
                            <p className="text-[var(--text-muted)] text-xs lg:text-sm font-medium flex items-center gap-2 uppercase tracking-[0.2em]">
                                <Clock className="w-4 h-4" />
                                Created on {formatDate(project.createdAt)}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <motion.span 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className={`px-5 py-2 rounded-2xl text-[11px] font-black uppercase tracking-[0.15em] border ${getStatusColor(project.status).text} ${getStatusColor(project.status).bg} ${getStatusColor(project.status).border} shadow-[0_8px_16px_rgba(0,0,0,0.2)]`}
                        >
                            Status: {project.status}
                        </motion.span>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Details */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Summary Card */}
                        <motion.div 
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.1 }}
                            className="glass-card p-8 lg:p-10 border-[var(--border-color)]"
                        >
                            <h3 className="text-[10px] font-bold text-[var(--text-muted)] opacity-50 uppercase tracking-[0.4em] mb-6">Workspace Overview</h3>
                            <p className="text-lg lg:text-xl text-[var(--text-secondary)] leading-relaxed font-medium">
                                {project.overview || 'The AI assistant has been configured for this production workspace. No summary details have been provided yet.'}
                            </p>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-10 mt-12 pt-10 border-t border-white/5">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between mb-4">
                                        <h4 className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.4em] flex items-center gap-2">
                                            <Users className="w-4 h-4" />
                                            Team Lead
                                        </h4>
                                        {isAdmin && (
                                            <button 
                                                onClick={() => { setModalMode('leads'); setIsTeamModalOpen(true); }}
                                                className="text-[10px] font-bold text-[var(--accent-secondary)] uppercase tracking-[0.1em] hover:underline"
                                            >
                                                Manage
                                            </button>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-4 p-4 rounded-3xl bg-[var(--surface-primary)]/50 border border-[var(--border-color)]">
                                        <div className="w-12 h-12 rounded-2xl bg-[var(--accent-primary)]/10 flex items-center justify-center text-lg font-bold text-[var(--accent-secondary)]">
                                            {project.projectManager?.name?.charAt(0) || project.projectManager?.email?.charAt(0) || '—'}
                                        </div>
                                        <div>
                                            <p className="font-bold text-[var(--text-primary)] text-base">{project.projectManager?.name || project.projectManager?.email || 'Unassigned'}</p>
                                            <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-tighter mt-1">Project Supervisor</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.4em] flex items-center gap-2">
                                        <Calendar className="w-4 h-4" />
                                        Project Timeline
                                    </h4>
                                    <div className="flex items-center gap-4 p-4 rounded-3xl bg-[var(--surface-primary)]/50 border border-[var(--border-color)]">
                                        <div className="w-12 h-12 rounded-2xl bg-[var(--surface-secondary)] flex flex-col items-center justify-center">
                                            <span className="text-[10px] font-bold text-[var(--text-muted)] leading-none mb-1">DAYS</span>
                                            <span className="text-lg font-black text-[var(--text-primary)] leading-none">
                                                {Math.max(1, Math.ceil((new Date(project.endDate).getTime() - new Date(project.startDate).getTime()) / (1000 * 60 * 60 * 24)))}
                                            </span>
                                        </div>
                                        <div>
                                            <p className="font-bold text-[var(--text-primary)] text-sm">
                                                {formatDate(project.startDate)} 
                                            </p>
                                            <p className="text-[11px] text-[var(--text-muted)] mt-1 font-medium italic">
                                                through {formatDate(project.endDate)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        {/* Workforce Card */}
                        <motion.div 
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="glass-card p-8 lg:p-10 border-[var(--border-color)]"
                        >
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.4em]">Project Workforce</h3>
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--surface-primary)] border border-[var(--border-color)]">
                                        <Users className="w-3.5 h-3.5 text-[var(--accent-secondary)]" />
                                        <span className="text-xs font-bold text-[var(--text-secondary)]">{project.operators?.length || 0} Operators</span>
                                    </div>
                                    {isAdmin && (
                                        <button 
                                            onClick={() => { setModalMode('operators'); setIsTeamModalOpen(true); }}
                                            className="text-[10px] font-bold text-[var(--accent-secondary)] uppercase tracking-[0.1em] hover:underline"
                                        >
                                            Manage
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {project.operators && project.operators.length > 0 ? (
                                    project.operators.map((op, i) => (
                                        <div key={i} className="flex items-center gap-3 p-4 rounded-2xl bg-[var(--surface-primary)] border border-[var(--border-color)] hover:border-[var(--accent-secondary)]/30 transition-colors cursor-default">
                                            <div className="w-8 h-8 rounded-lg bg-[var(--surface-secondary)] flex items-center justify-center text-[10px] font-bold text-[var(--text-muted)]">
                                                {op.name?.split(' ').map(n => n[0]).join('') || 'OP'}
                                            </div>
                                            <span className="text-sm font-bold text-[var(--text-secondary)]">{op.name}</span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="col-span-full py-10 flex flex-col items-center justify-center gap-3 text-[var(--text-muted)] opacity-50 border-2 border-dashed border-[var(--border-color)] rounded-3xl">
                                        <Users className="w-8 h-8 opacity-20" />
                                        <p className="text-sm italic tracking-widest uppercase">No workforce data available</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>

                    {/* Right Column: Actions & Meta */}
                    <div className="space-y-8">
                        {/* Spreadsheet Action Card */}
                        <motion.div 
                            initial={{ x: 20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: 0.3 }}
                            className="glass-card overflow-hidden group border-[var(--accent-secondary)]/30 border-2"
                        >
                            <div className="p-8 space-y-6">
                                <h3 className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.4em]">Primary Tool</h3>
                                <div className="space-y-4">
                                    <div className="w-16 h-16 rounded-2xl bg-[var(--accent-primary)]/10 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                        <FileSpreadsheet className="w-8 h-8 text-[var(--accent-secondary)]" />
                                    </div>
                                    <div>
                                        <h4 className="text-xl font-bold text-[var(--text-primary)]">Production Spreadsheet</h4>
                                        <p className="text-[13px] text-[var(--text-muted)] mt-1 leading-relaxed">Manage your workforce targets, daily outputs, and real-time project metrics inside the grid.</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => navigate(spreadsheetPath)}
                                    className="w-full py-5 rounded-2xl bg-[var(--accent-secondary)] text-[#133020] text-sm font-black uppercase tracking-[0.2em] shadow-[0_15px_40px_rgba(4,98,65,0.4)] hover:shadow-[0_20px_60px_rgba(4,98,65,0.6)] hover:-translate-y-1 active:translate-y-0 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                                >
                                    <span>Open Spreadsheet</span>
                                </button>
                            </div>
                        </motion.div>

                        {/* Metric Goal Card */}
                        <motion.div 
                            initial={{ x: 20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: 0.4 }}
                            className="glass-card p-8 space-y-4 border-[var(--border-color)]"
                        >
                            <h3 className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.4em] flex items-center gap-2">
                                <Target className="w-4 h-4 text-[var(--accent-secondary)]" />
                                Baseline Target
                            </h3>
                            <div>
                                <p className="text-5xl font-black text-[var(--text-primary)] tabular-nums">
                                    {(project.goal || 0).toLocaleString()}
                                </p>
                                <p className="text-xs font-bold text-[var(--accent-secondary)] uppercase tracking-[0.2em] mt-2 opacity-60">
                                    Total {project.unit} expected
                                </p>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>

            {project && (
                <TeamManagementModal
                    isOpen={isTeamModalOpen}
                    mode={modalMode}
                    onClose={() => {
                        setIsTeamModalOpen(false);
                        // Refresh project data to show newly assigned lead/operators
                        if (id) {
                            storage.getProject(id).then(data => data && setProject(data));
                        }
                    }}
                    projectId={project.id}
                    projectTitle={project.name}
                />
            )}
        </div>
    );
}
