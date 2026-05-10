/**
 * 消息操作浮层：单层卡片 + 单一遮罩，定位由 Floating UI（flip / shift）负责。
 * 表现层只负责展示与派发 action，不包含业务状态机。
 */

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  autoUpdate,
  flip,
  offset,
  shift,
  useFloating,
} from '@floating-ui/react-dom';
import { Reply, Edit2, Trash2, CheckSquare, Share2, Bookmark, HardDrive } from 'lucide-react';
import type { MessageActionId, MessageActionItem } from '../domains/chat/messageActionsRegistry';

const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '👏'] as const;

/** 与 flip/shift 共用：避开刘海、键盘上方安全区；数值偏保守，便于审查与维护 */
const VIEWPORT_EDGE_PADDING = 16;

const ACTION_ICON: Partial<Record<MessageActionId, React.ReactNode>> = {
  quote: <Reply size={15} className="text-blue-500 shrink-0" aria-hidden />,
  favoriteVoiceCache: <HardDrive size={15} className="text-sky-600 shrink-0" aria-hidden />,
  favoriteVoiceBookmark: <Bookmark size={15} className="text-amber-600 shrink-0" aria-hidden />,
  forward: <Share2 size={15} className="text-indigo-500 shrink-0" aria-hidden />,
  edit: <Edit2 size={15} className="text-emerald-600 shrink-0" aria-hidden />,
  multiSelect: <CheckSquare size={15} className="text-violet-600 shrink-0" aria-hidden />,
  delete: <Trash2 size={15} className="text-red-500 shrink-0" aria-hidden />,
};

function resolveMessageAnchor(messageId: string): Element | null {
  const row = document.getElementById(`message-${messageId}`);
  if (!row) return null;
  const bubble = row.querySelector('[data-chat-message-bubble]');
  return bubble ?? row;
}

export type MessageActionsSurfaceProps = {
  open: boolean;
  messageId: string | null;
  items: MessageActionItem[];
  onClose: () => void;
  onAction: (id: MessageActionId) => void;
  onReact: (emoji: string) => void;
};

export const MessageActionsSurface: React.FC<MessageActionsSurfaceProps> = ({
  open,
  messageId,
  items,
  onClose,
  onAction,
  onReact,
}) => {
  const onCloseRef = useRef(onClose);
  useLayoutEffect(() => {
    onCloseRef.current = onClose;
  });

  const [referenceEl, setReferenceEl] = useState<Element | null>(null);

  const { refs, floatingStyles, isPositioned } = useFloating({
    open,
    strategy: 'fixed',
    placement: 'top',
    middleware: [
      offset(10),
      flip({ padding: VIEWPORT_EDGE_PADDING }),
      shift({ padding: VIEWPORT_EDGE_PADDING }),
    ],
    whileElementsMounted: autoUpdate,
    elements: {
      reference: referenceEl,
    },
  });

  /** 打开时绑定锚点；DOM 未就绪时短暂重试，避免首帧找不到 #message-* 直接关掉菜单 */
  useLayoutEffect(() => {
    if (!open || !messageId) {
      setReferenceEl(null);
      return;
    }

    let cancelled = false;
    let frames = 0;
    const maxFrames = 8;

    const tryBind = () => {
      if (cancelled) return;
      const el = resolveMessageAnchor(messageId);
      if (el) {
        setReferenceEl(el);
        return;
      }
      frames += 1;
      if (frames >= maxFrames) {
        setReferenceEl(null);
        onCloseRef.current();
        return;
      }
      requestAnimationFrame(tryBind);
    };

    tryBind();
    return () => {
      cancelled = true;
    };
  }, [open, messageId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  if (!open || !messageId || items.length === 0) return null;

  const primary = items.filter((i) => i.tone !== 'danger');
  const destructive = items.filter((i) => i.tone === 'danger');

  const interactive = isPositioned && referenceEl !== null;

  const runAction = (id: MessageActionId) => {
    onAction(id);
    onCloseRef.current();
  };

  const panel = (
    <div className="fixed inset-0 z-[10060] isolate pointer-events-none">
      <button
        type="button"
        className="absolute inset-0 z-0 bg-black/10 backdrop-blur-[0.5px] pointer-events-auto touch-manipulation cursor-default border-0 p-0 appearance-none"
        aria-label="关闭菜单"
        onClick={() => onCloseRef.current()}
      />

      <div
        ref={refs.setFloating}
        style={floatingStyles}
        className={[
          'z-10 w-[min(220px,calc(100vw-28px))] rounded-xl border border-white/40 bg-white/75 backdrop-blur-md shadow-lg overflow-hidden pointer-events-auto touch-manipulation transition-opacity duration-75',
          interactive ? 'opacity-100' : 'opacity-0 pointer-events-none',
        ].join(' ')}
        role="dialog"
        aria-modal="true"
        aria-label="消息操作"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-center gap-0 px-1.5 py-1.5 border-b border-gray-200/40 bg-gray-100/50">
          {REACTION_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              disabled={!interactive}
              className="text-lg min-w-[34px] min-h-[34px] rounded-lg hover:bg-white/70 active:scale-95 transition-transform flex items-center justify-center disabled:opacity-40 disabled:pointer-events-none"
              onClick={() => {
                onReact(emoji);
                onCloseRef.current();
              }}
            >
              <span aria-hidden>{emoji}</span>
              <span className="sr-only">回应 {emoji}</span>
            </button>
          ))}
        </div>

        <div className="py-0.5">
          {primary.map((item) => (
            <button
              key={item.id}
              type="button"
              disabled={!interactive}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-[13px] text-gray-900 hover:bg-gray-100/60 active:bg-gray-200/40 transition-colors disabled:opacity-40 disabled:pointer-events-none"
              onClick={() => runAction(item.id)}
            >
              {ACTION_ICON[item.id]}
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </div>

        {destructive.length > 0 ? (
          <div className="border-t border-gray-200/40 py-0.5">
            {destructive.map((item) => (
              <button
                key={item.id}
                type="button"
                disabled={!interactive}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-[13px] text-red-600 hover:bg-red-50/80 active:bg-red-100/60 transition-colors disabled:opacity-40 disabled:pointer-events-none"
                onClick={() => runAction(item.id)}
              >
                {ACTION_ICON[item.id]}
                <span className="font-medium">{item.label}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(panel, document.body);
};
