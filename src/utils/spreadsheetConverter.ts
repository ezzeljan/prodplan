import { ProjectData } from '../types/production';
import { SpreadsheetData, SpreadsheetCell, CellStyle, MergeRange, createEmptySpreadsheet } from '../types/spreadsheet';

/**
 * Convert AI-generated ProjectData (from generate_production_plan tool) into
 * a SpreadsheetData object that can be rendered in the EditableSpreadsheet.
 */
export function projectDataToSpreadsheet(project: ProjectData): SpreadsheetData {
    const headerStyle: CellStyle = { bold: true, bgColor: '#065F46', textAlign: 'center', fontSize: 13 };
    const titleStyle: CellStyle = { bold: true, fontSize: 18, bgColor: '#047857', textAlign: 'center' };
    const labelStyle: CellStyle = { bold: true, bgColor: '#132a1e', fontSize: 13 };
    const metaStyle: CellStyle = { bgColor: '#1F2937', fontSize: 13 };

    // ── Build header columns from dailyColumns ──
    const dailyCols = project.dailyColumns || [];
    const colHeaders = ['Date', 'Name', ...dailyCols.map(c => c.header)];
    const numCols = colHeaders.length;

    // ── Overview block (rows 0–7) ──
    const overviewRows: SpreadsheetCell[][] = [];
    const merges: MergeRange[] = [];

    // Row 0: Title spanning all columns
    const titleRow: SpreadsheetCell[] = Array(numCols).fill(null).map(() => ({ value: '', style: titleStyle }));
    titleRow[0] = { value: `Daily Output of ${project.name}`, style: titleStyle };
    overviewRows.push(titleRow);
    merges.push({ startRow: 0, startCol: 0, endRow: 0, endCol: numCols - 1 });

    // Row 1: empty spacer
    overviewRows.push(Array(numCols).fill(null).map(() => ({ value: '' })));

    // Overview info rows
    const overviewFields = [
        ['Project Name', project.name],
        ['Overview', project.overview || 'N/A'],
        ['Start Date', project.startDate],
        ['End Date', project.endDate],
        ['Overall Goal', `${project.goal} ${project.unit}`],
        ['Resources', project.resources.join(', ')],
    ];

    if (project.expectedOutputPerOperator) {
        overviewFields.push(['Expected Output/Operator', project.expectedOutputPerOperator]);
    }
    if (project.outputCadence) {
        overviewFields.push(['Output Cadence', project.outputCadence]);
    }

    overviewFields.forEach(([label, value]) => {
        const row: SpreadsheetCell[] = Array(numCols).fill(null).map(() => ({ value: '' }));
        row[0] = { value: label, style: labelStyle };
        row[1] = { value: value, style: metaStyle };
        overviewRows.push(row);
        // Merge value cell across remaining columns
        if (numCols > 2) {
            merges.push({ startRow: overviewRows.length - 1, startCol: 1, endRow: overviewRows.length - 1, endCol: numCols - 1 });
        }
    });

    // Row: empty spacer
    overviewRows.push(Array(numCols).fill(null).map(() => ({ value: '' })));

    // ── Column Header Row ──
    const headerRow: SpreadsheetCell[] = colHeaders.map(h => ({ value: h, style: headerStyle }));
    overviewRows.push(headerRow);

    const dataStartRow = overviewRows.length;

    // ── Data Rows from targetData ──
    const dataRows: SpreadsheetCell[][] = [];
    let prevDate = '';

    if (project.targetData) {
        const sortedDates = Object.keys(project.targetData).sort();
        
        for (const date of sortedDates) {
            const dateTargets = project.targetData[date];
            for (const resource of project.resources) {
                const target = dateTargets[resource] ?? 0;
                const row: SpreadsheetCell[] = Array(numCols).fill(null).map(() => ({ value: '' }));
                
                row[0] = { value: date === prevDate ? '' : date };
                row[1] = { value: resource };
                
                // Fill daily columns
                dailyCols.forEach((col, colIdx) => {
                    if (col.key === 'target') {
                        row[colIdx + 2] = { value: target, style: { textAlign: 'right' } };
                    } else if (col.key === 'actual') {
                        row[colIdx + 2] = { value: '', style: { textAlign: 'right' } };
                    } else {
                        // Formula columns leave empty for now
                        row[colIdx + 2] = { value: '', style: { textAlign: 'right' } };
                    }
                });
                
                dataRows.push(row);
                prevDate = date;
            }
        }
    } else {
        // No targetData — create skeleton rows from dates & resources
        const start = new Date(project.startDate);
        const end = new Date(project.endDate);
        
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];
            for (const resource of project.resources) {
                const row: SpreadsheetCell[] = Array(numCols).fill(null).map(() => ({ value: '' }));
                row[0] = { value: dateStr === prevDate ? '' : dateStr };
                row[1] = { value: resource };
                dataRows.push(row);
                prevDate = dateStr;
            }
        }
    }

    // ── Merge date cells ──
    let mergeStart = dataStartRow;
    let currentDateVal = '';

    for (let i = 0; i < dataRows.length; i++) {
        const dateVal = String(dataRows[i][0]?.value || '');
        if (dateVal && dateVal !== currentDateVal) {
            if (currentDateVal && i - (mergeStart - dataStartRow) > 1) {
                merges.push({
                    startRow: mergeStart,
                    startCol: 0,
                    endRow: dataStartRow + i - 1,
                    endCol: 0,
                });
            }
            currentDateVal = dateVal;
            mergeStart = dataStartRow + i;
        }
    }
    // Final merge group
    if (currentDateVal && dataRows.length - (mergeStart - dataStartRow) > 1) {
        merges.push({
            startRow: mergeStart,
            startCol: 0,
            endRow: dataStartRow + dataRows.length - 1,
            endCol: 0,
        });
    }

    // ── Assemble ──
    const allRows = [...overviewRows, ...dataRows];
    
    const columns = colHeaders.map((h, i) => ({
        key: `col_${i}`,
        header: h,
        width: i === 0 ? 120 : i === 1 ? 150 : 110,
    }));

    return {
        columns,
        rows: allRows,
        merges,
        title: `${project.name} — Production Plan`,
    };
}

/**
 * Convert raw AI-extracted text content into a simple SpreadsheetData.
 * Used when the AI extracts table-like data from PDFs/docs but hasn't
 * gone through the full generate_production_plan tool call yet.
 */
export function rawTableToSpreadsheet(
    headers: string[],
    rows: (string | number)[][],
    title?: string
): SpreadsheetData {
    const columns = headers.map((h, i) => ({
        key: `col_${i}`,
        header: h,
        width: Math.max(100, h.length * 10),
    }));

    const headerStyle: CellStyle = { bold: true, bgColor: '#065F46', textAlign: 'center' };
    
    const dataRows: SpreadsheetCell[][] = rows.map(row =>
        row.map((val, colIdx) => ({
            value: val,
            style: typeof val === 'number' ? { textAlign: 'right' as const } : undefined,
        }))
    );

    return {
        columns,
        rows: dataRows,
        merges: [],
        title: title || 'Extracted Data',
    };
}
