import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Search,
    FolderOpen,
    Calendar,
    Users,
    Target,
    ArrowUpDown,
    LayoutGrid,
    Clock,
    ChevronRight,
} from 'lucide-react';
import { motion } from 'motion/react';
import { storage } from '../utils/storageProvider';
import type { UnifiedProject } from '../utils/projectStorage';
import { useAISpreadsheet } from '../contexts/AISpreadsheetContext';

type FilterStatus = 'all' | 'active' | 'completed' | 'archived';
type SortBy = 'newest' | 'oldest' | 'name';

const ITEMS_PER_PAGE = 12;

export default function TeamLeadProjectsPage() {
    const navigate = useNavigate();
    const { markSeen } = useAISpreadsheet();
    const [projects, setProjects] = useState<UnifiedProject[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<FilterStatus>('all');
    const [sortBy, setSortBy] = useState<SortBy>('newest');
    const [page, setPage] = useState(1);

    useEffect(() => {
        markSeen();
        loadProjects();
    }, [markSeen]);

    const loadProjects = async () => {
        setLoading(true);
        try {
            const all = await storage.getAllProjects();
            setProjects(all || []);
        } catch (err) {
            console.error('Failed to load projects:', err);
        } finally {
            setLoading(false);
        }
    };

    const filtered = useMemo(() => {
        let list = [...projects];

        if (filter !== 'all') {
            list = list.filter(p => p.status === filter);
        }

        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(p =>
                p.name.toLowerCase().includes(q) ||
                (p.overview || '').toLowerCase().includes(q)
            );
        }

        list.sort((a, b) => {
            if (sortBy === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            if (sortBy === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
            return a.name.localeCompare(b.name);
        });

        return list;
    }, [projects, filter, search, sortBy]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
    const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

    useEffect(() => { setPage(1); }, [search, filter, sortBy]);

    const formatDate = (dateStr: string) => {
        try {
            return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        } catch { return dateStr; }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return { text: 'text-[#046241]', bg: 'bg-[#046241]/10', border: 'border-[#046241]/20' };
            case 'completed': return { text: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/20' };
            case 'archived': return { text: 'text-gray-400', bg: 'bg-gray-400/10', border: 'border-gray-400/20' };
            default: return { text: 'text-gray-400', bg: 'bg-gray-400/10', border: 'border-gray-400/20' };
        }
    };

    const getDaysRemaining = (endDate: string) => {
        const end = new Date(endDate);
        const now = new Date();
        const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return diff;
    };

    const filterCounts = useMemo(() => ({
        all: projects.length,
        active: projects.filter(p => p.status === 'active').length,
        completed: projects.filter(p => p.status === 'completed').length,
        archived: projects.filter(p => p.status === 'archived').length,
    }), [projects]);

    return (
        <div className="h-full overflow-y-auto custom-scrollbar gradient-bg transition-colors duration-300">
            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[var(--accent-primary)]/20 flex items-center justify-center">
                                <FolderOpen className="w-5 h-5 text-[var(--accent-secondary)]" />
                            </div>
                            Projects
                        </h1>
                        <p className="text-sm text-[var(--text-secondary)] mt-2 ml-[52px]">
                            {projects.length} project{projects.length !== 1 ? 's' : ''} total
                        </p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6">
                    <div className="relative flex-1">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                        <input
                            type="text"
                            placeholder="Search projects..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="glass-input w-full pl-10 pr-4 py-2.5 text-sm"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setSortBy(sortBy === 'newest' ? 'oldest' : sortBy === 'oldest' ? 'name' : 'newest')}
                            className="glass-card flex items-center gap-2 px-3 py-2.5 text-sm text-[var(--text-secondary)] hover:bg-white/10 transition-colors cursor-pointer"
                            title={`Sort by: ${sortBy}`}
                        >
                            <ArrowUpDown className="w-4 h-4" />
                            <span className="hidden sm:inline capitalize">{sortBy}</span>
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
                    {(['all', 'active', 'completed', 'archived'] as FilterStatus[]).map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${filter === f
                                ? 'bg-[var(--accent-primary)] text-white shadow-md'
                                : 'glass-card text-[var(--text-secondary)] hover:bg-white/10'
                                }`}
                        >
                            <span className="capitalize">{f}</span>
                            <span className={`text-xs px-1.5 py-0.5 rounded-md ${filter === f ? 'bg-white/20' : 'bg-white/5'
                                }`}>
                                {filterCounts[f]}
                            </span>
                        </button>
                    ))}
                </div>

                {loading && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="glass-card p-5 animate-pulse">
                                <div className="h-5 bg-white/5 rounded-lg w-3/4 mb-3" />
                                <div className="h-3 bg-white/5 rounded w-full mb-2" />
                                <div className="h-3 bg-white/5 rounded w-2/3 mb-4" />
                                <div className="flex gap-2">
                                    <div className="h-6 bg-white/5 rounded-md w-20" />
                                    <div className="h-6 bg-white/5 rounded-md w-16" />
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {!loading && filtered.length === 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col items-center justify-center py-20"
                    >
                        <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center mb-6">
                            <LayoutGrid className="w-10 h-10 text-[var(--text-muted)]" />
                        </div>
                        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
                            {search ? 'No matching projects' : 'No projects yet'}
                        </h3>
                        <p className="text-sm text-[var(--text-secondary)] mb-6 text-center max-w-md">
                            {search
                                ? `No projects match "${search}". Try a different search term.`
                                : 'No projects available.'}
                        </p>
                    </motion.div>
                )}

                {!loading && filtered.length > 0 && (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
                            {paginated.map((project) => {
                                const statusColor = getStatusColor(project.status);
                                const daysLeft = getDaysRemaining(project.endDate);

                                return (
                                    <motion.div
                                        key={project.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="glass-card glass-card-hover p-5 cursor-pointer"
                                        onClick={() => navigate(`/projects/${project.id}`)}
                                    >
                                        <div className="flex items-start gap-3 mb-3">
                                            <div className="w-10 h-10 rounded-xl bg-[var(--accent-primary)]/15 flex items-center justify-center shrink-0 mt-0.5">
                                                <span className="text-sm font-bold text-[var(--accent-secondary)]">
                                                    {(project.name || '?').charAt(0).toUpperCase()}
                                                </span>
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <h3 className="text-sm font-semibold text-[var(--text-primary)] truncate leading-tight">
                                                    {project.name}
                                                </h3>
                                                <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md mt-1 capitalize border ${statusColor.text} ${statusColor.bg} ${statusColor.border}`}>
                                                    {project.status}
                                                </span>
                                            </div>
                                            <ChevronRight className="w-5 h-5 text-[var(--text-muted)] shrink-0" />
                                        </div>

                                        {project.overview && (
                                            <p className="text-xs text-[var(--text-secondary)] line-clamp-2 mb-4 leading-relaxed">
                                                {project.overview}
                                            </p>
                                        )}

                                        <div className="space-y-2">
                                            <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
                                                <span className="flex items-center gap-1.5">
                                                    <Calendar className="w-3.5 h-3.5" />
                                                    {formatDate(project.startDate)} — {formatDate(project.endDate)}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
                                                <span className="flex items-center gap-1.5">
                                                    <Users className="w-3.5 h-3.5" />
                                                    {(project.resources || []).length} operator{(project.resources || []).length !== 1 ? 's' : ''}
                                                </span>
                                                <span className="flex items-center gap-1.5">
                                                    <Target className="w-3.5 h-3.5" />
                                                    {(project.goal || 0).toLocaleString()} {project.unit || ''}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5">
                                            <span className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {formatDate(project.createdAt)}
                                            </span>
                                            {project.status === 'active' && (
                                                <span className={`text-[10px] font-medium ${daysLeft < 0 ? 'text-red-400' : daysLeft <= 7 ? 'text-amber-400' : 'text-[var(--text-muted)]'
                                                    }`}>
                                                    {daysLeft < 0
                                                        ? `${Math.abs(daysLeft)}d overdue`
                                                        : daysLeft === 0
                                                            ? 'Due today'
                                                            : `${daysLeft}d remaining`
                                                    }
                                                </span>
                                            )}
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>

                        {totalPages > 1 && (
                            <div className="flex items-center justify-center gap-2 mt-8">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="px-3 py-2 text-sm rounded-xl glass-card text-[var(--text-secondary)] hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                >
                                    Previous
                                </button>
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                                    <button
                                        key={p}
                                        onClick={() => setPage(p)}
                                        className={`w-9 h-9 text-sm rounded-xl transition-all ${page === p
                                            ? 'bg-[var(--accent-primary)] text-white shadow-md'
                                            : 'glass-card text-[var(--text-secondary)] hover:bg-white/10'
                                            }`}
                                    >
                                        {p}
                                    </button>
                                ))}
                                <button
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    className="px-3 py-2 text-sm rounded-xl glass-card text-[var(--text-secondary)] hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                >
                                    Next
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}