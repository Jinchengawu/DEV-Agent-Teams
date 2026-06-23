'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';

interface PipelineDef {
  id: string;
  name: string;
  version?: string;
  surfaces: SurfaceDef[];
  edges: EdgeDef[];
}

interface SurfaceDef {
  id: string;
  name: string;
  agent: string;
  status?: string;
  input?: { required?: string[]; from?: string };
  output?: { artifacts?: string[]; description?: string };
}

interface EdgeDef {
  from: string;
  to: string | string[];
  description?: string;
}

interface SurfaceResult {
  surfaceId: string;
  status: string;
  artifacts?: Record<string, any>;
  error?: string;
  startedAt?: number;
  completedAt?: number;
}

interface PipelineInstance {
  id: string;
  pipelineId: string;
  status: string;
  surfaceResults: Record<string, SurfaceResult>;
  startedAt: number;
  completedAt?: number;
}

const STORAGE_KEY = 'pipeline-execution-history';

export default function PipelinePage() {
  const { showToast } = useToast();
  const [pipelines, setPipelines] = useState<PipelineDef[]>([]);
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState<string | null>(null);
  const [currentInstance, setCurrentInstance] = useState<PipelineInstance | null>(null);
  const [instanceHistory, setInstanceHistory] = useState<PipelineInstance[]>([]);
  const [pollInterval, setPollInterval] = useState<NodeJS.Timeout | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  // 加载 Pipeline 列表 + 恢复历史
  useEffect(() => {
    fetchPipelines();
    restoreHistory();
  }, []);

  // 从 localStorage 恢复历史
  const restoreHistory = async () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const instanceIds: string[] = JSON.parse(stored);
        // 去重并过滤空值
        const uniqueIds = [...new Set(instanceIds)].filter(Boolean);
        if (uniqueIds.length > 0) {
          // 批量获取实例状态
          const res = await fetch('/api/pipeline-instances');
          if (res.ok) {
            const data = await res.json();
            const instances = data.instances || [];
            // 只保留存储的实例ID对应的实例
            const storedInstances = instances.filter((i: PipelineInstance) => uniqueIds.includes(i.id));
            setInstanceHistory(storedInstances);
            // 如果有正在运行的实例，继续轮询
            const runningInstance = storedInstances.find((i: PipelineInstance) => i.status === 'running');
            if (runningInstance) {
              startPolling(runningInstance.id);
            }
          }
        }
      }
    } catch (e) {
      console.error('恢复历史失败:', e);
    }
  };

  // 保存实例ID到 localStorage
  const saveInstanceId = (instanceId: string) => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const ids: string[] = stored ? JSON.parse(stored) : [];
      if (!ids.includes(instanceId)) {
        ids.push(instanceId);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
      }
    } catch (e) {
      console.error('保存历史失败:', e);
    }
  };

  const fetchPipelines = async () => {
    try {
      const res = await fetch('/api/pipelines');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setPipelines(data.pipelines || []);
    } catch (e) {
      showToast('Failed to load pipelines', 'error');
    }
  };

  // 执行 Pipeline
  const executePipeline = async (pipelineId: string) => {
    setExecuting(pipelineId);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: `执行 ${pipelineId} Pipeline` }],
          mode: 'pipeline',
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      // 解析 instanceId
      const instanceIdMatch = data.message?.content?.match(/实例ID[:\s]+(\S+)/);
      if (instanceIdMatch) {
        const instanceId = instanceIdMatch[1];
        saveInstanceId(instanceId);
        startPolling(instanceId);
      }

      showToast('Pipeline started', 'success');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      showToast(msg, 'error');
    } finally {
      setExecuting(null);
    }
  };

  // 轮询实例状态
  const startPolling = useCallback((instanceId: string) => {
    if (pollInterval) clearInterval(pollInterval);

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/pipeline-instances/${instanceId}`);
        if (!res.ok) return;
        const data = await res.json();
        setCurrentInstance(data);

        // 更新历史中的该实例
        setInstanceHistory(prev => {
          const filtered = prev.filter(i => i.id !== data.id);
          return [data, ...filtered].slice(0, 50); // 保留最近50个
        });

        if (data.status === 'completed' || data.status === 'failed') {
          clearInterval(interval);
          setPollInterval(null);
        }
      } catch {
        // ignore polling errors
      }
    }, 2000);

    setPollInterval(interval);
  }, [pollInterval]);

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'running': return 'bg-blue-500 animate-pulse';
      case 'failed': return 'bg-red-500';
      case 'pending': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return <Badge className="bg-green-500">完成</Badge>;
      case 'running': return <Badge className="bg-blue-500">执行中</Badge>;
      case 'failed': return <Badge className="bg-red-500">失败</Badge>;
      case 'pending': return <Badge variant="secondary">等待</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // 渲染单个 Pipeline 的执行状态
  const renderPipelineStatus = (pipeline: PipelineDef, instance: PipelineInstance | null) => {
    return (
      <div className="mt-4">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm font-medium text-gray-700">执行流程:</span>
          {instance && (
            <span className="text-xs text-gray-500">
              实例: {instance.id} | {getStatusBadge(instance.status)}
            </span>
          )}
        </div>
        <div className="flex flex-col gap-4">
          {pipeline.surfaces.map((surface, index) => {
            const isCurrent = instance?.surfaceResults[surface.id];
            const status = isCurrent?.status || 'pending';

            return (
              <div key={surface.id} className="relative">
                {/* 连接线 */}
                {index > 0 && (
                  <div className="absolute -top-4 left-6 w-0.5 h-4 bg-gray-300" />
                )}

                <div className={`flex items-start gap-4 p-4 rounded-lg border-2 transition-all ${
                  status === 'running' ? 'border-blue-500 bg-blue-50' :
                  status === 'completed' ? 'border-green-500 bg-green-50' :
                  status === 'failed' ? 'border-red-500 bg-red-50' :
                  'border-gray-200 bg-white'
                }`}>
                  {/* 状态指示器 */}
                  <div className={`w-4 h-4 rounded-full mt-1 flex-shrink-0 ${getStatusColor(status)}`} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold">{surface.name}</span>
                      {getStatusBadge(status)}
                      <span className="text-xs text-gray-500">({surface.agent})</span>
                    </div>

                    {/* 输入/输出 */}
                    <div className="text-sm text-gray-600 mt-2 space-y-1">
                      {surface.input?.from && (
                        <p>输入: 来自 {surface.input.from}</p>
                      )}
                      {surface.output?.artifacts && (
                        <p>产出: {surface.output.artifacts.join(', ')}</p>
                      )}
                    </div>

                    {/* 执行结果 */}
                    {isCurrent && (
                      <div className="mt-3 p-3 bg-white rounded border text-sm">
                        {isCurrent.error ? (
                          <p className="text-red-600">❌ {isCurrent.error}</p>
                        ) : isCurrent.artifacts ? (
                          <div>
                            <p className="font-medium text-green-600">✅ 执行完成</p>
                            {Object.entries(isCurrent.artifacts).slice(0, 3).map(([key, value]) => (
                              <p key={key} className="text-gray-600 mt-1">
                                {key}: {typeof value === 'string' ? value.substring(0, 100) : JSON.stringify(value).substring(0, 100)}
                              </p>
                            ))}
                          </div>
                        ) : null}
                        {isCurrent.startedAt && (
                          <p className="text-xs text-gray-400 mt-2">
                            耗时: {isCurrent.completedAt
                              ? Math.round((isCurrent.completedAt - isCurrent.startedAt) / 1000) + 's'
                              : '进行中...'
                            }
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Pipeline 流水线</h1>
        <p className="text-gray-500 mb-8">基于"一体多面"哲学的面编排引擎</p>

        {/* 执行历史 */}
        {instanceHistory.length > 0 && (
          <Card className="mb-6 border-l-4 border-l-amber-500">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg">执行历史 ({instanceHistory.length})</CardTitle>
                <Button variant="outline" size="sm" onClick={() => setShowHistory(!showHistory)}>
                  {showHistory ? '收起' : '展开'}
                </Button>
              </div>
            </CardHeader>
            {showHistory && (
              <CardContent>
                <div className="space-y-2">
                  {instanceHistory.map((instance) => (
                    <div
                      key={instance.id}
                      className={`flex items-center justify-between p-3 rounded border cursor-pointer hover:bg-gray-50 ${
                        currentInstance?.id === instance.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                      }`}
                      onClick={() => {
                        setCurrentInstance(instance);
                        if (instance.status === 'running') {
                          startPolling(instance.id);
                        }
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${getStatusColor(instance.status)}`} />
                        <div>
                          <p className="font-medium text-sm">{instance.pipelineId}</p>
                          <p className="text-xs text-gray-500">{instance.id}</p>
                        </div>
                      </div>
                      <div className="text-right text-xs text-gray-500">
                        <p>{getStatusBadge(instance.status)}</p>
                        <p>{new Date(instance.startedAt).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        )}

        {/* Pipeline 列表 */}
        <div className="grid gap-6 mb-8">
          {pipelines.map((pipeline) => (
            <Card key={pipeline.id} className="border-l-4 border-l-blue-500">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl">{pipeline.name}</CardTitle>
                    <p className="text-sm text-gray-500 mt-1">ID: {pipeline.id} | 版本: {pipeline.version || '1.0'}</p>
                  </div>
                  <Button
                    onClick={() => executePipeline(pipeline.id)}
                    disabled={executing === pipeline.id}
                    className="min-w-[100px]"
                  >
                    {executing === pipeline.id ? '执行中...' : '执行'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {renderPipelineStatus(pipeline, currentInstance)}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 当前实例状态 */}
        {currentInstance && (
          <Card className="border-l-4 border-l-purple-500">
            <CardHeader>
              <CardTitle>当前执行实例</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">实例ID:</span>
                  <span className="ml-2 font-mono">{currentInstance.id}</span>
                </div>
                <div>
                  <span className="text-gray-500">Pipeline:</span>
                  <span className="ml-2">{currentInstance.pipelineId}</span>
                </div>
                <div>
                  <span className="text-gray-500">状态:</span>
                  <span className="ml-2">{getStatusBadge(currentInstance.status)}</span>
                </div>
                <div>
                  <span className="text-gray-500">开始时间:</span>
                  <span className="ml-2">{new Date(currentInstance.startedAt).toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {pipelines.length === 0 && !loading && (
          <div className="text-center py-12 text-gray-500">
            <p>暂无 Pipeline 定义</p>
            <p className="text-sm mt-2">请在 Gateway 中加载 Pipeline YAML</p>
          </div>
        )}
      </div>
    </div>
  );
}
