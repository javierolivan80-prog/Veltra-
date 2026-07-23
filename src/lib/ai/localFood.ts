// Deterministic, offline food estimator — the fallback used when there's no
// Supabase project / edge function configured (demo & local mode), mirroring
// how src/lib/ai/localCoach.ts backs the coach chat. It can only parse text
// (no vision), so when the user sends only a photo it asks them to describe it.
//
// The estimates come from a small curated table of common foods. It's a
// best-effort approximation, never a medical figure — the real accuracy comes
// from the Claude-backed edge function when the backend is live.

import type { DetectedFood } from "@/types/models";

export interface FoodAnalysis {
  reply: string;
  meal: {
    note: string;
    foods: DetectedFood[];
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
  } | null;
}

type Per100g = { per100g: true; kcal: number; p: number; c: number; f: number; fib: number };
type PerUnit = { per100g: false; unitGrams: number; kcal: number; p: number; c: number; f: number; fib: number };
type FoodDef = { keywords: string[]; label: string } & (Per100g | PerUnit);

// Macros per 100 g unless per100g:false, in which case they're per single unit.
const FOODS: FoodDef[] = [
  { keywords: ["pollo", "pechuga"], label: "Pollo", per100g: true, kcal: 165, p: 31, c: 0, f: 3.6, fib: 0 },
  { keywords: ["ternera", "carne de vacuno", "vacuno"], label: "Ternera", per100g: true, kcal: 217, p: 26, c: 0, f: 12, fib: 0 },
  { keywords: ["cerdo", "lomo"], label: "Cerdo", per100g: true, kcal: 242, p: 27, c: 0, f: 14, fib: 0 },
  { keywords: ["salmon", "salmón"], label: "Salmón", per100g: true, kcal: 208, p: 20, c: 0, f: 13, fib: 0 },
  { keywords: ["atun", "atún"], label: "Atún", per100g: true, kcal: 130, p: 29, c: 0, f: 1, fib: 0 },
  { keywords: ["arroz"], label: "Arroz", per100g: true, kcal: 130, p: 2.7, c: 28, f: 0.3, fib: 0.4 },
  { keywords: ["pasta", "macarron", "espagueti", "espagueti"], label: "Pasta", per100g: true, kcal: 158, p: 5.8, c: 31, f: 0.9, fib: 1.8 },
  { keywords: ["patata", "papa"], label: "Patata", per100g: true, kcal: 87, p: 2, c: 20, f: 0.1, fib: 1.8 },
  { keywords: ["lenteja"], label: "Lentejas", per100g: true, kcal: 116, p: 9, c: 20, f: 0.4, fib: 8 },
  { keywords: ["garbanzo"], label: "Garbanzos", per100g: true, kcal: 164, p: 9, c: 27, f: 2.6, fib: 8 },
  { keywords: ["avena"], label: "Avena", per100g: true, kcal: 389, p: 17, c: 66, f: 7, fib: 10 },
  { keywords: ["pan"], label: "Pan", per100g: true, kcal: 265, p: 9, c: 49, f: 3.2, fib: 2.7 },
  { keywords: ["queso"], label: "Queso", per100g: true, kcal: 350, p: 25, c: 1.3, f: 27, fib: 0 },
  { keywords: ["yogur", "yogurt"], label: "Yogur", per100g: true, kcal: 61, p: 3.5, c: 4.7, f: 3.3, fib: 0 },
  { keywords: ["hamburguesa"], label: "Hamburguesa", per100g: false, unitGrams: 250, kcal: 540, p: 25, c: 40, f: 30, fib: 2 },
  { keywords: ["huevo"], label: "Huevo", per100g: false, unitGrams: 55, kcal: 78, p: 6.3, c: 0.6, f: 5.3, fib: 0 },
  { keywords: ["tostada", "tostadas"], label: "Tostada", per100g: false, unitGrams: 30, kcal: 90, p: 3, c: 16, f: 1.2, fib: 1 },
  { keywords: ["platano", "plátano", "banana"], label: "Plátano", per100g: false, unitGrams: 120, kcal: 105, p: 1.3, c: 27, f: 0.4, fib: 3.1 },
  { keywords: ["manzana"], label: "Manzana", per100g: false, unitGrams: 180, kcal: 95, p: 0.5, c: 25, f: 0.3, fib: 4.4 },
  { keywords: ["cafe con leche", "café con leche"], label: "Café con leche", per100g: false, unitGrams: 200, kcal: 60, p: 3, c: 5, f: 3, fib: 0 },
  { keywords: ["cafe", "café"], label: "Café", per100g: false, unitGrams: 60, kcal: 2, p: 0.1, c: 0, f: 0, fib: 0 },
  { keywords: ["leche"], label: "Leche", per100g: true, kcal: 42, p: 3.4, c: 5, f: 1, fib: 0 },
  { keywords: ["tomate"], label: "Tomate", per100g: true, kcal: 18, p: 0.9, c: 3.9, f: 0.2, fib: 1.2 },
  { keywords: ["aguacate"], label: "Aguacate", per100g: false, unitGrams: 150, kcal: 240, p: 3, c: 12, f: 22, fib: 10 },
  { keywords: ["ensalada"], label: "Ensalada", per100g: true, kcal: 25, p: 1.2, c: 4, f: 0.3, fib: 1.8 },
  { keywords: ["proteina", "proteína", "batido"], label: "Batido de proteína", per100g: false, unitGrams: 30, kcal: 120, p: 24, c: 3, f: 1.5, fib: 0.5 },
];

