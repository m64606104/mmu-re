import type { ApiConfig, Conversation } from '../types';
import { enqueueLifeSimForAll, nextLifeSimPeriodicDelayMs } from './lifeEngine';
import { cleanupLifeSimStates } from './storage';

type GetConversations = () => Conversation[];
type GetApiConfig = () => ApiConfig;

let started = false;

function safeRun(getConversations: GetConversations, getApiConfig: GetApiConfig) {
  try {
    const apiConfig = getApiConfig();
    const conversations = getConversations();
    if (!conversations || conversations.length === 0) return;
    // 清理后台生活碎片（默认保留7天，避免囤积）
    cleanupLifeSimStates(7).catch(() => {});
    enqueueLifeSimForAll(conversations, apiConfig);
  } catch (e) {
    console.error('[life-sim] bootstrap run failed:', e);
  }
}

export function startLifeSimBootstrap(params: { getConversations: GetConversations; getApiConfig: GetApiConfig }): void {
  if (started) return;
  started = true;

  const { getConversations, getApiConfig } = params;

  // First run after load
  setTimeout(() => safeRun(getConversations, getApiConfig), 600);

  // When user returns to app, do a background catch-up tick
  const onFocus = () => safeRun(getConversations, getApiConfig);
  const onVis = () => {
    if (document.visibilityState === 'visible') safeRun(getConversations, getApiConfig);
  };

  window.addEventListener('focus', onFocus);
  document.addEventListener('visibilitychange', onVis);

  // 随机 20～60 分钟再触发一批（enqueue 内部另有「全局最少 20 分钟」门槛）
  let periodicTimer: number | null = null;
  const schedulePeriodic = () => {
    if (periodicTimer != null) window.clearTimeout(periodicTimer);
    periodicTimer = window.setTimeout(() => {
      periodicTimer = null;
      safeRun(getConversations, getApiConfig);
      schedulePeriodic();
    }, nextLifeSimPeriodicDelayMs());
  };
  schedulePeriodic();

  // Cleanup on unload
  window.addEventListener('beforeunload', () => {
    window.removeEventListener('focus', onFocus);
    document.removeEventListener('visibilitychange', onVis);
    if (periodicTimer != null) window.clearTimeout(periodicTimer);
  });
}

