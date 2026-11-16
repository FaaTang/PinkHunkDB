import { useCallback } from 'react';
import type React from 'react';
import { message } from 'antd';
import type { Item } from './DataGridCore';

type DataGridBatchActionsContext = Record<string, any> & {
  CELL_SELECTION_DRAG_THRESHOLD_PX: number;
  GONAVI_ROW_KEY: string;
  addedRows: any[];
  modifiedRows: Record<string, any>;
  selectedCells: Set<string>;
  copiedCellPatch: { sourceRowKey: string; values: Record<string, any> } | null;
  displayDataRef: React.MutableRefObject<any[]>;
  currentSelectionRef: React.MutableRefObject<Set<string>>;
  rowIndexMapRef: React.MutableRefObject<Map<string, number>>;
  selectedRowKeysRef: React.MutableRefObject<React.Key[]>;
  selectionStartRef: React.MutableRefObject<{
    rowKey: string;
    colName: string;
    rowIndex: number;
    colIndex: number;
  } | null>;
  cellEditModeRef: React.MutableRefObject<boolean>;
  cellSelectionAutoScrollRafRef: React.MutableRefObject<number | null>;
  cellSelectionPointerRef: React.MutableRefObject<{ x: number; y: number } | null>;
  cellSelectionRafRef: React.MutableRefObject<number | null>;
  cellSelectionScrollRafRef: React.MutableRefObject<number | null>;
  pendingCellSelectionStartRef: React.MutableRefObject<{
    rowKey: string;
    colName: string;
    x: number;
    y: number;
  } | null>;
  suppressCellSelectionClickRef: React.MutableRefObject<boolean>;
  isDraggingRef: React.MutableRefObject<boolean>;
  columnIndexMap: Map<string, number>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  setAddedRows: React.Dispatch<React.SetStateAction<any[]>>;
  setCellContextMenu: React.Dispatch<React.SetStateAction<any>>;
  setCellEditMode: React.Dispatch<React.SetStateAction<boolean>>;
  setCopiedCellPatch: React.Dispatch<
    React.SetStateAction<{ sourceRowKey: string; values: Record<string, any> } | null>
  >;
  setModifiedRows: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  setSelectedCells: React.Dispatch<React.SetStateAction<Set<string>>>;
  rowKeyStr: (key: React.Key) => string;
  makeCellKey: (rowKey: string, colName: string) => string;
  splitCellKey: (cellKey: string) => { rowKey: string; colName: string } | null;
  updateCellSelection: (cells: Set<string>) => void;
  isCellValueEqualForDiff: (left: any, right: any) => boolean;
  isWritableResultColumn: (columnName: string, editLocator: any) => boolean;
  translateDataGrid: (key: string, params?: any) => string;
};

