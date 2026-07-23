import type { LlmProfile, LlmProviderId } from '@novel-assistant/core'

export type ApiProviderId = LlmProviderId

export interface ApiPreset {
  id: string;
  provider: ApiProviderId;
  name: string;
  baseUrl: string;
  model: string;
  models?: readonly string[];
  hint?: string;
}

export interface ApiPresetGroup {
  label: string;
  presets: readonly ApiPreset[];
}

export const API_PRESET_GROUPS: readonly ApiPresetGroup[] = [
  {
    label: '国内主流',
    presets: [
      {
        id: 'deepseek-v4-flash',
        provider: 'deepseek',
        name: 'DeepSeek V4 Flash',
        baseUrl: 'https://api.deepseek.com/v1',
        model: 'deepseek-v4-flash',
        models: ['deepseek-v4-flash', 'deepseek-v4-pro'],
        hint: 'DeepSeek 开放平台 API Key；快速经济，适合识别等高频任务',
      },
      {
        id: 'deepseek-v4-pro',
        provider: 'deepseek',
        name: 'DeepSeek V4 Pro',
        baseUrl: 'https://api.deepseek.com/v1',
        model: 'deepseek-v4-pro',
        models: ['deepseek-v4-pro', 'deepseek-v4-flash'],
        hint: '高质量推理与长上下文；旧版 deepseek-chat/reasoner 将于 2026-07-24 下线',
      },
      {
        id: 'moonshot-8k',
        provider: 'moonshot',
        name: 'Kimi (8K)',
        baseUrl: 'https://api.moonshot.cn/v1',
        model: 'moonshot-v1-8k',
        models: ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k'],
      },
      {
        id: 'moonshot-32k',
        provider: 'moonshot',
        name: 'Kimi (32K)',
        baseUrl: 'https://api.moonshot.cn/v1',
        model: 'moonshot-v1-32k',
        models: ['moonshot-v1-32k', 'moonshot-v1-8k', 'moonshot-v1-128k'],
      },
      {
        id: 'zhipu-flash',
        provider: 'zhipu',
        name: '智谱 GLM-4 Flash',
        baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
        model: 'glm-4-flash',
        models: ['glm-4-flash', 'glm-4-plus', 'glm-4-air'],
      },
      {
        id: 'qwen-plus',
        provider: 'qwen',
        name: '通义千问 Plus',
        baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
        model: 'qwen-plus',
        models: ['qwen-plus', 'qwen-turbo', 'qwen-max', 'qwen-long'],
        hint: '阿里云百炼 / DashScope API Key',
      },
      {
        id: 'doubao',
        provider: 'doubao',
        name: '豆包（火山引擎）',
        baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
        model: 'doubao-pro-32k',
        models: ['doubao-pro-32k', 'doubao-lite-32k'],
        hint: '模型名填推理接入点 ID（ep-xxx）或已开通的模型 ID',
      },
      {
        id: 'baichuan4',
        provider: 'baichuan',
        name: '百川 Baichuan4',
        baseUrl: 'https://api.baichuan-ai.com/v1',
        model: 'Baichuan4',
        models: ['Baichuan4', 'Baichuan3-Turbo'],
      },
      {
        id: 'minimax',
        provider: 'minimax',
        name: 'MiniMax',
        baseUrl: 'https://api.minimax.chat/v1',
        model: 'abab6.5s-chat',
        models: ['abab6.5s-chat', 'abab6.5g-chat'],
      },
      {
        id: 'yi-lightning',
        provider: 'yi',
        name: '零一万物 Yi',
        baseUrl: 'https://api.lingyiwanwu.com/v1',
        model: 'yi-lightning',
        models: ['yi-lightning', 'yi-medium'],
      },
      {
        id: 'siliconflow-deepseek',
        provider: 'siliconflow',
        name: 'SiliconFlow DeepSeek',
        baseUrl: 'https://api.siliconflow.cn/v1',
        model: 'deepseek-ai/DeepSeek-V3',
        models: [
          'deepseek-ai/DeepSeek-V3',
          'deepseek-ai/DeepSeek-R1',
          'Qwen/Qwen2.5-72B-Instruct',
        ],
      },
    ],
  },
  {
    label: '国际 / 聚合',
    presets: [
      {
        id: 'openai-4o-mini',
        provider: 'openai',
        name: 'OpenAI GPT-4o mini',
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-4o-mini',
        models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini', 'gpt-4.1'],
      },
      {
        id: 'openai-4o',
        provider: 'openai',
        name: 'OpenAI GPT-4o',
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-4o',
        models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4.1'],
      },
      {
        id: 'gemini',
        provider: 'gemini',
        name: 'Google Gemini',
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
        model: 'gemini-2.0-flash',
        models: ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'],
        hint: 'Google AI Studio API Key',
      },
      {
        id: 'groq',
        provider: 'groq',
        name: 'Groq',
        baseUrl: 'https://api.groq.com/openai/v1',
        model: 'llama-3.3-70b-versatile',
        models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'],
      },
      {
        id: 'openrouter',
        provider: 'openrouter',
        name: 'OpenRouter',
        baseUrl: 'https://openrouter.ai/api/v1',
        model: 'deepseek/deepseek-chat',
        models: [
          'deepseek/deepseek-chat',
          'openai/gpt-4o-mini',
          'anthropic/claude-3.5-sonnet',
          'google/gemini-2.0-flash-001',
        ],
        hint: '一个 Key 可调用多家模型',
      },
      {
        id: 'azure-openai',
        provider: 'azure',
        name: 'Azure OpenAI',
        baseUrl: 'https://YOUR-RESOURCE.openai.azure.com/openai/deployments/YOUR-DEPLOYMENT',
        model: 'gpt-4o-mini',
        hint: 'Base URL 替换为你的资源地址；模型填部署名',
      },
    ],
  },
  {
    label: '本地 / 自定义',
    presets: [
      {
        id: 'ollama',
        provider: 'ollama',
        name: 'Ollama 本地',
        baseUrl: 'http://127.0.0.1:11434/v1',
        model: 'qwen2.5',
        models: ['qwen2.5', 'llama3.2', 'deepseek-r1:8b', 'mistral'],
        hint: '本地运行 ollama serve；API Key 可留空',
      },
      {
        id: 'custom',
        provider: 'custom',
        name: '自定义 OpenAI 兼容',
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-4o-mini',
      },
    ],
  },
];

