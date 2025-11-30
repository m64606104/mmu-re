import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, Upload, Brain, Trash2, Download, FileUp, Zap, X, Camera, RefreshCw, BookOpen, Plus, Edit, FileText, Users, Video } from 'lucide-react';
import { Conversation, ApiConfig, KnowledgeBaseItem } from '../types';
import MemoryManager from './MemoryManager';
import CallHistoryModal from './CallHistoryModal';
import RelationshipManagementScreen from './RelationshipManagementScreen';
import { addMomentPost } from '../utils/aiMomentsGenerator';
import { parseComplexFrequencyRules, getCurrentFrequencyRule, getRulesSummary } from '../utils/momentsFrequencyParser';
import '../styles/relationshipAnimations.css';

interface CharacterSettingsScreenProps {
  conversation: Conversation;
  allConversations: Conversation[];
  apiConfig: ApiConfig;
  onUpdateConversation: (id: string, updates: Partial<Conversation>) => void;
  onDeleteConversation?: (id: string) => void;
  onBack: () => void;
}

export default function CharacterSettingsScreen({
  conversation,
  allConversations,
  apiConfig,
  onUpdateConversation,
  onDeleteConversation,
  onBack,
}: CharacterSettingsScreenProps) {
  // 检查是否是AI儿童
  const isAIChild = !!conversation.aiChildData;
  
  const settings = conversation.characterSettings || {
    nickname: '',
    systemPrompt: '',
    personality: '',
    languageStyle: '',
    languageExample: '',
    memoryEvents: '',
  };

  const [nickname, setNickname] = useState(settings.nickname);
  const [username, setUsername] = useState(settings.username || '');
  const [avatar, setAvatar] = useState(settings.avatar || '');
  const [chatBackground, setChatBackground] = useState(settings.chatBackground || '');
  const [systemPrompt, setSystemPrompt] = useState(settings.systemPrompt);
  const [personality, setPersonality] = useState(settings.personality);
  const [languageStyle, setLanguageStyle] = useState(settings.languageStyle);
  const [languageExample, setLanguageExample] = useState(settings.languageExample);
  const [memoryEvents, setMemoryEvents] = useState(settings.memoryEvents);
  const [showMemoryManager, setShowMemoryManager] = useState(false);
  const [showRelationshipManager, setShowRelationshipManager] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showCallHistory, setShowCallHistory] = useState(false);
  const [importData, setImportData] = useState<{messages: any[], count: number} | null>(null);
  const [showMomentsTest, setShowMomentsTest] = useState(false);
  const [momentsType, setMomentsType] = useState<'text' | 'image'>('text');
  const [imageCount, setImageCount] = useState(1);
  const [showMigration, setShowMigration] = useState(false);
  const [includeMessages, setIncludeMessages] = useState(false);
  const [includeSubChats, setIncludeSubChats] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatImportRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  const backgroundInputRef = useRef<HTMLInputElement>(null);
  
  // AI主动发消息配置
  const [proactiveEnabled, setProactiveEnabled] = useState(settings.proactiveMessaging?.enabled || false);
  const [minInterval, setMinInterval] = useState(settings.proactiveMessaging?.minInterval || 30);
  const [maxInterval, setMaxInterval] = useState(settings.proactiveMessaging?.maxInterval || 120);
  const [activeHourStart, setActiveHourStart] = useState(settings.proactiveMessaging?.activeHourStart || 8);
  const [activeHourEnd, setActiveHourEnd] = useState(settings.proactiveMessaging?.activeHourEnd || 23);
  
  // 🧠 记忆系统配置
  const [memoryConfigEnabled, setMemoryConfigEnabled] = useState(settings.memoryConfig?.enabled ?? true);
  
  // 📸 朋友圈记忆配置
  const [momentsMemoryEnabled, setMomentsMemoryEnabled] = useState(settings.momentsMemoryConfig?.enabled ?? true);
  
  // 📸 朋友圈频率配置
  const [momentsFrequencyDescription, setMomentsFrequencyDescription] = useState(settings.momentsConfig?.description || '');
  const [parsedRules, setParsedRules] = useState<any>(null);
  const [currentRuleInfo, setCurrentRuleInfo] = useState<string>('');
  
  // 实时解析朋友圈频率规则
  useEffect(() => {
    if (momentsFrequencyDescription && momentsFrequencyDescription.trim()) {
      const rules = parseComplexFrequencyRules(momentsFrequencyDescription);
      setParsedRules(rules);
      
      const currentRule = getCurrentFrequencyRule(rules);
      setCurrentRuleInfo(currentRule.description);
    } else {
      setParsedRules(null);
      setCurrentRuleInfo('');
    }
  }, [momentsFrequencyDescription]);
  
  // 📝 自定义上下文配置
  const [contextConfigEnabled, setContextConfigEnabled] = useState(settings.contextConfig?.enabled || false);
  const [contextMessageCount, setContextMessageCount] = useState(settings.contextConfig?.messageCount || 20);
  
  // 📚 资料库配置
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeBaseItem[]>(settings.knowledgeBase || []);
  const [showKnowledgeModal, setShowKnowledgeModal] = useState(false);
  const [editingKnowledge, setEditingKnowledge] = useState<KnowledgeBaseItem | null>(null);
  const [knowledgeTitle, setKnowledgeTitle] = useState('');
  const [knowledgeContent, setKnowledgeContent] = useState('');
  const [customBubbleCss, setCustomBubbleCss] = useState(settings.customBubbleCss || '');
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [doiInput, setDoiInput] = useState('');
  const [isFetchingDOI, setIsFetchingDOI] = useState(false);

  const [isBlocked, setIsBlocked] = useState(conversation.isBlocked || false);

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleChatBackgroundUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        // 导入图片压缩工具
        const { compressChatBackground, formatFileSize } = await import('../utils/imageCompression');
        
        // 压缩图片
        const compressed = await compressChatBackground(file);
        
        console.log('🖼️ 聊天背景压缩完成:', {
          原始大小: formatFileSize(compressed.originalSize),
          压缩后: formatFileSize(compressed.size),
          压缩比: `${(1 - compressed.compressionRatio) * 100}%`
        });
        
        setChatBackground(compressed.dataUrl);
      } catch (error) {
        console.error('❌ 聊天背景压缩失败:', error);
        // 降级：直接使用原图
        const reader = new FileReader();
        reader.onloadend = () => {
          setChatBackground(reader.result as string);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  // 导出聊天记录
  const handleExportChat = () => {
    const chatData = {
      conversationId: conversation.id,
      conversationName: conversation.name,
      characterSettings: conversation.characterSettings,
      messages: conversation.messages,
      exportDate: new Date().toISOString(),
      appVersion: '1.0.0'
    };

    const dataStr = JSON.stringify(chatData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${conversation.name}_聊天记录_${new Date().toLocaleDateString()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    alert('聊天记录已导出！');
  };

  // 导入聊天记录
  const handleImportChat = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedData = JSON.parse(event.target?.result as string);
        
        // 验证数据格式
        if (!importedData.messages || !Array.isArray(importedData.messages)) {
          alert('导入文件格式不正确');
          return;
        }

        // 显示导入选项弹窗
        setImportData({
          messages: importedData.messages,
          count: importedData.messages.length
        });
        setShowImportModal(true);
        
        // 重置file input
        if (chatImportRef.current) {
          chatImportRef.current.value = '';
        }
      } catch (error) {
        console.error('导入失败:', error);
        alert('导入失败：文件格式错误或数据损坏');
      }
    };
    reader.readAsText(file);
  };

  const handleSave = () => {
    try {
      console.log('🔄 开始保存角色设置...');
      
      // 🔧 根据记忆系统开关同步更新 enabledFeatures
      const currentFeatures = conversation.enabledFeatures || [];
      let updatedFeatures = [...currentFeatures];
      
      if (memoryConfigEnabled) {
        // 如果开启记忆系统，确保 'memory-system' 在列表中
        if (!updatedFeatures.includes('memory-system')) {
          updatedFeatures.push('memory-system');
        }
      } else {
        // 如果关闭记忆系统，从列表中移除 'memory-system'
        updatedFeatures = updatedFeatures.filter(f => f !== 'memory-system');
      }
      
      console.log('📝 准备更新对话数据...');
      
      onUpdateConversation(conversation.id, {
        isBlocked, // 保存拉黑状态
        name: nickname || conversation.name,
        characterSettings: {
          avatar,
          nickname,
          username,
          chatBackground,
          systemPrompt,
          personality,
          languageStyle,
          languageExample,
          memoryEvents,
          proactiveMessaging: {
            enabled: proactiveEnabled,
            minInterval,
            maxInterval,
            activeHourStart,
            activeHourEnd,
            lastMessageTime: settings.proactiveMessaging?.lastMessageTime,
          },
          memoryConfig: {
            enabled: memoryConfigEnabled,
          },
          momentsMemoryConfig: {
            enabled: momentsMemoryEnabled,
          },
          momentsConfig: {
            description: momentsFrequencyDescription,
          },
          // 保存自定义气泡样式
          customBubbleCss,
          contextConfig: {
            enabled: contextConfigEnabled,
            messageCount: contextMessageCount,
          },
          knowledgeBase: knowledgeBase,
        },
        enabledFeatures: updatedFeatures, // 同步更新 enabledFeatures
      });
      
      console.log('✅ 角色设置保存成功');
      alert('角色设置已保存');
      
      // 使用 setTimeout 确保 alert 显示后再返回
      setTimeout(() => {
        onBack();
      }, 100);
    } catch (error) {
      console.error('❌ 保存角色设置失败:', error);
      alert('保存失败，请重试');
    }
  };

  const handleDelete = () => {
    if (window.confirm(`确定要删除联系人"${conversation.name}"吗？\n\n此操作将永久删除该对话及所有消息。`)) {
      if (onDeleteConversation) {
        onDeleteConversation(conversation.id);
        onBack();
      }
    }
  };

  // 资料库管理函数
  const handleAddKnowledge = () => {
    setEditingKnowledge(null);
    setKnowledgeTitle('');
    setKnowledgeContent('');
    setShowKnowledgeModal(true);
  };

  const handleEditKnowledge = (item: KnowledgeBaseItem) => {
    setEditingKnowledge(item);
    setKnowledgeTitle(item.title);
    setKnowledgeContent(item.content);
    setShowKnowledgeModal(true);
  };

  const handleSaveKnowledge = async () => {
    try {
      if (!knowledgeTitle.trim() || !knowledgeContent.trim()) {
        alert('请填写标题和内容');
        return;
      }

      console.log('🔄 开始保存资料库...');

      if (editingKnowledge) {
        // 编辑现有文档
        setKnowledgeBase(knowledgeBase.map(item =>
          item.id === editingKnowledge.id
            ? { ...item, title: knowledgeTitle, content: knowledgeContent, updatedAt: Date.now() }
            : item
        ));
      } else {
        // 添加新文档
        const newItem: KnowledgeBaseItem = {
          id: Date.now().toString(),
          title: knowledgeTitle,
          content: knowledgeContent,
          type: 'text',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        setKnowledgeBase([...knowledgeBase, newItem]);
        
        // 同时保存到文档库
        try {
          const { saveDocument } = await import('../utils/documentLibrary');
          const docToSave = {
            title: knowledgeTitle,
            content: knowledgeContent,
            type: 'text' as const,
            size: new Blob([knowledgeContent]).size,
          };
          saveDocument(docToSave, '用户上传');
          console.log('✅ 已同步保存到文档库');
        } catch (error) {
          console.error('保存到文档库失败:', error);
        }
      }

      console.log('✅ 资料库保存成功');
      
      // 使用 setTimeout 确保状态更新完成后再关闭弹窗
      setTimeout(() => {
        setShowKnowledgeModal(false);
        setKnowledgeTitle('');
        setKnowledgeContent('');
        setEditingKnowledge(null);
      }, 50);
    } catch (error) {
      console.error('❌ 保存资料库失败:', error);
      alert('保存失败，请重试');
    }
  };

  const handleDeleteKnowledge = (id: string) => {
    if (window.confirm('确定要删除这条资料吗？')) {
      setKnowledgeBase(knowledgeBase.filter(item => item.id !== id));
    }
  };

  // 处理DOI获取
  const handleFetchDOI = async () => {
    if (!doiInput.trim()) {
      alert('请输入DOI');
      return;
    }

    setIsFetchingDOI(true);
    
    try {
      const { fetchPaperByDOI, formatPaperToKnowledge, isValidDOI } = await import('../utils/doiParser');
      
      // 验证DOI格式
      if (!isValidDOI(doiInput)) {
        alert('DOI格式不正确\n\n✅ 正确格式示例：\n  10.1038/nature12373\n  https://doi.org/10.1126/science.123456');
        return;
      }
      
      // 获取论文元数据
      const paper = await fetchPaperByDOI(doiInput);
      
      // 格式化为知识库内容
      const formattedContent = formatPaperToKnowledge(paper);
      
      // 自动填充
      setKnowledgeTitle(paper.title);
      setKnowledgeContent(formattedContent);
      
      alert(`✅ 成功获取论文信息！\n\n📄 标题: ${paper.title}\n✍️ 作者: ${paper.authors.slice(0, 3).join(', ')}${paper.authors.length > 3 ? ' 等' : ''}\n📅 年份: ${paper.year}`);
      
      // 清空DOI输入
      setDoiInput('');
    } catch (error: any) {
      alert(`获取论文信息失败\n\n${error.message || '未知错误'}\n\n💡 提示：\n1. 检查DOI是否正确\n2. 检查网络连接\n3. 部分论文可能无法获取完整信息`);
      console.error('DOI获取失败:', error);
    } finally {
      setIsFetchingDOI(false);
    }
  };

  // 处理文档上传
  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsingFile(true);
    
    try {
      const { parseDocument } = await import('../utils/enhancedDocumentParser');
      const text = await parseDocument(file);
      
      // 自动填充标题和内容
      const fileName = file.name.replace(/\.(pdf|docx?|txt)$/i, '');
      setKnowledgeTitle(fileName);
      setKnowledgeContent(text);
      
      alert(`文档解析成功！\n提取了 ${text.length} 个字符`);
    } catch (error: any) {
      alert(`文档解析失败\n${error.message || '未知错误'}`);
      console.error('文档解析错误:', error);
    } finally {
      setIsParsingFile(false);
      // 清空input以允许重复上传同一文件
      if (documentInputRef.current) {
        documentInputRef.current.value = '';
      }
    }
  };

  // 处理角色迁移导出
  const handleExportCharacter = async () => {
    try {
      // 1. 获取记忆库数据（使用正确的存储key）
      const memoryBanksData = localStorage.getItem('chat_memory_banks');
      const allMemoryBanks = memoryBanksData ? JSON.parse(memoryBanksData) : [];
      const memoryBank = allMemoryBanks.find((bank: any) => bank.conversationId === conversation.id);
      const memories = memoryBank?.memories || [];
      
      // 2. 获取朋友圈数据
      const momentsKey = `moments_${conversation.id}`;
      const momentsData = localStorage.getItem(momentsKey);
      const moments = momentsData ? JSON.parse(momentsData) : null;
      
      // 3. 获取AI财务数据
      const financeKey = `ai_finance_${conversation.id}`;
      const financeData = localStorage.getItem(financeKey);
      const finance = financeData ? JSON.parse(financeData) : null;
      
      // 4. 获取关系网络数据（查找与此角色相关的关系）
      const relationshipsData = localStorage.getItem('relationships');
      const allRelationships = relationshipsData ? JSON.parse(relationshipsData) : [];
      const characterRelationships = allRelationships.filter(
        (rel: any) => rel.personId === conversation.id || rel.targetId === conversation.id
      );
      
      // 5. 获取文档库数据（知识库）
      const documentLibraryData = localStorage.getItem('document_library');
      const allDocuments = documentLibraryData ? JSON.parse(documentLibraryData) : [];
      const characterDocuments = allDocuments.filter(
        (doc: any) => doc.conversationId === conversation.id
      );
      
      // 6. 统计数据
      const stats = {
        messagesCount: conversation.messages.length,
        memoriesCount: memories.length || 0,
        momentsCount: moments?.posts?.length || 0,
        knowledgeBaseCount: conversation.characterSettings?.knowledgeBase?.length || 0,
        documentsCount: characterDocuments.length,
        relationshipsCount: characterRelationships.length,
        hasFinanceData: !!finance,
        hasAIStatus: !!conversation.aiStatus,
      };
      
      // 构建导出数据
      const exportData = {
        version: '2.0', // 升级版本号
        exportTime: new Date().toISOString(),
        
        // 基本信息
        character: {
          id: conversation.id, // 添加ID
          type: conversation.type, // 对话类型
          name: conversation.name,
          avatar: conversation.avatar,
          characterSettings: conversation.characterSettings, // 包含知识库knowledgeBase
          enabledFeatures: conversation.enabledFeatures,
          lastMessageTime: conversation.lastMessageTime,
          isMuted: conversation.isMuted,
          // 群聊相关
          groupRemark: conversation.groupRemark,
          members: conversation.members,
          // AI状态信息
          aiStatus: conversation.aiStatus,
        },
        
        // 记忆库（完整的MemoryBank数据）
        memoryBank: memoryBank,
        
        // 朋友圈数据
        moments: moments,
        
        // AI财务数据
        finance: finance,
        
        // 关系网络
        relationships: characterRelationships,
        
        // 文档库（角色相关的文档）
        documents: characterDocuments,
        
        // 消息记录（可选）
        messages: includeMessages ? conversation.messages : [],
        
        // 子聊天记录（可选）
        subChats: includeSubChats ? (conversation.subChats || []) : [],
        
        // 统计信息
        stats: stats,
      };
      
      // 生成文件
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      const fileName = `${conversation.name}_完整角色数据_${new Date().toLocaleDateString().replace(/\//g, '-')}.json`;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      // 显示详细的导出信息
      const message = `✅ 角色数据已导出！\n\n` +
        `📊 包含内容：\n` +
        `• 角色设置和性格\n` +
        `• 知识库文档: ${stats.knowledgeBaseCount} 份\n` +
        `• 文档库: ${stats.documentsCount} 份\n` +
        `• 记忆库: ${stats.memoriesCount} 条\n` +
        `• 朋友圈: ${stats.momentsCount} 条\n` +
        `• 关系网络: ${stats.relationshipsCount} 个\n` +
        `• AI状态信息: ${stats.hasAIStatus ? '有' : '无'}\n` +
        `• 财务数据: ${stats.hasFinanceData ? '有' : '无'}\n` +
        `• 消息记录: ${includeMessages ? stats.messagesCount + ' 条' : '未包含'}\n\n` +
        `📱 可以通过"扫一扫"功能导入到其他设备`;
      
      alert(message);
      setShowMigration(false);
    } catch (error) {
      console.error('导出失败:', error);
      alert('❌ 导出失败，请重试\n\n错误: ' + error);
    }
  };

  // 处理朋友圈测试
  const handleTestMoment = async () => {
    try {
      // 获取API配置
      const savedApiConfig = localStorage.getItem('apiConfig');
      if (!savedApiConfig) {
        alert('请先配置API设置');
        return;
      }
      const apiConfig: ApiConfig = JSON.parse(savedApiConfig);
      
      if (!apiConfig.baseUrl || !apiConfig.apiKey || !apiConfig.modelName) {
        alert('API配置不完整');
        return;
      }

      let content = '';
      let imageDescriptions: string[] = [];

      if (momentsType === 'text') {
        // 生成纯文字朋友圈
        content = `今天天气真好，心情也很不错😊`;
      } else {
        // 生成图片朋友圈
        content = `周末出去玩啦，风景好美🌸`;
        
        // 生成测试图片描述
        const sampleDescriptions = [
          '金色的阳光洒在波光粼粼的湖面上，远处的青山若隐若现，湖边的柳树随风轻轻摇曳，整个画面宁静而美好',
          '咖啡店的落地窗前，一杯拉花精致的卡布奇诺，旁边摆着打开的笔记本，阳光透过百叶窗在桌面上投下斑驳的光影',
          '夕阳西下，天空被染成橙红渐变色，城市的天际线在暮色中显得格外柔和，几只飞鸟掠过天际',
          '图书馆自习区的一角，堆叠的专业书籍和密密麻麻的笔记，书页间夹着彩色便签，散发着浓厚的学习氛围',
          '毛茸茸的橘猫慵懒地蜷缩在阳光下的沙发上，半眯着眼睛，尾巴轻轻搭在身侧，整个画面温馨而治愈',
          '晚餐桌上摆满了精致的菜肴，色香味俱全，餐具摆放整齐，温暖的灯光让食物看起来格外诱人',
          '健身房里，跑步机上的数据显示器闪烁着运动数据，旁边的毛巾和水杯，记录着努力的汗水',
          '书桌上整齐摆放着护肤品，各种瓶瓶罐罐在柔和的灯光下泛着温润的光泽，背景是简约的化妆镜',
          '街头的小店门口，五颜六色的花束摆放在复古的木桶里，空气中仿佛都弥漫着花香'
        ];
        
        for (let i = 0; i < imageCount; i++) {
          imageDescriptions.push(sampleDescriptions[i % sampleDescriptions.length]);
        }
      }

      // 创建朋友圈帖子对象
      const momentPost = {
        id: `test_moment_${Date.now()}`,
        authorId: conversation.id,
        authorName: conversation.characterSettings?.nickname || conversation.name,
        authorAvatar: conversation.characterSettings?.avatar || conversation.avatar,
        content,
        imageDescriptions: imageDescriptions.length > 0 ? imageDescriptions : undefined,
        timestamp: Date.now(),
        likes: [],
        comments: []
      };

      await addMomentPost(conversation.id, momentPost);

      alert('✅ 测试朋友圈发布成功！');
      setShowMomentsTest(false);
    } catch (error) {
      console.error('发布测试朋友圈失败:', error);
      alert('❌ 发布失败，请检查配置');
    }
  };

  return (
    <div className="h-full bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center">
          <button onClick={onBack} className="p-2 -ml-2">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-semibold ml-2">角色设置</h1>
        </div>
        <button
          onClick={handleSave}
          className="px-4 py-1.5 bg-blue-500 text-white text-sm rounded-lg font-medium hover:bg-blue-600 active:bg-blue-700 transition-colors"
        >
          保存
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* 🎨 外观设置 */}
        <details className="bg-white rounded-lg shadow-sm overflow-hidden group" open>
          <summary className="px-4 py-3 flex items-center justify-between bg-gray-50 border-b border-gray-100 cursor-pointer list-none select-none">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 bg-blue-500 rounded-full"></div>
              <h3 className="text-sm font-medium text-gray-900">外观设置</h3>
            </div>
            <ChevronLeft className="w-4 h-4 text-gray-500 transition-transform group-open:-rotate-90" />
          </summary>
          <div className="p-4 space-y-4">
            {/* Avatar */}
            <div className="bg-white rounded-lg border border-gray-100 p-3">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                角色头像
              </label>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center overflow-hidden">
                  {avatar ? (
                    <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white font-semibold text-2xl">
                      {nickname.charAt(0) || '?'}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  上传头像
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </div>
            </div>

            {/* Chat Background */}
            <div className="bg-white rounded-lg border border-gray-100 p-3">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                聊天背景
              </label>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-32 h-20 rounded-lg bg-gray-200 overflow-hidden border-2 border-gray-300">
                    {chatBackground ? (
                      <img src={chatBackground} alt="聊天背景" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                        <span className="text-gray-500 text-xs">无背景</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <button
                      onClick={() => backgroundInputRef.current?.click()}
                      className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors mb-2"
                    >
                      <Upload className="w-4 h-4" />
                      上传背景图
                    </button>
                    {chatBackground && (
                      <button
                        onClick={() => setChatBackground('')}
                        className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        移除背景
                      </button>
                    )}
                    <input
                      ref={backgroundInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleChatBackgroundUpload}
                      className="hidden"
                    />
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  💡 聊天背景会自动压缩以节省内存，每个聊天可独立设置
                </div>
              </div>
            </div>

            {/* Custom Bubble Style (New) */}
            <div className="bg-white rounded-lg border border-gray-100 p-3">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                自定义气泡样式 (CSS)
              </label>
              
              {/* Preview */}
              <div className="bg-gray-50 rounded-lg p-3 mb-3 border border-gray-200">
                <div className="text-xs text-gray-500 mb-2">预览效果：</div>
                <div className="space-y-3 p-4 bg-gray-100 rounded border border-gray-200 relative overflow-hidden" style={{ backgroundImage: chatBackground ? `url(${chatBackground})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center' }}>
                  {/* Inject scoped CSS for preview */}
                  <style>{customBubbleCss}</style>
                  
                  <div className="preview-area relative z-10">
                    {/* User Bubble */}
                    <div className="flex justify-end mb-4 items-end gap-2">
                      <div className="message-bubble user bg-green-50 border-green-100 rounded-2xl rounded-tr-sm p-3 shadow-sm border relative max-w-[80%]">
                        <p className="message-content text-sm text-gray-900">我方气泡预览</p>
                        <div className="message-tail absolute bottom-3 -right-1.5 w-3 h-3 bg-green-50 border-r border-b border-green-100 transform rotate-45"></div>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-gray-300 flex-shrink-0 overflow-hidden">
                         <div className="w-full h-full bg-gray-200"></div>
                      </div>
                    </div>
                    
                    {/* AI Bubble */}
                    <div className="flex justify-start items-end gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-400 flex-shrink-0 overflow-hidden">
                        {avatar && <img src={avatar} className="w-full h-full object-cover"/>}
                      </div>
                      <div className="message-bubble ai bg-white border-gray-100 rounded-2xl rounded-tl-sm p-3 shadow-sm border relative max-w-[80%]">
                        <p className="message-content text-sm text-gray-900">对方气泡预览</p>
                        <div className="message-tail absolute bottom-3 -left-1.5 w-3 h-3 bg-white border-l border-t border-gray-100 transform rotate-45"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <textarea
                value={customBubbleCss}
                onChange={(e) => setCustomBubbleCss(e.target.value)}
                placeholder={".message-bubble {\n  /* 通用样式 */\n}\n.message-bubble.user {\n  /* 我方样式 */\n}\n.message-bubble.ai {\n  /* 对方样式 */\n}"}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs"
              />
              <div className="mt-2 text-xs text-gray-500">
                <p>支持类名：</p>
                <ul className="list-disc list-inside ml-2 space-y-1 mt-1">
                  <li><code>.message-bubble</code>: 气泡容器</li>
                  <li><code>.message-bubble.user</code>: 我方气泡</li>
                  <li><code>.message-bubble.ai</code>: 对方气泡</li>
                  <li><code>.message-content</code>: 文字内容</li>
                  <li><code>.message-tail</code>: 气泡尾巴</li>
                </ul>
              </div>
            </div>
          </div>
        </details>

        {/* 👤 基本信息 */}
        <details className="bg-white rounded-lg shadow-sm overflow-hidden group">
          <summary className="px-4 py-3 flex items-center justify-between bg-gray-50 border-b border-gray-100 cursor-pointer list-none select-none">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 bg-green-500 rounded-full"></div>
              <h3 className="text-sm font-medium text-gray-900">基本信息</h3>
            </div>
            <ChevronLeft className="w-4 h-4 text-gray-500 transition-transform group-open:-rotate-90" />
          </summary>
          <div className="p-4 space-y-4">
            {/* Nickname */}
            <div className="bg-white rounded-lg border border-gray-100 p-3">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                备注名
              </label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="输入角色备注名"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Username */}
            <div className="bg-white rounded-lg border border-gray-100 p-3">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                角色网名
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="例如：AI小助手2024"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">在群聊中显示的网名</p>
            </div>

            {/* Block Switch */}
            <div className="bg-white rounded-lg border border-gray-100 p-3 flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  加入黑名单
                </label>
                <div className="text-xs text-gray-500 mt-1">
                  {isBlocked ? '已停止接收消息（点击保存生效）' : '拉黑后将不再接收对方的消息'}
                </div>
              </div>
              <button 
                onClick={() => setIsBlocked(!isBlocked)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${isBlocked ? 'bg-red-500' : 'bg-gray-200'}`}
              >
                <span className={`${isBlocked ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} />
              </button>
            </div>
          </div>
        </details>

        {/* 🎭 角色设定 (仅非AI儿童) */}
        {!isAIChild && (
          <details className="bg-white rounded-lg shadow-sm overflow-hidden group">
            <summary className="px-4 py-3 flex items-center justify-between bg-gray-50 border-b border-gray-100 cursor-pointer list-none select-none">
              <div className="flex items-center gap-2">
                <div className="w-1 h-4 bg-purple-500 rounded-full"></div>
                <h3 className="text-sm font-medium text-gray-900">角色设定</h3>
              </div>
              <ChevronLeft className="w-4 h-4 text-gray-500 transition-transform group-open:-rotate-90" />
            </summary>
            <div className="p-4 space-y-4">
              {/* System Prompt */}
              <div className="bg-white rounded-lg border border-gray-100 p-3">
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">
                人物设定
              </label>
              <span className={`text-xs ${systemPrompt.length > 200 ? 'text-orange-600 font-medium' : 'text-gray-500'}`}>
                {systemPrompt.length} / 200字
              </span>
            </div>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="描述角色的背景、身份、职业等"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            {systemPrompt.length > 200 && (
              <p className="text-xs text-orange-600 mt-1">
                ⚠️ 内容过长可能导致AI回复变慢，建议精简描述
              </p>
            )}
          </div>

          {/* Personality */}
          <div className="bg-white rounded-lg border border-gray-100 p-3">
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">
                性格特征
              </label>
              <span className={`text-xs ${personality.length > 150 ? 'text-orange-600 font-medium' : 'text-gray-500'}`}>
                {personality.length} / 150字
              </span>
            </div>
            <textarea
              value={personality}
              onChange={(e) => setPersonality(e.target.value)}
              placeholder="描述角色的性格特点"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            {personality.length > 150 && (
              <p className="text-xs text-orange-600 mt-1">
                ⚠️ 内容过长可能导致AI回复变慢，建议精简描述
              </p>
            )}
          </div>

          {/* Language Style */}
          <div className="bg-white rounded-lg border border-gray-100 p-3">
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">
                语言风格
              </label>
              <span className={`text-xs ${languageStyle.length > 150 ? 'text-orange-600 font-medium' : 'text-gray-500'}`}>
                {languageStyle.length} / 150字
              </span>
            </div>
            <textarea
              value={languageStyle}
              onChange={(e) => setLanguageStyle(e.target.value)}
              placeholder="描述角色的说话方式和语言习惯"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            {languageStyle.length > 150 && (
              <p className="text-xs text-orange-600 mt-1">
                ⚠️ 内容过长可能导致AI回复变慢，建议精简描述
              </p>
            )}
          </div>

          {/* Language Example */}
          <div className="bg-white rounded-lg border border-gray-100 p-3">
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">
                语言示例
              </label>
              <span className={`text-xs ${languageExample.length > 300 ? 'text-orange-600 font-medium' : 'text-gray-500'}`}>
                {languageExample.length} / 300字
              </span>
            </div>
            <textarea
              value={languageExample}
              onChange={(e) => setLanguageExample(e.target.value)}
              placeholder="提供一些角色的典型对话示例"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            {languageExample.length > 300 && (
              <p className="text-xs text-orange-600 mt-1">
                ⚠️ 内容过长可能导致AI回复变慢，建议提供2-3个简短示例
              </p>
            )}
          </div>

          {/* Memory Events */}
          <div className="bg-white rounded-lg border border-gray-100 p-3">
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">
                记忆事件
              </label>
              <span className={`text-xs ${memoryEvents.length > 200 ? 'text-orange-600 font-medium' : 'text-gray-500'}`}>
                {memoryEvents.length} / 200字
              </span>
            </div>
            <textarea
              value={memoryEvents}
              onChange={(e) => setMemoryEvents(e.target.value)}
              placeholder="记录与角色相关的重要事件和记忆"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            {memoryEvents.length > 200 && (
              <p className="text-xs text-orange-600 mt-1">
                ⚠️ 内容过长可能导致AI回复变慢，建议使用长期记忆库功能代替
              </p>
            )}
          </div>
          </div>
        </details>
        )}

        {/* ⚙️ 高级功能 (仅非AI儿童) */}
        {!isAIChild && (
          <details className="bg-white rounded-lg shadow-sm overflow-hidden group">
            <summary className="px-4 py-3 flex items-center justify-between bg-gray-50 border-b border-gray-100 cursor-pointer list-none select-none">
              <div className="flex items-center gap-2">
                <div className="w-1 h-4 bg-orange-500 rounded-full"></div>
                <h3 className="text-sm font-medium text-gray-900">高级功能</h3>
              </div>
              <ChevronLeft className="w-4 h-4 text-gray-500 transition-transform group-open:-rotate-90" />
            </summary>
            <div className="p-4 space-y-4">
              
              {/* Memory Manager */}
              <div className="bg-white rounded-lg border border-gray-100 p-3">
                <button
                  onClick={() => setShowMemoryManager(true)}
                  className="w-full py-2 border border-purple-200 hover:bg-purple-50 rounded-lg transition-colors flex items-center justify-center gap-2 text-purple-700"
                >
                  <Brain className="w-4 h-4" />
                  <span className="font-medium text-sm">查看长期记忆库</span>
                </button>
                <p className="text-xs text-gray-500 mt-2 text-center">
                  💡 AI会自动记住对话中的重要信息
                </p>
              </div>

              {/* Relationship Manager */}
              <div className="bg-white rounded-lg border border-gray-100 p-3">
                <button
                  onClick={() => setShowRelationshipManager(true)}
                  className="w-full py-2 border border-blue-200 hover:bg-blue-50 rounded-lg transition-colors flex items-center justify-center gap-2 text-blue-700"
                >
                  <Users className="w-4 h-4" />
                  <span className="font-medium text-sm">人际关系管理</span>
                </button>
                <p className="text-xs text-gray-500 mt-2 text-center">
                  👥 管理角色的社交网络和关系
                </p>
              </div>

              {/* Proactive Messaging */}
              <div className="bg-white rounded-lg border border-gray-100 p-3">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-orange-500" />
                    <h3 className="text-sm font-medium text-gray-900">AI主动发消息</h3>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={proactiveEnabled}
                      onChange={(e) => setProactiveEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {proactiveEnabled && (
                  <div className="space-y-4 mt-4">
                    {/* 消息间隔 */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm text-gray-600">消息间隔</label>
                        <span className="text-xs text-gray-500">分钟</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          type="number"
                          value={minInterval}
                          onChange={(e) => setMinInterval(Math.max(10, parseInt(e.target.value) || 10))}
                          min="10"
                          max="240"
                          className="w-20 px-3 py-2 text-center border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="text-gray-500">-</span>
                        <input
                          type="number"
                          value={maxInterval}
                          onChange={(e) => setMaxInterval(Math.max(minInterval, parseInt(e.target.value) || 120))}
                          min={minInterval}
                          max="480"
                          className="w-20 px-3 py-2 text-center border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    {/* 活跃时段 */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm text-gray-600">活跃时段</label>
                        <span className="text-xs text-gray-500">点（0-23）</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={activeHourStart}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '' || /^\d+$/.test(val)) {
                              const num = val === '' ? 0 : parseInt(val);
                              if (num >= 0 && num <= 23) setActiveHourStart(num);
                            }
                          }}
                          onBlur={(e) => {
                            const val = e.target.value;
                            if (val === '') setActiveHourStart(0);
                          }}
                          placeholder="0"
                          className="w-20 px-3 py-2 text-center border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="text-gray-500">-</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={activeHourEnd}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '' || /^\d+$/.test(val)) {
                              const num = val === '' ? 23 : parseInt(val);
                              if (num >= 0 && num <= 23) setActiveHourEnd(num);
                            }
                          }}
                          onBlur={(e) => {
                            const val = e.target.value;
                            if (val === '') {
                              setActiveHourEnd(Math.max(activeHourStart, 23));
                            } else {
                              const num = parseInt(val);
                              if (num < activeHourStart) setActiveHourEnd(activeHourStart);
                            }
                          }}
                          placeholder="23"
                          className="w-20 px-3 py-2 text-center border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    {/* 说明 */}
                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                      <p className="text-xs text-blue-700 leading-relaxed">
                        💡 AI会在设定的时间段内，根据情境主动发送消息与你聊天
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Memory Config */}
              <div className="bg-white rounded-lg border border-gray-100 p-3">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Brain className="w-5 h-5 text-purple-500" />
                    <h3 className="text-sm font-medium text-gray-900">完整记忆系统</h3>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={memoryConfigEnabled}
                      onChange={(e) => setMemoryConfigEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>
                <div className={`rounded-lg p-3 ${
                  memoryConfigEnabled ? 'bg-purple-50 border border-purple-100' : 'bg-gray-50 border border-gray-200'
                }`}>
                  <p className={`text-xs leading-relaxed ${
                    memoryConfigEnabled ? 'text-purple-700' : 'text-gray-600'
                  }`}>
                    {memoryConfigEnabled ? (
                      <><span className="font-medium">✅ 已开启</span> - 每次对话都包含完整记忆库内容，AI能记住所有重要信息（性能要求较高）</>
                    ) : (
                      <><span className="font-medium">⚡ 已关闭</span> - 仅在需要时调取记忆，性能更友好，适合轻量级使用</>
                    )}
                  </p>
                </div>
              </div>

              {/* Moments Memory */}
              <div className="bg-white rounded-lg border border-gray-100 p-3">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Camera className="w-5 h-5 text-pink-500" />
                    <h3 className="text-sm font-medium text-gray-900">朋友圈记忆</h3>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={momentsMemoryEnabled}
                      onChange={(e) => setMomentsMemoryEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-pink-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-600"></div>
                  </label>
                </div>
                <div className={`rounded-lg p-3 ${
                  momentsMemoryEnabled ? 'bg-pink-50 border border-pink-100' : 'bg-gray-50 border border-gray-200'
                }`}>
                  <p className={`text-xs leading-relaxed ${
                    momentsMemoryEnabled ? 'text-pink-700' : 'text-gray-600'
                  }`}>
                    {momentsMemoryEnabled ? (
                      <><span className="font-medium">✅ 已开启</span> - AI会记住查看过的朋友圈内容，可以在聊天中提及</>
                    ) : (
                      <><span className="font-medium">⚡ 已关闭</span> - 朋友圈内容不会记录到记忆库，减少记忆负担</>
                    )}
                  </p>
                </div>
              </div>

              {/* Moments Frequency */}
              <div className="bg-white rounded-lg border border-gray-100 p-3">
                <div className="flex items-center gap-2 mb-3">
                  <RefreshCw className="w-5 h-5 text-indigo-500" />
                  <h3 className="text-sm font-medium text-gray-900">朋友圈发布频率</h3>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">
                      用你的话描述发布习惯：
                    </label>
                    <textarea
                      value={momentsFrequencyDescription}
                      onChange={(e) => setMomentsFrequencyDescription(e.target.value)}
                      placeholder={"例如：\n工作日比较忙，偶尔发一次\n周末会多发一些，大概一天一次\n假期会疯狂发朋友圈，记录生活"}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none text-sm"
                    />
                  </div>
                  
                  {/* 智能分析结果 */}
                  {parsedRules && (
                    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-lg p-3">
                      <div className="flex items-start gap-2 mb-2">
                        <span className="text-indigo-700 text-xs font-medium">✨ 智能分析结果：</span>
                      </div>
                      <div className="space-y-1">
                        {getRulesSummary(parsedRules).map((rule, index) => (
                          <div key={index} className="text-xs text-gray-700">
                            {rule}
                          </div>
                        ))}
                      </div>
                      {currentRuleInfo && (
                        <div className="mt-2 pt-2 border-t border-indigo-200">
                          <div className="text-xs text-indigo-600">
                            📍 当前时间应用规则：
                            <span className="font-medium ml-1">{currentRuleInfo}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* 示例提示 */}
                  <details className="text-sm">
                    <summary className="cursor-pointer text-indigo-600 font-medium text-xs hover:text-indigo-700">
                      💡 查看示例
                    </summary>
                    <div className="mt-2 space-y-3 p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium text-xs text-gray-900">📝 学生示例：</div>
                        <div className="text-gray-600 text-xs mt-1 leading-relaxed">
                          平时上课比较忙，一周发一两次<br/>
                          周末和朋友出去玩会多发<br/>
                          寒暑假基本天天发，记录生活
                        </div>
                      </div>
                      <div>
                        <div className="font-medium text-xs text-gray-900">📝 上班族示例：</div>
                        <div className="text-gray-600 text-xs mt-1 leading-relaxed">
                          工作日很少发，太忙了<br/>
                          周末偶尔发一下，放松心情<br/>
                          月底发工资时会发红包和庆祝
                        </div>
                      </div>
                    </div>
                  </details>
                </div>
              </div>

              {/* Context Config */}
              <div className="bg-white rounded-lg border border-gray-100 p-3">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <FileUp className="w-5 h-5 text-blue-500" />
                    <h3 className="text-sm font-medium text-gray-900">自定义上下文数量</h3>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={contextConfigEnabled}
                      onChange={(e) => setContextConfigEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {contextConfigEnabled && (
                  <div className="space-y-3 mt-4">
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="1"
                        max="100"
                        value={contextMessageCount}
                        onChange={(e) => setContextMessageCount(parseInt(e.target.value))}
                        className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={contextMessageCount}
                        onChange={(e) => setContextMessageCount(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                        className="w-20 px-3 py-2 text-center border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                      <p className="text-xs text-blue-700 leading-relaxed">
                        💡 当前设置：发送给AI <span className="font-medium">{contextMessageCount}</span> 条历史消息作为上下文
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Knowledge Base */}
              <div className="bg-white rounded-lg border border-gray-100 p-3">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-purple-500" />
                    <h3 className="text-sm font-medium text-gray-900">专属资料库</h3>
                  </div>
                  <button
                    onClick={handleAddKnowledge}
                    className="flex items-center gap-1 px-3 py-1.5 bg-purple-500 hover:bg-purple-600 text-white text-xs rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>新建资料</span>
                  </button>
                </div>

                {knowledgeBase.length > 0 ? (
                  <div className="space-y-2">
                    {knowledgeBase.map(item => (
                      <div key={item.id} className="bg-gray-50 border border-gray-200 rounded-lg p-3 hover:bg-gray-100 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <FileText className="w-4 h-4 text-purple-500" />
                              <h4 className="text-sm font-medium text-gray-900">{item.title}</h4>
                            </div>
                            <p className="text-xs text-gray-600 line-clamp-2">{item.content}</p>
                          </div>
                          <div className="flex gap-1 ml-2">
                            <button
                              onClick={() => handleEditKnowledge(item)}
                              className="p-1.5 hover:bg-white rounded transition-colors"
                            >
                              <Edit className="w-4 h-4 text-blue-500" />
                            </button>
                            <button
                              onClick={() => handleDeleteKnowledge(item.id)}
                              className="p-1.5 hover:bg-white rounded transition-colors"
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-400">
                    <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">暂无资料，点击上方按钮添加</p>
                  </div>
                )}
              </div>

            </div>
          </details>
        )}

        {/* 🛠 数据管理 */}
        <details className="bg-white rounded-lg shadow-sm overflow-hidden group">
          <summary className="px-4 py-3 flex items-center justify-between bg-gray-50 border-b border-gray-100 cursor-pointer list-none select-none">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 bg-gray-500 rounded-full"></div>
              <h3 className="text-sm font-medium text-gray-900">数据管理</h3>
            </div>
            <ChevronLeft className="w-4 h-4 text-gray-500 transition-transform group-open:-rotate-90" />
          </summary>
          <div className="p-4 space-y-4">
            
            {/* Call History */}
            <div className="bg-white rounded-lg border border-gray-100 p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Video className="w-5 h-5 text-blue-500" />
                  <h3 className="text-sm font-medium text-gray-900">通话记录</h3>
                </div>
                <button
                  onClick={() => setShowCallHistory(true)}
                  className="px-3 py-1.5 bg-blue-50 text-blue-600 text-xs font-medium rounded-lg hover:bg-blue-100 transition-colors"
                >
                  查看记录
                </button>
              </div>
              <div className="mt-3 bg-gray-50 border border-gray-200 rounded-lg p-3">
                <p className="text-xs text-gray-600">
                  共 {conversation.callHistory?.length || 0} 次通话记录，
                  总时长 {Math.floor((conversation.callHistory?.reduce((acc, log) => acc + log.duration, 0) || 0) / 60)} 分钟
                </p>
              </div>
            </div>

            {/* Character Migration (!isAIChild) */}
            {!isAIChild && (
              <div className="bg-white rounded-lg border border-gray-100 p-3">
                <h3 className="text-sm font-medium text-gray-700 mb-3">角色迁移</h3>
                <button
                  onClick={() => setShowMigration(true)}
                  className="w-full py-3 border-2 border-orange-200 hover:border-orange-400 hover:bg-orange-50 rounded-lg transition-colors flex items-center justify-center gap-2 text-orange-700"
                >
                  <RefreshCw className="w-5 h-5" />
                  <span className="font-medium">迁移角色数据</span>
                </button>
                <p className="text-xs text-gray-500 mt-2 text-center">
                  📦 导出/导入角色设置、记忆库和聊天记录
                </p>
              </div>
            )}

            {/* Moments Test (!isAIChild) */}
            {!isAIChild && (
              <div className="bg-white rounded-lg border border-gray-100 p-3">
                <h3 className="text-sm font-medium text-gray-700 mb-3">朋友圈测试</h3>
                <button
                  onClick={() => setShowMomentsTest(true)}
                  className="w-full py-3 border-2 border-purple-200 hover:border-purple-400 hover:bg-purple-50 rounded-lg transition-colors flex items-center justify-center gap-2 text-purple-700"
                >
                  <Camera className="w-5 h-5" />
                  <span className="font-medium">发布测试朋友圈</span>
                </button>
                <p className="text-xs text-gray-500 mt-2 text-center">
                  🧪 测试不同类型的朋友圈样式
                </p>
              </div>
            )}

            {/* Chat Export/Import (!isAIChild) */}
            {!isAIChild && (
              <div className="bg-white rounded-lg border border-gray-100 p-3">
                <h3 className="text-sm font-medium text-gray-700 mb-3">聊天记录管理</h3>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={handleExportChat}
                    className="py-3 border-2 border-green-200 hover:border-green-400 hover:bg-green-50 rounded-lg transition-colors flex items-center justify-center gap-2 text-green-700"
                  >
                    <Download className="w-5 h-5" />
                    <span className="font-medium">导出记录</span>
                  </button>
                  <button
                    onClick={() => chatImportRef.current?.click()}
                    className="py-3 border-2 border-blue-200 hover:border-blue-400 hover:bg-blue-50 rounded-lg transition-colors flex items-center justify-center gap-2 text-blue-700"
                  >
                    <FileUp className="w-5 h-5" />
                    <span className="font-medium">导入记录</span>
                  </button>
                </div>
                <input
                  ref={chatImportRef}
                  type="file"
                  accept=".json"
                  onChange={handleImportChat}
                  className="hidden"
                />
                <p className="text-xs text-gray-500 mt-2 text-center">
                  💾 导出后可在其他设备导入，保留所有聊天记录
                </p>
              </div>
            )}

            {/* Delete Contact */}
            <button
              onClick={handleDelete}
              className="w-full bg-red-500 text-white py-3 rounded-lg font-medium hover:bg-red-600 active:bg-red-700 transition-colors flex items-center justify-center gap-2"
            >
              <Trash2 className="w-5 h-5" />
              删除联系人
            </button>
          </div>
        </details>
      </div>

      {/* 记忆管理器 */}
      {showMemoryManager && (
        <MemoryManager
          conversationId={conversation.id}
          conversationName={conversation.name}
          onClose={() => setShowMemoryManager(false)}
        />
      )}

      {/* 关系管理界面 */}
      {showRelationshipManager && (
        <RelationshipManagementScreen
          conversation={conversation}
          allConversations={allConversations}
          apiConfig={apiConfig}
          onBack={() => setShowRelationshipManager(false)}
        />
      )}

      {/* 通话记录查看 */}
      <CallHistoryModal
        isOpen={showCallHistory}
        onClose={() => setShowCallHistory(false)}
        callHistory={conversation.callHistory || []}
        characterName={nickname}
      />

      {/* 角色迁移弹窗 */}
      {showMigration && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                角色迁移
              </h3>
              <button
                onClick={() => setShowMigration(false)}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-lg">
              <p className="text-xs text-blue-700 leading-relaxed">
                <span className="font-semibold">📦 包含内容：</span><br />
                • 角色设置和性格<br />
                • 知识库文档<br />
                • 记忆库（完整的AI记忆）<br />
                • 朋友圈内容<br />
                • AI状态信息<br />
                • 财务数据<br />
                • 关系网络<br />
                • 聊天记录（可选）
              </p>
            </div>

            {/* 导出选项 */}
            <div className="mb-6">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg mb-3">
                <span className="text-sm text-gray-700">包含聊天记录</span>
                <button
                  onClick={() => setIncludeMessages(!includeMessages)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    includeMessages ? 'bg-blue-500' : 'bg-gray-300'
                  }`}
                >
                  <div
                    className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      includeMessages ? 'translate-x-6' : ''
                    }`}
                  />
                </button>
              </div>
              <p className="text-xs text-gray-500">
                {includeMessages ? '✅ 将导出所有聊天消息（文件较大）' : '💡 仅导出角色核心数据（推荐）'}
              </p>
            </div>
            
            {/* 子聊天选项 */}
            <div className="mb-6">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg mb-3">
                <span className="text-sm text-gray-700">包含子聊天记录</span>
                <button
                  onClick={() => setIncludeSubChats(!includeSubChats)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    includeSubChats ? 'bg-purple-500' : 'bg-gray-300'
                  }`}
                >
                  <div
                    className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      includeSubChats ? 'translate-x-6' : ''
                    }`}
                  />
                </button>
              </div>
              <p className="text-xs text-gray-500">
                {includeSubChats ? `✅ 将导出 ${(conversation.subChats || []).length} 个子聊天的完整记录` : '💡 不包含子聊天记录'}
              </p>
            </div>

            {/* 操作按钮 */}
            <div className="space-y-3">
              <button
                onClick={handleExportCharacter}
                className="w-full py-3 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors font-medium flex items-center justify-center gap-2"
              >
                <Download className="w-5 h-5" />
                导出角色数据
              </button>
              <button
                onClick={() => setShowMigration(false)}
                className="w-full py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
              >
                取消
              </button>
            </div>

            {/* 提示信息 */}
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-xs text-blue-700 leading-relaxed">
                💡 <strong>导入方式：</strong><br/>
                在新建对话时使用"扫一扫"功能，扫描或选择导出的JSON文件即可一键导入
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 朋友圈测试弹窗 */}
      {showMomentsTest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                朋友圈测试
              </h3>
              <button
                onClick={() => setShowMomentsTest(false)}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            
            {/* 类型选择 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">朋友圈类型</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setMomentsType('text')}
                  className={`py-2 px-4 rounded-lg font-medium transition-colors ${
                    momentsType === 'text'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  纯文字
                </button>
                <button
                  onClick={() => setMomentsType('image')}
                  className={`py-2 px-4 rounded-lg font-medium transition-colors ${
                    momentsType === 'image'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  图片
                </button>
              </div>
            </div>

            {/* 图片数量选择 */}
            {momentsType === 'image' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">图片数量（1-9张）</label>
                <div className="grid grid-cols-5 gap-2 mb-2">
                  {[1, 2, 3, 4, 5].map((count) => (
                    <button
                      key={count}
                      onClick={() => setImageCount(count)}
                      className={`py-2 rounded-lg font-medium transition-colors ${
                        imageCount === count
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {count}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[6, 7, 8, 9].map((count) => (
                    <button
                      key={count}
                      onClick={() => setImageCount(count)}
                      className={`py-2 rounded-lg font-medium transition-colors ${
                        imageCount === count
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {count}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2 text-center">
                  📐 支持微信朋友圈全部布局样式
                </p>
              </div>
            )}

            {/* 操作按钮 */}
            <div className="space-y-3 mt-6">
              <button
                onClick={handleTestMoment}
                className="w-full py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors font-medium"
              >
                发布测试朋友圈
              </button>
              <button
                onClick={() => setShowMomentsTest(false)}
                className="w-full py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 导入消息弹窗 */}
      {showImportModal && importData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                导入 {importData.count} 条消息记录
              </h3>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportData(null);
                }}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              请选择导入方式：
            </p>
            <div className="space-y-3">
              <button
                onClick={() => {
                  onUpdateConversation(conversation.id, {
                    messages: importData.messages
                  });
                  alert(`成功替换为 ${importData.count} 条消息！`);
                  setShowImportModal(false);
                  setImportData(null);
                }}
                className="w-full px-4 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors font-medium"
              >
                替换现有全部消息
              </button>
              <button
                onClick={() => {
                  onUpdateConversation(conversation.id, {
                    messages: [...conversation.messages, ...importData.messages]
                  });
                  alert(`成功追加 ${importData.count} 条消息！`);
                  setShowImportModal(false);
                  setImportData(null);
                }}
                className="w-full px-4 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors font-medium"
              >
                追加消息
              </button>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportData(null);
                }}
                className="w-full px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 资料库编辑弹窗 */}
      {showKnowledgeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingKnowledge ? '编辑资料' : '新建资料'}
              </h3>
              <button
                onClick={() => {
                  setShowKnowledgeModal(false);
                  setKnowledgeTitle('');
                  setKnowledgeContent('');
                  setEditingKnowledge(null);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  资料标题
                </label>
                <input
                  type="text"
                  value={knowledgeTitle}
                  onChange={(e) => setKnowledgeTitle(e.target.value)}
                  placeholder="例如：语C术语表、角色背景设定"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              {/* DOI输入区域 */}
              <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <label className="block text-sm font-medium text-blue-900 mb-2">
                  📚 学术论文DOI（推荐）
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={doiInput}
                    onChange={(e) => setDoiInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleFetchDOI()}
                    placeholder="例如: 10.1038/nature12373 或 https://doi.org/10.xxx"
                    className="flex-1 px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    disabled={isFetchingDOI}
                  />
                  <button
                    type="button"
                    onClick={handleFetchDOI}
                    disabled={isFetchingDOI || !doiInput.trim()}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium whitespace-nowrap"
                  >
                    {isFetchingDOI ? '获取中...' : '获取论文'}
                  </button>
                </div>
                <p className="text-xs text-blue-700 mt-2">
                  🎓 输入DOI自动获取论文标题、作者、摘要等信息
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    资料内容
                  </label>
                  <button
                    type="button"
                    onClick={() => documentInputRef.current?.click()}
                    disabled={isParsingFile}
                    className="flex items-center gap-1 px-3 py-1 text-xs bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <Upload className="w-3 h-3" />
                    {isParsingFile ? '解析中...' : '上传文档'}
                  </button>
                  <input
                    ref={documentInputRef}
                    type="file"
                    accept=".pdf,.docx,.doc,.txt"
                    onChange={handleDocumentUpload}
                    className="hidden"
                  />
                </div>
                <textarea
                  value={knowledgeContent}
                  onChange={(e) => setKnowledgeContent(e.target.value)}
                  placeholder="输入详细的资料内容，AI会在对话中参考这些信息...&#10;&#10;或使用上方DOI获取论文信息，或点击右上角上传PDF、Word、TXT文档"
                  rows={12}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                />
                <div className="flex items-start gap-2 mt-2">
                  <div className="text-xs text-gray-500 flex-1">
                    <p className="font-medium text-gray-700 mb-1">📖 支持三种方式添加资料：</p>
                    <p>• 🎓 <strong>DOI获取</strong>：自动获取论文元数据（推荐学术论文）</p>
                    <p>• 📄 <strong>上传文档</strong>：PDF、Word、TXT自动解析</p>
                    <p>• ✍️ <strong>手动输入</strong>：直接编辑文本内容</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSaveKnowledge}
                className="flex-1 px-4 py-3 bg-purple-500 text-white rounded-xl hover:bg-purple-600 transition-colors font-medium"
              >
                保存
              </button>
              <button
                onClick={() => {
                  setShowKnowledgeModal(false);
                  setKnowledgeTitle('');
                  setKnowledgeContent('');
                  setEditingKnowledge(null);
                }}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
