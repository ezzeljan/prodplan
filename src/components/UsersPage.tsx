import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
    Users as UsersIcon, 
    Plus, 
    Trash2, 
    KeyRound, 
    Eye, 
    EyeOff, 
    Mail, 
    Shield, 
    UserCheck,
    AlertTriangle,
    X,
    Activity,
    Lock,
    ChevronLeft,
    ChevronRight,
    Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { storage } from '../utils/storageProvider';
import { useAuth } from '../contexts/AuthContext';
import { Role, type User } from '../types/auth';

const ITEMS_PER_PAGE = 10;

export default function UsersPage() {
    const { authSession } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | Role.TEAM_LEAD | Role.OPERATOR>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [revealedPins, setRevealedPins] = useState<Set<string>>(new Set());
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    
    // Add User Modal State
    const [showAddModal, setShowAddModal] = useState(false);
    const [addForm, setAddForm] = useState({
        name: '',
        email: '',
        role: Role.TEAM_LEAD,
        manualPin: '',
    });
    const [addError, setAddError] = useState('');
    const [addSubmitting, setAddSubmitting] = useState(false);
    const [createdUserDetails, setCreatedUserDetails] = useState<{
        name: string;
        email: string;
        pin: string;
    } | null>(null);

    const loadUsers = useCallback(async () => {
        setLoading(true);
        try {
            const allUsers = await storage.getAllUsers();
            setUsers(Array.isArray(allUsers) ? allUsers : []);
        } catch (err) {
            console.error('Failed to load users', err);
            setUsers([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadUsers(); }, [loadUsers]);

    // Reset pagination when filter or search changes
    useEffect(() => {
        setCurrentPage(1);
    }, [filter, searchQuery]);

    const togglePin = (userId: string) => {
        setRevealedPins(prev => {
            const next = new Set(prev);
            if (next.has(userId)) next.delete(userId);
            else next.add(userId);
            return next;
        });
    };

    const handleAddUser = async () => {
        const { name, email, role, manualPin } = addForm;
        if (!name.trim()) {
            setAddError('Please enter a name.');
            return;
        }
        if (role === Role.TEAM_LEAD && !email.trim()) {
            setAddError('Email is required for Team Leads.');
            return;
        }

        if (!authSession) {
            setAddError('Session expired.');
            return;
        }

        setAddSubmitting(true);
        setAddError('');
        try {
            const newUser = await storage.saveUser(
                {
                    name: name.trim(),
                    email: email.toLowerCase().trim(),
                    role,
                    manualPin: manualPin.trim() || undefined,
                },
                authSession.email,
                authSession.pin
            );
            
            setCreatedUserDetails({
                name: newUser.name,
                email: newUser.email,
                pin: newUser.pin || manualPin.trim() || 'Check Email',
            });
            await loadUsers();
            setAddForm({ name: '', email: '', role: Role.TEAM_LEAD, manualPin: '' });
        } catch (err: any) {
            setAddError(err.message || 'Failed to create user.');
        } finally {
            setAddSubmitting(false);
        }
    };

    const handleDeleteUser = async (id: string) => {
        if (!authSession) return;
        try {
            await storage.deleteUser(id, authSession.email, authSession.pin);
            setDeleteConfirmId(null);
            await loadUsers();
            // Adjust page if it was the last item on the page
            const totalFiltered = filteredAndSearchedUsers.length - 1;
            const newTotalPages = Math.ceil(totalFiltered / ITEMS_PER_PAGE);
            if (currentPage > newTotalPages && newTotalPages > 0) {
                setCurrentPage(newTotalPages);
            }
        } catch (err) {
            console.error('Failed to delete user', err);
        }
    };

    const filteredAndSearchedUsers = useMemo(() => {
        return users.filter(u => {
            const matchesFilter = filter === 'all' || u.role === filter;
            const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                 u.email.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesFilter && matchesSearch;
        });
    }, [users, filter, searchQuery]);

    const totalPages = Math.ceil(filteredAndSearchedUsers.length / ITEMS_PER_PAGE);
    const paginatedUsers = filteredAndSearchedUsers.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    return (
        <div className="h-full overflow-y-auto custom-scrollbar gradient-bg transition-colors duration-300">
            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[var(--accent-primary)]/10 flex items-center justify-center">
                                <UsersIcon className="w-5 h-5 text-[var(--accent-primary)]" />
                            </div>
                            Personnel & Accounts
                        </h1>
                        <p className="text-sm text-[var(--text-secondary)] mt-1 ml-[52px]">
                            Central management and oversight dashboard.
                        </p>
                    </div>

                    <button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#FFB347] text-black font-bold text-sm hover:shadow-xl hover:shadow-[#FFB347]/30 transition-all active:scale-95"
                    >
                        <Plus className="w-4 h-4" />
                        Create Team Lead Account
                    </button>
                </div>

                {/* Status Bar */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
                    <div className="glass-card p-4 flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-[var(--metric-green)]/10 text-[var(--metric-green)]">
                            <UserCheck className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-[var(--text-primary)]">{users.filter(u => u.role === Role.TEAM_LEAD).length}</p>
                            <p className="text-[10px] text-[var(--text-muted)] uppercase font-black tracking-widest">Team Leads</p>
                        </div>
                    </div>
                    <div className="glass-card p-4 flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-[var(--metric-blue)]/10 text-[var(--metric-blue)]">
                            <Activity className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-[var(--text-primary)]">{users.filter(u => u.role === Role.OPERATOR).length}</p>
                            <p className="text-[10px] text-[var(--text-muted)] uppercase font-black tracking-widest">Operators</p>
                        </div>
                    </div>
                    <div className="glass-card p-4 flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]">
                            <UsersIcon className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-[var(--text-primary)]">{users.length}</p>
                            <p className="text-[10px] text-[var(--text-muted)] uppercase font-black tracking-widest">Total Accounts</p>
                        </div>
                    </div>
                    <div className="glass-card p-4 flex items-center gap-3 border-dashed opacity-80">
                         <div className="p-3 rounded-xl bg-[var(--text-muted)]/10 text-[var(--text-muted)]">
                            <Shield className="w-5 h-5" />
                        </div>
                        <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed italic">
                            Admins oversee all accounts; Team Leads manage their project teams.
                        </p>
                    </div>
                </div>

                {/* Controls & Search */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-2 bg-[var(--surface-secondary)]/30 backdrop-blur-sm p-1 rounded-xl border border-[var(--glass-border)] w-fit">
                        <button
                            onClick={() => setFilter('all')}
                            className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${filter === 'all' ? 'bg-[#FFB347] text-black shadow-lg shadow-[#FFB347]/10' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
                        >
                            ALL
                        </button>
                        <button
                            onClick={() => setFilter(Role.TEAM_LEAD)}
                            className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${filter === Role.TEAM_LEAD ? 'bg-[#FFB347] text-black shadow-lg shadow-[#FFB347]/10' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
                        >
                            TEAM LEADS
                        </button>
                        <button
                            onClick={() => setFilter(Role.OPERATOR)}
                            className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${filter === Role.OPERATOR ? 'bg-[#FFB347] text-black shadow-lg shadow-[#FFB347]/10' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
                        >
                            OPERATORS
                        </button>
                    </div>

                    <div className="relative group flex-1 max-w-md">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] group-focus-within:text-[var(--accent-primary)] transition-colors" />
                        <input
                            type="text"
                            placeholder="Search by name or email..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="glass-input w-full pl-11 pr-4 py-2.5 text-sm"
                        />
                    </div>
                </div>

                {/* Account List (Table View) */}
                <div className="glass-card overflow-hidden border border-[var(--glass-border)] mb-6">
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full border-collapse text-left">
                            <thead>
                                <tr className="bg-[var(--surface-secondary)]/50 border-b border-[var(--glass-border)]">
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">User Personnel</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">System Role</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">Professional Email</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">Security PIN</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--glass-border)]">
                                {loading ? (
                                    [...Array(5)].map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td colSpan={5} className="px-6 py-8"><div className="h-4 bg-[var(--text-muted)]/10 rounded w-full" /></td>
                                        </tr>
                                    ))
                                ) : paginatedUsers.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center">
                                            <p className="text-[var(--text-muted)] italic">No accounts found matching the criteria.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedUsers.map((u) => (
                                        <motion.tr 
                                            key={u.id}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="hover:bg-[var(--glass-bg)] transition-colors group"
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs border border-[var(--glass-border)] ${u.role === Role.TEAM_LEAD ? 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]' : 'bg-[var(--metric-blue)]/10 text-[var(--metric-blue)]'}`}>
                                                        {u.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <span className="text-sm font-bold text-[var(--text-primary)]">{u.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded inline-flex items-center gap-1.5 border ${u.role === Role.TEAM_LEAD ? 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border-[var(--accent-primary)]/20' : 'bg-[var(--metric-blue)]/10 text-[var(--metric-blue)] border-[var(--metric-blue)]/20'}`}>
                                                    {u.role === Role.TEAM_LEAD ? <Shield className="w-2.5 h-2.5" /> : <Activity className="w-2.5 h-2.5" />}
                                                    {u.role.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-xs text-[var(--text-secondary)]">
                                                {u.email || (u.role === Role.OPERATOR ? 'Internal (No Email)' : '—')}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 group/pin">
                                                    <span className="text-xs font-mono font-bold tracking-[0.2em] text-[var(--text-secondary)] bg-[var(--surface-secondary)]/50 px-2 py-1 rounded border border-[var(--glass-border)]">
                                                        {revealedPins.has(u.id) ? u.pin : '••••••'}
                                                    </span>
                                                    <button 
                                                        onClick={() => togglePin(u.id)}
                                                        className="p-1 rounded-lg hover:bg-[var(--glass-bg)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all opacity-0 group-focus-within:opacity-100 group-hover/pin:opacity-100"
                                                    >
                                                        {revealedPins.has(u.id) ? <EyeOff size={14} /> : <Eye size={14} />}
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {u.role === Role.TEAM_LEAD ? (
                                                    <div className="flex items-center justify-end gap-2">
                                                        {deleteConfirmId === u.id ? (
                                                            <div className="flex items-center gap-1 animate-in slide-in-from-right-2">
                                                                <button
                                                                    onClick={() => handleDeleteUser(u.id)}
                                                                    className="px-3 py-1.5 rounded-lg bg-[var(--metric-red)] text-white text-[9px] font-black uppercase tracking-widest hover:brightness-110 shadow-lg shadow-red-500/10"
                                                                >
                                                                    Delete Account
                                                                </button>
                                                                <button
                                                                    onClick={() => setDeleteConfirmId(null)}
                                                                    className="p-1.5 rounded-lg bg-[var(--text-muted)]/10 text-[var(--text-primary)] hover:bg-[var(--text-muted)]/20"
                                                                >
                                                                    <X size={14} />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <button 
                                                                onClick={() => setDeleteConfirmId(u.id)}
                                                                className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--metric-red)] hover:bg-[var(--metric-red)]/5 transition-all opacity-0 group-hover:opacity-100"
                                                                title="Delete Account"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center justify-end gap-2 text-[var(--text-muted)] opacity-30 hover:opacity-100 transition-opacity">
                                                        <Lock size={14} />
                                                        <span className="text-[8px] font-black uppercase tracking-tight">Managed Internally</span>
                                                    </div>
                                                )}
                                            </td>
                                        </motion.tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Pagination Controls */}
                {!loading && totalPages > 1 && (
                    <div className="flex items-center justify-between px-2">
                        <p className="text-xs text-[var(--text-secondary)]">
                            Showing <span className="font-bold">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to <span className="font-bold">{Math.min(currentPage * ITEMS_PER_PAGE, filteredAndSearchedUsers.length)}</span> of <span className="font-bold">{filteredAndSearchedUsers.length}</span> personnel
                        </p>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                                className="p-2 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-primary)] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[var(--surface-secondary)] transition-colors"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            
                            {[...Array(totalPages)].map((_, i) => {
                                const pageNum = i + 1;
                                // Simple logic to show current, first, last, and neighbors
                                if (
                                    pageNum === 1 || 
                                    pageNum === totalPages || 
                                    (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                                ) {
                                    return (
                                        <button
                                            key={pageNum}
                                            onClick={() => setCurrentPage(pageNum)}
                                            className={`w-9 h-9 rounded-xl border transition-all text-xs font-bold ${currentPage === pageNum ? 'bg-[#FFB347] border-[#FFB347] text-black shadow-lg shadow-[#FFB347]/20' : 'bg-[var(--glass-bg)] border-[var(--glass-border)] text-[var(--text-secondary)] hover:border-[var(--text-primary)]'}`}
                                        >
                                            {pageNum}
                                        </button>
                                    );
                                } else if (
                                    (pageNum === 2 && currentPage > 3) || 
                                    (pageNum === totalPages - 1 && currentPage < totalPages - 2)
                                ) {
                                    return <span key={pageNum} className="px-1 text-[var(--text-muted)]">...</span>;
                                }
                                return null;
                            })}

                            <button
                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={currentPage === totalPages}
                                className="p-2 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-primary)] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[var(--surface-secondary)] transition-colors"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modals */}
            <AnimatePresence>
                {showAddModal && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-[var(--surface-primary)]/80 backdrop-blur-md"
                            onClick={() => { if (!addSubmitting) setShowAddModal(false); }}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative glass-card p-6 w-full max-w-md shadow-2xl border border-[var(--glass-border)] overflow-hidden"
                            style={{ backgroundColor: 'var(--surface-card)' }}
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--accent-primary)]/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />

                            <div className="flex items-center justify-between mb-8 relative z-10">
                                <div>
                                    <h3 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                                        {createdUserDetails ? 'Account Created' : 'New Team Lead Account'}
                                    </h3>
                                    {!createdUserDetails && (
                                        <p className="text-xs text-[var(--text-secondary)] mt-1">Register a new Team Lead with system credentials.</p>
                                    )}
                                </div>
                                {!createdUserDetails && (
                                    <button
                                        onClick={() => setShowAddModal(false)}
                                        className="p-1.5 rounded-lg hover:bg-[var(--glass-bg)] text-[var(--text-muted)] transition-colors"
                                    >
                                        <X size={20} />
                                    </button>
                                )}
                            </div>

                            {createdUserDetails ? (
                                <div className="space-y-6 relative z-10">
                                    <div className="bg-[var(--accent-primary)]/5 border border-[var(--accent-primary)]/10 rounded-2xl p-8 text-center relative overflow-hidden">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-[var(--accent-primary)] mb-6">Security Clearance Issued</p>
                                        <div className="space-y-4">
                                            <div className="flex flex-col items-center">
                                                <div className="w-16 h-16 rounded-full bg-[var(--accent-primary)]/10 flex items-center justify-center mb-4 border border-[var(--accent-primary)]/20">
                                                    <UserCheck className="w-8 h-8 text-[var(--accent-primary)]" />
                                                </div>
                                                <p className="text-lg font-bold text-[var(--text-primary)]">{createdUserDetails.name}</p>
                                                <p className="text-xs text-[var(--text-secondary)]">{createdUserDetails.email || 'Internal Identifier'}</p>
                                            </div>

                                            <div className="pt-6 border-t border-[var(--glass-border)] w-full">
                                                <p className="text-[10px] text-[var(--text-muted)] mb-3 font-bold uppercase tracking-[0.2em]">Individual Security PIN</p>
                                                <div className="bg-[var(--surface-secondary)]/50 py-4 rounded-xl border border-[var(--glass-border)] shadow-inner">
                                                    <p className="text-4xl font-black text-[#FFB347] tracking-[0.3em] font-mono">{createdUserDetails.pin}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="mt-8 flex items-start gap-2 text-left bg-[var(--metric-amber)]/5 p-3 rounded-lg border border-[var(--metric-amber)]/10">
                                            <AlertTriangle className="w-4 h-4 text-[var(--metric-amber)] shrink-0 mt-0.5" />
                                            <p className="text-[9px] text-[var(--metric-amber)]/80 font-medium leading-relaxed">
                                                This PIN is generated once and cannot be recovered. Ensure the user records it safely during onboarding.
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setCreatedUserDetails(null);
                                            setShowAddModal(false);
                                        }}
                                        className="w-full py-4 rounded-2xl bg-[#FFB347] text-black font-black text-sm uppercase tracking-widest shadow-xl hover:-translate-y-0.5 transition-all active:scale-95"
                                    >
                                        Acknowledge & Close
                                    </button>
                                </div>
                            ) : (
                                    <form 
                                        onSubmit={(e) => {
                                            e.preventDefault();
                                            handleAddUser();
                                        }}
                                        className="space-y-6 relative z-10"
                                    >
                                        {addError && (
                                            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[var(--metric-red)]/10 border border-[var(--metric-red)]/20">
                                                <AlertTriangle className="w-4 h-4 text-[var(--metric-red)] shrink-0" />
                                                <span className="text-xs text-[var(--metric-red)] font-bold">{addError}</span>
                                            </div>
                                        )}

                                        <div className="space-y-4">
                                            <div>
                                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mb-2 ml-1 block italic">Full Name</label>
                                                <input
                                                    type="text"
                                                    required
                                                    value={addForm.name}
                                                    onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))}
                                                    placeholder="Legal name for registration"
                                                    className="glass-input w-full px-5 py-4 text-sm"
                                                />
                                            </div>

                                            <div>
                                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mb-2 ml-1 block italic">Professional Email</label>
                                                <input
                                                    type="email"
                                                    required
                                                    value={addForm.email}
                                                    onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))}
                                                    placeholder="personnel@lifewood.com"
                                                    className="glass-input w-full px-5 py-4 text-sm"
                                                />
                                            </div>

                                            <div>
                                                <div className="flex items-center justify-between pl-1 mb-2">
                                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] italic">Custom PIN (Optional)</label>
                                                    <span className="text-[8px] text-[var(--text-muted)] font-black uppercase tracking-tight opacity-60">ALPHANUMERIC • MAX 6</span>
                                                </div>
                                                <input
                                                    type="text"
                                                    maxLength={6}
                                                    value={addForm.manualPin}
                                                    onChange={e => setAddForm(f => ({ ...f, manualPin: e.target.value }))}
                                                    placeholder="SYSTEM AUTO-GENERATED"
                                                    className="glass-input w-full px-5 py-4 text-sm font-mono tracking-[0.4em] placeholder:tracking-widest placeholder:font-sans placeholder:text-[var(--text-muted)]/50"
                                                />
                                            </div>
                                        </div>

                                        <div className="pt-4">
                                            <button
                                                type="submit"
                                                disabled={addSubmitting}
                                                className="w-full py-5 rounded-2xl bg-gradient-to-r from-[#FFB347] to-[#FFA520] text-black font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:-translate-y-0.5 transition-all active:translate-y-0 active:scale-[0.98] disabled:opacity-50 disabled:grayscale"
                                            >
                                                {addSubmitting ? 'INITIALIZING...' : 'CREATE TEAM LEAD'}
                                            </button>
                                            <p className="text-[9px] text-[var(--text-muted)] text-center mt-4 uppercase tracking-[0.1em] font-medium font-mono">
                                                Encrypted transmission • Local Storage Fallback: ACTIVE
                                            </p>
                                        </div>
                                    </form>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
