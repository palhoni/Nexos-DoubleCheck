import { InternalServerErrorException } from '@nestjs/common';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export interface AgentDefinition {
  agentId: string;
  name: string;
  description?: string;
  declaredTools: string[];
  model?: string;
  /** Corpo do arquivo após o frontmatter — é isso, e só isso, que vai para o modelo. */
  systemPrompt: string;
  sourcePath: string;
}

const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

function parseFrontmatter(raw: string): {
  frontmatter: Record<string, string>;
  body: string;
} {
  const match = FRONTMATTER_PATTERN.exec(raw);
  if (!match) return { frontmatter: {}, body: raw };

  const frontmatter: Record<string, string> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const separatorIndex = line.indexOf(':');
    if (separatorIndex < 0) continue;
    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    if (key) frontmatter[key] = value;
  }
  return { frontmatter, body: raw.slice(match[0].length) };
}

/**
 * Resolve o caminho de um agent, preferindo a definição no formato Claude Code
 * (.claude/agents/<id>.md, com frontmatter) e caindo para o markdown legado do
 * pacote GitHub Copilot (agents/.github/agents/<id>.md, sem frontmatter) enquanto
 * a conversão dos 9 agents não estiver concluída.
 */
export function loadAgentDefinition(agentId: string): AgentDefinition {
  const candidates = [
    resolve(process.cwd(), '.claude', 'agents', `${agentId}.md`),
    resolve(process.cwd(), '..', '..', '.claude', 'agents', `${agentId}.md`),
    resolve(process.cwd(), 'agents', '.github', 'agents', `${agentId}.md`),
    resolve(
      process.cwd(),
      '..',
      '..',
      'agents',
      '.github',
      'agents',
      `${agentId}.md`,
    ),
  ];
  const sourcePath = candidates.find((candidate) => existsSync(candidate));
  if (!sourcePath) {
    throw new InternalServerErrorException(
      `Definição do agent "${agentId}" não encontrada em .claude/agents/.`,
    );
  }

  const raw = readFileSync(sourcePath, 'utf8');
  const { frontmatter, body } = parseFrontmatter(raw);

  return {
    agentId,
    name: frontmatter.name || agentId,
    description: frontmatter.description,
    declaredTools: frontmatter.tools
      ? frontmatter.tools
          .split(',')
          .map((tool) => tool.trim())
          .filter(Boolean)
      : [],
    model: frontmatter.model,
    systemPrompt: body.trim(),
    sourcePath,
  };
}
