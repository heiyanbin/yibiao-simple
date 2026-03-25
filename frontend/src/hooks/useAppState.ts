/**
 * 应用状态管理Hook
 */
import { useState, useCallback } from 'react';
import { AppState, OutlineData, JobDetail } from '../types';
import { draftStorage } from '../utils/draftStorage';
import { jobsApi } from '../services/api';

const initialState: AppState = {
  currentStep: 0,
  config: {
    model_name: 'gpt-3.5-turbo',
  },
  currentJobId: null,
  fileContent: '',
  sourceFileName: null,
  projectOverview: '',
  techRequirements: '',
  outlineData: null,
  selectedChapter: '',
};

export const useAppState = () => {
  const [state, setState] = useState<AppState>(() => {
    const draft = draftStorage.loadDraft();
    return {
      ...initialState,
      ...(draft || {}),
    };
  });

  const updateModel = useCallback((modelName: string) => {
    setState(prev => ({ ...prev, config: { ...prev.config, model_name: modelName } }));
  }, []);

  const updateStep = useCallback((step: number) => {
    setState(prev => {
      const next = { ...prev, currentStep: step };
      draftStorage.saveDraft({ currentStep: step });
      return next;
    });
  }, []);

  const updateFileContent = useCallback((fileContent: string) => {
    setState(prev => {
      const next = { ...prev, fileContent };
      draftStorage.saveDraft({ fileContent });
      return next;
    });
  }, []);

  const updateAnalysisResults = useCallback((overview: string, requirements: string) => {
    setState(prev => {
      const next = {
        ...prev,
        projectOverview: overview,
        techRequirements: requirements,
      };
      draftStorage.saveDraft({
        projectOverview: overview,
        techRequirements: requirements,
      });
      return next;
    });
  }, []);

  const updateOutline = useCallback((outlineData: OutlineData) => {
    setState(prev => {
      const next = { ...prev, outlineData };
      draftStorage.saveDraft({ outlineData });
      return next;
    });
  }, []);

  const updateSelectedChapter = useCallback((chapterId: string) => {
    setState(prev => {
      const next = { ...prev, selectedChapter: chapterId };
      draftStorage.saveDraft({ selectedChapter: chapterId });
      return next;
    });
  }, []);

  const nextStep = useCallback(() => {
    setState(prev => {
      const nextStepValue = Math.min(prev.currentStep + 1, 2);
      const next = { ...prev, currentStep: nextStepValue };
      draftStorage.saveDraft({ currentStep: nextStepValue });
      return next;
    });
  }, []);

  const prevStep = useCallback(() => {
    setState(prev => {
      const prevStepValue = Math.max(prev.currentStep - 1, 0);
      const next = { ...prev, currentStep: prevStepValue };
      draftStorage.saveDraft({ currentStep: prevStepValue });
      return next;
    });
  }, []);

  const setCurrentJobId = useCallback((jobId: number | null) => {
    setState(prev => {
      const next = { ...prev, currentJobId: jobId };
      draftStorage.saveDraft({ currentJobId: jobId });
      return next;
    });
  }, []);

  const setSourceFileName = useCallback((fileName: string | null) => {
    setState(prev => {
      const next = { ...prev, sourceFileName: fileName };
      draftStorage.saveDraft({ sourceFileName: fileName });
      return next;
    });
  }, []);

  const resetJob = useCallback(() => {
    setState({
      ...initialState,
      config: state.config,
    });
    draftStorage.clearAll();
  }, [state.config]);

  // 加载任务数据
  const loadJob = useCallback(async (job: JobDetail) => {
    const newState: AppState = {
      currentStep: 0,
      config: state.config,
      currentJobId: job.id,
      fileContent: job.file_content || '',
      sourceFileName: job.source_file_name || null,
      projectOverview: job.project_overview || '',
      techRequirements: job.tech_requirements || '',
      outlineData: job.outline_data || null,
      selectedChapter: '',
    };
    setState(newState);
    draftStorage.saveDraft(newState);

    // 加载已保存的章节内容
    if (job.id) {
      try {
        const response = await jobsApi.getContents(job.id);
        const contents = response.data; // [{chapter_id, chapter_title, content}, ...]
        // 将内容保存到 localStorage 供 ContentEdit 使用
        contents.forEach((c: any) => {
          if (c.chapter_id && c.content) {
            draftStorage.upsertChapterContent(c.chapter_id, c.content);
          }
        });
      } catch (e) {
        console.warn('加载章节内容失败:', e);
      }
    }
  }, [state.config]);

  return {
    state,
    updateModel,
    updateStep,
    updateFileContent,
    updateAnalysisResults,
    updateOutline,
    updateSelectedChapter,
    nextStep,
    prevStep,
    setCurrentJobId,
    setSourceFileName,
    resetJob,
    loadJob,
  };
};