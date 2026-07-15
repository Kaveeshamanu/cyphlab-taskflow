import { prisma } from '../db/client'

// Matches @token where token starts with a letter — deliberately excludes
// email addresses and stray "@" characters in prose. Deduplicated and
// lowercased since mention matching is case-insensitive.
const MENTION_PATTERN = /@([a-zA-Z][a-zA-Z0-9_]*)/g

export function extractMentionTokens(body: string): string[] {
  const matches = [...body.matchAll(MENTION_PATTERN)].map((m) => m[1].toLowerCase())
  return [...new Set(matches)]
}

// Only project members (or the manager) are resolvable — you can't @mention
// someone with no access to the task, and it keeps the match set small
// enough that a first-name match is unambiguous in practice.
export async function resolveMentions(projectId: string, tokens: string[]): Promise<string[]> {
  if (!tokens.length) return []

  const candidates = await prisma.user.findMany({
    where: {
      OR: [{ projectMemberships: { some: { projectId } } }, { managedProjects: { some: { id: projectId } } }],
    },
    select: { id: true, name: true },
  })

  return candidates
    .filter((u) => tokens.includes(u.name.split(' ')[0].toLowerCase()))
    .map((u) => u.id)
}
