/**
 * 后台管理页面
 */
import React, { useState, useEffect } from 'react';
import { adminApi } from '../services/api';

interface Stats {
  total_users: number;
  active_users: number;
  total_jobs: number;
  total_tokens: number;
}

interface UserItem {
  id: number;
  username: string;
  email: string;
  is_active: boolean;
  is_admin: boolean;
  created_at: string;
  last_login_at: string | null;
}

interface JobItem {
  id: number;
  user_id: number;
  username: string;
  name: string | null;
  status: string;
  tokens_used: number;
  created_at: string;
  completed_at: string | null;
}

interface InviteCodeItem {
  id: number;
  code: string;
  description: string | null;
  is_active: boolean;
  created_by: number;
  created_at: string;
}

interface AdminPageProps {
  onBack: () => void;
}

const AdminPage: React.FC<AdminPageProps> = ({ onBack }) => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [inviteCodes, setInviteCodes] = useState<InviteCodeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'stats' | 'users' | 'jobs' | 'invite-codes'>('stats');
  const [jobPage, setJobPage] = useState(1);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [showCreateCode, setShowCreateCode] = useState(false);
  const [newCodeDescription, setNewCodeDescription] = useState('');
  const [newCodeValue, setNewCodeValue] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes, jobsRes, codesRes] = await Promise.all([
        adminApi.getStats(),
        adminApi.getUsers(),
        adminApi.getJobs(1, 20),
        adminApi.getInviteCodes(),
      ]);
      setStats(statsRes.data);
      setUsers(usersRes.data);
      setJobs(jobsRes.data);
      setInviteCodes(codesRes.data);
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleUser = async (userId: number) => {
    try {
      const res = await adminApi.toggleUserActive(userId);
      setUsers(users.map(u => u.id === userId ? { ...u, is_active: res.data.is_active } : u));
    } catch (error) {
      console.error('操作失败:', error);
      alert('操作失败');
    }
  };

  const handleDeleteJob = async (jobId: number) => {
    try {
      await adminApi.deleteJob(jobId);
      setJobs(jobs.filter(j => j.id !== jobId));
      setDeleteConfirm(null);
    } catch (error) {
      console.error('删除失败:', error);
      alert('删除失败');
    }
  };

  const loadMoreJobs = async () => {
    try {
      const nextPage = jobPage + 1;
      const res = await adminApi.getJobs(nextPage, 20);
      if (res.data.length > 0) {
        setJobs([...jobs, ...res.data]);
        setJobPage(nextPage);
      }
    } catch (error) {
      console.error('加载更多失败:', error);
    }
  };

  const handleCreateInviteCode = async () => {
    try {
      const res = await adminApi.createInviteCode(newCodeValue || undefined, newCodeDescription || undefined);
      setInviteCodes([res.data, ...inviteCodes]);
      setShowCreateCode(false);
      setNewCodeDescription('');
      setNewCodeValue('');
    } catch (error) {
      console.error('创建邀请码失败:', error);
      alert('创建失败');
    }
  };

  const handleToggleInviteCode = async (codeId: number) => {
    try {
      const res = await adminApi.toggleInviteCode(codeId);
      setInviteCodes(inviteCodes.map(c => c.id === codeId ? { ...c, is_active: res.data.is_active } : c));
    } catch (error) {
      console.error('操作失败:', error);
      alert('操作失败');
    }
  };

  const handleDeleteInviteCode = async (codeId: number) => {
    try {
      await adminApi.deleteInviteCode(codeId);
      setInviteCodes(inviteCodes.filter(c => c.id !== codeId));
    } catch (error) {
      console.error('删除失败:', error);
      alert('删除失败');
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('zh-CN');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* 头部 */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">系统管理</h1>
          <button
            onClick={onBack}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm font-medium"
          >
            返回
          </button>
        </div>
      </div>

      {/* 标签导航 */}
      <div className="bg-white rounded-lg shadow-sm mb-6">
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('stats')}
            className={`px-6 py-3 text-sm font-medium ${
              activeTab === 'stats'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            统计面板
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-6 py-3 text-sm font-medium ${
              activeTab === 'users'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            用户管理
          </button>
          <button
            onClick={() => setActiveTab('jobs')}
            className={`px-6 py-3 text-sm font-medium ${
              activeTab === 'jobs'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            任务管理
          </button>
          <button
            onClick={() => setActiveTab('invite-codes')}
            className={`px-6 py-3 text-sm font-medium ${
              activeTab === 'invite-codes'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            邀请码管理
          </button>
        </div>
      </div>

      {/* 统计面板 */}
      {activeTab === 'stats' && stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-sm text-gray-500 mb-1">总用户数</div>
            <div className="text-3xl font-bold text-gray-900">{stats.total_users}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-sm text-gray-500 mb-1">活跃用户</div>
            <div className="text-3xl font-bold text-green-600">{stats.active_users}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-sm text-gray-500 mb-1">总任务数</div>
            <div className="text-3xl font-bold text-gray-900">{stats.total_jobs}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-sm text-gray-500 mb-1">Token 使用量</div>
            <div className="text-3xl font-bold text-blue-600">{stats.total_tokens.toLocaleString()}</div>
          </div>
        </div>
      )}

      {/* 用户管理 */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">用户名</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">邮箱</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">角色</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">注册时间</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">最后登录</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {user.username}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {user.is_active ? '正常' : '已禁用'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      user.is_admin ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {user.is_admin ? '管理员' : '普通用户'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(user.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(user.last_login_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {!user.is_admin && (
                      <button
                        onClick={() => handleToggleUser(user.id)}
                        className={`px-3 py-1 rounded text-xs font-medium ${
                          user.is_active
                            ? 'text-red-600 hover:bg-red-50'
                            : 'text-green-600 hover:bg-green-50'
                        }`}
                      >
                        {user.is_active ? '禁用' : '启用'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 任务管理 */}
      {activeTab === 'jobs' && (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">任务ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">任务名</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">用户</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Token</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">创建时间</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {jobs.map((job) => (
                <tr key={job.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    #{job.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {job.name || '(未命名)'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {job.username}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      job.status === 'completed' ? 'bg-green-100 text-green-800' :
                      job.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {job.status === 'completed' ? '已完成' :
                       job.status === 'in_progress' ? '进行中' : '已归档'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {job.tokens_used.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(job.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {deleteConfirm === job.id ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDeleteJob(job.id)}
                          className="px-3 py-1 bg-red-600 text-white rounded text-xs font-medium"
                        >
                          确认
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-xs font-medium"
                        >
                          取消
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirm(job.id)}
                        className="px-3 py-1 text-red-600 hover:bg-red-50 rounded text-xs font-medium"
                      >
                        删除
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {jobs.length >= 20 && (
            <div className="px-6 py-4 border-t">
              <button
                onClick={loadMoreJobs}
                className="w-full py-2 text-sm text-blue-600 hover:bg-blue-50 rounded"
              >
                加载更多
              </button>
            </div>
          )}
        </div>
      )}

      {/* 邀请码管理 */}
      {activeTab === 'invite-codes' && (
        <div className="space-y-4">
          {/* 创建按钮 */}
          <div className="flex justify-end">
            <button
              onClick={() => setShowCreateCode(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
            >
              + 创建邀请码
            </button>
          </div>

          {/* 创建弹窗 */}
          {showCreateCode && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">创建邀请码</h3>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    邀请码（可选）
                  </label>
                  <input
                    type="text"
                    value={newCodeValue}
                    onChange={(e) => setNewCodeValue(e.target.value)}
                    placeholder="留空则自动生成，如：市场部2024"
                    maxLength={16}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                  <p className="mt-1 text-xs text-gray-500">4-16位字符，支持中文</p>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    备注（可选）
                  </label>
                  <input
                    type="text"
                    value={newCodeDescription}
                    onChange={(e) => setNewCodeDescription(e.target.value)}
                    placeholder="如：市场部、技术部..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => { setShowCreateCode(false); setNewCodeDescription(''); setNewCodeValue(''); }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleCreateInviteCode}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    创建
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 邀请码列表 */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">邀请码</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">备注</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">创建时间</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {inviteCodes.map((code) => (
                  <tr key={code.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-mono text-sm font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
                        {code.code}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {code.description || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        code.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {code.is_active ? '有效' : '已禁用'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(code.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleToggleInviteCode(code.id)}
                          className={`px-3 py-1 rounded text-xs font-medium ${
                            code.is_active
                              ? 'text-red-600 hover:bg-red-50'
                              : 'text-green-600 hover:bg-green-50'
                          }`}
                        >
                          {code.is_active ? '禁用' : '启用'}
                        </button>
                        <button
                          onClick={() => handleDeleteInviteCode(code.id)}
                          className="px-3 py-1 text-gray-600 hover:bg-gray-50 rounded text-xs font-medium"
                        >
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {inviteCodes.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                      暂无邀请码，点击右上角创建
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;