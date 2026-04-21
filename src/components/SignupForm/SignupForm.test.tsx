import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SignupForm, {
  validateUsername,
  validateEmail,
  validatePassword,
  validateConfirmPassword,
} from './SignupForm';

describe('validateUsername', () => {
  it('returns error when empty', () => { expect(validateUsername('')).toBe('Username is required.'); });
  it('returns error when shorter than 3 characters', () => { expect(validateUsername('ab')).toBe('Username must be at least 3 characters.'); });
  it('returns error when longer than 20 characters', () => { expect(validateUsername('a'.repeat(21))).toBe('Username must be 20 characters or fewer.'); });
  it('returns error for invalid characters', () => { expect(validateUsername('user name!')).toBe('Username may only contain letters, numbers, and underscores.'); });
  it('returns undefined for a valid username', () => { expect(validateUsername('valid_User123')).toBeUndefined(); });
});

describe('validateEmail', () => {
  it('returns error when empty', () => { expect(validateEmail('')).toBe('Email is required.'); });
  it('returns error for invalid email format', () => { expect(validateEmail('not-an-email')).toBe('Please enter a valid email address.'); });
  it('returns error when missing domain', () => { expect(validateEmail('user@')).toBe('Please enter a valid email address.'); });
  it('returns undefined for a valid email', () => { expect(validateEmail('user@example.com')).toBeUndefined(); });
});

describe('validatePassword', () => {
  it('returns error when empty', () => { expect(validatePassword('')).toBe('Password is required.'); });
  it('returns error when shorter than 8 characters', () => { expect(validatePassword('Abc1!')).toBe('Password must be at least 8 characters.'); });
  it('returns error when no uppercase letter', () => { expect(validatePassword('abcdefg1!')).toBe('Password must contain at least one uppercase letter.'); });
  it('returns error when no lowercase letter', () => { expect(validatePassword('ABCDEFG1!')).toBe('Password must contain at least one lowercase letter.'); });
  it('returns error when no number', () => { expect(validatePassword('Abcdefgh!')).toBe('Password must contain at least one number.'); });
  it('returns error when no special character', () => { expect(validatePassword('Abcdefg1')).toBe('Password must contain at least one special character.'); });
  it('returns undefined for a valid password', () => { expect(validatePassword('Abcdefg1!')).toBeUndefined(); });
});

describe('validateConfirmPassword', () => {
  it('returns error when empty', () => { expect(validateConfirmPassword('', 'Password1!')).toBe('Please confirm your password.'); });
  it('returns error when passwords do not match', () => { expect(validateConfirmPassword('Different1!', 'Password1!')).toBe('Passwords do not match.'); });
  it('returns undefined when passwords match', () => { expect(validateConfirmPassword('Password1!', 'Password1!')).toBeUndefined(); });
});

describe('SignupForm component', () => {
  const user = userEvent.setup();
  const fillField = async (label: RegExp | string, value: string) => {
    const input = screen.getByLabelText(label);
    await user.clear(input);
    await user.type(input, value);
  };
  const blurField = (label: RegExp | string) => { fireEvent.blur(screen.getByLabelText(label)); };

  beforeEach(() => { render(<SignupForm />); });

  it('renders all form fields and the submit button', () => {
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password \*/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  });

  it('does NOT show errors before the user interacts with the form', () => {
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows username error after blurring an empty username field', async () => {
    blurField(/username/i);
    expect(await screen.findByText('Username is required.')).toBeInTheDocument();
  });

  it('shows email error after blurring with invalid value', async () => {
    await fillField(/^email/i, 'bad-email');
    blurField(/^email/i);
    expect(await screen.findByText('Please enter a valid email address.')).toBeInTheDocument();
  });

  it('clears username error and shows success feedback when valid value is entered', async () => {
    blurField(/username/i);
    await screen.findByText('Username is required.');
    await fillField(/username/i, 'john_doe');
    await waitFor(() => expect(screen.queryByText('Username is required.')).not.toBeInTheDocument());
    expect(await screen.findByText(/looks good/i)).toBeInTheDocument();
  });

  it('shows password strength errors in real-time as user types', async () => {
    const input = screen.getByLabelText(/^password \*/i);
    await user.type(input, 'abc');
    fireEvent.blur(input);
    expect(await screen.findByText('Password must be at least 8 characters.')).toBeInTheDocument();
    await user.clear(input);
    await user.type(input, 'abcdefgh');
    expect(await screen.findByText('Password must contain at least one uppercase letter.')).toBeInTheDocument();
  });

  it('shows confirm-password mismatch error', async () => {
    await fillField(/^password \*/i, 'Abcdefg1!');
    await fillField(/confirm password/i, 'DifferentPass1!');
    blurField(/confirm password/i);
    expect(await screen.findByText('Passwords do not match.')).toBeInTheDocument();
  });

  it('clears confirm-password error when passwords match', async () => {
    await fillField(/^password \*/i, 'Abcdefg1!');
    await fillField(/confirm password/i, 'WrongPass1!');
    blurField(/confirm password/i);
    await screen.findByText('Passwords do not match.');
    await fillField(/confirm password/i, 'Abcdefg1!');
    await waitFor(() => expect(screen.queryByText('Passwords do not match.')).not.toBeInTheDocument());
    expect(await screen.findByText(/passwords match/i)).toBeInTheDocument();
  });

  it('shows ALL validation errors when submitting an empty form', async () => {
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));
    expect(await screen.findByText('Username is required.')).toBeInTheDocument();
    expect(await screen.findByText('Email is required.')).toBeInTheDocument();
    expect(await screen.findByText('Password is required.')).toBeInTheDocument();
    expect(await screen.findByText('Please confirm your password.')).toBeInTheDocument();
  });

  it('submits successfully and shows success banner when all fields are valid', async () => {
    await fillField(/username/i, 'john_doe');
    await fillField(/^email/i, 'john@example.com');
    await fillField(/^password \*/i, 'Abcdefg1!');
    await fillField(/confirm password/i, 'Abcdefg1!');
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));
    expect(await screen.findByText(/account created successfully/i)).toBeInTheDocument();
    expect(screen.getByText(/welcome/i)).toBeInTheDocument();
  });

  it('sets aria-invalid on a field that has an error after blur', async () => {
    blurField(/username/i);
    await screen.findByText('Username is required.');
    expect(screen.getByLabelText(/username/i)).toHaveAttribute('aria-invalid', 'true');
  });

  it('removes aria-invalid once the field becomes valid', async () => {
    blurField(/username/i);
    await screen.findByText('Username is required.');
    await fillField(/username/i, 'valid_user');
    await waitFor(() => expect(screen.getByLabelText(/username/i)).toHaveAttribute('aria-invalid', 'false'));
  });
});
