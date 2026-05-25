import { prisma } from "./prisma";

type BilimItem = { title: string; summary: string | null; content: string; visibleTo: string[] };

function formatBilim(items: BilimItem[]): string {
  if (!items.length) return "";
  return items
    .map((i) => `📚 ${i.title}\n${i.summary ?? i.content.slice(0, 500)}`)
    .join("\n\n---\n\n");
}

export async function bilimBazasidanTopilsin(
  query:     string,
  agentSlug: string,
  limit = 3
): Promise<string> {
  const qTrim = query.slice(0, 60).trim();

  // Sarlavha/xulosa bo'yicha qidiruv
  if (qTrim) {
    const qidiruvNatija = await prisma.knowledgeItem.findMany({
      where: {
        type: { not: "RASM" },
        OR: [
          { title:   { contains: qTrim, mode: "insensitive" } },
          { summary: { contains: qTrim, mode: "insensitive" } },
        ],
      },
      select: { title: true, summary: true, content: true, visibleTo: true },
      orderBy: { createdAt: "desc" },
      take: limit * 3,
    });

    const visible = qidiruvNatija
      .filter((i) => i.visibleTo.length === 0 || i.visibleTo.includes(agentSlug))
      .slice(0, limit);

    if (visible.length > 0) return formatBilim(visible);
  }

  // Fallback: eng yangi ko'rinadigan hujjatlar
  const yangiler = await prisma.knowledgeItem.findMany({
    where: { type: { not: "RASM" } },
    select: { title: true, summary: true, content: true, visibleTo: true },
    orderBy: { createdAt: "desc" },
    take: limit * 3,
  });

  const fallback = yangiler
    .filter((i) => i.visibleTo.length === 0 || i.visibleTo.includes(agentSlug))
    .slice(0, limit);

  return formatBilim(fallback);
}
