import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RegistrationForm, { RegistrationResult } from './RegistrationForm';

const fillForm = async (
  overrides: Partial<{ username: string; email: string; password: string; confirmPassword: string; }> = {}
) => {
  const values = {
    username: 'johndoe', email: 'john@example.com',
    password: 'SecurePass1', confirmPassword: 'SecurePass1', ...overrides,
  };
  await userEvent.type(screen.getByLabelText(/username/i), values.username);
  await userEvent.type(screen.getByLabelText(/email address/i), values.email);
  await userEvent.type(screen.getByLabelText(/^password$/i), values.password);
  await userEvent.type(screen.getByLabelText(/confirm password/i), values.confirmPassword);
};

const submitForm = () => fireEvent.click(screen.getByRole('button', { name: /create account/i }));

const mockSuccess = jest.fn().mockResolvedValue({ success: true, message: 'Your account has been created successfully! You can now log in.' } as RegistrationResult);
const mockFailure = jest.fn().mockResolvedValue({ success: false, message: 'An account with this email already exists.' } as RegistrationResult);
const mockNetworkError = jest.fn().mockRejectedValue(new Error('Network Error'));

describe('RegistrationForm', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  describe('initial render', () => {
    it('renders all form fields and the submit button', () => {
      render(<RegistrationForm />);
      expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
    });
    it('renders no feedback banner initially', () => {
      render(<RegistrationForm />);
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  describe('client-side validation', () => {
    it('shows required field errors when submitting an empty form', async () => {
      render(<RegistrationForm onSubmit={mockSuccess} />);
      submitForm();
      expect(await screen.findByText(/username is required/i)).toBeInTheDocument();
      expect(screen.getByText(/email address is required/i)).toBeInTheDocument();
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
      expect(screen.getByText(/please confirm your password/i)).toBeInTheDocument();
      expect(mockSuccess).not.toHaveBeenCalled();
    });
    it('shows error when username is shorter than 3 characters', async () => {
      render(<RegistrationForm onSubmit={mockSuccess} />);
      await fillForm({ username: 'ab' }); submitForm();
      expect(await screen.findByText(/username must be at least 3 characters/i)).toBeInTheDocument();
      expect(mockSuccess).not.toHaveBeenCalled();
    });
    it('shows error for an invalid email format', async () => {
      render(<RegistrationForm onSubmit={mockSuccess} />);
      await fillForm({ email: 'not-an-email' }); submitForm();
      expect(await screen.findByText(/valid email address/i)).toBeInTheDocument();
      expect(mockSuccess).not.toHaveBeenCalled();
    });
    it('shows error when password is shorter than 8 characters', async () => {
      render(<RegistrationForm onSubmit={mockSuccess} />);
      await fillForm({ password: 'short', confirmPassword: 'short' }); submitForm();
      expect(await screen.findByText(/password must be at least 8 characters/i)).toBeInTheDocument();
      expect(mockSuccess).not.toHaveBeenCalled();
    });
    it('shows error when passwords do not match', async () => {
      render(<RegistrationForm onSubmit={mockSuccess} />);
      await fillForm({ password: 'SecurePass1', confirmPassword: 'DifferentPass1' }); submitForm();
      expect(await screen.findByText(/passwords do not match/i)).toBeInTheDocument();
      expect(mockSuccess).not.toHaveBeenCalled();
    });
    it('clears a field error when the user corrects the input', async () => {
      render(<RegistrationForm onSubmit={mockSuccess} />); submitForm();
      expect(await screen.findByText(/username is required/i)).toBeInTheDocument();
      await userEvent.type(screen.getByLabelText(/username/i), 'johndoe');
      await waitFor(() => { expect(screen.queryByText(/username is required/i)).not.toBeInTheDocument(); });
    });
  });

  describe('success feedback', () => {
    it('displays a success banner with the returned message after successful registration', async () => {
      render(<RegistrationForm onSubmit={mockSuccess} />);
      await fillForm(); submitForm();
      expect(await screen.findByText(/your account has been created successfully/i)).toBeInTheDocument();
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
    it('resets form fields to empty after successful registration', async () => {
      render(<RegistrationForm onSubmit={mockSuccess} />);
      await fillForm(); submitForm();
      await waitFor(() => {
        expect(screen.getByLabelText(/username/i)).toHaveValue('');
        expect(screen.getByLabelText(/email address/i)).toHaveValue('');
        expect(screen.getByLabelText(/^password$/i)).toHaveValue('');
        expect(screen.getByLabelText(/confirm password/i)).toHaveValue('');
      });
    });
    it('calls the onSubmit handler with the correct payload', async () => {
      render(<RegistrationForm onSubmit={mockSuccess} />);
      await fillForm(); submitForm();
      await waitFor(() => {
        expect(mockSuccess).toHaveBeenCalledWith({ username: 'johndoe', email: 'john@example.com', password: 'SecurePass1', confirmPassword: 'SecurePass1' });
      });
    });
  });

  describe('error feedback', () => {
    it('displays an error banner with the server error message on failure', async () => {
      render(<RegistrationForm onSubmit={mockFailure} />);
      await fillForm(); submitForm();
      expect(await screen.findByText(/an account with this email already exists/i)).toBeInTheDocument();
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
    it('does not clear form fields after a failed registration', async () => {
      render(<RegistrationForm onSubmit={mockFailure} />);
      await fillForm(); submitForm();
      await waitFor(() => { expect(screen.getByText(/an account with this email already exists/i)).toBeInTheDocument(); });
      expect(screen.getByLabelText(/username/i)).toHaveValue('johndoe');
      expect(screen.getByLabelText(/email address/i)).toHaveValue('john@example.com');
    });
    it('shows a generic error banner when the onSubmit handler throws', async () => {
      render(<RegistrationForm onSubmit={mockNetworkError} />);
      await fillForm(); submitForm();
      expect(await screen.findByText(/unexpected error occurred/i)).toBeInTheDocument();
    });
  });

  describe('loading / submitting state', () => {
    it('disables the submit button and shows a loading label while submitting', async () => {
      let resolve!: (v: RegistrationResult) => void;
      const pending = new Promise<RegistrationResult>((res) => { resolve = res; });
      const slowSubmit = jest.fn().mockReturnValue(pending);
      render(<RegistrationForm onSubmit={slowSubmit} />);
      await fillForm(); submitForm();
      expect(screen.getByRole('button', { name: /creating account/i })).toBeDisabled();
      resolve({ success: true, message: 'Done' });
      await waitFor(() => expect(screen.getByRole('button', { name: /create account/i })).not.toBeDisabled());
    });
    it('re-enables the submit button after a failed submission', async () => {
      render(<RegistrationForm onSubmit={mockFailure} />);
      await fillForm(); submitForm();
      await waitFor(() => { expect(screen.getByRole('button', { name: /create account/i })).not.toBeDisabled(); });
    });
  });

  describe('accessibility', () => {
    it('marks invalid fields with aria-invalid', async () => {
      render(<RegistrationForm onSubmit={mockSuccess} />); submitForm();
      await waitFor(() => {
        expect(screen.getByLabelText(/username/i)).toHaveAttribute('aria-invalid', 'true');
        expect(screen.getByLabelText(/email address/i)).toHaveAttribute('aria-invalid', 'true');
      });
    });
    it('feedback banner has role="alert" for screen readers', async () => {
      render(<RegistrationForm onSubmit={mockSuccess} />);
      await fillForm(); submitForm();
      expect(await screen.findByRole('alert')).toBeInTheDocument();
    });
  });
});
