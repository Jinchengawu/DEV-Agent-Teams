import { NextResponse } from 'next/server';
import Database from 'better-sqlite3';

const DB_PATH = process.env.SESSION_DB_PATH || `${process.env.HOME}/.dev-agent/data/sessions.db`;

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const db = new Database(DB_PATH, { readonly: true });
  try {
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(params.id);
    if (!task) return NextResponse.json({ error: 'not found' }, { status: 404 });
    return NextResponse.json(task);
  } finally {
    db.close();
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json();
  const db = new Database(DB_PATH);
  try {
    const existing: any = db.prepare('SELECT * FROM tasks WHERE id = ?').get(params.id);
    if (!existing) return NextResponse.json({ error: 'not found' }, { status: 404 });

    const completedAt = body.status === 'done' && existing.status !== 'done'
      ? new Date().toISOString()
      : existing.completed_at;

    db.prepare(`
      UPDATE tasks SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        status = COALESCE(?, status),
        assignee = COALESCE(?, assignee),
        priority = COALESCE(?, priority),
        task_type = COALESCE(?, task_type),
        milestone_id = COALESCE(?, milestone_id),
        parent_id = COALESCE(?, parent_id),
        progress = COALESCE(?, progress),
        tags = COALESCE(?, tags),
        due_at = COALESCE(?, due_at),
        completed_at = COALESCE(?, completed_at),
        updated_at = datetime('now')
      WHERE id = ?
    `).run(
      body.title, body.description, body.status, body.assignee, body.priority,
      body.task_type, body.milestone_id, body.parent_id, body.progress,
      body.tags ? JSON.stringify(body.tags) : null, body.due_at, completedAt, params.id
    );
    return NextResponse.json({ id: params.id, ...body });
  } finally {
    db.close();
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const db = new Database(DB_PATH);
  try {
    db.prepare('DELETE FROM tasks WHERE id = ?').run(params.id);
    return NextResponse.json({ deleted: params.id });
  } finally {
    db.close();
  }
}
