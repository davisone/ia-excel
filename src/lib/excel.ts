/// <reference types="office-js" />
import { ExcelData, SheetData, SelectionData, ExcelAction, ExcelActionsBlock } from "@/types";

// Singleton d'initialisation Office
// Attend que le script office.js soit chargé (polling), puis que l'hôte soit prêt
let officeReady: Promise<void> | null = null;

export const ensureOfficeReady = (): Promise<void> => {
  if (!officeReady) {
    officeReady = new Promise<void>((resolve, reject) => {
      let attempts = 0;

      const waitForScript = () => {
        if (typeof Office !== "undefined") {
          // Script chargé — attendre que l'hôte Office soit prêt (pas de timeout ici)
          Office.onReady(() => {
            console.log("[Office] Prêt");
            resolve();
          });
          return;
        }

        attempts++;
        if (attempts > 50) {
          // ~10s sans script → pas dans un environnement Office
          officeReady = null;
          reject(new Error("Office.js non disponible"));
          return;
        }

        setTimeout(waitForScript, 200);
      };

      waitForScript();
    });
  }
  return officeReady;
};

// Nettoie une adresse de range (retire le nom de feuille si présent)
const cleanRange = (range: string | undefined): string | null => {
  if (!range) return null;
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
  console.log("[Excel] writeExcelActions appelé avec", block.actions.length, "actions");

  try {
    await ensureOfficeReady();
    console.log("[Excel] Office prêt");
  } catch (err) {
    console.error("[Excel] Office non prêt:", err);
    return false;
  }

  return new Promise((resolve) => {
    Excel.run(async (context) => {
      const sheet = context.workbook.worksheets.getActiveWorksheet();

      for (let i = 0; i < block.actions.length; i++) {
        const action = block.actions[i];
        const rangeAddr = cleanRange(action.range);

        if (!rangeAddr) {
          console.warn(`[Excel] Action ${i + 1} ignorée : range manquant`, action);
          continue;
        }

        console.log(`[Excel] Action ${i + 1}/${block.actions.length}: ${action.type} sur ${rangeAddr}`);

        switch (action.type) {
          case "write": {
            if (!action.values) {
              console.warn(`[Excel] Action write ignorée : values manquant`);
              continue;
            }
            await applyWrite(context, sheet, rangeAddr, action.values);
            break;
          }

          case "formula": {
            if (!action.formula) {
              console.warn(`[Excel] Action formula ignorée : formula manquant`);
              continue;
            }
            await applyFormula(context, sheet, rangeAddr, action.formula);
            break;
          }

          case "format": {
            const range = sheet.getRange(rangeAddr);
            await applyFormat(context, range, action);
            break;
          }
        }
      }

      try {
        await context.sync();
      } catch (syncErr) {
        console.warn("[Excel] Sync final partiel:", syncErr);
      }
      console.log("[Excel] Toutes les actions appliquées avec succès");
      resolve(true);
    }).catch((err) => {
      console.error("[Excel] Erreur écriture:", err);
      resolve(false);
    });
  });
};

// Écrit des valeurs cellule par cellule pour éviter les problèmes de dimensions
const applyWrite = async (
  context: Excel.RequestContext,
  sheet: Excel.Worksheet,
  rangeAddress: string,
  values: (string | number | boolean | null)[][],
) => {
  // Déterminer la cellule de départ
  const startCell = rangeAddress.includes(":") ? rangeAddress.split(":")[0] : rangeAddress;
  const startRange = sheet.getRange(startCell);
  startRange.load("rowIndex, columnIndex");
  await context.sync();

  const startRow = startRange.rowIndex;
  const startCol = startRange.columnIndex;

  // Écrire chaque cellule individuellement
  for (let r = 0; r < values.length; r++) {
    for (let c = 0; c < values[r].length; c++) {
      const cell = sheet.getCell(startRow + r, startCol + c);
      cell.values = [[values[r][c]]];
    }
  }
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
  if (!fmt || typeof fmt !== "object") return;

  console.log("[Excel] Format payload:", JSON.stringify(fmt));

  const applyProp = async (name: string, fn: () => void | Promise<void>) => {
    try {
      await fn();
    } catch (err) {
      console.error(`[Excel] Format "${name}" échoué:`, err);
    }
  };

  if (typeof fmt.bold === "boolean") {
    await applyProp("bold", () => { range.format.font.bold = fmt.bold as boolean; });
  }
  if (typeof fmt.italic === "boolean") {
    await applyProp("italic", () => { range.format.font.italic = fmt.italic as boolean; });
  }
  if (typeof fmt.fill === "string" && fmt.fill) {
    await applyProp("fill", () => { range.format.fill.color = fmt.fill as string; });
  }
  if (typeof fmt.fontColor === "string" && fmt.fontColor) {
    await applyProp("fontColor", () => { range.format.font.color = fmt.fontColor as string; });
  }
  if (typeof fmt.fontSize === "number" && fmt.fontSize > 0) {
    await applyProp("fontSize", () => { range.format.font.size = fmt.fontSize as number; });
  }
  if (typeof fmt.numberFormat === "string" && fmt.numberFormat) {
    const nfValue = fmt.numberFormat;
    await applyProp("numberFormat", async () => {
      range.load("rowCount, columnCount");
      await context.sync();
      const nf: string[][] = [];
      for (let r = 0; r < range.rowCount; r++) {
        const row: string[] = [];
        for (let c = 0; c < range.columnCount; c++) {
          row.push(nfValue);
        }
        nf.push(row);
      }
      range.numberFormat = nf;
    });
  }
  if (typeof fmt.horizontalAlignment === "string" && fmt.horizontalAlignment) {
    const alignValue = fmt.horizontalAlignment.toLowerCase();
    await applyProp("horizontalAlignment", () => {
      const alignMap: Record<string, Excel.HorizontalAlignment> = {
        left: Excel.HorizontalAlignment.left,
        center: Excel.HorizontalAlignment.center,
        right: Excel.HorizontalAlignment.right,
      };
      const mapped = alignMap[alignValue];
      if (mapped) {
        range.format.horizontalAlignment = mapped;
      }
    });
  }
  if (fmt.borders === true) {
    await applyProp("borders", () => {
      const edges: Excel.BorderIndex[] = [
        Excel.BorderIndex.edgeTop,
        Excel.BorderIndex.edgeBottom,
        Excel.BorderIndex.edgeLeft,
        Excel.BorderIndex.edgeRight,
      ];
      for (const edge of edges) {
        const b = range.format.borders.getItem(edge);
        b.style = "Thin" as unknown as Excel.BorderLineStyle;
        b.color = "#000000";
      }
    });
  }

  // Sync isolé pour le format — les erreurs sont catchées sans bloquer le reste
  try {
    await context.sync();
  } catch (err) {
    console.error("[Excel] Format sync échoué:", err);
  }
};