export const useDataGridBatchActions = (ctx: DataGridBatchActionsContext) => {
  const {
    GONAVI_ROW_KEY,
    addedRows,
    batchEditSetNull,
    batchEditValue,
    cancelAnimationFrame,
    cellSelectionAutoScrollRafRef,
    cellSelectionPointerRef,
    closeBatchEditModal,
    copiedCellPatch,
    currentSelectionRef,
    displayDataRef,
    effectiveEditLocator,
    isCellValueEqualForDiff,
    isDraggingRef,
    isWritableResultColumn,
    modifiedRows,
    rowKeyStr,
    selectedCells,
    selectedRowKeysRef,
    selectionStartRef,
    setAddedRows,
    setCellContextMenu,
    setCopiedCellPatch,
    setModifiedRows,
    setSelectedCells,
    splitCellKey,
    translateDataGrid,
    updateCellSelection,
  } = ctx;

const handleBatchFillCells = useCallback(() => {
    const cellsToFill = currentSelectionRef.current;
    if (cellsToFill.size === 0) {
      void message.info(translateDataGrid('data_grid.message.select_cells_to_fill'));
      return;
    }

    const fillValue = batchEditSetNull ? null : batchEditValue;

    const addedRowMap = new Map<string, any>();
    addedRows.forEach((r) => {
      const k = r?.[GONAVI_ROW_KEY];
      if (k === undefined) return;
      addedRowMap.set(rowKeyStr(k), r);
    });

    const baseRowMap = new Map<string, any>();
    displayDataRef.current.forEach((r) => {
      const k = r?.[GONAVI_ROW_KEY];
      if (k === undefined) return;
      baseRowMap.set(rowKeyStr(k), r);
    });

    const patchesByRow = new Map<string, Record<string, any>>();
    let updatedCount = 0;

    cellsToFill.forEach((cellKey) => {
      const parts = splitCellKey(cellKey);
      if (!parts) return;
      const { rowKey, colName } = parts;

      const existing = modifiedRows[rowKey];
      const baseRow = baseRowMap.get(rowKey);
      let currentVal: any;

      const addedRow = addedRowMap.get(rowKey);
      if (addedRow) {
        currentVal = addedRow?.[colName];
      } else if (existing && Object.prototype.hasOwnProperty.call(existing as any, GONAVI_ROW_KEY)) {
        currentVal = (existing as any)?.[colName];
      } else if (existing && Object.prototype.hasOwnProperty.call(existing as any, colName)) {
        currentVal = (existing as any)?.[colName];
      } else {
        currentVal = baseRow?.[colName];
      }

      const isSame = isCellValueEqualForDiff(currentVal, fillValue);
      if (isSame) return;

      const patch = patchesByRow.get(rowKey) || {};
      patch[colName] = fillValue;
      patchesByRow.set(rowKey, patch);
      updatedCount++;
    });

    if (updatedCount === 0) {
      void message.info(translateDataGrid('data_grid.message.selected_cells_no_update'));
      return;
    }

    // 仅做一次状态提交，避免大量 setState 循环
    setAddedRows(prev => prev.map(r => {
      const k = r?.[GONAVI_ROW_KEY];
      if (k === undefined) return r;
      const patch = patchesByRow.get(rowKeyStr(k));
      if (!patch) return r;
      return { ...r, ...patch };
    }));

    setModifiedRows(prev => {
      let next: Record<string, any> | null = null;

      patchesByRow.forEach((patch, keyStr) => {
        if (addedRowMap.has(keyStr)) return;

        const existing = prev[keyStr];
        const merged = existing ? { ...(existing as any), ...patch } : patch;
        if (!next) next = { ...prev };
        next[keyStr] = merged;
      });

      return next || prev;
    });

    void message.success(translateDataGrid('data_grid.message.filled_cells', { count: updatedCount }));
    closeBatchEditModal();

    // 清除选中状态
    setSelectedCells(new Set());
    currentSelectionRef.current = new Set();
    selectionStartRef.current = null;
    isDraggingRef.current = false;
    cellSelectionPointerRef.current = null;
    if (cellSelectionAutoScrollRafRef.current !== null) {
      cancelAnimationFrame(cellSelectionAutoScrollRafRef.current);
      cellSelectionAutoScrollRafRef.current = null;
    }
    updateCellSelection(new Set());
  }, [batchEditValue, batchEditSetNull, addedRows, modifiedRows, rowKeyStr, updateCellSelection, closeBatchEditModal, translateDataGrid]);

  const handleCopySelectedColumnsFromRow = useCallback(() => {
    const activeSelection = currentSelectionRef.current.size > 0 ? currentSelectionRef.current : selectedCells;
    if (activeSelection.size === 0) {
      void message.info(translateDataGrid('data_grid.message.select_same_row_cells_to_copy'));
      return;
    }

    const parsed = Array.from(activeSelection)
      .map((cellKey) => splitCellKey(cellKey))
      .filter((item): item is { rowKey: string; colName: string } => !!item);
    if (parsed.length === 0) {
      void message.info(translateDataGrid('data_grid.message.no_copyable_cells'));
      return;
    }

    const sourceRowKeySet = new Set(parsed.map((item) => item.rowKey));
    if (sourceRowKeySet.size !== 1) {
      void message.info(translateDataGrid('data_grid.message.copy_columns_same_row_only'));
      return;
    }

    const sourceRowKey = parsed[0].rowKey;
    const selectedColumnNames = Array.from(new Set(parsed.map((item) => item.colName)));
    if (selectedColumnNames.length === 0) {
      void message.info(translateDataGrid('data_grid.message.no_copyable_columns'));
      return;
    }

    const sourceBaseRow = displayDataRef.current.find((row) => {
      const key = row?.[GONAVI_ROW_KEY];
      return key !== undefined && key !== null && rowKeyStr(key) === sourceRowKey;
    });
    const sourceAddedRow = addedRows.find((row) => {
      const key = row?.[GONAVI_ROW_KEY];
      return key !== undefined && key !== null && rowKeyStr(key) === sourceRowKey;
    });
    const sourceModified = modifiedRows[sourceRowKey];

    const values: Record<string, any> = {};
    selectedColumnNames.forEach((colName) => {
      if (sourceAddedRow) {
        values[colName] = sourceAddedRow[colName];
        return;
      }

      if (sourceModified && Object.prototype.hasOwnProperty.call(sourceModified as any, colName)) {
        values[colName] = (sourceModified as any)[colName];
        return;
      }

      values[colName] = sourceBaseRow?.[colName];
    });

    setCopiedCellPatch({ sourceRowKey, values });
    void message.success(translateDataGrid('data_grid.message.copied_columns', { count: selectedColumnNames.length }));
  }, [selectedCells, rowKeyStr, addedRows, modifiedRows, translateDataGrid]);

  const handlePasteCopiedColumnsToSelectedRows = useCallback((fallbackRowKey?: React.Key) => {
    if (!copiedCellPatch || Object.keys(copiedCellPatch.values).length === 0) {
      void message.info(translateDataGrid('data_grid.message.copy_columns_first'));
      return;
    }

    const writablePatchValues = Object.fromEntries(
      Object.entries(copiedCellPatch.values)
        .filter(([colName]) => isWritableResultColumn(colName, effectiveEditLocator))
    );
    if (Object.keys(writablePatchValues).length === 0) {
      void message.info(translateDataGrid('data_grid.message.no_pasteable_editable_fields'));
      return;
    }

    const targetKeySet = new Set<string>();
    const selectedKeys = selectedRowKeysRef.current;
    if (selectedKeys.length > 0) {
      selectedKeys.forEach((key) => targetKeySet.add(rowKeyStr(key)));
    } else if (fallbackRowKey !== undefined && fallbackRowKey !== null) {
      targetKeySet.add(rowKeyStr(fallbackRowKey));
    } else {
      void message.info(translateDataGrid('data_grid.message.select_target_rows'));
      return;
    }

    targetKeySet.delete(copiedCellPatch.sourceRowKey);
    if (targetKeySet.size === 0) {
      void message.info(translateDataGrid('data_grid.message.target_rows_cannot_only_source'));
      return;
    }

    const addedRowMap = new Map<string, any>();
    addedRows.forEach((row) => {
      const key = row?.[GONAVI_ROW_KEY];
      if (key === undefined || key === null) return;
      addedRowMap.set(rowKeyStr(key), row);
    });

    const baseRowMap = new Map<string, any>();
    displayDataRef.current.forEach((row) => {
      const key = row?.[GONAVI_ROW_KEY];
      if (key === undefined || key === null) return;
      baseRowMap.set(rowKeyStr(key), row);
    });

    const patchesByRow = new Map<string, Record<string, any>>();
    let updatedCellCount = 0;

    targetKeySet.forEach((targetRowKey) => {
      const patch: Record<string, any> = {};
      const existing = modifiedRows[targetRowKey];
      const addedRow = addedRowMap.get(targetRowKey);
      const baseRow = baseRowMap.get(targetRowKey);

      Object.entries(writablePatchValues).forEach(([colName, nextValue]) => {
        let currentValue: any;

        if (addedRow) {
          currentValue = addedRow[colName];
        } else if (existing && Object.prototype.hasOwnProperty.call(existing as any, GONAVI_ROW_KEY)) {
          currentValue = (existing as any)[colName];
        } else if (existing && Object.prototype.hasOwnProperty.call(existing as any, colName)) {
          currentValue = (existing as any)[colName];
        } else {
          currentValue = baseRow?.[colName];
        }

        if (isCellValueEqualForDiff(currentValue, nextValue)) return;
        patch[colName] = nextValue;
        updatedCellCount++;
      });

      if (Object.keys(patch).length > 0) {
        patchesByRow.set(targetRowKey, patch);
      }
    });

    if (patchesByRow.size === 0 || updatedCellCount === 0) {
      void message.info(translateDataGrid('data_grid.message.target_rows_no_update'));
      return;
    }

    setAddedRows(prev => prev.map((row) => {
      const key = row?.[GONAVI_ROW_KEY];
      if (key === undefined || key === null) return row;
      const patch = patchesByRow.get(rowKeyStr(key));
      if (!patch) return row;
      return { ...row, ...patch };
    }));

    setModifiedRows(prev => {
      let next: Record<string, any> | null = null;

      patchesByRow.forEach((patch, keyStr) => {
        if (addedRowMap.has(keyStr)) return;
        const existing = prev[keyStr];
        const merged = existing ? { ...(existing as any), ...patch } : patch;
        if (!next) next = { ...prev };
        next[keyStr] = merged;
      });

      return next || prev;
    });

    void message.success(translateDataGrid('data_grid.message.pasted_columns_to_rows', { rows: patchesByRow.size, cells: updatedCellCount }));
    setCellContextMenu((prev: any) => ({ ...prev, visible: false }));
  }, [copiedCellPatch, addedRows, modifiedRows, rowKeyStr, effectiveEditLocator, translateDataGrid]);

  // 批量填充到选中行
  const handleBatchFillToSelected = useCallback((sourceRecord: Item, dataIndex: string) => {
    if (!isWritableResultColumn(dataIndex, effectiveEditLocator)) {
      void message.info(translateDataGrid('data_grid.message.current_field_not_editable'));
      return;
    }
    const sourceValue = sourceRecord[dataIndex];
    const selKeys = selectedRowKeysRef.current;

    if (selKeys.length === 0) {
      void message.info(translateDataGrid('data_grid.message.select_rows_to_fill'));
      return;
    }

    const sourceKey = sourceRecord?.[GONAVI_ROW_KEY];
    // 过滤掉源行本身
    const targetKeys = selKeys.filter(k => k !== sourceKey);

    if (targetKeys.length === 0) {
      void message.info(translateDataGrid('data_grid.message.no_other_rows_to_fill'));
      return;
    }

    // 批量更新
    const addedKeySet = new Set<string>();
    addedRows.forEach((r) => {
      const k = r?.[GONAVI_ROW_KEY];
      if (k === undefined) return;
      addedKeySet.add(rowKeyStr(k));
    });

    const targetKeyStrList = targetKeys.map(rowKeyStr);
    const targetKeyStrSet = new Set(targetKeyStrList);
    const updatedCount = targetKeyStrSet.size;

    setAddedRows(prev => prev.map(r => {
      const k = r?.[GONAVI_ROW_KEY];
      if (k === undefined) return r;
      const keyStr = rowKeyStr(k);
      if (!targetKeyStrSet.has(keyStr)) return r;
      return { ...r, [dataIndex]: sourceValue };
    }));

    setModifiedRows(prev => {
      let next: Record<string, any> | null = null;

      targetKeyStrSet.forEach((keyStr) => {
        if (addedKeySet.has(keyStr)) return;
        const existing = prev[keyStr];
        const patch = { [dataIndex]: sourceValue };
        const merged = existing ? { ...(existing as any), ...patch } : patch;
        if (!next) next = { ...prev };
        next[keyStr] = merged;
      });

      return next || prev;
    });

    void message.success(translateDataGrid('data_grid.message.filled_rows', { count: updatedCount }));
    setCellContextMenu((prev: any) => ({ ...prev, visible: false }));
  }, [addedRows, rowKeyStr, effectiveEditLocator, translateDataGrid]);

  return {
    handleBatchFillCells,
    handleCopySelectedColumnsFromRow,
    handlePasteCopiedColumnsToSelectedRows,
    handleBatchFillToSelected,
  };
};
