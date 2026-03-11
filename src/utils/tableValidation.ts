import type { DataTable, TableValidation } from '../types/table';

/**
 * Validates table structure and data before export.
 * Ensures UI and Excel tables stay consistent.
 */
export function validateTables(tables: DataTable[]): TableValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!tables || tables.length === 0) {
    errors.push('No tables to export.');
    return { valid: false, errors, warnings };
  }

  tables.forEach((table, tableIndex) => {
    if (!table.sheetName?.trim()) {
      errors.push(`Table ${tableIndex + 1}: Missing sheet name.`);
    }
    if (!table.columns?.length) {
      errors.push(`Table "${table.sheetName}": No columns defined.`);
    }
    if (!Array.isArray(table.rows)) {
      errors.push(`Table "${table.sheetName}": Rows must be an array.`);
    }

    const columnKeys = new Set(table.columns.map((c) => c.key));
    table.columns.forEach((col) => {
      if (!col.key?.trim()) {
        errors.push(`Table "${table.sheetName}": Column missing key.`);
      }
      if (!col.header?.trim()) {
        warnings.push(`Table "${table.sheetName}": Column "${col.key}" has no header label.`);
      }
    });

    table.rows.forEach((row, rowIndex) => {
      if (typeof row !== 'object' || row === null) {
        errors.push(
          `Table "${table.sheetName}" row ${rowIndex + 1}: Invalid row (must be object).`
        );
        return;
      }
      const rowKeys = Object.keys(row as Record<string, unknown>);
      columnKeys.forEach((key) => {
        if (!rowKeys.includes(key) && (row as Record<string, unknown>)[key] === undefined) {
          warnings.push(
            `Table "${table.sheetName}" row ${rowIndex + 1}: Missing value for column "${key}".`
          );
        }
      });
    });
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
