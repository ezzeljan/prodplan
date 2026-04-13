import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useUser } from './UserContext';
import { storage } from '../utils/storageProvider';
import { UnifiedProject } from '../utils/projectStorage';
import type { SpreadsheetData } from '../types/spreadsheet';
import { User, Role as UserRole } from '../types/auth';

// ─── Types ───
export interface OperatorOutput {
    date: string;       // YYYY-MM-DD
    name: string;       // Operator name
    target: number;
    actual: number;
}

export interface Project {
    id: string;
    name: string;
    goal: number;
    unit: string;
    startDate: string;
    endDate: string;
    projectManager?: User;
    operators?: User[];
    resources: string[];
    overview?: string;
    createdAt: string;
    updatedAt: string;
    status: 'active' | 'completed' | 'archived' | 'draft';
    spreadsheetData?: SpreadsheetData;
    googleSheetUrl?: string;
    outputs: OperatorOutput[];
}

interface ProjectContextType {
    projects: Project[];
    activeProjectId: string | null;
    activeProject: Project | null;
    addProject: (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'outputs'>) => Project;
    updateProject: (id: string, updates: Partial<Project>) => void;
    deleteProject: (id: string) => void;
    setActiveProjectId: (id: string | null) => void;
    addOutput: (projectId: string, output: OperatorOutput) => void;
    updateOutput: (projectId: string, index: number, output: OperatorOutput) => void;
    getProjectMetrics: (projectId: string) => ProjectMetrics;
}

export interface ProjectMetrics {
    totalTarget: number;
    totalActual: number;
    completionRate: number;
    topPerformerWeekly: { name: string; output: number } | null;
    topPerformerMonthly: { name: string; output: number } | null;
    operatorSummary: { name: string; totalTarget: number; totalActual: number; completionRate: number }[];
}

