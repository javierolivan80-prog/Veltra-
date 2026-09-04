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
  /** Autor del comentario tal y como lo firma la fuente, p. ej. "Rev. D. Nombre (Ciudad, País)". */
  commentaryAuthor: string | null;
  sourceUrl: string;
}

const MAX_SECTION_CHARS = 4000;

const BOOK_NAMES: Record<string, string> = { Mt: "san Mateo", Mc: "san Marcos", Lc: "san Lucas", Jn: "san Juan" };

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

// evangeli.net repite el menú y el pie de página como texto plano fuera de
// <nav>/<footer>, así que quitar esas etiquetas no basta — se corta el
// evangelio o el comentario en el primer indicio de que ha empezado ese
// relleno de la página, en vez de arrastrarlo entero.
const BOILERPLATE_RE =
  /(Síguenos en|Sobre nosotros|Nuestra Difusión|Recursos\b|Newsletters?|Donativos|Todos los derechos|Política de (privacidad|cookies)|Aviso legal|Suscripción\b|Calendario Perpetuo|Idioma:)/i;

function cutAtBoilerplate(text: string): string {
  const match = text.match(BOILERPLATE_RE);
  if (match && match.index !== undefined && match.index > 30) return text.slice(0, match.index).trim();
  return text.trim();
}

function truncate(text: string): string {
  if (text.length <= MAX_SECTION_CHARS) return text;
  return `${text.slice(0, MAX_SECTION_CHARS).trimEnd()}…`;
}

// El texto del evangelio empieza justo tras este rótulo fijo de la página,
// con la cita bíblica entre paréntesis — es texto de plantilla del sitio,
// no contenido que cambie día a día.
const GOSPEL_MARKER_RE = /Texto del Evangelio\s*\(([^)]+)\)\s*:?/i;

// El comentario lo firma un autor con el formato "Nombre (Ciudad, País)" justo
// donde termina el evangelio — se usa esa firma como frontera entre ambos.
const BYLINE_RE = /([A-ZÀ-Ÿ][\wÀ-ÿ'.-]*(?:\s+[A-Za-zÀ-ÿ'.-]+){1,8})\s\(([^0-9()]{3,60},\s*[^0-9()]{2,40})\)/;

function gospelTitle(citation: string | null): string {
  const book = citation?.trim().split(/\s+/)[0]?.replace(/\.$/, "");
  const name = book ? BOOK_NAMES[book] : undefined;
  return name ? `Evangelio según ${name}` : "Evangelio de hoy";
}

/**
 * Mejor esfuerzo: extrae el evangelio completo y, si la fuente lo separa, su
 * comentario, apoyándose en el rótulo fijo "Texto del Evangelio (cita):" y en
 * la firma del comentarista que marca dónde empieza su reflexión. Si algo
 * falla o el marcador no aparece, null — el cliente cae a un enlace directo
 * a la fuente, nunca se queda en blanco ni inventa contenido.
 */
export async function GET(request: Request) {
  // Modo temporal para depurar en producción sin acceso a los logs de
  // Vercel: /api/gospel?debug=1 devuelve por qué falló en vez de null.
  // TODO: quitar esta rama una vez confirmado que la extracción es estable.
  const debug = new URL(request.url).searchParams.get("debug") === "1";

  try {
    const res = await fetch(SOURCE_URL, { headers: { "User-Agent": "Mozilla/5.0 (compatible; VeltraBot/1.0)" }, cache: "no-store" });
    if (!res.ok) {
      if (debug) return NextResponse.json({ step: "fetch", ok: false, status: res.status, statusText: res.statusText });
      return NextResponse.json(null);
    }

    const html = await res.text();
    const $ = cheerio.load(html);
    $("script, style, nav, header, footer, aside, form, noscript, iframe").remove();
    const bodyText = decodeEntities($("body").text());

    const gospelMarker = bodyText.match(GOSPEL_MARKER_RE);
    if (!gospelMarker || gospelMarker.index === undefined) {
      if (debug) return NextResponse.json({ step: "marker", htmlLength: html.length, bodyTextLength: bodyText.length, bodyTextSample: bodyText.slice(0, 1500) });
      return NextResponse.json(null);
    }

    const citation = gospelMarker[1].trim();
    const rest = bodyText.slice(gospelMarker.index + gospelMarker[0].length);

    const byline = rest.match(BYLINE_RE);
    let gospelText: string;
    let commentary: string | null;
    let commentaryAuthor: string | null;

    if (byline && byline.index !== undefined) {
      gospelText = truncate(cutAtBoilerplate(rest.slice(0, byline.index)));
      commentaryAuthor = `${byline[1].trim()} (${byline[2].trim()})`;
      commentary = truncate(cutAtBoilerplate(rest.slice(byline.index + byline[0].length))) || null;
    } else {
      gospelText = truncate(cutAtBoilerplate(rest));
      commentary = null;
      commentaryAuthor = null;
    }

    if (!gospelText) {
      if (debug) return NextResponse.json({ step: "empty-gospel-text", citation, restSample: rest.slice(0, 1500) });
      return NextResponse.json(null);
    }

    const gospel: DailyGospel = { title: gospelTitle(citation), citation, gospelText, commentary, commentaryAuthor, sourceUrl: SOURCE_URL };
    return NextResponse.json(gospel);
  } catch (err) {
    if (debug) return NextResponse.json({ step: "exception", message: err instanceof Error ? err.message : String(err) });
    return NextResponse.json(null);
  }
}
