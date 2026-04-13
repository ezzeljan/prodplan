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
    Check
} from 'lucide-react';
import { storage } from '../utils/storageProvider';
import { User, Role } from '../types/auth';

interface TeamManagementModalProps {
    projectId: string;
    projectTitle: string;
    isOpen: boolean;
    onClose: () => void;
}

export default function TeamManagementModal({ projectId, projectTitle, isOpen, onClose }: TeamManagementModalProps) {
    const [operators, setOperators] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [copiedPin, setCopiedPin] = useState<string | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        pin: ''
    });

    useEffect(() => {
        if (isOpen) {
            loadOperators();
        }
    }, [isOpen, projectId]);

    const loadOperators = async () => {
        setLoading(true);
        try {
            const allUsers = await storage.getAllUsers();
            // Filter users assigned to this project or assigned as operators in the project object
            // For now, we list all users with Role.OPERATOR and check if they belong to this project
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

    const handleAddOperator = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        const session = sessionStorage.getItem('manager-session') || sessionStorage.getItem('admin-session');
        if (!session) {
            setError('Auth session expired. Please login again.');
            return;
        }
        const { email: callerEmail, pin: callerPin } = JSON.parse(session);

        setLoading(true);
        try {
            const newUser = await storage.saveUser({
                name: formData.name,
                email: formData.email,
                role: Role.OPERATOR,
                projectId: projectId,
                projectTitle: projectTitle,
                manualPin: formData.pin || undefined
            }, callerEmail, callerPin);

            setSuccess('Operator created and assigned successfully!');
            setFormData({ name: '', email: '', pin: '' });
            setIsAdding(false);
            loadOperators();
        } catch (err: any) {
            setError(err.message || 'Failed to create operator');
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveOperator = async (operatorId: string) => {
        const session = sessionStorage.getItem('manager-session') || sessionStorage.getItem('admin-session');
        if (!session) return;
        const { email: callerEmail, pin: callerPin } = JSON.parse(session);

        if (!confirm('Are you sure you want to remove this operator from the team?')) return;

        try {
            await storage.removeOperator(projectId, operatorId, callerEmail, callerPin);
            setSuccess('Operator removed from team');
            loadOperators();
        } catch (err: any) {
            setError(err.message || 'Failed to remove operator');
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
                    {!isAdding ? (
                        <button
                            onClick={() => setIsAdding(true)}
                            className="w-full py-4 px-6 rounded-2xl border-2 border-dashed border-white/10 hover:border-[var(--accent-primary)]/50 hover:bg-[var(--accent-primary)]/5 transition-all flex items-center justify-center gap-3 group mb-8"
                        >
                            <UserPlus className="w-5 h-5 text-white/30 group-hover:text-[var(--accent-secondary)] transition-colors" />
                            <span className="text-sm font-medium text-white/50 group-hover:text-white transition-colors">Add New Operator to Team</span>
                        </button>
                    ) : (
                        <motion.form
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            onSubmit={handleAddOperator}
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
                    )}

                    {/* Team List */}
                    <div className="space-y-4">
                        <h3 className="text-[10px] font-bold text-white/40 uppercase tracking-wider ml-1 flex items-center justify-between">
                            Current Personnel
                            <span>{operators.length} Active</span>
                        </h3>

                        {loading && operators.length === 0 ? (
                            <div className="py-20 flex flex-col items-center justify-center gap-3">
                                <Loader2 className="w-6 h-6 text-white/20 animate-spin" />
                                <p className="text-xs text-white/20">Loading team members...</p>
                            </div>
                        ) : operators.length === 0 ? (
                            <div className="py-12 glass-card flex flex-col items-center justify-center text-center p-8">
                                <UserCircle className="w-10 h-10 text-white/10 mb-3" />
                                <p className="text-sm text-white/60 mb-1">No operators assigned</p>
                                <p className="text-xs text-white/30">Add your first team member to start managing operations.</p>
                            </div>
                        ) : (
                            <div className="grid gap-3">
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
                                                    {/* Display PIN if it's available (usually in create response, but here as well for demo) */}
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
                                            className="p-2 text-white/20 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                            title="Remove from project"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Tip */}
                <div className="p-4 bg-white/5 flex items-center gap-3">
                    <AlertCircle className="w-4 h-4 text-[var(--accent-secondary)] shrink-0" />
                    <p className="text-[10px] text-white/40 leading-relaxed italic">
                        Tip: Operators can only access projects they are assigned to. Each operator receives a unique PIN for secure login through the Personnel Portal.
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
