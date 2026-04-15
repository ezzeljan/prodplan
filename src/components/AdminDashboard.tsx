import { useState, useEffect, useCallback, useRef } from 'react';
import { useProjects, ProjectMetrics } from '../contexts/ProjectContext';
import { useAuth } from '../contexts/AuthContext';
import {
    BarChart3,
    TrendingUp,
    Users,
    Target,
    Award,
    ChevronDown,
    Plus,
    Folder,
    Calendar,
    Activity,
    Trash2,
    Link as LinkIcon,
    Check,
    X,
    KeyRound,
    AlertTriangle,
    Eye,
    EyeOff,
    Briefcase,
    ChevronRight,
    ChevronLeft,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import UserSwitcher from './UserSwitcher';
import { storage } from '../utils/storageProvider';
import { Role, type User } from '../types/auth';

// ─── Metric Card ───
function MetricCard({
    label,
    value,
    subtitle,
    icon: Icon,
    colorClass,
    bgClass,
    delay = 0,
}: {
    label: string;
    value: string | number;
    subtitle?: string;
    icon: React.ElementType;
    colorClass: string;
    bgClass: string;
    delay?: number;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
            className={`glass-card glass-card-hover p-5 ${bgClass}`}
        >
            <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bgClass}`}>
                    <Icon className={`w-5 h-5 ${colorClass}`} />
                </div>
            </div>
            <p className="text-sm text-[var(--text-muted)] mb-1">{label}</p>
            <p className={`text-2xl font-bold ${colorClass}`}>{value}</p>
            {subtitle && <p className="text-xs text-[var(--text-muted)] mt-1">{subtitle}</p>}
        </motion.div>
    );
}

// ─── Operator Row ───
function OperatorRow({
    rank,
    name,
    actual,
    target,
    rate,
}: {
    rank: number;
    name: string;
    actual: number;
    target: number;
    rate: number;
}) {
    const pct = Math.min(rate * 100, 100);
    const barColor =
        rate >= 1 ? 'bg-[var(--metric-green)]'
            : rate >= 0.7 ? 'bg-[var(--metric-amber)]'
                : 'bg-[var(--metric-red)]';

    const statusText = rate >= 1 ? 'Target Met' : rate >= 0.8 ? 'On Track' : rate >= 0.5 ? 'Behind' : 'At Risk';
    const statusColor = 'text-[var(--text-primary)]';

    return (
        <div className="flex items-center gap-4 py-3 border-b border-white/5 last:border-0">
            <span className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-xs font-bold text-[var(--text-muted)]">
                {rank}
            </span>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--text-primary)] truncate">{name}</p>
                <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                        <div className={`h-full rounded-full ${barColor} transition-all duration-700`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-[var(--text-muted)] w-12 text-right">{(rate * 100).toFixed(0)}%</span>
                </div>
            </div>
            <div className="text-right flex flex-col items-end">
                <p className="text-sm font-semibold text-[var(--text-primary)]">{actual}</p>
                <p className={`text-[10px] font-bold uppercase tracking-wider ${statusColor}`}>{statusText}</p>
            </div>
        </div>
    );
}

// ─── Main Dashboard ───
export default function AdminDashboard() {
    const { projects, activeProjectId, setActiveProjectId, getProjectMetrics, updateProject } = useProjects();
    const [filterOpen, setFilterOpen] = useState(false);
    const [selectedPersonnelId, setSelectedPersonnelId] = useState<string | null>(null);
    const projectDetailRef = useRef<HTMLDivElement>(null);


    const scrollToProject = (projectId: string) => {
        setActiveProjectId(projectId);
        setTimeout(() => {
            projectDetailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    };

    // User management state
    const [users, setUsers] = useState<User[]>([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [linkCopied, setLinkCopied] = useState(false);
    const [createdUserDetails, setCreatedUserDetails] = useState<{
        name: string;
        email: string;
        pin: string;
        projectTitle: string;
    } | null>(null);
    const [editUserId, setEditUserId] = useState<string | null>(null);
    const [addForm, setAddForm] = useState<{
        name: string;
        email: string;
        role: Role;
        manualPin: string;
        projectId: string; // Keep ID for legacy logic if needed
        projectTitle: string; // New field for flexible entry
    }>({
        name: '',
        email: '',
        role: Role.TEAM_LEAD,
        manualPin: '',
        projectId: '',
        projectTitle: ''
    });
    const [addError, setAddError] = useState('');
    const [addSubmitting, setAddSubmitting] = useState(false);

    const { authSession } = useAuth();

    const loadUsers = useCallback(async () => {
        try {
            const allUsers = await storage.getAllUsers();
            setUsers(allUsers);
        } catch (err) {
            console.error('Failed to load users', err);
        }
    }, []);

    const [revealedPins, setRevealedPins] = useState<Set<string>>(new Set());

    const togglePin = (userId: string) => {
        setRevealedPins(prev => {
            const next = new Set(prev);
            if (next.has(userId)) next.delete(userId);
            else next.add(userId);
            return next;
        });
    };

    useEffect(() => { loadUsers(); }, [loadUsers]);

    const handleEditUser = (user: User) => {
        setAddForm({
            name: user.name,
            email: user.email,
            role: user.role,
            manualPin: user.pin || '',
            projectId: '',
            projectTitle: ''
        });
        setEditUserId(user.id);
        setShowAddModal(true);
    };

    const portalUrl = `${window.location.origin}/portal`;

    const copyPortalLink = () => {
        navigator.clipboard.writeText(portalUrl);
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2000);
    };

    const handleAddUser = async () => {
        const { name, email, role, manualPin, projectTitle } = addForm;
        if (!name.trim()) {
            setAddError('Please enter a name.');
            return;
        }

        if (!authSession) {
            setAddError('Your session has expired. Please log in again.');
            return;
        }

        setAddSubmitting(true);
        setAddError('');
        try {
            if (editUserId) {
                await storage.updateUser(
                    editUserId,
                    {
                        name: name.trim(),
                        email: email.toLowerCase().trim(),
                        role,
                        manualPin: manualPin.trim() || undefined
                    },
                    authSession.email,
                    authSession.pin
                );
                setEditUserId(null);
            } else {
                const newUser = await storage.saveUser(
                    {
                        name: name.trim(),
                        email: email.toLowerCase().trim(),
                        role,
                        manualPin: manualPin.trim() || undefined,
                        projectTitle: projectTitle.trim() || undefined
                    },
                    authSession.email,
                    authSession.pin
                );
                setCreatedUserDetails({
                    name: newUser.name,
                    email: newUser.email,
                    pin: newUser.pin || 'Check Email',
                    projectTitle: projectTitle.trim() || 'No Project Assigned'
                });
            }

            await loadUsers();
            setAddForm({ name: '', email: '', role: Role.TEAM_LEAD, manualPin: '', projectId: '', projectTitle: '' });
            if (editUserId) setShowAddModal(false);
        } catch (err: any) {
            console.error(err);
            setAddError(err.message || 'Could not connect to the server.');
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
        } catch (err) {
            console.error('Failed to delete user', err);
        }
    };

    const handleAssignTeamLead = async (projectId: string, teamLeadId: string) => {
        if (!authSession) return;
        try {
            await storage.assignTeamLead(projectId, teamLeadId, authSession.email, authSession.pin);
            await loadUsers();
        } catch (err) {
            console.error('Failed to assign team lead', err);
        }
    };



    // Compute metrics for selected project or aggregate all
    const computeMetrics = (): ProjectMetrics & { projectName: string } => {
        if (activeProjectId) {
            const project = projects.find(p => p.id === activeProjectId);
            return { ...getProjectMetrics(activeProjectId), projectName: project?.name || '' };
        }

        // Aggregate across all projects
        const allOutputs = (projects || []).flatMap(p => p?.outputs || []);
        const totalTarget = allOutputs.reduce((s, o) => s + (o?.target || 0), 0);
        const totalActual = allOutputs.reduce((s, o) => s + (o?.actual || 0), 0);
        const completionRate = totalTarget > 0 ? totalActual / totalTarget : 0;

        const byOperator: Record<string, { target: number; actual: number }> = {};
        allOutputs.forEach(o => {
            if (!o || !o.name) return;
            if (!byOperator[o.name]) byOperator[o.name] = { target: 0, actual: 0 };
            byOperator[o.name].target += (o.target || 0);
            byOperator[o.name].actual += (o.actual || 0);
        });

        const operatorSummary = Object.entries(byOperator)
            .map(([name, data]) => ({
                name,
                totalTarget: data.target,
                totalActual: data.actual,
                completionRate: data.target > 0 ? data.actual / data.target : 0,
            }))
            .sort((a, b) => b.totalActual - a.totalActual);

        const now = new Date();
        const weekStr = new Date(now.getTime() - 7 * 86400000).toISOString().split('T')[0];
        const monthStr = new Date(now.getTime() - 30 * 86400000).toISOString().split('T')[0];

        const weeklyByOp: Record<string, number> = {};
        allOutputs.filter(o => o && o.name && o.date >= weekStr).forEach(o => {
            weeklyByOp[o.name] = (weeklyByOp[o.name] || 0) + (o.actual || 0);
        });
        const topWeekly = Object.entries(weeklyByOp).sort((a, b) => b[1] - a[1])[0];

        const monthlyByOp: Record<string, number> = {};
        allOutputs.filter(o => o && o.name && o.date >= monthStr).forEach(o => {
            monthlyByOp[o.name] = (monthlyByOp[o.name] || 0) + (o.actual || 0);
        });
        const topMonthly = Object.entries(monthlyByOp).sort((a, b) => b[1] - a[1])[0];

        return {
            totalTarget,
            totalActual,
            completionRate,
            topPerformerWeekly: topWeekly ? { name: topWeekly[0], output: topWeekly[1] } : null,
            topPerformerMonthly: topMonthly ? { name: topMonthly[0], output: topMonthly[1] } : null,
            operatorSummary,
            projectName: 'All Projects',
        };
    };

    const metrics = computeMetrics();
    if (!metrics) return null; // Defensive check
    const selectedLabel = activeProjectId
        ? projects.find(p => p.id === activeProjectId)?.name || 'Unknown'
        : 'All Projects';

    return (
        <div className="h-full overflow-y-auto custom-scrollbar gradient-bg transition-colors duration-300">
            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

                {/* ── Header ── */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Admin Dashboard</h1>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Project Filter */}
                        <div className="relative">
                            <button
                                onClick={() => setFilterOpen(!filterOpen)}
                                className="glass-card flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-white/10 transition-colors"
                            >
                                <Folder className="w-4 h-4 text-[var(--text-primary)]" />
                                <span className="text-sm font-medium text-[var(--text-primary)]">{selectedLabel}</span>
                                <ChevronDown className={`w-4 h-4 text-[var(--text-primary)] transition-transform ${filterOpen ? 'rotate-180' : ''}`} />
                            </button>

                            <AnimatePresence>
                                {filterOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -8 }}
                                        className="absolute right-0 mt-2 w-64 glass-card py-1.5 z-50 overflow-hidden"
                                    >
                                        <button
                                            onClick={() => { setActiveProjectId(null); setFilterOpen(false); }}
                                            className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-3 ${!activeProjectId ? 'bg-white/10 text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:bg-white/5'}`}
                                        >
                                            <BarChart3 className="w-4 h-4" />
                                            All Projects
                                        </button>
                                        {projects.map(p => (
                                            <button
                                                key={p.id}
                                                onClick={() => scrollToProject(p.id)}
                                                className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-3 ${activeProjectId === p.id ? 'bg-white/10 text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:bg-white/5'}`}
                                            >
                                                <Folder className="w-4 h-4" />
                                                {p.name}
                                            </button>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>


                {/* ── Dashboard Top Actions ── */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-8">
                    {/* Create Project CTA */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.05, duration: 0.4 }}
                        className="md:col-span-8 glass-card p-8 flex flex-col items-center justify-center text-center bg-white/5 border border-black/10 relative overflow-hidden group min-h-[180px]"
                    >
                        <div className="relative z-10">
                            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">Want to create a new project?</h2>
                            <button
                                onClick={() => window.location.href = '/'}
                                className="bg-[#FFB347] text-black px-8 py-3 rounded-2xl font-bold text-sm hover:shadow-2xl hover:shadow-[#FFB347]/40 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                            >
                                <Plus className="w-5 h-5" />
                                Create Project
                            </button>
                        </div>
                        <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-[var(--accent-primary)]/5 rounded-full blur-3xl pointer-events-none group-hover:bg-[var(--accent-primary)]/10 transition-colors" />
                    </motion.div>

                    {/* Mini Calendar View */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1, duration: 0.4 }}
                        className="md:col-span-4 glass-card p-5 bg-white/5 border border-black/10 flex flex-col justify-between"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <button className="p-1.5 rounded-lg hover:bg-white/10 text-[var(--text-primary)] transition-colors"><ChevronLeft className="w-4 h-4" /></button>
                            <h3 className="text-sm font-bold text-[var(--text-primary)]">April 2026</h3>
                            <button className="p-1.5 rounded-lg hover:bg-white/10 text-[var(--text-primary)] transition-colors"><ChevronRight className="w-4 h-4" /></button>
                        </div>

                        <div className="flex justify-between items-center px-1">
                            {[
                                { day: 'Mon', date: 13 },
                                { day: 'Tue', date: 14, current: true },
                                { day: 'Wed', date: 15 },
                                { day: 'Thu', date: 16 },
                                { day: 'Fri', date: 17 },
                                { day: 'Sat', date: 18 },
                                { day: 'Sun', date: 19 }
                            ].map((item, idx) => (
                                <div key={idx} className="flex flex-col items-center gap-2">
                                    <span className={`text-[10px] font-bold ${item.current ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)] opacity-60'}`}>
                                        {item.day}
                                    </span>
                                    <div
                                        className={`w-8 h-12 rounded-xl flex items-center justify-center transition-all ${item.current ? 'text-black shadow-lg' : 'text-[var(--text-primary)] hover:bg-white/5 h-8'}`}
                                        style={item.current ? { backgroundColor: '#FFB347', boxShadow: '0 10px 15px -3px rgba(255, 179, 71, 0.3)' } : {}}
                                    >
                                        <span className="text-sm font-bold">{item.date}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                </div>

                {/* ── Metric Cards ── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 stagger-children">
                    <MetricCard
                        label="Total Output"
                        value={metrics.totalActual.toLocaleString()}
                        subtitle={`of ${metrics.totalTarget.toLocaleString()} target`}
                        icon={BarChart3}
                        colorClass="text-[var(--text-primary)]"
                        bgClass="bg-white/5"
                        delay={0.05}
                    />
                    <MetricCard
                        label="Active Team Leads"
                        value={users.filter(u => u.role === Role.TEAM_LEAD).length}
                        subtitle="managers"
                        icon={Award}
                        colorClass="text-[var(--text-primary)]"
                        bgClass="bg-white/5"
                        delay={0.1}
                    />
                    <MetricCard
                        label="Active Operators"
                        value={metrics.operatorSummary.length}
                        subtitle="contributors"
                        icon={Users}
                        colorClass="text-[var(--text-primary)]"
                        bgClass="bg-white/5"
                        delay={0.15}
                    />
                    <MetricCard
                        label="Projects"
                        value={activeProjectId ? 1 : projects.length}
                        icon={Target}
                        colorClass="text-[var(--text-primary)]"
                        bgClass="bg-white/5"
                        delay={0.2}
                    />
                </div>

                <div className="mb-4">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2.5">
                            <Target className="w-6 h-6 text-[var(--text-primary)]" />
                            Projects
                        </h2>
                        <div className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] bg-white/5 px-3 py-1 rounded-full border border-white/5">
                            {projects.length} Active {projects.length === 1 ? 'Project' : 'Projects'}
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 stagger-children">
                        {projects.map((p, idx) => (
                            <motion.div
                                key={p.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 + idx * 0.05 }}
                                onClick={() => scrollToProject(String(p.id))}
                                className={`glass-card p-5 cursor-pointer transition-all border border-black/10 group hover:-translate-y-1 ${activeProjectId === String(p.id) ? 'border-black/30 ring-2 ring-black/5 shadow-xl' : 'hover:border-black/20'}`}
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center border border-white/10 ${activeProjectId === String(p.id) ? 'bg-white/10' : 'bg-white/5'}`}>
                                        <Briefcase className={`w-5 h-5 text-[var(--text-primary)] ${activeProjectId === String(p.id) ? '' : 'opacity-60'}`} />
                                    </div>
                                    <ChevronRight className={`w-4 h-4 text-[var(--text-primary)] transition-transform group-hover:translate-x-1 ${activeProjectId === String(p.id) ? 'rotate-90' : ''}`} />
                                </div>
                                <h3 className="text-base font-bold text-[var(--text-primary)] mb-1 truncate">{p.name}</h3>
                                <p className="text-xs text-[var(--text-muted)] mb-4 line-clamp-1">{p.goal} {p.unit} target</p>

                                <div className="flex items-center justify-between pt-3 border-t border-white/5">
                                    <div className="flex -space-x-2">
                                        {(p.operators?.slice(0, 3) || []).map(op => (
                                            <div key={op.id} className="w-6 h-6 rounded-full bg-white/20 border-2 border-[#0d1f17] flex items-center justify-center">
                                                <span className="text-[8px] font-bold text-white">{op.name.charAt(0)}</span>
                                            </div>
                                        ))}
                                        {(p.operators?.length || 0) > 3 && (
                                            <div className="w-6 h-6 rounded-full bg-white/10 border-2 border-[#0d1f17] flex items-center justify-center">
                                                <span className="text-[8px] font-bold text-white">+{p.operators!.length - 3}</span>
                                            </div>
                                        )}
                                    </div>
                                    <span className="text-[10px] font-bold text-[var(--text-muted)]">
                                        PM: {p.projectManager?.name || 'Unassigned'}
                                    </span>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>


                {/* ── Top Performers & Operator Table ── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Top Performers */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.25, duration: 0.4 }}
                        className="glass-card p-6"
                    >
                        <h2 className="text-base font-semibold text-[var(--text-primary)] mb-5 flex items-center gap-2">
                            <Award className="w-5 h-5 text-[var(--text-primary)]" />
                            {activeProjectId ? 'Project Leaders' : 'Top Performers'}
                        </h2>

                        {metrics.topPerformerWeekly && (
                            <div className="glass-card p-4 mb-3 bg-white/5">
                                <p className="text-xs text-[var(--text-muted)] mb-1 flex items-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5" /> Weekly Leader
                                </p>
                                <p className="text-lg font-bold text-[var(--text-primary)]">{metrics.topPerformerWeekly.name}</p>
                                <p className="text-sm text-[var(--text-primary)] font-semibold">{metrics.topPerformerWeekly.output} units</p>
                            </div>
                        )}

                        {metrics.topPerformerMonthly && (
                            <div className="glass-card p-4 bg-white/5">
                                <p className="text-xs text-[var(--text-muted)] mb-1 flex items-center gap-1.5">
                                    <Activity className="w-3.5 h-3.5" /> Monthly Leader
                                </p>
                                <p className="text-lg font-bold text-[var(--text-primary)]">{metrics.topPerformerMonthly.name}</p>
                                <p className="text-sm text-[var(--text-primary)] font-semibold">{metrics.topPerformerMonthly.output} units</p>
                            </div>
                        )}

                        {!metrics.topPerformerWeekly && !metrics.topPerformerMonthly && (
                            <p className="text-sm text-[var(--text-muted)]">No data available yet.</p>
                        )}
                    </motion.div>

                    {/* Operator Leaderboard */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3, duration: 0.4 }}
                        className="lg:col-span-2 glass-card p-6"
                    >
                        <h2 className="text-base font-semibold text-[var(--text-primary)] mb-5 flex items-center gap-2">
                            <Users className="w-5 h-5 text-[var(--text-primary)]" />
                            {activeProjectId ? 'Personnel Breakdown' : 'Operator Leaderboard'}
                        </h2>

                        {metrics.operatorSummary.length > 0 ? (
                            <div className="space-y-0">
                                {metrics.operatorSummary.map((op, i) => (
                                    <OperatorRow
                                        key={op.name}
                                        rank={i + 1}
                                        name={op.name}
                                        actual={op.totalActual}
                                        target={op.totalTarget}
                                        rate={op.completionRate}
                                    />
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-[var(--text-muted)]">No operator data available.</p>
                        )}
                    </motion.div>
                </div>

                {/* ── Personnel & User Management ── */}
                <div className="mt-12 mb-5 flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                        <h2 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2.5">
                            <Users className="w-6 h-6 text-[var(--text-primary)]" />
                            Team Lead Management
                        </h2>
                        <p className="text-sm text-[var(--text-muted)]">Register and manage accounts for Team Leads.</p>
                    </div>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="group flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold text-black
                            bg-[#FFB347] hover:shadow-xl hover:shadow-[#FFB347]/30 transition-all cursor-pointer hover:-translate-y-0.5"
                    >
                        <Plus className="w-4 h-4 transition-transform group-hover:rotate-90" />
                        Register New Personnel
                    </button>
                </div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4 }}
                    className="mb-8 glass-card p-6 border-l-4 border-black/20 shadow-2xl relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none" />

                    <div className="relative z-10">

                        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                            {users.filter(u => u.role === Role.TEAM_LEAD).map(u => {
                                const assignedProject = projects.find(p => String(p.projectManager?.id) === String(u.id));
                                return (
                                    <div
                                        key={u.id}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedPersonnelId(u.id);
                                            if (assignedProject) {
                                                scrollToProject(String(assignedProject.id));
                                            } else {
                                                setTimeout(() => {
                                                    projectDetailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                                }, 100);
                                            }
                                        }}
                                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all group cursor-pointer ${activeProjectId === String(assignedProject?.id) || selectedPersonnelId === u.id ? 'bg-white/10 border-black/30 ring-2 ring-black/5' : 'bg-white/5 border-black/10 hover:bg-white/15 hover:border-black/20'}`}
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0 border border-white/10 shadow-inner">
                                            <span className="text-sm font-bold text-[var(--text-primary)]">{u.name.charAt(0)}</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2">
                                                <p className="text-sm font-bold text-[var(--text-primary)] truncate">{u.name}</p>
                                                {assignedProject && (
                                                    <span className="text-[10px] bg-white/5 text-[var(--text-muted)] px-1.5 py-0.5 rounded-md font-bold truncate max-w-[100px]" title={`Assigned to ${assignedProject.name}`}>
                                                        {assignedProject.name}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <p className="text-[11px] text-[var(--text-muted)] truncate opacity-70">{u.email}</p>
                                                {u.pin && (
                                                    <div className="flex items-center gap-1.5">
                                                        <div className="w-1 h-1 rounded-full bg-white/20" />
                                                        {revealedPins.has(u.id) ? (
                                                            <span className="text-[10px] font-mono font-bold text-white bg-white/20 px-1.5 py-0.5 rounded border border-white/10 shadow-sm animate-in fade-in zoom-in duration-200">
                                                                {u.pin}
                                                            </span>
                                                        ) : (
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); togglePin(u.id); }}
                                                                className="text-[10px] font-bold text-white/70 hover:text-white transition-colors flex items-center gap-1"
                                                            >
                                                                <Eye className="w-3 h-3 text-[var(--text-primary)]" />
                                                                Show PIN
                                                            </button>
                                                        )}
                                                        {revealedPins.has(u.id) && (
                                                            <button onClick={(e) => { e.stopPropagation(); togglePin(u.id); }} className="text-white/50 hover:text-white transition-colors">
                                                                <EyeOff className="w-3 h-3" />
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-2 shrink-0 ml-auto">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedPersonnelId(u.id);
                                                    if (assignedProject) {
                                                        scrollToProject(String(assignedProject.id));
                                                    } else {
                                                        setTimeout(() => {
                                                            projectDetailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                                        }, 100);
                                                    }
                                                }}
                                                className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-white/5 hover:bg-white/10 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all border border-white/10 hover:border-white/20"
                                            >
                                                View Team
                                            </button>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleEditUser(u); }}
                                                    className="p-1 text-[var(--text-primary)] hover:bg-white/10 transition-all opacity-80"
                                                    title="Edit account"
                                                >
                                                    <KeyRound className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(u.id); }}
                                                    className="p-1 text-[var(--text-primary)] hover:text-red-500 transition-all opacity-80"
                                                    title="Remove account"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            {users.filter(u => u.role === Role.TEAM_LEAD).length === 0 && (
                                <div className="flex flex-col items-center justify-center py-8 text-center bg-white/5 rounded-2xl border border-dashed border-white/10">
                                    <Users className="w-8 h-8 text-[var(--text-primary)] opacity-40 mb-2" />
                                    <p className="text-xs text-[var(--text-muted)] italic">No Team Leads registered yet.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>

                {/* ── Project Assignments Modal ── */}
                <AnimatePresence>
                    {(activeProjectId || selectedPersonnelId) && (
                        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 bg-black/60 backdrop-blur-md"
                                onClick={() => { setActiveProjectId(null); setSelectedPersonnelId(null); }}
                            />
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto glass-card p-6 border-2 border-white/10 shadow-2xl custom-scrollbar"
                                style={{ background: 'rgba(255, 255, 255, 0.06)' }}
                            >
                                <button
                                    onClick={() => { setActiveProjectId(null); setSelectedPersonnelId(null); }}
                                    className="absolute top-4 right-4 p-2 rounded-xl hover:bg-white/10 transition-colors z-[160]"
                                >
                                    <X className="w-5 h-5 text-[var(--text-primary)]" />
                                </button>

                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2.5">
                                        <Target className="w-6 h-6 text-[var(--text-primary)]" />
                                        {activeProjectId
                                            ? `Project Detail: ${projects.find(p => p.id === activeProjectId)?.name}`
                                            : `Team Lead Selection: ${users.find(u => u.id === selectedPersonnelId)?.name}`
                                        }
                                    </h2>
                                </div>

                                {!activeProjectId && selectedPersonnelId && (
                                    <div className="flex flex-col items-center justify-center py-12 bg-white/5 rounded-2xl border border-dashed border-white/10">
                                        <Activity className="w-12 h-12 text-[var(--text-primary)] mb-4 opacity-40" />
                                        <p className="text-sm text-[var(--text-primary)] font-bold mb-2">Personnel Selected: {users.find(u => u.id === selectedPersonnelId)?.name}</p>
                                        <p className="text-xs text-[var(--text-muted)] mb-8">This user is not currently assigned to an active project.</p>

                                        <div className="w-full max-w-sm px-6">
                                            <h4 className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-3 text-center">Assign Team Lead to Project</h4>
                                            <select
                                                className="glass-input w-full px-4 py-3 text-sm bg-transparent mb-4"
                                                onChange={(e) => {
                                                    handleAssignTeamLead(e.target.value, selectedPersonnelId);
                                                }}
                                                value=""
                                            >
                                                <option value="" disabled className="bg-[#1a1a1a]">Select target project...</option>
                                                {projects.map(p => (
                                                    <option key={p.id} value={p.id} className="bg-[#1a1a1a]">{p.name}</option>
                                                ))}
                                            </select>
                                            <p className="text-[10px] text-center text-[var(--text-muted)] italic">Note: Only Team Leads can be assigned to projects by an Admin.</p>
                                        </div>
                                    </div>
                                )}

                                {activeProjectId && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        {/* Team Lead Assignment */}
                                        <div className="space-y-4">
                                            <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Team Lead Management</h3>
                                            <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                                                <div className="flex items-center gap-4 mb-4">
                                                    <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center border border-white/10">
                                                        <Activity className="w-6 h-6 text-[var(--text-primary)]" />
                                                    </div>
                                                    <div>
                                                        <p className="text-base font-bold text-[var(--text-primary)]">
                                                            {projects.find(p => p.id === activeProjectId)?.projectManager?.name || 'Unassigned'}
                                                        </p>
                                                        <p className="text-xs text-[var(--text-muted)]">Current Project Manager</p>
                                                    </div>
                                                </div>
                                                <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest block mb-2 px-1">Change Assignment</label>
                                                <select
                                                    className="glass-input w-full px-3 py-2.5 text-sm bg-transparent"
                                                    onChange={(e) => handleAssignTeamLead(activeProjectId, e.target.value)}
                                                    value={projects.find(p => p.id === activeProjectId)?.projectManager?.id || ''}
                                                >
                                                    <option value="" disabled className="bg-[#1a1a1a]">Select Team Lead...</option>
                                                    {users.filter(u => u.role === Role.TEAM_LEAD).map(pm => (
                                                        <option key={pm.id} value={pm.id} className="bg-[#1a1a1a]">{pm.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        {/* Assigned Operators */}
                                        <div className="space-y-4">
                                            <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Project Team Insight</h3>
                                            <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                                                {projects.find(p => p.id === activeProjectId)?.operators?.map(op => (
                                                    <div key={op.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors">
                                                        <span className="text-sm text-[var(--text-primary)] font-medium">{op.name}</span>
                                                        <div className="flex items-center gap-1.5 bg-white/5 px-2 py-0.5 rounded-md border border-white/5">
                                                            <div className="w-1 h-1 rounded-full bg-[var(--text-muted)] opacity-50" />
                                                            <span className="text-[10px] text-[var(--text-muted)] font-bold italic">Team Lead Managed</span>
                                                        </div>
                                                    </div>
                                                ))}
                                                {(projects.find(p => p.id === activeProjectId)?.operators?.length || 0) === 0 && (
                                                    <div className="flex flex-col items-center justify-center py-8 text-center bg-white/5 rounded-2xl border border-dashed border-white/10">
                                                        <p className="text-xs text-[var(--text-muted)] italic">No operators assigned to this project yet.</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>


                {/* ── Register Account Modal ── */}
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
                                style={{ background: 'rgba(255, 255, 255, 0.06)' }}
                            >
                                <div className="flex items-center justify-between mb-5">
                                    <h3 className="text-base font-semibold text-[var(--text-primary)]">
                                        {editUserId ? 'Edit Account Details' : 'Register New Account'}
                                    </h3>
                                    <button
                                        onClick={() => { setShowAddModal(false); setAddError(''); setEditUserId(null); }}
                                        className="p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                                    >
                                        <X className="w-4 h-4 text-[var(--text-primary)]" />
                                    </button>
                                </div>

                                {addError && (
                                    <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[var(--metric-red)]/10 border border-[var(--metric-red)]/20 mb-4">
                                        <AlertTriangle className="w-4 h-4 text-[var(--metric-red)] shrink-0" />
                                        <span className="text-xs text-[var(--metric-red)]">{addError}</span>
                                    </div>
                                )}

                                <div className="space-y-4">
                                    {createdUserDetails ? (
                                        <div className="bg-[var(--metric-green)]/10 border border-[var(--metric-green)]/20 rounded-2xl p-6 text-center">
                                            <div className="w-16 h-16 rounded-full bg-[var(--metric-green)]/20 flex items-center justify-center mx-auto mb-4 border-2 border-[var(--metric-green)] shadow-[0_0_15px_rgba(var(--metric-green-rgb),0.3)]">
                                                <Check className="w-8 h-8 text-[var(--metric-green)]" />
                                            </div>
                                            <h4 className="text-lg font-bold text-[var(--text-primary)] mb-1">Team Lead Created</h4>
                                            <p className="text-sm text-[var(--text-secondary)] mb-6">The account and assignment were completed successfully.</p>

                                            <div className="bg-[#0d1f17] rounded-xl p-4 text-left space-y-3 border border-white/5 mx-auto max-w-sm">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs text-[var(--text-muted)]">Full Name</span>
                                                    <span className="text-sm font-semibold text-[var(--text-primary)]">{createdUserDetails.name}</span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs text-[var(--text-muted)]">Email Login</span>
                                                    <span className="text-sm font-semibold text-[var(--text-primary)]">{createdUserDetails.email}</span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs text-[var(--text-muted)]">Project</span>
                                                    <span className="text-xs border border-[var(--metric-purple)]/30 bg-[var(--metric-purple)]/10 text-[var(--metric-purple)] px-2 py-0.5 rounded-md font-bold">{createdUserDetails.projectTitle}</span>
                                                </div>
                                                <div className="flex items-center justify-between pt-3 border-t border-white/5 mt-2">
                                                    <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Account PIN</span>
                                                    <span className="text-xl font-mono font-black text-[var(--metric-green)] tracking-widest">{createdUserDetails.pin}</span>
                                                </div>
                                            </div>

                                            <p className="text-xs text-[var(--text-muted)] mt-5 px-4 italic">Important: Securely share this PIN with the Team Lead. They will use this PIN and their Email to log in.</p>
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
                                                    placeholder="personnel@company.com"
                                                    className="glass-input w-full px-3 py-2.5 text-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-medium text-[var(--text-secondary)] pl-1 mb-1 block">Role</label>
                                                <select
                                                    value={addForm.role}
                                                    onChange={e => setAddForm(f => ({ ...f, role: e.target.value as Role }))}
                                                    className="glass-input w-full px-3 py-2.5 text-sm bg-transparent"
                                                >
                                                    <option value={Role.TEAM_LEAD} className="bg-[#0d1f17]">Team Lead</option>
                                                </select>
                                                <p className="text-[10px] text-[var(--text-muted)] mt-1 pl-1 italic">
                                                    Note: Operators must be created and managed by their respective Team Leads.
                                                </p>
                                            </div>
                                            <div>
                                                <label className="text-xs font-medium text-[var(--text-secondary)] pl-1 mb-1 block">Project Assignment</label>
                                                <div className="relative">
                                                    <input
                                                        list="projects-list"
                                                        value={addForm.projectTitle}
                                                        onChange={e => setAddForm(f => ({ ...f, projectTitle: e.target.value }))}
                                                        placeholder="Type project title or select existing"
                                                        className="glass-input w-full px-3 py-2.5 text-sm"
                                                    />
                                                    <datalist id="projects-list">
                                                        {projects.map(p => (
                                                            <option key={p.id} value={p.name} />
                                                        ))}
                                                    </datalist>
                                                </div>
                                                <p className="text-[10px] text-[var(--text-muted)] mt-1 pl-1 italic">Type a new project name to create it or select from existing ones.</p>
                                            </div>
                                            <div>
                                                <label className="text-xs font-medium text-[var(--text-secondary)] pl-1 mb-1 block">
                                                    {editUserId ? 'Update PIN' : 'Custom PIN (Optional)'}
                                                </label>
                                                <input
                                                    type="text"
                                                    value={addForm.manualPin}
                                                    onChange={e => setAddForm(f => ({ ...f, manualPin: e.target.value }))}
                                                    placeholder={editUserId ? "Leave unchanged to keep current PIN" : "Auto-generate if empty"}
                                                    maxLength={6}
                                                    className="glass-input w-full px-3 py-2.5 text-sm"
                                                />
                                            </div>
                                        </>
                                    )}
                                </div>

                                <div className="flex justify-end gap-2 mt-6">
                                    {createdUserDetails ? (
                                        <button
                                            onClick={() => { setShowAddModal(false); setCreatedUserDetails(null); }}
                                            className="w-full px-4 py-3 rounded-xl text-sm font-bold text-black
                                                bg-[#FFB347] hover:shadow-lg transition-all cursor-pointer shadow-lg shadow-[#FFB347]/20"
                                        >
                                            Acknowledge & Close
                                        </button>
                                    ) : (
                                        <>
                                            <button
                                                onClick={() => { setShowAddModal(false); setAddError(''); setEditUserId(null); }}
                                                className="glass-card px-4 py-2 text-sm font-medium hover:bg-white/10 transition-colors cursor-pointer"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={handleAddUser}
                                                disabled={addSubmitting}
                                                className="px-4 py-2 rounded-xl text-sm font-semibold text-black
                                                    bg-[#FFB347] hover:shadow-lg hover:shadow-[#FFB347]/30 transition-all
                                                    disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                            >
                                                {addSubmitting ? 'Saving...' : editUserId ? 'Update Account' : 'Add Account'}
                                            </button>
                                        </>
                                    )}
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* ── Delete Confirmation Modal ── */}
                <AnimatePresence>
                    {deleteConfirmId && (
                        <div className="fixed inset-0 z-[200] flex items-center justify-center">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                                onClick={() => setDeleteConfirmId(null)}
                            />
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 16 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 16 }}
                                className="relative glass-card p-6 w-full max-w-sm mx-4"
                                style={{ background: 'rgba(255, 255, 255, 0.06)' }}
                            >
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-12 h-12 rounded-full bg-[var(--metric-red)]/20 flex items-center justify-center shrink-0 border border-[var(--metric-red)]/30">
                                        <AlertTriangle className="w-6 h-6 text-[var(--metric-red)]" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-bold text-[var(--text-primary)]">Delete Account</h3>
                                        <p className="text-xs text-[var(--text-muted)] mt-1">
                                            Are you sure you want to delete this Team Lead? This action cannot be undone.
                                        </p>
                                    </div>
                                </div>
                                <div className="flex justify-end gap-2 mt-6">
                                    <button
                                        onClick={() => setDeleteConfirmId(null)}
                                        className="px-4 py-2 text-sm font-medium hover:bg-white/10 transition-colors rounded-xl text-[var(--text-primary)]"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => handleDeleteUser(deleteConfirmId)}
                                        className="px-4 py-2 rounded-xl text-sm font-bold text-black
                                            bg-[#FFB347] hover:bg-[#ffc163] transition-colors shadow-lg shadow-[#FFB347]/20"
                                    >
                                        Delete Forever
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}