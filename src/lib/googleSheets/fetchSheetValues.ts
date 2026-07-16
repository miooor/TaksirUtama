import { getSheetsClient } from "@/lib/googleSheets/client";

export async function fetchSheetValues(spreadsheetId: string, range: string) {
  const client = getSheetsClient();
  if (!client) {
    return null;
  }

  const response = await client.spreadsheets.values.get({ spreadsheetId, range });
  return response.data.values ?? [];
}

export async function fetchSheetValueRanges(spreadsheetId: string, ranges: string[]) {
  const client = getSheetsClient();
  if (!client) {
    return null;
  }

  const response = await client.spreadsheets.values.batchGet({ spreadsheetId, ranges });
  return (response.data.valueRanges ?? []).map((range) => range.values ?? []);
}
