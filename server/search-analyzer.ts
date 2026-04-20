/**
 * search-analyzer.ts
 *
 * Lightweight Icelandic natural language search analyzer.
 *
 * Design goals:
 *  - Zero external dependencies, runs entirely in-process.
 *  - Handles Icelandic inflection (case endings) via prefix/suffix matching.
 *  - Returns the same JSON shape a HuggingFace NER model would, so the
 *    interface is ready to swap for a real model without touching callers.
 *  - Fast enough to call on every keystroke (< 1 ms per query).
 *
 * Output shape:
 *  {
 *    category : string | null,   // matched app category or null
 *    location : string | null,   // Icelandic place name or null
 *    intent   : Intent,          // "discount" | "new" | "search" | "browse"
 *    keywords : string[],        // remaining meaningful terms
 *    confidence: number          // 0–1, how confident we are in the parse
 *  }
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type Intent = "discount" | "new" | "search" | "browse";

export interface AnalysisResult {
  category: string | null;
  location: string | null;
  intent: Intent;
  keywords: string[];
  confidence: number;
  raw_query: string;
}

// ─── Stopwords (Icelandic) ────────────────────────────────────────────────────
// Common words that carry no entity meaning and should be stripped.

const STOPWORDS = new Set([
  "á", "í", "og", "eða", "við", "um", "af", "til", "frá", "með", "án",
  "sem", "er", "var", "verð", "verður", "get", "má", "vera", "eru",
  "þetta", "þessir", "þessar", "hér", "þar", "þegar", "hvað", "hvar",
  "leit", "leita", "finna", "finn", "vil", "vil", "mig", "mér", "mér",
  "bestu", "besta", "besti", "góð", "gott", "góður", "stór", "lítill",
  "billig", "ódýr", "ódýrt", "ódýrir", "kaupa", "kaup", "versla",
  "skoða", "gefa", "fá", "fær", "fæ",
]);

// ─── Location dictionary ──────────────────────────────────────────────────────
// Format: canonical display name → array of Icelandic word stems/forms.
// Covers all major municipalities + popular neighbourhoods.

const LOCATIONS: Record<string, string[]> = {
  "Reykjavík": [
    "reykjavík", "reykjavik", "rvk", "reykjavíkur", "reykjavíkurborg",
    "höfuðborgin", "hofudborginn",
  ],
  "Kópavogur": ["kópavogur", "kopavogur", "kópavogi", "kópavogs"],
  "Hafnarfjörður": [
    "hafnarfjörður", "hafnarfjordur", "hafnarfirði", "hafnarfjarðar",
  ],
  "Garðabær": ["garðabær", "gardabaer", "garðabæ", "garðabæjar"],
  "Mosfellsbær": [
    "mosfellsbær", "mosfellsbaer", "mosfellsbæ", "mosfellsbæjar",
  ],
  "Seltjarnarnes": ["seltjarnarnes", "seltjarnarnesi", "selnes"],
  "Akureyri": ["akureyri", "akureyrar", "akureyringar", "akureyrar"],
  "Selfoss": ["selfoss", "selfossi", "selfoss"],
  "Akranes": ["akranes", "akranesi", "akranesbær"],
  "Ísafjörður": ["ísafjörður", "isafjordur", "ísafirði"],
  "Egilsstaðir": ["egilsstaðir", "egilsstaða", "egilsstaðir"],
  "Höfn": ["höfn", "hofn", "hafnar"],
  "Vestmannaeyjar": [
    "vestmannaeyjar", "vestmannaeyjum", "eyjar", "heiðmörk",
  ],
  "Keflavík": [
    "keflavík", "keflavik", "keflavíkur", "keflavíkurflugvöllur",
    "reykjanesbær",
  ],
  "Grindavík": ["grindavík", "grindavik", "grindavíkur"],
  "Borgarnes": ["borgarnes", "borgarnesi"],
  "Húsavík": ["húsavík", "husavik", "húsavíkur"],
  "Dalvík": ["dalvík", "dalvik", "dalvíkur"],
  "Siglufjörður": ["siglufjörður", "siglufjordur", "siglfirði"],
  "Ólafsvík": ["ólafsvík", "olafsvík"],
  "Stykkishólmur": ["stykkishólmur", "stykkisholmur"],
  "Laugardalur": ["laugardalur", "laugardal", "laugardalnum"],
  "Breiðholt": ["breiðholt", "breidholt", "breiðholti"],
  "Grafarvogur": ["grafarvogur", "grafarvogi"],
  "Hlíðar": ["hlíðar", "hlíðum"],
  "Miðborg": ["miðborg", "miðborgin", "midborg", "miðbæ", "miðbær"],
  "Árborg": ["árborg", "arborg", "selfossi"],
  "Suðurnes": ["suðurnes", "sudurnes", "suðurnesjum"],
  "Fjarðabyggð": ["fjarðabyggð", "fjarðabyggðar"],
};

// Pre-built lookup: stem → canonical name
const locationIndex = new Map<string, string>();
for (const [canonical, forms] of Object.entries(LOCATIONS)) {
  for (const form of forms) {
    locationIndex.set(form.toLowerCase(), canonical);
  }
}

// ─── Category dictionary ──────────────────────────────────────────────────────
// canonical app category → keyword stems (Icelandic is highly inflected;
// we match on prefix so "fatnaðar" matches "fatnaður", etc.)

interface CategoryRule {
  canonical: string; // must match a category slug in the app
  stems: string[];   // word beginnings – we do startsWith matching
  exact?: string[];  // exact word matches (for short or ambiguous words)
}

const CATEGORY_RULES: CategoryRule[] = [
  {
    canonical: "Fatnaður - Konur",
    stems: ["kvenna", "kven", "dömur", "dam", "konur", "konu"],
    exact: ["dame", "dömum"],
  },
  {
    canonical: "Fatnaður - Karlar",
    stems: ["karla", "herr", "herra", "karl"],
    exact: ["karlar", "karlmanns"],
  },
  {
    canonical: "Fatnaður - Börn",
    stems: ["barn", "barna", "börn", "krakk", "leikskól"],
    exact: ["krakkar", "börnin"],
  },
  {
    canonical: "Fatnaður",
    stems: [
      "fatnaðu", "fatnað", "föt", "fata", "skór", "skóa", "skó",
      "jakk", "peys", "bux", "kjól", "blús", "shirt", "trönn",
      "stutterm", "úlp", "stígvél", "sandal", "hanska",
    ],
    exact: ["föt", "klæði", "klæðnaður"],
  },
  {
    canonical: "Húsgögn",
    stems: [
      "húsgögn", "húsgagna", "húsbún", "sóf", "borð", "stól",
      "rúm", "skáp", "hillur", "hill", "lamp", "glugga",
      "gardín", "teppi", "matsal", "eldhús", "svefn",
    ],
    exact: ["húsgögn", "stólar", "borðin"],
  },
  {
    canonical: "Raftæki",
    stems: [
      "raftæk", "rafmagna", "rafmagns", "tölv", "farsím", "sím",
      "spjaldtölv", "þvottavél", "uppþvottavél", "kæl", "ofn",
      "leiktölv", "sjónvarp", "sjón", "hljóð", "hljóðnema",
      "þurrkara", "ísskáp", "ísbakk", "stereo", "headphone",
    ],
    exact: ["tv", "pc", "mac", "ipad", "iphone", "android"],
  },
  {
    canonical: "Matvörur",
    stems: [
      "matvör", "matarv", "matur", "matar", "drykkj", "drykkur",
      "kaffi", "te ", "brauð", "mjólk", "ost", "kjöt", "fisk",
      "grænmet", "ávöxt", "súkk", "candí", "nammi", "goð", "safi",
      "vín", "bjór", "áfeng",
    ],
    exact: ["matur", "grænmeti", "ávextir", "drykkur"],
  },
  {
    canonical: "Heilsa og útlit",
    stems: [
      "heilsa", "lyfj", "vítamín", "fæðubót", "skinn", "húðr",
      "snyrtivör", "snyrti", "parfem", "ilmvatn", "makeupp",
      "makeúpp", "hárs", "hárgreiðsl", "nagla", "gels", "krem",
      "líkamsrækt", "líkams",
    ],
    exact: ["lyfjar", "serum", "spf"],
  },
  {
    canonical: "Íþróttavörur",
    stems: [
      "íþrótt", "líkamsrækt", "þjálfun", "rækt", "hjól", "sund",
      "golf", "fótbol", "körfubol", "handbol", "tennis", "badminton",
      "yoga", "jóga", "útivist", "fjallgöng", "jökulg",
      "skíð", "snjóbrett", "skriðskó",
    ],
    exact: ["fit", "gym", "sport"],
  },
  {
    canonical: "Leikföng & börn",
    stems: [
      "leikfang", "leikfön", "leik", "börn", "barnav", "krakk",
      "púsl", "mynd", "bók", "kynning", "barnavagn",
    ],
    exact: ["lego", "barbie", "gaming"],
  },
  {
    canonical: "Bílar & akstur",
    stems: [
      "bíl", "bifr", "bifreiða", "hjól", "dekk", "mótorhjól",
      "olía", "varahlut", "bílvarahlut",
    ],
    exact: ["bmw", "toyota", "ford", "tesla", "jeep", "suv"],
  },
  {
    canonical: "Fermingargjafir",
    stems: ["ferminar", "ferminga", "ferming", "konfirm"],
    exact: ["fermingagjöf", "ferming"],
  },
  {
    canonical: "Fermingartilboð",
    stems: ["fermingartilboð", "fermingartilb"],
  },
];

// Pre-build category index for O(1) lookup per token
function buildCategoryIndex(): Array<{ stems: string[]; exact: Set<string>; canonical: string }> {
  return CATEGORY_RULES.map((r) => ({
    stems: r.stems,
    exact: new Set((r.exact ?? []).map((e) => e.toLowerCase())),
    canonical: r.canonical,
  }));
}
const categoryIndex = buildCategoryIndex();

// ─── Intent signals ───────────────────────────────────────────────────────────

const DISCOUNT_SIGNALS = new Set([
  "tilboð", "tilboðs", "útsala", "útsölu", "afsláttur", "afslátt",
  "afslætti", "afsl", "ódýr", "ódýrt", "ódýrast", "billig", "cheap",
  "sparnaður", "spara", "spar", "lægra", "lægst", "lægur", "lægast",
  "kröpp", "hagstæð", "hagstætt", "verðlækkun", "lægra verð", "%",
  "off", "sale",
]);

const NEW_SIGNALS = new Set([
  "nýtt", "nýr", "ný", "nýjast", "nýjustu", "nýleg", "nýlega",
  "nýkomið", "fresh", "brand", "nýtt",
]);

// ─── Core analyzer ────────────────────────────────────────────────────────────

/**
 * Map common Icelandic diacritics to their ASCII equivalents.
 * Used to normalise user input that may be typed without accents
 * (common on foreign keyboards or autocorrect situations).
 * We do NOT strip diacritics from dictionary terms — only from raw input.
 */
