/** Lowercase, no accents, only [a-z0-9] and single spaces. */
export function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function tokenize(text: string): string[] {
  const normalized = normalize(text);
  return normalized ? normalized.split(" ") : [];
}

/** Suffixes that turn a model into a different device: "iPhone 15" ≠ "iPhone 15 Pro". */
const VARIANT_SUFFIXES = new Set([
  "pro", "max", "plus", "ultra", "lite", "neo", "mini", "fe", "power", "play", "stylus", "fusion", "prime", "edge", "turbo",
]);

/** A leading brand is optional in titles ("Motorola Moto G85" matches "Moto G85 review"). */
const KNOWN_BRANDS = new Set([
  "motorola", "samsung", "apple", "xiaomi", "realme", "oppo", "vivo", "asus", "google",
  "oneplus", "nokia", "lg", "sony", "huawei", "honor", "infinix", "tecno", "nothing",
]);

const NETWORK_TOKENS = new Set(["4g", "5g"]);

function modelTokens(model: string): string[] {
  const tokens = tokenize(model).filter((token) => !NETWORK_TOKENS.has(token));
  const startsWithBrand = tokens.length > 1 && KNOWN_BRANDS.has(tokens[0]!);
  return startsWithBrand ? tokens.slice(1) : tokens;
}

/** Merges split letter+number pairs ("g 85" -> "g85") when the merged form is a model token. */
function mergeSplitTokens(titleTokens: string[], wanted: Set<string>): string[] {
  const merged: string[] = [];
  for (let index = 0; index < titleTokens.length; index++) {
    const current = titleTokens[index]!;
    const next = titleTokens[index + 1];
    const canMerge = next !== undefined && /^[a-z]+$/.test(current) && /^\d+[a-z]*$/.test(next) && wanted.has(current + next);
    if (canMerge) {
      merged.push(current + next);
      index++;
    } else {
      merged.push(current);
    }
  }
  return merged;
}

/**
 * True when the title is about this exact model:
 * - all model tokens appear in sequence (accepts "g85" and "g 85");
 * - the following token is not a variant suffix the model lacks;
 * - tokens are whole words, so "g85" ≠ "g850" and "a55" ≠ "a55s".
 */
export function titleMatchesModel(title: string, model: string): boolean {
  const wanted = modelTokens(model);
  if (!wanted.length) return false;
  const wantedSet = new Set(wanted);
  const titleTokens = mergeSplitTokens(tokenize(title), wantedSet);

  for (let start = 0; start + wanted.length <= titleTokens.length; start++) {
    const matchesHere = wanted.every((token, offset) => titleTokens[start + offset] === token);
    if (!matchesHere) continue;
    const following = titleTokens[start + wanted.length];
    const isOtherVariant = following !== undefined && VARIANT_SUFFIXES.has(following) && !wantedSet.has(following);
    return !isOtherVariant;
  }
  return false;
}

/** Returns the terms found as whole words/phrases in an already normalized text. */
export function findTerms(normalizedText: string, terms: readonly string[]): string[] {
  const padded = ` ${normalizedText} `;
  return terms.filter((term) => padded.includes(` ${normalize(term)} `));
}
