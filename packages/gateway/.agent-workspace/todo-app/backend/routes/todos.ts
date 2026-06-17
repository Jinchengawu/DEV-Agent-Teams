import express, { Request, Response } from 'express';
import { getDatabase } from '../database';

const router = express.Router();

interface Todo {
  id: number;
  title: string;
  description: string | null;
  completed: boolean;
  created_at: string;
  updated_at: string;
}

// 获取所有 TODO
router.get('/', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const todos = db.prepare('SELECT * FROM todos ORDER BY created_at DESC').all();
    res.json(todos);
  } catch (error) {
    console.error('Error fetching todos:', error);
    res.status(500).json({ error: 'Failed to fetch todos' });
  }
});

// 获取单个 TODO
router.get('/:id', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const todo = db.prepare('SELECT * FROM todos WHERE id = ?').get(req.params.id);
    if (!todo) {
      return res.status(404).json({ error: 'Todo not found' });
    }
    res.json(todo);
  } catch (error) {
    console.error('Error fetching todo:', error);
    res.status(500).json({ error: 'Failed to fetch todo' });
  }
});

// 创建新 TODO
router.post('/', (req: Request, res: Response) => {
  try {
    const { title, description } = req.body;
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }
    
    const db = getDatabase();
    const result = db.prepare(
      'INSERT INTO todos (title, description) VALUES (?, ?)'
    ).run(title, description || null);
    
    const newTodo = db.prepare('SELECT * FROM todos WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(newTodo);
  } catch (error) {
    console.error('Error creating todo:', error);
    res.status(500).json({ error: 'Failed to create todo' });
  }
});

// 更新 TODO
router.put('/:id', (req: Request, res: Response) => {
  try {
    const { title, description, completed } = req.body;
    const db = getDatabase();
    
    const existingTodo = db.prepare('SELECT * FROM todos WHERE id = ?').get(req.params.id) as Todo;
    if (!existingTodo) {
      return res.status(404).json({ error: 'Todo not found' });
    }
    
    const updatedTodo = {
      title: title !== undefined ? title : existingTodo.title,
      description: description !== undefined ? description : existingTodo.description,
      completed: completed !== undefined ? completed : existingTodo.completed,
      updated_at: new Date().toISOString()
    };
    
    db.prepare(
      'UPDATE todos SET title = ?, description = ?, completed = ?, updated_at = ? WHERE id = ?'
    ).run(updatedTodo.title, updatedTodo.description, updatedTodo.completed, updatedTodo.updated_at, req.params.id);
    
    const todo = db.prepare('SELECT * FROM todos WHERE id = ?').get(req.params.id);
    res.json(todo);
  } catch (error) {
    console.error('Error updating todo:', error);
    res.status(500).json({ error: 'Failed to update todo' });
  }
});

// 删除 TODO
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const result = db.prepare('DELETE FROM todos WHERE id = ?').run(req.params.id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Todo not found' });
    }
    
    res.json({ message: 'Todo deleted successfully' });
  } catch (error) {
    console.error('Error deleting todo:', error);
    res.status(500).json({ error: 'Failed to delete todo' });
  }
});

// 切换 TODO 完成状态
router.patch('/:id/toggle', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const todo = db.prepare('SELECT * FROM todos WHERE id = ?').get(req.params.id) as Todo;
    
    if (!todo) {
      return res.status(404).json({ error: 'Todo not found' });
    }
    
    const newCompleted = !todo.completed;
    const updatedAt = new Date().toISOString();
    
    db.prepare('UPDATE todos SET completed = ?, updated_at = ? WHERE id = ?')
      .run(newCompleted, updatedAt, req.params.id);
    
    const updatedTodo = db.prepare('SELECT * FROM todos WHERE id = ?').get(req.params.id);
    res.json(updatedTodo);
  } catch (error) {
    console.error('Error toggling todo:', error);
    res.status(500).json({ error: 'Failed to toggle todo' });
  }
});

export default router;