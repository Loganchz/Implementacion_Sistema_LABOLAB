import puppeteer from 'puppeteer-core';
import { randomUUID } from 'crypto';
import fs from 'fs';

export interface StoredPdf {
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  pdf_base64?: string;
  error?: string;
  createdAt: number;
}

const globalForPdf = globalThis as unknown as { pdfStore?: Map<string, StoredPdf> };
export const pdfStore = globalForPdf.pdfStore ?? new Map<string, StoredPdf>();
if (process.env.NODE_ENV !== 'production') globalForPdf.pdfStore = pdfStore;

// Clean up old PDFs after 30 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [id, entry] of pdfStore.entries()) {
      if (now - entry.createdAt > 30 * 60 * 1000) {
        pdfStore.delete(id);
      }
    }
  }, 5 * 60 * 1000);
}

export function getPdfStatus(requestId: string): StoredPdf | null {
  return pdfStore.get(requestId) || null;
}

export function findExecutablePath(): string {
  if (process.env.PUPPETEER_EXECUTABLE_PATH && fs.existsSync(process.env.PUPPETEER_EXECUTABLE_PATH)) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }
  // Linux paths
  const linuxPaths = [
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
  ];
  for (const p of linuxPaths) {
    if (fs.existsSync(p)) return p;
  }
  // Windows paths (for local dev outside Docker)
  if (process.platform === 'win32') {
    const winPaths = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    ];
    for (const p of winPaths) {
      if (fs.existsSync(p)) return p;
    }
  }
  return '/usr/bin/chromium';
}

export async function convertHtmlToPdf(
  htmlContent: string,
  options?: {
    format?: any;
    margin?: any;
    landscape?: boolean;
    print_background?: boolean;
    css_stylesheet?: string;
  }
): Promise<Buffer> {
  const executablePath = findExecutablePath();
  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--font-render-hinting=none',
    ],
  });

  try {
    const page = await browser.newPage();

    let fullHtml = htmlContent;
    if (options?.css_stylesheet) {
      fullHtml = fullHtml.replace('</head>', `<style>${options.css_stylesheet}</style></head>`);
    }

    await page.setContent(fullHtml, { waitUntil: 'load' });
    const pdfBuffer = await page.pdf({
      format: (options?.format as any) || 'A4',
      margin: options?.margin || { top: '15mm', bottom: '15mm', left: '15mm', right: '15mm' },
      printBackground: options?.print_background !== false,
      landscape: options?.landscape || false,
    });
    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close().catch(() => {});
  }
}

export async function createLocalPdfJob(
  htmlContent: string,
  options?: any
): Promise<string> {
  const requestId = randomUUID();
  try {
    const buf = await convertHtmlToPdf(htmlContent, options);
    pdfStore.set(requestId, {
      status: 'SUCCESS',
      pdf_base64: buf.toString('base64'),
      createdAt: Date.now(),
    });
  } catch (err: any) {
    console.error('Local PDF generation error:', err);
    pdfStore.set(requestId, {
      status: 'FAILED',
      error: err?.message || 'Error al generar PDF',
      createdAt: Date.now(),
    });
  }
  return requestId;
}
