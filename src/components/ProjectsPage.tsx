import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Search,
    FolderOpen,
    Plus,
    Calendar,
    Users,
    Target,
    Trash2,
    MoreVertical,
    ArrowUpDown,
    LayoutGrid,
    Clock,
    Archive,
    RotateCcw,
    FileSpreadsheet,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { storage } from '../utils/storageProvider';
import type { UnifiedProject } from '../utils/projectStorage';
import { useAISpreadsheet } from '../contexts/AISpreadsheetContext';
import ProjectSetupView from './chat/ProjectSetupView';

type FilterStatus = 'all' | 'active' | 'completed' | 'archived';
type SortBy = 'newest' | 'oldest' | 'name';

const ITEMS_PER_PAGE = 12;

export default function ProjectsPage() {
    const navigate = useNavigate();
    const { markSeen } = useAISpreadsheet();
    const [projects, setProjects] = useState<UnifiedProject[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<FilterStatus>('all');
    const [sortBy, setSortBy] = useState<SortBy>('newest');
    const [page, setPage] = useState(1);
    const [menuOpen, setMenuOpen] = useState<string | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);

    useEffect(() => {
        markSeen();
        loadProjects();
    }, [markSeen]);

    const loadProjects = async () => {
        setLoading(true);
        try {
            const all = await storage.getAllProjects();
            setProjects(all);
            if (all.length === 0) {
                setShowCreateModal(true);
            }
        } catch (err) {
            console.error('Failed to load projects:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await storage.deleteProject(id);
            setProjects(prev => prev.filter(p => p.id !== id));
            setDeleteConfirm(null);
            setMenuOpen(null);
        } catch (err) {
            console.error('Failed to delete project:', err);
        }
    };

    const handleArchive = async (id: string) => {
        try {
            await storage.updateProject(id, { status: 'archived' });
            setProjects(prev => prev.map(p => p.id === id ? { ...p, status: 'archived' } : p));
            setMenuOpen(null);
        } catch (err) {
            console.error('Failed to archive project:', err);
        }
    };

    const handleUnarchive = async (id: string) => {
        try {
            await storage.updateProject(id, { status: 'active' });
            setProjects(prev => prev.map(p => p.id === id ? { ...p, status: 'active' } : p));
            setMenuOpen(null);
        } catch (err) {
            console.error('Failed to unarchive project:', err);
        }
    };

    const filtered = useMemo(() => {
        let list = [...(projects || [])];

        if (filter !== 'all') {
            list = list.filter(p => p && p.status === filter);
        }

        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(p =>
                p && (
                    (p.name || '').toLowerCase().includes(q) ||
                    (p.overview || '').toLowerCase().includes(q)
                )
            );
        }

        list.sort((a, b) => {
            if (!a || !b) return 0;
            if (sortBy === 'newest') return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
            if (sortBy === 'oldest') return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
            return (a.name || '').localeCompare(b.name || '');
        });

        return list;
    }, [projects, filter, search, sortBy]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
    const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

    useEffect(() => { setPage(1); }, [search, filter, sortBy]);

    const formatDate = (dateStr: string) => {
        try {
            if (!dateStr) return 'N/A';
            return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        } catch { return dateStr || 'N/A'; }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return { text: 'text-[var(--metric-green)]', bg: 'bg-[var(--metric-green)]/10', border: 'border-[var(--metric-green)]/20' };
            case 'completed': return { text: 'text-[var(--metric-blue)]', bg: 'bg-[var(--metric-blue)]/10', border: 'border-[var(--metric-blue)]/20' };
            case 'archived': return { text: 'text-[var(--text-muted)]', bg: 'bg-[var(--text-muted)]/10', border: 'border-[var(--text-muted)]/20' };
            default: return { text: 'text-[var(--text-muted)]', bg: 'bg-[var(--text-muted)]/10', border: 'border-[var(--text-muted)]/20' };
        }
    };

    const getDaysRemaining = (endDate: string) => {
        if (!endDate) return 0;
        const end = new Date(endDate);
        const now = new Date();
        const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return diff;
    };

    const filterCounts = useMemo(() => {
        const pList = projects || [];
        return {
            all: pList.length,
            active: pList.filter(p => p && p.status === 'active').length,
            completed: pList.filter(p => p && p.status === 'completed').length,
            archived: pList.filter(p => p && p.status === 'archived').length,
        };
    }, [projects]);

    return (
        <div className="h-full overflow-y-auto custom-scrollbar gradient-bg transition-colors duration-300">
            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

                {/* Header */}
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
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="glass-btn flex items-center gap-2 text-sm"
                    >
                        <Plus className="w-4 h-4" />
                        New Project
                    </button>
                </div>

                {/* Search & Controls */}
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

                {/* Filter Tabs */}
                <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
                    {(['all', 'active', 'completed', 'archived'] as FilterStatus[]).map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${filter === f
                                    ? 'bg-[#FFB347] text-[#133020]'
                                    : 'glass-card text-[var(--text-secondary)] hover:bg-white/10'
                                }`}
                            style={filter === f ? {} : { borderColor: 'rgba(0,0,0,0.2)' }}
                        >
                            <span className="capitalize">{f}</span>
                            <span className={`text-xs px-1.5 py-0.5 rounded-md ${filter === f ? 'bg-[#133020]/20' : 'bg-white/5'
                                }`}>
                                {filterCounts[f]}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Loading State */}
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

                {/* Empty State */}
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
                                : 'Upload a client instruction in the AI chat to create your first project.'}
                        </p>
                        {!search && (
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="glass-btn flex items-center gap-2 text-sm"
                            >
                                <Plus className="w-4 h-4" />
                                Create First Project
                            </button>
                        )}
                    </motion.div>
                )}

                {/* Project Cards Grid */}
                {!loading && filtered.length > 0 && (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
                            {paginated.map((project) => {
                                const statusColor = getStatusColor(project.status);
                                const daysLeft = getDaysRemaining(project.endDate);
                                const resourceCount = (project.resources || []).length;

                                return (
                                    <motion.div
                                        key={project.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="glass-card glass-card-hover p-5 cursor-pointer group relative"
                                        onClick={() => navigate(`/projects/${project.id}`)}
                                    >
                                        {/* Menu Button */}
                                        <div className="absolute top-4 right-4 z-10">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setMenuOpen(menuOpen === project.id ? null : project.id);
                                                }}
                                                className="p-1.5 rounded-lg text-[var(--text-muted)] hover:bg-white/10 hover:text-[var(--text-primary)] transition-colors opacity-0 group-hover:opacity-100"
                                            >
                                                <MoreVertical className="w-4 h-4" />
                                            </button>

                                            <AnimatePresence>
                                                {menuOpen === project.id && (
                                                    <motion.div
                                                        initial={{ opacity: 0, scale: 0.95, y: -4 }}
                                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                                        exit={{ opacity: 0, scale: 0.95, y: -4 }}
                                                        className="absolute right-0 mt-1 w-40 glass-card py-1 z-50"
                                                        onClick={e => e.stopPropagation()}
                                                    >
                                                        {project.status === 'archived' ? (
                                                            <button
                                                                onClick={() => handleUnarchive(project.id)}
                                                                className="w-full text-left px-3 py-2 text-sm text-[var(--accent-secondary)] hover:bg-white/10 transition-colors flex items-center gap-2"
                                                            >
                                                                <RotateCcw className="w-3.5 h-3.5" />
                                                                Unarchive
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={() => handleArchive(project.id)}
                                                                className="w-full text-left px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-white/10 transition-colors flex items-center gap-2"
                                                            >
                                                                <Archive className="w-3.5 h-3.5" />
                                                                Add to Archive
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => setDeleteConfirm(project.id)}
                                                            className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-2"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                            Delete
                                                        </button>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>

                                        {/* Project Name & Status */}
                                        <div className="flex items-start gap-3 mb-3 pr-8">
                                            <div className="w-10 h-10 rounded-xl bg-[#FFB347]/15 flex items-center justify-center shrink-0 mt-0.5">
                                                <span className="text-sm font-bold text-[#FFB347]">
                                                    {project.name.charAt(0).toUpperCase()}
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
                                        </div>

                                        {/* Overview */}
                                        {project.overview && (
                                            <p className="text-xs text-[var(--text-secondary)] line-clamp-2 mb-4 leading-relaxed">
                                                {project.overview}
                                            </p>
                                        )}

                                        {/* Meta Info */}
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
                                                    {resourceCount} operator{resourceCount !== 1 ? 's' : ''}
                                                </span>
                                                <span className="flex items-center gap-1.5">
                                                    <Target className="w-3.5 h-3.5" />
                                                    {(project.goal || 0).toLocaleString()} {project.unit || ''}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Footer */}
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

                        {/* Pagination */}
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

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {deleteConfirm && (
                    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => { setDeleteConfirm(null); setMenuOpen(null); }}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-sm bg-[var(--surface-primary)] border border-[var(--border-color)] rounded-2xl shadow-2xl overflow-hidden"
                        >
                            <div className="p-6">
                                <div className="flex items-center justify-center w-12 h-12 mb-4 rounded-full bg-red-500/10 text-red-500">
                                    <Trash2 className="w-6 h-6" />
                                </div>
                                <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">Delete Project</h3>
                                <p className="text-[var(--text-secondary)] text-sm">
                                    Are you sure you want to delete this project? This action cannot be undone.
                                </p>
                            </div>
                            <div className="flex border-t border-[var(--border-color)]">
                                <button
                                    onClick={() => { setDeleteConfirm(null); setMenuOpen(null); }}
                                    className="flex-1 px-4 py-4 text-sm font-medium text-[var(--text-muted)] hover:bg-[var(--surface-secondary)] transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => handleDelete(deleteConfirm)}
                                    className="flex-1 px-4 py-4 text-sm font-medium text-red-500 hover:bg-red-500/10 transition-colors border-l border-[var(--border-color)]"
                                >
                                    Delete
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Create Project Modal */}
            <AnimatePresence>
                {showCreateModal && (
                    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowCreateModal(false)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative w-full max-w-2xl bg-transparent z-[1100]"
                        >
                            <ProjectSetupView 
                                onComplete={(name, id) => {
                                    setShowCreateModal(false);
                                    navigate(`/?projectId=${id}`);
                                }}
                                onReset={() => {
                                    if (window.confirm("ARE YOU SURE? This will permanently delete ALL data, sessions, and files. Proceed?")) {
                                        localStorage.clear();
                                        sessionStorage.clear();
                                        window.location.reload();
                                    }
                                }}
                            />
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