// ─── Demo Data ───
function generateDemoProjects(): Project[] {
    const operators = ['Maria Santos', 'John Reyes', 'Ana Garcia', 'Carlos Cruz', 'Sofia Mendez'];
    const today = new Date();

    const createOutputs = (resources: string[], startDate: Date, days: number): OperatorOutput[] => {
        const outputs: OperatorOutput[] = [];
        for (let d = 0; d < days; d++) {
            const date = new Date(startDate);
            date.setDate(date.getDate() + d);
            const dateStr = date.toISOString().split('T')[0];
            resources.forEach(name => {
                const baseTarget = 8 + Math.floor(d / 7) * 2; // LPB ramp-up
                const variance = Math.floor(Math.random() * 5) - 1;
                outputs.push({
                    date: dateStr,
                    name,
                    target: baseTarget,
                    actual: d < days - 3 ? Math.max(0, baseTarget + variance) : 0,
                });
            });
        }
        return outputs;
    };

    const startA = new Date(today);
    startA.setDate(startA.getDate() - 21);
    const endA = new Date(today);
    endA.setDate(endA.getDate() + 7);

    const startB = new Date(today);
    startB.setDate(startB.getDate() - 14);
    const endB = new Date(today);
    endB.setDate(endB.getDate() + 14);

    return [
        {
            id: 'demo-project-1',
            name: 'Video Production Q1',
            goal: 500,
            unit: 'videos',
            status: 'active' as const,
            startDate: startA.toISOString().split('T')[0],
            endDate: endA.toISOString().split('T')[0],
            resources: operators.slice(0, 4),
            overview: 'Produce 500 short-form videos for social media campaigns.',
            createdAt: startA.toISOString(),
            updatedAt: startA.toISOString(),
            outputs: createOutputs(operators.slice(0, 4), startA, 21),
        },
        {
            id: 'demo-project-2',
            name: 'Asset Packaging Sprint',
            goal: 300,
            unit: 'packages',
            status: 'active' as const,
            startDate: startB.toISOString().split('T')[0],
            endDate: endB.toISOString().split('T')[0],
            resources: operators.slice(1, 5),
            overview: 'Package 300 digital assets for client delivery.',
            createdAt: startB.toISOString(),
            updatedAt: startB.toISOString(),
            outputs: createOutputs(operators.slice(1, 5), startB, 14),
        },
    ];
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider = ({ children }: { children: ReactNode }) => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

    const { currentUser } = useUser();

    const loadProjects = useCallback(async () => {
        try {
            let all;
            if (currentUser.role === UserRole.ADMIN) {
                all = await storage.getAllProjects();
            } else if (currentUser.role === UserRole.PROJECT_MANAGER) {
                all = await storage.getAllProjects(currentUser.id);
            } else {
                all = await storage.getAllProjects(undefined, currentUser.id);
            }

            if (all && all.length > 0) {
                setProjects(all as Project[]);
            } else {
                setProjects(generateDemoProjects());
            }
        } catch (err) {
            console.error('Failed to load projects from storage:', err);
        }
    }, [currentUser]);

    useEffect(() => {
        loadProjects();
    }, [loadProjects]);

    const activeProject = projects.find(p => p.id === activeProjectId) || null;

    const addProject = (data: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'outputs'>): Project => {
        const now = new Date().toISOString();
        const newProject: Project = {
            ...data,
            id: `proj-${Date.now()}`,
            createdAt: now,
            updatedAt: now,
            status: 'active',
            outputs: [],
        };
        const unified: UnifiedProject = {
            ...newProject,
            spreadsheetData: newProject.spreadsheetData ?? { columns: [], rows: [], merges: [] },
        };
        storage.saveProject(unified).then(() => loadProjects());
        return newProject;
    };

    const updateProject = (id: string, updates: Partial<Project>) => {
        storage.updateProject(id, updates as any).then(() => loadProjects());
    };

    const deleteProject = (id: string) => {
        storage.deleteProject(id).then(() => {
            loadProjects();
            if (activeProjectId === id) setActiveProjectId(null);
        });
    };

    const addOutput = async (projectId: string, output: OperatorOutput) => {
        const project = await storage.getProject(projectId);
        if (!project) return;
        const newOutputs = [...(project.outputs || []), output];
        await storage.updateProject(projectId, { outputs: newOutputs });
        loadProjects();
    };

    const updateOutput = async (projectId: string, index: number, output: OperatorOutput) => {
        const project = await storage.getProject(projectId);
        if (!project) return;
        const newOutputs = [...(project.outputs || [])];
        newOutputs[index] = output;
        await storage.updateProject(projectId, { outputs: newOutputs });
        loadProjects();
    };

    const getProjectMetrics = (projectId: string): ProjectMetrics => {
        const project = projects.find(p => p.id === projectId);
        if (!project) return { totalTarget: 0, totalActual: 0, completionRate: 0, topPerformerWeekly: null, topPerformerMonthly: null, operatorSummary: [] };

        const outputs = project.outputs || [];
        const totalTarget = outputs.reduce((s, o) => s + (o.target || 0), 0);
        const totalActual = outputs.reduce((s, o) => s + (o.actual || 0), 0);
        const completionRate = totalTarget > 0 ? totalActual / totalTarget : 0;

        // Operator summary
        const byOperator: Record<string, { target: number; actual: number }> = {};
        outputs.forEach(o => {
            if (!byOperator[o.name]) byOperator[o.name] = { target: 0, actual: 0 };
            byOperator[o.name].target += o.target;
            byOperator[o.name].actual += o.actual;
        });

        const operatorSummary = Object.entries(byOperator).map(([name, data]) => ({
            name,
            totalTarget: data.target,
            totalActual: data.actual,
            completionRate: data.target > 0 ? data.actual / data.target : 0,
        })).sort((a, b) => b.totalActual - a.totalActual);

        // Top performer (last 7 days)
        const now = new Date();
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        const weekStr = weekAgo.toISOString().split('T')[0];

        const weeklyByOp: Record<string, number> = {};
        outputs.filter(o => o.date >= weekStr).forEach(o => {
            weeklyByOp[o.name] = (weeklyByOp[o.name] || 0) + o.actual;
        });
        const topWeekly = Object.entries(weeklyByOp).sort((a, b) => b[1] - a[1])[0];

        // Top performer (last 30 days)
        const monthAgo = new Date(now);
        monthAgo.setDate(monthAgo.getDate() - 30);
        const monthStr = monthAgo.toISOString().split('T')[0];

        const monthlyByOp: Record<string, number> = {};
        outputs.filter(o => o.date >= monthStr).forEach(o => {
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
        };
    };

    return (
        <ProjectContext.Provider value={{
            projects,
            activeProjectId,
            activeProject,
            addProject,
            updateProject,
            deleteProject,
            setActiveProjectId,
            addOutput,
            updateOutput,
            getProjectMetrics,
        }}>
            {children}
        </ProjectContext.Provider>
    );
};

export const useProjects = () => {
    const context = useContext(ProjectContext);
    if (!context) throw new Error('useProjects must be used within ProjectProvider');
    return context;
};
