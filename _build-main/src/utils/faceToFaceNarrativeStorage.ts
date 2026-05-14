import { load, save } from '../domains/storage';

export type FaceToFaceSegmentKind = 'narration' | 'dialogue' | 'user_action';

export interface FaceToFaceSegment {
  id: string;
  role: 'user' | 'assistant';
  kind?: FaceToFaceSegmentKind;
  text: string;
  timestamp: number;
}

export interface FaceToFaceNarrativeDoc {
  /** 便于将来做合并/冲突检测 */
  version: number;
  segments: FaceToFaceSegment[];
}

const emptyDoc = (): FaceToFaceNarrativeDoc => ({ version: 1, segments: [] });

/** 主桶 id；IndexedDB 键与旧版单桶一致 `momoyu_face_to_face_<conversationId>` */
export const FACE_TO_FACE_DEFAULT_WINDOW_ID = 'default' as const;

/** 时间·地点栏默认：跟随现实时钟 + 地点占位 */
export function defaultFaceToFaceSceneHeaderLine(): string {
  const d = new Date();
  const date = d.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
  const t = d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  return `${date} ${t} · （地点）`;
}

/**
 * 线下叙事分桶存储键。
 * - `default`：兼容旧数据键 `momoyu_face_to_face_<conversationId>`
 * - 其它窗口：`momoyu_face_to_face_<conversationId>_<windowId>`（windowId 勿含 `/`）
 */
export function faceToFaceStorageKey(conversationId: string, windowId: string = FACE_TO_FACE_DEFAULT_WINDOW_ID): string {
  if (windowId === FACE_TO_FACE_DEFAULT_WINDOW_ID) {
    return `momoyu_face_to_face_${conversationId}`;
  }
  return `momoyu_face_to_face_${conversationId}_${windowId}`;
}

export async function loadFaceToFaceNarrativeDoc(
  conversationId: string,
  windowId: string = FACE_TO_FACE_DEFAULT_WINDOW_ID,
): Promise<FaceToFaceNarrativeDoc> {
  const key = faceToFaceStorageKey(conversationId, windowId);
  try {
    const raw = await load(key);
    if (!raw || typeof raw !== 'object') return emptyDoc();
    const seg = (raw as FaceToFaceNarrativeDoc).segments;
    if (!Array.isArray(seg)) return emptyDoc();
    return {
      version: Number((raw as FaceToFaceNarrativeDoc).version) || 1,
      segments: seg.filter(
        (s) =>
          s &&
          typeof s === 'object' &&
          (s.role === 'user' || s.role === 'assistant') &&
          typeof s.text === 'string' &&
          typeof s.timestamp === 'number',
      ) as FaceToFaceSegment[],
    };
  } catch {
    return emptyDoc();
  }
}

export async function saveFaceToFaceNarrativeDoc(
  conversationId: string,
  doc: FaceToFaceNarrativeDoc,
  windowId: string = FACE_TO_FACE_DEFAULT_WINDOW_ID,
): Promise<void> {
  const key = faceToFaceStorageKey(conversationId, windowId);
  await save(key, {
    ...doc,
    version: Math.max(1, doc.version || 1),
    segments: Array.isArray(doc.segments) ? doc.segments : [],
  });
}

export async function appendFaceToFaceSegments(
  conversationId: string,
  windowId: string,
  ...newOnes: FaceToFaceSegment[]
): Promise<FaceToFaceNarrativeDoc> {
  const doc = await loadFaceToFaceNarrativeDoc(conversationId, windowId);
  doc.segments.push(...newOnes);
  doc.version = (doc.version || 1) + 1;
  await saveFaceToFaceNarrativeDoc(conversationId, doc, windowId);
  return doc;
}

export async function clearFaceToFaceNarrativeDoc(
  conversationId: string,
  windowId: string = FACE_TO_FACE_DEFAULT_WINDOW_ID,
): Promise<void> {
  await saveFaceToFaceNarrativeDoc(conversationId, emptyDoc(), windowId);
}

export async function updateFaceToFaceSegmentText(
  conversationId: string,
  windowId: string,
  segmentId: string,
  text: string,
): Promise<FaceToFaceNarrativeDoc> {
  const doc = await loadFaceToFaceNarrativeDoc(conversationId, windowId);
  const i = doc.segments.findIndex((s) => s.id === segmentId);
  if (i < 0) return doc;
  const nextText = text.trim();
  if (!nextText) return doc;
  doc.segments[i] = { ...doc.segments[i], text: nextText };
  doc.version = (doc.version || 1) + 1;
  await saveFaceToFaceNarrativeDoc(conversationId, doc, windowId);
  return doc;
}

export async function deleteFaceToFaceSegment(
  conversationId: string,
  windowId: string,
  segmentId: string,
): Promise<FaceToFaceNarrativeDoc> {
  const doc = await loadFaceToFaceNarrativeDoc(conversationId, windowId);
  const next = doc.segments.filter((s) => s.id !== segmentId);
  if (next.length === doc.segments.length) return doc;
  doc.segments = next;
  doc.version = (doc.version || 1) + 1;
  await saveFaceToFaceNarrativeDoc(conversationId, doc, windowId);
  return doc;
}

/** 保留到含 `segmentId` 的那一条为止，删除其后所有段（用于用户改句后从该点重新续写） */
export async function truncateFaceToFaceSegmentsAfterSegmentId(
  conversationId: string,
  windowId: string,
  segmentId: string,
): Promise<{ doc: FaceToFaceNarrativeDoc; removedCount: number }> {
  const doc = await loadFaceToFaceNarrativeDoc(conversationId, windowId);
  const idx = doc.segments.findIndex((s) => s.id === segmentId);
  if (idx < 0) return { doc, removedCount: 0 };
  const removedCount = doc.segments.length - idx - 1;
  if (removedCount <= 0) return { doc, removedCount: 0 };
  doc.segments = doc.segments.slice(0, idx + 1);
  doc.version = (doc.version || 1) + 1;
  await saveFaceToFaceNarrativeDoc(conversationId, doc, windowId);
  return { doc, removedCount };
}
