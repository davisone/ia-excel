/// <reference types="office-js" />
import { ExcelData, SheetData, SelectionData, ExcelAction, ExcelActionsBlock } from "@/types";

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

// Exécute un ensemble d'actions Excel (écriture, formules, mise en forme)
export const writeExcelActions = async (block: ExcelActionsBlock): Promise<boolean> => {
  if (typeof Office === "undefined" || !Office.context) return false;

  return new Promise((resolve) => {
    Excel.run(async (context) => {
      const sheet = context.workbook.worksheets.getActiveWorksheet();

      for (const action of block.actions) {
        const range = sheet.getRange(action.range);

        switch (action.type) {
          case "write":
            range.values = action.values;
            break;

          case "formula":
            applyFormula(range, action.range, action.formula);
            break;

          case "format":
            applyFormat(range, action);
            break;
        }
      }

      await context.sync();
      resolve(true);
    }).catch(() => {
      resolve(false);
    });
  });
};

// Applique une formule sur une cellule ou une plage
const applyFormula = (range: Excel.Range, rangeAddress: string, formula: string) => {
  // Si la plage contient ":", c'est un range multi-cellules → formules individuelles
  if (rangeAddress.includes(":")) {
    range.formulas = range.formulas; // force le chargement
    range.load("rowCount, columnCount");
    // Pour les plages, on utilise formulasR1C1 ou on set formulas sur chaque cellule
    // La méthode la plus simple : utiliser la même formule pour toute la plage
    range.formulas = [[formula]];
  } else {
    range.formulas = [[formula]];
  }
};

// Applique la mise en forme sur une plage
const applyFormat = (range: Excel.Range, action: ExcelAction & { type: "format" }) => {
  const fmt = action.format;

  if (fmt.bold !== undefined) {
    range.format.font.bold = fmt.bold;
  }
  if (fmt.italic !== undefined) {
    range.format.font.italic = fmt.italic;
  }
  if (fmt.fill) {
    range.format.fill.color = fmt.fill;
  }
  if (fmt.fontColor) {
    range.format.font.color = fmt.fontColor;
  }
  if (fmt.fontSize) {
    range.format.font.size = fmt.fontSize;
  }
  if (fmt.numberFormat) {
    range.numberFormat = [[fmt.numberFormat]];
  }
  if (fmt.horizontalAlignment) {
    const alignMap: Record<string, Excel.HorizontalAlignment> = {
      left: Excel.HorizontalAlignment.left,
      center: Excel.HorizontalAlignment.center,
      right: Excel.HorizontalAlignment.right,
    };
    range.format.horizontalAlignment = alignMap[fmt.horizontalAlignment];
  }
  if (fmt.borders) {
    const border = range.format.borders;
    const edges: Excel.BorderIndex[] = [
      Excel.BorderIndex.edgeTop,
      Excel.BorderIndex.edgeBottom,
      Excel.BorderIndex.edgeLeft,
      Excel.BorderIndex.edgeRight,
    ];
    for (const edge of edges) {
      const b = border.getItem(edge);
      b.style = "Thin" as Excel.BorderLineStyle;
      b.color = "#000000";
    }
  }
};
