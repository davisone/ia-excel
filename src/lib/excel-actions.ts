import { ExcelActionsBlock } from "@/types";

const ACTIONS_START = "[EXCEL_ACTIONS]";
const ACTIONS_END = "[/EXCEL_ACTIONS]";

// Extrait le bloc JSON d'actions Excel depuis la réponse de l'IA
export const parseExcelActions = (content: string): ExcelActionsBlock | null => {
  const startIdx = content.indexOf(ACTIONS_START);
  const endIdx = content.indexOf(ACTIONS_END);
  if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) return null;

  const json = content.slice(startIdx + ACTIONS_START.length, endIdx).trim();
  try {
    return JSON.parse(json) as ExcelActionsBlock;
  } catch {
    return null;
  }
};

// Retourne le texte de la réponse sans le bloc d'actions
// Gère aussi le cas du streaming (bloc ouvert mais pas encore fermé)
export const getContentWithoutActions = (content: string): string => {
  const startIdx = content.indexOf(ACTIONS_START);
  if (startIdx === -1) return content;

  const endIdx = content.indexOf(ACTIONS_END);

  // Bloc pas encore fermé (streaming en cours) → on cache tout après [EXCEL_ACTIONS]
  if (endIdx === -1) {
    return content.slice(0, startIdx).trim();
  }

  // Bloc complet → on retire le bloc entier
  const before = content.slice(0, startIdx).trim();
  const after = content.slice(endIdx + ACTIONS_END.length).trim();
  return [before, after].filter(Boolean).join("\n\n");
};

// Génère un résumé lisible des actions
export const summarizeActions = (block: ExcelActionsBlock): string[] => {
  return block.actions.map((action) => {
    switch (action.type) {
      case "write":
        return `Écriture dans ${action.range}`;
      case "formula":
        return `Formule ${action.formula} dans ${action.range}`;
      case "format":
        return `Mise en forme de ${action.range}`;
    }
  });
};
