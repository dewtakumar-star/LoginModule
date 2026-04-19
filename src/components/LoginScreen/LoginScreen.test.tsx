import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginScreen from './LoginScreen';

const renderLoginScreen = (onLogin = jest.fn()) =>
  render(<LoginScreen onLogin={onLogin} />);

describe('LoginScreen', () => {
  describe('Rendering', () => {
    it('renders the welcome heading', () => {
      renderLoginScreen();
      expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
    });

    it('renders an email input field', () => {
      renderLoginScreen();
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    });

    it('renders a password input field', () => {
      renderLoginScreen();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    });

    it('renders the sign-in submit button', () => {
      renderLoginScreen();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    it('renders the forgot password link', () => {
      renderLoginScreen();
      expect(screen.getByRole('link', { name: /forgot your password/i })).toBeInTheDocument();
    });

    it('email input has correct type attribute', () => {
      renderLoginScreen();
      expect(screen.getByLabelText(/email address/i)).toHaveAttribute('type', 'email');
    });

    it('password input has correct type attribute', () => {
      renderLoginScreen();
      expect(screen.getByLabelText(/password/i)).toHaveAttribute('type', 'password');
    });
  });

  describe('Validation', () => {
    it('shows an error when submitting with empty fields', async () => {
      renderLoginScreen();
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
      expect(await screen.findByRole('alert')).toHaveTextContent(/email is required/i);
    });

    it('shows an error for an invalid email format', async () => {
      renderLoginScreen();
      await userEvent.type(screen.getByLabelText(/email address/i), 'not-an-email');
      await userEvent.type(screen.getByLabelText(/password/i), 'secret123');
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
      expect(await screen.findByRole('alert')).toHaveTextContent(/valid email/i);
    });

    it('shows an error when password is missing', async () => {
      renderLoginScreen();
      await userEvent.type(screen.getByLabelText(/email address/i), 'user@example.com');
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
      expect(await screen.findByRole('alert')).toHaveTextContent(/password is required/i);
    });

    it('shows an error when password is too short', async () => {
      renderLoginScreen();
      await userEvent.type(screen.getByLabelText(/email address/i), 'user@example.com');
      await userEvent.type(screen.getByLabelText(/password/i), '123');
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
      expect(await screen.findByRole('alert')).toHaveTextContent(/at least 6 characters/i);
    });

    it('does not call onLogin when validation fails', async () => {
      const onLogin = jest.fn();
      renderLoginScreen(onLogin);
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
      await screen.findByRole('alert');
      expect(onLogin).not.toHaveBeenCalled();
    });
  });

  describe('Successful submission', () => {
    it('calls onLogin with email and password when form is valid', async () => {
      const onLogin = jest.fn().mockResolvedValue(undefined);
      renderLoginScreen(onLogin);
      await userEvent.type(screen.getByLabelText(/email address/i), 'user@example.com');
      await userEvent.type(screen.getByLabelText(/password/i), 'password123');
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
      await waitFor(() =>
        expect(onLogin).toHaveBeenCalledWith({
          email: 'user@example.com',
          password: 'password123',
        })
      );
    });

    it('shows loading state while submitting', async () => {
      const onLogin = jest.fn(() => new Promise<void>((resolve) => setTimeout(resolve, 200)));
      renderLoginScreen(onLogin);
      await userEvent.type(screen.getByLabelText(/email address/i), 'user@example.com');
      await userEvent.type(screen.getByLabelText(/password/i), 'password123');
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
      expect(await screen.findByRole('button', { name: /signing in/i })).toBeDisabled();
    });

    it('disables inputs while submitting', async () => {
      const onLogin = jest.fn(() => new Promise<void>((resolve) => setTimeout(resolve, 200)));
      renderLoginScreen(onLogin);
      await userEvent.type(screen.getByLabelText(/email address/i), 'user@example.com');
      await userEvent.type(screen.getByLabelText(/password/i), 'password123');
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
      await waitFor(() => {
        expect(screen.getByLabelText(/email address/i)).toBeDisabled();
        expect(screen.getByLabelText(/password/i)).toBeDisabled();
      });
    });
  });

  describe('Error handling', () => {
    it('displays an error message when onLogin rejects', async () => {
      const onLogin = jest.fn().mockRejectedValue(new Error('Invalid credentials'));
      renderLoginScreen(onLogin);
      await userEvent.type(screen.getByLabelText(/email address/i), 'user@example.com');
      await userEvent.type(screen.getByLabelText(/password/i), 'password123');
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
      expect(await screen.findByRole('alert')).toHaveTextContent(/invalid credentials/i);
    });

    it('re-enables the submit button after a failed login', async () => {
      const onLogin = jest.fn().mockRejectedValue(new Error('Server error'));
      renderLoginScreen(onLogin);
      await userEvent.type(screen.getByLabelText(/email address/i), 'user@example.com');
      await userEvent.type(screen.getByLabelText(/password/i), 'password123');
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
      expect(await screen.findByRole('button', { name: /sign in/i })).not.toBeDisabled();
    });
  });
});
