import * as pdfjsLib from 'pdfjs-dist';

export function setupPdfWorker() {
  try {
    const workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;
  } catch (error) {
    console.error('Error setting up PDF worker:', error);
  }
} 