import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, Send, Dices, Dice6, Save as SaveIcon, FolderOpen, User as UserIcon, Wand2 } from 'lucide-react';
import { ApiConfig } from '../types';
import { smartLoad, smartSave } from '../utils/storage';

interface TRPGScreenProps {
  onBack: () => void;
  apiConfig: ApiConfig;
  userName?: string;
}

type LogRole = 'dm' | 'player' | 'system';

interface LogEntry {
  id: string;
  role: LogRole;
  content: string;
  timestamp: number;
}

interface TRPGSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  logs: LogEntry[];
}

interface TRPGCharacter {
  id: string;
  name: string;
  className?: string;
  level?: number;
  attributes?: {
    STR?: number;
    DEX?: number;
    CON?: number;
    INT?: number;
    WIS?: number;
    CHA?: number;
  };
  notes?: string;
}

const STORAGE_KEY = 'trpg_current';
const SAVES_KEY = 'trpg_saves';
const CHARACTERS_KEY = 'trpg_characters';
const CURRENT_CHARACTER_KEY = 'trpg_current_character';

type FetchRetryOptions = {
  retries?: number;
  timeoutMs?: number;
  backoffMs?: number;
  retryOnStatuses?: number[];
};

async function fetchWithRetry(url: string, init: RequestInit, opts: FetchRetryOptions = {}): Promise<Response> {
  const {
    retries = 2,
    timeoutMs = 12000,
    backoffMs = 600,
    retryOnStatuses = [429, 502, 503, 504]
  } = opts;

  let lastError: any = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const resp = await fetch(url, { ...init, signal: controller.signal });
      clearTimeout(timer);
      if (resp.ok) return resp;
      if (retryOnStatuses.includes(resp.status) || resp.status >= 500) {
        lastError = new Error(`HTTP ${resp.status}`);
      } else {
        return resp; // 非重试状态码，直接返回给上层处理
      }
    } catch (e: any) {
      clearTimeout(timer);
      lastError = e;
    }
    if (attempt < retries) {
      await new Promise(r => setTimeout(r, backoffMs * (attempt + 1)));
    }
  }
  throw lastError || new Error('Network error');
}

