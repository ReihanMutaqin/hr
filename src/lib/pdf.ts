import * as pdfjsLib from "pdfjs-dist";

// Konfigurasi worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.mjs",
  import.meta.url
).toString();

export async function extractTextFromPDF(file: File): Promise<string> {
  if (file.size > 10 * 1024 * 1024) {
    throw new Error("Ukuran file maksimal 10MB");
  }

  const arrayBuffer = await file.arrayBuffer();
  
  try {
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = "";

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ");
      fullText += pageText + "\n";
    }

    return fullText.trim();
  } catch (error) {
    console.error("Error reading PDF:", error);
    throw new Error("Gagal membaca file PDF. Pastikan file tidak rusak atau terkunci.");
  }
}
