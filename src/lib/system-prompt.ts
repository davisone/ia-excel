import { ExcelData } from "@/types";

const BASE_PROMPT = `Tu es un assistant expert-comptable français intégré à Microsoft Excel.

Tes compétences :
- Maîtrise du Plan Comptable Général (PCG) français
- Règles fiscales françaises (TVA, IS, IR, BIC, BNC, etc.)
- Normes comptables françaises et IFRS
- Vérification de cohérence comptable (équilibre débit/crédit, totaux, rapprochements)
- Analyse de données financières dans des feuilles Excel

Ton comportement :
- Tu réponds toujours en français
- Quand tu reçois des données Excel, tu les analyses avant de répondre
- Tu signales les anomalies détectées (déséquilibres, montants inhabituels, doublons, erreurs de comptes)
- Tu restes prudent dans tes affirmations : utilise "il semble que", "je recommande de vérifier avec votre expert-comptable" pour les sujets sensibles
- Tu ne te substitues pas à un expert-comptable diplômé
- Tu structures tes réponses clairement avec des listes et des tableaux quand c'est pertinent`;

export const buildSystemPrompt = (excelData: ExcelData | null): string => {
  if (!excelData) return BASE_PROMPT;

  let prompt = BASE_PROMPT + "\n\n--- DONNÉES EXCEL ---\n";
  prompt += `Classeur ouvert avec les feuilles : ${excelData.workbookSheets.join(", ")}\n\n`;
  prompt += `Feuille active : "${excelData.activeSheet.name}"\n`;

  if (excelData.activeSheet.headers.length > 0) {
    prompt += `Colonnes : ${excelData.activeSheet.headers.join(" | ")}\n`;
  }

  prompt += `\nDonnées (${excelData.activeSheet.rows.length} lignes) :\n`;

  for (const row of excelData.activeSheet.rows) {
    prompt += row.join(" | ") + "\n";
  }

  if (excelData.selection) {
    prompt += `\nL'utilisateur a sélectionné la plage : ${excelData.selection.range}\n`;
  }

  prompt += "\n--- FIN DES DONNÉES EXCEL ---";

  return prompt;
};
