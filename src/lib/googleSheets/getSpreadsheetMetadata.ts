import { getSheetsClient } from "@/lib/googleSheets/client";

export async function getSpreadsheetMetadata(spreadsheetId: string) {
  const client = getSheetsClient();
  if (!client) {
    return null;
  }

  const response = await client.spreadsheets.get({
    spreadsheetId,
    fields: "sheets.properties.title",
  });

  return response.data.sheets?.map((sheet) => sheet.properties?.title).filter(Boolean) as string[];
}
