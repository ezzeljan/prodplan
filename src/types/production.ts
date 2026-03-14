import ExcelJS from 'exceljs';

export interface Message {
    id: string;
    role: 'agent' | 'user';
    content: string;
    type?: 'text' | 'file' | 'preview' | 'google-sheet';
    fileData?: {
        name: string;
        buffer?: ExcelJS.Buffer;
        url?: string;
    };
    previewData?: ProjectData;
    attachment?: {
        name: string;
        type: string;
        data: string; // Base64 for images
    };
}

export interface ActualDataItem {
    date: string;
    name: string;
    actual: number;
    [key: string]: any;
}

export interface ProjectColumn {
    header: string;
    key: string;
    section: 'Target' | 'Actual' | 'Accumulative';
    formula?: string; // Excel formula with {rowIndex} placeholder
    width?: number;
}

export interface DailyColumn {
    header: string;
    key: string;
    formula?: string;
}

export interface DashboardMetric {
    label: string;
    formula?: string;
    value?: string | number;
    format?: string;
}

export interface ProjectData {
    name: string;
    goal: number;
    unit: string;
    startDate: string;
    endDate: string;
    resources: string[];
    actualData?: ActualDataItem[];
    columns: ProjectColumn[];
    dailyColumns: DailyColumn[];
    targetData?: Record<string, Record<string, number>>;
    pivotColumns?: { header: string; formula: string }[];
    dashboardMetrics?: DashboardMetric[];
    overview?: string;
    expectedOutputPerOperator?: string;
    outputCadence?: string;
    // total planned time for the project in minutes (optional)
    timeMinutes?: number;
}

export interface FileAttachment {
    name: string;
    type: string;
    data: string;
    file: File;
    metadata?: string;
    parsedData?: ActualDataItem[];
}
