import { NextResponse } from 'next/server';
import Database from 'better-sqlite3';

const DB_PATH = process.env.SESSION_DB_PATH || `${process.env.HOME}/.dev-agent/data/sessions.db`;

export async function GET() {
  const db = new Database(DB_PATH, { readonly: true });
  try {
    const tasks = db.prepare('SELECT * FROM tasks ORDER BY updated_at DESC').all();
    const milestones = db.prepare('SELECT * FROM milestones ORDER BY target_date ASC').all();

    // 按 Agent 统计
    const agentStats = db.prepare(`
      SELECT assignee,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'todo' THEN 1 ELSE 0 END) as todo,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN status = 'review' THEN 1 ELSE 0 END) as review,
        SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as done,
        SUM(CASE WHEN status = 'blocked' THEN 1 ELSE 0 END) as blocked
      FROM tasks
      WHERE assignee != ''
      GROUP BY assignee
    `).all();

    const total = (tasks as any[]).length;
    const completed = (tasks as any[]).filter(t => t.status === 'done').length;
    const blocked = (tasks as any[]).filter(t => t.status === 'blocked').length;
    const overdue = (tasks as any[]).filter(
      t => t.due_at && t.due_at < new Date().toISOString() && t.status !== 'done'
    ).length;

    return NextResponse.json({
      tasks,
      milestones,
      agent_stats: (agentStats as any[]).reduce((acc: any, row: any) => {
        acc[row.assignee] = row;
        return acc;
      }, {}),
      summary: {
        total_tasks: total,
        completed,
        blocked,
        overdue,
        active_milestones: (milestones as any[]).filter(m => m.status === 'active').length,
      },
    });
  } finally {
    db.close();
  }
}
