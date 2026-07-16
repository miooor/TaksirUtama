import Link from "next/link";
import { AppShell } from "@/components/shared/AppShell";
import { PageHeader } from "@/components/shared/PageHeader";
import { UasaIncompletePopup } from "@/components/uasa/UasaIncompletePopup";
import { requireSchoolContext } from "@/lib/auth";
import { assessmentPath } from "@/lib/config/periods";
import { isUasaDataAvailable } from "@/lib/config/uasaAvailability";
import { getLanguage, text } from "@/lib/i18n";
import { CalendarClock } from "lucide-react";

export default async function UasaPage() {
  const language = await getLanguage();
  const { defaultUasaPeriod } = await requireSchoolContext();
  const dataAvailable = isUasaDataAvailable(defaultUasaPeriod);

  return (
    <AppShell>
      {!dataAvailable ? (
        <UasaIncompletePopup
          title={text(language, { ms: "Data UASA belum lengkap", en: "UASA data is not complete yet" })}
          message={text(language, {
            ms: "Data UASA belum tersedia untuk tempoh ini. Ruang kelas dan analisis akan dibuka apabila data peperiksaan telah dimasukkan.",
            en: "UASA data is not available for this period. Class and analysis views will open once the exam data has been entered.",
          })}
          note={text(language, {
            ms: "Ini bukan ralat sistem. Paparan ini sengaja dikunci sementara menunggu data UASA.",
            en: "This is not a system error. This view is intentionally locked while waiting for UASA data.",
          })}
          closeLabel={text(language, { ms: "Faham", en: "Got it" })}
        />
      ) : null}
      <PageHeader
        eyebrow="UASA"
        title={text(language, { ms: "Peperiksaan akhir tahun", en: "End-of-year examination" })}
        description={text(language, {
          ms: "UASA akan digunakan untuk peperiksaan akhir tahun.",
          en: "UASA will be used for the end-of-year examination.",
        })}
        icon={CalendarClock}
      />
      {defaultUasaPeriod && dataAvailable ? (
        <section className="mt-6 rounded-lg border bg-white p-5">
          <h2 className="font-semibold">{defaultUasaPeriod.examName}</h2>
          <p className="mt-2 text-sm text-slate-600">
            {text(language, {
              ms: "UASA menggunakan susun atur sheet dan parser yang sama seperti UPSA.",
              en: "UASA uses the same sheet layout and parser as UPSA.",
            })}
          </p>
          <Link href={assessmentPath(defaultUasaPeriod, "/classes")} className="action-primary mt-4 text-sm">
            {text(language, { ms: "Buka kelas UASA", en: "Open UASA classes" })}
          </Link>
        </section>
      ) : (
        <section className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-5 text-amber-950">
          <h2 className="font-semibold">{text(language, { ms: "Data UASA belum lengkap", en: "UASA data is not complete yet" })}</h2>
          <p className="mt-2 text-sm">
            {text(language, {
              ms: "Paparan kelas, slip dan analisis akan dibuka selepas data UASA dimasukkan.",
              en: "Class, slip and analysis views will open after UASA data is entered.",
            })}
          </p>
        </section>
      )}
    </AppShell>
  );
}
