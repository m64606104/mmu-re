import type { ApiConfig, Conversation } from '../types';
import { enqueueLifeSimForAll } from './lifeEngine';
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

  // Lightweight periodic run while app stays open (won't do anything if not due)
  const timer = window.setInterval(() => safeRun(getConversations, getApiConfig), 10 * 60 * 1000);

  // Cleanup on unload
  window.addEventListener('beforeunload', () => {
    window.removeEventListener('focus', onFocus);
    document.removeEventListener('visibilitychange', onVis);
    clearInterval(timer);
  });
}

