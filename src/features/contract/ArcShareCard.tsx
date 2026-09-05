"use client";

// Tarjeta compartible al cerrar un arco — Fase 9 de la auditoría (viralidad).
// Nada de plantillas vacías: solo dibuja datos reales del contrato que
// termina, con el mismo lenguaje visual que el resto de la app (mismo verde,
// misma pareja tipográfica). Se genera en un <canvas> off-screen y se
// entrega como PNG — vía Web Share API en móvil, o descarga directa.

interface ShareData {
  focusTitle: string;
  durationDays: number;
  streak: number;
  why: string;
  dateRangeLabel: string;
}

const WIDTH = 1080;
const HEIGHT = 1350;

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

async function ensureFontsReady() {
  try {
    await Promise.all([
      document.fonts.load('700 96px "Space Grotesk"'),
      document.fonts.load('600 40px "Space Grotesk"'),
      document.fonts.load('500 34px "Inter"'),
    ]);
    await document.fonts.ready;
  } catch {
    // Sin Font Loading API (Safari viejo) se dibuja con la fuente de sistema
    // que caiga — no es motivo para no generar la tarjeta.
  }
}

export async function buildArcShareImage(data: ShareData): Promise<Blob | null> {
  await ensureFontsReady();

  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const pad = 80;

  // Fondo — mismo bg-deep que la app, con un halo suave del verde de acción
  // en la esquina superior en vez de un gradiente decorativo sin motivo.
  ctx.fillStyle = "#090909";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  const glow = ctx.createRadialGradient(WIDTH - 180, 160, 0, WIDTH - 180, 160, 520);
  glow.addColorStop(0, "rgba(44,230,160,0.16)");
  glow.addColorStop(1, "rgba(44,230,160,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Wordmark
  ctx.fillStyle = "#f5f5f7";
  ctx.font = '600 34px "Space Grotesk", sans-serif';
  ctx.textBaseline = "alphabetic";
  ctx.fillText("VELTRA", pad, pad + 30);
  ctx.fillStyle = "#2ce6a0";
  ctx.beginPath();
  ctx.arc(pad + ctx.measureText("VELTRA").width + 18, pad + 20, 7, 0, Math.PI * 2);
  ctx.fill();

  // Eyebrow
  ctx.fillStyle = "#2ce6a0";
  ctx.font = '700 26px "Space Grotesk", sans-serif';
  ctx.fillText("ARCO COMPLETADO", pad, pad + 130);

  // Número grande de días
  ctx.fillStyle = "#f5f5f7";
  ctx.font = '700 168px "Space Grotesk", sans-serif';
  ctx.fillText(String(data.durationDays), pad, pad + 340);
  ctx.fillStyle = "#a8a8ae";
  ctx.font = '600 44px "Space Grotesk", sans-serif';
  ctx.fillText("días", pad, pad + 400);

  // Foco del arco
  ctx.fillStyle = "#f5f5f7";
  ctx.font = '600 48px "Space Grotesk", sans-serif';
  const focusLines = wrapText(ctx, data.focusTitle, WIDTH - pad * 2);
  let y = pad + 500;
  for (const line of focusLines) {
    ctx.fillText(line, pad, y);
    y += 58;
  }

  // Cita del "por qué"
  y += 30;
  ctx.strokeStyle = "#2a2a2e";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(pad, y - 34);
  ctx.lineTo(pad, y + 70);
  ctx.stroke();
  ctx.fillStyle = "#d8d8dc";
  ctx.font = '500 36px "Inter", sans-serif';
  const whyLines = wrapText(ctx, `"${data.why}"`, WIDTH - pad * 2 - 40).slice(0, 3);
  let wy = y;
  for (const line of whyLines) {
    ctx.fillText(line, pad + 34, wy);
    wy += 48;
  }

  // Stats al pie
  const statsY = HEIGHT - 220;
  ctx.strokeStyle = "#221f22";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(pad, statsY - 50);
  ctx.lineTo(WIDTH - pad, statsY - 50);
  ctx.stroke();

  ctx.fillStyle = "#2ce6a0";
  ctx.font = '700 64px "Space Grotesk", sans-serif';
  ctx.fillText(String(data.streak), pad, statsY + 40);
  ctx.fillStyle = "#6b6b72";
  ctx.font = '600 26px "Space Grotesk", sans-serif';
  ctx.fillText("RACHA FINAL", pad, statsY + 78);

  ctx.textAlign = "right";
  ctx.fillStyle = "#a8a8ae";
  ctx.font = '500 30px "Inter", sans-serif';
  ctx.fillText(data.dateRangeLabel, WIDTH - pad, statsY + 40);
  ctx.textAlign = "left";

  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), "image/png", 0.95));
}

export async function shareOrDownloadArcImage(data: ShareData): Promise<"shared" | "downloaded" | "failed"> {
  const blob = await buildArcShareImage(data);
  if (!blob) return "failed";

  const file = new File([blob], "veltra-arco.png", { type: "image/png" });

  if (typeof navigator !== "undefined" && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: "Mi arco en Veltra" });
      return "shared";
    } catch {
      // El usuario cerró el share sheet — no es un fallo, no hace falta descargar de más.
      return "shared";
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "veltra-arco.png";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return "downloaded";
}
