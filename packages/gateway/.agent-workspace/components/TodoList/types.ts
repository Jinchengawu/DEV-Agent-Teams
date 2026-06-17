export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: Date;
}

export interface TodoListProps {
  initialTodos?: Todo[];
  onTodosChange?: (todos: Todo[]) => void;
}