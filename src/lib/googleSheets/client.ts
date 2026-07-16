import { google } from "googleapis";
import { env, hasGoogleCredentials } from "@/lib/config/env";

let sheetsClient: ReturnType<typeof google.sheets> | null = null;

export function getSheetsClient() {
  if (!hasGoogleCredentials) {
    return null;
  }

  if (!sheetsClient) {
    const auth = new google.auth.JWT({
      email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });
    sheetsClient = google.sheets({ version: "v4", auth });
  }

  return sheetsClient;
}
