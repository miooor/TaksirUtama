import { cookies } from "next/headers";

export type Language = "ms" | "en";

export async function getLanguage(): Promise<Language> {
  return (await cookies()).get("ssp_lang")?.value === "en" ? "en" : "ms";
}

export function text(language: Language, values: { ms: string; en: string }) {
  return values[language];
}
