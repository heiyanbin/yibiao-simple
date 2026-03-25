/**
 * API服务
 */
import axios from 'axios';

// 生产环境可设置 REACT_APP_API_URL="" 使用相对路径
const API_BASE_URL = process.env.REACT_APP_API_URL ?? 'http://localhost:8000';
console.log('[API] API_BASE_URL:', API_BASE_URL);

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000,
});

// 请求拦截器：添加认证头
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截器：处理 401 错误，自动刷新 token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const response = await authApi.refreshToken();
        const data = await response.json();
        localStorage.setItem('access_token', data.access_token);
        originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
        return api(originalRequest);
      } catch (refreshError) {
        // 刷新失败，清除 token 并跳转到首页
        localStorage.removeItem('access_token');
        window.location.href = '/';
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export interface FileUploadResponse {
  success: boolean;
  message: string;
  file_content?: string;
  old_outline?: string;
}

export interface AnalysisRequest {
  file_content: string;
  analysis_type: 'overview' | 'requirements';
  custom_prompt?: string;
}

export interface OutlineRequest {
  overview: string;
  requirements: string;
  uploaded_expand?: boolean;
  old_outline?: string;
  old_document?: string;
  custom_prompt?: string;
  custom_level1_prompt?: string;
  custom_level2_3_prompt?: string;
  model_name?: string;
}

export interface ContentGenerationRequest {
  outline: { outline: any[] };
  project_overview: string;
}

export interface ChapterContentRequest {
  chapter: any;
  parent_chapters?: any[];
  sibling_chapters?: any[];
  project_overview: string;
  custom_prompt?: string;
  model_name?: string;
}

// 配置相关API
export const configApi = {
  // 获取可用模型
  getModels: () =>
    api.get('/api/config/models'),

  // 获取配置状态
  getStatus: () =>
    api.get('/api/config/status'),

  // 获取默认提示词
  getPrompts: () =>
    api.get('/api/config/prompts'),
};

// 认证相关API
export const authApi = {
  login: (username: string, password: string) =>
    api.post('/api/auth/login', { username, password }),

  register: (username: string, email: string, password: string) =>
    api.post('/api/auth/register', { username, email, password }),

  logout: () =>
    api.post('/api/auth/logout'),

  getCurrentUser: () =>
    api.get('/api/auth/me'),

  refreshToken: () =>
    fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    }),
};

// 任务相关API
export const jobsApi = {
  list: (status?: string) =>
    api.get('/api/jobs/', { params: { status } }),

  create: (name?: string) =>
    api.post('/api/jobs/', { name }),

  get: (jobId: number) =>
    api.get(`/api/jobs/${jobId}`),

  update: (jobId: number, data: any) =>
    api.put(`/api/jobs/${jobId}`, data),

  delete: (jobId: number) =>
    api.delete(`/api/jobs/${jobId}`),

  saveContent: (jobId: number, chapterId: string, chapterTitle: string, content: string) =>
    api.post(`/api/jobs/${jobId}/contents`, {
      chapter_id: chapterId,
      chapter_title: chapterTitle,
      content,
    }),

  getContents: (jobId: number) =>
    api.get(`/api/jobs/${jobId}/contents`),
};

// 用户提示词相关API
export const promptsApi = {
  list: (promptType?: string) =>
    api.get('/api/prompts/', { params: { prompt_type: promptType } }),

  create: (name: string, promptType: string, content: string, isDefault: boolean = false) =>
    api.post('/api/prompts/', {
      name,
      prompt_type: promptType,
      content,
      is_default: isDefault,
    }),

  get: (promptId: number) =>
    api.get(`/api/prompts/${promptId}`),

  update: (promptId: number, data: { name?: string; content?: string; is_default?: boolean }) =>
    api.put(`/api/prompts/${promptId}`, data),

  delete: (promptId: number) =>
    api.delete(`/api/prompts/${promptId}`),

  getTypes: () =>
    api.get('/api/prompts/types/list'),
};

// 文档相关API
export const documentApi = {
  // 上传文件
  uploadFile: (file: File, jobId?: number) => {
    const formData = new FormData();
    formData.append('file', file);
    const url = jobId ? `/api/document/upload?job_id=${jobId}` : '/api/document/upload';
    return api.post<FileUploadResponse>(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // 流式分析文档
  analyzeDocumentStream: (data: AnalysisRequest & { model_name?: string }) => {
    const token = localStorage.getItem('access_token');
    return fetch(`${API_BASE_URL}/api/document/analyze-stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(data),
    });
  },

  // 导出Word文档
  exportWord: (data: any) => {
    const token = localStorage.getItem('access_token');
    return fetch(`${API_BASE_URL}/api/document/export-word`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(data),
    });
  },

  // 下载原始文件
  downloadSourceFile: (jobId: number) => {
    const token = localStorage.getItem('access_token');
    return fetch(`${API_BASE_URL}/api/document/download/${jobId}`, {
      method: 'GET',
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
    });
  },
};

// 目录相关API
export const outlineApi = {
  // 生成目录
  generateOutline: (data: OutlineRequest & { model_name?: string }) =>
    api.post('/api/outline/generate', data),

  // 流式生成目录
  generateOutlineStream: (data: OutlineRequest & { model_name?: string }) => {
    const token = localStorage.getItem('access_token');
    return fetch(`${API_BASE_URL}/api/outline/generate-stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(data),
    });
  },
};

// 内容相关API
export const contentApi = {
  // 生成单章节内容
  generateChapterContent: (data: ChapterContentRequest) =>
    api.post('/api/content/generate-chapter', data),

  // 流式生成单章节内容
  generateChapterContentStream: (data: ChapterContentRequest) => {
    const token = localStorage.getItem('access_token');
    return fetch(`${API_BASE_URL}/api/content/generate-chapter-stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(data),
    });
  },
};

// 方案扩写相关API
export const expandApi = {
  // 上传方案扩写文件
  uploadExpandFile: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<FileUploadResponse>('/api/expand/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 300000, // 文件上传专用超时设置：5分钟
    });
  },
};

// 管理员相关API
export const adminApi = {
  // 获取统计数据
  getStats: () =>
    api.get('/api/admin/stats'),

  // 获取用户列表
  getUsers: () =>
    api.get('/api/admin/users'),

  // 禁用/启用用户
  toggleUserActive: (userId: number) =>
    api.put(`/api/admin/users/${userId}/toggle-active`),

  // 获取任务列表
  getJobs: (page?: number, pageSize?: number) =>
    api.get('/api/admin/jobs', { params: { page, page_size: pageSize } }),

  // 删除任务
  deleteJob: (jobId: number) =>
    api.delete(`/api/admin/jobs/${jobId}`),

  // 获取邀请码列表
  getInviteCodes: () =>
    api.get('/api/admin/invite-codes'),

  // 创建邀请码
  createInviteCode: (code?: string, description?: string) =>
    api.post('/api/admin/invite-codes', { code, description }),

  // 启用/禁用邀请码
  toggleInviteCode: (codeId: number) =>
    api.put(`/api/admin/invite-codes/${codeId}/toggle`),

  // 删除邀请码
  deleteInviteCode: (codeId: number) =>
    api.delete(`/api/admin/invite-codes/${codeId}`),
};

export default api;