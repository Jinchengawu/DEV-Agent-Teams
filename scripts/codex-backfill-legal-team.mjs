#!/usr/bin/env node

import { mkdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const rootDir = join(scriptDir, '..');

const bundledNode = join(homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node');
if (process.versions.modules !== '137' && process.env.CODEX_BACKFILL_REEXEC !== '1') {
  const result = spawnSync(bundledNode, [fileURLToPath(import.meta.url), ...process.argv.slice(2)], {
    stdio: 'inherit',
    env: { ...process.env, CODEX_BACKFILL_REEXEC: '1' },
  });
  process.exit(result.status ?? 1);
}

const requireFromCore = createRequire(join(rootDir, 'packages/core/package.json'));
const Database = requireFromCore('better-sqlite3');

const surfaces = [
  {
    id: 'discovery',
    name: 'Legal Product Discovery',
    agent: 'dev-pm',
    docType: 'prd',
    taskTitle: '法律领域 Agent Teams MVP 需求发现',
    content: `# Legal-Agent-Teams MVP PRD

## 定位
Legal-Agent-Teams 是基于 Open-Agent-Teams 的法律领域团队实例，目标不是替代律师，而是把合同审查、法规检索、案件材料整理、风险意见流转、人工复核和审计留痕串成可管理的团队协作闭环。

## 首个业务闭环
用户上传合同或输入法律问题后，系统进入：
1. Intake: 识别业务场景、司法辖区、材料类型、时效要求。
2. Research: 检索法规、判例、内部模板和过往意见。
3. Review: 标注风险条款、缺失条款、冲突条款和谈判建议。
4. Human Approval: 交由执业律师或法务负责人确认。
5. Delivery: 输出审查报告、修订建议和证据引用。
6. Experience: 沉淀复盘经验、风险模式和模板改进项。

## MVP 边界
- P0: 合同审查工作流、法律知识文档管理、风险看板、人工复核关卡、审计日志。
- P1: 法规变更监控、模板库、批量合同审查、客户空间隔离。
- 暂不做: 自动法律意见书签章、无人工复核的最终法律结论、跨境复杂争议自动代理。

## 成功指标
- 每份合同都有可追溯的文档、任务、工作流实例和审批记录。
- 风险项可进入看板并绑定原始条款、依据、负责人和状态。
- 所有 AI 生成内容必须带免责声明、依据引用和人工复核状态。
`,
  },
  {
    id: 'domain-model',
    name: 'Legal Domain Model',
    agent: 'dev-backend',
    docType: 'tech_spec',
    taskTitle: '抽象法律领域核心对象模型',
    content: `# 法律领域核心对象模型

## 核心实体
- Matter: 法律事项，承载客户、辖区、案件/合同类型、保密级别。
- Document: 合同、证据、法规、判例、内部模板、审查报告。
- Clause: 条款片段，保留原文位置、页码、上下文和版本。
- RiskFinding: 风险发现，包含等级、依据、建议动作、责任人。
- LegalAuthority: 法律依据，包含法规条文、判例、监管指南或内部政策。
- ReviewDecision: 人工复核结论，记录审批人、时间、意见和状态。

## Agent 角色
- Intake Agent: 材料接收、元数据补全、任务拆分。
- Research Agent: RAG 检索、依据聚合、引用质量检查。
- Contract Review Agent: 风险识别、条款建议、报告草拟。
- Compliance Agent: 合规红线、隐私和保密校验。
- Human Review Coordinator: 复核任务派发、状态追踪、归档。
- Project Admin Agent: 审计、权限、交付和经验沉淀。

## 必须保留的审计字段
matterId、documentId、clauseRange、authorityIds、agentId、reviewerId、generatedBy、externalModelTokens、humanApproved、createdAt、updatedAt。
`,
  },
  {
    id: 'workflow-design',
    name: 'Legal Workflow Design',
    agent: 'project-admin',
    docType: 'task',
    taskTitle: '设计法律团队工作流与看板状态',
    content: `# 法律团队工作流设计

## 工作流
Intake -> Conflict Check -> Research -> Clause Review -> Risk Report -> Human Review -> Client Delivery -> Retrospective

## 看板列
- todo: 待接收/待补材料
- in_progress: 检索、审查、报告草拟中
- review: 等待律师/法务负责人复核
- blocked: 缺少材料、权限不足、依据不足或模型不可用
- done: 已交付并归档

## 关键关卡
- Conflict Check: 利益冲突与客户隔离检查。
- Citation Gate: 每个风险结论必须绑定至少一个依据或明确标记为经验判断。
- Human Approval Gate: 未通过人工复核不得标记为正式法律意见。
- Privacy Gate: 敏感信息脱敏、访问控制和审计日志完整。
`,
  },
  {
    id: 'implementation-plan',
    name: 'Legal Implementation Plan',
    agent: 'dev-backend',
    docType: 'tech_spec',
    taskTitle: '制定 Legal-Agent-Teams 实现计划',
    content: `# Legal-Agent-Teams 实现计划

## Phase 1: 可用骨架
- 基于 Open-Agent-Teams 初始化 Legal-Agent-Teams 项目模板。
- 复用 Team Coordination Loop: Meeting -> Document -> Kanban -> Workflow -> Artifact -> Experience。
- 增加 Matter、Clause、RiskFinding、LegalAuthority 数据模型。
- 增加合同审查 Pipeline YAML。
- 增加 Codex Backfill 通道，模型不可用时由 Codex 产出并回填。

## Phase 2: 业务闭环
- 文档上传与条款切分。
- 法律知识库导入和引用检索。
- 风险项生成并进入看板。
- 人工复核状态机。
- 审查报告导出。

## Phase 3: 生产化
- 租户隔离、权限矩阵、审计日志。
- 可配置司法辖区和合同类型模板。
- 质量评估集和红队测试。
- 模型供应商限额保护和成本审计。
`,
  },
  {
    id: 'compliance-qa',
    name: 'Legal Compliance QA',
    agent: 'dev-testing',
    docType: 'report',
    taskTitle: '制定法律领域质量与合规验收',
    content: `# 法律领域 QA 与合规验收

## 不可接受行为
- 把 AI 草稿伪装为已审核法律意见。
- 缺少依据引用却输出确定性结论。
- 忽略司法辖区、适用法律、合同版本。
- 在未授权上下文中暴露客户或案件材料。

## E2E 验收
- 上传合同样本文档后生成 Matter。
- 系统拆出风险项并绑定 clauseRange。
- 每个 RiskFinding 至少绑定依据或标记为需人工确认。
- 律师复核后状态从 review 进入 done。
- 报告中包含免责声明、依据清单、复核人、审计时间。

## 测试数据
- SaaS 服务协议。
- 劳动合同。
- 保密协议 NDA。
- 股权投资协议条款片段。
`,
  },
  {
    id: 'release-ops',
    name: 'Legal Release Ops',
    agent: 'devops',
    docType: 'report',
    taskTitle: '规划法律团队部署与运营要求',
    content: `# Legal-Agent-Teams 部署与运营

## 部署要求
- 默认私有化部署，客户材料不出域。
- 文档库、向量库、工作流状态、审计日志独立备份。
- 环境变量必须支持 MODEL_SPEND_GUARD，防止欠费或误调用。
- 所有模型调用必须记录 provider、model、token、costEstimate、requestId。

## 运行时策略
- 真实模型可用时走 Hermes Agent。
- 模型不可用或成本保护开启时走 Codex Backfill。
- Backfill 产物必须标记 generatedBy=codex、externalModelTokens=0、humanApproved=false。

## 发布门禁
- E2E delivery gate 通过。
- 法律免责声明和人工复核关卡存在。
- 权限、审计、数据隔离检查通过。
`,
  },
  {
    id: 'retrospective',
    name: 'Legal Retrospective',
    agent: 'project-admin',
    docType: 'review',
    taskTitle: '沉淀法律团队工程实践复盘',
    content: `# Legal-Agent-Teams 初始复盘

## 本次发现
模型供应商欠费会直接影响真实 Agent 执行链路，因此框架必须把模型不可用视为一等状态，而不是把失败文本沉淀成正式产物。

## 已采取措施
- 引入 MODEL_SPEND_GUARD 阻断外部模型调用。
- 用 Codex Backfill 继续推进工程实践。
- 所有回填产物记录 externalModelTokens=0，避免成本审计混乱。

## 下一步
- 把 Legal-Agent-Teams 从回填项目提升为独立工程模板。
- 增加 Matter/RiskFinding/ReviewDecision 的真实 API。
- 在 Dashboard 中增加模型保护状态提示和 Backfill 入口。
`,
  },
];

function parseArgs(argv) {
  const args = {
    slug: 'legal-agent-teams-mvp',
    dataDir: process.env.AGENT_DB_PATH || join(homedir(), '.dev-agent/data'),
    printJson: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--slug') args.slug = argv[++i] || args.slug;
    else if (arg === '--data-dir') args.dataDir = argv[++i] || args.dataDir;
    else if (arg === '--json') args.printJson = true;
  }
  args.slug = args.slug.replace(/[^a-zA-Z0-9_.-]/g, '-');
  return args;
}

function json(value) {
  return JSON.stringify(value);
}

function nowIso(ms) {
  return new Date(ms).toISOString();
}

function upsertProject(db, project, now) {
  db.prepare(`
    INSERT INTO projects (id, name, description, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      description = excluded.description,
      updated_at = excluded.updated_at
  `).run(project.id, project.name, project.description, now, now);
}

function upsertTask(db, task, now) {
  db.prepare(`
    INSERT INTO tasks (id, project_id, title, description, status, assignee, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      project_id = excluded.project_id,
      title = excluded.title,
      description = excluded.description,
      status = excluded.status,
      assignee = excluded.assignee,
      updated_at = excluded.updated_at
  `).run(task.id, task.projectId, task.title, task.description, task.status, task.assignee, now, now);
}

function upsertDocument(db, doc, now) {
  db.prepare(`
    INSERT INTO documents_v2 (
      id, title, content, type, project_id, task_id, author_id, author_name,
      version, parent_id, tags, related_doc_ids, related_task_ids, related_agent_ids,
      comment_count, created_at, updated_at, metadata
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, NULL, ?, ?, ?, ?, 0, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      content = excluded.content,
      type = excluded.type,
      project_id = excluded.project_id,
      task_id = excluded.task_id,
      author_id = excluded.author_id,
      author_name = excluded.author_name,
      tags = excluded.tags,
      related_doc_ids = excluded.related_doc_ids,
      related_task_ids = excluded.related_task_ids,
      related_agent_ids = excluded.related_agent_ids,
      updated_at = excluded.updated_at,
      metadata = excluded.metadata
  `).run(
    doc.id,
    doc.title,
    doc.content,
    doc.type,
    doc.projectId,
    doc.taskId,
    doc.authorId,
    doc.authorName,
    json(doc.tags),
    json(doc.relatedDocIds),
    json(doc.relatedTaskIds),
    json(doc.relatedAgentIds),
    now,
    now,
    json(doc.metadata),
  );
}

function upsertWorkflowState(db, state) {
  db.prepare(`
    INSERT INTO workflow_states (
      id, goal, status, current_step, total_steps, steps, context,
      token_usage, error, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      goal = excluded.goal,
      status = excluded.status,
      current_step = excluded.current_step,
      total_steps = excluded.total_steps,
      steps = excluded.steps,
      context = excluded.context,
      token_usage = excluded.token_usage,
      error = excluded.error,
      updated_at = excluded.updated_at
  `).run(
    state.id,
    state.goal,
    state.status,
    state.currentStep,
    state.totalSteps,
    json(state.steps),
    json(state.context),
    json(state.tokenUsage),
    state.error || null,
    state.createdAt,
    state.updatedAt,
  );
}

function upsertPipelineInstance(db, instance, now) {
  db.prepare(`
    INSERT INTO pipeline_instances (
      id, pipeline_id, status, current_surface, started_at, completed_at,
      error, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      pipeline_id = excluded.pipeline_id,
      status = excluded.status,
      current_surface = excluded.current_surface,
      completed_at = excluded.completed_at,
      error = excluded.error,
      updated_at = excluded.updated_at
  `).run(instance.id, instance.pipelineId, 'completed', null, now, now, null, nowIso(now), nowIso(now));
}

function upsertSurfaceResult(db, result) {
  db.prepare(`
    INSERT INTO surface_results (
      id, instance_id, surface_id, status, artifacts_json, logs_json,
      started_at, completed_at, error, input_tokens, output_tokens, created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?)
    ON CONFLICT(id) DO UPDATE SET
      status = excluded.status,
      artifacts_json = excluded.artifacts_json,
      logs_json = excluded.logs_json,
      completed_at = excluded.completed_at,
      error = excluded.error
  `).run(
    result.id,
    result.instanceId,
    result.surfaceId,
    'completed',
    json({ output: result.output, generatedBy: 'codex', externalModelTokens: 0 }),
    json(['Codex backfill persisted without external model call']),
    result.startedAt,
    result.completedAt,
    null,
    nowIso(result.completedAt),
  );
}

function writeRuntimePipeline(dataDir, pipelineId) {
  const dir = join(dataDir, 'pipelines');
  mkdirSync(dir, { recursive: true });
  const yaml = [
    `id: ${pipelineId}`,
    'name: Legal-Agent-Teams Production Loop',
    'version: 0.1.0',
    'context:',
    '  description: Legal-domain team coordination loop seeded by Codex backfill while live model calls are disabled.',
    'surfaces:',
    ...surfaces.flatMap((surface) => [
      `  - id: ${surface.id}`,
      `    name: ${surface.name}`,
      `    agent: ${surface.agent}`,
      '    workflow:',
      `      goal: ${surface.taskTitle}`,
      '    output:',
      `      description: ${surface.name} artifact`,
      '      artifacts:',
      '        - markdown',
    ]),
    'edges:',
    '  - from: discovery',
    '    to: domain-model',
    '  - from: domain-model',
    '    to: workflow-design',
    '  - from: workflow-design',
    '    to: implementation-plan',
    '  - from: implementation-plan',
    '    to: compliance-qa',
    '  - from: compliance-qa',
    '    to: release-ops',
    '  - from: release-ops',
    '    to: retrospective',
    '',
  ].join('\n');

  const file = join(dir, `${pipelineId}.yaml`);
  writeFileSync(file, yaml, 'utf8');
  return file;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  mkdirSync(args.dataDir, { recursive: true });

  const now = Date.now();
  const pipelineId = 'legal-agent-team-production-loop';
  const instanceId = `pipeline-codex-${args.slug}`;
  const projectId = `proj-codex-${args.slug}`;

  const documentsDb = new Database(join(args.dataDir, 'documents.db'));
  const sessionsDb = new Database(join(args.dataDir, 'sessions.db'));

  const taskIdsBySurface = Object.fromEntries(surfaces.map((surface) => [surface.id, `task-codex-${args.slug}-${surface.id}`]));
  const documentIdsBySurface = Object.fromEntries(surfaces.map((surface) => [surface.id, `doc-codex-${args.slug}-${surface.id}`]));
  const allTaskIds = Object.values(taskIdsBySurface);
  const allDocIds = Object.values(documentIdsBySurface);

  const project = {
    id: projectId,
    name: 'Legal-Agent-Teams Production MVP',
    description: 'Codex backfilled legal-domain Agent Teams project. External model calls are disabled; artifacts were generated by Codex and persisted with zero provider tokens.',
  };

  const runDocuments = documentsDb.transaction(() => {
    upsertProject(documentsDb, project, now);
    for (const surface of surfaces) {
      const taskId = taskIdsBySurface[surface.id];
      const docId = documentIdsBySurface[surface.id];
      upsertTask(documentsDb, {
        id: taskId,
        projectId,
        title: surface.taskTitle,
        description: [
          `Pipeline: ${pipelineId}`,
          `Instance: ${instanceId}`,
          `Surface: ${surface.id}`,
          `Agent: ${surface.agent}`,
          'Execution mode: codex-backfill',
          'External model tokens: 0',
        ].join('\n'),
        status: surface.id === 'implementation-plan' ? 'in_progress' : 'done',
        assignee: surface.agent,
      }, now);
      upsertDocument(documentsDb, {
        id: docId,
        title: `${surface.name} (${surface.id}) - ${instanceId}`,
        content: `${surface.content}\n\n---\n\nGenerated by Codex backfill. externalModelTokens=0. humanApproved=false.`,
        type: surface.docType,
        projectId,
        taskId,
        authorId: surface.agent,
        authorName: surface.name,
        tags: ['codex-backfill', 'legal-agent-teams', pipelineId, surface.id],
        relatedDocIds: allDocIds.filter((id) => id !== docId),
        relatedTaskIds: allTaskIds,
        relatedAgentIds: [surface.agent],
        metadata: {
          generatedBy: 'codex',
          executionMode: 'codex-backfill',
          externalModelTokens: 0,
          humanApproved: false,
          pipelineId,
          instanceId,
          projectId,
          surfaceId: surface.id,
          timestamp: now,
        },
      }, now);
    }
  });

  runDocuments();

  const steps = surfaces.map((surface, index) => ({
    index,
    agentId: surface.agent,
    goal: surface.taskTitle,
    output: `${surface.name} artifact persisted by Codex backfill. Document: ${documentIdsBySurface[surface.id]}`,
    status: 'completed',
    startedAt: now + index,
    completedAt: now + index + 1,
  }));

  const context = {
    kind: 'pipeline',
    pipelineId,
    pipelineName: 'Legal-Agent-Teams Production Loop',
    surfaceIds: surfaces.map((surface) => surface.id),
    coordination: {
      projectId,
      taskIdsBySurface,
      documentIdsBySurface,
    },
    execution: {
      dryRun: true,
      mode: 'codex-backfill',
      externalModelTokens: 0,
      modelSpendGuard: true,
    },
  };

  const runSessions = sessionsDb.transaction(() => {
    upsertWorkflowState(sessionsDb, {
      id: instanceId,
      goal: 'Legal-Agent-Teams Production Loop seeded by Codex backfill',
      status: 'completed',
      currentStep: surfaces.length,
      totalSteps: surfaces.length,
      steps,
      context,
      tokenUsage: { input_tokens: 0, output_tokens: 0 },
      createdAt: nowIso(now),
      updatedAt: nowIso(now),
    });
    upsertPipelineInstance(sessionsDb, { id: instanceId, pipelineId }, now);
    for (const surface of surfaces) {
      upsertSurfaceResult(sessionsDb, {
        id: `surface-codex-${args.slug}-${surface.id}`,
        instanceId,
        surfaceId: surface.id,
        output: `${surface.name} -> ${documentIdsBySurface[surface.id]}`,
        startedAt: now,
        completedAt: now,
      });
    }
  });

  runSessions();
  const pipelineFile = writeRuntimePipeline(args.dataDir, pipelineId);

  documentsDb.close();
  sessionsDb.close();

  const result = {
    ok: true,
    mode: 'codex-backfill',
    externalModelTokens: 0,
    dataDir: args.dataDir,
    pipelineId,
    instanceId,
    projectId,
    pipelineFile,
    taskCount: allTaskIds.length,
    documentCount: allDocIds.length,
    urls: {
      pipeline: `/pipeline?instanceId=${encodeURIComponent(instanceId)}`,
      knowledge: `/knowledge?projectId=${encodeURIComponent(projectId)}`,
      kanban: '/kanban?source=coordination',
    },
  };

  if (args.printJson) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`Codex backfill completed: ${instanceId}`);
    console.log(`Project: ${projectId}`);
    console.log(`Documents: ${allDocIds.length}; Tasks: ${allTaskIds.length}; External model tokens: 0`);
    console.log(`Pipeline: ${result.urls.pipeline}`);
    console.log(`Knowledge: ${result.urls.knowledge}`);
    console.log(`Kanban: ${result.urls.kanban}`);
  }
}

main();
