import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from '../components/LoginForm';

describe('LoginForm', () => {
  const defaultProps = {
    onSubmit: vi.fn(),
    loading: false,
    error: null,
    onClearError: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the login form correctly', () => {
    render(<LoginForm {...defaultProps} />);

    expect(screen.getByText('Welcome Back')).toBeInTheDocument();
    expect(screen.getByText('Sign in to your account')).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('shows validation error for empty email', async () => {
    const user = userEvent.setup();
    render(<LoginForm {...defaultProps} />);

    const submitButton = screen.getByRole('button', { name: /sign in/i });
    await user.click(submitButton);

    expect(screen.getByText('Email is required')).toBeInTheDocument();
    expect(defaultProps.onSubmit).not.toHaveBeenCalled();
  });

  it('shows validation error for invalid email format', async () => {
    const user = userEvent.setup();
    render(<LoginForm {...defaultProps} />);

    const emailInput = screen.getByLabelText(/email address/i);
    await user.type(emailInput, 'invalid-email');

    const submitButton = screen.getByRole('button', { name: /sign in/i });
    await user.click(submitButton);

    expect(screen.getByText('Please enter a valid email')).toBeInTheDocument();
    expect(defaultProps.onSubmit).not.toHaveBeenCalled();
  });

  it('shows validation error for short password', async () => {
    const user = userEvent.setup();
    render(<LoginForm {...defaultProps} />);

    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/password/i);

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, '12345');

    const submitButton = screen.getByRole('button', { name: /sign in/i });
    await user.click(submitButton);

    expect(screen.getByText('Password must be at least 6 characters')).toBeInTheDocument();
    expect(defaultProps.onSubmit).not.toHaveBeenCalled();
  });

  it('shows validation error for empty password', async () => {
    const user = userEvent.setup();
    render(<LoginForm {...defaultProps} />);

    const emailInput = screen.getByLabelText(/email address/i);
    await user.type(emailInput, 'test@example.com');

    const submitButton = screen.getByRole('button', { name: /sign in/i });
    await user.click(submitButton);

    expect(screen.getByText('Password is required')).toBeInTheDocument();
    expect(defaultProps.onSubmit).not.toHaveBeenCalled();
  });

  it('calls onSubmit with valid credentials', async () => {
    const user = userEvent.setup();
    defaultProps.onSubmit.mockResolvedValue(undefined);

    render(<LoginForm {...defaultProps} />);

    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/password/i);

    await user.type(emailInput, 'user@example.com');
    await user.type(passwordInput, 'password123');

    const submitButton = screen.getByRole('button', { name: /sign in/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(defaultProps.onSubmit).toHaveBeenCalledWith('user@example.com', 'password123');
    });
  });

  it('displays error message when error prop is provided', () => {
    render(<LoginForm {...defaultProps} error="Invalid credentials" />);

    expect(screen.getByRole('alert')).toHaveTextContent('Invalid credentials');
  });

  it('shows loading state when loading prop is true', () => {
    render(<LoginForm {...defaultProps} loading={true} />);

    expect(screen.getByText('Signing in...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /signing in/i })).toBeDisabled();
  });

  it('disables inputs during loading', () => {
    render(<LoginForm {...defaultProps} loading={true} />);

    expect(screen.getByLabelText(/email address/i)).toBeDisabled();
    expect(screen.getByLabelText(/password/i)).toBeDisabled();
  });

  it('clears error when clearError is called on new submission', async () => {
    const user = userEvent.setup();
    render(<LoginForm {...defaultProps} error="Previous error" />);

    const emailInput = screen.getByLabelText(/email address/i);
    await user.type(emailInput, 'test@example.com');

    const submitButton = screen.getByRole('button', { name: /sign in/i });
    await user.click(submitButton);

    expect(defaultProps.onClearError).toHaveBeenCalled();
  });

  it('toggles password visibility', async () => {
    const user = userEvent.setup();
    render(<LoginForm {...defaultProps} />);

    const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement;
    expect(passwordInput.type).toBe('password');

    // Find the toggle button (eye icon)
    const toggleButton = passwordInput.parentElement?.querySelector('button[type="button"]');
    expect(toggleButton).toBeInTheDocument();

    if (toggleButton) {
      await user.click(toggleButton);
      expect(passwordInput.type).toBe('text');

      await user.click(toggleButton);
      expect(passwordInput.type).toBe('password');
    }
  });

  it('renders social login buttons', () => {
    render(<LoginForm {...defaultProps} />);

    expect(screen.getByText('Google')).toBeInTheDocument();
    expect(screen.getByText('GitHub')).toBeInTheDocument();
  });

  it('renders sign up link', () => {
    render(<LoginForm {...defaultProps} />);

    expect(screen.getByText('Sign up for free')).toBeInTheDocument();
  });

  it('renders remember me checkbox', () => {
    render(<LoginForm {...defaultProps} />);

    expect(screen.getByText('Remember me')).toBeInTheDocument();
  });

  it('renders forgot password link', () => {
    render(<LoginForm {...defaultProps} />);

    expect(screen.getByText('Forgot password?')).toBeInTheDocument();
  });
});
