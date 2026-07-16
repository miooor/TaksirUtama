import * as XLSX from "xlsx";

const workbookCache = new Map<string, { expiresAt: number; promise: Promise<XLSX.WorkBook> }>();
const workbookCacheTtlMs = 5 * 60 * 1000;

export function clearPublicWorkbookCache() {
  workbookCache.clear();
}

async function loadPublicWorkbook(spreadsheetId: string) {
  const cachedWorkbook = workbookCache.get(spreadsheetId);
  if (!cachedWorkbook || cachedWorkbook.expiresAt <= Date.now()) {
    workbookCache.set(
      spreadsheetId,
      {
        expiresAt: Date.now() + workbookCacheTtlMs,
        promise: fetch(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=xlsx`, {
          cache: "no-store",
        }).then(async (response) => {
          if (!response.ok) {
            throw new Error(`Failed to fetch public workbook: ${response.status}`);
          }
          return XLSX.read(Buffer.from(await response.arrayBuffer()), { type: "buffer" });
        }),
      },
    );
  }
  return workbookCache.get(spreadsheetId)!.promise;
}

export async function getPublicWorkbookSheetNames(spreadsheetId: string) {
  return (await loadPublicWorkbook(spreadsheetId)).SheetNames;
}

export async function getPublicWorkbookSheetValues(spreadsheetId: string, sheetName: string) {
  const workbook = await loadPublicWorkbook(spreadsheetId);
  const sheet = workbook.Sheets[sheetName];
  return sheet ? XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" }) : null;
}
