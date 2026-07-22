import type { PupilMovement } from "@/types/progress";
import { classifyMovement, toPercent } from "./normalize";
import type { MatchedPair } from "./matchPupils";

/**
 * Build pupil-level movement records from matched UPSA/UASA pairs.
 *
 * Only pairs where BOTH assessments have status "marked" produce a numeric delta.
 * Pairs with missing/absent on either side get direction "incomplete".
 */
export function buildPupilMovements(matched: MatchedPair[]): PupilMovement[] {
  return matched.map((pair) => {
    const upsaMarked = pair.upsa.status === "marked";
    const uasaMarked = pair.uasa.status === "marked";

    const upsaPercent = upsaMarked ? toPercent(pair.upsa.mark, pair.upsa.maxMark) : null;
    const uasaPercent = uasaMarked ? toPercent(pair.uasa.mark, pair.uasa.maxMark) : null;

    const delta =
      upsaPercent !== null && uasaPercent !== null
        ? uasaPercent - upsaPercent
        : null;

    return {
      studentId: pair.studentId,
      displayName: pair.displayName,
      className: pair.className,
      previousClassName: pair.previousClassName,
      subjectCode: pair.subjectCode,
      upsaMark: upsaMarked ? pair.upsa.mark : null,
      upsaMaxMark: pair.upsa.maxMark,
      uasaMark: uasaMarked ? pair.uasa.mark : null,
      uasaMaxMark: pair.uasa.maxMark,
      upsaPercent,
      uasaPercent,
      delta,
      direction: classifyMovement(delta),
    };
  });
}
