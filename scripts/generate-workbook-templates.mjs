import * as fs from "node:fs";
import { resolve } from "node:path";
import * as XLSX from "xlsx";

XLSX.set_fs(fs);

const outputDir = resolve(process.cwd(), "public", "templates");
fs.mkdirSync(outputDir, { recursive: true });

function configSheet(type) {
  return XLSX.utils.aoa_to_sheet([
    ["schemaVersion", "1"],
    ["schoolCode", "GANTI_DENGAN_KOD_SEKOLAH"],
    ["workbookType", type],
  ]);
}

const assessment = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(assessment, configSheet("assessment"), "_CONFIG");
XLSX.utils.book_append_sheet(assessment, XLSX.utils.aoa_to_sheet([
  ["KELAS:", "1 CONTOH"],
  ["NAMA GURU KELAS :", "NAMA GURU"],
  [], [], [], [], [], [], [], [],
  ["BIL", "NAMA", "BM", "GRED", "BI", "GRED", "MATE", "GRED", "SAINS", "GRED"],
  ["", "", 100, "", 100, "", 100, "", 100, ""],
  [1, "NAMA MURID", "", "", "", "", "", "", "", ""],
]), "1 CONTOH");
XLSX.writeFile(assessment, resolve(outputDir, "templat-upsa-uasa-v1.xlsx"));

const pbd = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(pbd, configSheet("pbd"), "_CONFIG");
XLSX.utils.book_append_sheet(pbd, XLSX.utils.aoa_to_sheet([
  ["PANITIA : BAHASA MELAYU"],
  [], [], [], [], [], [], [],
  ["BIL", "KELAS", "TP 1", "PERATUS TP 1", "TP 2", "PERATUS TP 2", "TP 3", "PERATUS TP 3", "TP 4", "PERATUS TP 4", "TP 5", "PERATUS TP 5", "TP 6", "PERATUS TP 6", "JUMLAH MURID", "BILANGAN MURID TIDAK DITAKSIR"],
  [1, "1 CONTOH", 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
]), "BM");
XLSX.writeFile(pbd, resolve(outputDir, "templat-pbd-v1.xlsx"));

process.stdout.write(`Workbook templates written to ${outputDir}\n`);
