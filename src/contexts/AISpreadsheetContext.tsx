import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';

interface AISpreadsheetContextType {
    lastCreatedProjectId: string | null;
    hasNewData: boolean;
    setLastCreated: (projectId: string) => void;
    markSeen: () => void;
}

const AISpreadsheetContext = createContext<AISpreadsheetContextType | undefined>(undefined);

export const AISpreadsheetProvider = ({ children }: { children: ReactNode }) => {
    const [lastCreatedProjectId, setLastCreatedProjectId] = useState<string | null>(null);
    const [hasNewData, setHasNewData] = useState(false);

    const setLastCreated = useCallback((projectId: string) => {
        setLastCreatedProjectId(projectId);
        setHasNewData(true);
    }, []);

    const markSeen = useCallback(() => {
        setHasNewData(false);
    }, []);

    return (
        <AISpreadsheetContext.Provider value={{
            lastCreatedProjectId,
            hasNewData,
            setLastCreated,
            markSeen,
        }}>
            {children}
        </AISpreadsheetContext.Provider>
    );
};

export const useAISpreadsheet = () => {
    const context = useContext(AISpreadsheetContext);
    if (!context) throw new Error('useAISpreadsheet must be used within AISpreadsheetProvider');
    return context;
};
