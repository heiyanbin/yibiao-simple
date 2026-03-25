/**
 * 用户提示词管理Hook
 */
import { useState, useEffect, useCallback } from 'react';
import { promptsApi } from '../services/api';
import { UserPrompt, PromptTypeEnum } from '../types';

interface UsePromptsReturn {
  prompts: UserPrompt[];
  loading: boolean;
  error: string | null;
  loadPrompts: (promptType?: PromptTypeEnum) => Promise<void>;
  createPrompt: (name: string, type: PromptTypeEnum, content: string, isDefault?: boolean) => Promise<UserPrompt | null>;
  updatePrompt: (id: number, data: { name?: string; content?: string; is_default?: boolean }) => Promise<boolean>;
  deletePrompt: (id: number) => Promise<boolean>;
  getDefaultPrompt: (type: PromptTypeEnum) => UserPrompt | undefined;
  getPromptById: (id: number) => UserPrompt | undefined;
}

export const usePrompts = (): UsePromptsReturn => {
  const [prompts, setPrompts] = useState<UserPrompt[]>([]);
  const [loading, setLoading] = useState(true);  // 初始为 true，等待首次加载
  const [error, setError] = useState<string | null>(null);

  // 加载提示词列表
  const loadPrompts = useCallback(async (promptType?: PromptTypeEnum) => {
    setLoading(true);
    setError(null);
    try {
      const response = await promptsApi.list(promptType);
      if (response.data) {
        setPrompts(response.data);
      }
    } catch (err: any) {
      console.error('加载提示词失败:', err);
      setError(err.response?.data?.detail || '加载提示词失败');
    } finally {
      setLoading(false);
    }
  }, []);

  // 创建提示词
  const createPrompt = useCallback(async (
    name: string,
    type: PromptTypeEnum,
    content: string,
    isDefault: boolean = false
  ): Promise<UserPrompt | null> => {
    setError(null);
    try {
      const response = await promptsApi.create(name, type, content, isDefault);
      const newPrompt = response.data as UserPrompt;
      setPrompts(prev => [...prev, newPrompt]);
      return newPrompt;
    } catch (err: any) {
      console.error('创建提示词失败:', err);
      setError(err.response?.data?.detail || '创建提示词失败');
      return null;
    }
  }, []);

  // 更新提示词
  const updatePrompt = useCallback(async (
    id: number,
    data: { name?: string; content?: string; is_default?: boolean }
  ): Promise<boolean> => {
    setError(null);
    try {
      const response = await promptsApi.update(id, data);
      const updatedPrompt = response.data as UserPrompt;
      setPrompts(prev => prev.map(p => p.id === id ? updatedPrompt : p));
      return true;
    } catch (err: any) {
      console.error('更新提示词失败:', err);
      setError(err.response?.data?.detail || '更新提示词失败');
      return false;
    }
  }, []);

  // 删除提示词
  const deletePrompt = useCallback(async (id: number): Promise<boolean> => {
    setError(null);
    try {
      await promptsApi.delete(id);
      setPrompts(prev => prev.filter(p => p.id !== id));
      return true;
    } catch (err: any) {
      console.error('删除提示词失败:', err);
      setError(err.response?.data?.detail || '删除提示词失败');
      return false;
    }
  }, []);

  // 获取指定类型的默认提示词
  const getDefaultPrompt = useCallback((type: PromptTypeEnum): UserPrompt | undefined => {
    return prompts.find(p => p.prompt_type === type && p.is_default);
  }, [prompts]);

  // 根据ID获取提示词
  const getPromptById = useCallback((id: number): UserPrompt | undefined => {
    return prompts.find(p => p.id === id);
  }, [prompts]);

  // 初始加载所有提示词
  useEffect(() => {
    loadPrompts();
  }, [loadPrompts]);

  return {
    prompts,
    loading,
    error,
    loadPrompts,
    createPrompt,
    updatePrompt,
    deletePrompt,
    getDefaultPrompt,
    getPromptById,
  };
};