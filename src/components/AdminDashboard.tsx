import { useState, useEffect, useCallback } from 'react';
import { useProjects, ProjectMetrics } from '../contexts/ProjectContext';
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
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import UserSwitcher from './UserSwitcher';
import { storage } from '../utils/storageProvider';
import { hashPin, type Operator } from '../utils/operatorStorage';

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
            <div className="text-right">
                <p className="text-sm font-semibold text-[var(--text-primary)]">{actual}</p>
                <p className="text-xs text-[var(--text-muted)]">/ {target}</p>
            </div>
        </div>
    );
}

// ─── Main Dashboard ───
export default function AdminDashboard() {
    const { projects, activeProjectId, setActiveProjectId, getProjectMetrics } = useProjects();
    const [filterOpen, setFilterOpen] = useState(false);

    // Operator management state
    const [operators, setOperators] = useState<Operator[]>([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [linkCopied, setLinkCopied] = useState(false);
    const [createdPin, setCreatedPin] = useState<string | null>(null);
    const [addForm, setAddForm] = useState({ name: '', email: '', pin: '', confirmPin: '' });
    const [addError, setAddError] = useState('');
    const [addSubmitting, setAddSubmitting] = useState(false);

    const loadOperators = useCallback(async () => {
        const adminSession = sessionStorage.getItem('admin-session');
        if (!adminSession) return;
        const { email, pin } = JSON.parse(adminSession);

        try {
            const response = await fetch(`http://localhost:8080/api/users?adminEmail=${email}&adminPin=${pin}`);
            if (response.ok) {
                const data = await response.json();
                // Map backend User to local Operator type
                const ops: Operator[] = data.map((u: any) => ({
                    id: u.id.toString(),
                    name: u.name,
                    email: u.email,
                    pinHash: '', // We use real backend PINs now
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

        const adminSession = sessionStorage.getItem('admin-session');
        if (!adminSession) {
            setAddError('Your session has expired. Please log in again.');
            return;
        }
        const admin = JSON.parse(adminSession);

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
                    adminEmail: admin.email,
                    adminPin: admin.pin
                })
            });

            const data = await response.json();

            if (!response.ok) {
                setAddError(data.error || 'Failed to save operator.');
                return;
            }

            // Success!
            setCreatedPin(data.user.pin); // Store the generated PIN to show to the admin
            await loadOperators();
            setAddForm({ name: '', email: '', pin: '', confirmPin: '' });
        } catch (err) {
            console.error(err);
            setAddError('Could not connect to the server.');
        } finally {
            setAddSubmitting(false);
        }
    };

    const handleDeleteOperator = async (id: string) => {
        await storage.deleteOperator(id);
        setDeleteConfirmId(null);
        await loadOperators();
    };

    // Compute metrics for selected project or aggregate all
    const computeMetrics = (): ProjectMetrics & { projectName: string } => {
        if (activeProjectId) {
            const project = projects.find(p => p.id === activeProjectId);
            return { ...getProjectMetrics(activeProjectId), projectName: project?.name || '' };
        }

        // Aggregate across all projects
        const allOutputs = projects.flatMap(p => p.outputs || []);
        const totalTarget = allOutputs.reduce((s, o) => s + (o.target || 0), 0);
        const totalActual = allOutputs.reduce((s, o) => s + (o.actual || 0), 0);
        const completionRate = totalTarget > 0 ? totalActual / totalTarget : 0;

        const byOperator: Record<string, { target: number; actual: number }> = {};
        allOutputs.forEach(o => {
            if (!byOperator[o.name]) byOperator[o.name] = { target: 0, actual: 0 };
            byOperator[o.name].target += o.target;
            byOperator[o.name].actual += o.actual;
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
        allOutputs.filter(o => o.date >= weekStr).forEach(o => {
            weeklyByOp[o.name] = (weeklyByOp[o.name] || 0) + o.actual;
        });
        const topWeekly = Object.entries(weeklyByOp).sort((a, b) => b[1] - a[1])[0];

        const monthlyByOp: Record<string, number> = {};
        allOutputs.filter(o => o.date >= monthStr).forEach(o => {
            monthlyByOp[o.name] = (monthlyByOp[o.name] || 0) + o.actual;
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
    const selectedLabel = activeProjectId
        ? projects.find(p => p.id === activeProjectId)?.name || 'Unknown'
        : 'All Projects';

    return (
        <div className="h-full overflow-y-auto custom-scrollbar gradient-bg">
            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

                {/* ── Header ── */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Admin Dashboard</h1>
                        <p className="text-sm text-[var(--text-secondary)] mt-1">Performance overview and operator metrics</p>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Project Filter */}
                        <div className="relative">
                            <button
                                onClick={() => setFilterOpen(!filterOpen)}
                                className="glass-card flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-white/10 transition-colors"
                            >
                                <Folder className="w-4 h-4 text-[var(--accent-secondary)]" />
                                <span className="text-sm font-medium text-[var(--text-primary)]">{selectedLabel}</span>
                                <ChevronDown className={`w-4 h-4 text-[var(--text-muted)] transition-transform ${filterOpen ? 'rotate-180' : ''}`} />
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
                                            className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-3 ${!activeProjectId ? 'bg-[var(--accent-primary)]/20 text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:bg-white/5'}`}
                                        >
                                            <BarChart3 className="w-4 h-4" />
                                            All Projects
                                        </button>
                                        {projects.map(p => (
                                            <button
                                                key={p.id}
                                                onClick={() => { setActiveProjectId(p.id); setFilterOpen(false); }}
                                                className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-3 ${activeProjectId === p.id ? 'bg-[var(--accent-primary)]/20 text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:bg-white/5'}`}
                                            >
                                                <Folder className="w-4 h-4" />
                                                {p.name}
                                            </button>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                        <UserSwitcher />
                    </div>
                </div>

                {/* ── Metric Cards ── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 stagger-children">
                    <MetricCard
                        label="Total Output"
                        value={metrics.totalActual.toLocaleString()}
                        subtitle={`of ${metrics.totalTarget.toLocaleString()} target`}
                        icon={BarChart3}
                        colorClass="metric-green"
                        bgClass="metric-green-bg"
                        delay={0.05}
                    />
                    <MetricCard
                        label="Completion Rate"
                        value={`${(metrics.completionRate * 100).toFixed(1)}%`}
                        icon={TrendingUp}
                        colorClass={metrics.completionRate >= 0.8 ? 'metric-green' : metrics.completionRate >= 0.5 ? 'metric-amber' : 'metric-red'}
                        bgClass={metrics.completionRate >= 0.8 ? 'metric-green-bg' : metrics.completionRate >= 0.5 ? 'metric-amber-bg' : 'metric-red-bg'}
                        delay={0.1}
                    />
                    <MetricCard
                        label="Active Operators"
                        value={metrics.operatorSummary.length}
                        subtitle="contributors"
                        icon={Users}
                        colorClass="metric-blue"
                        bgClass="metric-blue-bg"
                        delay={0.15}
                    />
                    <MetricCard
                        label="Projects"
                        value={activeProjectId ? 1 : projects.length}
                        icon={Target}
                        colorClass="metric-purple"
                        bgClass="metric-purple-bg"
                        delay={0.2}
                    />
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
                            <Award className="w-5 h-5 text-[var(--metric-amber)]" />
                            Top Performers
                        </h2>

                        {metrics.topPerformerWeekly && (
                            <div className="glass-card p-4 mb-3 metric-amber-bg">
                                <p className="text-xs text-[var(--text-muted)] mb-1 flex items-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5" /> Weekly Leader
                                </p>
                                <p className="text-lg font-bold text-[var(--text-primary)]">{metrics.topPerformerWeekly.name}</p>
                                <p className="text-sm metric-amber font-semibold">{metrics.topPerformerWeekly.output} units</p>
                            </div>
                        )}

                        {metrics.topPerformerMonthly && (
                            <div className="glass-card p-4 metric-green-bg">
                                <p className="text-xs text-[var(--text-muted)] mb-1 flex items-center gap-1.5">
                                    <Activity className="w-3.5 h-3.5" /> Monthly Leader
                                </p>
                                <p className="text-lg font-bold text-[var(--text-primary)]">{metrics.topPerformerMonthly.name}</p>
                                <p className="text-sm metric-green font-semibold">{metrics.topPerformerMonthly.output} units</p>
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
                            <Users className="w-5 h-5 text-[var(--metric-blue)]" />
                            Operator Leaderboard
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

                {/* ── Projects Overview (when "All Projects" selected) ── */}
                {!activeProjectId && projects.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.35, duration: 0.4 }}
                        className="mt-6 glass-card p-6"
                    >
                        <h2 className="text-base font-semibold text-[var(--text-primary)] mb-5 flex items-center gap-2">
                            <Folder className="w-5 h-5 text-[var(--metric-purple)]" />
                            Projects Overview
                        </h2>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {projects.map((p) => {
                                const pm = getProjectMetrics(p.id);
                                return (
                                    <button
                                        key={p.id}
                                        onClick={() => setActiveProjectId(p.id)}
                                        className="glass-card glass-card-hover p-4 text-left cursor-pointer"
                                    >
                                        <p className="text-sm font-semibold text-[var(--text-primary)] mb-1 truncate">{p.name}</p>
                                        <p className="text-xs text-[var(--text-muted)] mb-3">{p.resources.length} operators · {p.unit}</p>
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                                                <div
                                                    className="h-full rounded-full bg-[var(--accent-secondary)] transition-all duration-700"
                                                    style={{ width: `${Math.min(pm.completionRate * 100, 100)}%` }}
                                                />
                                            </div>
                                            <span className="text-xs font-medium text-[var(--text-secondary)]">
                                                {(pm.completionRate * 100).toFixed(0)}%
                                            </span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </motion.div>
                )}

                {/* ── Operator Accounts ── */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 0.4 }}
                    className="mt-6 glass-card p-6"
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

                    {/* Portal Link */}
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

                    {/* Operator List */}
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
                                                onClick={() => handleDeleteOperator(op.id)}
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

                {/* ── Add Operator Modal ── */}
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
                                        onClick={() => { setShowAddModal(false); setAddError(''); }}
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
