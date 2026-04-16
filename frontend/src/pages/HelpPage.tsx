/**
 * 帮助文档页面
 * 显示使用指南并提供 PDF 下载
 */
import React, { useState, useEffect } from 'react';

interface HelpPageProps {
  onBack: () => void;
}

const HelpPage: React.FC<HelpPageProps> = ({ onBack }) => {
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHelpContent = async () => {
      try {
        const response = await fetch('/api/config/help');
        const data = await response.json();

        if (data.success) {
          setHtmlContent(data.content);
        } else {
          setError(data.message || '获取帮助文档失败');
        }
      } catch (err) {
        setError('网络错误，无法获取帮助文档');
      } finally {
        setLoading(false);
      }
    };

    fetchHelpContent();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载帮助文档...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">❌</div>
          <p className="text-gray-600">{error}</p>
          <button
            onClick={onBack}
            className="mt-4 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
          >
            返回
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* 顶部工具栏 */}
      <div className="mb-6">
        <button
          onClick={onBack}
          className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
        >
          ← 返回
        </button>
      </div>

      {/* 文档内容 */}
      <div
        className="bg-white rounded-lg shadow-sm p-8 prose max-w-none"
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    </div>
  );
};

export default HelpPage;