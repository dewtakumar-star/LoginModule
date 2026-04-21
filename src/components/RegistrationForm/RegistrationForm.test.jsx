import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RegistrationForm from './RegistrationForm';

const validFormData = { firstName: 'Jane', lastName: 'Doe', email: 'jane.doe@example.com', phone: '1234567890', dateOfBirth: '1990-06-15', password: 'SecurePass1', confirmPassword: 'SecurePass1' };

const fillForm = async (overrides = {}) => {
  const data = { ...validFormData, ...overrides };
  await userEvent.type(screen.getByLabelText(/first name/i), data.firstName);
  await userEvent.type(screen.getByLabelText(/last name/i), data.lastName);
  await userEvent.type(screen.getByLabelText(/email address/i), data.email);
  await userEvent.type(screen.getByLabelText(/phone number/i), data.phone);
  fireEvent.change(screen.getByLabelText(/date of birth/i), { target: { value: data.dateOfBirth } });
  await userEvent.type(screen.getByLabelText(/^password/i), data.password);
  await userEvent.type(screen.getByLabelText(/confirm password/i), data.confirmPassword);
};

describe('RegistrationForm', () => {
  describe('Rendering', () => {
    it('renders the registration form heading', () => {
      render(<RegistrationForm />);
      expect(screen.getByRole('heading', { name: /create an account/i })).toBeInTheDocument();
    });
    it('renders all required input fields', () => {
      render(<RegistrationForm />);
      expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/date of birth/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    });
    it('renders the submit button', () => {
      render(<RegistrationForm />);
      expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
    });
    it('renders a required fields note', () => {
      render(<RegistrationForm />);
      expect(screen.getByText(/indicates a required field/i)).toBeInTheDocument();
    });
  });

  describe('Validation - empty submission', () => {
    it('shows all required field errors when form is submitted empty', async () => {
      render(<RegistrationForm />);
      fireEvent.click(screen.getByRole('button', { name: /create account/i }));
      expect(await screen.findByText(/first name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/last name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/email address is required/i)).toBeInTheDocument();
      expect(screen.getByText(/phone number is required/i)).toBeInTheDocument();
      expect(screen.getByText(/date of birth is required/i)).toBeInTheDocument();
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
      expect(screen.getByText(/please confirm your password/i)).toBeInTheDocument();
    });
  });

  describe('Validation - individual field errors', () => {
    it('shows an error for an invalid email format', async () => {
      render(<RegistrationForm />);
      await userEvent.type(screen.getByLabelText(/email address/i), 'not-an-email');
      fireEvent.click(screen.getByRole('button', { name: /create account/i }));
      expect(await screen.findByText(/valid email address/i)).toBeInTheDocument();
    });
    it('shows an error when password is shorter than 8 characters', async () => {
      render(<RegistrationForm />);
      await userEvent.type(screen.getByLabelText(/^password/i), 'short');
      fireEvent.click(screen.getByRole('button', { name: /create account/i }));
      expect(await screen.findByText(/at least 8 characters/i)).toBeInTheDocument();
    });
    it('shows an error when passwords do not match', async () => {
      render(<RegistrationForm />);
      await userEvent.type(screen.getByLabelText(/^password/i), 'SecurePass1');
      await userEvent.type(screen.getByLabelText(/confirm password/i), 'DifferentPass1');
      fireEvent.click(screen.getByRole('button', { name: /create account/i }));
      expect(await screen.findByText(/passwords do not match/i)).toBeInTheDocument();
    });
    it('shows an error for an invalid phone number', async () => {
      render(<RegistrationForm />);
      await userEvent.type(screen.getByLabelText(/phone number/i), 'abc');
      fireEvent.click(screen.getByRole('button', { name: /create account/i }));
      expect(await screen.findByText(/valid phone number/i)).toBeInTheDocument();
    });
  });

  describe('Inline error clearing', () => {
    it('clears the first name error when the user starts typing', async () => {
      render(<RegistrationForm />);
      fireEvent.click(screen.getByRole('button', { name: /create account/i }));
      expect(await screen.findByText(/first name is required/i)).toBeInTheDocument();
      await userEvent.type(screen.getByLabelText(/first name/i), 'J');
      expect(screen.queryByText(/first name is required/i)).not.toBeInTheDocument();
    });
  });

  describe('Successful submission', () => {
    it('calls onSubmit with correct form data when all fields are valid', async () => {
      const mockOnSubmit = jest.fn();
      render(<RegistrationForm onSubmit={mockOnSubmit} />);
      await fillForm();
      fireEvent.click(screen.getByRole('button', { name: /create account/i }));
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledTimes(1);
        expect(mockOnSubmit).toHaveBeenCalledWith(expect.objectContaining(validFormData));
      });
    });
    it('shows a success message after valid form submission', async () => {
      render(<RegistrationForm />);
      await fillForm();
      fireEvent.click(screen.getByRole('button', { name: /create account/i }));
      expect(await screen.findByText(/registration successful/i)).toBeInTheDocument();
      expect(screen.getByText(/welcome, jane/i)).toBeInTheDocument();
    });
    it('does not show any validation errors on successful submission', async () => {
      render(<RegistrationForm />);
      await fillForm();
      fireEvent.click(screen.getByRole('button', { name: /create account/i }));
      await waitFor(() => {
        expect(screen.queryByText(/is required/i)).not.toBeInTheDocument();
      });
    });
  });
});