export default function TRPGScreen({ onBack, apiConfig, userName }: TRPGScreenProps) {
  const [session, setSession] = useState<TRPGSession | null>(null);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const [diceExpr, setDiceExpr] = useState('1d20');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [showCharModal, setShowCharModal] = useState(false);
  const [saves, setSaves] = useState<TRPGSession[]>([]);
  const [characters, setCharacters] = useState<TRPGCharacter[]>([]);
  const [currentCharacterId, setCurrentCharacterId] = useState<string | null>(null);
  const [tempSaveTitle, setTempSaveTitle] = useState('');
  const [editingCharacter, setEditingCharacter] = useState<TRPGCharacter | null>(null);

  useEffect(() => {
    (async () => {
      const saved = (await smartLoad(STORAGE_KEY)) as TRPGSession | null;
      if (saved && saved.logs && Array.isArray(saved.logs)) {
        setSession(saved);
      }
      const list = (await smartLoad(SAVES_KEY)) as TRPGSession[] | null;
      if (Array.isArray(list)) setSaves(list);
      const chars = (await smartLoad(CHARACTERS_KEY)) as TRPGCharacter[] | null;
      if (Array.isArray(chars)) setCharacters(chars);
      const curCharId = (await smartLoad(CURRENT_CHARACTER_KEY)) as string | null;
      if (curCharId) setCurrentCharacterId(curCharId);
    })();
  }, []);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [session?.logs.length, isThinking]);

  const ensureSession = async (withIntro: boolean) => {
    if (session) return session;
    const s: TRPGSession = {
      id: 'trpg_' + Date.now(),
      title: '单人冒险',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      logs: [],
    };
    if (withIntro) {
      s.logs.push({ id: 'sys_' + Date.now(), role: 'system', content: '冒险开始。', timestamp: Date.now() });
    }
    setSession(s);
    await smartSave(STORAGE_KEY, s);
    return s;
  };

  const saveSession = async (s: TRPGSession) => {
    const next = { ...s, updatedAt: Date.now() };
    setSession(next);
    await smartSave(STORAGE_KEY, next);
  };

  const rollD20 = async () => {
    await rollByExpression('1d20');
  };

  const parseDice = (expr: string) => {
    const cleaned = expr.replace(/\s+/g, '').toLowerCase();
    const parts = cleaned.split(/(?=[+-])/g);
    const terms = parts.map(p => p.startsWith('+') || p.startsWith('-') ? p : '+' + p);
    return terms;
  };

  const rollByExpression = async (expr: string) => {
    const s = await ensureSession(true);
    let total = 0;
    const details: string[] = [];
    let critNote = '';
    for (const term of parseDice(expr)) {
      const sign = term.startsWith('-') ? -1 : 1;
      const body = term.slice(1);
      if (/^\d+d\d+$/.test(body)) {
        const [cntStr, sidesStr] = body.split('d');
        const cnt = Math.max(1, parseInt(cntStr, 10));
        const sides = Math.max(2, parseInt(sidesStr, 10));
        const rolls: number[] = [];
        for (let i = 0; i < cnt; i++) {
          const val = Math.floor(Math.random() * sides) + 1;
          rolls.push(val);
          if (sides === 20 && (val === 20 || val === 1)) {
            critNote = val === 20 ? '（大成功）' : '（大失败）';
          }
        }
        const sum = rolls.reduce((a, b) => a + b, 0) * sign;
        total += sum;
        details.push(`${sign < 0 ? '-' : '+'}${cnt}d${sides}[${rolls.join(',')}]`);
      } else if (/^\d+$/.test(body)) {
        const val = parseInt(body, 10) * sign;
        total += val;
        details.push(`${sign < 0 ? '-' : '+'}${Math.abs(val)}`);
      }
    }
    const res = `掷骰 ${expr} = ${total} ${critNote} 详情: ${details.join(' ')}`.trim();
    s.logs.push({ id: 'roll_' + Date.now(), role: 'system', content: res, timestamp: Date.now() });
    await saveSession(s);
  };

  const callDM = async (playerText: string) => {
    if (!apiConfig?.baseUrl || !apiConfig?.apiKey || !apiConfig?.modelName) {
      alert('请先在设置中配置对话模型');
      return '（未配置API，无法生成）';
    }
    const s = await ensureSession(false);
    const char = characters.find(c => c.id === currentCharacterId || '');
    const charNote = char ? `\n玩家角色：${char.name}${char.className ? '，职业：' + char.className : ''}${char.level ? '，等级：' + char.level : ''}` : '';
    const systemPrompt = `你是跑团DM。要求：
- 场景推进简洁具体，每次输出不超过180字
- 保持世界观连续性
- 遇到战斗或检定时，明确提示我进行掷骰
- 不要输出代码块/标签/系统提示
- 输出中文对话与叙述${charNote}`;
    const history = s.logs.slice(-12).map(l => ({
      role: l.role === 'dm' ? 'assistant' : l.role === 'player' ? 'user' : 'system',
      content: l.content
    }));
    const messages = [{ role: 'system', content: systemPrompt }, ...history, { role: 'user', content: playerText }];
    try {
      const resp = await fetchWithRetry(
        `${apiConfig.baseUrl}/v1/chat/completions`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiConfig.apiKey}` },
          body: JSON.stringify({ model: apiConfig.modelName, messages, temperature: 0.8, max_tokens: 300, presence_penalty: 0.1, frequency_penalty: 0.1 })
        },
        { retries: 2, timeoutMs: 12000, backoffMs: 700 }
      );
      if (!resp.ok) {
        const t = await resp.text();
        return `（DM生成失败 ${resp.status}）${t.slice(0, 120)}`;
      }
      const data = await resp.json();
      const content = data.choices?.[0]?.message?.content?.trim() || '（DM没有回复）';
      return content;
    } catch (e: any) {
      return '（网络错误，稍后再试）';
    }
  };

  const startNew = async () => {
    const s: TRPGSession = {
      id: 'trpg_' + Date.now(),
      title: '单人冒险',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      logs: [],
    };
    setSession(s);
    await smartSave(STORAGE_KEY, s);
    setIsThinking(true);
    const intro = await callDM('请给出一个有代入感的冒险开场，等待我行动。');
    s.logs.push({ id: 'dm_' + Date.now(), role: 'dm', content: intro, timestamp: Date.now() });
    setIsThinking(false);
    await saveSession(s);
  };

  const continueGame = async () => {
    const s = await smartLoad(STORAGE_KEY) as TRPGSession | null;
    if (s) setSession(s);
  };

  const saveAsNew = async () => {
    const s = await ensureSession(false);
    const title = (tempSaveTitle || s.title || '存档') + ' ' + new Date().toLocaleString();
    const snapshot: TRPGSession = { ...s, id: 'trpg_' + Date.now(), title };
    const list = (await smartLoad(SAVES_KEY)) as TRPGSession[] | null || [];
    const next = [snapshot, ...list].slice(0, 50);
    await smartSave(SAVES_KEY, next);
    setSaves(next);
    setShowSaveModal(false);
    setTempSaveTitle('');
  };

  const loadFromSave = async (saveId: string) => {
    const list = (await smartLoad(SAVES_KEY)) as TRPGSession[] | null || [];
    const found = list.find(x => x.id === saveId);
    if (found) {
      setSession(found);
      await smartSave(STORAGE_KEY, found);
      setShowLoadModal(false);
    }
  };

  const deleteSave = async (saveId: string) => {
    const list = (await smartLoad(SAVES_KEY)) as TRPGSession[] | null || [];
    const next = list.filter(x => x.id !== saveId);
    await smartSave(SAVES_KEY, next);
    setSaves(next);
  };

  const openCharEditor = (char?: TRPGCharacter) => {
    if (char) setEditingCharacter({ ...char });
    else setEditingCharacter({ id: 'char_' + Date.now(), name: userName || '我' });
    setShowCharModal(true);
  };

  const saveCharacter = async () => {
    if (!editingCharacter) return;
    const list = (await smartLoad(CHARACTERS_KEY)) as TRPGCharacter[] | null || [];
    const idx = list.findIndex(c => c.id === editingCharacter.id);
    let next: TRPGCharacter[];
    if (idx >= 0) {
      next = [...list];
      next[idx] = editingCharacter;
    } else {
      next = [editingCharacter, ...list].slice(0, 100);
    }
    await smartSave(CHARACTERS_KEY, next);
    setCharacters(next);
    setCurrentCharacterId(editingCharacter.id);
    await smartSave(CURRENT_CHARACTER_KEY, editingCharacter.id);
    setShowCharModal(false);
  };

  const pickCharacter = async (charId: string) => {
    setCurrentCharacterId(charId);
    await smartSave(CURRENT_CHARACTER_KEY, charId);
    setShowCharModal(false);
  };

  const recommendDice = async () => {
    if (!apiConfig?.baseUrl || !apiConfig?.apiKey || !apiConfig?.modelName) {
      setDiceExpr('1d20');
      return;
    }
    const dm = [...(session?.logs || [])].reverse().find(l => l.role === 'dm');
    const context = dm ? dm.content : '';
    const sys = '你是TRPG掷骰顾问。根据DM文本，给出一个新手友好的骰子表达式（如1d20+2、2d6），尽量简洁。只输出表达式，不要解释。';
    try {
      const resp = await fetchWithRetry(
        `${apiConfig.baseUrl}/v1/chat/completions`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiConfig.apiKey}` },
          body: JSON.stringify({ model: apiConfig.modelName, messages: [
            { role: 'system', content: sys },
            { role: 'user', content: context || '普通行动检定' }
          ], temperature: 0.2, max_tokens: 20 })
        },
        { retries: 2, timeoutMs: 8000, backoffMs: 600 }
      );
      if (!resp.ok) throw new Error('failed');
      const data = await resp.json();
      const content = data.choices?.[0]?.message?.content?.trim() || '';
      const m = content.match(/\b\d+d\d+(?:[+-]\d+d\d+|[+-]\d+)*\b/i);
      setDiceExpr(m ? m[0] : '1d20');
    } catch {
      setDiceExpr('1d20');
    }
  };

  const send = async () => {
    const text = input.trim();
    if (!text) return;
    const s = await ensureSession(true);
    s.logs.push({ id: 'pl_' + Date.now(), role: 'player', content: `${userName || '我'}：${text}`, timestamp: Date.now() });
    setInput('');
    await saveSession(s);
    setIsThinking(true);
    const reply = await callDM(text);
    s.logs.push({ id: 'dm_' + Date.now(), role: 'dm', content: reply, timestamp: Date.now() });
    setIsThinking(false);
    await saveSession(s);
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="flex items-center gap-2 p-3 bg-white border-b">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-slate-100"><ChevronLeft className="w-5 h-5" /></button>
        <div className="font-semibold">TRPG · 单人冒险</div>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={startNew} className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600">新建</button>
          <button onClick={continueGame} className="px-3 py-1.5 text-sm bg-slate-200 rounded-lg hover:bg-slate-300">继续</button>
          <button onClick={() => setShowSaveModal(true)} className="p-2 rounded-lg bg-emerald-100 hover:bg-emerald-200"><SaveIcon className="w-4 h-4" /></button>
          <button onClick={() => setShowLoadModal(true)} className="p-2 rounded-lg bg-sky-100 hover:bg-sky-200"><FolderOpen className="w-4 h-4" /></button>
          <button onClick={() => openCharEditor()} className="p-2 rounded-lg bg-violet-100 hover:bg-violet-200"><UserIcon className="w-4 h-4" /></button>
          <button onClick={recommendDice} className="p-2 rounded-lg bg-pink-100 hover:bg-pink-200"><Wand2 className="w-4 h-4" /></button>
          <button onClick={rollD20} className="p-2 rounded-lg bg-amber-100 hover:bg-amber-200"><Dice6 className="w-4 h-4" /></button>
        </div>
      </div>

      <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {session?.logs.map(item => (
          <div key={item.id} className={
            item.role === 'player' ? 'text-right' : 'text-left'
          }>
            <div className={
              item.role === 'dm' ? 'inline-block px-3 py-2 rounded-2xl bg-purple-100 text-purple-900' :
              item.role === 'player' ? 'inline-block px-3 py-2 rounded-2xl bg-blue-500 text-white' :
              'inline-block px-3 py-2 rounded-2xl bg-slate-200 text-slate-700'
            }>
              {item.content}
            </div>
          </div>
        ))}
        {isThinking && (
          <div className="text-left"><div className="inline-block px-3 py-2 rounded-2xl bg-purple-100 text-purple-900">DM 正在思考…</div></div>
        )}
        {!session?.logs?.length && (
          <div className="h-full w-full flex items-center justify-center text-slate-400 text-sm">点击新建或继续冒险</div>
        )}
      </div>

      <div className="p-3 bg-white border-t space-y-2">
        <div className="flex items-center gap-2">
          <input
            value={diceExpr}
            onChange={(e) => setDiceExpr(e.target.value)}
            placeholder="如 1d20+2 或 2d6+1"
            className="w-40 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <button onClick={() => rollByExpression(diceExpr)} className="px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white">掷骰</button>
          <button onClick={() => setDiceExpr('1d20')} className="px-2 py-2 rounded-lg bg-slate-100 hover:bg-slate-200">d20</button>
          <button onClick={() => setDiceExpr('1d12')} className="px-2 py-2 rounded-lg bg-slate-100 hover:bg-slate-200">d12</button>
          <button onClick={() => setDiceExpr('2d6')} className="px-2 py-2 rounded-lg bg-slate-100 hover:bg-slate-200">2d6</button>
          <button onClick={() => setDiceExpr('1d100')} className="px-2 py-2 rounded-lg bg-slate-100 hover:bg-slate-200">d100</button>
          <button onClick={recommendDice} className="px-2 py-2 rounded-lg bg-pink-100 hover:bg-pink-200"><Wand2 className="w-4 h-4" /></button>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={rollD20} className="p-2 rounded-lg bg-amber-100 hover:bg-amber-200"><Dices className="w-5 h-5" /></button>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
            placeholder="我想…（行动、对话、调查、战斗等）"
            className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button onClick={send} disabled={!input.trim() || isThinking} className="p-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-50"><Send className="w-5 h-5" /></button>
        </div>
      </div>

      {showSaveModal && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-2xl">
            <div className="font-semibold mb-3">保存为新存档</div>
            <input
              value={tempSaveTitle}
              onChange={(e) => setTempSaveTitle(e.target.value)}
              placeholder="可填写存档标题"
              className="w-full px-3 py-2 border rounded-lg mb-4"
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowSaveModal(false)} className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200">取消</button>
              <button onClick={saveAsNew} className="px-3 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white">保存</button>
            </div>
          </div>
        </div>
      )}

      {showLoadModal && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-2xl max-h-[70vh] overflow-auto">
            <div className="font-semibold mb-3">读取存档</div>
            <div className="space-y-2">
              {saves.length === 0 && <div className="text-slate-400 text-sm">暂无存档</div>}
              {saves.map(sv => (
                <div key={sv.id} className="flex items-center gap-2 p-2 border rounded-xl">
                  <div className="flex-1">
                    <div className="font-medium text-sm">{sv.title}</div>
                    <div className="text-xs text-slate-500">{new Date(sv.updatedAt || sv.createdAt).toLocaleString()}</div>
                  </div>
                  <button onClick={() => loadFromSave(sv.id)} className="px-2 py-1 text-sm rounded-lg bg-sky-500 hover:bg-sky-600 text-white">读取</button>
                  <button onClick={() => deleteSave(sv.id)} className="px-2 py-1 text-sm rounded-lg bg-red-100 hover:bg-red-200">删除</button>
                </div>
              ))}
            </div>
            <div className="flex gap-2 justify-end mt-3">
              <button onClick={() => setShowLoadModal(false)} className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200">关闭</button>
            </div>
          </div>
        </div>
      )}

      {showCharModal && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-2xl max-h-[75vh] overflow-auto">
            <div className="font-semibold mb-3">角色卡</div>
            <div className="space-y-2 mb-4">
              <div className="text-sm font-medium mb-1">现有角色</div>
              {characters.length === 0 && <div className="text-slate-400 text-sm">暂无角色</div>}
              {characters.map(c => (
                <div key={c.id} className={`flex items-center gap-2 p-2 border rounded-xl ${currentCharacterId === c.id ? 'bg-violet-50' : ''}`}>
                  <div className="flex-1">
                    <div className="font-medium text-sm">{c.name} {c.level ? `Lv.${c.level}` : ''} {c.className ? `· ${c.className}` : ''}</div>
                  </div>
                  <button onClick={() => pickCharacter(c.id)} className="px-2 py-1 text-sm rounded-lg bg-violet-500 hover:bg-violet-600 text-white">选择</button>
                  <button onClick={() => openCharEditor(c)} className="px-2 py-1 text-sm rounded-lg bg-slate-100 hover:bg-slate-200">编辑</button>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium mb-1">编辑/新建</div>
              <input
                value={editingCharacter?.name || ''}
                onChange={(e) => setEditingCharacter(v => ({ ...(v || { id: 'char_' + Date.now() }), name: e.target.value }))}
                placeholder="名称"
                className="w-full px-3 py-2 border rounded-lg"
              />
              <div className="flex gap-2">
                <input
                  value={editingCharacter?.className || ''}
                  onChange={(e) => setEditingCharacter(v => ({ ...(v || { id: 'char_' + Date.now(), name: userName || '我' }), className: e.target.value }))}
                  placeholder="职业"
                  className="flex-1 px-3 py-2 border rounded-lg"
                />
                <input
                  type="number"
                  value={editingCharacter?.level ?? ''}
                  onChange={(e) => setEditingCharacter(v => ({ ...(v || { id: 'char_' + Date.now(), name: userName || '我' }), level: Number(e.target.value) }))}
                  placeholder="等级"
                  className="w-28 px-3 py-2 border rounded-lg"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(['STR','DEX','CON','INT','WIS','CHA'] as const).map(k => (
                  <input
                    key={k}
                    type="number"
                    value={editingCharacter?.attributes?.[k] ?? ''}
                    onChange={(e) => setEditingCharacter(v => ({ ...(v || { id: 'char_' + Date.now(), name: userName || '我' }), attributes: { ...(v?.attributes || {}), [k]: Number(e.target.value) } }))}
                    placeholder={k}
                    className="px-3 py-2 border rounded-lg"
                  />
                ))}
              </div>
              <textarea
                value={editingCharacter?.notes || ''}
                onChange={(e) => setEditingCharacter(v => ({ ...(v || { id: 'char_' + Date.now(), name: userName || '我' }), notes: e.target.value }))}
                placeholder="备注"
                className="w-full px-3 py-2 border rounded-lg h-24"
              />
            </div>
            <div className="flex gap-2 justify-end mt-3">
              <button onClick={() => setShowCharModal(false)} className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200">关闭</button>
              <button onClick={saveCharacter} className="px-3 py-2 rounded-lg bg-violet-500 hover:bg-violet-600 text-white">保存并使用</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
