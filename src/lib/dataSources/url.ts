const spreadsheetIdPattern = /^[A-Za-z0-9_-]{20,}$/;

export function extractGoogleSpreadsheetId(value: string) {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.hostname !== "docs.google.com") return null;
  const match = url.pathname.match(/^\/spreadsheets\/d\/([A-Za-z0-9_-]+)(?:\/|$)/);
  return match?.[1] && spreadsheetIdPattern.test(match[1]) ? match[1] : null;
}
