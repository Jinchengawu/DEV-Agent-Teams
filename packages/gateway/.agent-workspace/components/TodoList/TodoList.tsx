import React, { useState, useCallback } from 'react';

/** 单条待办事项的数据结构 */
interface Todo {
  id: number;
  text: string;
  completed: boolean;
}

/** 组件 Props（预留扩展能力） */
interface TodoListProps {
  initialTodos?: Todo[];
}

const TodoList: React.FC<TodoListProps> = ({ initialTodos = [] }) => {
  const [todos, setTodos] = useState<Todo[]>(initialTodos);
  const [inputValue, setInputValue] = useState<string>('');
  const [nextId, setNextId] = useState<number>(1);

  // ───── 添加待办 ─────
  const addTodo = useCallback(() => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;

    const newTodo: Todo = { id: nextId, text: trimmed, completed: false };
    setTodos((prev) => [...prev, newTodo]);
    setNextId((prev) => prev + 1);
    setInputValue('');
  }, [inputValue, nextId]);

  // ───── 切换完成状态 ─────
  const toggleTodo = useCallback((id: number) => {
    setTodos((prev) =>
      prev.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo,
      ),
    );
  }, []);

  // ───── 删除待办 ─────
  const deleteTodo = useCallback((id: number) => {
    setTodos((prev) => prev.filter((todo) => todo.id !== id));
  }, []);

  // ───── 键盘回车提交 ─────
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') addTodo();
  };

  // ───── 统计 ─────
  const totalCount = todos.length;
  const completedCount = todos.filter((t) => t.completed).length;
  const remainingCount = totalCount - completedCount;

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>📝 待办事项</h1>

      {/* 输入区域 */}
      <div style={styles.inputRow}>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="添加新的待办事项..."
          style={styles.input}
        />
        <button onClick={addTodo} style={styles.addButton}>
          添加
        </button>
      </div>

      {/* 统计信息 */}
      <div style={styles.stats}>
        <span>全部: {totalCount}</span>
        <span>已完成: {completedCount}</span>
        <span>未完成: {remainingCount}</span>
      </div>

      {/* 待办列表 */}
      {todos.length === 0 ? (
        <p style={styles.emptyText}>🎉 暂无待办事项，添加一个吧！</p>
      ) : (
        <ul style={styles.list}>
          {todos.map((todo) => (
            <li key={todo.id} style={styles.listItem}>
              <label style={styles.label}>
                <input
                  type="checkbox"
                  checked={todo.completed}
                  onChange={() => toggleTodo(todo.id)}
                  style={styles.checkbox}
                />
                <span
                  style={{
                    ...styles.todoText,
                    ...(todo.completed ? styles.completedText : {}),
                  }}
                >
                  {todo.text}
                </span>
              </label>
              <button
                onClick={() => deleteTodo(todo.id)}
                style={styles.deleteButton}
                title="删除"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// ───── 内联样式 ─────
const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: 500,
    margin: '40px auto',
    padding: 24,
    borderRadius: 12,
    boxShadow: '0 4px 24px rgba(0,0,0,0.1)',
    fontFamily: "'Segoe UI', sans-serif",
    backgroundColor: '#fff',
  },
  title: {
    textAlign: 'center',
    marginBottom: 20,
    fontSize: 28,
    color: '#333',
  },
  inputRow: {
    display: 'flex',
    gap: 8,
    marginBottom: 16,
  },
  input: {
    flex: 1,
    padding: '10px 14px',
    fontSize: 16,
    border: '2px solid #ddd',
    borderRadius: 8,
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  addButton: {
    padding: '10px 20px',
    fontSize: 16,
    fontWeight: 600,
    color: '#fff',
    backgroundColor: '#4f46e5',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  stats: {
    display: 'flex',
    justifyContent: 'space-around',
    marginBottom: 16,
    fontSize: 14,
    color: '#666',
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 16,
    padding: '32px 0',
  },
  list: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
  },
  listItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 12px',
    marginBottom: 8,
    borderRadius: 8,
    backgroundColor: '#f9fafb',
    transition: 'background-color 0.15s',
  },
  label: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    cursor: 'pointer',
  },
  checkbox: {
    width: 18,
    height: 18,
    cursor: 'pointer',
  },
  todoText: {
    fontSize: 16,
    color: '#333',
  },
  completedText: {
    textDecoration: 'line-through',
    color: '#aaa',
  },
  deleteButton: {
    background: 'none',
    border: 'none',
    fontSize: 18,
    color: '#ef4444',
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: 4,
    transition: 'background-color 0.15s',
  },
};

export default TodoList;
