import ExcelJS from 'exceljs';
import { eachDayOfInterval, isValid, isSameDay, differenceInCalendarDays, format } from 'date-fns';
import { ProjectData, ActualDataItem } from '../types/production';

export const getColumnLetter = (colIndex: number): string => {
    let letter = '';
    while (colIndex > 0) {
        let temp = (colIndex - 1) % 26;
        letter = String.fromCharCode(65 + temp) + letter;
        colIndex = Math.floor((colIndex - temp) / 26);
    }
    return letter;
};

export const sanitizeSheetName = (name: string) => name.replace(/[\[\]\:\*\?\/\\]/g, '').substring(0, 31);

export const generateExcelFile = async (projectData: ProjectData): Promise<ExcelJS.Buffer> => {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Production Plan Agent';
    workbook.created = new Date();

    const parseLocalDate = (dateStr: string) => {
        const [y, m, d] = dateStr.split('-').map(Number);
        return new Date(y, m - 1, d);
    };

    const start = parseLocalDate(projectData.startDate);
    const end = parseLocalDate(projectData.endDate);

    if (!isValid(start) || !isValid(end)) {
        throw new Error("Invalid dates provided");
    }

    const days = eachDayOfInterval({ start, end });
    const scheduleItems: any[] = [];

    days.forEach(day => {
        // Calculate days elapsed from start date (using calendar days to avoid timezone shifts)
        const daysElapsed = Math.max(0, differenceInCalendarDays(day, start));
        const weekNum = Math.floor(daysElapsed / 7) + 1;
        const weekString = `Week ${weekNum}`;
        const dayName = day.toLocaleDateString("en-US", { weekday: "long" });

        projectData.resources.forEach(resource => {
            // Find actual data if it exists
            let actualMatch: ActualDataItem | null = null;
            if (projectData.actualData) {
                actualMatch = projectData.actualData.find(item => {
                    const itemDate = new Date(item.date);
                    return isValid(itemDate) && isSameDay(itemDate, day) && item.name.toLowerCase() === resource.toLowerCase();
                }) || null;
            }

            const item: any = {
                date: day,
                name: resource,
                weekString,
                dayName,
                actual: actualMatch ? actualMatch.actual : null
            };

            // Add extra daily data if defined
            if (projectData.dailyColumns && actualMatch) {
                projectData.dailyColumns.forEach(col => {
                    item[col.key] = actualMatch![col.key] || null;
                });
            }

            scheduleItems.push(item);
        });
    });

    const uniqueDates = Array.from(new Set(scheduleItems.map(s => s.date.toISOString()))).sort();
    const totalDays = uniqueDates.length;

    const itemsByDay: Record<string, number> = {};
    scheduleItems.forEach(item => {
        const d = item.date.toISOString();
        itemsByDay[d] = (itemsByDay[d] || 0) + 1;
    });

    // Fallback dailyWeights for calculating target if targetData isn't provided
    // Uses LPB (Learning → Performing → Breaking Through) model:
    // - Stage L (days 0-20%): 50% to 100% of daily quota
    // - Stage P (days 20-80%): 100% of daily quota
    // - Stage B (days 80-100%): 100% to 130% of daily quota
    const dailyWeights: Record<string, number> = {};
    if (!projectData.targetData || Object.keys(projectData.targetData).length === 0) {
        const numResources = projectData.resources.length || 1;
        const customOutput = projectData.expectedOutputPerOperator 
            ? parseFloat(projectData.expectedOutputPerOperator.replace(/[^0-9.]/g, ''))
            : null;
        const dailyQuota = customOutput && !isNaN(customOutput)
            ? customOutput
            : projectData.goal / totalDays / numResources;

        let cumulativeWeight = 0;
        uniqueDates.forEach((date, i) => {
            const progress = i / totalDays;
            let weight = 0;

            if (progress < 0.20) {
                // Stage L: Linear ramp from 0.5 to 1.0
                weight = 0.5 + (0.5 * (progress / 0.20));
            } else if (progress < 0.80) {
                // Stage P: Steady at 1.0
                weight = 1.0;
            } else {
                // Stage B: Linear rise from 1.0 to 1.3
                weight = 1.0 + (0.3 * ((progress - 0.80) / 0.20));
            }

            // weight represents the multiplier to dailyQuota
            dailyWeights[date] = weight;
            cumulativeWeight += weight * (itemsByDay[date] || 0);
        });

        // Store cumulativeWeight directly for fallback
        (dailyWeights as any)._cumulative = cumulativeWeight;
        // Also store dailyQuota for calculation
        (dailyWeights as any)._dailyQuota = dailyQuota;
    }

    // Helper to get LPB weight from progress
    const getLpbWeight = (progress: number): number => {
        if (progress < 0.20) return 0.5 + (0.5 * (progress / 0.20));
        if (progress < 0.80) return 1.0;
        return 1.0 + (0.3 * ((progress - 0.80) / 0.20));
    };

    // ──── AI DATA VERIFIER ────
    // ──── AI DATA VERIFIER ────
    console.group('🔍 AI Target Data Verifier');
    if (projectData.targetData && Object.keys(projectData.targetData).length > 0) {
        console.log(`✅ SUCCESS: AI provided targets for ${Object.keys(projectData.targetData).length} dates.`);
        const firstDate = Object.keys(projectData.targetData)[0];
        console.log('Sample data from AI (first date):', projectData.targetData[firstDate]);
    } else {
        console.warn('⚠️ WARNING: AI provided 0 targetData points. Falling back to dynamic weights.');
    }
    console.groupEnd();

    const itemsWithTargets = scheduleItems.map((item) => {
        let target = 0;
        const dateKey = format(item.date, 'yyyy-MM-dd');

        // 1. Prioritize targetData provided directly by the AI (matching chat UI preview)
        if (projectData.targetData && projectData.targetData[dateKey]) {
            const dayTargets = projectData.targetData[dateKey];
            // Find target for this resource name (case insensitive)
            const matchedName = Object.keys(dayTargets).find(name => name.toLowerCase() === item.name.toLowerCase());
            if (matchedName) {
                target = dayTargets[matchedName];
            }
        } else if (!projectData.targetData || Object.keys(projectData.targetData).length === 0) {
            // 2. Fallback to calculating target using LPB model
            const weight = dailyWeights[item.date.toISOString()] || 1;
            const dailyQuota = (dailyWeights as any)._dailyQuota || (projectData.goal / totalDays / (projectData.resources.length || 1));
            target = weight * dailyQuota;
        }

        return {
            ...item,
            target
        };
    });

    const normalizedUnit = (projectData.unit || 'Units').trim();
    const unitLabel = normalizedUnit
        ? normalizedUnit.charAt(0).toUpperCase() + normalizedUnit.slice(1)
        : 'Units';

    const cadenceRaw = projectData.outputCadence?.trim();
    const cadenceDescriptor = cadenceRaw
        ? cadenceRaw.toLowerCase().startsWith('per ')
            ? cadenceRaw
            : `per ${cadenceRaw}`
        : 'per day';
    const outputColumnLabel = `Output ${cadenceDescriptor}`;

    type DailyColumnDefinition = {
        header: string;
        key: string;
        width: number;
        formula?: string;
    };

    // Keep Day and Week in the raw sheet but hide them so formulas that
    // expect those columns still work. The visible columns will be Date, Operator,
    // Target, Actual, Variance and any other user-defined dailyColumns.
    const baseKeyCols = [
        { header: 'Date', key: 'date', width: 15 },
        { header: 'Operator', key: 'name', width: 20 },
    ];

    // Ensure Target and Actual exist in the daily columns so the sheet and
    // preview consistently show Target / Actual / Variance. Do not include the
    // output-per-day duplicate column.
    const userCols = projectData.dailyColumns.map((col) => ({
        header: col.header,
        key: col.key,
        width: 15,
        formula: col.formula,
    }));

    const ensureHas = (arr: DailyColumnDefinition[], key: string, header: string) => {
        return arr.some(c => c.key.toLowerCase() === key.toLowerCase())
            ? arr
            : [{ header, key, width: 15 }, ...arr];
    };

    let dynamicKeyCols: DailyColumnDefinition[] = [...userCols];
    dynamicKeyCols = ensureHas(dynamicKeyCols, 'actual', 'Actual');
    dynamicKeyCols = ensureHas(dynamicKeyCols, 'target', 'Target');
    // Add Variance as a calculated column (populated per-row) if not present
    if (!dynamicKeyCols.some(c => c.key.toLowerCase() === 'variance')) {
        dynamicKeyCols.push({ header: 'Variance', key: 'variance', width: 15 });
    }

    const firstSheetName = sanitizeSheetName(`Daily Production of ${projectData.name}`);
    const rawDataSheet = workbook.addWorksheet(firstSheetName);
    rawDataSheet.columns = [...baseKeyCols, ...dynamicKeyCols];

    // Note: numeric formatting will be applied per-cell or via conditional formatting
    // so whole numbers keep integer formatting while decimals show two places.

    const totalCols = baseKeyCols.length + dynamicKeyCols.length;
    const lastColLetter = getColumnLetter(totalCols);
    rawDataSheet.mergeCells(`A1:${lastColLetter}1`);
    const overviewHeader = rawDataSheet.getCell('A1');
    overviewHeader.value = `Daily Output of ${projectData.name}`;
    overviewHeader.font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
    overviewHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF046241' } };
    overviewHeader.alignment = { horizontal: 'center', vertical: 'middle' };
    overviewHeader.border = { bottom: { style: 'thin' } };
    rawDataSheet.getRow(1).height = 28;

    const overviewRows: [string, string][] = [
        ['Project Name', projectData.name || ''],
        ['Project Overview', projectData.overview?.trim() || 'Not provided'],
    ];
    if (projectData.expectedOutputPerOperator?.trim()) {
        overviewRows.push(['Expected Output per operator', projectData.expectedOutputPerOperator]);
    }
    overviewRows.push(['Start Date', projectData.startDate || ''], ['End Date', projectData.endDate || '']);

    const overviewStartRow = 2;
    overviewRows.forEach(([label, value], index) => {
        const rowIndex = overviewStartRow + index;
        const labelCell = rawDataSheet.getCell(`A${rowIndex}`);
        rawDataSheet.mergeCells(`B${rowIndex}:${lastColLetter}${rowIndex}`);
        const valueCell = rawDataSheet.getCell(`B${rowIndex}`);

        labelCell.value = label;
        labelCell.font = { bold: true };
        labelCell.alignment = { vertical: 'middle', horizontal: 'left' };
        labelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE3F3EE' } };
        labelCell.border = {
            top: { style: 'thin' },
            bottom: { style: 'thin' },
            left: { style: 'thin' },
            right: { style: 'thin' },
        };

        valueCell.value = value || 'Not provided';
        valueCell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
        valueCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF7FFF8' } };
        valueCell.border = {
            top: { style: 'thin' },
            bottom: { style: 'thin' },
            left: { style: 'thin' },
            right: { style: 'thin' },
        };
    });

    const tableHeaderRowIndex = overviewStartRow + overviewRows.length + 3;
    const firstDataRowIndex = tableHeaderRowIndex + 1;

    const tableCols = [
        { name: 'Date', filterButton: true },
        { name: 'Operator', filterButton: true },
        ...dynamicKeyCols.map(col => ({
            name: col.header,
            filterButton: true,
            totalsRowFunction: col.header.toLowerCase().includes('rate') ? undefined : 'sum',
        })),
    ];

    rawDataSheet.addTable({
        name: 'DailyProductionTable',
        ref: `A${tableHeaderRowIndex}`,
        headerRow: true,
        totalsRow: true,
        style: { theme: 'TableStyleMedium2', showRowStripes: true },
        columns: tableCols as any,
        rows: itemsWithTargets.map((item, index) => {
            const rowIndex = firstDataRowIndex + index;
            const row: any[] = [
                item.date,
                item.name,
            ];

            // Fill dynamic columns: prefer explicit keys target/actual/variance
            dynamicKeyCols.forEach(col => {
                const key = col.key.toLowerCase();
                if (key === 'target') {
                    row.push(item.target);
                } else if (key === 'actual') {
                    row.push(item.actual ?? null);
                } else if (key === 'variance') {
                    const actualVal = typeof item.actual === 'number' ? item.actual : 0;
                    row.push(item.target - actualVal);
                } else if (col.formula) {
                    const rawF = col.formula.replace(/{rowIndex}/g, rowIndex.toString()).replace(/^\s*=+/, '');
                    row.push({ formula: rawF });
                } else {
                    row.push(item[col.key]);
                }
            });

            return row;
        }),
    });

    // Day/Week columns removed per user request; no hidden columns needed.

    // Apply per-cell numeric formatting for table rows so whole numbers show
    // without decimals while decimals show two places. Also apply percent
    // formatting when header indicates a rate/percentage.
    itemsWithTargets.forEach((_, idx) => {
        const rowIndex = firstDataRowIndex + idx;
        dynamicKeyCols.forEach((col, dIdx) => {
            const colIndex = baseKeyCols.length + dIdx + 1; // 1-based
            const cell = rawDataSheet.getRow(rowIndex).getCell(colIndex);
            const headerLower = (col.header || '').toLowerCase();
            const val = cell.value;
            try {
                if (typeof val === 'number') {
                    if (headerLower.includes('%') || headerLower.includes('rate')) {
                        cell.numFmt = '0.00%';
                    } else if (Number.isInteger(val)) {
                        cell.numFmt = '#,##0';
                    } else {
                        cell.numFmt = '0.00';
                    }
                }
            } catch (e) {
                // ignore
            }
        });
    });

    const tableRowCount = itemsWithTargets.length;
    const safeRowCount = Math.max(tableRowCount, 1);
    const lastDataRowIndex = firstDataRowIndex + safeRowCount - 1;
    const firstSheetFormulaName = `'${firstSheetName.replace(/'/g, "''")}'`;
    const columnsForMap = [...baseKeyCols, ...dynamicKeyCols];
    const columnRangeMap: Record<string, string> = {};
    columnsForMap.forEach((col, idx) => {
        const letter = getColumnLetter(idx + 1);
        const range = `${firstSheetFormulaName}!${letter}${firstDataRowIndex}:${letter}${lastDataRowIndex}`;
        columnRangeMap[col.header.toLowerCase()] = range;
        if (col.key) {
            columnRangeMap[col.key.toLowerCase()] = range;
        }
    });

    const convertTableFormula = (formula?: string) => {
        if (!formula) return undefined;
        let out = formula;

        // 1. Handle the official table syntax: DailyProductionTable[Column]
        out = out.replace(/DailyProductionTable\[([^\]]+)\]/gi, (match, columnName) => {
            const lookupKey = columnName.trim().toLowerCase();
            const range = columnRangeMap[lookupKey];
            return range || match;
        });

        // 2. Aggressive fallback: Replace standalone words that match our column keys
        // (Avoid replacing things inside quotes or function names)
        Object.entries(columnRangeMap).forEach(([key, range]) => {
            if (key.length < 3) return; // avoid short key collisions
            // Match the key as a whole word if it's not preceded by [ or !
            const regex = new RegExp(`(?<!\\[|!)\\b${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b(?![\\]])`, 'gi');
            out = out.replace(regex, range);
        });

        return out;
    };

    const sanitizeFormula = (f?: string) => {
        if (!f) return undefined;
        let out = f.replace(/^\s*=+/, '');
        // Replace accidental table-sheet column full-column refs like DailyProductionTable!A:A
        // with explicit sheet ranges covering the data rows.
        try {
            out = out.replace(/DailyProductionTable!([A-Z]+):([A-Z]+)/gi, (_m, c1, c2) => {
                return `${firstSheetFormulaName}!${c1}${firstDataRowIndex}:${c2}${lastDataRowIndex}`;
            });
            out = out.replace(/DailyProductionTable!([A-Z]+):([A-Z]+)/gi, (_m, c1, c2) => `${firstSheetFormulaName}!${c1}${firstDataRowIndex}:${c2}${lastDataRowIndex}`);
        } catch (e) {
            // ignore if indices not available
        }
        return out;
    };

    const findRangeByKeywords = (keywords: string[]) => {
        for (const keyword of keywords) {
            const normalized = keyword.toLowerCase();
            const entry = Object.entries(columnRangeMap).find(([mapKey]) =>
                mapKey.includes(normalized),
            );
            if (entry) return entry[1];
        }
        return undefined;
    };

    const lookupRange = (...keys: string[]) => {
        for (const key of keys) {
            const normalized = key.toLowerCase();
            if (columnRangeMap[normalized]) {
                return columnRangeMap[normalized];
            }
        }
        return undefined;
    };

    const buildSumFormula = (range?: string) => (range ? `SUM(${range})` : undefined);

    const planTimeRange = findRangeByKeywords([
        "time",
        "hour",
        "hr",
        "duration",
        "min",
        "shift",
    ]);
    const actualTimeRange = findRangeByKeywords([
        "actual time",
        "actual hour",
        "actual hr",
        "actual",
        "completed time",
        "duration",
    ]);
    const planTaskRange = lookupRange("target", "plan");
    const actualTaskRange = lookupRange("actual", "completed", "variance");
    const planTimeFormula = buildSumFormula(planTimeRange);
    const actualTimeFormula = buildSumFormula(actualTimeRange);
    const planTaskFormula = buildSumFormula(planTaskRange);
    const actualTaskFormula = buildSumFormula(actualTaskRange);

    // Fallback: if no explicit time ranges found, use task ranges so Summary shows values
    const effectivePlanTimeFormula = planTimeFormula || planTaskFormula;
    const effectiveActualTimeFormula = actualTimeFormula || actualTaskFormula;

    // Heuristics: derive task/time values from projectData when formulas/ranges are missing.
    const parseDurationFromText = (text?: string): number | undefined => {
        if (!text) return undefined;
        const txt = text.toLowerCase();
        // look for seconds
        const secMatch = txt.match(/(\d+(?:\.\d+)?)\s*(?:sec|secs|seconds|s)\b/);
        if (secMatch) return parseFloat(secMatch[1]);
        const minMatch = txt.match(/(\d+(?:\.\d+)?)\s*(?:min|mins|minutes|m)\b/);
        if (minMatch) return parseFloat(minMatch[1]) * 60;
        const hrMatch = txt.match(/(\d+(?:\.\d+)?)\s*(?:hr|hrs|hour|hours|h)\b/);
        if (hrMatch) return parseFloat(hrMatch[1]) * 3600;
        return undefined;
    };

    const unitLower = (projectData.unit || '').toLowerCase();
    const overviewText = `${projectData.overview || ''} ${projectData.expectedOutputPerOperator || ''}`;
    const sampleItemDurationSec = parseDurationFromText(overviewText) || parseDurationFromText(projectData.outputCadence);
    let derivedTaskCount: number | undefined;
    let derivedTimeMinutes: number | undefined;

    // Prefer an explicit timeMinutes field on projectData if provided
    if (typeof projectData.timeMinutes === 'number') {
        derivedTimeMinutes = projectData.timeMinutes;
        if (sampleItemDurationSec) {
            derivedTaskCount = Math.round((derivedTimeMinutes * 60) / sampleItemDurationSec);
        }
    }

    if (derivedTimeMinutes === undefined && typeof projectData.goal === 'number') {
        if (unitLower.includes('min') || unitLower.includes('minute')) {
            derivedTimeMinutes = projectData.goal;
            if (sampleItemDurationSec) {
                derivedTaskCount = Math.round((derivedTimeMinutes * 60) / sampleItemDurationSec);
            }
        } else if (unitLower.includes('sec') || unitLower.includes('second')) {
            // goal is in seconds
            if (sampleItemDurationSec) {
                derivedTaskCount = Math.round(projectData.goal / sampleItemDurationSec);
                derivedTimeMinutes = (projectData.goal / 60);
            }
        } else if (unitLower.includes('video') || unitLower.includes('unit') || unitLower === '') {
            // treat goal as task count
            derivedTaskCount = projectData.goal;
            if (sampleItemDurationSec) {
                derivedTimeMinutes = Math.round((derivedTaskCount * sampleItemDurationSec) / 60 * 100) / 100;
            }
        }
    }

    // If there is a task-sum formula and a sample duration, derive time formulas
    let computedPlanTimeFormula: string | undefined = undefined;
    let computedActualTimeFormula: string | undefined = undefined;
    if (!planTimeFormula) {
        if (planTaskFormula && sampleItemDurationSec) {
            computedPlanTimeFormula = `${planTaskFormula}*${(sampleItemDurationSec / 60)}`;
        } else if (planTaskFormula) {
            computedPlanTimeFormula = planTaskFormula;
        }
    } else {
        computedPlanTimeFormula = planTimeFormula;
    }

    if (!actualTimeFormula) {
        if (actualTaskFormula && sampleItemDurationSec) {
            computedActualTimeFormula = `${actualTaskFormula}*${(sampleItemDurationSec / 60)}`;
        } else if (actualTaskFormula) {
            computedActualTimeFormula = actualTaskFormula;
        }
    } else {
        computedActualTimeFormula = actualTimeFormula;
    }

    // If plan formula included a multiplier but actual formula didn't, apply same multiplier to actual
    try {
        if (computedPlanTimeFormula && computedActualTimeFormula && planTaskFormula && actualTaskFormula) {
            const multMatch = computedPlanTimeFormula.match(/\*(\d+(?:\.\d+)?)/);
            if (multMatch && !/\*/.test(computedActualTimeFormula)) {
                const mult = multMatch[1];
                computedActualTimeFormula = `${actualTaskFormula}*${mult}`;
            }
        }
    } catch (e) { }



    if (tableRowCount > 0 && dynamicKeyCols.length > 0) {
        const lastDataRow = firstDataRowIndex + tableRowCount - 1;
        const dynamicStartLetter = getColumnLetter(baseKeyCols.length + 1);
        const sampleCellRef = `${dynamicStartLetter}${firstDataRowIndex}`;
        rawDataSheet.addConditionalFormatting({
            ref: `${dynamicStartLetter}${firstDataRowIndex}:${lastColLetter}${lastDataRow}`,
            rules: [
                { priority: 1, type: 'expression', formulae: [`MOD(${sampleCellRef},1)=0`], style: { numFmt: '#,##0' } },
                { priority: 2, type: 'expression', formulae: [`MOD(${sampleCellRef},1)<>0`], style: { numFmt: '#,##0.00' } },
            ],
        });
    }

    // --- Sheet 2: Production Plan ---
    const sheetPlan = workbook.addWorksheet(
        sanitizeSheetName(`${projectData.name} Production Plan`),
    );

    const dynamicColumns = [
        { header: 'Date', key: 'date', width: 15, section: 'Target' as const },
        ...projectData.columns,
    ];

    console.log('[Sheet2] dynamicColumns structure:', dynamicColumns.map(c => ({ h: c.header, k: c.key, s: c.section })));
    sheetPlan.columns = dynamicColumns.map(col => ({ key: col.key, width: col.width || 18 }));

    // Header Row 1
    const planLastColLetter = getColumnLetter(dynamicColumns.length);
    sheetPlan.mergeCells(`A1:${planLastColLetter}1`);
    const titleCell = sheetPlan.getCell('A1');
    titleCell.value = `${projectData.name}: Production Plan & Daily Output Tracking`;
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF006633' } };
    titleCell.font = { color: { argb: 'FFFFFFFF' }, bold: true, size: 12 };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

    // Section Headers Rows 2 & 3
    const sections = ['Target', 'Actual', 'Accumulative'] as const;
    let currentColIndex = 1;
    sections.forEach(section => {
        const sectionCols = dynamicColumns.filter(c => c.section === section);
        if (sectionCols.length > 0) {
            const startCol = getColumnLetter(currentColIndex);
            const endCol = getColumnLetter(currentColIndex + sectionCols.length - 1);

            if (section === 'Target') {
                sheetPlan.mergeCells(`${startCol}2:${endCol}3`);
                const cell = sheetPlan.getCell(`${startCol}2`);
                cell.value = `Target ${unitLabel} Output`;
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2CC' } };
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
            } else {
                sheetPlan.mergeCells(`${startCol}2:${endCol}2`);
                const cell2 = sheetPlan.getCell(`${startCol}2`);
                cell2.value = section === 'Actual' ? `${unitLabel} Output Tracking` : section;
                cell2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF70AD47' } };
                cell2.font = { color: { argb: 'FFFFFFFF' }, bold: true };
                cell2.alignment = { horizontal: 'center', vertical: 'middle' };

                sheetPlan.mergeCells(`${startCol}3:${endCol}3`);
                const cell3 = sheetPlan.getCell(`${startCol}3`);
                cell3.value = section;
                cell3.fill = { type: 'pattern', pattern: 'solid', fgColor: section === 'Actual' ? { argb: 'FFC6E0B4' } : { argb: 'FFD9D9D9' } };
                cell3.font = { bold: true };
                cell3.alignment = { horizontal: 'center', vertical: 'middle' };
            }
            currentColIndex += sectionCols.length;
        }
    });

    // Header Row 4
    const headerRow4 = sheetPlan.getRow(4);
    dynamicColumns.forEach((col, i) => {
        const cell = headerRow4.getCell(i + 1);
        cell.value = col.header;
        cell.font = { bold: true };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        if (col.section === 'Target') cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2CC' } };
        else if (col.section === 'Actual') cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC6E0B4' } };
        else cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
    });
    headerRow4.height = 40;

    // Numeric formatting for Production Plan will be handled with conditional
    // formatting so whole numbers remain integer-formatted and decimals show two places.

    // Build helpful range names (moved here to avoid ReferenceError in the loop below)
    const dateRange = columnRangeMap['date'];
    const targetRange = lookupRange('target', 'target (hrs)', 'plan') || findRangeByKeywords(['target', 'plan']);
    const actualRange = lookupRange('actual', 'actual (hrs)') || findRangeByKeywords(['actual']);
    const nameRange = lookupRange('operator', 'name') || findRangeByKeywords(['operator', 'name']);

    // Unique dates should use YYYY-MM-DD strings to avoid any timezone shifts
    const uniqueDatesLocal = Array.from(
        new Set(scheduleItems.map((s) => format(s.date, 'yyyy-MM-dd')))
    ).sort();

    // ──── SHEET 2 DIAGNOSTIC LOGS ──────────────────────────────────────────────
    console.group('[ExcelGenerator] Sheet 2 Debug');
    console.log('[Sheet2] columnRangeMap keys:', Object.keys(columnRangeMap));
    console.log('[Sheet2] dateRange resolved to:', dateRange);
    console.log('[Sheet2] targetRange resolved to:', targetRange);
    console.log('[Sheet2] actualRange resolved to:', actualRange);
    console.log('[Sheet2] uniqueDatesLocal (count):', uniqueDatesLocal.length);
    console.groupEnd();

    // Data Rows
    uniqueDatesLocal.forEach((dateString, index) => {
        const rowIndex = index + 5;
        const [y, m, d] = dateString.split('-').map(Number);
        const dateObj = new Date(y, m - 1, d);
        const row = sheetPlan.getRow(rowIndex);
        dynamicColumns.forEach((col, colIdx) => {
            const cell = row.getCell(colIdx + 1);
            if (col.key === 'date') {
                cell.value = dateObj;
            } else if (col.key && col.key.toLowerCase().includes('target')) {
                // Per user request: Write static numeric figure for Target instead of formula
                let targetSum = 0;
                if (projectData.targetData && projectData.targetData[dateString]) {
                    const dayTargets = projectData.targetData[dateString];
                    Object.values(dayTargets).forEach(val => {
                        targetSum += (val || 0);
                    });
                }
                if (targetSum > 0) {
                    cell.value = targetSum;
                } else {
                    // Fallback to formula only if no targetData found for this date
                    const makeDateExpr = (dt: Date) => `DATE(${dt.getFullYear()},${dt.getMonth() + 1},${dt.getDate()})`;
                    const f = `SUMIFS(${targetRange},${dateRange},"="&${makeDateExpr(dateObj)})`;
                    cell.value = { formula: sanitizeFormula(f) };
                }
            } else if (col.key && col.key.toLowerCase().includes('actual')) {
                // Actuals still need a formula since they change in Sheet 1
                const makeDateExpr = (dt: Date) => `DATE(${dt.getFullYear()},${dt.getMonth() + 1},${dt.getDate()})`;
                if (actualRange && dateRange) {
                    const f = `SUMIFS(${actualRange},${dateRange},"="&${makeDateExpr(dateObj)})`;
                    const finalFormula = sanitizeFormula(f);
                    if (index === 0) console.log(`[Sheet2] First actual formula (row ${rowIndex}):`, finalFormula);
                    cell.value = { formula: finalFormula };
                }
            } else if (col.key && col.key.toLowerCase().includes('variance')) {
                // Variance = Target - Actual within this plan sheet row
                // To be safe, compute by finding target/actual column indices in dynamicColumns
                const targetIndex = dynamicColumns.findIndex(dc => dc.key && dc.key.toLowerCase().includes('target'));
                const actualIndex = dynamicColumns.findIndex(dc => dc.key && dc.key.toLowerCase().includes('actual'));
                const tLetter = targetIndex >= 0 ? getColumnLetter(targetIndex + 1) : null;
                const aLetter = actualIndex >= 0 ? getColumnLetter(actualIndex + 1) : null;
                if (tLetter && aLetter) {
                    const f = `IFERROR(${tLetter}${rowIndex}-${aLetter}${rowIndex},0)`;
                    cell.value = { formula: sanitizeFormula(f) };
                }
            } else if (col.formula) {
                const convertedFormula = convertTableFormula(col.formula);
                if (convertedFormula) {
                    const f = convertedFormula.replace(/{rowIndex}/g, rowIndex.toString());
                    const finalFormula = sanitizeFormula(f);
                    if (index === 0) console.log(`[Sheet2] Custom formula column "${col.header}" (row ${rowIndex}):`, finalFormula);
                    cell.value = { formula: finalFormula };
                }
            }
            cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
            if (col.header?.toLowerCase().includes('rate') || col.header?.toLowerCase().includes('%')) cell.numFmt = '0.00%';
        });
    });

    // Grand Total
    const totalRowIndex = uniqueDates.length + 5;
    const totalRow = sheetPlan.getRow(totalRowIndex);
    totalRow.getCell(1).value = 'Grand Total';
    totalRow.font = { bold: true };
    dynamicColumns.forEach((col, colIdx) => {
        if (colIdx === 0) return;
        const cell = totalRow.getCell(colIdx + 1);
        const colLetter = getColumnLetter(colIdx + 1);
        const headerLower = (col.header || col.key || '').toLowerCase();
        const isRate = headerLower.includes('rate') || headerLower.includes('%');
        if (col.key !== 'week' && !isRate) {
            const f = `SUM(${colLetter}5:${colLetter}${totalRowIndex - 1})`;
            cell.value = { formula: sanitizeFormula(f) };
        }
        cell.border = { top: { style: 'double' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
    });

    // Plan Conditional Formatting: apply to numeric area starting at column B (Target)
    sheetPlan.addConditionalFormatting({
        ref: `B5:${planLastColLetter}${totalRowIndex}`,
        rules: [
            { priority: 1, type: 'expression', formulae: ['MOD(B5,1)=0'], style: { numFmt: '#,##0' } },
            { priority: 2, type: 'expression', formulae: ['MOD(B5,1)<>0'], style: { numFmt: '#,##0.00' } },
        ],
    });

    // --- Sheet 3: Pivot Summary ---
    const sheetPivot = workbook.addWorksheet(sanitizeSheetName('Pivot Tables'));

    // Block 1: Weekly totals
    const pivotStartCol = 1;
    const pivotCols = ['Week', 'Total Target', 'Total Actual', 'Total Variance'];
    const pivotLastColLetter = getColumnLetter(pivotStartCol + pivotCols.length - 1);
    sheetPivot.mergeCells(`A1:${pivotLastColLetter}1`);
    const pivotTitleCell = sheetPivot.getCell('A1');
    pivotTitleCell.value = 'Daily Production';
    pivotTitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF133020' } };
    pivotTitleCell.font = { color: { argb: 'FFFFFFFF' }, bold: true, size: 12 };
    pivotTitleCell.alignment = { horizontal: 'center', vertical: 'middle' };

    // Header row
    const headerRow = sheetPivot.getRow(2);
    pivotCols.forEach((h, i) => {
        const cell = headerRow.getCell(i + 1);
        cell.value = h;
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC370' } };
        cell.font = { bold: true };
        cell.alignment = { horizontal: 'center' };
        sheetPivot.getColumn(i + 1).width = 18;
    });

    const uniqueWeeks = Array.from(new Set(scheduleItems.map(item => item.weekString))).sort((a: any, b: any) => {
        const weekA = parseInt(a.replace('Week ', ''));
        const weekB = parseInt(b.replace('Week ', ''));
        return weekA - weekB;
    });

    uniqueWeeks.forEach((weekStr, idx) => {
        const rIdx = idx + 3; // data starts at row 3
        const row = sheetPivot.getRow(rIdx);
        row.getCell(1).value = weekStr;

        // compute week date bounds from scheduleItems
        const weekItems = scheduleItems.filter(it => it.weekString === weekStr).map(it => it.date);
        const dates = weekItems.map(d => new Date(d));
        const minD = new Date(Math.min(...dates.map(d => d.getTime())));
        const maxD = new Date(Math.max(...dates.map(d => d.getTime())));

        // Write static target value locally calculated
        let weekTarget = 0;
        if (projectData.targetData) {
            weekItems.forEach(dateStr => {
                if (projectData.targetData![dateStr]) {
                    const dayTargets = projectData.targetData![dateStr];
                    Object.values(dayTargets).forEach(val => {
                        weekTarget += (val || 0);
                    });
                }
            });
        }

        const makeDateExpr = (d: Date) => `DATE(${d.getFullYear()},${d.getMonth() + 1},${d.getDate()})`;

        if (weekTarget > 0) {
            row.getCell(2).value = weekTarget;
        } else if (targetRange && dateRange) {
            row.getCell(2).value = { formula: sanitizeFormula(`SUMIFS(${targetRange},${dateRange},">="&${makeDateExpr(minD)},${dateRange},"<="&${makeDateExpr(maxD)})`) };
        }

        if (actualRange && dateRange) {
            const actFormula = `SUMIFS(${actualRange},${dateRange},">="&${makeDateExpr(minD)},${dateRange},"<="&${makeDateExpr(maxD)})`;
            row.getCell(3).value = { formula: sanitizeFormula(actFormula) };
        }
        // variance = target - actual
        const colT = getColumnLetter(2);
        const colA = getColumnLetter(3);
        const f = `IFERROR(${colT}${rIdx}-${colA}${rIdx},0)`;
        row.getCell(4).value = { formula: sanitizeFormula(f) };
    });

    // Add a table style area for the weekly pivot
    sheetPivot.addTable({
        name: 'WeeklyPivot',
        ref: `A2`,
        headerRow: true,
        style: { theme: 'TableStyleMedium9', showRowStripes: true },
        columns: pivotCols.map(c => ({ name: c, filterButton: true })),
        rows: [],
    });

    // Conditional formatting for weekly pivot numeric columns: integers show without decimals
    if (uniqueWeeks.length > 0) {
        const pivotDataStart = 3;
        const pivotDataEnd = 2 + uniqueWeeks.length;
        sheetPivot.addConditionalFormatting({
            ref: `B${pivotDataStart}:${pivotLastColLetter}${pivotDataEnd}`,
            rules: [
                { priority: 1, type: 'expression', formulae: [`MOD(B${pivotDataStart},1)=0`], style: { numFmt: '#,##0' } },
                { priority: 2, type: 'expression', formulae: [`MOD(B${pivotDataStart},1)<>0`], style: { numFmt: '#,##0.00' } },
            ],
        });
    }

    // Block 2: Output per operator (summary across whole period)
    const opStartRow = uniqueWeeks.length + 5;
    if (projectData.resources && projectData.resources.length > 0) {
        const opTitleCell = sheetPivot.getCell(`A${opStartRow}`);
        sheetPivot.mergeCells(`A${opStartRow}:D${opStartRow}`);
        opTitleCell.value = 'Output per Operator';
        opTitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF133020' } };
        opTitleCell.font = { color: { argb: 'FFFFFFFF' }, bold: true };

        const opHeader = sheetPivot.getRow(opStartRow + 1);
        ['Operator', 'Total Target', 'Total Actual', 'Completion Rate'].forEach((h, i) => {
            const c = opHeader.getCell(i + 1);
            c.value = h;
            c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC370' } };
            c.font = { bold: true };
        });

        projectData.resources.forEach((res, idx) => {
            const r = sheetPivot.getRow(opStartRow + 2 + idx);
            r.getCell(1).value = res;

            let opTarget = 0;
            if (projectData.targetData) {
                Object.values(projectData.targetData).forEach(dayTargets => {
                    const matchedName = Object.keys(dayTargets).find(name => name.toLowerCase() === res.toLowerCase());
                    if (matchedName) {
                        opTarget += (dayTargets[matchedName] || 0);
                    }
                });
            }

            if (opTarget > 0) {
                r.getCell(2).value = opTarget;
            } else if (targetRange && dateRange && nameRange) {
                const tForm = `SUMIFS(${targetRange},${nameRange},"=${res}")`;
                r.getCell(2).value = { formula: sanitizeFormula(tForm) };
            }

            if (actualRange && nameRange) {
                const aForm = `SUMIFS(${actualRange},${nameRange},"=${res}")`;
                r.getCell(3).value = { formula: sanitizeFormula(aForm) };
            }
            const colTletter = getColumnLetter(2);
            const colAletter = getColumnLetter(3);
            const rowNum = opStartRow + 2 + idx;
            r.getCell(4).value = { formula: sanitizeFormula(`IFERROR(${colAletter}${rowNum}/${colTletter}${rowNum},0)`) };
            r.getCell(4).numFmt = '0.00%';
        });
        // Apply conditional formatting to operator totals (columns B and C)
        const opsStart = opStartRow + 2;
        const opsEnd = opStartRow + 1 + projectData.resources.length;
        sheetPivot.addConditionalFormatting({
            ref: `B${opsStart}:C${opsEnd}`,
            rules: [
                { priority: 1, type: 'expression', formulae: [`MOD(B${opsStart},1)=0`], style: { numFmt: '#,##0' } },
                { priority: 2, type: 'expression', formulae: [`MOD(B${opsStart},1)<>0`], style: { numFmt: '#,##0.00' } },
            ],
        });
    }

    // Block 3: Compare vs Target (summary)
    const compareRow = (projectData.resources?.length || 0) + uniqueWeeks.length + 8;
    const compareTitle = sheetPivot.getCell(`A${compareRow}`);
    sheetPivot.mergeCells(`A${compareRow}:D${compareRow}`);
    compareTitle.value = 'Compare vs Target';
    compareTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF133020' } };
    compareTitle.font = { color: { argb: 'FFFFFFFF' }, bold: true };

    const compHeader = sheetPivot.getRow(compareRow + 1);
    ['Metric', 'Value', '', ''].forEach((h, i) => {
        const c = compHeader.getCell(i + 1);
        c.value = h;
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC370' } };
        c.font = { bold: true };
    });

    const totalTargetCell = sheetPivot.getCell(compareRow + 2, 1);
    totalTargetCell.value = 'Total Target';
    if (targetRange) sheetPivot.getCell(compareRow + 2, 2).value = { formula: sanitizeFormula(`SUM(${targetRange})`) };
    const totalActualCell = sheetPivot.getCell(compareRow + 3, 1);
    totalActualCell.value = 'Total Actual';
    if (actualRange) sheetPivot.getCell(compareRow + 3, 2).value = { formula: sanitizeFormula(`SUM(${actualRange})`) };
    const pivotCompletionCell = sheetPivot.getCell(compareRow + 4, 1);
    pivotCompletionCell.value = 'Completion Rate';
    const tCol = getColumnLetter(2);
    const compRowNum = compareRow + 4;
    sheetPivot.getCell(compareRow + 4, 2).value = { formula: sanitizeFormula(`IFERROR(${tCol}${compareRow + 3}/${tCol}${compareRow + 2},0)`) };
    // Format completion rate as percent
    sheetPivot.getCell(compareRow + 4, 2).numFmt = '0.00%';

    // Conditional formatting for compare totals (Total Target / Total Actual)
    sheetPivot.addConditionalFormatting({
        ref: `B${compareRow + 2}:B${compareRow + 3}`,
        rules: [
            { priority: 1, type: 'expression', formulae: [`MOD(B${compareRow + 2},1)=0`], style: { numFmt: '#,##0' } },
            { priority: 2, type: 'expression', formulae: [`MOD(B${compareRow + 2},1)<>0`], style: { numFmt: '#,##0.00' } },
        ],
    });

    // --- Sheet 4: Dashboard Metrics ---
    // --- Sheet 4: Summary ---
    const summarySheet = workbook.addWorksheet(sanitizeSheetName('Summary'));
    const summaryHeaders = [
        'No.',
        'Task',
        'Plan (Time)',
        'Plan (Task)',
        'Actual (Time)',
        'Actual (Task)',
        'Balance',
        'Completion Rate',
        'Remarks',
    ];

    // Title row
    const summaryTitle = `${projectData.name}: Summary as of ${new Date().toLocaleDateString('en-CA')}`;
    summarySheet.mergeCells(`A1:I1`);
    const st = summarySheet.getCell('A1');
    st.value = summaryTitle;
    st.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF133020' } };
    st.font = { color: { argb: 'FFFFFFFF' }, bold: true };
    st.alignment = { horizontal: 'center' };

    // Header row
    const header = summarySheet.getRow(2);
    summaryHeaders.forEach((h, i) => {
        const c = header.getCell(i + 1);
        c.value = h;
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC370' } };
        c.font = { bold: true };
        summarySheet.getColumn(i + 1).width = h.length + 10;
    });
    const planTaskColLetter = getColumnLetter(4);
    const actualTaskColLetter = getColumnLetter(6);
    const summaryRow = summarySheet.addRow([
        1,
        projectData.name,
        null,
        null,
        null,
        null,
        null,
        null,
        '',
    ]);
    const summaryRowIndex = summaryRow.number;
    if (computedPlanTimeFormula) {
        summaryRow.getCell(3).value = { formula: sanitizeFormula(computedPlanTimeFormula) };
    } else if (derivedTimeMinutes !== undefined) {
        // show derived minutes as a number
        summaryRow.getCell(3).value = derivedTimeMinutes;
    } else {
        summaryRow.getCell(3).value = 0;
    }
    if (planTaskFormula) {
        // Use static goal as preferred value for Plan (Task) in Summary
        summaryRow.getCell(4).value = projectData.goal || 0;
    } else if (derivedTaskCount !== undefined) {
        summaryRow.getCell(4).value = derivedTaskCount;
    } else {
        summaryRow.getCell(4).value = 0;
    }
    if (computedActualTimeFormula) {
        summaryRow.getCell(5).value = { formula: sanitizeFormula(computedActualTimeFormula) };
    } else {
        summaryRow.getCell(5).value = 0;
    }
    if (actualTaskFormula) {
        summaryRow.getCell(6).value = { formula: sanitizeFormula(actualTaskFormula) };
    } else {
        summaryRow.getCell(6).value = 0;
    }
    summaryRow.getCell(7).value = {
        formula: `IFERROR(${planTaskColLetter}${summaryRowIndex}-${actualTaskColLetter}${summaryRowIndex},0)`,
    };
    const completionCell = summaryRow.getCell(8);
    completionCell.value = {
        formula: `IFERROR(${actualTaskColLetter}${summaryRowIndex}/${planTaskColLetter}${summaryRowIndex},0)`,
    };
    completionCell.numFmt = '0.00%';
    const dueDate = projectData.endDate ? new Date(projectData.endDate) : null;
    const dueFormula = dueDate
        ? `DATE(${dueDate.getFullYear()},${dueDate.getMonth() + 1},${dueDate.getDate()})`
        : "TODAY()";
    summaryRow.getCell(9).value = {
        formula: `LET(planTask,${planTaskColLetter}${summaryRowIndex},actualTask,${actualTaskColLetter}${summaryRowIndex},dueDate,${dueFormula},today,TODAY(),IF(actualTask>=planTask,IF(today<dueDate,\"Completed ahead of time\",IF(today=dueDate,\"Completed on time\",\"Completed\")),IF(today<=dueDate,\"In progress\",\"Delayed\")))`,
    };
    summaryRow.eachCell((cell) => {
        cell.border = { top: { style: "thin" }, bottom: { style: "thin" } };
    });

    // Conditional formatting for Summary numeric cells (Plan/Task/Actual) so integers show
    // without decimals and decimals show two places.
    const summaryStartCol = 3; // C
    const summaryEndCol = 6; // F
    summarySheet.addConditionalFormatting({
        ref: `${getColumnLetter(summaryStartCol)}${summaryRowIndex}:${getColumnLetter(summaryEndCol)}${summaryRowIndex}`,
        rules: [
            { priority: 1, type: 'expression', formulae: [`MOD(${getColumnLetter(summaryStartCol)}${summaryRowIndex},1)=0`], style: { numFmt: '#,##0' } },
            { priority: 2, type: 'expression', formulae: [`MOD(${getColumnLetter(summaryStartCol)}${summaryRowIndex},1)<>0`], style: { numFmt: '0.00' } },
        ],
    });

    return await workbook.xlsx.writeBuffer();
};
