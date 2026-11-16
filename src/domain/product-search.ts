import type { SupplierProduct } from "./types";
import { normalize, genderLabels } from "./types";
import { normalizeSize } from "./uniform-attributes";
/** Partial descriptions may omit/reorder words; product codes remain literal tokens. */
export function matchesProductQuery(product: SupplierProduct, query: string) {
  const text = normalize(
    `${product.name} ${product.code} ${product.supplier} ${product.material} ${normalizeSize(product.size)} ${genderLabels[product.gender]}`,
  );
  return normalize(query)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .every((token) => text.includes(normalize(normalizeSize(token))));
}
