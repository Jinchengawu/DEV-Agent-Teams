import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Dashboard } from '../components/Dashboard';
import { User } from '../../../shared/types';

const mockUser: User = {
  id: '1',
  email: 'user@example.com',
  name: 'John Doe',
};

describe('Dashboard', () => {
  it('renders welcome message', () => {
    render(<Dashboard user={mockUser} onLogout={vi.fn()} />);

    expect(screen.getByText('Welcome!')).toBeInTheDocument();
    expect(screen.getByText("You're successfully logged in")).toBeInTheDocument();
  });

  it('displays user name and email', () => {
    render(<Dashboard user={mockUser} onLogout={vi.fn()} />);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('user@example.com')).toBeInTheDocument();
  });

  it('displays user initial in avatar', () => {
    render(<Dashboard user={mockUser} onLogout={vi.fn()} />);

    expect(screen.getByText('J')).toBeInTheDocument();
  });

  it('calls onLogout when sign out button is clicked', async () => {
    const user = userEvent.setup();
    const onLogout = vi.fn();

    render(<Dashboard user={mockUser} onLogout={onLogout} />);

    const signOutButton = screen.getByRole('button', { name: /sign out/i });
    await user.click(signOutButton);

    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it('displays session info', () => {
    render(<Dashboard user={mockUser} onLogout={vi.fn()} />);

    expect(screen.getByText('Verified')).toBeInTheDocument();
    expect(screen.getByText('24h')).toBeInTheDocument();
    expect(screen.getByText('Session')).toBeInTheDocument();
  });
});
