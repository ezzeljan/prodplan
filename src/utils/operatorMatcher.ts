import type { SpreadsheetData } from '../types/spreadsheet';
import type { UnifiedProject } from './projectStorage';

/**
 * Returns indices of rows where the Name column (index 1) matches the operator name.
 * The spreadsheet convention is: col 0 = Date, col 1 = Name, col 2+ = data columns.
 * Falls back to searching all columns if no matches found in col 1 (handles edge cases).
 */
export function findOperatorRows(spreadsheet: SpreadsheetData, operatorName: string): number[] {
    const target = operatorName.toLowerCase().trim();
    const indices: number[] = [];
    const NAME_COL = 1;

    // Primary: check only the Name column (index 1) — avoids false matches in
    // header/overview rows where the operator name may appear in Resources lists etc.
    for (let i = 0; i < spreadsheet.rows.length; i++) {
        const row = spreadsheet.rows[i];
        const nameCell = row[NAME_COL];
        if (nameCell && String(nameCell.value ?? '').toLowerCase().trim() === target) {
            indices.push(i);
        }
    }

    // Fallback: if nothing matched in col 1, search all columns
    // (handles non-standard spreadsheet layouts)
    if (indices.length === 0) {
        for (let i = 0; i < spreadsheet.rows.length; i++) {
            for (const cell of spreadsheet.rows[i]) {
                if (String(cell?.value ?? '').toLowerCase().trim() === target) {
                    indices.push(i);
                    break;
                }
            }
        }
    }

    return indices;
}

/**
 * Returns projects that contain at least one row matching the operator name.
 */
export function getOperatorProjects(projects: UnifiedProject[], operatorName: string): UnifiedProject[] {
    return projects.filter(p =>
        p.spreadsheetData && findOperatorRows(p.spreadsheetData, operatorName).length > 0
    );
}

/**
 * Returns a new SpreadsheetData containing only the rows for the given operator.
 * Merges are cleared since rows are non-contiguous after filtering.
 */
export function filterSpreadsheetForOperator(
    spreadsheet: SpreadsheetData,
    operatorName: string,
): SpreadsheetData {
    const matchingIndices = findOperatorRows(spreadsheet, operatorName);

    const filteredRows = matchingIndices.length > 0
        ? matchingIndices.map(i => spreadsheet.rows[i])
        : spreadsheet.rows.slice(0, 1).map(r => r.map(() => ({ value: '' })));

    return {
        ...spreadsheet,
        rows: filteredRows,
        merges: [],
        title: `${spreadsheet.title || 'Spreadsheet'} — ${operatorName}`,
    };
}
