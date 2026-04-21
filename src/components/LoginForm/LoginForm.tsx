import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import axios, { AxiosError } from 'axios';

interface LoginFormInputs {
  email: string;
  password: string;
}

interface ApiErrorResponse {
  message?: string;
  code?: string;
}

export type LoginErrorType = 'invalid_credentials' | 'server_error' | 'network_error' | 'unknown_error';

export interface LoginError {
  type: LoginErrorType;
  message: string;
}

export const API_ERROR_MESSAGES: Record<LoginErrorType, string> = {
  invalid_credentials: 'Incorrect email or password. Please try again.',
  server_error: 'Our servers are experiencing issues. Please try again later.',
  network_error: 'Unable to connect. Please check your internet connection and try again.',
  unknown_error: 'An unexpected error occurred. Please try again.',
};

export function classifyApiError(error: unknown): LoginError {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiErrorResponse>;

    if (!axiosError.response) {
      return {
        type: 'network_error',
        message: API_ERROR_MESSAGES.network_error,
      };
    }

    const status = axiosError.response.status;

    if (status === 401 || status === 403) {
      return {
        type: 'invalid_credentials',
        message: API_ERROR_MESSAGES.invalid_credentials,
      };
    }

    if (status >= 500) {
      return {
        type: 'server_error',
        message: API_ERROR_MESSAGES.server_error,
      };
    }

    const serverMessage = axiosError.response.data?.message;
    return {
      type: 'unknown_error',
      message: serverMessage || API_ERROR_MESSAGES.unknown_error,
    };
  }

  return {
    type: 'unknown_error',
    message: API_ERROR_MESSAGES.unknown_error,
  };
}

interface LoginFormProps {
  onSuccess?: (data: unknown) => void;
  apiBaseUrl?: string;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  onSuccess,
  apiBaseUrl = '/api',
}) => {
  const [loginError, setLoginError] = useState<LoginError | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormInputs>();

  const onSubmit = async (data: LoginFormInputs) => {
    setIsSubmitting(true);
    setLoginError(null);

    try {
      const response = await axios.post(`${apiBaseUrl}/auth/login`, {
        email: data.email,
        password: data.password,
      });

      onSuccess?.(response.data);
    } catch (error) {
      const classified = classifyApiError(error);
      setLoginError(classified);
    } finally {
      setIsSubmitting(false);
    }
  };

  const errorIconMap: Record<LoginErrorType, string> = {
    invalid_credentials: '🔑',
    server_error: '🛠️',
    network_error: '📡',
    unknown_error: '⚠️',
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-md p-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">Sign In</h1>

        {loginError && (
          <div
            role="alert"
            aria-live="assertive"
            data-error-type={loginError.type}
            className={`flex items-start gap-3 rounded-lg border p-4 mb-6 text-sm ${
              loginError.type === 'invalid_credentials'
                ? 'bg-yellow-50 border-yellow-300 text-yellow-800'
                : loginError.type === 'network_error'
                ? 'bg-blue-50 border-blue-300 text-blue-800'
                : 'bg-red-50 border-red-300 text-red-800'
            }`}
          >
            <span className="text-lg leading-none" aria-hidden="true">
              {errorIconMap[loginError.type]}
            </span>
            <div>
              <p className="font-semibold capitalize">
                {loginError.type === 'invalid_credentials'
                  ? 'Invalid Credentials'
                  : loginError.type === 'server_error'
                  ? 'Server Error'
                  : loginError.type === 'network_error'
                  ? 'Connection Error'
                  : 'Error'}
              </p>
              <p>{loginError.message}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              aria-describedby={errors.email ? 'email-error' : undefined}
              aria-invalid={!!errors.email}
              className={`w-full rounded-lg border px-4 py-2 text-sm focus:outline-none focus:ring-2 ${
                errors.email ? 'border-red-400 focus:ring-red-300' : 'border-gray-300 focus:ring-indigo-400'
              }`}
              {...register('email', {
                required: 'Email is required.',
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: 'Please enter a valid email address.',
                },
              })}
            />
            {errors.email && (
              <p id="email-error" role="alert" className="mt-1 text-xs text-red-600">
                {errors.email.message}
              </p>
            )}
          </div>

          <div className="mb-6">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              aria-describedby={errors.password ? 'password-error' : undefined}
              aria-invalid={!!errors.password}
              className={`w-full rounded-lg border px-4 py-2 text-sm focus:outline-none focus:ring-2 ${
                errors.password ? 'border-red-400 focus:ring-red-300' : 'border-gray-300 focus:ring-indigo-400'
              }`}
              {...register('password', {
                required: 'Password is required.',
                minLength: { value: 6, message: 'Password must be at least 6 characters.' },
              })}
            />
            {errors.password && (
              <p id="password-error" role="alert" className="mt-1 text-xs text-red-600">
                {errors.password.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
            className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginForm;
