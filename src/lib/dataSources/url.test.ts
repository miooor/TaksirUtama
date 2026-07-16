import { describe, expect, it } from "vitest";
import { extractGoogleSpreadsheetId } from "@/lib/dataSources/url";

describe("extractGoogleSpreadsheetId", () => {
  const id = "1AbCdEfGhIjKlMnOpQrStUvWxYz_123456";

  it("extracts an id from standard edit and copy URLs", () => {
    expect(extractGoogleSpreadsheetId(`https://docs.google.com/spreadsheets/d/${id}/edit#gid=0`)).toBe(id);
    expect(extractGoogleSpreadsheetId(`https://docs.google.com/spreadsheets/d/${id}/copy?usp=sharing`)).toBe(id);
  });

  it("rejects malformed, short, non-HTTPS, and lookalike-domain URLs", () => {
    expect(extractGoogleSpreadsheetId("not a url")).toBeNull();
    expect(extractGoogleSpreadsheetId("https://docs.google.com/spreadsheets/d/short/edit")).toBeNull();
    expect(extractGoogleSpreadsheetId(`http://docs.google.com/spreadsheets/d/${id}/edit`)).toBeNull();
    expect(extractGoogleSpreadsheetId(`https://docs.google.com.evil.example/spreadsheets/d/${id}/edit`)).toBeNull();
  });
});
