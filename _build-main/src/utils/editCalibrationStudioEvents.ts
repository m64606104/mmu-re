/** 编辑学习调试台：条目或语言画像更新时刷新 UI（IndexedDB 数据变更） */
export const EDIT_CALIBRATION_STUDIO_UPDATED_EVENT = 'momoyu:edit-calibration-updated';

export function notifyEditCalibrationStudioUpdated(conversationId: string): void {
  try {
    window.dispatchEvent(
      new CustomEvent(EDIT_CALIBRATION_STUDIO_UPDATED_EVENT, { detail: { conversationId } })
    );
  } catch {
    /* ignore */
  }
}
