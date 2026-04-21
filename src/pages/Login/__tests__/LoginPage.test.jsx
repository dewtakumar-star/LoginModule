import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import LoginPage from '../LoginPage';
import * as authService from '../../../services/authService';

const DashboardStub = () => <div>Dashboard Page</div>;

const renderLoginPage = () =>
  render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<DashboardStub />} />
      </Routes>
    </MemoryRouter>
  );

jest.mock('../../../services/authService');

beforeEach(() => { jest.clearAllMocks(); });

describe('LoginPage – KAN-66', () => {
  it('renders the login form with all required fields', () => {
    renderLoginPage();
    expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('disables the submit button when fields are empty', () => {
    renderLoginPage();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeDisabled();
  });

  it('enables the submit button once both fields are filled', async () => {
    renderLoginPage();
    await userEvent.type(screen.getByLabelText(/email address/i), 'user@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'password123');
    expect(screen.getByRole('button', { name: /sign in/i })).toBeEnabled();
  });

  it('redirects to /dashboard after a successful login', async () => {
    authService.loginUser.mockResolvedValueOnce({ token: 'fake-jwt-token', user: { id: 1 } });
    renderLoginPage();
    await userEvent.type(screen.getByLabelText(/email address/i), 'jane@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'securePass!');
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => expect(screen.getByText('Dashboard Page')).toBeInTheDocument());
  });

  it('calls loginUser with correct credentials', async () => {
    authService.loginUser.mockResolvedValueOnce({ token: 'fake-jwt-token', user: { id: 1 } });
    renderLoginPage();
    await userEvent.type(screen.getByLabelText(/email address/i), 'jane@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'securePass!');
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => expect(authService.loginUser).toHaveBeenCalledWith('jane@example.com', 'securePass!'));
  });

  it('shows loading state while request is in-flight', async () => {
    authService.loginUser.mockReturnValueOnce(new Promise(() => {}));
    renderLoginPage();
    await userEvent.type(screen.getByLabelText(/email address/i), 'jane@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'securePass!');
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => expect(screen.getByRole('button', { name: /signing in/i })).toBeDisabled());
  });

  it('displays an error message when loginUser rejects', async () => {
    authService.loginUser.mockRejectedValueOnce(new Error('Invalid email or password. Please try again.'));
    renderLoginPage();
    await userEvent.type(screen.getByLabelText(/email address/i), 'wrong@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'wrongPass');
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument());
  });

  it('does NOT redirect when login fails', async () => {
    authService.loginUser.mockRejectedValueOnce(new Error('Unauthorized'));
    renderLoginPage();
    await userEvent.type(screen.getByLabelText(/email address/i), 'bad@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'badPass');
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => expect(screen.queryByText('Dashboard Page')).not.toBeInTheDocument());
  });

  it('re-enables button after a failed login', async () => {
    authService.loginUser.mockRejectedValueOnce(new Error('Unauthorized'));
    renderLoginPage();
    await userEvent.type(screen.getByLabelText(/email address/i), 'bad@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'badPass');
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => expect(screen.getByRole('button', { name: /sign in/i })).toBeEnabled());
  });

  describe('authService.loginUser (unit)', () => {
    const { loginUser } = jest.requireActual('../../../services/authService');
    beforeEach(() => { global.fetch = jest.fn(); localStorage.clear(); });

    it('throws when email is missing', async () => {
      await expect(loginUser('', 'password')).rejects.toThrow('Email and password are required.');
    });

    it('throws when password is missing', async () => {
      await expect(loginUser('user@example.com', '')).rejects.toThrow('Email and password are required.');
    });

    it('stores token and user in localStorage on success', async () => {
      global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ token: 'test-token', user: { id: 42, name: 'Test User' } }) });
      await loginUser('user@example.com', 'password');
      expect(localStorage.getItem('auth_token')).toBe('test-token');
      expect(JSON.parse(localStorage.getItem('auth_user'))).toEqual({ id: 42, name: 'Test User' });
    });

    it('throws with server error message on non-ok response', async () => {
      global.fetch.mockResolvedValueOnce({ ok: false, json: async () => ({ message: 'Account locked.' }) });
      await expect(loginUser('user@example.com', 'wrong')).rejects.toThrow('Account locked.');
    });
  });
});
