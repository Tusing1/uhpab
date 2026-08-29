import type { ImprovementResult } from "@/lib/contentImprovementEngine";
import type { HumanReviewResult } from "@/lib/humanReviewEngine";
import type { PlagiarismReport } from "@/lib/researchTextMarkers";
import type { ReviewToolHandoff } from "@/lib/toolHandoff";

const DB_NAME = "uhpab-review-workspace";
const DB_VERSION = 1;
const STORE_NAME = "toolResults";

export type StoredToolKind = "content-improvement" | "plagiarism-checker" | "humanizer";

export type ToolResultPayload = {
  "content-improvement": ImprovementResult;
  "plagiarism-checker": PlagiarismReport;
  humanizer: HumanReviewResult;
};

export const TOOL_ENGINE_VERSION: Record<StoredToolKind, number> = {
  "content-improvement": 1,
  "plagiarism-checker": 3,
  humanizer: 4,
};

export type ToolTextFingerprint = {
  contentHash: string;
  wordCount: number;
  characterCount: number;
};

export type StoredToolResultRecord<TTool extends StoredToolKind = StoredToolKind> = {
  id: string;
  userId: string;
  tool: TTool;
  fileName?: string;
  documentType?: string;
  section?: string;
  issueLabel?: string;
  pageNumber?: number | null;
  sourceContext?: ReviewToolHandoff | null;
  contentHash: string;
  wordCount: number;
  characterCount: number;
  inputText?: string;
  inputPreview: string;
  result: ToolResultPayload[TTool];
  createdAt: string;
  updatedAt: string;
  runs: number;
  engineVersion: number;
};

type ToolLookupInput = {
  userId: string;
  tool: StoredToolKind;
  fingerprint: ToolTextFingerprint;
};

type SaveToolResultInput<TTool extends StoredToolKind> = ToolLookupInput & {
  tool: TTool;
  inputText: string;
  result: ToolResultPayload[TTool];
  fileName?: string;
  sourceContext?: ReviewToolHandoff | null;
  reusedFromId?: string;
};

const hasIndexedDb = () => typeof indexedDB !== "undefined";

const openToolResultsDb = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    if (!hasIndexedDb()) {
      reject(new Error("IndexedDB is not available in this browser."));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
      store.createIndex("byExactToolInput", ["userId", "tool", "contentHash"], { unique: false });
      store.createIndex("byToolUpdated", ["userId", "tool", "updatedAt"], { unique: false });
      store.createIndex("byUserUpdated", ["userId", "updatedAt"], { unique: false });
    };

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });

const transactionStore = (db: IDBDatabase, mode: IDBTransactionMode) =>
  db.transaction(STORE_NAME, mode).objectStore(STORE_NAME);

const requestToPromise = <T>(request: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });

const getAllFromIndex = <T>(index: IDBIndex, query?: IDBValidKey | IDBKeyRange) =>
  new Promise<T[]>((resolve, reject) => {
    const request = index.getAll(query);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result as T[]);
  });

const bufferToHex = (buffer: ArrayBuffer) =>
  Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

const normalizeInputText = (text: string) =>
  text
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const countWords = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

export const createToolTextFingerprint = async (text: string): Promise<ToolTextFingerprint> => {
  const normalized = normalizeInputText(text);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(normalized));

  return {
    contentHash: bufferToHex(digest),
    wordCount: countWords(normalized),
    characterCount: normalized.length,
  };
};

export const findReusableToolResult = async <TTool extends StoredToolKind>({
  userId,
  tool,
  fingerprint,
}: ToolLookupInput): Promise<{ record: StoredToolResultRecord<TTool> | null; reused: boolean }> => {
  const db = await openToolResultsDb();

  try {
    const exactMatches = await getAllFromIndex<StoredToolResultRecord<TTool>>(
      transactionStore(db, "readonly").index("byExactToolInput"),
      IDBKeyRange.only([userId, tool, fingerprint.contentHash])
    );
    const exactMatch = exactMatches.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];

    if (exactMatch && exactMatch.engineVersion === TOOL_ENGINE_VERSION[tool]) {
      return { record: exactMatch, reused: true };
    }

    return { record: null, reused: false };
  } finally {
    db.close();
  }
};

