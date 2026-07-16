import type { calculatePbdReadiness } from "@/lib/pbd/readiness";
import type { calculateUpsaReadiness } from "@/lib/upsa/readiness";

export type ReturnTypeOfReadiness = ReturnType<typeof calculatePbdReadiness>;
export type ReturnTypeOfUpsaReadiness = ReturnType<typeof calculateUpsaReadiness>;
