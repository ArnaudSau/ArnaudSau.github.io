export interface ParsedHolding {
  ticker: string;
  name: string;
  isin?: string;
  quantity: number;
  averagePurchasePrice: number;
  sector?: string;
  geographicZone?: string;
}

type BrokerFormat = "FORTUNEO" | "BOURSOBANK" | "UNKNOWN";

function detectBrokerFormat(headers: string[]): BrokerFormat {
  const headerStr = headers.join(",").toLowerCase();

  if (
    headerStr.includes("libellé") &&
    headerStr.includes("quantité") &&
    headerStr.includes("pru")
  ) {
    if (headerStr.includes("valorisation")) return "FORTUNEO";
    return "BOURSOBANK";
  }

  if (headerStr.includes("isin") && headerStr.includes("quantity")) {
    return "FORTUNEO";
  }

  return "UNKNOWN";
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if ((char === "," || char === ";") && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function parseNumber(value: string): number {
  // Handle French number format (1 234,56)
  const cleaned = value
    .replace(/\s/g, "")
    .replace(",", ".")
    .replace(/[^0-9.\-]/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function parseFortuneoCSV(lines: string[], headers: string[]): ParsedHolding[] {
  const holdings: ParsedHolding[] = [];
  const headerLower = headers.map((h) => h.toLowerCase().trim());

  const nameIdx = headerLower.findIndex(
    (h) => h.includes("libellé") || h.includes("libelle") || h.includes("name")
  );
  const isinIdx = headerLower.findIndex((h) => h.includes("isin") || h.includes("code"));
  const qtyIdx = headerLower.findIndex(
    (h) => h.includes("quantité") || h.includes("quantite") || h.includes("quantity") || h.includes("qté")
  );
  const pruIdx = headerLower.findIndex(
    (h) => h.includes("pru") || h.includes("prix") || h.includes("price") || h.includes("pmp")
  );

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    if (cols.length < Math.max(nameIdx, qtyIdx, pruIdx) + 1) continue;

    const name = cols[nameIdx] || "";
    if (!name) continue;

    holdings.push({
      ticker: cols[isinIdx] || name.substring(0, 10).toUpperCase(),
      name,
      isin: isinIdx >= 0 ? cols[isinIdx] : undefined,
      quantity: parseNumber(cols[qtyIdx]),
      averagePurchasePrice: parseNumber(cols[pruIdx]),
    });
  }

  return holdings;
}

function parseBoursobankCSV(lines: string[], headers: string[]): ParsedHolding[] {
  // Boursobank format is similar but with slightly different column names
  return parseFortuneoCSV(lines, headers);
}

function parseGenericCSV(lines: string[], headers: string[]): ParsedHolding[] {
  // Try to parse any CSV with common financial column names
  return parseFortuneoCSV(lines, headers);
}

export function parseCSV(content: string): {
  holdings: ParsedHolding[];
  broker: BrokerFormat;
  errors: string[];
} {
  const errors: string[] = [];
  const lines = content
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) {
    return { holdings: [], broker: "UNKNOWN", errors: ["Le fichier CSV est vide ou invalide."] };
  }

  const headers = parseCSVLine(lines[0]);
  const broker = detectBrokerFormat(headers);

  let holdings: ParsedHolding[];

  switch (broker) {
    case "FORTUNEO":
      holdings = parseFortuneoCSV(lines, headers);
      break;
    case "BOURSOBANK":
      holdings = parseBoursobankCSV(lines, headers);
      break;
    default:
      holdings = parseGenericCSV(lines, headers);
      if (holdings.length === 0) {
        errors.push(
          "Format de courtier non reconnu. Assurez-vous que le CSV contient des colonnes : Libellé, Quantité, PRU."
        );
      }
  }

  return { holdings, broker, errors };
}
