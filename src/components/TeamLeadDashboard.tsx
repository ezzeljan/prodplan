import { useState, useEffect, useCallback } from 'react';
import {
    Users,
    Plus,
    Trash2,
    Link as LinkIcon,
    Check,
    X,
    KeyRound,
    AlertTriangle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { type Operator } from '../utils/operatorStorage';

export default function TeamLeadDashboard() {
    const [operators, setOperators] = useState<Operator[]>([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [linkCopied, setLinkCopied] = useState(false);
    const [createdPin, setCreatedPin] = useState<string | null>(null);
    const [addForm, setAddForm] = useState({ name: '', email: '' });
    const [addError, setAddError] = useState('');
    const [addSubmitting, setAddSubmitting] = useState(false);

    const loadOperators = useCallback(async () => {
        const teamLeadSession = sessionStorage.getItem('teamlead-session');
        if (!teamLeadSession) return;
        const { email, pin } = JSON.parse(teamLeadSession);

        try {
            const response = await fetch(`http://localhost:8080/api/users?teamLeadEmail=${email}&teamLeadPin=${pin}`);
            if (response.ok) {
                const data = await response.json();
                const ops: Operator[] = data.map((u: any) => ({
                    id: u.id.toString(),
                    name: u.name,
                    email: u.email,
                    pinHash: '',
                    createdAt: new Date().toISOString()
                }));
                setOperators(ops);
            }
        } catch (err) {
            console.error('Failed to load operators', err);
        }
    }, []);

    useEffect(() => { loadOperators(); }, [loadOperators]);

    const portalUrl = `${window.location.origin}/portal`;

    const copyPortalLink = () => {
        navigator.clipboard.writeText(portalUrl);
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2000);
    };

    const handleAddOperator = async () => {
        const { name, email } = addForm;
        if (!name.trim() || !email.trim()) {
            setAddError('All fields are required.');
            return;
        }

        const teamLeadSession = sessionStorage.getItem('teamlead-session');
        if (!teamLeadSession) {
            setAddError('Your session has expired. Please log in again.');
            return;
        }
        const teamLead = JSON.parse(teamLeadSession);

        setAddSubmitting(true);
        setAddError('');
        try {
            const response = await fetch('http://localhost:8080/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name.trim(),
                    email: email.toLowerCase().trim(),
                    role: 'OPERATOR',
                    teamLeadEmail: teamLead.email,
                    teamLeadPin: teamLead.pin
                })
            });

            const data = await response.json();

            if (!response.ok) {
                setAddError(data.error || 'Failed to save operator.');
                return;
            }

            setCreatedPin(data.user.pin);
            await loadOperators();
            setAddForm({ name: '', email: '' });
        } catch (err) {
            console.error(err);
            setAddError('Could not connect to the server.');
        } finally {
            setAddSubmitting(false);
        }
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
                                        <p className="text-xs text-[var(--text-muted)] truncate">{op.email}</p>
                                    </div>
                                    <p className="text-[10px] text-[var(--text-muted)] hidden sm:block">
                                        {new Date(op.createdAt).toLocaleDateString()}
                                    </p>
                                    {deleteConfirmId === op.id ? (
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={async () => {
                                                    await fetch(`http://localhost:8080/api/users/${op.id}`, {
                                                        method: 'DELETE',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({ teamLeadEmail: JSON.parse(sessionStorage.getItem('teamlead-session') || '{}').email })
                                                    });
                                                    await loadOperators();
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
                                        onClick={() => { setShowAddModal(false); setAddError(''); setCreatedPin(null); }}
                                        className="p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                                    >
                                        <X className="w-4 h-4 text-[var(--text-muted)]" />
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
                                                <label className="text-xs font-medium text-[var(--text-secondary)] pl-1 mb-1 block">Email</label>
                                                <input
                                                    type="email"
                                                    value={addForm.email}
                                                    onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))}
                                                    placeholder="operator@company.com"
                                                    className="glass-input w-full px-3 py-2.5 text-sm"
                                                />
                                            </div>
                                        </>
                                    )}
                                </div>

                                <div className="flex justify-end gap-2 mt-6">
                                    {createdPin ? (
                                        <button
                                            onClick={() => { setShowAddModal(false); setCreatedPin(null); }}
                                            className="w-full px-4 py-3 rounded-xl text-sm font-bold text-white
                                                bg-[var(--accent-primary)] hover:bg-[var(--accent-secondary)] transition-all cursor-pointer"
                                        >
                                            Done
                                        </button>
                                    ) : (
                                        <>
                                            <button
                                                onClick={() => { setShowAddModal(false); setAddError(''); }}
                                                className="glass-card px-4 py-2 text-sm font-medium hover:bg-white/10 transition-colors cursor-pointer"
                                            >
                                                Cancel
                                            </button>
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