'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SkeletonCard } from '@/components/ui/skeleton';

interface KnowledgeDocument {
  id: string;
  title: string;
  content: string;
  type: string;
  source: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
  metadata?: Record<string, any>;
}

interface KnowledgeResult {
  document: KnowledgeDocument;
  score: number;
  matchType: 'fts' | 'semantic' | 'tag' | 'source';
}

interface KnowledgeStats {
  total: number;
  types: Record<string, number>;
  sources: Record<string, number>;
}

const TYPE_COLORS: Record<string, string> = {
  prd: 'bg-purple-100 text-purple-700',
  code: 'bg-blue-100 text-blue-700',
  meeting: 'bg-amber-100 text-amber-700',
  report: 'bg-green-100 text-green-700',
  task: 'bg-orange-100 text-orange-700',
  general: 'bg-gray-100 text-gray-700',
};

const TYPE_LABELS: Record<string, string> = {
  prd: 'PRD',
  code: '代码',
  meeting: '会议',
  report: '报告',
  task: '任务',
  general: '通用',
};

export default function KnowledgePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<KnowledgeResult[]>([]);
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [stats, setStats] = useState<KnowledgeStats | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<KnowledgeDocument | null>(null);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState('');

  // 加载统计和文档列表
  useEffect(() => {
    fetchStats();
    fetchDocuments();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/knowledge/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (e) {
      console.error('Failed to fetch stats:', e);
    }
  };

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/knowledge?limit=50');
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
      }
    } catch (e) {
      console.error('Failed to fetch documents:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/knowledge?q=${encodeURIComponent(searchQuery)}${filterType ? `&type=${filterType}` : ''}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.results || []);
      }
    } catch (e) {
      console.error('Search failed:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN');
  };

  const truncateContent = (content: string, maxLength: number = 200) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  const getTypeBadge = (type: string) => {
    const colorClass = TYPE_COLORS[type] || TYPE_COLORS.general;
    const label = TYPE_LABELS[type] || type;
    return <Badge className={colorClass}>{label}</Badge>;
  };

  // 文档详情弹窗
  const renderDocDetail = () => {
    if (!selectedDoc) return null;
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-y-auto">
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{selectedDoc.title}</h2>
                <div className="flex items-center gap-2 mt-2">
                  {getTypeBadge(selectedDoc.type)}
                  <span className="text-sm text-gray-500">来源: {selectedDoc.source}</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedDoc(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>
          </div>
          <div className="p-6">
            <div className="prose prose-sm max-w-none">
              <pre className="whitespace-pre-wrap text-sm text-gray-700 bg-gray-50 p-4 rounded-lg overflow-auto max-h-[50vh]">
                {selectedDoc.content}
              </pre>
            </div>
            {selectedDoc.tags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1">
                {selectedDoc.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                ))}
              </div>
            )}
            <div className="mt-4 text-xs text-gray-400 flex gap-4">
              <span>创建: {formatDate(selectedDoc.createdAt)}</span>
              <span>更新: {formatDate(selectedDoc.updatedAt)}</span>
            </div>
            {selectedDoc.metadata && (
              <div className="mt-4 p-3 bg-gray-50 rounded text-xs text-gray-600">
                <pre>{JSON.stringify(selectedDoc.metadata, null, 2)}</pre>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">知识中心</h1>
        <p className="text-gray-500 mb-8">跨 Agent 共享知识库 — 产物自动沉淀</p>

        {/* 统计卡片 */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-gray-500">总文档数</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </CardContent>
            </Card>
            {Object.entries(stats.types).map(([type, count]) => (
              <Card key={type}>
                <CardContent className="p-4">
                  <p className="text-sm text-gray-500">{TYPE_LABELS[type] || type}</p>
                  <p className="text-2xl font-bold">{count}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* 搜索栏 */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex gap-3">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="搜索知识库..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">全部类型</option>
                <option value="prd">PRD</option>
                <option value="code">代码</option>
                <option value="meeting">会议</option>
                <option value="report">报告</option>
                <option value="task">任务</option>
              </select>
              <Button onClick={handleSearch} disabled={loading}>
                {loading ? '搜索中...' : '搜索'}
              </Button>
              <Button variant="outline" onClick={fetchDocuments}>
                刷新
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 搜索结果 */}
        {results.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-3">
              搜索结果 ({results.length})
              <button
                onClick={() => setResults([])}
                className="ml-2 text-sm text-blue-500 hover:underline"
              >
                清除
              </button>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {results.map((result) => (
                <Card
                  key={result.document.id}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => setSelectedDoc(result.document)}
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-gray-900">{result.document.title}</h3>
                      <div className="flex items-center gap-1">
                        {getTypeBadge(result.document.type)}
                        <Badge variant="outline" className="text-xs">
                          {Math.round(result.score * 100)}%
                        </Badge>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-3">
                      {truncateContent(result.document.content)}
                    </p>
                    <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
                      <span>来源: {result.document.source}</span>
                      <span>·</span>
                      <span>{formatDate(result.document.createdAt)}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* 文档列表 */}
        <div>
          <h2 className="text-lg font-semibold mb-3">文档列表</h2>
          {loading && documents.length === 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>知识库暂无文档</p>
              <p className="text-sm mt-2">执行 Pipeline 后产物将自动沉淀至此</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {documents.map((doc) => (
                <Card
                  key={doc.id}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => setSelectedDoc(doc)}
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-gray-900">{doc.title}</h3>
                      {getTypeBadge(doc.type)}
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-3">
                      {truncateContent(doc.content)}
                    </p>
                    <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
                      <span>来源: {doc.source}</span>
                      <span>·</span>
                      <span>{formatDate(doc.createdAt)}</span>
                    </div>
                    {doc.tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {doc.tags.slice(0, 5).map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 文档详情弹窗 */}
      {renderDocDetail()}
    </div>
  );
}
