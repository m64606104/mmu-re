import type { ApiConfig, Conversation } from '../types';
import { enqueueLifeSimForAll, nextLifeSimPeriodicDelayMs } from './lifeEngine';
import { cleanupLifeSimStates } from './storage';

type GetConversations = () => Conversation[];
type GetApiConfig = () => ApiConfig;

/** 焦点 / 回到前台 触发的批次与上一次任意批次之间至少间隔，避免抖动连打 */
const ANY_BATCH_MIN_MS = 8 * 60 * 1000;
/** 视为「再次上线」触发批次的最小间隔（焦点 / 回到前台） */
const SESSION_BATCH_MIN_MS = 35 * 60 * 1000;

const LS_BATCH = 'momoyu_life_sim_last_batch_at_v2';
const LS_SESSION = 'momoyu_life_sim_last_session_batch_at_v2';

function readTs(key: string): number {
  try {
    return Math.max(0, Number(localStorage.getItem(key) || '0'));
  } catch {
    return 0;
  }
}

function writeTs(key: string, ts: number): void {
  try {
    localStorage.setItem(key, String(ts));
  } catch {
    /* ignore */
  }
}

function runBatch(getConversations: GetConversations, getApiConfig: GetApiConfig): void {
  try {
    const apiConfig = getApiConfig();
    const conversations = getConversations();
    if (!conversations || conversations.length === 0) return;
    cleanupLifeSimStates(7).catch(() => {});
    enqueueLifeSimForAll(conversations, apiConfig);
  } catch (e) {
    console.error('[life-sim] bootstrap run failed:', e);
  }
}

let started = false;

export function startLifeSimBootstrap(params: { getConversations: GetConversations; getApiConfig: GetApiConfig }): void {
  if (started) return;
  started = true;

  const { getConversations, getApiConfig } = params;
  const bootAt = Date.now();
  writeTs(LS_SESSION, bootAt);
  writeTs(LS_BATCH, bootAt);

  // 首次进入应用后稍晚跑一批（不依赖上线间隔）
  window.setTimeout(() => {
    runBatch(getConversations, getApiConfig);
    const t = Date.now();
    writeTs(LS_BATCH, t);
    writeTs(LS_SESSION, t);
  }, 600);

  const onSession = (): void => {
    const t = Date.now();
    if (t - readTs(LS_BATCH) < ANY_BATCH_MIN_MS) return;
    if (t - readTs(LS_SESSION) < SESSION_BATCH_MIN_MS) return;
    writeTs(LS_SESSION, t);
    writeTs(LS_BATCH, t);
    runBatch(getConversations, getApiConfig);
  };

  window.addEventListener('focus', onSession);
  const onVis = (): void => {
    if (document.visibilityState === 'visible') onSession();
  };
  document.addEventListener('visibilitychange', onVis);

  let periodicTimer: number | null = null;
  const schedulePeriodic = (): void => {
    if (periodicTimer != null) window.clearTimeout(periodicTimer);
    periodicTimer = window.setTimeout(() => {
      periodicTimer = null;
      const t = Date.now();
      writeTs(LS_BATCH, t);
      runBatch(getConversations, getApiConfig);
      schedulePeriodic();
    }, nextLifeSimPeriodicDelayMs());
  };
  schedulePeriodic();

  window.addEventListener('beforeunload', () => {
    window.removeEventListener('focus', onSession);
    document.removeEventListener('visibilitychange', onVis);
    if (periodicTimer != null) window.clearTimeout(periodicTimer);
  });
}
