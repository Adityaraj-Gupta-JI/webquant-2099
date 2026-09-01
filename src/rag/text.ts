// ── Shared text processing. Deterministic, dependency-free. ──────────────────

const STOPWORDS = new Set([
  'a','an','the','and','or','but','if','of','to','in','on','for','with','as','by',
  'at','from','is','are','was','were','be','been','being','it','its','this','that',
  'these','those','has','have','had','will','would','can','could','should','may',
  'might','do','does','did','not','no','than','then','there','their','we','our',
  'you','your','they','them','he','she','his','her','about','into','over','under',
  'company','companys',
  // Interrogative and framing words carry no retrieval signal but, left in,
  // they dominate a short query's vector.
  'what','which','how','why','when','who','whose','say','said','tell','give',
  'latest','recent','any','all','most','more','other','also','such','per',
]);

/** Light suffix stripping. Not a linguistic stemmer — enough to collapse the
 *  plural/participle variants that dominate financial prose. */
export function stem(word: string): string {
  let w = word;
  if (w.length > 5 && w.endsWith('ies')) return `${w.slice(0, -3)}y`;
  if (w.length > 4 && w.endsWith('es')) {
    const before = w[w.length - 3];
    // "businesses" -> "business", but "disclosures" -> "disclosure".
    return 'sxzh'.includes(before) ? w.slice(0, -2) : w.slice(0, -1);
  }
  for (const suf of ['ations', 'ation', 'ments', 'ment', 'ings', 'ing', 'ers', 'ed', 's']) {
    if (w.length > suf.length + 3 && w.endsWith(suf)) {
      w = w.slice(0, -suf.length);
      break;
    }
  }
  return w;
}

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9%.\s-]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t))
    .map(stem)
    .filter((t) => t.length > 1);
}

/** Finance concept lexicon. Query expansion is what lets "business risks" reach
 *  a section headed "Risk Factors" — the closest this local index gets to
 *  semantic matching, and it is transparent rather than opaque. */
const CONCEPTS: Record<string, string[]> = {
  risk: ['risk', 'expos', 'uncertainti', 'headwind', 'advers', 'threat', 'vulner', 'factor'],
  margin: ['margin', 'profit', 'cost', 'pricing', 'realis', 'spread', 'ebitda'],
  growth: ['growth', 'grew', 'increas', 'expand', 'revenu', 'topline', 'acceler'],
  revenu: ['revenu', 'sale', 'income', 'turnov', 'topline'],
  debt: ['debt', 'leverag', 'borrow', 'gear', 'liabil', 'obligat'],
  regulatori: ['regulatori', 'sebi', 'complianc', 'disclosur', 'circular', 'statutori'],
  demand: ['demand', 'order', 'pipelin', 'book', 'mandat', 'deal'],
  compet: ['compet', 'rival', 'pricing', 'market-shar'],
  capex: ['capex', 'capit', 'invest', 'expenditur', 'outlay'],
  attrit: ['attrit', 'headcount', 'employe', 'talent', 'wage'],
  guidanc: ['guidanc', 'outlook', 'forecast', 'expect', 'project'],
  liquid: ['liquid', 'cash', 'flow', 'fund', 'deposit'],
  currenc: ['currenc', 'fx', 'forex', 'rupe', 'hedg'],
};

/** Returns only the terms added by expansion, never the originals — the caller
 *  weights them lower, because a synonym is weaker evidence than the word the
 *  user actually typed. */
export function expansionTerms(tokens: string[]): string[] {
  const original = new Set(tokens);
  const out = new Set<string>();
  for (const t of tokens) {
    for (const [key, syns] of Object.entries(CONCEPTS)) {
      if (t === key || t.startsWith(key) || syns.includes(t)) {
        for (const s of syns) if (!original.has(s)) out.add(s);
      }
    }
  }
  return [...out];
}

export function expandQuery(tokens: string[]): string[] {
  return [...new Set([...tokens, ...expansionTerms(tokens)])];
}

/** Stable 32-bit hash — the basis of the hashing trick used for embeddings. */
export function hash32(s: string, seed = 0x9e3779b9): number {
  let h = seed >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}