export const API_PRESETS: readonly ApiPreset[] = API_PRESET_GROUPS.flatMap((group) => group.presets);

export function findPreset(presetId: string): ApiPreset | undefined {
  return API_PRESETS.find((preset) => preset.id === presetId);
}

export function findPresetByProvider(provider: LlmProviderId): ApiPreset | undefined {
  return API_PRESETS.find((preset) => preset.provider === provider);
}

export const PROVIDER_LABELS: Record<LlmProviderId, string> = {
  openai: 'OpenAI',
  deepseek: 'DeepSeek',
  moonshot: 'Kimi',
  zhipu: '智谱',
  qwen: '通义千问',
  doubao: '豆包',
  baichuan: '百川',
  minimax: 'MiniMax',
  yi: '零一万物',
  siliconflow: 'SiliconFlow',
  openrouter: 'OpenRouter',
  groq: 'Groq',
  gemini: 'Gemini',
  ollama: 'Ollama',
  azure: 'Azure',
  custom: '自定义',
};

export function suggestedModelsForProfile(profile: Pick<LlmProfile, 'provider' | 'baseUrl'>): readonly string[] {
  const preset = API_PRESETS.find(
    (item) => item.provider === profile.provider && item.baseUrl === profile.baseUrl,
  );
  if (preset?.models?.length) return preset.models;
  const byProvider = API_PRESETS.find((item) => item.provider === profile.provider);
  return byProvider?.models ?? [];
}

export function hintForProfile(profile: Pick<LlmProfile, 'provider' | 'model' | 'baseUrl'>): string | undefined {
  const preset = API_PRESETS.find(
    (item) =>
      item.provider === profile.provider &&
      (item.model === profile.model || item.baseUrl === profile.baseUrl),
  );
  return preset?.hint;
}

/** DeepSeek 旧版模型 ID，将于 2026-07-24 下线 */
export const DEPRECATED_DEEPSEEK_MODELS = ['deepseek-chat', 'deepseek-reasoner'] as const;

export function isDeprecatedDeepSeekModel(model: string): boolean {
  return (DEPRECATED_DEEPSEEK_MODELS as readonly string[]).includes(model);
}

export function deepSeekMigrationHint(model: string): string | undefined {
  if (!isDeprecatedDeepSeekModel(model)) return undefined;
  const replacement = model === 'deepseek-reasoner' ? 'deepseek-v4-pro' : 'deepseek-v4-flash';
  return `当前模型「${model}」将于 2026-07-24 下线，建议切换为「${replacement}」。`;
}
