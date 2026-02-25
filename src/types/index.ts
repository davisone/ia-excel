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
