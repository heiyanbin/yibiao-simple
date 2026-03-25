/**
 * 认证弹窗组件
 * 支持登录和注册
 */
import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

interface AuthModalProps {
  onClose: () => void;
}

// 必填标记组件
const RequiredMark: React.FC = () => (
  <span className="text-red-500 ml-1">*</span>
);

const AuthModal: React.FC<AuthModalProps> = ({ onClose }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [realName, setRealName] = useState('');
  const [department, setDepartment] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, register } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 注册时验证两次密码一致
    if (mode === 'register' && password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    // 注册时验证邀请码
    if (mode === 'register' && !inviteCode.trim()) {
      setError('请输入邀请码');
      return;
    }

    setLoading(true);

    try {
      let result;
      if (mode === 'login') {
        result = await login(username, password);
      } else {
        result = await register(username, email, password, inviteCode, realName || undefined, department || undefined);
      }

      if (result.success) {
        onClose();
      } else {
        setError(result.error || '操作失败');
      }
    } catch (err) {
      console.error('认证操作失败:', err);
      setError('操作失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    setError('');
    setConfirmPassword('');
    setInviteCode('');
    setRealName('');
    setDepartment('');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">
            {mode === 'login' ? '登录' : '注册'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="on">
          <div>
            <label htmlFor="auth-username" className="block text-sm font-medium text-gray-700 mb-1">
              用户名<RequiredMark />
            </label>
            <input
              id="auth-username"
              name="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              autoComplete="username"
              required
            />
          </div>

          {mode === 'register' && (
            <>
              <div>
                <label htmlFor="auth-email" className="block text-sm font-medium text-gray-700 mb-1">
                  邮箱<RequiredMark />
                </label>
                <input
                  id="auth-email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  autoComplete="email"
                  required
                />
              </div>

              <div>
                <label htmlFor="auth-invite-code" className="block text-sm font-medium text-gray-700 mb-1">
                  邀请码<RequiredMark /> <span className="text-gray-400 text-xs font-normal">(如无邀请码请联系管理员)</span>
                </label>
                <input
                  id="auth-invite-code"
                  name="inviteCode"
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="请输入邀请码"
                  autoComplete="off"
                  required
                />
              </div>

              <div>
                <label htmlFor="auth-real-name" className="block text-sm font-medium text-gray-700 mb-1">
                  姓名
                </label>
                <input
                  id="auth-real-name"
                  name="realName"
                  type="text"
                  value={realName}
                  onChange={(e) => setRealName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="请输入真实姓名（选填）"
                  autoComplete="name"
                />
              </div>

              <div>
                <label htmlFor="auth-department" className="block text-sm font-medium text-gray-700 mb-1">
                  部门
                </label>
                <input
                  id="auth-department"
                  name="department"
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="请输入所属部门（选填）"
                  autoComplete="organization"
                />
              </div>
            </>
          )}

          <div>
            <label htmlFor="auth-password" className="block text-sm font-medium text-gray-700 mb-1">
              密码<RequiredMark />
            </label>
            <input
              id="auth-password"
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              required
              minLength={6}
            />
          </div>

          {mode === 'register' && (
            <div>
              <label htmlFor="auth-confirm-password" className="block text-sm font-medium text-gray-700 mb-1">
                确认密码<RequiredMark />
              </label>
              <input
                id="auth-confirm-password"
                name="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                autoComplete="new-password"
                required
                minLength={6}
              />
            </div>
          )}

          {error && (
            <div className="text-red-600 text-sm">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:bg-gray-400"
          >
            {loading ? '处理中...' : (mode === 'login' ? '登录' : '注册')}
          </button>
        </form>

        <div className="mt-4 text-center text-sm text-gray-600">
          {mode === 'login' ? (
            <>
              还没有账号？
              <button onClick={switchMode} className="text-primary-600 hover:underline ml-1">
                立即注册
              </button>
            </>
          ) : (
            <>
              已有账号？
              <button onClick={switchMode} className="text-primary-600 hover:underline ml-1">
                立即登录
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthModal;