/**
 * ExportEngine — generates keepsake PNGs and bundles them into a zip.
 */
import { toPng } from 'html-to-image';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export interface CardElement {
  id: string;
  label: string;
  element: HTMLElement;
}

/**
 * Capture a DOM element as a PNG data URL.
 */
export async function captureCard(element: HTMLElement): Promise<string> {
  return toPng(element, {
    width: 1080,
    height: 1920,
    pixelRatio: 1,
    backgroundColor: '#0D0000',
    style: {
      transform: 'scale(1)',
      transformOrigin: 'top left',
    },
  });
}

/**
 * Download a single PNG from a data URL.
 */
export function downloadPng(dataUrl: string, filename: string) {
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  link.click();
}

/**
 * Capture all card elements and bundle into a zip.
 */
export async function downloadAllAsZip(
  cards: CardElement[],
  zipName: string = 'justus-keepsakes.zip',
  onProgress?: (current: number, total: number) => void,
) {
  const zip = new JSZip();
  const folder = zip.folder('keepsakes');
  if (!folder) return;

  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    onProgress?.(i + 1, cards.length);

    try {
      const dataUrl = await captureCard(card.element);
      // Strip data URL prefix to get raw base64
      const base64 = dataUrl.split(',')[1];
      folder.file(`${card.id}.png`, base64, { base64: true });
    } catch {
      // Skip failed cards
    }

    // Yield to main thread between captures
    await new Promise(r => requestAnimationFrame(r));
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  saveAs(blob, zipName);
}

/**
 * Download all cards as individual PNGs.
 */
export async function downloadAllIndividual(
  cards: CardElement[],
  onProgress?: (current: number, total: number) => void,
) {
  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    onProgress?.(i + 1, cards.length);

    try {
      const dataUrl = await captureCard(card.element);
      downloadPng(dataUrl, `${card.id}.png`);
    } catch {
      // Skip failed cards
    }

    // Small delay between downloads
    await new Promise(r => setTimeout(r, 300));
  }
}
