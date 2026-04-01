import * as XLSX from "xlsx";

export async function extractText(file: File) {
  const buffer = Buffer.from(await file.arrayBuffer());
  const fileName = file.name.toLowerCase();

  let text = "";

  // ==============================
  // 📄 PDF
  // ==============================
  if (fileName.endsWith(".pdf")) {
    const pdf = require("@cyber2024/pdf-parse-fixed"); //  stable
    const data = await pdf(buffer);
    text = data.text;
  }

  // ==============================
  // 📄 WORD (docx / doc)
  // ==============================
  else if (fileName.endsWith(".docx") || fileName.endsWith(".doc")) {
    const mammoth = require("mammoth");

    const result = await mammoth.extractRawText({ buffer });
    text = result.value;
  }

  // ==============================
  // 📄 TXT
  // ==============================
  else if (fileName.endsWith(".txt")) {
    text = buffer.toString("utf-8");
  }

  // ==============================
  // 📊 EXCEL / CSV
  // ==============================
  else if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls") || fileName.endsWith(".csv")) {
    const workbook = XLSX.read(buffer, { type: "buffer" });

    let allText = "";

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];

      const rows = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
      }) as any[][];

      allText += `Sheet: ${sheetName}\n`;

      for (const row of rows) {
        const cleaned = row.filter((cell) => cell !== null && cell !== undefined && cell !== "");

        if (cleaned.length > 0) {
          allText += cleaned.join(" | ") + "\n";
        }
      }

      allText += "\n";
    }

    text = allText;
  }

  // ==============================
  // Unsupported
  // ==============================
  else {
    throw new Error("Unsupported file type");
  }

  // ==============================
  // ⚠️ Safety check
  // ==============================
  if (!text || text.trim().length === 0) {
    throw new Error("Could not extract text from file");
  }

  return text;
}
