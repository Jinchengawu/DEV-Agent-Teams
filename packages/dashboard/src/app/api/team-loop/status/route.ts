import { NextResponse } from 'next/server';
import { getCompletedDeliveryGateReports } from '@/lib/delivery-gate-reports';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://127.0.0.1:8400';

async function fetchGatewayJson(path: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(`${GATEWAY_URL}${path}`, {
      signal: controller.signal,
      cache: 'no-store',
    });
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function countObjectValues(value: unknown) {
  if (!value || typeof value !== 'object') return 0;
  return Object.values(value as Record<string, unknown>).filter(Boolean).length;
}

function getTaskStatusCounts(tasks: any[]) {
  return tasks.reduce<Record<string, number>>((acc, task) => {
    const status = String(task.status || 'unknown');
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});
}

export async function GET() {
  const [instancesData, workflowsData, tasksData, documentsData] = await Promise.all([
    fetchGatewayJson('/pipeline-instances?limit=1'),
    fetchGatewayJson('/v1/workflows?limit=1'),
    fetchGatewayJson('/api/v2/tasks'),
    fetchGatewayJson('/api/v2/documents?limit=50'),
  ]);

  const latestGate = getCompletedDeliveryGateReports(1)[0] ?? null;
  const latestInstance = instancesData?.instances?.[0] ?? null;
  const latestWorkflow = workflowsData?.workflows?.[0] ?? null;
  const tasks = Array.isArray(tasksData?.tasks) ? tasksData.tasks : [];
  const documents = Array.isArray(documentsData?.documents) ? documentsData.documents : [];
  const projectId = latestInstance?.coordination?.projectId ?? latestWorkflow?.project_id ?? null;
  const taskIdsBySurface = latestInstance?.coordination?.taskIdsBySurface || {};
  const documentIdsBySurface = latestInstance?.coordination?.documentIdsBySurface || {};
  const surfaceTaskCount = countObjectValues(taskIdsBySurface);
  const surfaceDocumentCount = countObjectValues(documentIdsBySurface);
  const projectTasks = projectId ? tasks.filter((task: any) => task.projectId === projectId) : [];
  const projectDocuments = projectId ? documents.filter((doc: any) => doc.projectId === projectId) : [];
  const boundProjectDocuments = projectDocuments.filter((doc: any) => {
    const relatedTasks = Array.isArray(doc.relatedTaskIds) ? doc.relatedTaskIds : [];
    return Boolean(doc.taskId) || relatedTasks.length > 0 || doc.metadata?.instanceId === latestInstance?.id;
  });
  const taskStatusCounts = getTaskStatusCounts(projectTasks);
  const loopOk = Boolean(
    latestGate?.ok
    && latestInstance?.id
    && projectId
    && surfaceTaskCount > 0
    && projectTasks.length > 0
    && surfaceDocumentCount > 0
    && boundProjectDocuments.length > 0,
  );

  return NextResponse.json({
    ok: loopOk,
    checkedAt: Date.now(),
    deliveryGate: latestGate
      ? {
          ok: latestGate.ok,
          report: latestGate.report,
          summary: latestGate.summary,
          reportTime: latestGate.reportTime,
        }
      : null,
    latestWorkflow: latestWorkflow
      ? {
          id: latestWorkflow.id,
          status: latestWorkflow.status,
          pipelineId: latestWorkflow.pipeline_id || latestWorkflow.template,
          projectId: latestWorkflow.project_id || projectId,
          taskCount: latestWorkflow.coordination_task_count ?? surfaceTaskCount,
          href: latestWorkflow.pipeline_url || (latestInstance?.id ? `/pipeline?instanceId=${latestInstance.id}` : null),
        }
      : null,
    latestInstance: latestInstance
      ? {
          id: latestInstance.id,
          status: latestInstance.status,
          pipelineId: latestInstance.pipelineId,
          projectId,
          surfaceTaskCount,
          surfaceDocumentCount,
          currentSurface: latestInstance.currentSurface || null,
          href: latestInstance.pipeline_url || `/pipeline?instanceId=${latestInstance.id}`,
        }
      : null,
    kanban: {
      projectId,
      taskCount: projectTasks.length,
      statusCounts: taskStatusCounts,
      surfaceTaskCount,
      href: projectId ? `/kanban?source=coordination` : null,
    },
    documents: {
      projectDocumentCount: projectDocuments.length,
      boundProjectDocumentCount: boundProjectDocuments.length,
      total: Number(documentsData?.total || documents.length || 0),
      href: projectId ? `/knowledge?projectId=${encodeURIComponent(projectId)}` : null,
    },
  });
}
