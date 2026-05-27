import { prisma } from "../lib/prisma";

// Token narxlari (USD per 1 token)
const PRICING: Record<string, { input: number; output: number }> = {
  // OpenRouter modellari
  "anthropic/claude-sonnet-4.5": { input: 0.000003,   output: 0.000015  },
  "openai/gpt-4o":               { input: 0.0000025,  output: 0.00001   },
  "openai/gpt-4o-mini":          { input: 0.00000015, output: 0.0000006 },
  // Eski Anthropic modellari (arxiv uchun)
  "claude-opus-4-7":             { input: 0.000015,   output: 0.000075  },
  "claude-opus-4-6":             { input: 0.000015,   output: 0.000075  },
  "claude-sonnet-4-6":           { input: 0.000003,   output: 0.000015  },
  "claude-haiku-4-5":            { input: 0.0000008,  output: 0.000004  },
};

const BUDGET_START = parseFloat(process.env.BUDGET_START_USD ?? "50.00");

export function calcCost(model: string, inputTokens: number, outputTokens: number): number {
  const price = PRICING[model] ?? PRICING["anthropic/claude-sonnet-4.5"];
  return (inputTokens * price.input + outputTokens * price.output);
}

export async function trackUsage(
  operation:    string,
  model:        string,
  inputTokens:  number,
  outputTokens: number
): Promise<void> {
  const costCents = calcCost(model, inputTokens, outputTokens) * 100;
  await prisma.usageLog.create({
    data: { operation, model, inputTokens, outputTokens, costCents },
  }).catch(() => {}); // DB xato bo'lsa dashboard buzilmasin
}

export async function getBudgetStats() {
  const logs = await prisma.usageLog.findMany({
    select: { costCents: true, model: true, operation: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  const totalSpentCents = logs.reduce((s, l) => s + l.costCents, 0);
  const totalSpentUsd   = totalSpentCents / 100;
  const remainingUsd    = Math.max(0, BUDGET_START - totalSpentUsd);
  const usedPercent     = Math.min(100, (totalSpentUsd / BUDGET_START) * 100);

  // Oxirgi 10 ta operatsiya
  const recent = logs.slice(0, 10).map((l) => ({
    operation:  l.operation,
    model:      l.model,
    costCents:  l.costCents,
    createdAt:  l.createdAt,
  }));

  return {
    budgetStartUsd: BUDGET_START,
    totalSpentUsd:  Math.round(totalSpentUsd * 10000) / 10000,
    remainingUsd:   Math.round(remainingUsd  * 10000) / 10000,
    usedPercent:    Math.round(usedPercent * 10) / 10,
    totalOperations: logs.length,
    recent,
  };
}
