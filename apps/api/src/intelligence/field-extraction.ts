// Regex-based field extraction from raw document text (SRS 40 "OCR
// pipeline", v1: text-based PDFs only, no image OCR - see
// docs/ARCHITECTURE.md). Each field found contributes to the confidence
// score, in the AI Confidence System's spirit (SRS 39): a partial,
// low-confidence extraction should say so, not pretend certainty.

export interface ExtractedFields {
  amount?: number;
  date?: string;
  invoiceNumber?: string;
  taxNumber?: string;
}

const AMOUNT_LABEL_RE = /(?:total|amount due|grand total|balance due)\s*[:\-]?\s*(?:SAR|USD|\$|EGP|AED)?\s*([\d,]+\.\d{2})/i;
const AMOUNT_ANY_RE = /\b\d{1,3}(?:,\d{3})*\.\d{2}\b/g;
const DATE_ISO_RE = /\b(\d{4}-\d{2}-\d{2})\b/;
const DATE_SLASH_RE = /\b(\d{1,2}\/\d{1,2}\/\d{2,4})\b/;
const INVOICE_NUMBER_RE = /invoice\s*(?:no\.?|number|#)?\s*[:\-]?\s*([A-Za-z0-9\-\/]{2,})/i;
const TAX_NUMBER_RE = /\b(?:VAT|tax)\s*(?:reg(?:istration)?)?\s*(?:no\.?|number)?\s*[:\-]?\s*(\d{10,15})\b/i;

export function extractFields(text: string): { fields: ExtractedFields; confidence: number } {
  const fields: ExtractedFields = {};
  let hits = 0;
  const possible = 4;

  const labeledAmount = text.match(AMOUNT_LABEL_RE);
  if (labeledAmount) {
    fields.amount = parseFloat(labeledAmount[1].replace(/,/g, ""));
    hits++;
  } else {
    const allAmounts = [...text.matchAll(AMOUNT_ANY_RE)].map((m) => parseFloat(m[0].replace(/,/g, "")));
    if (allAmounts.length > 0) {
      // Unlabeled match is weaker evidence - the largest figure on an
      // invoice/receipt is usually (not always) the total.
      fields.amount = Math.max(...allAmounts);
      hits += 0.5;
    }
  }

  const isoDate = text.match(DATE_ISO_RE);
  const slashDate = text.match(DATE_SLASH_RE);
  if (isoDate) {
    fields.date = isoDate[1];
    hits++;
  } else if (slashDate) {
    fields.date = slashDate[1];
    hits++;
  }

  const invoiceNumber = text.match(INVOICE_NUMBER_RE);
  if (invoiceNumber) {
    fields.invoiceNumber = invoiceNumber[1];
    hits++;
  }

  const taxNumber = text.match(TAX_NUMBER_RE);
  if (taxNumber) {
    fields.taxNumber = taxNumber[1];
    hits++;
  }

  // Regex extraction is never fully certain even with every field found -
  // cap below 100% so downstream consumers always know a human should spot
  // check it (SRS 67: "identify uncertainty").
  const confidence = Math.min(0.95, Math.round((hits / possible) * 100) / 100);
  return { fields, confidence };
}
