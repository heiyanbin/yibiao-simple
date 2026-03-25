/**
 * 配置面板组件
 */
import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import AuthModal from './AuthModal';

interface ConfigPanelProps {
  selectedModel: string;
  onModelChange: (model: string) => void;
  onShowJobList?: () => void;
  onShowPromptManage?: () => void;
  onShowAdmin?: () => void;
}

const ConfigPanel: React.FC<ConfigPanelProps> = ({ selectedModel, onModelChange, onShowJobList, onShowPromptManage, onShowAdmin }) => {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const [models, setModels] = useState<string[]>([]);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 获取可用模型列表
  useEffect(() => {
    const fetchModels = async () => {
      try {
        const response = await fetch('/api/config/models');
        const data = await response.json();
        if (data.success && data.models.length > 0) {
          setModels(data.models);
          if (!selectedModel) {
            onModelChange(data.models[0]);
          }
        }
      } catch (error) {
        console.error('获取模型列表失败:', error);
      }
    };

    fetchModels();
  }, [selectedModel, onModelChange]);

  const handleLogout = async () => {
    await logout();
    setMessage({ type: 'success', text: '已成功登出' });
    setTimeout(() => setMessage(null), 3000);
  };

  return (
    <div className="bg-blue-50 shadow-sm border-r border-gray-200 w-80 p-6 overflow-y-auto">
      <div className="space-y-6">
        {/* 标题 */}
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">AI标书助手</h1>
            <img src="/yuanshan_logo.png" alt="远舢科技" className="h-12 w-auto" />
          </div>
          <hr className="mt-4 border-gray-200" />
        </div>

        {/* 用户信息 */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
          {isLoading ? (
            <div className="text-gray-500">加载中...</div>
          ) : isAuthenticated && user ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900">{user.username}</div>
                  <div className="text-sm text-gray-500">{user.email}</div>
                </div>
                <button
                  onClick={handleLogout}
                  className="text-sm text-red-600 hover:text-red-800"
                >
                  登出
                </button>
              </div>
              {onShowJobList && (
                <button
                  onClick={onShowJobList}
                  className="w-full py-2 px-4 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm font-medium"
                >
                  📋 我的任务
                </button>
              )}
              {onShowPromptManage && (
                <button
                  onClick={onShowPromptManage}
                  className="w-full py-2 px-4 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm font-medium"
                >
                  ✏️ 提示词管理
                </button>
              )}
              {onShowAdmin && user.is_admin && (
                <button
                  onClick={onShowAdmin}
                  className="w-full py-2 px-4 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm font-medium"
                >
                  ⚙️ 系统管理
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={() => setShowAuthModal(true)}
              className="w-full py-2 px-4 bg-primary-600 text-white rounded-md hover:bg-primary-700"
            >
              登录 / 注册
            </button>
          )}
        </div>

        {/* 模型选择 */}
        <div>
          <h3 className="text-base font-medium text-gray-900 mb-3">🤖 模型选择</h3>

          {models.length > 0 ? (
            <div>
              <label htmlFor="model_name" className="block text-sm font-medium text-gray-700 mb-1">
                选择模型
              </label>
              <select
                id="model_name"
                value={selectedModel}
                onChange={(e) => onModelChange(e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm py-2 px-3"
              >
                {models.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="text-sm text-gray-500">
              系统未配置可用模型，请联系管理员
            </div>
          )}
        </div>

        {/* 消息提示 */}
        {message && (
          <div className={`p-3 rounded-md text-sm ${
            message.type === 'success'
              ? 'bg-green-100 text-green-700 border border-green-200'
              : 'bg-red-100 text-red-700 border border-red-200'
          }`}>
            {message.text}
          </div>
        )}

        {/* 使用说明 */}
        <div className="border-t border-gray-200 pt-4">
          <h3 className="text-sm font-medium text-gray-900 mb-2">📋 使用说明</h3>
          <div className="text-sm text-gray-600 space-y-1">
            <p>1. 登录您的账号</p>
            <p>2. 选择使用的模型</p>
            <p>3. 按步骤完成标书编写流程</p>
          </div>
        </div>

      </div>

      {/* 认证弹窗 */}
      {showAuthModal && (
        <AuthModal onClose={() => setShowAuthModal(false)} />
      )}
    </div>
  );
};

export default ConfigPanel;