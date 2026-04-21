import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { LoginForm, classifyApiError, API_ERROR_MESSAGES } from './LoginForm';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

beforeAll(() => {
  mockedAxios.isAxiosError.mockImplementation(
    (payload): payload is ReturnType<typeof axios.isAxiosError> =>
      !!(payload && (payload as any).isAxiosError)
  );
});

const makeAxiosError = (status?: number, data?: object, noResponse = false) => {
  const error: any = new Error('Request failed');
  error.isAxiosError = true;
  if (noResponse) {
    error.response = undefined;
  } else {
    error.response = { status, data };
  }
  return error;
};

const fillAndSubmit = async (email = 'user@example.com', password = 'password123') => {
  await userEvent.type(screen.getByLabelText(/email address/i), email);
  await userEvent.type(screen.getByLabelText(/password/i), password);
  fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
};

describe('classifyApiError()', () => {
  test('returns network_error when there is no response', () => {
    const error = makeAxiosError(undefined, undefined, true);
    const result = classifyApiError(error);
    expect(result.type).toBe('network_error');
    expect(result.message).toBe(API_ERROR_MESSAGES.network_error);
  });

  test('returns invalid_credentials for HTTP 401', () => {
    const result = classifyApiError(makeAxiosError(401));
    expect(result.type).toBe('invalid_credentials');
    expect(result.message).toBe(API_ERROR_MESSAGES.invalid_credentials);
  });

  test('returns invalid_credentials for HTTP 403', () => {
    const result = classifyApiError(makeAxiosError(403));
    expect(result.type).toBe('invalid_credentials');
    expect(result.message).toBe(API_ERROR_MESSAGES.invalid_credentials);
  });

  test('returns server_error for HTTP 500', () => {
    const result = classifyApiError(makeAxiosError(500));
    expect(result.type).toBe('server_error');
    expect(result.message).toBe(API_ERROR_MESSAGES.server_error);
  });

  test('returns server_error for HTTP 503', () => {
    const result = classifyApiError(makeAxiosError(503));
    expect(result.type).toBe('server_error');
    expect(result.message).toBe(API_ERROR_MESSAGES.server_error);
  });

  test('returns unknown_error with server message for other 4xx', () => {
    const result = classifyApiError(makeAxiosError(422, { message: 'Validation failed' }));
    expect(result.type).toBe('unknown_error');
    expect(result.message).toBe('Validation failed');
  });

  test('falls back to generic unknown_error message when no server message', () => {
    const result = classifyApiError(makeAxiosError(422, {}));
    expect(result.type).toBe('unknown_error');
    expect(result.message).toBe(API_ERROR_MESSAGES.unknown_error);
  });

  test('returns unknown_error for non-Axios errors', () => {
    const result = classifyApiError(new Error('something random'));
    expect(result.type).toBe('unknown_error');
    expect(result.message).toBe(API_ERROR_MESSAGES.unknown_error);
  });
});

describe('<LoginForm />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders email input, password input and submit button', () => {
    render(<LoginForm />);
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  test('does not show an error banner on initial render', () => {
    render(<LoginForm />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  test('shows required validation errors when submitting empty form', async () => {
    render(<LoginForm />);
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByText(/email is required/i)).toBeInTheDocument();
    expect(await screen.findByText(/password is required/i)).toBeInTheDocument();
  });

  test('shows invalid email validation error', async () => {
    render(<LoginForm />);
    await userEvent.type(screen.getByLabelText(/email address/i), 'not-an-email');
    await userEvent.type(screen.getByLabelText(/password/i), 'password123');
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByText(/valid email address/i)).toBeInTheDocument();
  });

  test('shows short password validation error', async () => {
    render(<LoginForm />);
    await userEvent.type(screen.getByLabelText(/email address/i), 'user@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), '123');
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByText(/at least 6 characters/i)).toBeInTheDocument();
  });

  test('displays invalid credentials banner on 401 response', async () => {
    mockedAxios.post.mockRejectedValueOnce(makeAxiosError(401));
    render(<LoginForm />);
    await fillAndSubmit();
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveAttribute('data-error-type', 'invalid_credentials');
    expect(alert).toHaveTextContent(API_ERROR_MESSAGES.invalid_credentials);
  });

  test('displays invalid credentials banner on 403 response', async () => {
    mockedAxios.post.mockRejectedValueOnce(makeAxiosError(403));
    render(<LoginForm />);
    await fillAndSubmit();
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveAttribute('data-error-type', 'invalid_credentials');
  });

  test('displays server error banner on 500 response', async () => {
    mockedAxios.post.mockRejectedValueOnce(makeAxiosError(500));
    render(<LoginForm />);
    await fillAndSubmit();
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveAttribute('data-error-type', 'server_error');
    expect(alert).toHaveTextContent(API_ERROR_MESSAGES.server_error);
  });

  test('displays network error banner when request has no response', async () => {
    mockedAxios.post.mockRejectedValueOnce(makeAxiosError(undefined, undefined, true));
    render(<LoginForm />);
    await fillAndSubmit();
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveAttribute('data-error-type', 'network_error');
    expect(alert).toHaveTextContent(API_ERROR_MESSAGES.network_error);
  });

  test('displays unknown error banner for unexpected errors', async () => {
    mockedAxios.post.mockRejectedValueOnce(new Error('Unexpected failure'));
    render(<LoginForm />);
    await fillAndSubmit();
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveAttribute('data-error-type', 'unknown_error');
    expect(alert).toHaveTextContent(API_ERROR_MESSAGES.unknown_error);
  });

  test('clears previous error banner when a new submission starts', async () => {
    mockedAxios.post
      .mockRejectedValueOnce(makeAxiosError(401))
      .mockResolvedValueOnce({ data: { token: 'abc' } });
    render(<LoginForm />);
    await fillAndSubmit();
    await screen.findByRole('alert');
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => {
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  test('error banner has role=alert and aria-live=assertive', async () => {
    mockedAxios.post.mockRejectedValueOnce(makeAxiosError(500));
    render(<LoginForm />);
    await fillAndSubmit();
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveAttribute('aria-live', 'assertive');
  });

  test('submit button shows loading state and is disabled while submitting', async () => {
    let resolveRequest: (v: unknown) => void;
    mockedAxios.post.mockReturnValueOnce(
      new Promise((res) => { resolveRequest = res; })
    );
    render(<LoginForm />);
    await fillAndSubmit();
    const button = screen.getByRole('button', { name: /signing in/i });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    resolveRequest!({ data: {} });
  });

  test('calls onSuccess with response data on successful login', async () => {
    const onSuccess = jest.fn();
    mockedAxios.post.mockResolvedValueOnce({ data: { token: 'tok_xyz' } });
    render(<LoginForm onSuccess={onSuccess} />);
    await fillAndSubmit();
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith({ token: 'tok_xyz' });
    });
  });
});
