import DOMPurify from 'dompurify';
import { marked } from 'marked';

marked.setOptions({ gfm: true, breaks: true });

let linkAttrsHookInstalled = false;

function ensureExternalLinkHook(): void {
  if (linkAttrsHookInstalled || typeof window === 'undefined') return;
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName !== 'A') return;
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noopener noreferrer');
  });
  linkAttrsHookInstalled = true;
}

const ALLOWED_TAGS = [
  'p',
  'br',
  'strong',
  'em',
  'b',
  'i',
  'del',
  's',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'ul',
  'ol',
  'li',
  'blockquote',
  'code',
  'pre',
  'a',
  'hr',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
];

/**
 * 助手气泡内 Markdown（**、##、列表、代码块等）→ 经 DOMPurify 限制标签后的 HTML。
 * 用户消息仍用纯文本，避免把星号/下划线误解析为强调。
 */
export function assistantMarkdownToSafeHtml(raw: string): string {
  ensureExternalLinkHook();
  const html = marked(raw, { async: false });
  if (typeof html !== 'string') return '';
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR: ['href', 'title', 'target', 'rel', 'colspan', 'rowspan'],
    ALLOW_DATA_ATTR: false,
  });
}

/** 与 `assistantMarkdownToSafeHtml` 搭配用于聊天气泡的 Tailwind 修饰 */
export const assistantChatMarkdownBodyClassName =
  'chat-md [&_p]:my-1.5 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_h1]:text-base [&_h1]:font-semibold [&_h1]:mt-2 [&_h1]:mb-1 [&_h2]:text-[15px] [&_h2]:font-semibold [&_h2]:mt-2 [&_h2]:mb-1 [&_h3]:text-[14px] [&_h3]:font-semibold [&_h3]:mt-1.5 [&_h3]:mb-0.5 [&_ul]:my-1.5 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-1.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5 [&_blockquote]:my-2 [&_blockquote]:border-l-2 [&_blockquote]:border-gray-300 [&_blockquote]:pl-3 [&_blockquote]:text-gray-600 [&_code]:rounded [&_code]:bg-black/[0.06] [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[13px] [&_code]:font-normal [&_pre]:my-2 [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-black/[0.06] [&_pre]:p-2 [&_pre]:text-[13px] [&_a]:text-sky-600 [&_a]:underline [&_table]:my-2 [&_table]:w-full [&_table]:text-left [&_table]:text-[13px] [&_th]:border [&_th]:border-gray-200 [&_th]:bg-gray-50 [&_th]:px-2 [&_th]:py-1 [&_td]:border [&_td]:border-gray-200 [&_td]:px-2 [&_td]:py-1';
