import { NextResponse } from "next/server";

// El evangelio del día — mismo contenido para todo el mundo, así que se
// cachea en el servidor una hora en vez de pedirlo en cada carga de Hoy.
export const revalidate = 3600;

const SOURCE_URL = "https://evangeli.net";

export interface DailyGospel {
  title: string;
  snippet: string;
  sourceUrl: string;
}

function extractMeta(html: string, property: string): string | null {
  const re = new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']*)["']`, "i");
  const match = html.match(re) ?? html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+property=["']${property}["']`, "i"));
  if (!match) return null;
  return match[1].replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim() || null;
}

function extractTitle(html: string): string | null {
  const match = html.match(/<title>([^<]*)<\/title>/i);
  return match ? match[1].trim() || null : null;
}

/**
 * Mejor esfuerzo: lee las meta-etiquetas Open Graph de la fuente en vez de
 * raspar su estructura de contenido concreta — más resistente a que la web
 * cambie de diseño, aunque menos preciso que una API dedicada. Si algo
 * falla, null: el cliente cae a un enlace directo a la fuente, nunca se
 * queda en blanco ni inventa una cita.
 */
export async function GET() {
  try {
    const res = await fetch(SOURCE_URL, { headers: { "User-Agent": "Mozilla/5.0 (compatible; VeltraBot/1.0)" }, next: { revalidate } });
    if (!res.ok) return NextResponse.json(null);

    const html = await res.text();
    const snippet = extractMeta(html, "og:description");
    const title = extractMeta(html, "og:title") ?? extractTitle(html);
    if (!snippet && !title) return NextResponse.json(null);

    const gospel: DailyGospel = { title: title ?? "Evangelio de hoy", snippet: snippet ?? "", sourceUrl: SOURCE_URL };
    return NextResponse.json(gospel);
  } catch {
    return NextResponse.json(null);
  }
}
