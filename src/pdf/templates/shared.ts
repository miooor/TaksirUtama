import path from "node:path";

export function pdfAssetSrc(publicPath: string) {
  const normalized = path.posix.normalize(publicPath);
  if (!normalized.startsWith("/") || normalized.includes("..")) {
    throw new Error("School asset paths must be safe public paths.");
  }
  return path.join(process.cwd(), "public", normalized);
}
