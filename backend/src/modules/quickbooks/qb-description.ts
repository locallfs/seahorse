// ---------------------------------------------------------------------------
// The QuickBooks Description is a SEPARATE field from the website description.
//
//   Website Description  = product.description (long, HTML, marketing copy).
//                          NEVER sent to QuickBooks. NEVER overwritten by
//                          QuickBooks.
//   QuickBooks Description = product.metadata.quickbooks_description — a
//                          short optional plain-text line used ONLY on
//                          QuickBooks invoices/receipts/sales forms.
//
// Blank is the normal default: when the QuickBooks Description is blank, the
// QuickBooks item Description stays blank. There is NO fallback to the
// website description, product title, or any other website content.
// ---------------------------------------------------------------------------

export const QB_DESCRIPTION_METADATA_KEY = "quickbooks_description"
export const QB_DESCRIPTION_MAX = 120

// Plain text only: strip HTML tags, collapse every run of whitespace
// (including newlines — the field is single-line) to one space, trim, and
// cap at 120 characters.
export function sanitizeQbDescription(input: unknown): string {
  if (typeof input !== "string") return ""
  return input
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, QB_DESCRIPTION_MAX)
    .trim()
}

// What Medusa→QBO payloads carry as the item Description: the sanitized
// QuickBooks Description, or NOTHING when it is blank (undefined = the
// Description field is omitted from the payload entirely).
export function qbDescriptionForPayload(
  metadata: Record<string, unknown> | null | undefined
): string | undefined {
  const clean = sanitizeQbDescription(metadata?.[QB_DESCRIPTION_METADATA_KEY])
  return clean ? clean : undefined
}

// QBO→Medusa: whether an incoming QuickBooks item Description should be
// written into the separate QuickBooks Description field. It NEVER touches
// the website description, and a BLANK QuickBooks description never erases
// anything (a blank in QBO carries no information — e.g. right after the
// one-time cleanup, or before a push has happened).
export function decideQboDescriptionImport(
  qboDescription: unknown,
  currentQbDescription: unknown
): { write: false } | { write: true; value: string } {
  const incoming = sanitizeQbDescription(qboDescription)
  if (!incoming) return { write: false }
  const current = sanitizeQbDescription(currentQbDescription)
  if (incoming === current) return { write: false }
  return { write: true, value: incoming }
}
