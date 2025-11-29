/**
 * API预设方案管理器
 * 支持用户保存和管理多个API配置方案
 */

export interface APIPreset {
  id: string;
  name: string;
  apiUrl: string;
  apiKey: string;
  model: string;
  description?: string;
  isDefault?: boolean;
  createdAt: number;
  lastUsed?: number;
}

export interface APIPresetsData {
  presets: APIPreset[];
  currentPresetId?: string;
}

const STORAGE_KEY = 'api_presets_data';

/**
 * API预设管理器类
 */
export class APIPresetsManager {
  private static instance: APIPresetsManager;
  private presets: APIPreset[] = [];
  private currentPresetId: string | null = null;

  private constructor() {
    this.loadFromStorage();
  }

  static getInstance(): APIPresetsManager {
    if (!APIPresetsManager.instance) {
      APIPresetsManager.instance = new APIPresetsManager();
    }
    return APIPresetsManager.instance;
  }

  /**
   * 从localStorage加载预设数据
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data: APIPresetsData = JSON.parse(stored);
        this.presets = data.presets || [];
        this.currentPresetId = data.currentPresetId || null;
      }
    } catch (error) {
      console.error('加载API预设失败:', error);
      this.presets = [];
      this.currentPresetId = null;
    }
  }

  /**
   * 保存预设数据到localStorage
   */
  private saveToStorage(): void {
    try {
      const data: APIPresetsData = {
        presets: this.presets,
        currentPresetId: this.currentPresetId || undefined
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('保存API预设失败:', error);
    }
  }

  /**
   * 获取所有预设
   */
  getPresets(): APIPreset[] {
    return [...this.presets];
  }

  /**
   * 获取当前预设
   */
  getCurrentPreset(): APIPreset | null {
    if (!this.currentPresetId) return null;
    return this.presets.find(p => p.id === this.currentPresetId) || null;
  }

  /**
   * 添加或更新预设
   */
  savePreset(preset: Omit<APIPreset, 'id' | 'createdAt'>): APIPreset {
    const existingIndex = this.presets.findIndex(p => p.name === preset.name);
    
    const newPreset: APIPreset = {
      ...preset,
      id: existingIndex >= 0 ? this.presets[existingIndex].id : Date.now().toString(),
      createdAt: existingIndex >= 0 ? this.presets[existingIndex].createdAt : Date.now(),
      lastUsed: Date.now()
    };

    if (existingIndex >= 0) {
      this.presets[existingIndex] = newPreset;
    } else {
      this.presets.push(newPreset);
    }

    this.saveToStorage();
    return newPreset;
  }

  /**
   * 删除预设
   */
  deletePreset(id: string): boolean {
    const index = this.presets.findIndex(p => p.id === id);
    if (index >= 0) {
      this.presets.splice(index, 1);
      
      // 如果删除的是当前预设，清空当前选择
      if (this.currentPresetId === id) {
        this.currentPresetId = null;
      }
      
      this.saveToStorage();
      return true;
    }
    return false;
  }

  /**
   * 切换到指定预设
   */
  switchToPreset(id: string): APIPreset | null {
    const preset = this.presets.find(p => p.id === id);
    if (preset) {
      this.currentPresetId = id;
      preset.lastUsed = Date.now();
      this.saveToStorage();
      return preset;
    }
    return null;
  }

  /**
   * 设置默认预设
   */
  setDefaultPreset(id: string): void {
    // 清除其他预设的默认标记
    this.presets.forEach(p => p.isDefault = false);
    
    // 设置新的默认预设
    const preset = this.presets.find(p => p.id === id);
    if (preset) {
      preset.isDefault = true;
      this.saveToStorage();
    }
  }

  /**
   * 获取默认预设
   */
  getDefaultPreset(): APIPreset | null {
    return this.presets.find(p => p.isDefault) || null;
  }

  /**
   * 测试API连接
   */
  async testAPIConnection(apiUrl: string, apiKey: string): Promise<{
    success: boolean;
    models: string[];
    error?: string;
  }> {
    try {
      // 处理API地址
      let baseUrl = apiUrl.trim();
      if (baseUrl.endsWith('/')) {
        baseUrl = baseUrl.slice(0, -1);
      }
      baseUrl = baseUrl.replace(/\/(v1\/)?chat\/completions$/, '');
      baseUrl = baseUrl.replace(/\/(v1\/)?images\/generations$/, '');
      
      const modelsUrl = baseUrl.includes('/v1') 
        ? `${baseUrl}/models` 
        : `${baseUrl}/v1/models`;

      console.log('🔍 测试API连接:', modelsUrl);

      // 尝试多种请求方式
      const attempts: Array<{ headers: Record<string, string> }> = [
        // 标准Bearer Token
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          }
        },
        // OpenAI格式（简化版）
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          }
        },
        // 自定义API格式 - 可能需要X-API-Key
        {
          headers: {
            'X-API-Key': apiKey,
            'Content-Type': 'application/json'
          }
        },
        // 有些API需要特殊的认证格式
        {
          headers: {
            'Authorization': `Token ${apiKey}`,
            'Content-Type': 'application/json'
          }
        },
        // Tudou API特殊格式
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'User-Agent': 'AI-Chat-App/1.0'
          }
        }
      ];

      let lastError: Error | null = null;

      for (const attempt of attempts) {
        try {
          const response = await fetch(modelsUrl, {
            method: 'GET',
            headers: attempt.headers
          });

          if (response.ok) {
            const data = await response.json();
            const models = data.data?.map((m: any) => m.id) || [];
            
            console.log('✅ API连接成功:', models);
            return {
              success: true,
              models: models.length > 0 ? models : ['dall-e-3', 'dall-e-2', 'stable-diffusion-xl']
            };
          } else {
            const errorText = await response.text();
            lastError = new Error(`HTTP ${response.status}: ${response.statusText}\n${errorText}`);
            console.warn('尝试失败:', lastError.message);
          }
        } catch (err) {
          lastError = err as Error;
          console.warn('尝试失败:', lastError.message);
        }
      }

      throw lastError || new Error('所有尝试均失败');

    } catch (error) {
      console.error('❌ API测试失败:', error);
      return {
        success: false,
        models: [],
        error: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  /**
   * 导出预设数据
   */
  exportPresets(): string {
    return JSON.stringify({
      presets: this.presets,
      currentPresetId: this.currentPresetId,
      exportDate: new Date().toISOString()
    }, null, 2);
  }

  /**
   * 导入预设数据
   */
  importPresets(jsonData: string): { success: boolean; imported: number; error?: string } {
    try {
      const data = JSON.parse(jsonData);
      
      if (!data.presets || !Array.isArray(data.presets)) {
        throw new Error('无效的预设数据格式');
      }

      // 合并导入的预设
      let imported = 0;
      data.presets.forEach((preset: APIPreset) => {
        const existing = this.presets.find(p => p.name === preset.name);
        if (!existing) {
          this.presets.push({
            ...preset,
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            createdAt: Date.now()
          });
          imported++;
        }
      });

      this.saveToStorage();
      return { success: true, imported };
    } catch (error) {
      return {
        success: false,
        imported: 0,
        error: error instanceof Error ? error.message : '导入失败'
      };
    }
  }
}

// 导出单例实例
export const apiPresetsManager = APIPresetsManager.getInstance();
