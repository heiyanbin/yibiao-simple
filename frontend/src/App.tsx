/**
 * 主应用组件
 */
import React from 'react';
import { AuthProvider } from './hooks/useAuth';
import { useAuth } from './hooks/useAuth';
import { useAppState } from './hooks/useAppState';
import ConfigPanel from './components/ConfigPanel';
import StepBar from './components/StepBar';
import DocumentAnalysis from './pages/DocumentAnalysis';
import OutlineEdit from './pages/OutlineEdit';
import ContentEdit from './pages/ContentEdit';
import JobList from './pages/JobList';
import PromptManage from './pages/PromptManage';
import AdminPage from './pages/AdminPage';
import HelpPage from './pages/HelpPage';
import { JobDetail } from './types';

// 页面模式
type PageMode = 'job-list' | 'editor' | 'prompt-manage' | 'admin' | 'help';

function AppContent() {
  const {
    state,
    updateModel,
    updateFileContent,
    updateAnalysisResults,
    updateOutline,
    updateSelectedChapter,
    nextStep,
    prevStep,
    setCurrentJobId,
    setSourceFileName,
    loadJob,
    resetJob,
  } = useAppState();

  const { isAuthenticated, isLoading } = useAuth();

  // 页面模式状态
  const [pageMode, setPageMode] = React.useState<PageMode>('job-list');

  const steps = ['标书解析', '目录编辑', '正文编辑'];

  // 恢复任务
  const handleSelectJob = (job: JobDetail) => {
    loadJob(job);
    setPageMode('editor');
  };

  // 新建任务
  const handleNewJob = () => {
    resetJob();
    setPageMode('editor');
  };

  // 返回任务列表
  const handleBackToJobList = () => {
    setPageMode('job-list');
  };

  const renderCurrentPage = () => {
    switch (state.currentStep) {
      case 0:
        return (
          <DocumentAnalysis
            currentJobId={state.currentJobId}
            fileContent={state.fileContent}
            sourceFileName={state.sourceFileName}
            projectOverview={state.projectOverview}
            techRequirements={state.techRequirements}
            onFileUpload={updateFileContent}
            onFileNameSet={setSourceFileName}
            onAnalysisComplete={updateAnalysisResults}
            onJobCreated={setCurrentJobId}
            onJobUpdated={() => {}}
          />
        );
      case 1:
        return (
          <OutlineEdit
            currentJobId={state.currentJobId}
            projectOverview={state.projectOverview}
            techRequirements={state.techRequirements}
            outlineData={state.outlineData}
            onOutlineGenerated={updateOutline}
          />
        );
      case 2:
        return (
          <ContentEdit
            outlineData={state.outlineData}
            selectedChapter={state.selectedChapter}
            onChapterSelect={updateSelectedChapter}
            currentJobId={state.currentJobId}
          />
        );
      default:
        return null;
    }
  };

  // 加载中
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  // 未登录 - 显示帮助文档
  if (!isAuthenticated) {
    return (
      <div className="h-screen flex bg-gray-50">
        {/* 左侧配置面板（只显示登录按钮） */}
        <ConfigPanel
          selectedModel={state.config.model_name}
          onModelChange={updateModel}
        />

        {/* 主区域 - 帮助文档 */}
        <div className="flex-1 p-6 overflow-y-auto">
          <HelpPage />
        </div>
      </div>
    );
  }

  // 已登录 - 显示完整应用
  return (
    <div className="h-screen overflow-hidden bg-gray-50 flex">
      {/* 左侧配置面板 */}
      <ConfigPanel
        selectedModel={state.config.model_name}
        onModelChange={updateModel}
        onShowJobList={() => setPageMode('job-list')}
        onShowPromptManage={() => setPageMode('prompt-manage')}
        onShowAdmin={() => setPageMode('admin')}
        onShowHelp={() => setPageMode('help')}
      />

      {/* 主内容区域 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 步骤导航 - 仅编辑模式显示 */}
        {pageMode === 'editor' && (
          <div className="sticky top-0 z-50 bg-white shadow-sm px-6">
            <StepBar steps={steps} currentStep={state.currentStep} />
          </div>
        )}

        {/* 页面内容 */}
        <div id="app-main-scroll" className="flex-1 p-6 overflow-y-auto">
          {pageMode === 'job-list' ? (
            <JobList onSelectJob={handleSelectJob} onNewJob={handleNewJob} />
          ) : pageMode === 'prompt-manage' ? (
            <PromptManage onBack={() => setPageMode('job-list')} />
          ) : pageMode === 'admin' ? (
            <AdminPage onBack={() => setPageMode('job-list')} />
          ) : pageMode === 'help' ? (
            <HelpPage onBack={() => setPageMode('job-list')} />
          ) : (
            renderCurrentPage()
          )}
        </div>

        {/* 底部导航按钮 - 仅编辑模式显示 */}
        {pageMode === 'editor' && (
          <div className="sticky bottom-0 z-50 bg-white border-t border-gray-200 px-6 py-4">
            <div className="flex justify-between">
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleBackToJobList}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  任务列表
                </button>

                <button
                  onClick={prevStep}
                  disabled={state.currentStep === 0}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                  上一步
                </button>
              </div>

              <button
                onClick={nextStep}
                disabled={state.currentStep === steps.length - 1}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                下一步
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;