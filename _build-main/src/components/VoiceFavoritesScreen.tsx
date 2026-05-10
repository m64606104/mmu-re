import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, MessageCircle, Mic, Trash2, Play, Pause, Loader2 } from 'lucide-react';
import type { ApiConfig, Conversation } from '../types';
import { synthesizeMinimaxTtsToBlob } from '../utils/minimaxTts';
import {
  canPlayVoiceFavorite,
  listVoiceFavoritesForConversation,
  removeVoiceFavorite,
  resolveVoiceFavoritePlaySrc,
  resolveVoiceFavoriteTtsCharacter,
  resolveVoiceFavoriteTtsPlain,
  type VoiceFavoriteRecord,
} from '../utils/voiceFavoriteStorage';

interface VoiceFavoritesScreenProps {
  conversationId: string;
  conversations: Conversation[];
  apiConfig: ApiConfig;
  onBack: () => void;
  onOpenChat: () => void;
}

export default function VoiceFavoritesScreen({
  conversationId,
  conversations,
  apiConfig,
  onBack,
  onOpenChat,
}: VoiceFavoritesScreenProps) {
  const [items, setItems] = useState<VoiceFavoriteRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [ttsBusyId, setTtsBusyId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  /** 撤销/切歌时递增，丢弃过期的异步合成结果 */
  const playGenerationRef = useRef(0);

  const title = useMemo(() => {
    const c = conversations.find((x) => x.id === conversationId);
    return c?.characterSettings?.nickname || c?.name || '会话';
  }, [conversationId, conversations]);

  const revokeBlob = useCallback(() => {
    playGenerationRef.current += 1;
    if (blobUrlRef.current && blobUrlRef.current.startsWith('blob:')) {
      URL.revokeObjectURL(blobUrlRef.current);
    }
    blobUrlRef.current = null;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    setPlayingId(null);
    setTtsBusyId(null);
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listVoiceFavoritesForConversation(conversationId);
      setItems(rows);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => () => revokeBlob(), [revokeBlob]);

  const togglePlay = async (entry: VoiceFavoriteRecord) => {
    if (playingId === entry.id || ttsBusyId === entry.id) {
      revokeBlob();
      setTtsBusyId(null);
      return;
    }

    const src = resolveVoiceFavoritePlaySrc(entry);
    if (src) {
      revokeBlob();

      const audio = new Audio(src);
      audioRef.current = audio;
      if (src.startsWith('blob:')) blobUrlRef.current = src;

      audio.onended = () => revokeBlob();
      audio.onerror = () => revokeBlob();

      setPlayingId(entry.id);
      void audio.play().catch(() => revokeBlob());
      return;
    }

    if (entry.role !== 'assistant') return;

    const plain = resolveVoiceFavoriteTtsPlain(entry);
    const api = apiConfig.minimaxTts;
    const char = resolveVoiceFavoriteTtsCharacter(entry, conversations);
    if (!plain || !api) return;

    revokeBlob();
    const genAfterRevoke = playGenerationRef.current;
    setTtsBusyId(entry.id);
    try {
      const blob = await synthesizeMinimaxTtsToBlob({
        api,
        character: char,
        text: plain,
      });
      if (playGenerationRef.current !== genAfterRevoke) return;
      const url = URL.createObjectURL(blob);
      blobUrlRef.current = url;
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => revokeBlob();
      audio.onerror = () => revokeBlob();
      setPlayingId(entry.id);
      setTtsBusyId(null);
      await audio.play().catch(() => revokeBlob());
    } catch (e) {
      if (playGenerationRef.current === genAfterRevoke) {
        setTtsBusyId(null);
        revokeBlob();
        alert(e instanceof Error ? e.message : '语音合成失败');
      } else {
        setTtsBusyId(null);
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (playingId && playingId === id) revokeBlob();
    await removeVoiceFavorite(id);
    setItems((prev) => prev.filter((x) => x.id !== id));
  };

  return (
    <div className="h-full flex flex-col bg-zinc-50">
      <header className="shrink-0 bg-white border-b border-zinc-200 px-4 py-3 flex items-center gap-3">
        <button type="button" onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-zinc-100">
          <ChevronLeft className="w-6 h-6 text-zinc-800" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold text-zinc-900 truncate">语音收藏</h1>
          <p className="text-xs text-zinc-500 truncate">{title}</p>
        </div>
        <button
          type="button"
          onClick={onOpenChat}
          className="p-2 rounded-full hover:bg-zinc-100 text-zinc-700"
          title="进入聊天"
        >
          <MessageCircle className="w-5 h-5" />
        </button>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3">
        {loading ? (
          <div className="text-center text-zinc-500 text-sm py-16">加载中…</div>
        ) : items.length === 0 ? (
          <div className="max-w-sm mx-auto mt-12 text-center text-zinc-500 text-sm leading-relaxed px-4">
            <Mic className="w-12 h-12 mx-auto mb-3 text-zinc-300" strokeWidth={1.25} />
            <p>暂无收藏的语音。</p>
            <p className="mt-2">
              在聊天里长按语音，可选「缓存并收藏」或「仅收藏」：前者播放固定同一段；后者不存文件，助手语音在列表里每次点播放会重新合成。
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {items.map((entry) => {
              const canPlay = canPlayVoiceFavorite(entry, apiConfig, conversations);
              const active = playingId === entry.id;
              const busy = ttsBusyId === entry.id;
              return (
                <li
                  key={entry.id}
                  className="rounded-2xl bg-white border border-zinc-200/90 shadow-sm px-4 py-3 flex items-start gap-3"
                >
                  <button
                    type="button"
                    disabled={!canPlay || busy}
                    onClick={() => void togglePlay(entry)}
                    className={`shrink-0 w-11 h-11 rounded-full flex items-center justify-center border ${
                      canPlay
                        ? 'bg-zinc-900 text-white border-zinc-900 hover:bg-zinc-800'
                        : 'bg-zinc-100 text-zinc-400 border-zinc-200 cursor-not-allowed'
                    }`}
                    title={
                      canPlay
                        ? entry.favoriteOnly && entry.role === 'assistant' && !resolveVoiceFavoritePlaySrc(entry)
                          ? '播放（每次重新合成）'
                          : '播放'
                        : '当前无法播放（请检查 MiniMax 与角色音色配置，或缺少可播链接）'
                    }
                  >
                    {busy ? (
                      <Loader2 className="w-5 h-5 animate-spin" aria-hidden />
                    ) : active ? (
                      <Pause className="w-5 h-5" />
                    ) : (
                      <Play className="w-5 h-5 ml-0.5" />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                      <span>{entry.role === 'user' ? '我' : '对方'}</span>
                      <span>·</span>
                      <span>{entry.durationSec}″</span>
                      {entry.cachedAudio ? (
                        <>
                          <span>·</span>
                          <span className="text-emerald-600">已缓存</span>
                        </>
                      ) : entry.favoriteOnly ? (
                        <>
                          <span>·</span>
                          <span className="text-amber-600">仅收藏</span>
                        </>
                      ) : (
                        <>
                          <span>·</span>
                          <span className="text-amber-600">未缓存</span>
                        </>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-zinc-800 leading-snug line-clamp-4 whitespace-pre-wrap break-words">
                      {entry.transcriptPreview || '—'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(entry.id)}
                    className="shrink-0 p-2 rounded-full text-zinc-400 hover:bg-red-50 hover:text-red-600"
                    title="删除收藏"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
