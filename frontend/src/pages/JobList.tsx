/**
 * 任务列表页面
 * 显示用户的所有历史任务，支持查看、恢复、删除
 */
import React, { useState, useEffect } from 'react';
import { Job, JobDetail } from '../types';
import { jobsApi } from '../services/api';
import { DocumentTextIcon, TrashIcon, EyeIcon, PlusIcon } from '@heroicons/react/24/outline';

interface JobListProps {
  onSelectJob: (job: JobDetail) => void;
  onNewJob: () => void;
}

const JobList: React.FC<JobListProps> = ({ onSelectJob, onNewJob }) => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // 加载任务列表
  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await jobsApi.list();
      if (response.data) {
        setJobs(response.data);
      }
    } catch (err: any) {
      console.error('加载任务列表失败:', err);
      setError(err.response?.data?.detail || '加载任务列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 删除任务
  const handleDelete = async (jobId: number, event: React.MouseEvent) => {
    event.stopPropagation();

    if (!window.confirm('确定要删除这个任务吗？此操作不可恢复。')) {
      return;
    }

    setDeletingId(jobId);
    try {
      await jobsApi.delete(jobId);
      setJobs(prev => prev.filter(j => j.id !== jobId));
    } catch (err: any) {
      console.error('删除任务失败:', err);
      alert(err.response?.data?.detail || '删除任务失败');
    } finally {
      setDeletingId(null);
    }
  };

  // 恢复任务
  const handleResume = async (jobId: number) => {
    try {
      const response = await jobsApi.get(jobId);
      if (response.data) {
        onSelectJob(response.data as JobDetail);
      }
    } catch (err: any) {
      console.error('获取任务详情失败:', err);
      alert(err.response?.data?.detail || '获取任务详情失败');
    }
  };

  // 格式化日期（明确使用中国时区）
  const formatDate = (dateStr: string) => {
    // 如果没有时区标识，添加 'Z' 表示UTC时间
    const utcStr = dateStr.endsWith('Z') ? dateStr : dateStr + 'Z';
    const date = new Date(utcStr);
    return date.toLocaleString('zh-CN', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">加载中...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* 错误提示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* 任务列表卡片 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {/* 表头区域 */}
        <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">我的任务</h2>
            <button
              onClick={onNewJob}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <PlusIcon className="w-4 h-4 mr-2" />
              新建任务
            </button>
          </div>
        </div>

        {/* 任务列表区域 */}
        {jobs.length === 0 ? (
          <div className="text-center py-12">
            <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">暂无任务</h3>
            <p className="mt-1 text-sm text-gray-500">
              点击上方"新建任务"按钮开始创建
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {jobs.map(job => (
              <li
                key={job.id}
                onClick={() => handleResume(job.id)}
                className="px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors"
              >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {job.name || `任务 #${job.id}`}
                        </p>
                      </div>
                      <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                        {job.source_file_name && (
                          <span className="truncate max-w-xs">
                            文件: {job.source_file_name}
                          </span>
                        )}
                        <span>
                          创建于: {formatDate(job.created_at)}
                        </span>
                        {job.selected_model && (
                          <span>
                            模型: {job.selected_model}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 操作按钮 */}
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleResume(job.id);
                        }}
                        className="inline-flex items-center px-3 py-1.5 text-sm text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-md"
                      >
                        <EyeIcon className="w-4 h-4 mr-1" />
                        查看
                      </button>
                      <button
                        onClick={(e) => handleDelete(job.id, e)}
                        disabled={deletingId === job.id}
                        className="inline-flex items-center px-3 py-1.5 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md disabled:opacity-50"
                      >
                        <TrashIcon className="w-4 h-4 mr-1" />
                        {deletingId === job.id ? '删除中...' : '删除'}
                      </button>
                    </div>
                  </div>
                </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default JobList;