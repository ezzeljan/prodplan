import React, { useState, useEffect } from 'react';
import { FolderOpen, ArrowRight, Loader2, AlertCircle, Sparkles, FolderPlus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { storage } from '../../utils/storageProvider';
import { useAuth } from '../../contexts/AuthContext';
import { Role, type User } from '../../types/auth';
import type { UnifiedProject } from '../../utils/projectStorage';
import { Users, Shield, UserCircle, CheckCircle } from 'lucide-react';

interface ProjectSetupViewProps {
    onComplete: (projectName: string, projectId: string) => void;
    onReset: () => void;
}

export default function ProjectSetupView({ onComplete, onReset }: ProjectSetupViewProps) {
    const { authSession } = useAuth();
    const isAdmin = authSession?.role === Role.ADMIN;

    // Team lead state
    const [projects, setProjects] = useState<UnifiedProject[]>([]);
    const [loading, setLoading] = useState(!isAdmin);
    const [error, setError] = useState('');

    // Admin state
    const [name, setName] = useState('');
    const [creating, setCreating] = useState(false);
    const [adminStep, setAdminStep] = useState<'project' | 'lead' | 'create-lead'>('project');
    const [createdProject, setCreatedProject] = useState<{ id: string; name: string } | null>(null);
    const [teamLeads, setTeamLeads] = useState<User[]>([]);
    const [fetchingLeads, setFetchingLeads] = useState(false);
    const [assigning, setAssigning] = useState(false);

    // New Team Lead form state
    const [newLeadName, setNewLeadName] = useState('');
    const [newLeadEmail, setNewLeadEmail] = useState('');
    const [newLeadPin, setNewLeadPin] = useState('');

    useEffect(() => {
        // Load projects for Team Leads
        if (!isAdmin) {
            const load = async () => {
                if (!authSession?.id) return;
                try {
                    const all = await storage.getAllProjects(authSession.id);
                    setProjects(all);
                } catch (err) {
                    console.error('Error loading projects:', err);
                    setError('Could not load projects. Please try again.');
                } finally {
                    setLoading(false);
                }
            };
            load();
        } else if (adminStep === 'lead') {
            // Load team leads for Admins in assignment step
            const loadLeads = async () => {
                setFetchingLeads(true);
                try {
                    const all = await storage.getAllUsers();
                    setTeamLeads(all.filter(u => u.role === Role.TEAM_LEAD));
                } catch (err) {
                    console.error('Error loading team leads:', err);
                    setError('Could not load team leads.');
                } finally {
                    setFetchingLeads(false);
                }
            };
            loadLeads();
        }
    }, [authSession?.id, isAdmin, adminStep]);

    const handleSelect = (project: UnifiedProject) => {
        onComplete(project.name, String(project.id));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || creating) return;

        setCreating(true);
        setError('');
        try {
            // Minimal project object for initialization
            const projectToCreate = {
                name: name.trim(),
                status: 'active' as const,
                goal: 0,
                unit: '',
                startDate: new Date().toISOString().split('T')[0],
                endDate: new Date().toISOString().split('T')[0],
                spreadsheetData: { columns: [], rows: [], merges: [] },
                resources: [],
                outputs: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            } as UnifiedProject;

            const response = await storage.saveProject(projectToCreate, authSession?.email, authSession?.pin);

            const projectId = String(response?.id || response?._id || response?.project?.id || `proj-${Date.now()}`);

            setCreatedProject({ id: projectId, name: name.trim() });
            setAdminStep('lead');
        } catch (err) {
            console.error('Project creation failed:', err);
            setError('Failed to create project. Please try again.');
        } finally {
            setCreating(false);
        }
    };

    // ─── BACKGROUND ELEMENTS ───
    const BackgroundBlobs = () => (
        <>
            <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-[var(--accent-primary)]/10 rounded-full blur-[100px]" />
            <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-[var(--accent-secondary)]/10 rounded-full blur-[120px]" />
        </>
    );

    // ─── ADMIN VIEW ───
    if (isAdmin) {
        return (
            <div className="h-full flex items-center justify-center p-6 gradient-bg overflow-hidden relative">
                <BackgroundBlobs />

                <AnimatePresence mode="wait">
                    {adminStep === 'project' ? (
                        <motion.div
                            key="project-step"
                            initial={{ opacity: 0.5, scale: 0.95, x: -20 }}
                            animate={{ opacity: 1, scale: 1, x: 0 }}
                            exit={{ opacity: 0, scale: 0.95, x: 20 }}
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
                                {error && (
                                    <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-4">
                                        <AlertCircle className="w-4 h-4 shrink-0" />
                                        {error}
                                    </div>
                                )}

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
                                    disabled={!name.trim() || creating}
                                    className="glass-btn w-full py-4 text-lg flex items-center justify-center gap-3 group disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {creating ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <>
                                            <span>Initialize Workspace</span>
                                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                        </>
                                    )}
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
                    ) : adminStep === 'lead' ? (
                        <motion.div
                            key="lead-step"
                            initial={{ opacity: 0, scale: 0.95, x: 20 }}
                            animate={{ opacity: 1, scale: 1, x: 0 }}
                            exit={{ opacity: 0, scale: 0.95, x: -20 }}
                            className="glass-card max-w-lg w-full p-10 relative z-10 shadow-2xl"
                        >
                            <div className="flex flex-col items-center text-center mb-8">
                                <div className="w-16 h-16 rounded-2xl bg-[var(--accent-primary)]/20 flex items-center justify-center mb-6 ring-1 ring-[var(--accent-secondary)]/30">
                                    <Shield className="w-8 h-8 text-[var(--accent-secondary)]" />
                                </div>
                                <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-2">Assign Team Lead</h2>
                                <p className="text-[var(--text-secondary)] text-sm max-w-sm">
                                    Select the supervisor responsible for managing <strong>{createdProject?.name}</strong>.
                                </p>
                            </div>

                            <div className="space-y-4">
                                {fetchingLeads ? (
                                    <div className="flex flex-col items-center justify-center py-10 gap-3 text-[var(--text-secondary)]">
                                        <Loader2 className="w-6 h-6 animate-spin text-[var(--accent-secondary)]" />
                                        <span className="text-sm">Fetching team leads...</span>
                                    </div>
                                ) : (
                                    <>
                                        <div className="space-y-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                                            {teamLeads.length === 0 ? (
                                                <div className="text-center py-10 px-6 border-2 border-dashed border-white/5 rounded-2xl opacity-50">
                                                    <AlertCircle className="w-10 h-10 mx-auto mb-3 text-[var(--text-muted)]" />
                                                    <p className="text-sm">No existing Team Leads found.</p>
                                                </div>
                                            ) : (
                                                teamLeads.map((lead) => (
                                                    <button
                                                        key={lead.id}
                                                        disabled={assigning}
                                                        onClick={async () => {
                                                            if (!createdProject || !authSession) return;
                                                            setAssigning(true);
                                                            try {
                                                                await storage.assignTeamLead(createdProject.id, lead.id, authSession.email, authSession.pin);
                                                                onComplete(createdProject.name, createdProject.id);
                                                            } catch (err) {
                                                                console.error('Assignment failed:', err);
                                                                setError('Failed to assign Team Lead.');
                                                            } finally {
                                                                setAssigning(false);
                                                            }
                                                        }}
                                                        className="w-full flex items-center justify-between gap-4 px-5 py-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 hover:border-[var(--accent-secondary)]/40 transition-all group text-left disabled:opacity-50"
                                                    >
                                                        <div className="flex items-center gap-3 min-w-0">
                                                            <div className="w-10 h-10 rounded-xl bg-[var(--accent-primary)]/20 flex items-center justify-center shrink-0">
                                                                <UserCircle className="w-5 h-5 text-[var(--accent-secondary)]" />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="text-sm font-semibold text-white truncate">{lead.name}</p>
                                                                <p className="text-xs text-white/40 truncate">{lead.email}</p>
                                                            </div>
                                                        </div>
                                                        {assigning ? (
                                                            <Loader2 className="w-4 h-4 animate-spin text-[var(--accent-secondary)]" />
                                                        ) : (
                                                            <ArrowRight className="w-4 h-4 text-[var(--accent-secondary)] shrink-0 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                                                        )}
                                                    </button>
                                                ))
                                            )}
                                        </div>

                                        <button
                                            onClick={() => setAdminStep('create-lead')}
                                            className="w-full py-4 mt-2 flex items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-[var(--accent-secondary)]/30 text-[var(--accent-secondary)] font-bold hover:bg-[var(--accent-secondary)]/5 transition-all outline-none focus:ring-2 focus:ring-[var(--accent-secondary)]/50"
                                        >
                                            <Users className="w-5 h-5" />
                                            <span>Create New Team Lead</span>
                                        </button>
                                    </>
                                )}

                                <button
                                    onClick={() => setAdminStep('project')}
                                    className="w-full py-2 text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)] hover:text-white transition-colors"
                                >
                                    Go Back
                                </button>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="create-lead-step"
                            initial={{ opacity: 0, scale: 0.95, x: 20 }}
                            animate={{ opacity: 1, scale: 1, x: 0 }}
                            exit={{ opacity: 0, scale: 0.95, x: -20 }}
                            className="glass-card max-w-lg w-full p-10 relative z-10 shadow-2xl"
                        >
                            <div className="flex flex-col items-center text-center mb-8">
                                <div className="w-16 h-16 rounded-2xl bg-[var(--accent-primary)]/20 flex items-center justify-center mb-6 ring-1 ring-[var(--accent-secondary)]/30">
                                    <Users className="w-8 h-8 text-[var(--accent-secondary)]" />
                                </div>
                                <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-2">New Team Lead</h2>
                                <p className="text-[var(--text-secondary)] text-sm max-w-sm">
                                    Create a new supervisor account for <strong>{createdProject?.name}</strong>.
                                </p>
                            </div>

                            <form className="space-y-4" onSubmit={async (e) => {
                                e.preventDefault();
                                if (!newLeadName.trim() || !newLeadEmail.trim() || assigning) return;

                                setAssigning(true);
                                setError('');
                                try {
                                    if (!createdProject || !authSession) return;

                                    // 1. Save new User
                                    const newUser = await storage.saveUser({
                                        name: newLeadName.trim(),
                                        email: newLeadEmail.trim(),
                                        role: Role.TEAM_LEAD,
                                        manualPin: newLeadPin.trim()
                                    }, authSession.email, authSession.pin);

                                    // 2. Assign to project
                                    await storage.assignTeamLead(createdProject.id, newUser.id, authSession.email, authSession.pin);

                                    onComplete(createdProject.name, createdProject.id);
                                } catch (err) {
                                    console.error('Failed to create and assign lead:', err);
                                    setError('Failed to create new Team Lead. Email might already be in use.');
                                } finally {
                                    setAssigning(false);
                                }
                            }}>
                                {error && (
                                    <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                                        <AlertCircle className="w-4 h-4 shrink-0" />
                                        {error}
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] ml-1">Full Name</label>
                                    <input
                                        required
                                        type="text"
                                        placeholder="Lead User Name"
                                        value={newLeadName}
                                        onChange={(e) => setNewLeadName(e.target.value)}
                                        className="glass-input w-full px-5 py-3 outline-none focus:ring-2 focus:ring-[var(--accent-secondary)] transition-all"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] ml-1">Email Address</label>
                                    <input
                                        required
                                        type="email"
                                        placeholder="lead@lifewood.com"
                                        value={newLeadEmail}
                                        onChange={(e) => setNewLeadEmail(e.target.value)}
                                        className="glass-input w-full px-5 py-3 outline-none focus:ring-2 focus:ring-[var(--accent-secondary)] transition-all"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between ml-1">
                                        <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Pin Code (Login)</label>
                                        <span className="text-[10px] text-[var(--accent-secondary)] opacity-70 font-medium">OPTIONAL</span>
                                    </div>
                                    <input
                                        type="text"
                                        maxLength={6}
                                        placeholder="Auto-generated if blank"
                                        value={newLeadPin}
                                        onChange={(e) => setNewLeadPin(e.target.value.replace(/\D/g, ''))}
                                        className="glass-input w-full px-5 py-3 outline-none focus:ring-2 focus:ring-[var(--accent-secondary)] transition-all font-mono tracking-widest"
                                    />
                                    <p className="text-[10px] text-[var(--text-muted)] ml-1 italic">
                                        * A secure 6-digit PIN will be created automatically if left blank.
                                    </p>
                                </div>

                                <button
                                    type="submit"
                                    disabled={!newLeadName.trim() || !newLeadEmail.trim() || assigning}
                                    className="glass-btn w-full py-4 text-lg flex items-center justify-center gap-3 transition-all disabled:opacity-50"
                                >
                                    {assigning ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <>
                                            <CheckCircle className="w-5 h-5" />
                                            <span>Create & Assign</span>
                                        </>
                                    )}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setAdminStep('lead')}
                                    className="w-full py-2 text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)] hover:text-white transition-colors"
                                >
                                    Back to List
                                </button>
                            </form>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div >
        );
    }

    // ─── TEAM LEAD VIEW: SELECT PROJECT ───
    return (
        <div className="h-full flex items-center justify-center p-6 gradient-bg overflow-hidden relative">
            <BackgroundBlobs />

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
                    <div className="flex flex-col items-center justify-center py-12 px-6 text-center animate-in fade-in zoom-in-95 duration-500">
                        <div className="w-20 h-20 rounded-3xl bg-[var(--accent-primary)]/10 flex items-center justify-center mb-6">
                            <Sparkles className="w-10 h-10 text-[var(--accent-secondary)] opacity-40" />
                        </div>
                        <h3 className="text-xl font-bold text-[var(--text-primary)] mb-3">No Active Assignments</h3>
                        <p className="text-[var(--text-secondary)] text-sm max-w-[280px] leading-relaxed">
                            Your AI workspace is ready, but you haven't been assigned to any projects yet.
                        </p>
                        <div className="mt-6 p-4 rounded-2xl bg-white/5 border border-white/5 text-xs text-[var(--text-muted)] italic">
                            Contact your administrator to link your account to a production project.
                        </div>
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