export const saveToolResult = async <TTool extends StoredToolKind>({
  userId,
  tool,
  fingerprint,
  inputText,
  result,
  fileName,
  sourceContext,
  reusedFromId,
}: SaveToolResultInput<TTool>): Promise<StoredToolResultRecord<TTool>> => {
  const db = await openToolResultsDb();
  const now = new Date().toISOString();
  const normalizedInput = normalizeInputText(inputText);
  const context = sourceContext ?? null;

  try {
    const store = transactionStore(db, "readwrite");
    const existing = reusedFromId
      ? await requestToPromise<StoredToolResultRecord<TTool> | undefined>(store.get(reusedFromId))
      : undefined;

    const record: StoredToolResultRecord<TTool> = existing
      ? {
          ...existing,
          fileName: fileName || existing.fileName,
          documentType: context?.documentType ?? existing.documentType,
          section: context?.section ?? existing.section,
          issueLabel: context?.issueLabel ?? existing.issueLabel,
          pageNumber: context?.pageNumber ?? existing.pageNumber,
          sourceContext: context ?? existing.sourceContext,
          inputText: normalizedInput,
          result,
          updatedAt: now,
          runs: existing.runs + 1,
          engineVersion: TOOL_ENGINE_VERSION[tool],
        }
      : {
          id: crypto.randomUUID(),
          userId,
          tool,
          fileName,
          documentType: context?.documentType,
          section: context?.section,
          issueLabel: context?.issueLabel,
          pageNumber: context?.pageNumber,
          sourceContext: context,
          contentHash: fingerprint.contentHash,
          wordCount: fingerprint.wordCount,
          characterCount: fingerprint.characterCount,
          inputText: normalizedInput,
          inputPreview: normalizedInput.slice(0, 220),
          result,
          createdAt: now,
          updatedAt: now,
          runs: 1,
          engineVersion: TOOL_ENGINE_VERSION[tool],
        };

    await requestToPromise(store.put(record));
    return record;
  } finally {
    db.close();
  }
};

export const listToolResultRecords = async <TTool extends StoredToolKind>(
  userId: string,
  tool: TTool,
  limit = 5
): Promise<StoredToolResultRecord<TTool>[]> => {
  const db = await openToolResultsDb();

  try {
    const records = await getAllFromIndex<StoredToolResultRecord<TTool>>(
      transactionStore(db, "readonly").index("byToolUpdated"),
      IDBKeyRange.bound([userId, tool, ""], [userId, tool, "\uffff"])
    );

    return records.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, limit);
  } finally {
    db.close();
  }
};

export const getToolResultRecord = async <TTool extends StoredToolKind>(
  recordId: string
): Promise<StoredToolResultRecord<TTool> | null> => {
  const db = await openToolResultsDb();

  try {
    const record = await requestToPromise<StoredToolResultRecord<TTool> | undefined>(
      transactionStore(db, "readonly").get(recordId)
    );

    return record ?? null;
  } finally {
    db.close();
  }
};

export const deleteToolResultRecord = async (recordId: string, userId: string): Promise<boolean> => {
  const db = await openToolResultsDb();

  try {
    const store = transactionStore(db, "readwrite");
    const record = await requestToPromise<StoredToolResultRecord | undefined>(store.get(recordId));

    if (!record || record.userId !== userId) return false;

    await requestToPromise(store.delete(recordId));
    return true;
  } finally {
    db.close();
  }
};

export const deleteToolResultsForSourceDocument = async (
  userId: string,
  fileName: string
): Promise<string[]> => {
  const db = await openToolResultsDb();
  const normalizedFileName = fileName.trim().toLowerCase();

  try {
    const records = await getAllFromIndex<StoredToolResultRecord>(
      transactionStore(db, "readonly").index("byUserUpdated"),
      IDBKeyRange.bound([userId, ""], [userId, "\uffff"])
    );
    const matchingIds = records
      .filter(
        (record) =>
          record.userId === userId &&
          record.sourceContext?.sourceTool === "document-analysis" &&
          record.sourceContext.fileName?.trim().toLowerCase() === normalizedFileName
      )
      .map((record) => record.id);

    if (matchingIds.length === 0) return [];

    const store = transactionStore(db, "readwrite");
    await Promise.all(matchingIds.map((recordId) => requestToPromise(store.delete(recordId))));
    return matchingIds;
  } finally {
    db.close();
  }
};
