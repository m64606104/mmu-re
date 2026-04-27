import React, { useRef, useState } from 'react';
import { X, FileText, Folder, Upload } from 'lucide-react';
import { useToast } from './Toast';
import { OriginalDocumentFile } from '../types';

interface SendDocumentModalProps {
  onClose: () => void;
  onSend: (title: string, content: string, greeting: string, type: 'text' | 'markdown' | 'code', originalFile?: OriginalDocumentFile) => void;
  onOpenLibrary?: () => void;
  initialDocument?: {
    title: string;
    content: string;
    type: 'text' | 'markdown' | 'code';
  };
}

const SendDocumentModal: React.FC<SendDocumentModalProps> = ({ onClose, onSend, onOpenLibrary, initialDocument }) => {
  const [title, setTitle] = useState(initialDocument?.title || '');
  const [content, setContent] = useState(initialDocument?.content || '');
  const [greeting, setGreeting] = useState('请查收');
  const [docType, setDocType] = useState<'text' | 'markdown' | 'code'>(initialDocument?.type || 'text');
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [lastUploadedFile, setLastUploadedFile] = useState<{ name: string; size: number; parsedChars: number } | null>(null);
  const [uploadedOriginalFile, setUploadedOriginalFile] = useState<OriginalDocumentFile | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  const handleSend = () => {
    if (!title.trim() || !content.trim()) {
      showToast('请填写文档标题和内容', 'error');
      return;
    }

    onSend(title.trim(), content.trim(), greeting.trim(), docType, uploadedOriginalFile || undefined);
    onClose();
  };

  const detectDocType = (fileName: string): 'text' | 'markdown' | 'code' => {
    const lower = fileName.toLowerCase();
    if (lower.endsWith('.md') || lower.endsWith('.markdown')) return 'markdown';
    if (/\.(js|jsx|ts|tsx|py|java|go|rs|cpp|c|cs|php|rb|swift|kt|json|yaml|yml|xml|sql|sh)$/.test(lower)) {
      return 'code';
    }
    return 'text';
  };

  const handlePickLocalFile = () => {
    fileInputRef.current?.click();
  };

  const readFileAsBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
      reader.onerror = () => reject(reader.error || new Error('读取文件失败'));
      reader.readAsDataURL(file);
    });

  const handleLocalFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsingFile(true);
    try {
      const { parseDocument } = await import('../utils/enhancedDocumentParser');
      const parsedText = await parseDocument(file);
      let base64Data: string | undefined;
      if (file.size <= 700 * 1024) {
        base64Data = await readFileAsBase64(file);
      } else {
        showToast('文件较大，已保留文件信息并发送可读内容', 'warning');
      }

      const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
      setTitle(fileNameWithoutExt || file.name);
      setContent(parsedText);
      setDocType(detectDocType(file.name));
      setUploadedOriginalFile({
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        fileSize: file.size,
        base64Data,
      });
      setLastUploadedFile({
        name: file.name,
        size: file.size,
        parsedChars: parsedText.length,
      });
      showToast(`已导入本地文件：${file.name}`, 'success');
    } catch (error) {
      console.error('本地文档解析失败:', error);
      showToast('文档解析失败，请上传 PDF / Word / TXT 文件', 'error');
    } finally {
      setIsParsingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md max-h-[90vh] flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="w-5 h-5" />
            发送文档
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 内容 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".txt,.pdf,.doc,.docx,.md,.markdown,.json,.js,.jsx,.ts,.tsx,.py,.java,.go,.rs,.cpp,.c,.cs,.php,.rb,.swift,.kt,.sql,.xml,.yaml,.yml,.sh"
            onChange={handleLocalFileUpload}
          />

          <button
            onClick={handlePickLocalFile}
            disabled={isParsingFile}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors disabled:opacity-60"
          >
            <Upload className="w-5 h-5" />
            <span>{isParsingFile ? '正在解析文件...' : '上传本地文件并发送'}</span>
          </button>

          {lastUploadedFile && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 px-3 py-2 text-xs text-emerald-800 space-y-1">
              <div>文件名：{lastUploadedFile.name}</div>
              <div>文件大小：{(lastUploadedFile.size / 1024).toFixed(1)} KB</div>
              <div>解析字数：{lastUploadedFile.parsedChars}</div>
            </div>
          )}

          {/* 从文档库选择按钮 */}
          {onOpenLibrary && !initialDocument && (
            <button
              onClick={() => {
                onClose();
                onOpenLibrary();
              }}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <Folder className="w-5 h-5" />
              <span>从文档库选择</span>
            </button>
          )}

          {/* 文档标题 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              文档标题
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例如：情书_草稿_v3"
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
              maxLength={50}
            />
          </div>

          {/* 文档类型 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              文档类型
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setDocType('text')}
                className={`flex-1 py-2 px-4 rounded-lg border-2 transition-all ${
                  docType === 'text'
                    ? 'border-blue-500 bg-blue-50 text-blue-600'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                📝 文本
              </button>
              <button
                onClick={() => setDocType('markdown')}
                className={`flex-1 py-2 px-4 rounded-lg border-2 transition-all ${
                  docType === 'markdown'
                    ? 'border-blue-500 bg-blue-50 text-blue-600'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                📄 Markdown
              </button>
              <button
                onClick={() => setDocType('code')}
                className={`flex-1 py-2 px-4 rounded-lg border-2 transition-all ${
                  docType === 'code'
                    ? 'border-blue-500 bg-blue-50 text-blue-600'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                💻 代码
              </button>
            </div>
          </div>

          {/* 文档内容 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                文档内容
              </label>
              <span className="text-xs text-gray-500">
                {content.length} 字符
              </span>
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="输入文档内容..."
              className="w-full h-48 px-4 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none resize-none font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              💡 用户发送的文档无字数限制
            </p>
          </div>

          {/* 问候语 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              问候语（选填）
            </label>
            <input
              type="text"
              value={greeting}
              onChange={(e) => setGreeting(e.target.value)}
              placeholder="请查收"
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
              maxLength={20}
            />
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="p-4 border-t">
          <button
            onClick={handleSend}
            className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
          >
            📤 发送文档
          </button>
        </div>
      </div>
    </div>
  );
};

export default SendDocumentModal;
