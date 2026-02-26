/// <reference types="office-js" />
import { ExcelData, SheetData, SelectionData, ExcelAction, ExcelActionsBlock } from "@/types";

// Garantit que Office.js est prêt avant toute opération
let officeReady: Promise<void> | null = null;

const ensureOfficeReady = (): Promise<void> => {
  if (typeof Office === "undefined") return Promise.reject(new Error("Office non disponible"));
  if (!officeReady) {
    officeReady = new Promise((resolve) => {
      Office.onReady(() => resolve());
    });
  }
  return officeReady;
};

// Nettoie une adresse de range (retire le nom de feuille si présent)
const cleanRange = (range: string): string => {
  // "Feuil1!A1:B5" → "A1:B5"
  const idx = range.indexOf("!");
  return idx !== -1 ? range.slice(idx + 1) : range;
};

export const readExcelData = async (): Promise<ExcelData | null> => {
  try {
    await ensureOfficeReady();
  } catch {
    return null;
  }

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
    }).catch((err) => {
      console.error("[Excel] Erreur lecture:", err);
      resolve(null);
    });
  });
};

// Exécute un ensemble d'actions Excel (écriture, formules, mise en forme)
export const writeExcelActions = async (block: ExcelActionsBlock): Promise<boolean> => {
  try {
    await ensureOfficeReady();
  } catch {
    return false;
  }

  return new Promise((resolve) => {
    Excel.run(async (context) => {
      const sheet = context.workbook.worksheets.getActiveWorksheet();

      for (const action of block.actions) {
        const rangeAddr = cleanRange(action.range);

        switch (action.type) {
          case "write": {
            // Calcule le range exact à partir de la cellule de départ + dimensions des values
            const startCell = rangeAddr.includes(":") ? rangeAddr.split(":")[0] : rangeAddr;
            const rows = action.values.length;
            const cols = action.values[0]?.length ?? 1;
            const targetRange = sheet.getRange(startCell).getResizedRange(rows - 1, cols - 1);
            targetRange.values = action.values;
            break;
          }

          case "formula":
            await applyFormula(context, sheet, rangeAddr, action.formula);
            break;

          case "format": {
            const range = sheet.getRange(rangeAddr);
            await applyFormat(context, range, action);
            break;
          }
        }
      }

      await context.sync();
      resolve(true);
    }).catch((err) => {
      console.error("[Excel] Erreur écriture:", err);
      resolve(false);
    });
  });
};

// Applique une formule sur une cellule ou une plage
const applyFormula = async (
  context: Excel.RequestContext,
  sheet: Excel.Worksheet,
  rangeAddress: string,
  formula: string,
) => {
  if (!rangeAddress.includes(":")) {
    // Cellule unique
    const cell = sheet.getRange(rangeAddress);
    cell.formulas = [[formula]];
    return;
  }

  // Plage multi-cellules : déterminer les dimensions puis remplir
  const range = sheet.getRange(rangeAddress);
  range.load("rowCount, columnCount");
  await context.sync();

  const rows = range.rowCount;
  const cols = range.columnCount;

  // Construire un tableau 2D de formules avec les bonnes dimensions
  const formulas: string[][] = [];
  for (let r = 0; r < rows; r++) {
    const row: string[] = [];
    for (let c = 0; c < cols; c++) {
      row.push(formula);
    }
    formulas.push(row);
  }
  range.formulas = formulas;
};

// Applique la mise en forme sur une plage
const applyFormat = async (
  context: Excel.RequestContext,
  range: Excel.Range,
  action: ExcelAction & { type: "format" },
) => {
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
    // Charger les dimensions pour construire un tableau 2D correct
    range.load("rowCount, columnCount");
    await context.sync();
    const nf: string[][] = [];
    for (let r = 0; r < range.rowCount; r++) {
      const row: string[] = [];
      for (let c = 0; c < range.columnCount; c++) {
        row.push(fmt.numberFormat);
      }
      nf.push(row);
    }
    range.numberFormat = nf;
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
