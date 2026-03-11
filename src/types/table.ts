/**
 * Canonical table model used by both UI and Excel export.
 * Ensures identical structure, values, and organization.
 */

export type CellAlign = 'left' | 'center' | 'right';
export type CellType = 'text' | 'number' | 'integer' | 'percent' | 'date';

export interface TableColumnDef {
  key: string;
  header: string;
  /** Optional sub-header (e.g. "Package" under "Target No. of Asset") */
  subHeader?: string;
  align?: CellAlign;
  type?: CellType;
  /** Key columns (Total Actual, Balance, Completion Rate) shown bold */
  bold?: boolean;
  /** Show value in red when negative (e.g. Balance) */
  negativeRed?: boolean;
  /** Show in red for attention (e.g. completion 0% or &lt; 0) */
  highlightRed?: boolean;
  /** Show in green when value >= 100% (e.g. Completion Rate achievement) */
  completionGreen?: boolean;
  width?: number;
}

export interface DataTable {
  id: string;
  sheetName: string;
  /** Title row above table (e.g. "Sage/Meru Update as of November 6, 2025") */
  title?: string;
  columns: TableColumnDef[];
  /** Row data: array of objects keyed by column key */
  rows: Record<string, unknown>[];
  /** Optional: merge consecutive cells in first column when value repeats (e.g. Language) */
  groupByKey?: string;
}

export type ProductionPlanTables = DataTable[];

/** Validation result for tables before export */
export interface TableValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
}
