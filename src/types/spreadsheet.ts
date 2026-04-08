// ─── Spreadsheet Types ───

export interface CellStyle {
    bgColor?: string;
    color?: string;         // Hex color for the text
    fontSize?: number;      // in px (default 13)
    bold?: boolean;
    italic?: boolean;
    textAlign?: 'left' | 'center' | 'right';
}

export interface MergeRange {
    startRow: number;
    startCol: number;
    endRow: number;
    endCol: number;
}

export interface SpreadsheetCell {
    value: string | number;
    style?: CellStyle;
}

export interface SpreadsheetColumn {
    key: string;
    header: string;
    width?: number;  // in px
}

export interface SpreadsheetData {
    columns: SpreadsheetColumn[];
    rows: SpreadsheetCell[][];          // rows[rowIndex][colIndex]
    merges: MergeRange[];
    title?: string;
}

// Color presets for the color picker
export const COLOR_PRESETS = [
    // Row 1: Neutral
    '#FFFFFF', '#F3F4F6', '#E5E7EB', '#D1D5DB', '#9CA3AF', '#6B7280', '#374151', '#1F2937',
    // Row 2: Warm
    '#FEF3C7', '#FDE68A', '#FCD34D', '#FBBF24', '#F59E0B', '#D97706', '#B45309', '#92400E',
    // Row 3: Green
    '#D1FAE5', '#A7F3D0', '#6EE7B7', '#34D399', '#10B981', '#059669', '#047857', '#065F46',
    // Row 4: Blue
    '#DBEAFE', '#BFDBFE', '#93C5FD', '#60A5FA', '#3B82F6', '#2563EB', '#1D4ED8', '#1E40AF',
    // Row 5: Red/Pink
    '#FEE2E2', '#FECACA', '#FCA5A5', '#F87171', '#EF4444', '#DC2626', '#B91C1C', '#991B1B',
    // Row 6: Purple
    '#EDE9FE', '#DDD6FE', '#C4B5FD', '#A78BFA', '#8B5CF6', '#7C3AED', '#6D28D9', '#5B21B6',
];

export const FONT_SIZES = [10, 11, 12, 13, 14, 16, 18, 20, 24, 28, 32];

// Helper to generate an empty spreadsheet
export function createEmptySpreadsheet(
    numRows: number,
    numCols: number,
    headers?: string[]
): SpreadsheetData {
    const columns: SpreadsheetColumn[] = [];
    for (let c = 0; c < numCols; c++) {
        columns.push({
            key: `col_${c}`,
            header: headers?.[c] || String.fromCharCode(65 + (c % 26)),
            width: 120,
        });
    }

    const rows: SpreadsheetCell[][] = [];
    for (let r = 0; r < numRows; r++) {
        const row: SpreadsheetCell[] = [];
        for (let c = 0; c < numCols; c++) {
            row.push({ value: '' });
        }
        rows.push(row);
    }

    return { columns, rows, merges: [] };
}

// Demo spreadsheet with production plan data
export function createDemoSpreadsheet(): SpreadsheetData {
    const headers = ['Date', 'Operator', 'Target', 'Actual', 'Variance', 'Status'];
    const data = createEmptySpreadsheet(12, 6, headers);
    data.title = 'Video Production Q1 - Daily Output';
    data.columns[0].width = 110;
    data.columns[1].width = 140;
    data.columns[2].width = 90;
    data.columns[3].width = 90;
    data.columns[4].width = 90;
    data.columns[5].width = 130;

    const operators = ['Maria Santos', 'John Reyes', 'Ana Garcia', 'Carlos Cruz'];
    const dates = ['2026-03-20', '2026-03-20', '2026-03-20', '2026-03-20',
                   '2026-03-21', '2026-03-21', '2026-03-21', '2026-03-21',
                   '2026-03-22', '2026-03-22', '2026-03-22', '2026-03-22'];

    dates.forEach((date, i) => {
        const opIdx = i % 4;
        const target = 10 + Math.floor(i / 4) * 2;
        const actual = target + Math.floor(Math.random() * 5) - 2;
        const variance = actual - target;

        data.rows[i] = [
            { value: date },
            { value: operators[opIdx] },
            { value: target, style: { textAlign: 'right' } },
            { value: actual, style: { textAlign: 'right' } },
            { value: variance, style: { textAlign: 'right', bgColor: variance >= 0 ? '#D1FAE5' : '#FEE2E2' } },
            { value: variance >= 0 ? 'On Track' : 'Behind', style: { bgColor: variance >= 0 ? '#D1FAE5' : '#FEE2E2', bold: true } },
        ];
    });

    // Merge dates in column 0 for same dates
    data.merges = [
        { startRow: 0, startCol: 0, endRow: 3, endCol: 0 },
        { startRow: 4, startCol: 0, endRow: 7, endCol: 0 },
        { startRow: 8, startCol: 0, endRow: 11, endCol: 0 },
    ];

    return data;
}
