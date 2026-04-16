import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FolderOpen, LogOut, Sun, Moon, Menu } from 'lucide-react';
import { useOperatorAuth } from '../../contexts/OperatorAuthContext';
import { storage } from '../../utils/storageProvider';
import type { UnifiedProject } from '../../utils/projectStorage';
import { Loader2, Calendar, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';
import logo from '../../assets/lifewood-logo.png';
import icon from '../../assets/icon.png';

const navWithIcons = [
    { label: "Projects", href: "/portal", icon: <FolderOpen className="w-5 h-5" /> },
];

export default function OperatorProjectsList() {
    const { operator, logout } = useOperatorAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [projects, setProjects] = useState<UnifiedProject[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDark, setIsDark] = useState(() => localStorage.getItem("theme") === "dark");
    const [mobileOpen, setMobileOpen] = useState(false);

    useEffect(() => {
        if (localStorage.getItem("theme") === "dark") {
            document.documentElement.classList.add("dark");
        } else {
            document.documentElement.classList.remove("dark");
        }
    }, []);

    useEffect(() => {
        loadProjects();
    }, [operator]);

    useEffect(() => {
        const handleFocus = () => loadProjects();
        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
    }, [operator]);

    const loadProjects = async () => {
        if (!operator) return;
        setLoading(true);
        try {
            const mine = await storage.getAllProjects(undefined, operator.id);
            setProjects(mine);
        } catch (err) {
            console.error('Failed to load projects:', err);
        } finally {
            setLoading(false);
        }
    };

    const toggleTheme = () => {
        const newIsDark = !isDark;
        setIsDark(newIsDark);
        if (newIsDark) {
            document.documentElement.classList.add("dark");
            localStorage.setItem("theme", "dark");
        } else {
            document.documentElement.classList.remove("dark");
            localStorage.setItem("theme", "light");
        }
    };

    if (!operator) return null;

    return (
        <div className="min-h-screen gradient-bg flex">
            {/* Sidebar */}
            <nav className="hidden md:flex flex-col fixed left-0 top-0 h-full bg-[#133020]/90 backdrop-blur-xl shadow-sm z-50 w-64">
                <div className="flex items-center h-20 border-b border-white/10 justify-start px-6 gap-3 bg-white/5">
                    <Link
                        to="/portal"
                        className="overflow-hidden transition-all duration-300 flex items-center h-12 cursor-pointer w-auto opacity-100"
                    >
                        <div className="px-3 py-2 rounded-2xl bg-[#F9F7F7] shadow-lg shadow-black/20">
                            <img
                                src={logo}
                                alt="Lifewood Navigation"
                                className="h-8 w-auto object-contain min-w-[100px] hover:opacity-80 transition-opacity"
                            />
                        </div>
                    </Link>
                </div>

                <div className="flex-1 py-6 flex flex-col gap-2 overflow-y-auto px-3">
                    {navWithIcons.map((item) => {
                        const isActive = location.pathname === item.href;
                        return (
                            <Link
                                key={item.label}
                                to={item.href}
                                className={`flex items-center rounded-full transition-colors justify-start gap-4 px-3 py-3 ${
                                    isActive
                                        ? "bg-[#046241] text-white font-semibold"
                                        : "text-white/70 hover:bg-white/10 hover:text-white"
                                }`}
                                title={item.label}
                            >
                                <div className="flex-shrink-0">{item.icon}</div>
                                <span className="whitespace-nowrap transition-opacity duration-300 opacity-100">
                                    {item.label}
                                </span>
                            </Link>
                        );
                    })}
                </div>

                <div className="border-t border-white/10 mt-auto flex flex-col gap-2 p-3">
                    {/* User Profile */}
                    <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/5">
                        <div className="w-9 h-9 rounded-full bg-[#046241] flex items-center justify-center text-white font-semibold text-sm">
                            {operator?.name?.charAt(0).toUpperCase() || "U"}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-white truncate">{operator?.name || "Operator"}</p>
                            <p className="text-[10px] text-white/50">Operator</p>
                        </div>
                    </div>

                    <button
                        onClick={toggleTheme}
                        className="flex items-center rounded-full transition-colors text-white/70 hover:bg-white/10 hover:text-white justify-start gap-4 px-3 py-3 w-full"
                        title={isDark ? "Light Mode" : "Dark Mode"}
                    >
                        <div className="flex-shrink-0">
                            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                        </div>
                        <span className="whitespace-nowrap transition-opacity duration-300 opacity-100">
                            {isDark ? "Light Mode" : "Dark Mode"}
                        </span>
                    </button>

                    <button
                        onClick={logout}
                        className="flex items-center rounded-full transition-colors text-[var(--metric-red)]/80 hover:bg-[var(--metric-red)]/10 hover:text-[var(--metric-red)] justify-start gap-4 px-3 py-3 w-full"
                        title="Sign Out"
                    >
                        <div className="flex-shrink-0"><LogOut className="w-5 h-5" /></div>
                        <span className="whitespace-nowrap transition-opacity duration-300 opacity-100">
                            Sign Out
                        </span>
                    </button>
                </div>
            </nav>

            {/* Mobile Topbar */}
            <nav className="md:hidden fixed top-0 left-0 right-0 h-16 bg-[#133020]/90 backdrop-blur-xl border-b border-white/10 z-50 flex items-center justify-between px-4">
                <Link to="/portal" className="flex items-center shrink-0">
                    <img
                        src={logo}
                        alt="Lifewood"
                        className="h-8 w-auto object-contain brightness-0 invert"
                    />
                </Link>
                <button
                    onClick={() => setMobileOpen(true)}
                    className="p-2 rounded-xl hover:bg-white/10 transition-colors text-white"
                    aria-label="Open menu"
                >
                    <Menu size={24} />
                </button>
            </nav>

            {/* Mobile Menu Overlay */}
            {mobileOpen && (
                <div className="fixed inset-0 z-[100] md:hidden">
                    <div
                        className="absolute inset-0 bg-[#133020]/40 backdrop-blur-sm"
                        onClick={() => setMobileOpen(false)}
                    />
                    <div className="absolute right-0 top-0 bottom-0 w-[280px] bg-[#133020] shadow-2xl flex flex-col border-l border-white/10 overflow-y-auto">
                        <div className="flex items-center justify-between p-4 border-b border-white/10">
                            <img
                                src={logo}
                                alt="Lifewood"
                                className="h-8 w-auto object-contain brightness-0 invert"
                            />
                            <button
                                onClick={() => setMobileOpen(false)}
                                className="p-2 rounded-xl hover:bg-white/10 transition-colors text-white"
                            >
                            </button>
                        </div>
                        <div className="flex flex-col gap-2 p-4">
                            {navWithIcons.map((item) => {
                                const isActive = location.pathname === item.href;
                                return (
                                    <Link
                                        key={item.label}
                                        to={item.href}
                                        onClick={() => setMobileOpen(false)}
                                        className={`flex items-center rounded-full transition-colors justify-start gap-4 px-3 py-3 ${
                                            isActive
                                                ? "bg-[#046241] text-white font-semibold"
                                                : "text-white/70 hover:bg-white/10 hover:text-white"
                                        }`}
                                    >
                                        <div className="flex-shrink-0">{item.icon}</div>
                                        <span>{item.label}</span>
                                    </Link>
                                );
                            })}
                            <button
                                onClick={toggleTheme}
                                className="flex items-center rounded-full transition-colors text-white/70 hover:bg-white/10 hover:text-white justify-start gap-4 px-3 py-3"
                            >
                                <div className="flex-shrink-0">
                                    {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                                </div>
                                <span>{isDark ? "Light Mode" : "Dark Mode"}</span>
                            </button>
                            <button
                                onClick={logout}
                                className="flex items-center rounded-full transition-colors text-[var(--metric-red)]/80 hover:bg-[var(--metric-red)]/10 hover:text-[var(--metric-red)] justify-start gap-4 px-3 py-3"
                            >
                                <div className="flex-shrink-0"><LogOut className="w-5 h-5" /></div>
                                <span>Sign Out</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <main className="flex-1 md:ml-64 pt-16 md:pt-0">
                {/* Content */}
                <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
                    <div className="mb-8">
                        <h1 className="text-xl font-bold text-[var(--text-primary)]">My Projects</h1>
                        <p className="text-sm text-[var(--text-secondary)] mt-1">
                            Projects where you have assigned output
                        </p>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="w-6 h-6 text-[var(--accent-secondary)] animate-spin" />
                        </div>
                    ) : projects.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex flex-col items-center justify-center py-20 text-center"
                        >
                            <div className="w-16 h-16 rounded-2xl bg-[var(--accent-primary)]/5 flex items-center justify-center mb-4">
                                <FolderOpen className="w-8 h-8 text-[var(--text-muted)]" />
                            </div>
                            <h2 className="text-base font-semibold text-[var(--text-primary)]">
                                No projects yet
                            </h2>
                            <p className="text-sm text-[var(--text-secondary)] mt-1 max-w-xs">
                                You haven't been assigned to any projects. Contact your admin for access.
                            </p>
                        </motion.div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {projects.map((project, i) => (
                                <motion.button
                                    key={project.id}
                                    initial={{ opacity: 0, y: 16 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.05, duration: 0.35 }}
                                    onClick={() => navigate(`/portal/project/${project.id}`)}
                                    className="glass-card glass-card-hover p-5 text-left cursor-pointer group"
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="w-10 h-10 rounded-xl bg-[var(--accent-primary)]/15 flex items-center justify-center">
                                            <span className="text-sm font-bold text-[var(--accent-secondary)]">
                                                {project.name.charAt(0).toUpperCase()}
                                            </span>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--accent-secondary)] transition-colors" />
                                    </div>

                                    <h3 className="text-sm font-semibold text-[var(--text-primary)] truncate mb-1">
                                        {project.name}
                                    </h3>

                                    {project.overview && (
                                        <p className="text-xs text-[var(--text-secondary)] line-clamp-2 mb-3">
                                            {project.overview}
                                        </p>
                                    )}

                                    <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted)]">
                                        <Calendar className="w-3 h-3" />
                                        <span>
                                            {new Date(project.startDate).toLocaleDateString()} — {new Date(project.endDate).toLocaleDateString()}
                                        </span>
                                    </div>

                                    <div className="mt-3">
                                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${
                                            project.status === 'active'
                                                ? 'bg-[var(--metric-green)]/10 text-[var(--metric-green)]'
                                                : project.status === 'completed'
                                                ? 'bg-[var(--metric-blue)]/10 text-[var(--metric-blue)]'
                                                : 'bg-[var(--text-muted)]/10 text-[var(--text-muted)]'
                                        }`}>
                                            {project.status}
                                        </span>
                                    </div>
                                </motion.button>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}