import { useState, useEffect, useCallback, useMemo } from 'react';
import EditableSpreadsheet from './EditableSpreadsheet';
import UserSwitcher from './UserSwitcher';
import { useUser } from '../contexts/UserContext';
import { SpreadsheetData } from '../types/spreadsheet';

import { useParams, useNavigate } from 'react-router-dom';
import { Lock, Eye, ArrowLeft, Loader2, MessageSquare, Users } from 'lucide-react';
import { storage } from '../utils/storageProvider';
import type { UnifiedProject } from '../utils/projectStorage';
import { filterSpreadsheetForOperator } from '../utils/operatorMatcher';
import TeamManagementModal from './TeamManagementModal';

export default function SpreadsheetPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { currentUser, isOperator, canEdit } = useUser();
    const [project, setProject] = useState<UnifiedProject | null>(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);

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

    const handleDataChange = useCallback(async (newData: SpreadsheetData) => {
        if (!id || !project) return;
        try {
            await storage.updateProject(id, { spreadsheetData: newData });
            setProject(prev => prev ? { ...prev, spreadsheetData: newData } : null);
        } catch (err) {
            console.error('Failed to save spreadsheet data:', err);
        }
    }, [id, project]);

    const activeData = useMemo((): SpreadsheetData | null => {
        if (!project?.spreadsheetData) return null;
        const source = project.spreadsheetData;

        if (!isOperator) return source;

        return filterSpreadsheetForOperator(source, currentUser.name);
    }, [isOperator, currentUser.name, project]);

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center gradient-bg">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 text-[var(--accent-secondary)] animate-spin" />
                    <p className="text-sm text-[var(--text-secondary)]">Loading project...</p>
                </div>
            </div>
        );
    }

    if (notFound || !activeData) {
        return (
            <div className="h-full flex items-center justify-center gradient-bg">
                <div className="flex flex-col items-center gap-4 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center">
                        <Lock className="w-8 h-8 text-[var(--text-muted)]" />
                    </div>
                    <h2 className="text-lg font-semibold text-[var(--text-primary)]">Project not found</h2>
                    <p className="text-sm text-[var(--text-secondary)] max-w-md">
                        This project may have been deleted or the link is invalid.
                    </p>
                    <button
                        onClick={() => navigate('/projects')}
                        className="glass-btn text-sm flex items-center gap-2 mt-2"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Projects
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col gradient-bg relative">
            {/* Top bar */}
            <div className="flex items-center justify-between px-6 pt-4 pb-1 relative z-[50]">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate('/projects')}
                        className="glass-card flex items-center gap-2 px-3 py-1.5 hover:bg-white/10 transition-colors cursor-pointer"
                    >
                        <ArrowLeft className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                        <span className="text-xs text-[var(--text-secondary)]">Projects</span>
                    </button>

                    {project && (
                        <>
                            <div className="flex items-center gap-2 pr-2 border-r border-[var(--text-muted)]/20">
                                <div className="w-7 h-7 rounded-lg bg-[var(--accent-primary)]/15 flex items-center justify-center">
                                    <span className="text-xs font-bold text-[var(--accent-secondary)]">
                                        {project.name.charAt(0).toUpperCase()}
                                    </span>
                                </div>
                                <span className="text-sm font-semibold text-[var(--text-primary)] truncate max-w-[200px]">
                                    {project.name}
                                </span>
                            </div>

                            <button
                                onClick={() => navigate(`/?projectId=${project.id}`)}
                                className="glass-card flex items-center gap-2 px-3 py-1.5 hover:bg-[var(--accent-primary)]/10 hover:border-[var(--accent-secondary)]/30 transition-all cursor-pointer group"
                            >
                                <MessageSquare className="w-3.5 h-3.5 text-[var(--accent-secondary)] group-hover:scale-110 transition-transform" />
                                <span className="text-xs font-medium text-[var(--text-primary)]">Talk to AI Agent</span>
                            </button>

                            {(canEdit || !isOperator) && (
                                <button
                                    onClick={() => setIsTeamModalOpen(true)}
                                    className="glass-card flex items-center gap-2 px-3 py-1.5 hover:bg-[var(--accent-primary)]/10 hover:border-[var(--accent-secondary)]/30 transition-all cursor-pointer group"
                                >
                                    <Users className="w-3.5 h-3.5 text-[var(--accent-secondary)] group-hover:scale-110 transition-transform" />
                                    <span className="text-xs font-medium text-[var(--text-primary)]">Manage Team</span>
                                </button>
                            )}
                        </>
                    )}

                    {isOperator && (
                        <div className="glass-card flex items-center gap-2 px-3 py-1.5">
                            <Eye className="w-3.5 h-3.5 text-[var(--metric-amber)]" />
                            <span className="text-xs text-[var(--text-secondary)]">View Only</span>
                        </div>
                    )}
                    {!canEdit && !isOperator && (
                        <div className="glass-card flex items-center gap-2 px-3 py-1.5">
                            <Lock className="w-3.5 h-3.5 text-[var(--metric-red)]" />
                            <span className="text-xs text-[var(--text-secondary)]">Read Only</span>
                        </div>
                    )}
                </div>
                <UserSwitcher />
            </div>

            {/* Spreadsheet */}
            <div className="flex-1 min-h-0">
                <EditableSpreadsheet
                    initialData={activeData}
                    readOnly={!canEdit}
                    onDataChange={handleDataChange}
                />
            </div>

            {project && (
                <TeamManagementModal
                    isOpen={isTeamModalOpen}
                    onClose={() => setIsTeamModalOpen(false)}
                    projectId={project.id}
                    projectTitle={project.name}
                />
            )}
        </div>
    );
}
