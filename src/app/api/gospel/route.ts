import * as cheerio from "cheerio";
import { NextResponse } from "next/server";

// El evangelio del día — mismo contenido para todo el mundo, así que se
// cachea en el servidor una hora en vez de pedirlo en cada carga de Hoy.
export const revalidate = 3600;

const SOURCE_URL = "https://evangeli.net";

export interface DailyGospel {
  title: string;
  citation: string | null;
  /** Texto completo del evangelio — para no tener que salir de la app a leerlo. */
  gospelText: string | null;
  /** Comentario/reflexión que acompaña al evangelio, si la fuente lo separa. */
  commentary: string | null;
  sourceUrl: string;
}

const MAX_SECTION_CHARS = 4000;

function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCharCode(Number(dec)))
    .replace(/\s+/g, " ")
    .trim();
}

function truncate(text: string): string {
  if (text.length <= MAX_SECTION_CHARS) return text;
  return `${text.slice(0, MAX_SECTION_CHARS).trimEnd()}…`;
}

const CITATION_RE = /((?:Mateo|Marcos|Lucas|Juan|Mt|Mc|Lc|Jn)\.?\s+\d{1,3}\s*,\s*[\d,\-.\s]+\d)/i;

// Candidatos de contenedor de más a menos específico. No podemos verificar el
// marcado real de evangeli.net desde este entorno (la red saliente lo
// bloquea), así que se prueban varios y se queda el primero con texto
// razonable — si ninguno cuadra, el cliente cae a un enlace a la fuente,
// nunca se queda en blanco ni inventa contenido.
const CONTENT_SELECTORS = ["article", ".entry-content", ".post-content", "[class*='evangelio' i]", "#content", "main"];

// Marcador donde estas páginas suelen separar el texto del evangelio de su
// comentario/reflexión. Si no aparece, todo el bloque se trata como una sola
// pieza de texto (gospelText) sin comentario aparte.
const COMMENTARY_MARKER_RE = /\bComentario\b\s*:?/i;

/**
 * Mejor esfuerzo: extrae el evangelio completo (y su comentario, si la
 * fuente lo separa) para mostrarlo dentro de la app en vez de un enlace de
 * salida. Si algo falla o el resultado no parece texto real, null — el
 * cliente cae a un enlace directo a la fuente.
 */
export async function GET() {
  try {
    const res = await fetch(SOURCE_URL, { headers: { "User-Agent": "Mozilla/5.0 (compatible; VeltraBot/1.0)" }, next: { revalidate } });
    if (!res.ok) return NextResponse.json(null);

    const html = await res.text();
    const $ = cheerio.load(html);
    $("script, style, nav, header, footer, aside, form, noscript, iframe").remove();

    const title = decodeEntities($("meta[property='og:title']").attr("content") ?? $("title").first().text() ?? "") || "Evangelio de hoy";

    let block = "";
    for (const selector of CONTENT_SELECTORS) {
      const text = decodeEntities($(selector).first().text());
      if (text.length > 200) {
        block = text;
        break;
      }
    }

    if (!block) {
      const snippet = decodeEntities($("meta[property='og:description']").attr("content") ?? "");
      if (!snippet) return NextResponse.json(null);
      return NextResponse.json({ title, citation: null, gospelText: snippet, commentary: null, sourceUrl: SOURCE_URL } satisfies DailyGospel);
    }

    const citationMatch = block.match(CITATION_RE);
    const citation = citationMatch ? citationMatch[1].trim() : null;

    const markerMatch = block.match(COMMENTARY_MARKER_RE);
    const gospelText = truncate((markerMatch ? block.slice(0, markerMatch.index) : block).trim());
    const commentary = markerMatch ? truncate(block.slice((markerMatch.index ?? 0) + markerMatch[0].length).trim()) || null : null;

    const gospel: DailyGospel = { title, citation, gospelText: gospelText || null, commentary, sourceUrl: SOURCE_URL };
    return NextResponse.json(gospel);
  } catch {
    return NextResponse.json(null);
  }
}
