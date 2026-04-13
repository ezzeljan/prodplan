import ExcelJS from 'exceljs';
import type { DataTable, TableColumnDef } from '../types/table';
import { sanitizeSheetName } from './excelGenerator';

const PRIMARY_HEADER_BG = 'FF4472C4';
const PRIMARY_HEADER_TEXT = 'FFFFFFFF';
const SUBHEADER_BG = 'FFFFFFFF';
const SUBHEADER_TEXT = 'FF133020';
const TITLE_BG = 'FF133020';
const NEGATIVE_FONT = 'FFC00000';
const COMPLETION_GREEN = 'FF006400';
const GROUP_CELL_BG = 'FFD6DCE4';

function formatCellValueForExcel(
  value: unknown,
  col: TableColumnDef
): string | number | Date | null {
  if (value === null || value === undefined) return null;
  if (value === '–' || value === '-') return value as string;
  if (col.type === 'percent' && typeof value === 'number') {
    return value; // Excel will format as percent
  }
  if (col.type === 'date' && typeof value === 'string') {
    const d = new Date(value);
    if (!isNaN(d.getTime())) return d;
    return value;
  }
  return value as string | number | Date;
}

function applyCellStyle(
  cell: ExcelJS.Cell,
  value: unknown,
  col: TableColumnDef
) {
  const alignment =
    col.align ||
    (col.type === 'number' || col.type === 'integer' || col.type === 'percent'
      ? 'right'
      : 'left');
  cell.alignment = {
    horizontal: alignment as ExcelJS.Alignment['horizontal'],
    vertical: 'middle',
    wrapText: true,
  };
  cell.border = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' },
  };
  if (col.type === 'percent' && typeof value === 'number') {
    cell.numFmt = '0.00%';
  } else if (
    (col.type === 'number' || col.type === 'integer') &&
    typeof value === 'number'
  ) {
    cell.numFmt = Number.isInteger(value) ? '#,##0' : '0.00';
  }
  const isBold =
    col.bold &&
    (col.type === 'number' ||
      col.type === 'integer' ||
      col.type === 'percent');
  const font: Partial<ExcelJS.Font> = {
    ...((cell.font as ExcelJS.Font) || {}),
    bold: isBold,
    name: (cell.font as any)?.name || 'Calibri'
  };
  if (typeof value === 'number' && col.type === 'percent') {
    if (col.completionGreen && value >= 1) {
      font.color = { argb: COMPLETION_GREEN };
    } else if (
      (col.negativeRed || col.highlightRed) &&
      (value < 0 || value === 0)
    ) {
      font.color = { argb: NEGATIVE_FONT };
    }
  } else if (
    typeof value === 'number' &&
    value < 0 &&
    (col.negativeRed || col.highlightRed)
  ) {
    font.color = { argb: NEGATIVE_FONT };
  }
  cell.font = font as ExcelJS.Font;
}

/** Build header structure for Excel: row1 has groups (colSpan) or single (rowSpan 2), row2 has sub-headers */
function getExcelHeaderStructure(columns: TableColumnDef[]) {
  const hasSub = columns.some((c) => c.subHeader);
  if (!hasSub) {
    return { row1: columns.map((col) => ({ key: col.key, label: col.header, rowSpan: 2, colSpan: 1 })), row2: [] as { key: string; label: string }[] };
  }
  const row1: { key: string; label: string; rowSpan?: number; colSpan?: number }[] = [];
  const row2: { key: string; label: string }[] = [];
  let i = 0;
  while (i < columns.length) {
    const col = columns[i];
    if (col.subHeader) {
      const groupHeader = col.header;
      const group: TableColumnDef[] = [];
      while (i < columns.length && columns[i].header === groupHeader && columns[i].subHeader) {
        group.push(columns[i]);
        i++;
      }
      row1.push({ key: group[0].key, label: groupHeader, colSpan: group.length });
      group.forEach((c) => row2.push({ key: c.key, label: c.subHeader! }));
    } else {
      row1.push({ key: col.key, label: col.header, rowSpan: 2, colSpan: 1 });
      i++;
    }
  }
  return { row1, row2 };
}

function getGroupRuns(rows: Record<string, unknown>[], groupByKey: string): number[] {
  const runs: number[] = [];
  let i = 0;
  while (i < rows.length) {
    const val = (rows[i] as Record<string, unknown>)[groupByKey];
    let count = 1;
    while (i + count < rows.length) {
      const nextVal = (rows[i + count] as Record<string, unknown>)[groupByKey];
      if (String(nextVal) !== String(val)) break;
      count++;
    }
    runs.push(count);
    i += count;
  }
  return runs;
}

/**
 * Writes canonical DataTable[] to an Excel workbook.
 * Same structure and values as UI tables.
 */
