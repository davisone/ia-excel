export type MessageRole = "user" | "assistant";

export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  excelData: ExcelData | null;
  createdAt: Date;
}

export interface Conversation {
  id: string;
  userId: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExcelData {
  activeSheet: SheetData;
  selection: SelectionData | null;
  workbookSheets: string[];
}

export interface SheetData {
  name: string;
  headers: string[];
  rows: string[][];
}

export interface SelectionData {
  range: string;
  startRow: number;
  startCol: number;
}

export interface ChatRequest {
  message: string;
  conversationId: string | null;
  excelData: ExcelData | null;
}

export interface ConversationWithLastMessage extends Conversation {
  lastMessage: string | null;
}

// Actions Excel générées par l'IA
export interface ExcelActionWrite {
  type: "write";
  range: string;
  values: (string | number | boolean | null)[][];
}

export interface ExcelActionFormula {
  type: "formula";
  range: string;
  formula: string;
}

export interface ExcelActionFormat {
  type: "format";
  range: string;
  format: ExcelFormatOptions;
}

export interface ExcelFormatOptions {
  bold?: boolean;
  italic?: boolean;
  fill?: string;
  fontColor?: string;
  fontSize?: number;
  numberFormat?: string;
  horizontalAlignment?: "left" | "center" | "right";
  borders?: boolean;
}

export type ExcelAction = ExcelActionWrite | ExcelActionFormula | ExcelActionFormat;

export interface ExcelActionsBlock {
  actions: ExcelAction[];
}
