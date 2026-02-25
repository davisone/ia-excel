/// <reference types="office-js" />
import { ExcelData, SheetData, SelectionData } from "@/types";

export const readExcelData = async (): Promise<ExcelData | null> => {
  if (typeof Office === "undefined" || !Office.context) return null;

  return new Promise((resolve) => {
    Excel.run(async (context) => {
      const workbook = context.workbook;
      const activeSheet = workbook.worksheets.getActiveWorksheet();
      const sheets = workbook.worksheets;

      sheets.load("items/name");
      activeSheet.load("name");

      const usedRange = activeSheet.getUsedRange();
      usedRange.load("values, address");

      let selectionData: SelectionData | null = null;
      const selectedRange = context.workbook.getSelectedRange();
      selectedRange.load("address, rowIndex, columnIndex");

      await context.sync();

      const sheetNames = sheets.items.map((s) => s.name);
      const values = usedRange.values as string[][];
      const headers = values.length > 0 ? values[0].map(String) : [];
      const rows = values.slice(1).map((row) => row.map(String));

      if (selectedRange.address) {
        selectionData = {
          range: selectedRange.address,
          startRow: selectedRange.rowIndex,
          startCol: selectedRange.columnIndex,
        };
      }

      const sheetData: SheetData = {
        name: activeSheet.name,
        headers,
        rows,
      };

      resolve({
        activeSheet: sheetData,
        selection: selectionData,
        workbookSheets: sheetNames,
      });
    }).catch(() => {
      resolve(null);
    });
  });
};
