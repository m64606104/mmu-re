/** 全局快捷备份悬浮球：`'0'` 隐藏，缺省或其它值显示（默认开启） */
export const QUICK_BACKUP_FAB_LS_KEY = 'momoyu_quick_backup_fab_visible';

export const QUICK_BACKUP_FAB_VISIBILITY_EVENT = 'momoyu-quick-backup-fab-visibility';

export function readQuickBackupFabVisible(): boolean {
  try {
    return localStorage.getItem(QUICK_BACKUP_FAB_LS_KEY) !== '0';
  } catch {
    return true;
  }
}

export function writeQuickBackupFabVisible(visible: boolean): void {
  try {
    localStorage.setItem(QUICK_BACKUP_FAB_LS_KEY, visible ? '1' : '0');
  } catch {
    /* private mode */
  }
  try {
    window.dispatchEvent(new Event(QUICK_BACKUP_FAB_VISIBILITY_EVENT));
  } catch {
    /* */
  }
}

/** 用户拖动后的固定坐标（像素，相对视口）；无记录时用默认右下角 */
export const QUICK_BACKUP_FAB_POS_KEY = 'momoyu_quick_backup_fab_pos';

export type QuickBackupFabPos = { left: number; top: number };

export function readQuickBackupFabPosition(): QuickBackupFabPos | null {
  try {
    const raw = localStorage.getItem(QUICK_BACKUP_FAB_POS_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as unknown;
    if (
      p &&
      typeof p === 'object' &&
      typeof (p as QuickBackupFabPos).left === 'number' &&
      typeof (p as QuickBackupFabPos).top === 'number' &&
      Number.isFinite((p as QuickBackupFabPos).left) &&
      Number.isFinite((p as QuickBackupFabPos).top)
    ) {
      return { left: (p as QuickBackupFabPos).left, top: (p as QuickBackupFabPos).top };
    }
    return null;
  } catch {
    return null;
  }
}

export function writeQuickBackupFabPosition(pos: QuickBackupFabPos): void {
  try {
    localStorage.setItem(QUICK_BACKUP_FAB_POS_KEY, JSON.stringify(pos));
  } catch {
    /* */
  }
}
