import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjects, ProjectMetrics } from '../contexts/ProjectContext';
import { useAuth } from '../contexts/AuthContext';
import {
    BarChart3,
    TrendingUp,
    Users as UsersIcon,
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
import DarkVeil from './DarkVeil';
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
    const navigate = useNavigate();
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
    const [calendarDate, setCalendarDate] = useState(new Date(2026, 3, 16)); // Default to April 16, 2026
    const [selectedCalDate, setSelectedCalDate] = useState(new Date(2026, 3, 16));
    const [showMonthPicker, setShowMonthPicker] = useState(false);

    const { authSession } = useAuth();

    const loadUsers = useCallback(async () => {
        try {
            const allUsers = await storage.getAllUsers();
            setUsers(allUsers);
        } catch (err) {
            console.error('Failed to load users', err);
        }
    }, []);

    useEffect(() => { loadUsers(); }, [loadUsers]);

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
                        className="md:col-span-8 glass-card p-8 flex flex-col items-center justify-center text-center bg-black/20 border border-white/5 relative overflow-hidden group min-h-[180px]"
                    >
                        <DarkVeil 
                            speed={0.5} 
                            noiseIntensity={0.05} 
                            scanlineIntensity={0.1} 
                            scanlineFrequency={80}
                            warpAmount={0.3}
                            colorTint={[0.039, 0.486, 0.306]} 
                        />
                        <div className="relative z-10 flex flex-col items-center">
                            <h2 className="text-xl font-bold text-white mb-4">Want to create a new project?</h2>
                            <button
                                onClick={() => navigate('/projects')}
                                className="bg-[#FFB347] text-black px-8 py-3 rounded-2xl font-bold text-sm hover:shadow-2xl hover:shadow-[#FFB347]/40 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                            >
                                {/* <Plus className="w-5 h-5" /> */}
                                Go to Projects
                            </button>
                        </div>
                    </motion.div>

                    {/* Mini Calendar View */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1, duration: 0.4 }}
                        className="md:col-span-4 glass-card p-5 bg-white/5 border border-black/10 flex flex-col justify-between relative"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <button 
                                onClick={() => {
                                    const next = new Date(calendarDate);
                                    next.setDate(calendarDate.getDate() - 7);
                                    setCalendarDate(next);
                                }}
                                className="p-1.5 rounded-lg hover:bg-white/10 text-[var(--text-primary)] transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            
                            <button 
                                onClick={() => setShowMonthPicker(!showMonthPicker)}
                                className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-white/10 transition-colors group"
                            >
                                <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-tight">
                                    {calendarDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                                </h3>
                                <ChevronDown className={`w-3 h-3 text-[var(--text-muted)] transition-transform ${showMonthPicker ? 'rotate-180' : ''}`} />
                            </button>

                            <button 
                                onClick={() => {
                                    const next = new Date(calendarDate);
                                    next.setDate(calendarDate.getDate() + 7);
                                    setCalendarDate(next);
                                }}
                                className="p-1.5 rounded-lg hover:bg-white/10 text-[var(--text-primary)] transition-colors"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Month/Year Picker Overlay */}
                        <AnimatePresence>
                            {showMonthPicker && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="absolute inset-0 z-20 bg-[#0d1f17]/95 backdrop-blur-md p-4 rounded-3xl overflow-y-auto custom-scrollbar"
                                >
                                    <div className="flex items-center justify-between mb-4">
                                        <select 
                                            value={calendarDate.getFullYear()}
                                            onChange={(e) => {
                                                const next = new Date(calendarDate);
                                                next.setFullYear(parseInt(e.target.value));
                                                setCalendarDate(next);
                                            }}
                                            className="bg-white/10 text-white text-sm font-bold rounded-lg px-2 py-1 outline-none border border-white/10"
                                        >
                                            {[2024, 2025, 2026, 2027, 2028].map(y => (
                                                <option key={y} value={y} className="bg-[#0d1f17]">{y}</option>
                                            ))}
                                        </select>
                                        <button 
                                            onClick={() => setShowMonthPicker(false)}
                                            className="p-1 rounded-lg hover:bg-white/10 text-white"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                        {Array.from({ length: 12 }).map((_, i) => {
                                            const d = new Date(2000, i, 1);
                                            const isSelected = i === calendarDate.getMonth();
                                            return (
                                                <button
                                                    key={i}
                                                    onClick={() => {
                                                        const next = new Date(calendarDate);
                                                        next.setMonth(i);
                                                        setCalendarDate(next);
                                                        setShowMonthPicker(false);
                                                    }}
                                                    className={`py-2 text-[10px] font-bold rounded-xl transition-all ${isSelected ? 'bg-[#FFB347] text-black' : 'bg-white/5 text-white hover:bg-white/10'}`}
                                                >
                                                    {d.toLocaleString('default', { month: 'short' }).toUpperCase()}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="flex justify-between items-center px-1">
                            {(() => {
                                const startOfWeek = new Date(calendarDate);
                                const day = startOfWeek.getDay();
                                const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
                                startOfWeek.setDate(diff);

                                return Array.from({ length: 7 }).map((_, i) => {
                                    const d = new Date(startOfWeek);
                                    d.setDate(startOfWeek.getDate() + i);
                                    const isSelected = d.toDateString() === selectedCalDate.toDateString();
                                    const isToday = d.toDateString() === new Date().toDateString();
                                    
                                    return (
                                        <div key={i} className="flex flex-col items-center gap-2">
                                            <span className={`text-[10px] font-bold ${isSelected ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)] opacity-60'}`}>
                                                {d.toLocaleDateString('default', { weekday: 'short' })}
                                            </span>
                                            <button
                                                onClick={() => setSelectedCalDate(d)}
                                                className={`w-8 h-12 rounded-xl flex items-center justify-center transition-all cursor-pointer ${isSelected ? 'text-black shadow-lg' : 'text-[var(--text-primary)] hover:bg-white/5'}`}
                                                style={isSelected ? { backgroundColor: '#FFB347', boxShadow: '0 10px 15px -3px rgba(255, 179, 71, 0.4)' } : {}}
                                            >
                                                <div className="flex flex-col items-center">
                                                    <span className="text-sm font-bold">{d.getDate()}</span>
                                                    {isToday && !isSelected && <div className="w-1 h-1 rounded-full bg-[#FFB347] mt-0.5" />}
                                                </div>
                                            </button>
                                        </div>
                                    );
                                });
                            })()}
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
                        value={users.filter(u => u.role === Role.OPERATOR).length}
                        subtitle="contributors"
                        icon={UsersIcon}
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
                            <UsersIcon className="w-5 h-5 text-[var(--text-primary)]" />
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
            </div>
        </div>
    );
}