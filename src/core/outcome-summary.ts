const DEFAULT_PROMPT_OUTCOME_MAX_CHARS = 4000;

function truncateAtBoundary(text: string, maxChars: number, suffix: string = '...'): string {
  if (text.length <= maxChars) {
    return text;
  }

  const limit = Math.max(0, maxChars - suffix.length);
  const truncated = text.slice(0, limit);
  const lastNewline = truncated.lastIndexOf('\n');
  const lastSentence = truncated.lastIndexOf('. ');
  const breakPoint = Math.max(lastNewline, lastSentence);

  if (breakPoint > Math.floor(limit / 2)) {
    return truncated.slice(0, breakPoint + 1).trimEnd() + suffix;
  }

  return truncated.trimEnd() + suffix;
}

function normalizeMarkdown(text: string): string {
  return text
    .replace(/<promise>(COMPLETE|FAILED|BLOCKED)<\/promise>/gi, '')
    .replace(/\r\n/g, '\n')
    .trim();
}

export function extractMarkdownSection(content: string, heading: string): string | null {
  const normalized = normalizeMarkdown(content);
  const lines = normalized.split('\n');
  const headingLine = `## ${heading}`;
  const startIndex = lines.findIndex((line) => line.trim() === headingLine);

  if (startIndex === -1) {
    return null;
  }

  const sectionLines: string[] = [];
  for (let i = startIndex + 1; i < lines.length; i++) {
    const line = lines[i] ?? '';
    if (/^## /.test(line) || /^# /.test(line)) {
      break;
    }
    sectionLines.push(line);
  }

  const section = sectionLines.join('\n').trim();
  return section || null;
}

function extractFirstMeaningfulBlock(content: string): string | null {
  const normalized = normalizeMarkdown(content);
  const blocks = normalized
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);

  for (const block of blocks) {
    if (/^---+$/.test(block)) {
      continue;
    }
    if (/^#/.test(block)) {
      continue;
    }
    return block;
  }

  return null;
}

function sectionToItems(section: string | null): string[] {
  if (!section) {
    return [];
  }

  const lines = section
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const items: string[] = [];
  let paragraphBuffer: string[] = [];

  const flushParagraph = (): void => {
    if (paragraphBuffer.length === 0) {
      return;
    }
    items.push(paragraphBuffer.join(' ').trim());
    paragraphBuffer = [];
  };

  for (const line of lines) {
    const bulletMatch = line.match(/^[-*]\s+(.*)$/);
    const numberedMatch = line.match(/^\d+\.\s+(.*)$/);

    if (bulletMatch?.[1]) {
      flushParagraph();
      items.push(bulletMatch[1].trim());
      continue;
    }

    if (numberedMatch?.[1]) {
      flushParagraph();
      items.push(numberedMatch[1].trim());
      continue;
    }

    if (/^[A-Z][^:]{0,80}:\s+/.test(line)) {
      flushParagraph();
      items.push(line);
      continue;
    }

    paragraphBuffer.push(line);
  }

  flushParagraph();

  return items.filter(Boolean);
}

export function summarizeOutcome(content: string, maxChars: number = DEFAULT_PROMPT_OUTCOME_MAX_CHARS): string {
  if (content.length <= maxChars) {
    return content;
  }

  const normalized = normalizeMarkdown(content);
  const summary = extractMarkdownSection(normalized, 'Summary');
  if (summary && summary.length <= maxChars) {
    return `## Summary\n\n${summary}\n\n*[Outcome truncated for context size]*`;
  }

  return `${truncateAtBoundary(normalized, maxChars, '')}\n\n*[Outcome truncated for context size]*`.trim();
}

export function extractOutcomeSummary(content: string, maxChars: number): string {
  const summary = extractMarkdownSection(content, 'Summary') ?? extractFirstMeaningfulBlock(content) ?? 'No summary recorded.';
  return truncateAtBoundary(summary.replace(/\s+/g, ' ').trim(), maxChars);
}

export function extractDecisionItems(content: string): string[] {
  return [
    ...sectionToItems(extractMarkdownSection(content, 'Key Decisions')),
    ...sectionToItems(extractMarkdownSection(content, 'Decision Updates')),
  ];
}