const NUMBER_WORDS: Record<string, number> = {
  un: 1, una: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, medio: 0.5, media: 0.5,
};

function round(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Estimates one food given the index where its keyword was found, reading any
 *  quantity ("180 g", "dos") from the ~24 chars before it. */
function estimateFoodAt(text: string, idx: number, def: FoodDef): DetectedFood {
  // Look at the ~24 chars before the keyword for a quantity.
  const before = text.slice(Math.max(0, idx - 24), idx);
  const gramMatch = before.match(/(\d+(?:[.,]\d+)?)\s*(kg|g|gr|gramos)/);
  const numMatch = before.match(/(\d+(?:[.,]\d+)?)\s*$/) || before.match(/\b(un|una|uno|dos|tres|cuatro|cinco|seis|medio|media)\b\s*$/);

  let grams: number;
  let quantity: string;

  if (gramMatch) {
    const value = parseFloat(gramMatch[1].replace(",", "."));
    grams = gramMatch[2] === "kg" ? value * 1000 : value;
    quantity = `${round(grams)} g`;
  } else if (!def.per100g) {
    const count = numMatch ? (NUMBER_WORDS[numMatch[1]] ?? parseFloat(numMatch[1].replace(",", "."))) : 1;
    grams = count * def.unitGrams;
    quantity = count === 1 ? "1 unidad" : `${count} uds`;
  } else {
    // A per-100g food mentioned with no quantity — assume a standard portion.
    grams = 100;
    quantity = "≈100 g";
  }

  const factor = grams / 100;
  const base = def.per100g ? 1 : 100 / def.unitGrams; // normalize per-unit defs back to per-100g
  return {
    name: def.label,
    quantity,
    calories: round(def.kcal * factor * base),
    protein: round(def.p * factor * base),
    carbs: round(def.c * factor * base),
    fat: round(def.f * factor * base),
    fiber: round(def.fib * factor * base),
  };
}

export function analyzeFoodLocally(text: string, hasPhotos: boolean): FoodAnalysis {
  const norm = text.toLowerCase();

  // Match longer keywords first and blank out each matched span in a working
  // copy, so an overlapping shorter keyword ("café", "leche") can't re-count a
  // span already claimed by a more specific one ("café con leche").
  const candidates = FOODS.flatMap((def) => def.keywords.map((keyword) => ({ def, keyword })));
  candidates.sort((a, b) => b.keyword.length - a.keyword.length);

  let working = norm;
  const matchedDefs = new Set<FoodDef>();
  const matches: { def: FoodDef; idx: number }[] = [];
  for (const { def, keyword } of candidates) {
    if (matchedDefs.has(def)) continue;
    const idx = working.indexOf(keyword);
    if (idx < 0) continue;
    matchedDefs.add(def);
    matches.push({ def, idx });
    working = working.slice(0, idx) + " ".repeat(keyword.length) + working.slice(idx + keyword.length);
  }

  const foods: DetectedFood[] = matches
    .sort((a, b) => a.idx - b.idx)
    .map(({ def, idx }) => estimateFoodAt(norm, idx, def));

  if (foods.length === 0) {
    const ask = hasPhotos
      ? "He recibido tu foto, pero en este momento el análisis por imagen necesita el entrenador en la nube activo. Mientras tanto, descríbeme brevemente qué has comido (por ejemplo: \"180 g de pollo con 200 g de arroz\") y lo registro al instante."
      : "No he podido identificar los alimentos. Dímelo con un poco más de detalle, por ejemplo: \"dos tostadas con tomate y un café con leche\" o \"180 g de pollo con arroz\".";
    return { reply: ask, meal: null };
  }

  const totals = foods.reduce(
    (acc, f) => ({
      calories: acc.calories + f.calories,
      protein: acc.protein + f.protein,
      carbs: acc.carbs + f.carbs,
      fat: acc.fat + f.fat,
      fiber: acc.fiber + f.fiber,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
  );

  const list = foods.map((f) => `${f.name} (${f.quantity})`).join(", ");
  const reply = `Registrado: ${list}. Total aproximado: ${Math.round(totals.calories)} kcal · ${round(totals.protein)}g proteína · ${round(
    totals.carbs
  )}g carbohidratos · ${round(totals.fat)}g grasa.`;

  return {
    reply,
    meal: {
      note: foods.length === 1 ? foods[0].name : "Comida",
      foods,
      calories: round(totals.calories),
      protein: round(totals.protein),
      carbs: round(totals.carbs),
      fat: round(totals.fat),
      fiber: round(totals.fiber),
    },
  };
}
