import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginForm from './LoginForm';

const setup = (onSubmit = jest.fn()) => {
  render(<LoginForm onSubmit={onSubmit} />);
  return {
    emailInput: screen.getByLabelText(/email address/i),
    passwordInput: screen.getByLabelText(/password/i),
    submitButton: screen.getByRole('button', { name: /sign in/i }),
    onSubmit,
  };
};

describe('Email field validation', () => {
  it('shows "Email is required" error after blurring an empty email field', async () => {
    const { emailInput } = setup();
    fireEvent.blur(emailInput);
    expect(await screen.findByTestId('email-error')).toHaveTextContent('Email is required.');
  });

  it('shows "valid email" error for a malformed email after blur', async () => {
    const { emailInput } = setup();
    await userEvent.type(emailInput, 'not-an-email');
    fireEvent.blur(emailInput);
    expect(await screen.findByTestId('email-error')).toHaveTextContent('Please enter a valid email address.');
  });

  it('clears the email error once a valid email is typed', async () => {
    const { emailInput } = setup();
    fireEvent.blur(emailInput);
    expect(await screen.findByTestId('email-error')).toBeInTheDocument();
    await userEvent.type(emailInput, 'user@example.com');
    expect(screen.queryByTestId('email-error')).not.toBeInTheDocument();
  });

  it('does NOT show an email error before the field is blurred', async () => {
    const { emailInput } = setup();
    await userEvent.type(emailInput, 'bad');
    expect(screen.queryByTestId('email-error')).not.toBeInTheDocument();
  });
});

describe('Password field validation', () => {
  it('shows "Password is required" error after blurring an empty password field', async () => {
    const { passwordInput } = setup();
    fireEvent.blur(passwordInput);
    expect(await screen.findByTestId('password-error')).toHaveTextContent('Password is required.');
  });

  it('shows a minimum-length error for a short password', async () => {
    const { passwordInput } = setup();
    await userEvent.type(passwordInput, 'short');
    fireEvent.blur(passwordInput);
    expect(await screen.findByTestId('password-error')).toHaveTextContent('Password must be at least 8 characters.');
  });

  it('clears the password error once a valid password is typed', async () => {
    const { passwordInput } = setup();
    fireEvent.blur(passwordInput);
    expect(await screen.findByTestId('password-error')).toBeInTheDocument();
    await userEvent.type(passwordInput, 'longEnoughPassword1!');
    expect(screen.queryByTestId('password-error')).not.toBeInTheDocument();
  });

  it('does NOT show a password error before the field is blurred', async () => {
    const { passwordInput } = setup();
    await userEvent.type(passwordInput, 'short');
    expect(screen.queryByTestId('password-error')).not.toBeInTheDocument();
  });
});

describe('Form submission', () => {
  it('reveals all errors and does NOT call onSubmit when submitted empty', async () => {
    const { submitButton, onSubmit } = setup();
    fireEvent.click(submitButton);
    expect(await screen.findByTestId('email-error')).toBeInTheDocument();
    expect(await screen.findByTestId('password-error')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('calls onSubmit with correct credentials when the form is valid', async () => {
    const { emailInput, passwordInput, submitButton, onSubmit } = setup();
    await userEvent.type(emailInput, 'user@example.com');
    await userEvent.type(passwordInput, 'SecurePass1!');
    fireEvent.click(submitButton);
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith('user@example.com', 'SecurePass1!'));
  });

  it('shows a success message after a successful submission', async () => {
    const { emailInput, passwordInput, submitButton } = setup(jest.fn().mockResolvedValue(undefined));
    await userEvent.type(emailInput, 'user@example.com');
    await userEvent.type(passwordInput, 'SecurePass1!');
    fireEvent.click(submitButton);
    expect(await screen.findByText(/login successful/i)).toBeInTheDocument();
  });

  it('disables the submit button while submitting', async () => {
    let resolveSubmit!: () => void;
    const slowOnSubmit = jest.fn(() => new Promise<void>((res) => { resolveSubmit = res; }));
    const { emailInput, passwordInput, submitButton } = setup(slowOnSubmit);
    await userEvent.type(emailInput, 'user@example.com');
    await userEvent.type(passwordInput, 'SecurePass1!');
    fireEvent.click(submitButton);
    expect(submitButton).toBeDisabled();
    resolveSubmit();
    await waitFor(() => expect(submitButton).not.toBeDisabled());
  });
});

describe('Accessibility', () => {
  it('marks the email input as aria-invalid when there is an error', async () => {
    const { emailInput } = setup();
    fireEvent.blur(emailInput);
    await screen.findByTestId('email-error');
    expect(emailInput).toHaveAttribute('aria-invalid', 'true');
  });

  it('marks the password input as aria-invalid when there is an error', async () => {
    const { passwordInput } = setup();
    fireEvent.blur(passwordInput);
    await screen.findByTestId('password-error');
    expect(passwordInput).toHaveAttribute('aria-invalid', 'true');
  });

  it('error messages are associated with their inputs via aria-describedby', async () => {
    const { emailInput } = setup();
    fireEvent.blur(emailInput);
    await screen.findByTestId('email-error');
    expect(emailInput).toHaveAttribute('aria-describedby', 'email-error');
  });

  it('renders the form with an accessible label', () => {
    setup();
    expect(screen.getByRole('form', { name: /login form/i })).toBeInTheDocument();
  });
});
