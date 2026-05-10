import { X, Plus, Pencil, Trash2 } from 'lucide-react';
import type { Conversation } from '../types';
import {
  ensurePrivateSessions,
  groupSessionsByRecency,
  createPrivateSession,
  switchPrivateSession,
  renamePrivateSession,
  deletePrivateSession,
  PRIVATE_NEW_SESSION_TITLE,
} from '../utils/privateChatSessions';

type Props = {
  open: boolean;
  onClose: () => void;
  conversation: Conversation;
  onUpdateConversation: (id: string, updates: Partial<Conversation>) => void;
};

export default function PrivateChatSessionDrawer({
  open,
  onClose,
  conversation,
  onUpdateConversation,
}: Props) {
  if (!open || conversation.type !== 'private') return null;

  const conv = ensurePrivateSessions(conversation);
  const sessions = conv.privateSessions || [];
  const activeId = conv.activePrivateSessionId || sessions[0]?.id;
  const grouped = groupSessionsByRecency(sessions);

  const handleNew = () => {
    const patch = createPrivateSession(conv);
    onUpdateConversation(conv.id, patch);
  };

  const handleSwitch = (sessionId: string) => {
    if (sessionId === activeId) {
      onClose();
      return;
    }
    const patch = switchPrivateSession(conv, sessionId);
    if (patch) onUpdateConversation(conv.id, patch);
    onClose();
  };

  const handleRename = (sessionId: string, currentTitle: string) => {
    const next = window.prompt('会话名称', currentTitle);
    if (next === null) return;
    const patch = renamePrivateSession(conv, sessionId, next);
    if (patch) onUpdateConversation(conv.id, patch);
  };

  const handleDelete = (sessionId: string, title: string) => {
    if (sessions.length <= 1) {
      window.alert('至少保留一个会话');
      return;
    }
    if (!window.confirm(`删除会话「${title}」？消息将无法恢复。`)) return;
    const patch = deletePrivateSession(conv, sessionId);
    if (patch) onUpdateConversation(conv.id, patch);
    else window.alert('至少保留一个会话');
  };

  return (
    <div className="fixed inset-0 z-[60] flex">
      <button
        type="button"
        className="flex-1 bg-black/45 backdrop-blur-[1px]"
        aria-label="关闭会话列表"
        onClick={onClose}
      />
      <div className="relative flex h-full w-[min(100%,380px)] flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <div>
            <h2 className="text-base font-semibold text-gray-900">会话</h2>
            <p className="text-[11px] text-gray-500">按话题分开聊天，角色与记忆不变</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 hover:bg-gray-100"
            aria-label="关闭"
          >
            <X className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        <div className="border-b border-gray-50 px-3 py-2">
          <button
            type="button"
            onClick={handleNew}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Plus className="h-4 w-4" />
            新建会话
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
          {grouped.map(({ label, items }) => (
            <div key={label} className="mb-4">
              <div className="sticky top-0 z-[1] bg-white/95 px-2 py-1.5 text-[11px] font-medium uppercase tracking-wide text-gray-400">
                {label}
              </div>
              <ul className="space-y-1">
                {items.map((s) => {
                  const isActive = s.id === activeId;
                  const preview =
                    [...s.messages].reverse().find((m) => m.role === 'user' || m.role === 'assistant')
                      ?.content || '';
                  const snippet =
                    preview.replace(/\s+/g, ' ').trim().slice(0, 42) +
                    (preview.length > 42 ? '…' : '');
                  return (
                    <li key={s.id}>
                      <div
                        className={`flex items-start gap-1 rounded-xl px-2 py-2 ${
                          isActive ? 'bg-gray-100' : 'hover:bg-gray-50'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => handleSwitch(s.id)}
                          className="min-w-0 flex-1 text-left"
                        >
                          <div className="truncate text-[15px] font-medium text-gray-900">
                            {s.title || PRIVATE_NEW_SESSION_TITLE}
                          </div>
                          {snippet ? (
                            <div className="mt-0.5 truncate text-xs text-gray-500">{snippet}</div>
                          ) : (
                            <div className="mt-0.5 text-xs text-gray-400">空会话</div>
                          )}
                        </button>
                        <div className="flex shrink-0 gap-0.5 pt-0.5">
                          <button
                            type="button"
                            title="重命名"
                            className="rounded-lg p-1.5 text-gray-500 hover:bg-white hover:text-gray-800"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRename(s.id, s.title);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            title="删除"
                            disabled={sessions.length <= 1}
                            className="rounded-lg p-1.5 text-gray-400 hover:bg-white hover:text-red-600 disabled:opacity-30"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(s.id, s.title);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
