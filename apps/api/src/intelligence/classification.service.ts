import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

const STOPWORDS = new Set([
  "the", "a", "an", "of", "for", "to", "and", "or", "on", "in", "at", "from", "with", "by", "invoice", "payment",
]);

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length > 1 && !STOPWORDS.has(t)),
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const token of a) if (b.has(token)) intersection++;
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export type ClassificationRisk = "low" | "medium" | "high";
export type ClassificationAction = "AUTO_POST_PERMITTED" | "ESCALATE_TO_REVIEW";

export interface AccountSuggestion {
  accountId: string;
  accountCode: string;
  accountName: string;
  confidence: number;
  evidence: string;
  risk: ClassificationRisk;
  action: ClassificationAction;
  precedentCount: number;
}

// AI Classification v1 (SRS 37 Financial Analysis/Accounting agents, SRS
// 39 confidence system). This is a deliberately honest v1: a
// frequency/similarity heuristic over this client's own posting history,
// not a trained model or an LLM call - there is no ML runtime or LLM API
// wired into the app process. It still produces the same *shape* of
// output SRS 39 asks for (confidence, evidence, risk, recommended action)
// so a future model-backed agent can be dropped in as a strict upgrade
// without changing callers.
@Injectable()
export class ClassificationService {
  constructor(private readonly prisma: PrismaService) {}

  async suggestAccount(clientId: string, description: string): Promise<AccountSuggestion | null> {
    const inputTokens = tokenize(description);
    if (inputTokens.size === 0) return null;

    const historicalLines = await this.prisma.journalLine.findMany({
      where: {
        journal: { clientId, status: { in: ["POSTED", "REVERSED"] } },
        description: { not: null },
      },
      select: { description: true, accountId: true },
      orderBy: { id: "desc" },
      take: 1000,
    });
    if (historicalLines.length === 0) return null;

    // For each account that has ever been used, track the single most
    // similar prior description (bestSimilarity/sampleDescription) and how
    // many prior lines matched this description at all (count) - the
    // former drives confidence, the latter is the frequency signal.
    const byAccount = new Map<string, { bestSimilarity: number; count: number; sampleDescription: string }>();
    for (const line of historicalLines) {
      const similarity = jaccard(inputTokens, tokenize(line.description!));
      if (similarity === 0) continue;

      const existing = byAccount.get(line.accountId);
      if (!existing) {
        byAccount.set(line.accountId, { bestSimilarity: similarity, count: 1, sampleDescription: line.description! });
      } else {
        existing.count++;
        if (similarity > existing.bestSimilarity) {
          existing.bestSimilarity = similarity;
          existing.sampleDescription = line.description!;
        }
      }
    }
    if (byAccount.size === 0) return null;

    const [bestAccountId, best] = [...byAccount.entries()].sort(
      (a, b) => b[1].bestSimilarity - a[1].bestSimilarity || b[1].count - a[1].count,
    )[0];

    const account = await this.prisma.chartOfAccount.findUnique({ where: { id: bestAccountId } });
    if (!account) return null;

    // Similarity drives most of the confidence; a small frequency bonus
    // rewards accounts with many consistent precedents, capped so the
    // score never claims certainty a keyword heuristic can't back up.
    const frequencyBonus = Math.min(0.1, best.count * 0.02);
    const confidence = Math.min(0.95, Math.round((best.bestSimilarity * 0.85 + frequencyBonus) * 100) / 100);

    const risk: ClassificationRisk = confidence >= 0.85 ? "low" : confidence >= 0.5 ? "medium" : "high";
    const action: ClassificationAction = risk === "low" && best.count >= 3 ? "AUTO_POST_PERMITTED" : "ESCALATE_TO_REVIEW";

    return {
      accountId: account.id,
      accountCode: account.code,
      accountName: account.name,
      confidence,
      evidence: `${best.count} prior posting(s) with similar description (e.g. "${best.sampleDescription}")`,
      risk,
      action,
      precedentCount: best.count,
    };
  }
}
