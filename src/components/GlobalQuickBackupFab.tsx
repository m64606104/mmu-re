import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { exportFullMomoyuBackup } from '../utils/fullMomoyuExport';
import {
  QUICK_BACKUP_FAB_VISIBILITY_EVENT,
  readQuickBackupFabVisible,
  readQuickBackupFabPosition,
  writeQuickBackupFabPosition,
  writeQuickBackupFabVisible,
  type QuickBackupFabPos,
} from '../utils/quickBackupFabVisibility';

const DRAG_THRESHOLD_PX = 8;

function clampFabPosition(
  left: number,
  top: number,
  width: number,
  height: number
): QuickBackupFabPos {
  const margin = 8;
  const vw = typeof window !== 'undefined' ? window.innerWidth : 400;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  const maxL = Math.max(margin, vw - width - margin);
  const maxT = Math.max(margin, vh - height - margin);
  return {
    left: Math.min(Math.max(margin, left), maxL),
    top: Math.min(Math.max(margin, top), maxT),
  };
}

/**
 * 全局半透明快捷备份：任意页面一键导出与设置页相同的 v3 全量 JSON。
 * 可拖动整块区域自由摆放，位置会记住。
 */
export function GlobalQuickBackupFab() {
  const [visible, setVisible] = useState(readQuickBackupFabVisible);
  const [busy, setBusy] = useState(false);
  const [pos, setPos] = useState<QuickBackupFabPos | null>(() => readQuickBackupFabPosition());

  const wrapRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    active: boolean;
    pointerId: number | null;
    startX: number;
    startY: number;
    originLeft: number;
    originTop: number;
  } | null>(null);
  const movedRef = useRef(false);
  const ignoreNextClickRef = useRef(false);
  /** 按下/拖动中：提高不透明度，避免拖移时变回极淡 */
  const [pressed, setPressed] = useState(false);

  useEffect(() => {
    const sync = () => setVisible(readQuickBackupFabVisible());
    window.addEventListener(QUICK_BACKUP_FAB_VISIBILITY_EVENT, sync);
    return () => window.removeEventListener(QUICK_BACKUP_FAB_VISIBILITY_EVENT, sync);
  }, []);

  const clampToViewport = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    setPos((prev) => {
      if (!prev) return prev;
      const next = clampFabPosition(prev.left, prev.top, width, height);
      if (next.left !== prev.left || next.top !== prev.top) {
        writeQuickBackupFabPosition(next);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    window.addEventListener('resize', clampToViewport);
    return () => window.removeEventListener('resize', clampToViewport);
  }, [clampToViewport]);

  const hideFab = useCallback(() => {
    if (
      typeof window !== 'undefined' &&
      !window.confirm(
        '确定隐藏全局快捷备份球？\n可在「设置 → 数据备份」里重新打开「显示全局快捷备份球」。'
      )
    ) {
      return;
    }
    writeQuickBackupFabVisible(false);
    setVisible(false);
    toast.message('已隐藏备份球', {
      description: '可在 设置 → 数据备份 中重新打开「显示全局快捷备份球」。',
      duration: 5000,
    });
  }, []);

  const runExport = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    const t = toast.loading('正在打包全量备份…', { duration: 120_000 });
    try {
      const { stats } = await exportFullMomoyuBackup();
      toast.dismiss(t);
      toast.success('已导出全量备份', {
        description: `${stats.conversations} 个会话 · ${stats.messages} 条消息（已触发浏览器下载）`,
        duration: 6000,
      });
    } catch (e) {
      toast.dismiss(t);
      const msg = e instanceof Error ? e.message : String(e);
      toast.error('导出失败', { description: msg, duration: 8000 });
    } finally {
      setBusy(false);
    }
  }, [busy]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;
    setPressed(true);
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    movedRef.current = false;
    dragRef.current = {
      active: true,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originLeft: r.left,
      originTop: r.top,
    };
    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      /* */
    }
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d?.active) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) {
      movedRef.current = true;
    }
    const el = wrapRef.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    const next = clampFabPosition(d.originLeft + dx, d.originTop + dy, width, height);
    setPos(next);
  }, []);

  const endDrag = useCallback((e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d?.active) return;
    dragRef.current = null;
    const el = wrapRef.current;
    try {
      if (el && d.pointerId != null) {
        el.releasePointerCapture(d.pointerId);
      }
    } catch {
      /* */
    }
    if (movedRef.current) {
      ignoreNextClickRef.current = true;
      setPos((current) => {
        if (!current) return current;
        writeQuickBackupFabPosition(current);
        return current;
      });
    }
    movedRef.current = false;
    setPressed(false);
  }, []);

  const onExportPointerUp = useCallback(
    (e: React.PointerEvent) => {
      endDrag(e);
    },
    [endDrag]
  );

  const onExportClick = useCallback(
    (e: React.MouseEvent) => {
      if (ignoreNextClickRef.current) {
        e.preventDefault();
        e.stopPropagation();
        ignoreNextClickRef.current = false;
        return;
      }
      void runExport();
    },
    [runExport]
  );

  const onHideClick = useCallback(
    (e: React.MouseEvent) => {
      if (ignoreNextClickRef.current) {
        e.preventDefault();
        ignoreNextClickRef.current = false;
        return;
      }
      hideFab();
    },
    [hideFab]
  );

  if (!visible) return null;

  if (typeof document === 'undefined') return null;

  const positionStyle: React.CSSProperties =
    pos != null
      ? { left: pos.left, top: pos.top, right: 'auto', bottom: 'auto' }
      : {
          right: 'max(1rem, env(safe-area-inset-right, 0px))',
          bottom: 'max(1rem, env(safe-area-inset-bottom, 0px))',
          left: 'auto',
          top: 'auto',
        };

  /** 参照截图：整体略透明，主球浅绿磨砂玻璃感，背后列表能隐隐透出 */
  const shellOpacity =
    pressed || busy
      ? 'opacity-100'
      : 'opacity-[0.88] hover:opacity-[0.94] focus-within:opacity-[0.94]';

  const mainBtnTone =
    pressed || busy
      ? 'shadow-[0_6px_22px_rgba(16,185,129,0.35)]'
      : 'shadow-[0_4px_18px_rgba(16,185,129,0.22)] hover:shadow-[0_6px_22px_rgba(16,185,129,0.32)]';

  /** 与截图比例接近：中等大小圆钮 */
  const fabSize = 44;
  const iconPx = 22;

  return createPortal(
    <div
      ref={wrapRef}
      className={`fixed z-[2147483000] flex flex-col items-end gap-1 touch-none select-none transition-[opacity,filter,box-shadow] duration-200 ease-out ${shellOpacity}`}
      style={positionStyle}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onExportPointerUp}
      onPointerCancel={onExportPointerUp}
      role="presentation"
    >
      <button
        type="button"
        onClick={onHideClick}
        className="cursor-pointer rounded-full bg-black/28 text-white/95 backdrop-blur-md px-2 py-0.5 text-[10px] leading-none shadow-sm border border-white/35"
        aria-label="隐藏快捷备份入口"
      >
        隐藏
      </button>
      <button
        type="button"
        onClick={onExportClick}
        title="拖动可移动位置 · 点击导出全部数据（与设置 → 数据备份相同）"
        aria-busy={busy}
        style={{ width: fabSize, height: fabSize, minWidth: fabSize, minHeight: fabSize }}
        className={`cursor-grab active:cursor-grabbing flex shrink-0 items-center justify-center rounded-full border border-white/55 bg-gradient-to-br from-emerald-100/55 via-emerald-300/45 to-emerald-500/40 text-white backdrop-blur-xl transition-[transform,box-shadow] duration-200 active:scale-95 ${mainBtnTone} ${busy ? 'scale-95' : ''}`}
      >
        {busy ? (
          <Loader2
            className="shrink-0 animate-spin text-white"
            style={{ width: iconPx, height: iconPx }}
            strokeWidth={2.4}
            aria-hidden
          />
        ) : (
          <Download
            className="shrink-0 text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.15)]"
            style={{ width: iconPx, height: iconPx }}
            strokeWidth={2.4}
            aria-hidden
          />
        )}
      </button>
    </div>,
    document.body
  );
}
