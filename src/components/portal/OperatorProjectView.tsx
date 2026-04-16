import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { useOperatorAuth } from '../../contexts/OperatorAuthContext';
import { storage } from '../../utils/storageProvider';
import { filterSpreadsheetForOperator } from '../../utils/operatorMatcher';
import type { UnifiedProject } from '../../utils/projectStorage';
import EditableSpreadsheet from '../EditableSpreadsheet';
import { ArrowLeft, Loader2, Lock, LogOut, Sun, Moon, FolderOpen, Menu, X } from 'lucide-react';
import logo from '../../assets/lifewood-logo.png';

const navWithIcons = [
    { label: "Projects", href: "/portal", icon: <FolderOpen className="w-5 h-5" /> },
];

export default function OperatorProjectView() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const { operator, logout } = useOperatorAuth();
    const [project, setProject] = useState<UnifiedProject | null>(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [noRows, setNoRows] = useState(false);
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
        if (!id) {
            setNotFound(true);
            setLoading(false);
            return;
        }
        loadProject(id);
    }, [id]);

    const loadProject = async (projectId: string) => {
        setLoading(true);
        try {
            const p = await storage.getProject(projectId);
            if (p) {
                const assignedIds = (p.operators ?? []).map((op: any) => String(op.id));
                if (!operator || !assignedIds.includes(String(operator.id))) {
                    setNotFound(true);
                } else {
                    setProject(p);
                }
            } else {
                setNotFound(true);
            }
        } catch (err) {
            console.error('Failed to load project:', err);
            setNotFound(true);
        } finally {
            setLoading(false);
        }
    };

    const filteredData = useMemo(() => {
        if (!project?.spreadsheetData || !operator) return null;
        const filtered = filterSpreadsheetForOperator(project.spreadsheetData, operator.name);
        const hasRealRows = filtered.rows.some(row =>
            row.some(cell => String(cell?.value ?? '').toLowerCase().trim() === operator.name.toLowerCase().trim())
        );
        if (!hasRealRows) {
            setNoRows(true);
            return null;
        }
        return filtered;
    }, [project, operator]);

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

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center gradient-bg">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 text-[var(--accent-secondary)] animate-spin" />
                    <p className="text-sm text-[var(--text-secondary)]">Loading project...</p>
                </div>
            </div>
        );
    }

    if (notFound) {
        return (
            <div className="min-h-screen flex items-center justify-center gradient-bg">
                <div className="flex flex-col items-center gap-4 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-[var(--accent-primary)]/5 flex items-center justify-center">
                        <Lock className="w-8 h-8 text-[var(--text-muted)]" />
                    </div>
                    <h2 className="text-lg font-semibold text-[var(--text-primary)]">Project not found</h2>
                    <p className="text-sm text-[var(--text-secondary)] max-w-md">
                        This project doesn't exist, or you don't have access to it.
                    </p>
                    <button
                        onClick={() => navigate('/portal')}
                        className="glass-btn text-sm flex items-center gap-2 mt-2"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to My Projects
                    </button>
                </div>
            </div>
        );
    }

    if (noRows || !filteredData || !operator) {
        return (
            <div className="min-h-screen flex items-center justify-center gradient-bg">
                <div className="flex flex-col items-center gap-4 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-[var(--accent-primary)]/5 flex items-center justify-center">
                        <Lock className="w-8 h-8 text-[var(--text-muted)]" />
                    </div>
                    <h2 className="text-lg font-semibold text-[var(--text-primary)]">No assigned rows</h2>
                    <p className="text-sm text-[var(--text-secondary)] max-w-md">
                        You don't have any assigned output rows in this project yet. Contact your admin.
                    </p>
                    <button
                        onClick={() => navigate('/portal')}
                        className="glass-btn text-sm flex items-center gap-2 mt-2"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to My Projects
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col gradient-bg">
            {/* Desktop Sidebar */}
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
                                <X size={20} />
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
                {/* Header */}
                <header className="sticky top-0 z-30 bg-[#133020]/90 backdrop-blur-xl border-b border-white/10">
                    <div className="max-w-full mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                            <button
                                onClick={() => navigate('/portal')}
                                className="glass-card flex items-center gap-2 px-3 py-1.5 hover:bg-white/10 transition-colors cursor-pointer shrink-0"
                            >
                                <ArrowLeft className="w-3.5 h-3.5 text-white/70" />
                                <span className="text-xs text-white/70">My Projects</span>
                            </button>

                            <div className="flex items-center gap-2 min-w-0">
                                <div className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                                    <span className="text-xs font-bold text-white">
                                        {project!.name.charAt(0).toUpperCase()}
                                    </span>
                                </div>
                                <span className="text-sm font-semibold text-white truncate max-w-[200px]">
                                    {project!.name}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={logout}
                                className="glass-card p-2 hover:bg-white/10 transition-colors cursor-pointer"
                                title="Sign out"
                            >
                                <LogOut className="w-4 h-4 text-white/70" />
                            </button>
                        </div>
                    </div>
                </header>

                {/* Spreadsheet */}
                <div className="flex-1 min-h-0">
                    <EditableSpreadsheet
                        initialData={filteredData}
                        readOnly={true}
                    />
                </div>
            </main>
        </div>
    );
}