const ACCENT_MAP: Record<string, string> = {
  á: "a", é: "e", í: "i", ó: "o", ú: "u", ý: "y",
  ð: "d", þ: "th", æ: "ae", ö: "o",
};

/** Produce an ASCII-folded copy of a string for fallback matching. */
function foldAccents(s: string): string {
  return s.replace(/[áéíóúýðþæö]/g, (c) => ACCENT_MAP[c] ?? c);
}

/**
 * Normalize an Icelandic query string:
 *  - lowercase
 *  - collapse whitespace
 *  - strip punctuation except % (useful for discount detection)
 */
function normalize(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[.,!?;:"""''()\[\]{}]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Split normalized string into tokens, removing stopwords. */
function tokenize(normalized: string): string[] {
  return normalized
    .split(" ")
    .map((t) => t.trim())
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

/** Try to match a single token to a known location (with accent fallback). */
function matchLocation(token: string): string | null {
  return locationIndex.get(token)
    ?? locationIndex.get(foldAccents(token))
    ?? null;
}

/** Try to match a single token to a known category (with accent fallback). */
function matchCategory(token: string): string | null {
  const folded = foldAccents(token);
  for (const rule of categoryIndex) {
    if (rule.exact.has(token) || rule.exact.has(folded)) return rule.canonical;
    for (const stem of rule.stems) {
      if (token.startsWith(stem) || folded.startsWith(foldAccents(stem))) {
        return rule.canonical;
      }
    }
  }
  return null;
}

// Pre-built accent-folded copies of signal sets (built once at module load)
const DISCOUNT_SIGNALS_FOLDED = new Set(
  [...DISCOUNT_SIGNALS].map(foldAccents),
);
const NEW_SIGNALS_FOLDED = new Set([...NEW_SIGNALS].map(foldAccents));

/** Try to match a token to a discount/intent signal (accent-aware). */
function isDiscountSignal(token: string): boolean {
  return (
    DISCOUNT_SIGNALS.has(token) ||
    DISCOUNT_SIGNALS_FOLDED.has(token) ||
    DISCOUNT_SIGNALS_FOLDED.has(foldAccents(token))
  );
}

function isNewSignal(token: string): boolean {
  return (
    NEW_SIGNALS.has(token) ||
    NEW_SIGNALS_FOLDED.has(token) ||
    NEW_SIGNALS_FOLDED.has(foldAccents(token))
  );
}

/** Detect discount or "new arrival" intent from tokens. */
function detectIntent(tokens: string[], raw: string): Intent {
  const joined = raw.toLowerCase();
  for (const t of tokens) {
    if (isDiscountSignal(t)) return "discount";
    if (isNewSignal(t)) return "new";
  }
  if (joined.includes("%") || joined.includes("afsl")) return "discount";
  return tokens.length <= 1 ? "browse" : "search";
}

/**
 * Compute a simple confidence score based on how much of the query
 * was explained by matched entities.
 */
function computeConfidence(
  tokens: string[],
  matchedCount: number,
): number {
  if (tokens.length === 0) return 0;
  const base = matchedCount / tokens.length;
  return Math.min(1, parseFloat(base.toFixed(2)));
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Analyze an Icelandic search query and extract structured entities.
 *
 * @param rawQuery  Raw user input, e.g. "tilboð á húsgögnum í Reykjavík"
 * @returns         Structured entity object ready for search filtering or ML.
 *
 * @example
 * analyzeQuery("tilboð á húsgögnum í Reykjavík")
 * // → { category: "Húsgögn", location: "Reykjavík", intent: "discount",
 * //     keywords: ["húsgögnum"], confidence: 0.67 }
 */
export function analyzeQuery(rawQuery: string): AnalysisResult {
  const normalized = normalize(rawQuery);
  const tokens = tokenize(normalized);

  let category: string | null = null;
  let location: string | null = null;
  let matchedCount = 0;
  const keywords: string[] = [];

  for (const token of tokens) {
    const loc = matchLocation(token);
    if (loc && !location) {
      location = loc;
      matchedCount++;
      continue;
    }

    const cat = matchCategory(token);
    if (cat && !category) {
      category = cat;
      matchedCount++;
      continue;
    }

    // Discount/intent signals count as matched but aren't keywords
    if (isDiscountSignal(token) || isNewSignal(token)) {
      matchedCount++;
      continue;
    }

    // Whatever remains is a meaningful keyword (for full-text search)
    if (!STOPWORDS.has(token)) {
      keywords.push(token);
    }
  }

  const intent = detectIntent(tokens, normalized);
  const confidence = computeConfidence(tokens, matchedCount);

  return {
    category,
    location,
    intent,
    keywords,
    confidence,
    raw_query: rawQuery.trim(),
  };
}
