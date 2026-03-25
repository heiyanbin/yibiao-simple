/**
 * 类型定义
 */

export interface ConfigData {
  model_name: string;
}

// 用户相关类型
export interface User {
  id: number;
  username: string;
  email: string;
  real_name: string | null;
  department: string | null;
  is_admin: boolean;
  created_at: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// 任务相关类型
export interface Job {
  id: number;
  name: string | null;
  status: 'in_progress' | 'completed' | 'archived';
  source_file_name: string | null;
  selected_model: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface JobDetail extends Job {
  file_content: string | null;
  project_overview: string | null;
  tech_requirements: string | null;
  outline_data: any | null;
}

// 用户提示词类型
export interface UserPrompt {
  id: number;
  name: string;
  prompt_type: string;
  content: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface PromptType {
  value: string;
  label: string;
}

export interface OutlineItem {
  id: string;
  title: string;
  description: string;
  children?: OutlineItem[];
  content?: string;
}

export interface OutlineData {
  outline: OutlineItem[];
  project_name?: string;
  project_overview?: string;
}

export interface AppState {
  currentStep: number;
  config: ConfigData;
  currentJobId: number | null;
  fileContent: string;
  sourceFileName: string | null;
  projectOverview: string;
  techRequirements: string;
  outlineData: OutlineData | null;
  selectedChapter: string;
}

// 提示词选择状态
export interface PromptSelection {
  overview_prompt_id: number | null;
  requirements_prompt_id: number | null;
  full_outline_prompt_id: number | null;
  chapter_content_prompt_id: number | null;
}

// 提示词类型
export type PromptTypeEnum = 'overview' | 'requirements' | 'full_outline' | 'chapter_content';

// 邀请码类型
export interface InviteCode {
  id: number;
  code: string;
  description: string | null;
  is_active: boolean;
  created_by: number;
  created_at: string;
}