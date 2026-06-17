import { Request, Response } from 'express';
import { TodoModel } from '../models/Todo';
import { CreateTodoRequest, UpdateTodoRequest } from '../types';

export class TodoController {
  private todoModel: TodoModel;

  constructor(todoModel?: TodoModel) {
    this.todoModel = todoModel || new TodoModel();
  }

  // 获取所有 Todo
  getAll = (req: Request, res: Response): void => {
    try {
      const completed = req.query.completed === 'true' 
        ? true 
        : req.query.completed === 'false' 
          ? false 
          : undefined;

      const todos = this.todoModel.findAll(completed);
      const stats = this.todoModel.getStats();

      res.json({
        success: true,
        data: todos,
        total: todos.length,
        stats
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch todos'
      });
    }
  };

  // 根据 ID 获取 Todo
  getById = (req: Request, res: Response): void => {
    try {
      const { id } = req.params;
      const todo = this.todoModel.findById(id);

      if (!todo) {
        res.status(404).json({
          success: false,
          error: 'Todo not found'
        });
        return;
      }

      res.json({
        success: true,
        data: todo
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch todo'
      });
    }
  };

  // 创建 Todo
  create = (req: Request, res: Response): void => {
    try {
      const data: CreateTodoRequest = {
        title: req.body.title,
        description: req.body.description
      };

      const todo = this.todoModel.create(data);

      res.status(201).json({
        success: true,
        data: todo
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to create todo'
      });
    }
  };

  // 更新 Todo
  update = (req: Request, res: Response): void => {
    try {
      const { id } = req.params;
      const data: UpdateTodoRequest = {};

      if (req.body.title !== undefined) data.title = req.body.title;
      if (req.body.description !== undefined) data.description = req.body.description;
      if (req.body.completed !== undefined) data.completed = req.body.completed;

      const todo = this.todoModel.update(id, data);

      if (!todo) {
        res.status(404).json({
          success: false,
          error: 'Todo not found'
        });
        return;
      }

      res.json({
        success: true,
        data: todo
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to update todo'
      });
    }
  };

  // 删除 Todo
  delete = (req: Request, res: Response): void => {
    try {
      const { id } = req.params;
      const deleted = this.todoModel.delete(id);

      if (!deleted) {
        res.status(404).json({
          success: false,
          error: 'Todo not found'
        });
        return;
      }

      res.json({
        success: true,
        data: { id }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to delete todo'
      });
    }
  };

  // 批量删除已完成的 Todo
  deleteCompleted = (req: Request, res: Response): void => {
    try {
      const completedTodos = this.todoModel.findAll(true);
      let deletedCount = 0;

      for (const todo of completedTodos) {
        if (this.todoModel.delete(todo.id)) {
          deletedCount++;
        }
      }

      res.json({
        success: true,
        data: { deletedCount }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to delete completed todos'
      });
    }
  };
}
