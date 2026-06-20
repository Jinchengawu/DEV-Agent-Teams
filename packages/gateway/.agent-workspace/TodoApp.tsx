import React, { useState, useCallback } from 'react';

// ============ 类型定义 ============
interface Todo {
  id: number;
  text: string;
  completed: boolean;
  createdAt: Date;
}

type FilterType = 'all' | 'active' | 'completed';

// ============ 单条待办项组件 ============
interface TodoItemProps {
  todo: Todo;
  onToggle: (id: number) => void;
  onDelete: (id: number) => void;
  onEdit: (id: number, newText: string) => void;
}

const TodoItem: React.FC<TodoItemProps> = ({ todo, onToggle, onDelete, onEdit }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(todo.text);

  const handleEdit = () => {
    if (editText.trim() && editText !== todo.text) {
      onEdit(todo.id, editText.trim());
    } else {
      setEditText(todo.text);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleEdit();
    if (e.key === 'Escape') {
      setEditText(todo.text);
      setIsEditing(false);
    }
  };

  return (
    <li className="group flex items-center gap-3 px-4 py-3 bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md transition-all duration-200">
      {/* 勾选框 */}
      <button
        onClick={() => onToggle(todo.id)}
        className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
          todo.completed
            ? 'bg-green-500 border-green-500'
            : 'border-gray-300 hover:border-indigo-400'
        }`}
        aria-label={todo.completed ? '标记为未完成' : '标记为已完成'}
      >
        {todo.completed && (
          <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      {/* 文本内容 / 编辑输入框 */}
      {isEditing ? (
        <input
          type="text"
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onBlur={handleEdit}
          onKeyDown={handleKeyDown}
          autoFocus
          className="flex-1 text-base text-gray-800 border-b-2 border-indigo-400 outline-none py-0.5 bg-transparent"
        />
      ) : (
        <span
          onDoubleClick={() => setIsEditing(true)}
          className={`flex-1 text-base cursor-pointer select-none transition-all duration-200 ${
            todo.completed
              ? 'line-through text-gray-400'
              : 'text-gray-700 hover:text-gray-900'
          }`}
        >
          {todo.text}
        </span>
      )}

      {/* 时间标签 */}
      <span className="text-xs text-gray-300 flex-shrink-0 hidden sm:block">
        {todo.createdAt.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
      </span>

      {/* 删除按钮 */}
      <button
        onClick={() => onDelete(todo.id)}
        className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all duration-200"
        aria-label="删除待办事项"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </li>
  );
};

// ============ 主组件 ============
const TodoApp: React.FC = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [nextId, setNextId] = useState(1);

  // 添加待办事项
  const addTodo = useCallback(() => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;

    const newTodo: Todo = {
      id: nextId,
      text: trimmed,
      completed: false,
      createdAt: new Date(),
    };

    setTodos((prev) => [newTodo, ...prev]);
    setInputValue('');
    setNextId((prev) => prev + 1);
  }, [inputValue, nextId]);

  // 切换完成状态
  const toggleTodo = useCallback((id: number) => {
    setTodos((prev) =>
      prev.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
  }, []);

  // 删除待办事项
  const deleteTodo = useCallback((id: number) => {
    setTodos((prev) => prev.filter((todo) => todo.id !== id));
  }, []);

  // 编辑待办事项
  const editTodo = useCallback((id: number, newText: string) => {
    setTodos((prev) =>
      prev.map((todo) =>
        todo.id === id ? { ...todo, text: newText } : todo
      )
    );
  }, []);

  // 清除已完成
  const clearCompleted = useCallback(() => {
    setTodos((prev) => prev.filter((todo) => !todo.completed));
  }, []);

  // 全选 / 取消全选
  const allCompleted = todos.length > 0 && todos.every((t) => t.completed);
  const toggleAll = useCallback(() => {
    setTodos((prev) =>
      prev.map((todo) => ({ ...todo, completed: !allCompleted }))
    );
  }, [allCompleted]);

  // 过滤后的列表
  const filteredTodos = todos.filter((todo) => {
    if (filter === 'active') return !todo.completed;
    if (filter === 'completed') return todo.completed;
    return true;
  });

  // 统计
  const activeCount = todos.filter((t) => !t.completed).length;
  const completedCount = todos.filter((t) => t.completed).length;

  // 输入框回车处理
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') addTodo();
  };

  // 筛选按钮配置
  const filterOptions: { key: FilterType; label: string }[] = [
    { key: 'all', label: '全部' },
    { key: 'active', label: '进行中' },
    { key: 'completed', label: '已完成' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="max-w-xl mx-auto px-4 py-12">
        {/* 标题 */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            📝 待办事项
          </h1>
          <p className="text-gray-400 mt-2 text-sm">双击待办文本可编辑 · 按 Enter 确认</p>
        </div>

        {/* 输入区域 */}
        <div className="flex gap-2 mb-6">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="添加新的待办事项..."
            className="flex-1 px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-700 placeholder-gray-300 outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent shadow-sm transition-all duration-200"
          />
          <button
            onClick={addTodo}
            disabled={!inputValue.trim()}
            className="px-6 py-3 rounded-xl bg-indigo-500 text-white font-semibold shadow-sm hover:bg-indigo-600 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
          >
            添加
          </button>
        </div>

        {/* 工具栏 */}
        {todos.length > 0 && (
          <div className="flex items-center justify-between mb-4 px-1">
            <button
              onClick={toggleAll}
              className="text-sm text-indigo-500 hover:text-indigo-700 font-medium transition-colors"
            >
              {allCompleted ? '↩ 取消全选' : '☑ 全部完成'}
            </button>

            <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
              {filterOptions.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setFilter(opt.key)}
                  className={`px-3 py-1.5 text-sm rounded-md font-medium transition-all duration-200 ${
                    filter === opt.key
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 待办列表 */}
        <ul className="space-y-2 mb-6">
          {filteredTodos.map((todo) => (
            <TodoItem
              key={todo.id}
              todo={todo}
              onToggle={toggleTodo}
              onDelete={deleteTodo}
              onEdit={editTodo}
            />
          ))}
        </ul>

        {/* 空状态 */}
        {todos.length === 0 && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🎉</div>
            <p className="text-gray-400 text-lg">暂无待办事项</p>
            <p className="text-gray-300 text-sm mt-1">在上方输入框添加你的第一个任务吧</p>
          </div>
        )}

        {/* 筛选无结果 */}
        {todos.length > 0 && filteredTodos.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-400">
              {filter === 'active' ? '所有任务都已完成！🎊' : '还没有已完成的任务'}
            </p>
          </div>
        )}

        {/* 底部统计栏 */}
        {todos.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 bg-white/60 backdrop-blur-sm rounded-xl border border-gray-100">
            <span className="text-sm text-gray-400">
              共 <strong className="text-gray-600">{todos.length}</strong> 项 ·
              进行中 <strong className="text-indigo-500">{activeCount}</strong> ·
              已完成 <strong className="text-green-500">{completedCount}</strong>
            </span>
            {completedCount > 0 && (
              <button
                onClick={clearCompleted}
                className="text-sm text-red-400 hover:text-red-600 font-medium transition-colors"
              >
                清除已完成
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TodoApp;
