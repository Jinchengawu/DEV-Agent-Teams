import React, { useState, useEffect } from 'react';
import { Todo, TodoListProps } from './types';

const TodoList: React.FC<TodoListProps> = ({ 
  initialTodos = [], 
  onTodosChange 
}) => {
  const [todos, setTodos] = useState<Todo[]>(initialTodos);
  const [newTodoText, setNewTodoText] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');

  // 生成唯一ID
  const generateId = (): string => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  };

  // 添加新的待办事项
  const addTodo = (text: string) => {
    if (text.trim()) {
      const newTodo: Todo = {
        id: generateId(),
        text: text.trim(),
        completed: false,
        createdAt: new Date()
      };
      const updatedTodos = [...todos, newTodo];
      setTodos(updatedTodos);
      setNewTodoText('');
      onTodosChange?.(updatedTodos);
    }
  };

  // 切换待办事项的完成状态
  const toggleTodo = (id: string) => {
    const updatedTodos = todos.map(todo =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    );
    setTodos(updatedTodos);
    onTodosChange?.(updatedTodos);
  };

  // 删除待办事项
  const deleteTodo = (id: string) => {
    const updatedTodos = todos.filter(todo => todo.id !== id);
    setTodos(updatedTodos);
    onTodosChange?.(updatedTodos);
  };

  // 编辑待办事项
  const editTodo = (id: string, newText: string) => {
    if (newText.trim()) {
      const updatedTodos = todos.map(todo =>
        todo.id === id ? { ...todo, text: newText.trim() } : todo
      );
      setTodos(updatedTodos);
      onTodosChange?.(updatedTodos);
    }
  };

  // 清除所有已完成的待办事项
  const clearCompleted = () => {
    const updatedTodos = todos.filter(todo => !todo.completed);
    setTodos(updatedTodos);
    onTodosChange?.(updatedTodos);
  };

  // 根据过滤条件显示待办事项
  const filteredTodos = todos.filter(todo => {
    if (filter === 'active') return !todo.completed;
    if (filter === 'completed') return todo.completed;
    return true;
  });

  // 统计待办事项数量
  const activeTodosCount = todos.filter(todo => !todo.completed).length;
  const completedTodosCount = todos.filter(todo => todo.completed).length;

  // 处理表单提交
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addTodo(newTodoText);
  };

  // 处理键盘事件
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      addTodo(newTodoText);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">
        待办事项列表
      </h1>
      
      {/* 添加新待办事项的表单 */}
      <form onSubmit={handleSubmit} className="mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={newTodoText}
            onChange={(e) => setNewTodoText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="添加新的待办事项..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            添加
          </button>
        </div>
      </form>

      {/* 过滤器 */}
      <div className="flex justify-center gap-4 mb-4">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1 rounded-lg text-sm font-medium ${
            filter === 'all'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          全部 ({todos.length})
        </button>
        <button
          onClick={() => setFilter('active')}
          className={`px-3 py-1 rounded-lg text-sm font-medium ${
            filter === 'active'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          进行中 ({activeTodosCount})
        </button>
        <button
          onClick={() => setFilter('completed')}
          className={`px-3 py-1 rounded-lg text-sm font-medium ${
            filter === 'completed'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          已完成 ({completedTodosCount})
        </button>
      </div>

      {/* 待办事项列表 */}
      <div className="space-y-2">
        {filteredTodos.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {todos.length === 0
              ? '暂无待办事项，请添加一个吧！'
              : filter === 'active'
              ? '没有进行中的待办事项'
              : '没有已完成的待办事项'}
          </div>
        ) : (
          filteredTodos.map(todo => (
            <TodoItem
              key={todo.id}
              todo={todo}
              onToggle={toggleTodo}
              onDelete={deleteTodo}
              onEdit={editTodo}
            />
          ))
        )}
      </div>

      {/* 底部操作栏 */}
      {todos.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-200 flex justify-between items-center">
          <span className="text-sm text-gray-500">
            {activeTodosCount} 个待办事项未完成
          </span>
          {completedTodosCount > 0 && (
            <button
              onClick={clearCompleted}
              className="text-sm text-red-500 hover:text-red-700 focus:outline-none"
            >
              清除已完成
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// 单个待办事项组件
interface TodoItemProps {
  todo: Todo;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string, newText: string) => void;
}

const TodoItem: React.FC<TodoItemProps> = ({ 
  todo, 
  onToggle, 
  onDelete, 
  onEdit 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(todo.text);

  // 处理编辑提交
  const handleEditSubmit = () => {
    if (editText.trim() && editText !== todo.text) {
      onEdit(todo.id, editText);
    }
    setIsEditing(false);
  };

  // 处理键盘事件
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleEditSubmit();
    } else if (e.key === 'Escape') {
      setEditText(todo.text);
      setIsEditing(false);
    }
  };

  // 格式化日期
  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border ${
      todo.completed 
        ? 'bg-gray-50 border-gray-200' 
        : 'bg-white border-gray-300'
    }`}>
      {/* 复选框 */}
      <input
        type="checkbox"
        checked={todo.completed}
        onChange={() => onToggle(todo.id)}
        className="h-5 w-5 text-blue-500 rounded focus:ring-blue-500"
      />
      
      {/* 内容区域 */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <input
            type="text"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onBlur={handleEditSubmit}
            onKeyPress={handleKeyPress}
            className="w-full px-2 py-1 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
        ) : (
          <div>
            <span
              className={`block ${
                todo.completed
                  ? 'line-through text-gray-500'
                  : 'text-gray-800'
              }`}
            >
              {todo.text}
            </span>
            <span className="text-xs text-gray-400 mt-1 block">
              {formatDate(todo.createdAt)}
            </span>
          </div>
        )}
      </div>
      
      {/* 操作按钮 */}
      <div className="flex gap-1">
        {!isEditing && (
          <>
            <button
              onClick={() => setIsEditing(true)}
              className="p-1 text-gray-400 hover:text-blue-500 focus:outline-none"
              title="编辑"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={() => onDelete(todo.id)}
              className="p-1 text-gray-400 hover:text-red-500 focus:outline-none"
              title="删除"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default TodoList;