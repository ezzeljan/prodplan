import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
    SpreadsheetData,
    SpreadsheetCell,
    CellStyle,
    MergeRange,
    COLOR_PRESETS,
    FONT_SIZES,
    createDemoSpreadsheet,
} from '../types/spreadsheet';
import {
    Paintbrush,
    Type,
    Merge,
    Bold,
    Italic,
    AlignLeft,
    AlignCenter,
    AlignRight,
    Plus,
    Minus,
    Undo2,
    ChevronDown,
    X,
    Download,
    Baseline, // Added for font color
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

// ─── Selection types ───
interface CellSelection {
    startRow: number;
    startCol: number;
    endRow: number;
    endCol: number;
}

// ─── Toolbar Button ───
function ToolBtn({
    active,
    onClick,
    title,
    children,
}: {
    active?: boolean;
    onClick: () => void;
    title: string;
    children: React.ReactNode;
}) {
    return (
        <button
            onClick={onClick}
            title={title}
            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all text-sm ${active
                ? 'bg-[var(--accent-primary)] text-white shadow-md'
                : 'text-[var(--text-secondary)] hover:bg-white/10 hover:text-[var(--text-primary)]'
                }`}
        >
            {children}
        </button>
    );
}

// ─── Color Picker Popover ───
function ColorPicker({
    currentColor,
    onSelect,
    onClose,
    title = 'Cell Color',
}: {
    currentColor?: string;
    onSelect: (color: string) => void;
    onClose: () => void;
    title?: string;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            className="absolute top-full left-0 mt-2 glass-card p-3 z-50 shadow-2xl"
            style={{ width: 220 }}
        >
            <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-[var(--text-secondary)]">{title}</span>
                <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                    <X className="w-3.5 h-3.5" />
                </button>
            </div>
            <div className="grid grid-cols-8 gap-1">
                {COLOR_PRESETS.map((color) => (
                    <button
                        key={color}
                        onClick={() => { onSelect(color); onClose(); }}
                        className={`w-6 h-6 rounded-md border transition-transform hover:scale-110 ${color === currentColor ? 'ring-2 ring-[var(--accent-secondary)] ring-offset-1 ring-offset-[var(--surface-primary)]' : 'border-white/10'}`}
                        style={{ backgroundColor: color }}
                        title={color}
                    />
                ))}
            </div>
            <button
                onClick={() => { onSelect(''); onClose(); }}
                className="mt-2 w-full text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] py-1 rounded hover:bg-white/5 transition-colors"
            >
                Clear Color
            </button>
        </motion.div>
    );
}

// ─── Font Size Picker ───
function FontSizePicker({
    currentSize,
    onSelect,
    onClose,
}: {
    currentSize: number;
    onSelect: (size: number) => void;
    onClose: () => void;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute top-full left-0 mt-2 glass-card py-1 z-50 w-20 max-h-48 overflow-y-auto custom-scrollbar"
        >
            {FONT_SIZES.map((size) => (
                <button
                    key={size}
                    onClick={() => { onSelect(size); onClose(); }}
                    className={`w-full text-left px-3 py-1.5 text-sm transition-colors ${size === currentSize
                        ? 'bg-[var(--accent-primary)]/20 text-[var(--text-primary)] font-semibold'
                        : 'text-[var(--text-secondary)] hover:bg-white/5'
                        }`}
                >
                    {size}px
                </button>
            ))}
        </motion.div>
    );
}

// ─── Merge helper: find which merge a cell belongs to ───
function findMerge(merges: MergeRange[], row: number, col: number): MergeRange | null {
    return merges.find(m =>
        row >= m.startRow && row <= m.endRow &&
        col >= m.startCol && col <= m.endCol
    ) || null;
}

function isMergeOrigin(merge: MergeRange, row: number, col: number): boolean {
    return merge.startRow === row && merge.startCol === col;
}

function isMergeHidden(merges: MergeRange[], row: number, col: number): boolean {
    const m = findMerge(merges, row, col);
    return m ? !isMergeOrigin(m, row, col) : false;
}

// ─── Export to Excel ───
async function exportToExcel(data: SpreadsheetData, fileName?: string) {
    const workbook = new ExcelJS.Workbook();
    const sheetName = data.title || 'Sheet1';
    const worksheet = workbook.addWorksheet(sheetName.substring(0, 31)); // Excel max 31 chars

    // Set column widths
    worksheet.columns = data.columns.map((col) => ({
        width: Math.round((col.width || 120) / 7), // approx px to Excel width units
    }));

    // Add header row
    const headerRow = worksheet.addRow(data.columns.map(c => c.header));
    headerRow.eachCell((cell) => {
        cell.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF374151' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
            top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
            left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
            bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
            right: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        };
    });

    // Add data rows
    data.rows.forEach((row) => {
        const values = row.map(cell => cell.value);
        const excelRow = worksheet.addRow(values);

        excelRow.eachCell({ includeEmpty: true }, (excelCell, colNumber) => {
            const cellData = row[colNumber - 1];
            const style = cellData?.style || {};

            // Font
            excelCell.font = {
                size: style.fontSize ? Math.round(style.fontSize * 0.75) : 10,
                bold: style.bold || false,
                italic: style.italic || false,
            };

            // Alignment
            excelCell.alignment = {
                horizontal: (style.textAlign as ExcelJS.Alignment['horizontal']) || 'left',
                vertical: 'middle',
            };

            // Background color
            if (style.bgColor) {
                const argb = 'FF' + style.bgColor.replace('#', '');
                excelCell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb },
                };
            }

            // Border
            excelCell.border = {
                top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
                left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
                bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
                right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
            };
        });
    });

    // Apply merges (offset by 1 for header row, and ExcelJS is 1-indexed)
    data.merges.forEach((m) => {
        worksheet.mergeCells(
            m.startRow + 2, m.startCol + 1,
            m.endRow + 2, m.endCol + 1
        );
    });

    // Generate and download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const name = fileName || data.title || 'spreadsheet';
    saveAs(blob, `${name.replace(/[^a-zA-Z0-9-_ ]/g, '')}.xlsx`);
}

// ─── Main Component ───
export default function EditableSpreadsheet({
    initialData,
    title,
    readOnly = false,
    onDataChange,
}: {
    initialData?: SpreadsheetData;
    title?: string;
    readOnly?: boolean;
    onDataChange?: (newData: SpreadsheetData) => void;
}) {
    const [data, setData] = useState<SpreadsheetData>(() => initialData || createDemoSpreadsheet());
    const [editingCell, setEditingCell] = useState<{ row: number; col: number } | null>(null);
    const [editValue, setEditValue] = useState<string>('');
    const [selection, setSelection] = useState<CellSelection | null>(null);
    const [isSelecting, setIsSelecting] = useState(false);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [showTextColorPicker, setShowTextColorPicker] = useState(false); // New state
    const [showFontSize, setShowFontSize] = useState(false);
    const [history, setHistory] = useState<SpreadsheetData[]>([]);
    const [editingHeader, setEditingHeader] = useState<number | null>(null);
    const [headerEditValue, setHeaderEditValue] = useState<string>('');

    const tableRef = useRef<HTMLDivElement>(null);
    const editInputRef = useRef<HTMLInputElement>(null);
    const headerInputRef = useRef<HTMLInputElement>(null);

    // Save history before changes
    const pushHistory = useCallback(() => {
        setHistory(prev => [...prev.slice(-20), JSON.parse(JSON.stringify(data))]);
    }, [data]);

    const undo = useCallback(() => {
        if (history.length === 0) return;
        const prev = history[history.length - 1];
        setHistory(h => h.slice(0, -1));
        setData(prev);
    }, [history]);

    // ─── Sync data when initialData changes (e.g. user switch) ───
    useEffect(() => {
        if (initialData) setData(initialData);
    }, [initialData]);

    // ─── Notify parent of data changes (auto-save) ───
    useEffect(() => {
        if (onDataChange && data !== initialData) {
            onDataChange(data);
        }
    }, [data, onDataChange, initialData]);

    // ─── Cell editing ───
    const startEditing = (row: number, col: number) => {
        if (readOnly) return;
        const cell = data.rows[row]?.[col];
        if (!cell) return;
        setEditingCell({ row, col });
        setEditValue(String(cell.value));
    };

    const commitEdit = useCallback(() => {
        if (!editingCell) return;
        pushHistory();
        setData(prev => {
            const next = { ...prev, rows: prev.rows.map(r => [...r]) };
            const cell = { ...next.rows[editingCell.row][editingCell.col] };
            const numVal = Number(editValue);
            cell.value = editValue === '' ? '' : isNaN(numVal) ? editValue : numVal;
            next.rows[editingCell.row][editingCell.col] = cell;
            return next;
        });
        setEditingCell(null);
    }, [editingCell, editValue, pushHistory]);

    const cancelEdit = () => {
        setEditingCell(null);
    };

    useEffect(() => {
        if (editingCell && editInputRef.current) {
            editInputRef.current.focus();
            editInputRef.current.select();
        }
    }, [editingCell]);

    // ─── Header editing ───
    const startEditingHeader = (colIndex: number) => {
        if (readOnly) return;
        setEditingHeader(colIndex);
        setHeaderEditValue(data.columns[colIndex].header);
    };

    const commitHeaderEdit = useCallback(() => {
        if (editingHeader === null) return;
        pushHistory();
        setData(prev => {
            const cols = [...prev.columns];
            cols[editingHeader] = { ...cols[editingHeader], header: headerEditValue || cols[editingHeader].header };
            return { ...prev, columns: cols };
        });
        setEditingHeader(null);
    }, [editingHeader, headerEditValue, pushHistory]);

    const cancelHeaderEdit = () => {
        setEditingHeader(null);
    };

    useEffect(() => {
        if (editingHeader !== null && headerInputRef.current) {
            headerInputRef.current.focus();
            headerInputRef.current.select();
        }
    }, [editingHeader]);

    // ─── Selection ───
    const handleMouseDown = (row: number, col: number, e: React.MouseEvent) => {
        if (e.button !== 0) return;
        // If editing, commit first
        if (editingCell) commitEdit();
        setSelection({ startRow: row, startCol: col, endRow: row, endCol: col });
        setIsSelecting(true);
    };

    const handleMouseEnter = (row: number, col: number) => {
        if (!isSelecting || !selection) return;
        setSelection(prev => prev ? { ...prev, endRow: row, endCol: col } : null);
    };

    const handleMouseUp = () => {
        setIsSelecting(false);
    };

    useEffect(() => {
        const onUp = () => setIsSelecting(false);
        window.addEventListener('mouseup', onUp);
        return () => window.removeEventListener('mouseup', onUp);
    }, []);

    // Normalize selection to always have start <= end
    const normalizedSelection = selection ? {
        startRow: Math.min(selection.startRow, selection.endRow),
        startCol: Math.min(selection.startCol, selection.endCol),
        endRow: Math.max(selection.startRow, selection.endRow),
        endCol: Math.max(selection.startCol, selection.endCol),
    } : null;

    const isCellSelected = (row: number, col: number): boolean => {
        if (!normalizedSelection) return false;
        return row >= normalizedSelection.startRow && row <= normalizedSelection.endRow &&
            col >= normalizedSelection.startCol && col <= normalizedSelection.endCol;
    };

    // ─── Style Operations ───
    const applyStyleToSelection = useCallback((updater: (style: CellStyle) => CellStyle) => {
        if (!normalizedSelection) return;
        pushHistory();
        setData(prev => {
            const next = { ...prev, rows: prev.rows.map(r => r.map(c => ({ ...c }))) };
            for (let r = normalizedSelection.startRow; r <= normalizedSelection.endRow; r++) {
                for (let c = normalizedSelection.startCol; c <= normalizedSelection.endCol; c++) {
                    if (next.rows[r]?.[c]) {
                        next.rows[r][c].style = updater(next.rows[r][c].style || {});
                    }
                }
            }
            return next;
        });
    }, [normalizedSelection, pushHistory]);

    const toggleBold = () => applyStyleToSelection(s => ({ ...s, bold: !s.bold }));
    const toggleItalic = () => applyStyleToSelection(s => ({ ...s, italic: !s.italic }));
    const setAlign = (align: 'left' | 'center' | 'right') => applyStyleToSelection(s => ({ ...s, textAlign: align }));
    const setCellColor = (color: string) => applyStyleToSelection(s => ({ ...s, bgColor: color || undefined }));
    const setTextColor = (color: string) => applyStyleToSelection(s => ({ ...s, color: color || undefined })); // New operation
    const setCellFontSize = (size: number) => applyStyleToSelection(s => ({ ...s, fontSize: size }));

    // ─── Merge cells ───
    const mergeSelection = useCallback(() => {
        if (!normalizedSelection) return;
        const { startRow, startCol, endRow, endCol } = normalizedSelection;
        if (startRow === endRow && startCol === endCol) return; // single cell, no merge

        pushHistory();
        setData(prev => {
            // Remove any existing merges that overlap
            const newMerges = prev.merges.filter(m =>
                !(m.startRow <= endRow && m.endRow >= startRow &&
                  m.startCol <= endCol && m.endCol >= startCol)
            );
            newMerges.push({ startRow, startCol, endRow, endCol });
            return { ...prev, merges: newMerges };
        });
    }, [normalizedSelection, pushHistory]);

    const unmergeSelection = useCallback(() => {
        if (!normalizedSelection) return;
        pushHistory();
        setData(prev => {
            const newMerges = prev.merges.filter(m => {
                // Remove merge if its origin is within our selection
                return !(m.startRow >= normalizedSelection.startRow && m.startRow <= normalizedSelection.endRow &&
                    m.startCol >= normalizedSelection.startCol && m.startCol <= normalizedSelection.endCol);
            });
            return { ...prev, merges: newMerges };
        });
    }, [normalizedSelection, pushHistory]);

    // Check if selection has merges
    const selectionHasMerge = normalizedSelection
        ? data.merges.some(m =>
            m.startRow >= normalizedSelection.startRow && m.startRow <= normalizedSelection.endRow &&
            m.startCol >= normalizedSelection.startCol && m.startCol <= normalizedSelection.endCol)
        : false;

    // ─── Add/Remove rows and columns ───
    const addRow = () => {
        pushHistory();
        setData(prev => {
            const newRow: SpreadsheetCell[] = prev.columns.map(() => ({ value: '' }));
            return { ...prev, rows: [...prev.rows, newRow] };
        });
    };

    const addColumn = () => {
        pushHistory();
        setData(prev => {
            const colIndex = prev.columns.length;
            const newCol = {
                key: `col_${colIndex}`,
                header: String.fromCharCode(65 + (colIndex % 26)),
                width: 120,
            };
            const newRows = prev.rows.map(r => [...r, { value: '' } as SpreadsheetCell]);
            return { ...prev, columns: [...prev.columns, newCol], rows: newRows };
        });
    };

    const removeLastRow = () => {
        if (data.rows.length <= 1) return;
        pushHistory();
        setData(prev => ({
            ...prev,
            rows: prev.rows.slice(0, -1),
            merges: prev.merges.filter(m => m.endRow < prev.rows.length - 1),
        }));
    };

    const removeLastColumn = () => {
        if (data.columns.length <= 1) return;
        pushHistory();
        setData(prev => ({
            ...prev,
            columns: prev.columns.slice(0, -1),
            rows: prev.rows.map(r => r.slice(0, -1)),
            merges: prev.merges.filter(m => m.endCol < prev.columns.length - 1),
        }));
    };

    // ─── Column resize ───
    const [resizingCol, setResizingCol] = useState<number | null>(null);
    const resizeStartX = useRef(0);
    const resizeStartWidth = useRef(0);

    const startResize = (colIndex: number, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setResizingCol(colIndex);
        resizeStartX.current = e.clientX;
        resizeStartWidth.current = data.columns[colIndex].width || 120;
    };

    useEffect(() => {
        if (resizingCol === null) return;
        const onMove = (e: MouseEvent) => {
            const diff = e.clientX - resizeStartX.current;
            const newWidth = Math.max(50, resizeStartWidth.current + diff);
            setData(prev => {
                const cols = [...prev.columns];
                cols[resizingCol] = { ...cols[resizingCol], width: newWidth };
                return { ...prev, columns: cols };
            });
        };
        const onUp = () => setResizingCol(null);
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        return () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
    }, [resizingCol]);

    // ─── Get current selection style for toolbar ───
    const currentCellStyle: CellStyle = (() => {
        if (!normalizedSelection) return {};
        const cell = data.rows[normalizedSelection.startRow]?.[normalizedSelection.startCol];
        return cell?.style || {};
    })();

    return (
        <div className="h-full flex flex-col gradient-bg overflow-hidden">
            <div className="relative z-10 flex flex-col h-full">

                {/* ── Title ── */}
                {(title || data.title) && (
                    <div className="px-6 pt-6 pb-2">
                        <h1 className="text-xl font-bold text-[var(--text-primary)]">{title || data.title}</h1>
                    </div>
                )}

                {/* ── Toolbar (hidden in readOnly) ── */}
                {!readOnly && (
                <div className="px-6 py-3 relative z-30">
                    <div className="glass-card px-4 py-2 flex items-center gap-1 flex-wrap overflow-visible">

                        {/* Undo */}
                        <ToolBtn onClick={undo} title="Undo (Ctrl+Z)" active={false}>
                            <Undo2 className="w-4 h-4" />
                        </ToolBtn>

                        <div className="w-px h-6 bg-white/10 mx-1" />

                        {/* Bold / Italic */}
                        <ToolBtn onClick={toggleBold} title="Bold" active={currentCellStyle.bold}>
                            <Bold className="w-4 h-4" />
                        </ToolBtn>
                        <ToolBtn onClick={toggleItalic} title="Italic" active={currentCellStyle.italic}>
                            <Italic className="w-4 h-4" />
                        </ToolBtn>

                        <div className="w-px h-6 bg-white/10 mx-1" />

                        {/* Alignment */}
                        <ToolBtn onClick={() => setAlign('left')} title="Align Left" active={currentCellStyle.textAlign === 'left'}>
                            <AlignLeft className="w-4 h-4" />
                        </ToolBtn>
                        <ToolBtn onClick={() => setAlign('center')} title="Align Center" active={currentCellStyle.textAlign === 'center'}>
                            <AlignCenter className="w-4 h-4" />
                        </ToolBtn>
                        <ToolBtn onClick={() => setAlign('right')} title="Align Right" active={currentCellStyle.textAlign === 'right'}>
                            <AlignRight className="w-4 h-4" />
                        </ToolBtn>

                        <div className="w-px h-6 bg-white/10 mx-1" />

                        {/* Font Size */}
                        <div className="relative">
                            <button
                                onClick={() => { setShowFontSize(!showFontSize); setShowColorPicker(false); }}
                                className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-sm text-[var(--text-secondary)] hover:bg-white/10 transition-colors"
                                title="Font Size"
                            >
                                <Type className="w-4 h-4" />
                                <span className="text-xs min-w-[24px]">{currentCellStyle.fontSize || 13}</span>
                                <ChevronDown className="w-3 h-3" />
                            </button>
                            <AnimatePresence>
                                {showFontSize && (
                                    <FontSizePicker
                                        currentSize={currentCellStyle.fontSize || 13}
                                        onSelect={(size) => setCellFontSize(size)}
                                        onClose={() => setShowFontSize(false)}
                                    />
                                )}
                            </AnimatePresence>
                        </div>

                        <div className="w-px h-6 bg-white/10 mx-1" />

                        {/* Cell Color */}
                        <div className="relative">
                            <button
                                onClick={() => { setShowColorPicker(!showColorPicker); setShowFontSize(false); }}
                                className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-sm text-[var(--text-secondary)] hover:bg-white/10 transition-colors"
                                title="Cell Color"
                            >
                                <Paintbrush className="w-4 h-4" />
                                <div
                                    className="w-4 h-3 rounded-sm border border-white/20"
                                    style={{ backgroundColor: currentCellStyle.bgColor || 'transparent' }}
                                />
                            </button>
                            <AnimatePresence>
                                {showColorPicker && (
                                    <ColorPicker
                                        currentColor={currentCellStyle.bgColor}
                                        onSelect={setCellColor}
                                        onClose={() => setShowColorPicker(false)}
                                        title="Cell Background"
                                    />
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Font Color */}
                        <div className="relative">
                            <button
                                onClick={() => { setShowTextColorPicker(!showTextColorPicker); setShowFontSize(false); setShowColorPicker(false); }}
                                className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-sm text-[var(--text-secondary)] hover:bg-white/10 transition-colors"
                                title="Font Color"
                            >
                                <Baseline className="w-4 h-4" />
                                <div
                                    className="w-4 h-3 rounded-sm border border-white/20"
                                    style={{ backgroundColor: currentCellStyle.color || 'var(--text-primary)' }}
                                />
                            </button>
                            <AnimatePresence>
                                {showTextColorPicker && (
                                    <ColorPicker
                                        currentColor={currentCellStyle.color}
                                        onSelect={setTextColor}
                                        onClose={() => setShowTextColorPicker(false)}
                                        title="Font Color"
                                    />
                                )}
                            </AnimatePresence>
                        </div>

                        <div className="w-px h-6 bg-white/10 mx-1" />

                        {/* Merge */}
                        <ToolBtn
                            onClick={selectionHasMerge ? unmergeSelection : mergeSelection}
                            title={selectionHasMerge ? 'Unmerge Cells' : 'Merge Cells'}
                            active={selectionHasMerge}
                        >
                            <Merge className="w-4 h-4" />
                        </ToolBtn>

                        <div className="w-px h-6 bg-white/10 mx-1" />

                        {/* Add/Remove Rows & Columns */}
                        <div className="flex items-center gap-0.5">
                            <ToolBtn onClick={addRow} title="Add Row"><Plus className="w-3.5 h-3.5" /></ToolBtn>
                            <span className="text-[10px] text-[var(--text-muted)]">Row</span>
                            <ToolBtn onClick={removeLastRow} title="Remove Last Row"><Minus className="w-3.5 h-3.5" /></ToolBtn>
                        </div>

                        <div className="flex items-center gap-0.5 ml-1">
                            <ToolBtn onClick={addColumn} title="Add Column"><Plus className="w-3.5 h-3.5" /></ToolBtn>
                            <span className="text-[10px] text-[var(--text-muted)]">Col</span>
                            <ToolBtn onClick={removeLastColumn} title="Remove Last Column"><Minus className="w-3.5 h-3.5" /></ToolBtn>
                        </div>

                        <div className="w-px h-6 bg-white/10 mx-1" />

                        {/* Export */}
                        <button
                            onClick={() => exportToExcel(data, title || data.title)}
                            title="Export to Excel"
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-[var(--text-secondary)] hover:bg-white/10 hover:text-[var(--text-primary)] transition-colors"
                        >
                            <Download className="w-4 h-4" />
                            <span className="text-xs">Export</span>
                        </button>
                    </div>
                </div>
                )}

                {/* ── Export button for read-only mode ── */}
                {readOnly && (
                    <div className="px-6 py-3 flex justify-end">
                        <button
                            onClick={() => exportToExcel(data, title || data.title)}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl glass-card text-sm text-[var(--text-secondary)] hover:bg-white/10 hover:text-[var(--text-primary)] transition-all hover:shadow-lg"
                            title="Export to Excel"
                        >
                            <Download className="w-4 h-4" />
                            <span>Export to Excel</span>
                        </button>
                    </div>
                )}

                {/* ── Spreadsheet Grid ── */}
                <div
                    ref={tableRef}
                    className="flex-1 overflow-auto custom-scrollbar mx-6 mb-6 glass-card"
                    onMouseUp={handleMouseUp}
                >
                    <table
                        className="border-collapse select-none"
                        style={{ minWidth: '100%', fontFamily: "'Manrope', sans-serif" }}
                    >
                        {/* Column headers */}
                        <thead>
                            <tr>
                                {/* Row number header */}
                                <th
                                    className="sticky top-0 z-20 border-b border-r border-white/10 bg-[var(--surface-secondary)] text-[var(--text-muted)] text-xs font-medium px-2 py-2"
                                    style={{ width: 44, minWidth: 44 }}
                                >
                                    #
                                </th>
                                {data.columns.map((col, ci) => (
                                    <th
                                        key={col.key}
                                        className={`sticky top-0 z-20 border-b border-r border-white/10 bg-[var(--surface-secondary)] text-[var(--text-primary)] text-xs font-semibold px-3 py-2.5 relative select-none ${!readOnly ? 'cursor-pointer hover:bg-white/5' : ''}`}
                                        style={{ width: col.width || 120, minWidth: 50 }}
                                        onDoubleClick={() => startEditingHeader(ci)}
                                    >
                                        {editingHeader === ci ? (
                                            <input
                                                ref={headerInputRef}
                                                type="text"
                                                value={headerEditValue}
                                                onChange={(e) => setHeaderEditValue(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') commitHeaderEdit();
                                                    if (e.key === 'Escape') cancelHeaderEdit();
                                                    if (e.key === 'Tab') { e.preventDefault(); commitHeaderEdit(); }
                                                }}
                                                onBlur={commitHeaderEdit}
                                                className="w-full bg-transparent outline-none border-none text-inherit text-center font-semibold"
                                                style={{ fontFamily: "'Manrope', sans-serif" }}
                                            />
                                        ) : (
                                            col.header
                                        )}
                                        {/* Resize handle */}
                                        <div
                                            className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-[var(--accent-secondary)]/40 transition-colors"
                                            onMouseDown={(e) => startResize(ci, e)}
                                        />
                                    </th>
                                ))}
                            </tr>
                        </thead>

                        <tbody>
                            {data.rows.map((row, ri) => (
                                <tr key={ri}>
                                    {/* Row number */}
                                    <td
                                        className="border-b border-r border-white/10 bg-[var(--surface-secondary)] text-[var(--text-muted)] text-xs text-center px-2 py-1.5 select-none sticky left-0 z-10"
                                        style={{ width: 44, minWidth: 44 }}
                                    >
                                        {ri + 1}
                                    </td>

                                    {row.map((cell, ci) => {
                                        // Skip hidden merged cells
                                        if (isMergeHidden(data.merges, ri, ci)) return null;

                                        const merge = findMerge(data.merges, ri, ci);
                                        const rowSpan = merge ? merge.endRow - merge.startRow + 1 : 1;
                                        const colSpan = merge ? merge.endCol - merge.startCol + 1 : 1;
                                        const isEditing = editingCell?.row === ri && editingCell?.col === ci;
                                        const selected = isCellSelected(ri, ci);
                                        const style = cell.style || {};

                                        // Determine text color based on bg
                                        const bgColor = style.bgColor || '';
                                        const isLightBg = bgColor && !['', '#1F2937', '#374151', '#92400E', '#065F46', '#1E40AF', '#991B1B', '#5B21B6', '#B45309', '#047857', '#1D4ED8', '#B91C1C', '#6D28D9'].includes(bgColor);

                                        return (
                                            <td
                                                key={ci}
                                                rowSpan={rowSpan}
                                                colSpan={colSpan}
                                                className={`border-b border-r border-white/10 relative transition-colors ${readOnly ? 'cursor-default' : 'cursor-cell'} ${selected ? 'ring-2 ring-inset ring-[var(--accent-secondary)]' : ''}`}
                                                style={{
                                                    backgroundColor: bgColor || 'transparent',
                                                    fontSize: style.fontSize || 13,
                                                    fontWeight: style.bold ? 700 : 400,
                                                    fontStyle: style.italic ? 'italic' : 'normal',
                                                    textAlign: style.textAlign || 'left',
                                                    color: style.color || (isLightBg ? '#1F2937' : 'var(--text-primary)'), // Prefer custom color
                                                    padding: '6px 10px',
                                                    verticalAlign: 'middle',
                                                    minHeight: 32,
                                                }}
                                                onMouseDown={(e) => handleMouseDown(ri, ci, e)}
                                                onMouseEnter={() => handleMouseEnter(ri, ci)}
                                                onDoubleClick={() => startEditing(ri, ci)}
                                            >
                                                {isEditing ? (
                                                    <input
                                                        ref={editInputRef}
                                                        type="text"
                                                        value={editValue}
                                                        onChange={(e) => setEditValue(e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') commitEdit();
                                                            if (e.key === 'Escape') cancelEdit();
                                                            if (e.key === 'Tab') { e.preventDefault(); commitEdit(); }
                                                        }}
                                                        onBlur={commitEdit}
                                                        className="w-full h-full bg-transparent outline-none border-none text-inherit"
                                                        style={{
                                                            fontSize: 'inherit',
                                                            fontWeight: 'inherit',
                                                            fontStyle: 'inherit',
                                                            textAlign: 'inherit',
                                                            fontFamily: "'Manrope', sans-serif",
                                                        }}
                                                    />
                                                ) : (
                                                    <span className="block truncate">
                                                        {cell.value === '' || cell.value === undefined ? '\u00A0' : String(cell.value)}
                                                    </span>
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
