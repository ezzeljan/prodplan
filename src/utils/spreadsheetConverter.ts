import { ProjectData } from '../types/production';
import { SpreadsheetData, SpreadsheetCell, CellStyle, MergeRange } from '../types/spreadsheet';

/**
 * LPB (Learning → Performing → Breaking Through) target calculation
 * Returns the target multiplier based on progress through the project timeline:
 * - Stage L (Learning): days 0-20% → 50% to 100% of dailyQuota
 * - Stage P (Performing): days 20-80% → 100% of dailyQuota
 * - Stage B (Breaking Through): days 80-100% → 100% to 130% of dailyQuota
 */
function getLpbTargetMultiplier(progress: number): number {
    if (progress < 0.20) {
        // Stage L: Linear ramp from 0.5 to 1.0
        return 0.5 + (0.5 * (progress / 0.20));
    } else if (progress < 0.80) {
        // Stage P: Steady at 1.0
        return 1.0;
    } else {
        // Stage B: Linear rise from 1.0 to 1.3
        return 1.0 + (0.3 * ((progress - 0.80) / 0.20));
    }
}

/**
 * Parse the expectedOutputPerOperator string to a number
 */
function parseOutputPerOperator(value: string | undefined): number | null {
    if (!value) return null;
    const num = parseFloat(value.replace(/[^0-9.]/g, ''));
    return isNaN(num) ? null : num;
}

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

    /**
     * Build a lookup map from every key the AI put in targetData → the
     * canonical resource name stored in project.resources.
     *
     * The AI often abbreviates names (e.g. "doms" for "Dominic Santos")
     * or uses a different casing. We match greedily:
     *   1. Exact match
     *   2. Case-insensitive exact match
     *   3. Resource name starts-with the AI key (case-insensitive)
     *   4. AI key is a substring of the resource name (case-insensitive)
     * The first match wins. Unresolved AI keys are kept as-is (new resource).
     */
    const buildResourceAliasMap = (
        targetData: Record<string, Record<string, number>>,
        resources: string[]
    ): Map<string, string> => {
        const allAiKeys = new Set<string>();
        Object.values(targetData).forEach(dayMap =>
            Object.keys(dayMap).forEach(k => allAiKeys.add(k))
        );

        const aliasMap = new Map<string, string>();
        const lowerResources = resources.map(r => r.toLowerCase());

        for (const aiKey of allAiKeys) {
            const aiLower = aiKey.toLowerCase();

            // 1. Exact match
            if (resources.includes(aiKey)) { aliasMap.set(aiKey, aiKey); continue; }
            // 2. Case-insensitive exact
            const exactIdx = lowerResources.indexOf(aiLower);
            if (exactIdx !== -1) { aliasMap.set(aiKey, resources[exactIdx]); continue; }
            // 3. Resource starts with AI key
            const startsIdx = lowerResources.findIndex(r => r.startsWith(aiLower));
            if (startsIdx !== -1) { aliasMap.set(aiKey, resources[startsIdx]); continue; }
            // 4. AI key is substring of resource name
            const subIdx = lowerResources.findIndex(r => r.includes(aiLower));
            if (subIdx !== -1) { aliasMap.set(aiKey, resources[subIdx]); continue; }
            // 5. No match — keep as-is (will be treated as an extra resource row)
            aliasMap.set(aiKey, aiKey);
        }
        return aliasMap;
    };

    if (project.targetData) {
        const sortedDates = Object.keys(project.targetData).sort();
        const aliasMap = buildResourceAliasMap(project.targetData, project.resources);

        // Build a per-date map keyed by canonical resource name
        const resolvedTargetData: Record<string, Record<string, number>> = {};
        for (const date of sortedDates) {
            resolvedTargetData[date] = {};
            for (const [aiKey, value] of Object.entries(project.targetData[date])) {
                const canonical = aliasMap.get(aiKey) ?? aiKey;
                // Sum if multiple AI keys map to the same resource
                resolvedTargetData[date][canonical] = (resolvedTargetData[date][canonical] ?? 0) + value;
            }
        }

        for (const date of sortedDates) {
            const dateTargets = resolvedTargetData[date];
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
        // No targetData — generate targets using LPB model
        const start = new Date(project.startDate);
        const end = new Date(project.endDate);
        
        // Calculate total days and daily quota
        const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        const numResources = project.resources.length || 1;
        
        // Parse expectedOutputPerOperator or calculate from goal
        const customOutput = parseOutputPerOperator(project.expectedOutputPerOperator);
        const dailyQuota = customOutput !== null 
            ? customOutput 
            : (project.goal || 0) / totalDays / numResources;
        
        let dayIndex = 0;
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];
            const progress = dayIndex / totalDays;
            const target = dailyQuota * getLpbTargetMultiplier(progress);
            
            for (const resource of project.resources) {
                const row: SpreadsheetCell[] = Array(numCols).fill(null).map(() => ({ value: '' }));
                row[0] = { value: dateStr === prevDate ? '' : dateStr };
                row[1] = { value: resource };
                
                // Fill target column
                dailyCols.forEach((col, colIdx) => {
                    if (col.key === 'target') {
                        row[colIdx + 2] = { value: Math.round(target * 100) / 100, style: { textAlign: 'right' } };
                    } else if (col.key === 'actual') {
                        row[colIdx + 2] = { value: '', style: { textAlign: 'right' } };
                    } else {
                        row[colIdx + 2] = { value: '', style: { textAlign: 'right' } };
                    }
                });
                
                dataRows.push(row);
                prevDate = dateStr;
            }
            dayIndex++;
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