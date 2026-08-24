// Minimal quote-aware CSV parser - good enough for bank statement exports
// (date, description, amount, reference columns) without pulling in a
// dependency. Not a general-purpose RFC 4180 implementation (no embedded
// newlines inside quoted fields).
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  for (const rawLine of text.split(/\r\n|\n|\r/)) {
    if (rawLine.trim() === "") continue;
    const fields: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < rawLine.length; i++) {
      const ch = rawLine[i];
      if (inQuotes) {
        if (ch === '"' && rawLine[i + 1] === '"') {
          current += '"';
          i++;
        } else if (ch === '"') {
          inQuotes = false;
        } else {
          current += ch;
        }
      } else if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        fields.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    fields.push(current.trim());
    rows.push(fields);
  }
  return rows;
}

export interface ParsedStatementLine {
  date: Date;
  description: string;
  amount: number;
  reference?: string;
}

// Expects a header row containing (case-insensitively) "date", "description"
// (or "narrative"), "amount", and optionally "reference". A single "debit"/
// "credit" column pair is also accepted in place of one signed "amount"
// column (credit = money in => positive, debit = money out => negative).
export function parseBankStatementCsv(text: string): ParsedStatementLine[] {
  const rows = parseCsv(text);
  if (rows.length < 2) throw new Error("CSV must contain a header row and at least one data row");

  const header = rows[0].map((h) => h.toLowerCase());
  const dateIdx = header.findIndex((h) => h === "date");
  const descIdx = header.findIndex((h) => h === "description" || h === "narrative");
  const amountIdx = header.findIndex((h) => h === "amount");
  const debitIdx = header.findIndex((h) => h === "debit");
  const creditIdx = header.findIndex((h) => h === "credit");
  const referenceIdx = header.findIndex((h) => h === "reference");

  if (dateIdx === -1 || descIdx === -1) {
    throw new Error('CSV header must include "date" and "description" columns');
  }
  if (amountIdx === -1 && (debitIdx === -1 || creditIdx === -1)) {
    throw new Error('CSV header must include either an "amount" column or both "debit" and "credit" columns');
  }

  return rows.slice(1).map((row, i) => {
    const dateStr = row[dateIdx];
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) throw new Error(`Row ${i + 2}: invalid date "${dateStr}"`);

    let amount: number;
    if (amountIdx !== -1) {
      amount = Number(row[amountIdx]);
    } else {
      const debit = Number(row[debitIdx] || 0);
      const credit = Number(row[creditIdx] || 0);
      amount = credit - debit;
    }
    if (Number.isNaN(amount)) throw new Error(`Row ${i + 2}: invalid amount`);

    return {
      date,
      description: row[descIdx] ?? "",
      amount: Math.round(amount * 100) / 100,
      reference: referenceIdx !== -1 ? row[referenceIdx] : undefined,
    };
  });
}
