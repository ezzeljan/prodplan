import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
    Users,
    Plus,
    Trash2,
    Link as LinkIcon,
    Check,
    X,
    KeyRound,
    AlertTriangle,
    Target,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { type Operator } from '../utils/operatorStorage';
import { storage } from '../utils/storageProvider';
import { Role } from '../types/auth';

export default function TeamLeadDashboard() {
    const { authSession } = useAuth();
    const [operators, setOperators] = useState<Operator[]>([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [linkCopied, setLinkCopied] = useState(false);
    const [createdPin, setCreatedPin] = useState<string | null>(null);
    const [addForm, setAddForm] = useState({ name: '', email: '', manualPin: '', projectId: '', projectTitle: '' });
    const [addError, setAddError] = useState('');
    const [addSubmitting, setAddSubmitting] = useState(false);
    const [myProjects, setMyProjects] = useState<any[]>([]);
    const [addMode, setAddMode] = useState<'register' | 'existing'>('register');
    const [availableOperators, setAvailableOperators] = useState<Operator[]>([]);

    const loadOperators = useCallback(async () => {
        if (!authSession) return;

        try {
            const allUsers = await storage.getAllUsers();
            // In a real scenario, we'd filter by project or team lead assignment
            // For now, Team Leads see all operators or those assigned to their project
            // Assuming TL only manages operators.
            setOperators(allUsers.filter(u => u.role === Role.OPERATOR) as any);

            const allProjects = await storage.getAllProjects();
            const managedProjects = allProjects.filter(p => p.projectManager?.email.toLowerCase() === authSession.email.toLowerCase());
            setMyProjects(managedProjects);

            // Optionally, if the form lacks a projectId, default it to the first managed project
            if (managedProjects.length > 0) {
                setAddForm(f => ({ ...f, projectId: f.projectId || managedProjects[0].id, projectTitle: f.projectTitle || managedProjects[0].name }));
            }
        } catch (err) {
            console.error('Failed to load operators', err);
        }
    }, [authSession]);

    useEffect(() => { loadOperators(); }, [loadOperators]);

    const portalUrl = `${window.location.origin}/portal`;

    const copyPortalLink = () => {
        navigator.clipboard.writeText(portalUrl);
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2000);
    };

    const generatePin = () => {
        const generated = Math.floor(100000 + Math.random() * 900000).toString();
        setAddForm(f => ({ ...f, manualPin: generated }));
    };

    const handleAddOperator = async () => {
        const { name, manualPin, projectId, projectTitle } = addForm;
        if (!name.trim()) {
            setAddError('Name is required.');
            return;
        }

        if (!projectTitle?.trim()) {
            setAddError('You must specify a project to assign the operator to.');
            return;
        }

        if (!authSession) {
            setAddError('Your session has expired. Please log in again.');
            return;
        }

        setAddSubmitting(true);
        setAddError('');
        try {
            const newUser = await storage.saveUser(
                {
                    name: name.trim(),
                    email: '', // Operators do not use an email for login
                    role: Role.OPERATOR,
                    manualPin: manualPin.trim() || undefined,
                    projectId: projectId,
                    projectTitle: projectTitle
                },
                authSession.email,
                authSession.pin
            );

            setCreatedPin(newUser.pin || manualPin.trim() || 'Check Email');
            await loadOperators();
            setAddForm({ name: '', email: '', manualPin: '', projectId: '', projectTitle: '' });
        } catch (err: any) {
            console.error(err);
            setAddError(err.message || 'Could not connect to the server.');
        } finally {
            setAddSubmitting(false);
        }
    };

    const handleAddExistingOperator = async (operatorId: string) => {
        const { projectId } = addForm;
        if (!projectId) {
            setAddError('Please select a project first.');
            return;
        }

        if (!authSession) {
            setAddError('Your session has expired. Please log in again.');
            return;
        }

        setAddSubmitting(true);
        try {
            await storage.assignOperator(projectId, operatorId, authSession.email, authSession.pin);
            await loadOperators();
            setModalClosed();
        } catch (err: any) {
            console.error(err);
            setAddError(err.message || 'Could not add operator to project.');
        } finally {
            setAddSubmitting(false);
        }
    };

    const loadAvailableOperators = async () => {
        const { projectId } = addForm;
        if (!projectId) return;

        try {
            const project = await storage.getProject(projectId);
            const allUsers = await storage.getAllUsers();
            const allOperators = allUsers.filter(u => u.role === Role.OPERATOR) as any[];
            
            const assignedIds = new Set((project?.operators || []).map((o: any) => String(o.id)));
            const available = allOperators.filter(op => !assignedIds.has(String(op.id)));
            setAvailableOperators(available);
        } catch (err) {
            console.error('Failed to load available operators:', err);
        }
    };

    useEffect(() => {
        if (addMode === 'existing' && addForm.projectId) {
            loadAvailableOperators();
        }
    }, [addMode, addForm.projectId]);

    const setModalClosed = () => {
        setShowAddModal(false);
        setCreatedPin(null);
        setAddError('');
        setAddMode('register');
        setAddForm({ name: '', email: '', manualPin: '', projectId: '', projectTitle: '' });
    };

    return (
        <div className="h-full overflow-y-auto custom-scrollbar gradient-bg transition-colors duration-300">
            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[var(--accent-primary)]/20 flex items-center justify-center">
                                <Users className="w-5 h-5 text-[var(--accent-secondary)]" />
                            </div>
                            Team Lead Dashboard
                        </h1>
                        <p className="text-sm text-[var(--text-secondary)] mt-2 ml-[52px]">
                            Manage your operators
                        </p>
                    </div>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1, duration: 0.4 }}
                    className="glass-card p-6"
                >
                    <div className="flex items-center justify-between mb-5">
                        <h2 className="text-base font-semibold text-[var(--text-primary)] flex items-center gap-2">
                            <KeyRound className="w-5 h-5 text-[var(--metric-amber)]" />
                            Operator Accounts
                        </h2>
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white
                                bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)]
                                hover:shadow-lg hover:shadow-[var(--accent-glow)] transition-all cursor-pointer"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            Add Operator
                        </button>
                    </div>

                    <div className="glass-card p-4 mb-5 flex items-center gap-3 flex-wrap">
                        <LinkIcon className="w-4 h-4 text-[var(--accent-secondary)] shrink-0" />
                        <div className="flex-1 min-w-0">
                            <p className="text-xs text-[var(--text-muted)] mb-0.5">Shareable Portal Link</p>
                            <p className="text-sm text-[var(--text-primary)] font-mono truncate">{portalUrl}</p>
                        </div>
                        <button
                            onClick={copyPortalLink}
                            className="glass-card px-3 py-1.5 text-xs font-medium hover:bg-white/10 transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
                        >
                            {linkCopied ? (
                                <><Check className="w-3.5 h-3.5 text-[var(--metric-green)]" /> Copied</>
                            ) : (
                                'Copy Link'
                            )}
                        </button>
                    </div>

                    {operators.length === 0 ? (
                        <p className="text-sm text-[var(--text-muted)] text-center py-6">
                            No operator accounts yet. Add one to get started.
                        </p>
                    ) : (
                        <div className="space-y-0">
                            {operators.map(op => (
                                <div key={op.id} className="flex items-center gap-4 py-3 border-b border-white/5 last:border-0">
                                    <div className="w-8 h-8 rounded-lg bg-[var(--metric-green)]/10 flex items-center justify-center shrink-0">
                                        <span className="text-xs font-bold text-[var(--metric-green)]">
                                            {op.name.charAt(0).toUpperCase()}
                                        </span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-[var(--text-primary)] truncate">{op.name}</p>
                                        <p className="text-xs font-mono font-bold tracking-widest text-[var(--metric-green)]">
                                            PIN: {op.pin || '------'}
                                        </p>
                                    </div>
                                    <p className="text-[10px] text-[var(--text-muted)] hidden sm:block truncate">
                                        {op.createdAt ? new Date(op.createdAt).toLocaleDateString() : 'No Date'}
                                    </p>
                                    {deleteConfirmId === op.id ? (
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={async () => {
                                                    if (!authSession) return;
                                                    try {
                                                        await storage.deleteUser(op.id, authSession.email, authSession.pin);
                                                        await loadOperators();
                                                    } catch (err) {
                                                        console.error('Failed to delete operator', err);
                                                    }
                                                    setDeleteConfirmId(null);
                                                }}
                                                className="p-1.5 rounded-lg bg-[var(--metric-red)]/15 hover:bg-[var(--metric-red)]/25 transition-colors cursor-pointer"
                                                title="Confirm delete"
                                            >
                                                <Check className="w-3.5 h-3.5 text-[var(--metric-red)]" />
                                            </button>
                                            <button
                                                onClick={() => setDeleteConfirmId(null)}
                                                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                                                title="Cancel"
                                            >
                                                <X className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setDeleteConfirmId(op.id)}
                                            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                                            title="Delete operator"
                                        >
                                            <Trash2 className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </motion.div>

                <AnimatePresence>
                    {showAddModal && (
                        <div className="fixed inset-0 z-[200] flex items-center justify-center">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                                onClick={() => { setShowAddModal(false); setAddError(''); }}
                            />
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 16 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 16 }}
                                className="relative glass-card p-6 w-full max-w-md mx-4"
                                style={{ background: 'rgba(13, 31, 23, 0.97)' }}
                            >
                                <div className="flex items-center justify-between mb-5">
                                    <h3 className="text-base font-semibold text-[var(--text-primary)]">Add Operator</h3>
                                    <button
                                        onClick={setModalClosed}
                                        className="p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                                    >
                                        <X className="w-4 h-4 text-[var(--text-muted)]" />
                                    </button>
                                </div>

                                <div className="flex items-center gap-2 mb-4 p-1 bg-white/5 rounded-xl">
                                    <button
                                        onClick={() => setAddMode('register')}
                                        className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-colors ${addMode === 'register' ? 'bg-[var(--accent-primary)] text-white' : 'text-[var(--text-muted)] hover:text-white'}`}
                                    >
                                        Register New
                                    </button>
                                    <button
                                        onClick={() => setAddMode('existing')}
                                        className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-colors ${addMode === 'existing' ? 'bg-[var(--accent-primary)] text-white' : 'text-[var(--text-muted)] hover:text-white'}`}
                                    >
                                        Add Existing
                                    </button>
                                </div>

                                {addError && (
                                    <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[var(--metric-red)]/10 border border-[var(--metric-red)]/20 mb-4">
                                        <AlertTriangle className="w-4 h-4 text-[var(--metric-red)] shrink-0" />
                                        <span className="text-xs text-[var(--metric-red)]">{addError}</span>
                                    </div>
                                )}

                                <div className="space-y-4">
                                    {createdPin ? (
                                        <div className="bg-[var(--metric-green)]/10 border border-[var(--metric-green)]/20 rounded-2xl p-6 text-center">
                                            <p className="text-xs text-[var(--text-muted)] mb-2 uppercase tracking-widest font-bold">New Operator PIN</p>
                                            <p className="text-4xl font-black text-[var(--metric-green)] tracking-[0.2em]">{createdPin}</p>
                                            <p className="text-xs text-[var(--text-muted)] mt-4 px-4">Important: Write this down or share it with the operator now. This is the only time it will be shown.</p>
                                        </div>
                                    ) : (
                                        <>
                                            <div>
                                                <label className="text-xs font-medium text-[var(--text-secondary)] pl-1 mb-1 block">Assign to Project</label>
                                                <div className="relative">
                                                    <Target className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                                                    <select
                                                        value={addForm.projectId}
                                                        onChange={e => {
                                                            const proj = myProjects.find(p => p.id === e.target.value);
                                                            setAddForm(f => ({ ...f, projectId: e.target.value, projectTitle: proj ? proj.name : '' }));
                                                        }}
                                                        className="glass-input w-full pl-9 pr-4 py-2.5 text-sm bg-transparent"
                                                    >
                                                        <option value="">Select a project...</option>
                                                        {myProjects.map(p => (
                                                            <option key={p.id} value={p.id}>{p.name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>

                                            {addMode === 'register' && (
                                                <>
                                                    <div>
                                                        <label className="text-xs font-medium text-[var(--text-secondary)] pl-1 mb-1 block">Name</label>
                                                        <input
                                                            type="text"
                                                            value={addForm.name}
                                                            onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))}
                                                            placeholder="Full name"
                                                            className="glass-input w-full px-3 py-2.5 text-sm"
                                                        />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center justify-between pl-1 mb-1">
                                                            <label className="text-xs font-medium text-[var(--text-secondary)] block">6-Digit PIN</label>
                                                            <button
                                                                type="button"
                                                                onClick={generatePin}
                                                                className="text-[10px] text-[var(--accent-secondary)] hover:underline font-bold"
                                                            >
                                                                Auto-Generate
                                                            </button>
                                                        </div>
                                                        <input
                                                            type="text"
                                                            maxLength={6}
                                                            value={addForm.manualPin || ''}
                                                            onChange={e => setAddForm(f => ({ ...f, manualPin: e.target.value.replace(/\D/g, '').substring(0, 6) }))}
                                                            placeholder="123456"
                                                            className="glass-input w-full px-3 py-2.5 text-sm font-mono tracking-widest"
                                                        />
                                                        <p className="text-[10px] text-[var(--text-muted)] mt-1 px-1">Must be exactly 6 digits. Leave empty for the backend to auto-generate.</p>
                                                    </div>
                                                </>
                                            )}

                                            {addMode === 'existing' && (
                                                <div>
                                                    <label className="text-xs font-medium text-[var(--text-secondary)] pl-1 mb-1 block">Available Operators</label>
                                                    <div className="space-y-2 max-h-[30vh] overflow-y-auto custom-scrollbar">
                                                        {availableOperators.length === 0 ? (
                                                            <p className="text-sm text-[var(--text-muted)] text-center py-4 italic">No available operators to add. All operators may already be assigned to this project.</p>
                                                        ) : (
                                                            availableOperators.map(op => (
                                                                <div
                                                                    key={op.id}
                                                                    onClick={() => handleAddExistingOperator(op.id)}
                                                                    className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5 hover:border-[var(--accent-secondary)]/30 hover:bg-white/10 transition-colors cursor-pointer"
                                                                >
                                                                    <div className="w-8 h-8 rounded-lg bg-[var(--accent-primary)]/10 flex items-center justify-center shrink-0">
                                                                        <span className="text-xs font-bold text-[var(--accent-secondary)]">
                                                                            {op.name?.charAt(0).toUpperCase() || '?'}
                                                                        </span>
                                                                    </div>
                                                                    <span className="text-sm text-[var(--text-primary)] font-medium">{op.name}</span>
                                                                    <span className="text-[10px] text-[var(--text-muted)] ml-auto">
                                                                        {op.email || 'No email'}
                                                                    </span>
                                                                </div>
                                                            ))
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>

                                <div className="flex justify-end gap-2 mt-6">
                                    {createdPin ? (
                                        <button
                                            onClick={setModalClosed}
                                            className="w-full px-4 py-3 rounded-xl text-sm font-bold text-white
                                                bg-[var(--accent-primary)] hover:bg-[var(--accent-secondary)] transition-all cursor-pointer"
                                        >
                                            Done
                                        </button>
                                    ) : (
                                        <>
                                            <button
                                                onClick={setModalClosed}
                                                className="glass-card px-4 py-2 text-sm font-medium hover:bg-white/10 transition-colors cursor-pointer"
                                            >
                                                Cancel
                                            </button>
                                            {addMode === 'register' && (
                                                <button
                                                    onClick={handleAddOperator}
                                                    disabled={addSubmitting}
                                                    className="px-4 py-2 rounded-xl text-sm font-semibold text-white
                                                        bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)]
                                                        hover:shadow-lg hover:shadow-[var(--accent-glow)] transition-all
                                                        disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                                >
                                                    {addSubmitting ? 'Saving...' : 'Add Operator'}
                                                </button>
                                            )}
                                        </>
                                    )}
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}