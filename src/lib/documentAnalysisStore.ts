import type { AnalysisResult, DocumentType } from "@/utils/documentAnalysis";

const DB_NAME = "uhpab-document-analysis";
const DB_VERSION = 1;
const STORE_NAME = "analysisDocuments";
export const ANALYSIS_ENGINE_VERSION = 5;

export type DocumentFingerprint = {
  contentHash: string;
  pageCount: number | null;
};

export type StoredAnalysisRecord = {
  id: string;
  userId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  fileLastModified: number;
  contentHash: string;
  pageCount: number | null;
  documentType: DocumentType;
  component: string;
  result: AnalysisResult;
  file: Blob;
  createdAt: string;
  updatedAt: string;
  analysisRuns: number;
  cacheNotes: string[];
  engineVersion?: number;
};

type AnalysisLookup = {
  userId: string;
  documentType: DocumentType;
  component: string;
  fileName: string;
  fingerprint: DocumentFingerprint;
};

type SaveAnalysisInput = AnalysisLookup & {
  file: File;
  result: AnalysisResult;
  reusedFromId?: string;
  cacheNotes?: string[];
};

const hasIndexedDb = () => typeof indexedDB !== "undefined";

const openAnalysisDb = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    if (!hasIndexedDb()) {
      reject(new Error("IndexedDB is not available in this browser."));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
      store.createIndex("byExactAnalysis", ["userId", "contentHash", "documentType", "component"], {
        unique: false,
      });
      store.createIndex("byDocumentName", ["userId", "fileName", "documentType", "component"], {
        unique: false,
      });
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

const countPdfPages = (text: string) => {
  const matches = text.match(/\/Type\s*\/Page\b/g);
  return matches?.length ?? null;
};

const getPageCountHint = (file: File, buffer: ArrayBuffer) => {
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    return null;
  }

  const text = new TextDecoder("latin1").decode(buffer);
  return countPdfPages(text);
};

const bufferToHex = (buffer: ArrayBuffer) =>
  Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

export const createDocumentFingerprint = async (file: File): Promise<DocumentFingerprint> => {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);

  return {
    contentHash: bufferToHex(digest),
    pageCount: getPageCountHint(file, buffer),
  };
};

export const findReusableAnalysis = async ({
  userId,
  documentType,
  component,
  fileName,
  fingerprint,
}: AnalysisLookup): Promise<{ record: StoredAnalysisRecord | null; notes: string[] }> => {
  const notes: string[] = [];
  const db = await openAnalysisDb();

  try {
    const store = transactionStore(db, "readonly");
    const exactIndex = store.index("byExactAnalysis");
    const exactMatches = await getAllFromIndex<StoredAnalysisRecord>(
      exactIndex,
      IDBKeyRange.only([userId, fingerprint.contentHash, documentType, component])
    );
    const exactMatch = exactMatches.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];

    if (exactMatch && exactMatch.engineVersion === ANALYSIS_ENGINE_VERSION) {
      notes.push("Same file fingerprint found. Returning the saved analysis result.");
      return { record: exactMatch, notes };
    }

    if (exactMatch) {
      notes.push("A previous result exists, but the marking engine has changed. A fresh check is needed.");
    }

    const nameIndex = store.index("byDocumentName");
    const namedMatches = await getAllFromIndex<StoredAnalysisRecord>(
      nameIndex,
      IDBKeyRange.only([userId, fileName, documentType, component])
    );
    const previousVersion = namedMatches.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];

    if (previousVersion) {
      if (
        fingerprint.pageCount !== null &&
        previousVersion.pageCount !== null &&
        fingerprint.pageCount > previousVersion.pageCount
      ) {
        notes.push(
          `Page count increased from ${previousVersion.pageCount} to ${fingerprint.pageCount}. A fresh check is needed.`
        );
      } else {
        notes.push("File name matched an earlier upload, but the content fingerprint changed. A fresh check is needed.");
      }
    }

    return { record: null, notes };
  } finally {
    db.close();
  }
};

export const saveAnalysisRecord = async ({
  userId,
  documentType,
  component,
  file,
  fingerprint,
  result,
  reusedFromId,
  cacheNotes = [],
}: SaveAnalysisInput): Promise<StoredAnalysisRecord> => {
  const db = await openAnalysisDb();
  const now = new Date().toISOString();

  try {
    const store = transactionStore(db, "readwrite");
    const existing = reusedFromId
      ? await requestToPromise<StoredAnalysisRecord | undefined>(store.get(reusedFromId))
      : undefined;

    const record: StoredAnalysisRecord = existing
      ? {
          ...existing,
          contentHash: fingerprint.contentHash,
          pageCount: fingerprint.pageCount,
          documentType,
          component,
          fileName: file.name,
          fileType: file.type || "unknown",
          fileSize: file.size,
          fileLastModified: file.lastModified,
          file,
          result,
          updatedAt: now,
          analysisRuns: existing.analysisRuns + 1,
          cacheNotes,
          engineVersion: ANALYSIS_ENGINE_VERSION,
        }
      : {
          id: crypto.randomUUID(),
          userId,
          fileName: file.name,
          fileType: file.type || "unknown",
          fileSize: file.size,
          fileLastModified: file.lastModified,
          contentHash: fingerprint.contentHash,
          pageCount: fingerprint.pageCount,
          documentType,
          component,
          result,
          file,
          createdAt: now,
          updatedAt: now,
          analysisRuns: 1,
          cacheNotes,
          engineVersion: ANALYSIS_ENGINE_VERSION,
        };

    await requestToPromise(store.put(record));
    return record;
  } finally {
    db.close();
  }
};

export const listAnalysisRecords = async (userId: string, limit = 6): Promise<StoredAnalysisRecord[]> => {
  const db = await openAnalysisDb();

  try {
    const store = transactionStore(db, "readonly");
    const records = await getAllFromIndex<StoredAnalysisRecord>(
      store.index("byUserUpdated"),
      IDBKeyRange.bound([userId, ""], [userId, "\uffff"])
    );

    return records.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, limit);
  } finally {
    db.close();
  }
};

export const getAnalysisRecord = async (recordId: string): Promise<StoredAnalysisRecord | null> => {
  const db = await openAnalysisDb();

  try {
    const record = await requestToPromise<StoredAnalysisRecord | undefined>(
      transactionStore(db, "readonly").get(recordId)
    );

    return record ?? null;
  } finally {
    db.close();
  }
};

export const deleteAnalysisRecord = async (recordId: string, userId: string): Promise<boolean> => {
  const db = await openAnalysisDb();

  try {
    const store = transactionStore(db, "readwrite");
    const record = await requestToPromise<StoredAnalysisRecord | undefined>(store.get(recordId));

    if (!record || record.userId !== userId) return false;

    await requestToPromise(store.delete(recordId));
    return true;
  } finally {
    db.close();
  }
};
