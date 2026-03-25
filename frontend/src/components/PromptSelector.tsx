/**
 * 提示词选择器组件
 * 使用列表视图显示提示词，支持直接编辑和设为默认
 */
import React, { useState } from 'react';
import { UserPrompt, PromptTypeEnum } from '../types';

interface PromptSelectorProps {
  promptType: PromptTypeEnum;
  label: string;
  selectedPromptId: number | null;
  defaultPrompt: string;
  prompts: UserPrompt[];
  onPromptSelect: (promptId: number | null, content: string) => void;
  onCreatePrompt: (name: string, content: string, isDefault: boolean) => Promise<UserPrompt | null>;
  onUpdatePrompt: (id: number, data: { name?: string; content?: string; is_default?: boolean }) => Promise<boolean>;
  loading?: boolean;
}

const PromptSelector: React.FC<PromptSelectorProps> = ({
  promptType,
  label,
  selectedPromptId,
  defaultPrompt,
  prompts,
  onPromptSelect,
  onCreatePrompt,
  onUpdatePrompt,
  loading = false,
}) => {
  const [showEditor, setShowEditor] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);
  const [isDefault, setIsDefault] = useState(false);
  const [editingPromptId, setEditingPromptId] = useState<number | null>(null);

  // 过滤当前类型的提示词
  const filteredPrompts = prompts.filter(p => p.prompt_type === promptType);

  // 获取当前选中的提示词
  const getPromptById = (id: number): UserPrompt | undefined => {
    return filteredPrompts.find(p => p.id === id);
  };

  // 选择提示词
  const handleSelect = (promptId: number | null, content: string) => {
    onPromptSelect(promptId, content);
  };

  // 打开编辑弹窗
  const handleOpenEditor = (prompt?: UserPrompt) => {
    if (prompt) {
      // 编辑现有提示词
      setEditContent(prompt.content);
      setEditName(prompt.name);
      setIsDefault(prompt.is_default);
      setEditingPromptId(prompt.id);
    } else {
      // 添加新提示词
      const currentPrompt = selectedPromptId ? getPromptById(selectedPromptId) : null;
      setEditContent(currentPrompt?.content || defaultPrompt);
      setEditName('');
      setIsDefault(false);
      setEditingPromptId(null);
    }
    setShowEditor(true);
  };

  // 设为默认/取消默认
  const handleToggleDefault = async (promptId: number, currentIsDefault: boolean) => {
    setSaving(true);
    try {
      await onUpdatePrompt(promptId, { is_default: !currentIsDefault });
    } finally {
      setSaving(false);
    }
  };

  // 保存提示词
  const handleSave = async () => {
    if (!editName.trim()) {
      alert('请输入提示词名称');
      return;
    }
    if (!editContent.trim()) {
      alert('请输入提示词内容');
      return;
    }

    setSaving(true);
    try {
      if (editingPromptId) {
        // 编辑现有提示词
        const success = await onUpdatePrompt(editingPromptId, {
          name: editName.trim(),
          content: editContent,
          is_default: isDefault,
        });
        if (success) {
          onPromptSelect(editingPromptId, editContent);
          setShowEditor(false);
        }
      } else {
        // 添加新提示词
        const newPrompt = await onCreatePrompt(editName.trim(), editContent, isDefault);
        if (newPrompt) {
          onPromptSelect(newPrompt.id, newPrompt.content);
          setShowEditor(false);
        }
      }
    } finally {
      setSaving(false);
    }
  };

  // 取消编辑
  const handleCancel = () => {
    setShowEditor(false);
    setEditContent('');
    setEditName('');
    setIsDefault(false);
    setEditingPromptId(null);
  };

  // 将系统内置设为默认（清除所有用户提示词的 is_default）
  const handleSetSystemDefault = async () => {
    setSaving(true);
    try {
      // 找出所有 is_default 为 true 的同类型提示词，取消其默认
      const defaultPrompts = filteredPrompts.filter(p => p.is_default);
      for (const p of defaultPrompts) {
        await onUpdatePrompt(p.id, { is_default: false });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-2">
      {/* 标签 */}
      <label className="block text-sm font-medium text-gray-700">
        {label}
      </label>

      {/* 提示词列表 */}
      <div className="border border-gray-200 rounded-lg divide-y divide-gray-200">
        {/* 系统内置提示词 */}
        <div
          className={`flex items-center px-3 py-2 hover:bg-gray-50 ${
            selectedPromptId === null ? 'bg-blue-50' : ''
          }`}
        >
          <label className="flex items-center flex-1 cursor-pointer">
            <input
              type="radio"
              name={`prompt-${promptType}`}
              checked={selectedPromptId === null}
              onChange={() => handleSelect(null, defaultPrompt)}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
              disabled={loading}
            />
            <span className="ml-3 text-sm text-gray-700">
              使用系统内置提示词
              {/* 当没有任何用户提示词设为默认时显示(默认) */}
              {!filteredPrompts.some(p => p.is_default) && (
                <span className="ml-2 text-xs text-primary-600">(默认)</span>
              )}
            </span>
          </label>

          {/* 设为默认按钮 - 不需要编辑按钮 */}
          <div className="flex items-center ml-auto">
            <button
              onClick={handleSetSystemDefault}
              disabled={loading || saving || !filteredPrompts.some(p => p.is_default)}
              className="text-xs text-gray-500 hover:text-primary-600 disabled:text-gray-300"
            >
              设为默认
            </button>
          </div>
        </div>

        {/* 用户提示词列表 */}
        {filteredPrompts.map(prompt => (
          <div
            key={prompt.id}
            className={`flex items-center px-3 py-2 hover:bg-gray-50 ${
              selectedPromptId === prompt.id ? 'bg-blue-50' : ''
            }`}
          >
            <label className="flex items-center flex-1 cursor-pointer">
              <input
                type="radio"
                name={`prompt-${promptType}`}
                checked={selectedPromptId === prompt.id}
                onChange={() => handleSelect(prompt.id, prompt.content)}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                disabled={loading}
              />
              <span className="ml-3 text-sm text-gray-700">
                {prompt.name}
                {prompt.is_default && (
                  <span className="ml-2 text-xs text-primary-600">(默认)</span>
                )}
              </span>
            </label>

            {/* 操作按钮 */}
            <div className="flex items-center space-x-2 ml-auto">
              <button
                onClick={() => handleOpenEditor(prompt)}
                disabled={loading || saving}
                className="text-xs text-gray-500 hover:text-blue-600"
              >
                编辑
              </button>
              <button
                onClick={() => handleToggleDefault(prompt.id, prompt.is_default)}
                disabled={loading || saving}
                className="text-xs text-gray-500 hover:text-primary-600"
              >
                {prompt.is_default ? '取消默认' : '设为默认'}
              </button>
            </div>
          </div>
        ))}

        {/* 添加新提示词按钮 */}
        <button
          onClick={() => handleOpenEditor()}
          disabled={loading || saving}
          className="w-full px-3 py-2 text-left text-sm text-primary-600 hover:bg-gray-50 flex items-center"
        >
          <span className="ml-7">+ 添加新提示词</span>
        </button>
      </div>

      {/* 提示词内容预览（可折叠） */}
      <details className="group">
        <summary className="cursor-pointer text-xs text-gray-500 hover:text-gray-700">
          查看当前提示词内容
        </summary>
        <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <pre className="text-xs text-gray-600 whitespace-pre-wrap font-mono">
            {selectedPromptId ? getPromptById(selectedPromptId)?.content : defaultPrompt}
          </pre>
        </div>
      </details>

      {/* 编辑/添加提示词弹窗 */}
      {showEditor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editingPromptId ? '编辑提示词' : '添加新提示词'}
            </h3>

            <div className="space-y-4">
              {/* 名称 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  提示词名称
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="输入提示词名称..."
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm py-2 px-3"
                />
              </div>

              {/* 内容 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  提示词内容
                </label>
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={10}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm py-2 px-3 font-mono"
                />
              </div>

              {/* 设为默认 */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="isDefault" className="ml-2 block text-sm text-gray-700">
                  设为此类型的默认提示词
                </label>
              </div>
            </div>

            {/* 按钮 */}
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={handleCancel}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 disabled:bg-gray-400"
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

export default PromptSelector;