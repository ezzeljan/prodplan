import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useOperatorAuth } from '../../contexts/OperatorAuthContext';
import { storage } from '../../utils/storageProvider';
import { filterSpreadsheetForOperator } from '../../utils/operatorMatcher';
import type { UnifiedProject } from '../../utils/projectStorage';
import EditableSpreadsheet from '../EditableSpreadsheet';
import { ArrowLeft, Loader2, Lock, LogOut } from 'lucide-react';
import logo from '../../assets/lifewood-logo.png';

export default function OperatorProjectView() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { operator, logout } = useOperatorAuth();
    const [project, setProject] = useState<UnifiedProject | null>(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [noRows, setNoRows] = useState(false);

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
                setProject(p);
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
        // Detect if no operator-specific rows were found (only placeholder row)
        const hasRealRows = filtered.rows.some(row =>
            row.some(cell => String(cell?.value ?? '').toLowerCase().trim() === operator.name.toLowerCase().trim())
        );
        if (!hasRealRows) {
            setNoRows(true);
            return null;
        }
        return filtered;
    }, [project, operator]);

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
                    <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center">
                        <Lock className="w-8 h-8 text-[var(--text-muted)]" />
                    </div>
                    <h2 className="text-lg font-semibold text-[var(--text-primary)]">Project not found</h2>
                    <p className="text-sm text-[var(--text-secondary)] max-w-md">
                        This project may have been deleted or the link is invalid.
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
                    <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center">
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
            {/* Header */}
            <header className="sticky top-0 z-30 bg-[#133020]/90 backdrop-blur-xl border-b border-white/10">
                <div className="max-w-full mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                        <img
                            src={logo}
                            alt="Lifewood"
                            className="h-7 w-auto object-contain brightness-0 invert shrink-0 hidden sm:block"
                        />
                        <div className="w-px h-6 bg-white/10 hidden sm:block" />

                        <button
                            onClick={() => navigate('/portal')}
                            className="glass-card flex items-center gap-2 px-3 py-1.5 hover:bg-white/10 transition-colors cursor-pointer shrink-0"
                        >
                            <ArrowLeft className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                            <span className="text-xs text-[var(--text-secondary)]">My Projects</span>
                        </button>

                        <div className="flex items-center gap-2 min-w-0">
                            <div className="w-7 h-7 rounded-lg bg-[var(--accent-primary)]/15 flex items-center justify-center shrink-0">
                                <span className="text-xs font-bold text-[var(--accent-secondary)]">
                                    {project!.name.charAt(0).toUpperCase()}
                                </span>
                            </div>
                            <span className="text-sm font-semibold text-[var(--text-primary)] truncate max-w-[200px]">
                                {project!.name}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="text-right hidden sm:block">
                            <p className="text-xs font-semibold text-[var(--text-primary)] leading-tight">
                                {operator.name}
                            </p>
                        </div>
                        <button
                            onClick={logout}
                            className="glass-card p-2 hover:bg-white/10 transition-colors cursor-pointer"
                            title="Sign out"
                        >
                            <LogOut className="w-4 h-4 text-[var(--text-secondary)]" />
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
        </div>
    );
}
