/** Client-side image downscale + JPEG re-encode.
 *
 * Meal photos are stored inline (as data URLs) and forwarded to the vision
 * model, so full-resolution camera shots would bloat the DB row and the
 * request. Capping the long edge and re-encoding to JPEG keeps each photo in
 * the low-hundreds-of-KB range while staying sharp enough to read a plate.
 */
export async function compressImage(file: File, maxEdge = 1024, quality = 0.72): Promise<string> {
  const dataUrl = await readAsDataURL(file);
  const img = await loadImage(dataUrl);

  const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
  const width = Math.round(img.width * scale);
  const height = Math.round(img.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl; // canvas unavailable — fall back to the original
  ctx.drawImage(img, 0, 0, width, height);

  return canvas.toDataURL("image/jpeg", quality);
}

export async function compressImages(files: File[], maxEdge = 1024, quality = 0.72): Promise<string[]> {
  return Promise.all(files.map((f) => compressImage(f, maxEdge, quality)));
}

/** Splits a data URL into the parts the Anthropic vision API expects. */
export function dataUrlToImageBlock(dataUrl: string): { media_type: string; data: string } | null {
  const match = dataUrl.match(/^data:([^;]+);base64,(.*)$/);
  if (!match) return null;
  return { media_type: match[1], data: match[2] };
}

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("No se pudo cargar la imagen."));
    img.src = src;
  });
}
