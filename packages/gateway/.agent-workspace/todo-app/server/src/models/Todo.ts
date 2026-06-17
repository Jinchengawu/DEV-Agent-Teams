import { getDatabase } from './database';
import { Todo, CreateTodoRequest, UpdateTodoRequest } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class TodoModel {
  private db = getDatabase();

  // 获取所有 Todo
  findAll(completed?: boolean): Todo[] {
    let query = 'SELECT * FROM todos';
    const params: any[] = [];

    if (completed !== undefined) {
      query += ' WHERE completed = ?';
      params.push(completed ? 1 : 0);
    }

    query += ' ORDER BY created_at DESC';

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as any[];
    
    return rows.map(this.mapRow);
  }

  // 根据 ID 获取 Todo
  findById(id: string): Todo | null {
    const stmt = this.db.prepare('SELECT * FROM todos WHERE id = ?');
    const row = stmt.get(id) as any;
    
    return row ? this.mapRow(row) : null;
  }

  // 创建 Todo
  create(data: CreateTodoRequest): Todo {
    const id = uuidv4();
    const now = new Date().toISOString();
    
    const stmt = this.db.prepare(`
      INSERT INTO todos (id, title, description, completed, created_at, updated_at)
      VALUES (?, ?, ?, 0, ?, ?)
    `);
    
    stmt.run(id, data.title, data.description || null, now, now);
    
    return this.findById(id)!;
  }

  // 更新 Todo
  update(id: string, data: UpdateTodoRequest): Todo | null {
    const existing = this.findById(id);
    if (!existing) {
      return null;
    }

    const updates: string[] = [];
    const params: any[] = [];

    if (data.title !== undefined) {
      updates.push('title = ?');
      params.push(data.title);
    }

    if (data.description !== undefined) {
      updates.push('description = ?');
      params.push(data.description);
    }

    if (data.completed !== undefined) {
      updates.push('completed = ?');
      params.push(data.completed ? 1 : 0);
    }

    if (updates.length === 0) {
      return existing;
    }

    updates.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(id);

    const query = `UPDATE todos SET ${updates.join(', ')} WHERE id = ?`;
    this.db.prepare(query).run(...params);

    return this.findById(id);
  }

  // 删除 Todo
  delete(id: string): boolean {
    const stmt = this.db.prepare('DELETE FROM todos WHERE id = ?');
    const result = stmt.run(id);
    
    return result.changes > 0;
  }

  // 获取统计信息
  getStats(): { total: number; completed: number; pending: number } {
    const stmt = this.db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as completed
      FROM todos
    `);
    
    const row = stmt.get() as any;
    const total = row.total || 0;
    const completed = row.completed || 0;
    
    return {
      total,
      completed,
      pending: total - completed
    };
  }

  // 将数据库行映射为 Todo 对象
  private mapRow(row: any): Todo {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      completed: row.completed === 1,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }
}
