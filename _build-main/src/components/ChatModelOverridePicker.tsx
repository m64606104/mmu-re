import { useMemo, useRef, useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import type { ApiConfig } from '../types';
import { fetchOpenAiCompatibleModelIds } from '../utils/openaiCompatibleModels';

type Props = {
  apiConfig: ApiConfig;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  /** 下拉中「留空」选项的文案 */
  emptyOptionLabel?: string;
  className?: string;
};

export default function ChatModelOverridePicker({
  apiConfig,
  value,
  onChange,
  placeholder = '填写模型 ID，或拉取列表',
  emptyOptionLabel = '（留空：使用全局默认）',
  className = '',
}: Props) {
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [pulling, setPulling] = useState(false);
  const lastAutoPullAtRef = useRef(0);
  const AUTO_PULL_MIN_INTERVAL_MS = 25000;

  const runPull = async (opts?: { silent?: boolean }) => {
    const url = apiConfig.baseUrl?.trim();
    const key = apiConfig.apiKey?.trim();
    if (!url || !key) {
      if (!opts?.silent) alert('请先在设置里配置 Base URL 和 API Key');
      return;
    }
    setPulling(true);
    try {
      const ids = await fetchOpenAiCompatibleModelIds(url, key);
      setAvailableModels(ids);
      if (ids.length === 0 && !opts?.silent) {
        alert('未获取到模型列表，请检查接口是否返回 OpenAI 格式的 /v1/models');
      }
    } catch (e) {
      console.error(e);
      if (!opts?.silent) alert('拉取模型列表失败，请检查 URL / Key');
    } finally {
      setPulling(false);
    }
  };

  const requestPullOnDropdownOpen = () => {
    if (pulling) return;
    const t = Date.now();
    if (t - lastAutoPullAtRef.current < AUTO_PULL_MIN_INTERVAL_MS) return;
    lastAutoPullAtRef.current = t;
    void runPull({ silent: true });
  };

  const showSelect = availableModels.length > 0;

  const selectOptions = useMemo(() => {
    const v = value.trim();
    if (!v || availableModels.includes(v)) return availableModels;
    return [v, ...availableModels];
  }, [availableModels, value]);

  return (
    <div className={`flex gap-2 items-stretch ${className}`}>
      {showSelect ? (
        <select
          value={value}
          onMouseDown={requestPullOnDropdownOpen}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 min-w-0 rounded-2xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900/10 bg-white font-mono"
        >
          <option value="">{emptyOptionLabel}</option>
          {selectOptions.map((id) => (
            <option key={id} value={id}>
              {id}
            </option>
          ))}
        </select>
      ) : (
        <input
          value={value}
          onFocus={requestPullOnDropdownOpen}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 min-w-0 rounded-2xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900/10 font-mono"
          placeholder={placeholder}
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
        />
      )}
      <button
        type="button"
        onClick={() => void runPull()}
        disabled={pulling}
        title="从当前全局接口拉取模型列表"
        className="shrink-0 inline-flex items-center justify-center gap-1.5 px-3 rounded-2xl border border-gray-200 bg-white text-gray-800 text-sm font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {pulling ? (
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
        ) : (
          <RefreshCw className="w-4 h-4" aria-hidden />
        )}
        <span className="hidden sm:inline">拉取</span>
      </button>
    </div>
  );
}
