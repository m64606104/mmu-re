import type { KnowledgeBaseItem } from '../types';

export type TextSourceItem = {
  id: string;
  title: string;
  content: string;
};

export type KnowledgeChunk = {
  chunkId: string;
  itemId: string;
  title: string;
  text: string;
};

function normalizeText(s: string): string {
  return String(s || '')
    .replace(/\u0000/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function splitToParagraphs(text: string): string[] {
  const cleaned = normalizeText(text);
  if (!cleaned) return [];
  // 优先按空行切段；如果没有空行，就按单行切并再合并
  const paras = cleaned.split(/\n\s*\n+/g).map((p) => p.trim()).filter(Boolean);
  if (paras.length > 0) return paras;
  return cleaned.split('\n').map((p) => p.trim()).filter(Boolean);
}

function chunkByMaxChars(parts: string[], maxChars: number, overlapChars: number): string[] {
  const chunks: string[] = [];
  let buf = '';
  for (const p of parts) {
    const next = buf ? `${buf}\n\n${p}` : p;
    if (next.length <= maxChars) {
      buf = next;
      continue;
    }
    if (buf) chunks.push(buf);
    // 如果单段太长，硬切
    if (p.length > maxChars) {
      let i = 0;
      while (i < p.length) {
        chunks.push(p.slice(i, i + maxChars));
        i += Math.max(1, maxChars - overlapChars);
      }
      buf = '';
    } else {
      buf = p;
    }
  }
  if (buf) chunks.push(buf);
  return chunks.map((c) => normalizeText(c)).filter(Boolean);
}

export function buildTextChunks(items: TextSourceItem[], opts?: { maxChars?: number; overlapChars?: number }): KnowledgeChunk[] {
  const maxChars = opts?.maxChars ?? 700;
  const overlapChars = opts?.overlapChars ?? 120;

  const chunks: KnowledgeChunk[] = [];
  for (const item of items || []) {
    const title = (item.title || '').trim() || '未命名';
    const paragraphs = splitToParagraphs(item.content || '');
    const chunkTexts = chunkByMaxChars(paragraphs, maxChars, overlapChars);
    chunkTexts.forEach((text, idx) => {
      chunks.push({
        chunkId: `${item.id}_${idx}`,
        itemId: item.id,
        title,
        text,
      });
    });
  }
  return chunks;
}

export function buildKnowledgeChunks(items: KnowledgeBaseItem[], opts?: { maxChars?: number; overlapChars?: number }): KnowledgeChunk[] {
  return buildTextChunks(items as any, opts);
}

function tokenize(text: string): string[] {
  const t = normalizeText(text).toLowerCase();
  if (!t) return [];

  const tokens: string[] = [];
  // 英文/数字词
  const wordMatches = t.match(/[a-z0-9]{2,}/g);
  if (wordMatches) tokens.push(...wordMatches);

  // 中文/日文/韩文：用 2-gram 提升检索效果
  const cjk = t.replace(/[^\u4e00-\u9fff]/g, '');
  for (let i = 0; i < cjk.length - 1; i++) {
    tokens.push(cjk.slice(i, i + 2));
  }
  return tokens;
}

function buildTf(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  for (const tok of tokens) {
    tf.set(tok, (tf.get(tok) || 0) + 1);
  }
  return tf;
}

export function retrieveTextChunks(
  items: TextSourceItem[],
  query: string,
  opts?: { topK?: number; maxCharsPerChunk?: number; maxTotalChars?: number }
): KnowledgeChunk[] {
  const topK = opts?.topK ?? 6;
  const maxCharsPerChunk = opts?.maxCharsPerChunk ?? 900;
  const maxTotalChars = opts?.maxTotalChars ?? 2600;

  const chunks = buildTextChunks(items);
  const qTokens = tokenize(query);
  if (chunks.length === 0 || qTokens.length === 0) return [];

  const qTf = buildTf(qTokens);
  const df = new Map<string, number>();

  const chunkTfs = chunks.map((c) => {
    const toks = tokenize(`${c.title}\n${c.text}`);
    const tf = buildTf(toks);
    // df
    const seen = new Set<string>();
    for (const tok of tf.keys()) {
      if (seen.has(tok)) continue;
      seen.add(tok);
      df.set(tok, (df.get(tok) || 0) + 1);
    }
    return tf;
  });

  const N = chunks.length;
  const scoreChunk = (idx: number) => {
    const tf = chunkTfs[idx];
    let score = 0;
    for (const [tok, qCount] of qTf.entries()) {
      const dfi = df.get(tok) || 0;
      const idf = Math.log(1 + (N / (1 + dfi)));
      const tfi = tf.get(tok) || 0;
      if (tfi <= 0) continue;
      // 简单 tf-idf：query 权重 * 文档权重
      score += (1 + Math.log(qCount)) * (1 + Math.log(tfi)) * idf;
    }
    return score;
  };

  const scored = chunks
    .map((c, idx) => ({ c, idx, score: scoreChunk(idx) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(topK, 1))
    .map((x) => x.c);

  // 限制字符数，避免把 prompt 撑爆
  const out: KnowledgeChunk[] = [];
  let total = 0;
  for (const c of scored) {
    const clippedText = c.text.length > maxCharsPerChunk ? `${c.text.slice(0, maxCharsPerChunk)}…` : c.text;
    const next = { ...c, text: clippedText };
    const add = next.title.length + next.text.length + 20;
    if (out.length > 0 && total + add > maxTotalChars) break;
    out.push(next);
    total += add;
  }
  return out;
}

export function retrieveKnowledgeChunks(
  items: KnowledgeBaseItem[],
  query: string,
  opts?: { topK?: number; maxCharsPerChunk?: number; maxTotalChars?: number }
): KnowledgeChunk[] {
  return retrieveTextChunks(items as any, query, opts);
}

