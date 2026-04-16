import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    X,
    UserPlus,
    Users,
    Mail,
    Key,
    Trash2,
    Loader2,
    AlertCircle,
    CheckCircle2,
    Shield,
    Plus,
    UserCircle,
    Copy,
    Check,
    Eye
} from 'lucide-react';
import { storage } from '../utils/storageProvider';
import { User, Role } from '../types/auth';
import { useAuth } from '../contexts/AuthContext';
import { useUser } from '../contexts/UserContext';

interface TeamManagementModalProps {
    projectId: string;
    projectTitle: string;
    isOpen: boolean;
    onClose: () => void;
    mode?: 'leads' | 'operators';
}

export default function TeamManagementModal({ 
    projectId, 
    projectTitle, 
    isOpen, 
    onClose,
    mode = 'operators'
}: TeamManagementModalProps) {
    const { authSession } = useAuth();
    const { isAdmin, isTeamLead } = useUser();
    const [teamLeads, setTeamLeads] = useState<User[]>([]);
    const [operators, setOperators] = useState<User[]>([]);
    const [assignedLead, setAssignedLead] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [copiedPin, setCopiedPin] = useState<string | null>(null);
    const [addMode, setAddMode] = useState<'assigned' | 'existing'>('assigned');
    const [availableOperators, setAvailableOperators] = useState<User[]>([]);

    // Form state for creating NEW lead
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        pin: ''
    });

    useEffect(() => {
        if (isOpen) {
            // Force admins to see only assigned operators (view-only mode)
            if (isAdmin && mode === 'operators') {
                setAddMode('assigned');
            }
            
            if (mode === 'leads') {
                loadTeamLeads();
            } else {
                loadOperators();
            }
        }
    }, [isOpen, projectId, mode, isAdmin]);

    const loadOperators = async () => {
        setLoading(true);
        try {
            const projectData = await storage.getProject(projectId);
            if (projectData) {
                setOperators(projectData.operators || []);
            }
        } catch (err) {
            console.error('Failed to load operators:', err);
        } finally {
            setLoading(false);
        }
    };

    const loadTeamLeads = async () => {
        setLoading(true);
        try {
            const allUsers = await storage.getAllUsers();
            const leads = allUsers.filter(u => u.role === Role.TEAM_LEAD);
            
            const projectData = await storage.getProject(projectId);
            if (projectData && projectData.projectManager) {
                setAssignedLead(projectData.projectManager);
                // Available leads are those NOT assigned to this project
                setTeamLeads(leads.filter(l => String(l.id) !== String(projectData.projectManager?.id)));
            } else {
                setAssignedLead(null);
                setTeamLeads(leads);
            }
        } catch (err) {
            console.error('Failed to load team leads:', err);
        } finally {
            setLoading(false);
        }
    };

    const loadAvailableOperators = async () => {
        setLoading(true);
        try {
            const projectData = await storage.getProject(projectId);
            const allUsers = await storage.getAllUsers();
            const allOperators = allUsers.filter(u => u.role === Role.OPERATOR);
            
            const assignedIds = new Set((projectData?.operators || []).map(o => String(o.id)));
            const available = allOperators.filter(op => !assignedIds.has(String(op.id)));
            setAvailableOperators(available);
        } catch (err) {
            console.error('Failed to load available operators:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddExisting = async (operatorId: string) => {
        if (!authSession) {
            setError('Auth session expired. Please login again.');
            return;
        }

        setLoading(true);
        try {
            await storage.assignOperator(projectId, operatorId, authSession.email, authSession.pin);
            await loadOperators();
            await loadAvailableOperators();
        } catch (err: any) {
            setError(err.message || 'Failed to add operator to project.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (mode === 'operators' && addMode === 'existing') {
            loadAvailableOperators();
        }
    }, [addMode, projectId, mode]);

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!authSession) {
            setError('Auth session expired. Please login again.');
            return;
        }
        const { email: callerEmail, pin: callerPin } = authSession;

        setLoading(true);
        try {
            const role = mode === 'leads' ? Role.TEAM_LEAD : Role.OPERATOR;
            const newUser = await storage.saveUser({
                name: formData.name,
                email: formData.email,
                role,
                projectId: projectId,
                projectTitle: projectTitle,
                manualPin: formData.pin || undefined
            }, callerEmail, callerPin);

            if (mode === 'leads') {
                await storage.assignTeamLead(projectId, newUser.id, callerEmail, callerPin);
            }

            setSuccess(`${mode === 'leads' ? 'Team Lead' : 'Operator'} created and assigned successfully!`);
            setFormData({ name: '', email: '', pin: '' });
            setIsAdding(false);
            if (mode === 'leads') loadTeamLeads();
            else loadOperators();
        } catch (err: any) {
            setError(err.message || `Failed to create ${mode === 'leads' ? 'team lead' : 'operator'}`);
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveOperator = async (operatorId: string) => {
        if (!authSession) return;
        const { email: callerEmail, pin: callerPin } = authSession;

        if (!confirm('Are you sure you want to remove this operator from the team?')) return;

        setLoading(true);
        try {
            await storage.removeOperator(projectId, operatorId, callerEmail, callerPin);
            setSuccess('Operator removed from team');
            loadOperators();
        } catch (err: any) {
            setError(err.message || 'Failed to remove operator');
        } finally {
            setLoading(false);
        }
    };

    const handleAssignExisting = async (leadId: string) => {
        if (!authSession) return;
        setLoading(true);
        try {
            await storage.assignTeamLead(projectId, leadId, authSession.email, authSession.pin);
            setSuccess('Team Lead assigned successfully!');
            loadTeamLeads();
        } catch (err: any) {
            setError(err.message || 'Failed to assign team lead');
        } finally {
            setLoading(false);
        }
    };

    const handleUnassignLead = async () => {
        if (!authSession || !assignedLead) return;
        if (!confirm('Unassign this lead from the project?')) return;

        setLoading(true);
        try {
            await storage.updateProject(projectId, { projectManager: null as any }, authSession.email, authSession.pin);
            setSuccess('Team Lead unassigned');
            loadTeamLeads();
        } catch (err: any) {
            setError(err.message || 'Failed to unassign lead');
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedPin(text);
        setTimeout(() => setCopiedPin(null), 2000);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-2xl bg-[#0a1a10] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
                {/* Header */}
                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-white/5 to-transparent">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-[var(--accent-primary)]/20 flex items-center justify-center">
                            <Users className="w-6 h-6 text-[var(--accent-secondary)]" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Team Management</h2>
                            <p className="text-sm text-white/50">{projectTitle}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl transition-colors">
                        <X className="w-5 h-5 text-white/50" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    {/* Error/Success Messages */}
                    <AnimatePresence>
                        {error && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3 text-red-400 text-sm">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                {error}
                            </motion.div>
                        )}
                        {success && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3 text-emerald-400 text-sm">
                                <CheckCircle2 className="w-4 h-4 shrink-0" />
                                {success}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Add Personnel Form/Show Button */}
                    {mode === 'operators' && (
                        <>
                            {isAdmin && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    className="mb-6 p-4 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-start gap-3 text-blue-300 text-sm"
                                >
                                    <Eye className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-semibold mb-1">View Only</p>
                                        <p className="text-xs text-blue-200/80">Admins can view operators but cannot modify them. Team leads manage operators for their projects.</p>
                                    </div>
                                </motion.div>
                            )}
                            {!isAdmin && (
                                !isAdding ? (
                                    <button
                                        onClick={() => setIsAdding(true)}
                                        className="w-full py-4 px-6 rounded-2xl border-2 border-dashed border-white/10 hover:border-[var(--accent-primary)]/50 hover:bg-[var(--accent-primary)]/5 transition-all flex items-center justify-center gap-3 group mb-8"
                                    >
                                        <UserPlus className="w-5 h-5 text-white/30 group-hover:text-[var(--accent-secondary)] transition-colors" />
                                        <span className="text-sm font-medium text-white/50 group-hover:text-white transition-colors">
                                            Register New Operator
                                        </span>
                                    </button>
                                ) : (
                                    <motion.form
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        onSubmit={handleAddUser}
                                        className="glass-card p-6 mb-8 border-[var(--accent-primary)]/20"
                                    >
                                        <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                        <Shield className="w-4 h-4 text-[var(--accent-secondary)]" />
                                        Register New Operator
                                    </h3>
                                    <button type="button" onClick={() => setIsAdding(false)} className="text-xs text-white/40 hover:text-white transition-colors">Cancel</button>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2 col-span-2">
                                        <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider ml-1">Full Name</label>
                                        <div className="relative">
                                            <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                                            <input
                                                type="text"
                                                required
                                                value={formData.name}
                                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                                className="glass-input w-full pl-10 pr-4 py-3 text-sm"
                                                placeholder="Operator Name"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider ml-1">Email Address</label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                                            <input
                                                type="email"
                                                required
                                                value={formData.email}
                                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                                className="glass-input w-full pl-10 pr-4 py-3 text-sm"
                                                placeholder="operator@lifewood.ph"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider ml-1">Custom PIN (Optional)</label>
                                        <div className="relative">
                                            <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                                            <input
                                                type="password"
                                                maxLength={6}
                                                value={formData.pin}
                                                onChange={e => setFormData({ ...formData, pin: e.target.value })}
                                                className="glass-input w-full pl-10 pr-4 py-3 text-sm font-medium tracking-widest placeholder:tracking-normal"
                                                placeholder="6-digit PIN"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full mt-6 py-3 rounded-xl bg-[var(--accent-primary)] text-white text-sm font-bold hover:shadow-lg hover:shadow-[var(--accent-primary)]/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                    Register & Assign Operator
                                </button>
                            </motion.form>
                                )
                            )}
                        </>
                    )}

                    {mode === 'leads' ? (
                        <>
                            {/* Assigned Lead Section */}
                            <div className="mb-10 space-y-4">
                                <h3 className="text-[10px] font-bold text-white/40 uppercase tracking-wider ml-1">
                                    Assigned Project Manager
                                </h3>
                                {assignedLead ? (
                                    <div className="glass-card p-5 border-2 border-[var(--accent-secondary)]/30 ring-4 ring-[var(--accent-secondary)]/5 flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-[var(--accent-primary)]/20 flex items-center justify-center border border-[var(--accent-secondary)]/20">
                                                <span className="text-base font-bold text-[var(--accent-secondary)]">{assignedLead.name.charAt(0).toUpperCase()}</span>
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-bold text-white">{assignedLead.name}</h4>
                                                <p className="text-[11px] text-white/40">{assignedLead.email}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={handleUnassignLead}
                                            className="px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest text-red-400 hover:bg-red-400/10 transition-colors border border-red-500/10"
                                        >
                                            Unassign
                                        </button>
                                    </div>
                                ) : (
                                    <div className="py-8 glass-card border border-dashed border-white/10 flex flex-col items-center justify-center opacity-40">
                                        <p className="text-sm font-medium italic">No manager assigned to this project</p>
                                    </div>
                                )}
                            </div>

                            {/* Available Team Leads List */}
                            <div className="space-y-4">
                                <h3 className="text-[10px] font-bold text-white/40 uppercase tracking-wider ml-1 flex items-center justify-between">
                                    Available Team Leads
                                    <span>{teamLeads.length} Registered</span>
                                </h3>

                                {loading && teamLeads.length === 0 ? (
                                    <div className="py-10 flex flex-col items-center justify-center gap-3">
                                        <Loader2 className="w-6 h-6 text-white/20 animate-spin" />
                                        <p className="text-xs text-white/20">Syncing registry...</p>
                                    </div>
                                ) : (
                                    <div className="grid gap-3">
                                        {teamLeads.length === 0 && !loading && (
                                            <p className="text-xs text-center py-4 text-white/20">No other team leads available in the registry.</p>
                                        )}
                                        {teamLeads.map((u) => (
                                            <div key={u.id} className="glass-card p-4 flex items-center justify-between group hover:border-white/20 transition-all">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                                                        <span className="text-xs font-bold text-white/40">{u.name.charAt(0).toUpperCase()}</span>
                                                    </div>
                                                    <div>
                                                        <h4 className="text-sm font-semibold text-white">{u.name}</h4>
                                                        <span className="text-[10px] text-white/40">{u.email}</span>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleAssignExisting(u.id)}
                                                    className="px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest bg-white/5 hover:bg-[var(--accent-primary)] hover:text-white transition-all border border-white/5"
                                                >
                                                    Assign to Project
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        /* Operators Mode */
                        <div className="space-y-4">
                            {!isAdmin && (
                                <div className="flex items-center gap-2 p-1 bg-white/5 rounded-xl">
                                    <button
                                        onClick={() => setAddMode('assigned')}
                                        className={`flex-1 py-2 px-3 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors ${addMode === 'assigned' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white'}`}
                                    >
                                        Assigned ({operators.length})
                                    </button>
                                    <button
                                        onClick={() => setAddMode('existing')}
                                        className={`flex-1 py-2 px-3 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors ${addMode === 'existing' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white'}`}
                                    >
                                        Add Existing ({availableOperators.length})
                                    </button>
                                </div>
                            )}

                            {addMode === 'existing' ? (
                                <div className="space-y-3 max-h-[40vh] overflow-y-auto custom-scrollbar pr-2">
                                    {loading && availableOperators.length === 0 ? (
                                        <div className="py-10 flex flex-col items-center justify-center gap-3">
                                            <Loader2 className="w-6 h-6 text-white/20 animate-spin" />
                                            <p className="text-xs text-white/20">Loading available operators...</p>
                                        </div>
                                    ) : availableOperators.length === 0 ? (
                                        <div className="py-12 glass-card border border-dashed border-white/10 flex flex-col items-center justify-center text-center p-8">
                                            <UserCircle className="w-10 h-10 text-white/10 mb-3" />
                                            <p className="text-sm text-white/60 mb-1">No available operators</p>
                                            <p className="text-xs text-white/30">All operators may already be assigned to this project.</p>
                                        </div>
                                    ) : (
                                        availableOperators.map((u) => (
                                            <div key={u.id} className="glass-card p-4 flex items-center justify-between group hover:border-white/20 transition-all">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                                                        <span className="text-xs font-bold text-white/40">{u.name.charAt(0).toUpperCase()}</span>
                                                    </div>
                                                    <div>
                                                        <h4 className="text-sm font-semibold text-white">{u.name}</h4>
                                                        <span className="text-[10px] text-white/40">{u.email}</span>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleAddExisting(u.id)}
                                                    disabled={loading || isAdmin}
                                                    className="px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest bg-white/5 hover:bg-[var(--accent-secondary)] hover:text-white transition-all border border-white/5 disabled:opacity-50 disabled:hover:bg-white/5 disabled:cursor-not-allowed"
                                                >
                                                    Add to Project
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            ) : (
                                <>
                                    <h3 className="text-[10px] font-bold text-white/40 uppercase tracking-wider ml-1 flex items-center justify-between">
                                        Current Project Operators
                                        <span>{operators.length} Active</span>
                                    </h3>

                                    {loading && operators.length === 0 ? (
                                        <div className="py-10 flex flex-col items-center justify-center gap-3">
                                            <Loader2 className="w-6 h-6 text-white/20 animate-spin" />
                                            <p className="text-xs text-white/20">Loading operators...</p>
                                        </div>
                                    ) : (
                                        <div className="grid gap-3">
                                            {operators.length === 0 && !loading && (
                                                <div className="py-12 glass-card border border-dashed border-white/10 flex flex-col items-center justify-center text-center p-8">
                                                    <UserCircle className="w-10 h-10 text-white/10 mb-3" />
                                                    <p className="text-sm text-white/60 mb-1">No operators assigned</p>
                                                    <p className="text-xs text-white/30">Add your first team member to start managing operations.</p>
                                                </div>
                                            )}
                                            {operators.map((u) => (
                                                <div key={u.id} className="glass-card p-4 flex items-center justify-between group">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                                                            <span className="text-xs font-bold text-white/40">{u.name.charAt(0).toUpperCase()}</span>
                                                        </div>
                                                        <div>
                                                            <h4 className="text-sm font-semibold text-white">{u.name}</h4>
                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                <span className="text-[10px] text-white/40">{u.email}</span>
                                                                {u.pin && (
                                                                    <button
                                                                        onClick={() => copyToClipboard(u.pin!)}
                                                                        className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-white/5 border border-white/5 hover:bg-white/10 transition-colors"
                                                                    >
                                                                        <span className="text-[9px] font-mono text-[var(--accent-secondary)]">PIN: {u.pin}</span>
                                                                        {copiedPin === u.pin ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5 text-white/20" />}
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => handleRemoveOperator(u.id)}
                                                        disabled={isAdmin}
                                                        className="p-2 text-white/20 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all opacity-0 group-hover:opacity-100 disabled:opacity-0 disabled:cursor-not-allowed"
                                                        title={isAdmin ? "Admins cannot remove operators" : "Remove from project"}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer Tip */}
                <div className="p-4 bg-white/5 flex items-center gap-3">
                    <AlertCircle className="w-4 h-4 text-[var(--accent-secondary)] shrink-0" />
                    <p className="text-[10px] text-white/40 leading-relaxed italic">
                        {mode === 'leads' 
                            ? "Tip: Each project can have only one assigned Team Lead. Assigning a new lead will automatically replace the existing one for this project."
                            : "Tip: Operators can only access projects they are assigned to. Each operator receives a unique PIN for secure login through the Personnel Portal."
                        }
                    </p>
                </div>
            </motion.div>
        </div>
    );
}