export async function writeTablesToWorkbook(
  tables: DataTable[]
): Promise<ExcelJS.Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Production Plan Agent';
  workbook.created = new Date();

  for (const table of tables) {
    const sheetName = sanitizeSheetName(table.sheetName);
    const sheet = workbook.addWorksheet(sheetName, {
      pageSetup: { fitToPage: true },
    });

    let currentRow = 1;

    if (table.title) {
      const colCount = table.columns.length;
      sheet.mergeCells(1, 1, 1, colCount);
      const titleCell = sheet.getCell(1, 1);
      titleCell.value = table.title;
      titleCell.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
      titleCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: TITLE_BG },
      };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      titleCell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
      sheet.getRow(1).height = 28;
      currentRow = 2;
    }

    const { row1, row2 } = getExcelHeaderStructure(table.columns);
    const hasSubHeaders = row2.length > 0;

    let colIndex = 1;
    row1.forEach((cell) => {
      const excelCell = sheet.getCell(currentRow, colIndex);
      excelCell.value = cell.label;
      excelCell.font = { bold: true, color: { argb: PRIMARY_HEADER_TEXT } };
      excelCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: PRIMARY_HEADER_BG },
      };
      excelCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      excelCell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
      if (cell.rowSpan === 2) {
        sheet.mergeCells(currentRow, colIndex, currentRow + 1, colIndex);
      } else if ((cell.colSpan ?? 1) > 1) {
        sheet.mergeCells(currentRow, colIndex, currentRow, colIndex + (cell.colSpan ?? 1) - 1);
      }
      colIndex += cell.colSpan ?? 1;
    });
    sheet.getRow(currentRow).height = 24;
    currentRow++;

    if (hasSubHeaders) {
      table.columns.forEach((col, cIdx) => {
        if (!col.subHeader) return;
        const excelCell = sheet.getCell(currentRow, cIdx + 1);
        excelCell.value = col.subHeader;
        excelCell.font = { bold: true, color: { argb: SUBHEADER_TEXT } };
        excelCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: SUBHEADER_BG },
        };
        excelCell.alignment = { horizontal: 'center', vertical: 'middle' };
        excelCell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
      currentRow++;
    }

    const groupByKey = table.groupByKey;
    const groupByColIndex = groupByKey ? table.columns.findIndex((c) => c.key === groupByKey) : -1;
    const groupRuns = groupByKey ? getGroupRuns(table.rows, groupByKey) : null;

    if (groupRuns && groupByColIndex >= 0) {
      let rowIndex = 0;
      const colCount = table.columns.length;
      groupRuns.forEach((runLength) => {
        const firstRow = table.rows[rowIndex] as Record<string, unknown>;
        for (let c = 0; c < colCount; c++) {
          const col = table.columns[c];
          const raw = firstRow[col.key];
          const value = formatCellValueForExcel(raw, col);
          const cell = sheet.getCell(currentRow, c + 1);
          cell.value = value;
          if (c === groupByColIndex) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GROUP_CELL_BG } };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            if (runLength > 1) {
              sheet.mergeCells(currentRow, c + 1, currentRow + runLength - 1, c + 1);
            }
          } else {
            applyCellStyle(cell, raw, col);
          }
          if (c !== groupByColIndex) {
            cell.alignment = {
              horizontal: (col.align as ExcelJS.Alignment['horizontal']) || (col.type === 'number' || col.type === 'integer' || col.type === 'percent' ? 'right' : 'left'),
              vertical: 'middle',
            };
          }
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' },
          };
        }
        currentRow++;
        for (let r = 1; r < runLength; r++) {
          rowIndex++;
          const row = table.rows[rowIndex] as Record<string, unknown>;
          for (let c = 0; c < colCount; c++) {
            if (c === groupByColIndex) continue;
            const col = table.columns[c];
            const raw = row[col.key];
            const value = formatCellValueForExcel(raw, col);
            const cell = sheet.getCell(currentRow, c + 1);
            cell.value = value;
            applyCellStyle(cell, raw, col);
            cell.alignment = {
              horizontal: (col.align as ExcelJS.Alignment['horizontal']) || (col.type === 'number' || col.type === 'integer' || col.type === 'percent' ? 'right' : 'left'),
              vertical: 'middle',
            };
            cell.border = {
              top: { style: 'thin' },
              left: { style: 'thin' },
              bottom: { style: 'thin' },
              right: { style: 'thin' },
            };
          }
          currentRow++;
        }
        rowIndex++;
      });
    } else {
      table.rows.forEach((row) => {
        const dataRow = sheet.getRow(currentRow);
        table.columns.forEach((col, cIdx) => {
          const raw = (row as Record<string, unknown>)[col.key];
          const value = formatCellValueForExcel(raw, col);
          const cell = dataRow.getCell(cIdx + 1);
          cell.value = value;
          applyCellStyle(cell, raw, col);
        });
        currentRow++;
      });
    }

    table.columns.forEach((col, cIdx) => {
      const colLetter = sheet.getColumn(cIdx + 1);
      colLetter.width = Math.min(Math.max(col.width || 12, 8), 50);
    });
  }

  return (await workbook.xlsx.writeBuffer()) as ExcelJS.Buffer;
}
