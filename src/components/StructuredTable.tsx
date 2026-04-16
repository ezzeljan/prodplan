import React, { useMemo } from 'react';
import type { DataTable, TableColumnDef } from '../types/table';

// Match reference: primary header = light blue, white bold; sub-header = white, black bold
const PRIMARY_HEADER_BG = '#4472C4';
const PRIMARY_HEADER_TEXT = '#FFFFFF';
const SUBHEADER_BG = '#FFFFFF';
const SUBHEADER_TEXT = '#133020';
const GROUP_CELL_BG = '#D6DCE4';
const BORDER_COLOR = '#000000';
const BALANCE_NEGATIVE = '#C00000';
const COMPLETION_GREEN = '#006400';
const COMPLETION_RED = '#C00000';

function formatCellValue(
  value: unknown,
  col: TableColumnDef
): string | number | React.ReactNode {
  if (value === null || value === undefined) return '–';
  if (col.type === 'percent' && typeof value === 'number') {
    return `${(value * 100).toFixed(2)}%`;
  }
  if (col.type === 'number' || col.type === 'integer') {
    if (typeof value === 'number') {
      return col.type === 'integer' ? Math.round(value) : value.toFixed(2);
    }
  }
  if (col.type === 'date' && value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  return String(value);
}

function getCellAlign(col: TableColumnDef): 'left' | 'center' | 'right' {
  return (
    col.align ||
    (col.type === 'number' || col.type === 'integer' || col.type === 'percent'
      ? 'right'
      : 'left')
  );
}

type CellHighlight = 'normal' | 'negative' | 'completionGreen' | 'completionRed';

function getCellHighlight(value: unknown, col: TableColumnDef): CellHighlight {
  if (typeof value !== 'number') return 'normal';
  if (col.negativeRed && value < 0) return 'negative';
  if (col.completionGreen && col.type === 'percent') {
    if (value >= 1) return 'completionGreen';
    if (value <= 0) return 'completionRed';
  }
  if (col.highlightRed && col.type === 'percent' && (value === 0 || value > 1))
    return 'completionRed';
  return 'normal';
}

/** Build header structure: primary row (with colSpan/rowSpan) and optional sub row */
function getHeaderStructure(columns: TableColumnDef[]) {
  const hasSub = columns.some((c) => c.subHeader);
  if (!hasSub) {
    return {
      row1: columns.map((col) => ({ key: col.key, label: col.header, rowSpan: 2 as const, colSpan: 1 })),
      row2: [] as { key: string; label: string }[],
    };
  }
  const row1: { key: string; label: string; rowSpan?: 2; colSpan?: number }[] = [];
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

/** Consecutive runs of same value for groupByKey column */
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

interface StructuredTableProps {
  table: DataTable;
  isDark?: boolean;
  className?: string;
}

export default function StructuredTable({
  table,
  isDark = false,
  className = '',
}: StructuredTableProps) {
  const { row1, row2 } = useMemo(
    () => getHeaderStructure(table.columns),
    [table.columns]
  );
  const hasSubHeaders = row2.length > 0;
  const groupByKey = table.groupByKey;
  const groupRuns = useMemo(
    () => (groupByKey ? getGroupRuns(table.rows, groupByKey!) : null),
    [table.rows, groupByKey]
  );

  const borderColor = isDark ? 'rgb(63 63 70)' : BORDER_COLOR;
  const primaryHeaderBg = isDark ? 'rgb(59 130 246)' : PRIMARY_HEADER_BG;
  const primaryHeaderText = PRIMARY_HEADER_TEXT;
  const subHeaderBg = isDark ? 'rgb(39 39 42)' : SUBHEADER_BG;
  const subHeaderText = isDark ? 'rgb(228 228 231)' : SUBHEADER_TEXT;
  const cellBg = isDark ? 'rgb(39 39 42)' : '#ffffff';
  const textColor = isDark ? 'rgb(228 228 231)' : '#133020';
  const groupCellBg = isDark ? 'rgb(55 65 81)' : GROUP_CELL_BG;

  const groupByColIndex = groupByKey
    ? table.columns.findIndex((c) => c.key === groupByKey!)
    : -1;

  return (
    <div
      className={`overflow-x-auto rounded-lg border ${className}`}
      style={{ borderColor }}
    >
      {table.title && (
        <div
          className="px-4 py-3 text-center font-bold text-white text-base"
          style={{ backgroundColor: isDark ? '#133020' : '#046241' }}
        >
          {table.title}
        </div>
      )}
      <table
        className="w-full border-collapse text-sm"
        style={{ minWidth: '100%', border: `1px solid ${borderColor}` }}
      >
        <thead>
          <tr>
            {row1.map((cell) => (
              <th
                key={cell.key}
                rowSpan={cell.rowSpan}
                colSpan={cell.colSpan ?? 1}
                className="border font-bold"
                style={{
                  borderColor,
                  backgroundColor: primaryHeaderBg,
                  color: primaryHeaderText,
                  textAlign: 'center',
                  padding: '10px 12px',
                  verticalAlign: 'middle',
                }}
              >
                {cell.label}
              </th>
            ))}
          </tr>
          {hasSubHeaders && (
            <tr>
              {row2.map((cell) => (
                <th
                  key={cell.key}
                  className="border font-bold"
                  style={{
                    borderColor,
                    backgroundColor: subHeaderBg,
                    color: subHeaderText,
                    textAlign: 'center',
                    padding: '8px 12px',
                    verticalAlign: 'middle',
                  }}
                >
                  {cell.label}
                </th>
              ))}
            </tr>
          )}
        </thead>
        <tbody>
          {groupRuns && groupByColIndex >= 0 ? (
            (() => {
              const cells: React.ReactNode[] = [];
              let rowIndex = 0;
              groupRuns.forEach((runLength, runIdx) => {
                const firstRow = table.rows[rowIndex] as Record<string, unknown>;
                const groupValue = firstRow[groupByKey!];
                cells.push(
                  <tr key={runIdx}>
                    {table.columns.map((col, cIdx) => {
                      if (cIdx === groupByColIndex) {
                        return (
                          <td
                            key={col.key}
                            rowSpan={runLength}
                            className="border font-medium"
                            style={{
                              borderColor,
                              backgroundColor: groupCellBg,
                              color: textColor,
                              textAlign: 'center',
                              padding: '8px 12px',
                              verticalAlign: 'middle',
                            }}
                          >
                            {formatCellValue(groupValue, col)}
                          </td>
                        );
                      }
                      const raw = firstRow[col.key];
                      const display = formatCellValue(raw, col);
                      const highlight = getCellHighlight(raw, col);
                      const align = getCellAlign(col);
                      const isBold =
                        col.bold &&
                        (col.type === 'number' ||
                          col.type === 'integer' ||
                          col.type === 'percent' ||
                          highlight !== 'normal');
                      let color = textColor;
                      if (highlight === 'negative' || highlight === 'completionRed')
                        color = BALANCE_NEGATIVE;
                      if (highlight === 'completionGreen') color = COMPLETION_GREEN;
                      return (
                        <td
                          key={col.key}
                          className="border"
                          style={{
                            borderColor,
                            backgroundColor: cellBg,
                            color,
                            textAlign: align,
                            padding: '8px 12px',
                            fontWeight: isBold ? 700 : undefined,
                          }}
                        >
                          {display}
                        </td>
                      );
                    })}
                  </tr>
                );
                for (let r = 1; r < runLength; r++) {
                  rowIndex++;
                  const row = table.rows[rowIndex] as Record<string, unknown>;
                  cells.push(
                    <tr key={`${runIdx}-${r}`}>
                      {table.columns.map((col, cIdx) => {
                        if (cIdx === groupByColIndex) return null;
                        const raw = row[col.key];
                        const display = formatCellValue(raw, col);
                        const highlight = getCellHighlight(raw, col);
                        const align = getCellAlign(col);
                        const isBold =
                          col.bold &&
                          (col.type === 'number' ||
                            col.type === 'integer' ||
                            col.type === 'percent' ||
                            highlight !== 'normal');
                        let color = textColor;
                        if (
                          highlight === 'negative' ||
                          highlight === 'completionRed'
                        )
                          color = BALANCE_NEGATIVE;
                        if (highlight === 'completionGreen') color = COMPLETION_GREEN;
                        return (
                          <td
                            key={col.key}
                            className="border"
                            style={{
                              borderColor,
                              backgroundColor: cellBg,
                              color,
                              textAlign: align,
                              padding: '8px 12px',
                              fontWeight: isBold ? 700 : undefined,
                            }}
                          >
                            {display}
                          </td>
                        );
                      })}
                    </tr>
                  );
                }
                rowIndex++;
              });
              return cells;
            })()
          ) : (
            table.rows.map((row, rowIdx) => (
              <tr key={rowIdx}>
                {table.columns.map((col) => {
                  const raw = (row as Record<string, unknown>)[col.key];
                  const display = formatCellValue(raw, col);
                  const highlight = getCellHighlight(raw, col);
                  const align = getCellAlign(col);
                  const isBold =
                    col.bold &&
                    (col.type === 'number' ||
                      col.type === 'integer' ||
                      col.type === 'percent' ||
                      highlight !== 'normal');
                  let color = textColor;
                  if (
                    highlight === 'negative' ||
                    highlight === 'completionRed'
                  )
                    color = BALANCE_NEGATIVE;
                  if (highlight === 'completionGreen') color = COMPLETION_GREEN;
                  return (
                    <td
                      key={col.key}
                      className="border"
                      style={{
                        borderColor,
                        backgroundColor: cellBg,
                        color,
                        textAlign: align,
                        padding: '8px 12px',
                        fontWeight: isBold ? 700 : undefined,
                      }}
                    >
                      {display}
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

interface ProductionPlanTablesViewProps {
  tables: DataTable[];
  isDark?: boolean;
  className?: string;
}

export function ProductionPlanTablesView({
  tables,
  isDark = false,
  className = '',
}: ProductionPlanTablesViewProps) {
  return (
    <div className={`space-y-6 ${className}`}>
      {tables.map((table) => (
        <div key={table.id}>
          <StructuredTable table={table} isDark={isDark} />
        </div>
      ))}
    </div>
  );
}
