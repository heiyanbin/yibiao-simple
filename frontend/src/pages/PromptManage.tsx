/**
 * 提示词管理页面
 * 集中管理用户自定义提示词
 */
import React, { useState, useEffect } from 'react';
import { UserPrompt, PromptTypeEnum } from '../types';
import { promptsApi } from '../services/api';
import {
  DocumentTextIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  StarIcon,
  ChevronLeftIcon
} from '@heroicons/react/24/outline';

// 提示词类型标签映射
const PROMPT_TYPE_LABELS: Record<string, string> = {
  overview: '项目概述提取',
  requirements: '技术评分要求提取',
  full_outline: '完整目录生成',
  chapter_content: '章节内容生成',
};

interface PromptManageProps {
  onBack: () => void;
}

interface PromptFormData {
  name: string;
  prompt_type: PromptTypeEnum;
  content: string;
  is_default: boolean;
}

const PromptManage: React.FC<PromptManageProps> = ({ onBack }) => {
  const [prompts, setPrompts] = useState<UserPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('');
  const [showEditor, setShowEditor] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<UserPrompt | null>(null);
  const [formData, setFormData] = useState<PromptFormData>({
    name: '',
    prompt_type: 'full_outline',
    content: '',
    is_default: false,
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 加载提示词列表
  useEffect(() => {
    loadPrompts();
  }, [filterType]);

  const loadPrompts = async () => {
    setLoading(true);
    try {
      const response = await promptsApi.list(filterType || undefined);
      if (response.data) {
        setPrompts(response.data);
      }
    } catch (err: any) {
      console.error('加载提示词失败:', err);
      setMessage({ type: 'error', text: '加载提示词失败' });
    } finally {
      setLoading(false);
    }
  };

  // 打开新建编辑器
  const handleCreate = () => {
    setEditingPrompt(null);
    setFormData({
      name: '',
      prompt_type: 'full_outline',
      content: '',
      is_default: false,
    });
    setShowEditor(true);
  };

  // 打开编辑编辑器
  const handleEdit = (prompt: UserPrompt) => {
    setEditingPrompt(prompt);
    setFormData({
      name: prompt.name,
      prompt_type: prompt.prompt_type as PromptTypeEnum,
      content: prompt.content,
      is_default: prompt.is_default,
    });
    setShowEditor(true);
  };

  // 保存提示词
  const handleSave = async () => {
    if (!formData.name.trim() || !formData.content.trim()) {
      setMessage({ type: 'error', text: '请填写名称和内容' });
      return;
    }

    setSaving(true);
    try {
      if (editingPrompt) {
        // 更新
        await promptsApi.update(editingPrompt.id, {
          name: formData.name,
          content: formData.content,
          is_default: formData.is_default,
        });
        setMessage({ type: 'success', text: '提示词更新成功' });
      } else {
        // 新建
        await promptsApi.create(
          formData.name,
          formData.prompt_type,
          formData.content,
          formData.is_default
        );
        setMessage({ type: 'success', text: '提示词创建成功' });
      }
      setShowEditor(false);
      loadPrompts();
    } catch (err: any) {
      console.error('保存提示词失败:', err);
      setMessage({ type: 'error', text: err.response?.data?.detail || '保存失败' });
    } finally {
      setSaving(false);
    }
  };

  // 删除提示词
  const handleDelete = async (prompt: UserPrompt) => {
    if (!window.confirm(`确定要删除提示词"${prompt.name}"吗？`)) {
      return;
    }

    try {
      await promptsApi.delete(prompt.id);
      setMessage({ type: 'success', text: '删除成功' });
      loadPrompts();
    } catch (err: any) {
      console.error('删除提示词失败:', err);
      setMessage({ type: 'error', text: err.response?.data?.detail || '删除失败' });
    }
  };

  // 设置默认提示词
  const handleSetDefault = async (prompt: UserPrompt) => {
    try {
      await promptsApi.update(prompt.id, { is_default: true });
      setMessage({ type: 'success', text: '已设为默认提示词' });
      loadPrompts();
    } catch (err: any) {
      console.error('设置默认失败:', err);
      setMessage({ type: 'error', text: '设置失败' });
    }
  };

  // 按类型分组
  const groupedPrompts = prompts.reduce((acc, prompt) => {
    const type = prompt.prompt_type;
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(prompt);
    return acc;
  }, {} as Record<string, UserPrompt[]>);

  return (
    <div className="max-w-4xl mx-auto">
      {/* 标题栏 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={onBack}
                className="p-1 rounded hover:bg-gray-200 text-gray-600"
              >
                <ChevronLeftIcon className="w-5 h-5" />
              </button>
              <h2 className="text-lg font-semibold text-gray-900">提示词管理</h2>
            </div>
            <button
              onClick={handleCreate}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
            >
              <PlusIcon className="w-4 h-4 mr-2" />
              新建提示词
            </button>
          </div>
        </div>

        {/* 类型筛选 */}
        <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">类型筛选：</span>
            <button
              onClick={() => setFilterType('')}
              className={`px-3 py-1 text-sm rounded-full ${
                filterType === ''
                  ? 'bg-primary-100 text-primary-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              全部
            </button>
            {Object.entries(PROMPT_TYPE_LABELS).map(([type, label]) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-3 py-1 text-sm rounded-full ${
                  filterType === type
                    ? 'bg-primary-100 text-primary-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* 提示词列表 */}
        <div className="p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
              <p className="mt-4 text-gray-500">加载中...</p>
            </div>
          ) : prompts.length === 0 ? (
            <div className="text-center py-12">
              <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">暂无自定义提示词</h3>
              <p className="mt-1 text-sm text-gray-500">
                点击上方"新建提示词"按钮创建
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedPrompts).map(([type, typePrompts]) => (
                <div key={type}>
                  <h3 className="text-sm font-medium text-gray-500 mb-3 flex items-center">
                    <span className="bg-gray-100 px-2 py-1 rounded">
                      📁 {PROMPT_TYPE_LABELS[type] || type}
                    </span>
                  </h3>
                  <div className="space-y-3">
                    {typePrompts.map(prompt => (
                      <div
                        key={prompt.id}
                        className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <span className="font-medium text-gray-900">
                                {prompt.name}
                              </span>
                              {prompt.is_default && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                  <StarIcon className="w-3 h-3 mr-1" />
                                  默认
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                              {prompt.content.substring(0, 150)}...
                            </p>
                          </div>
                          <div className="flex items-center space-x-2 ml-4">
                            <button
                              onClick={() => handleEdit(prompt)}
                              className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded"
                              title="编辑"
                            >
                              <PencilIcon className="w-4 h-4" />
                            </button>
                            {!prompt.is_default && (
                              <button
                                onClick={() => handleSetDefault(prompt)}
                                className="p-1.5 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded"
                                title="设为默认"
                              >
                                <StarIcon className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(prompt)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                              title="删除"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 消息提示 */}
      {message && (
        <div className={`mt-4 p-4 rounded-lg ${
          message.type === 'success'
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      {/* 编辑弹窗 */}
      {showEditor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingPrompt ? '编辑提示词' : '新建提示词'}
              </h3>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="space-y-4">
                {/* 提示词类型 */}
                {!editingPrompt && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      提示词类型
                    </label>
                    <select
                      value={formData.prompt_type}
                      onChange={(e) => setFormData({ ...formData, prompt_type: e.target.value as PromptTypeEnum })}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm py-2 px-3"
                    >
                      {Object.entries(PROMPT_TYPE_LABELS).map(([type, label]) => (
                        <option key={type} value={type}>{label}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* 名称 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    提示词名称
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm py-2 px-3"
                    placeholder="例如：专业版概述提取"
                  />
                </div>

                {/* 内容 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    提示词内容
                  </label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    rows={10}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm py-2 px-3"
                    placeholder="请输入提示词内容..."
                  />
                </div>

                {/* 设为默认 */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_default"
                    checked={formData.is_default}
                    onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <label htmlFor="is_default" className="ml-2 text-sm text-gray-700">
                    设为该类型的默认提示词
                  </label>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => setShowEditor(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 disabled:opacity-50"
              >
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PromptManage;