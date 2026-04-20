import React, { useState, useCallback } from 'react';
import styles from './LoginForm.module.css';

interface FieldState {
  value: string;
  error: string | null;
  touched: boolean;
}

interface FormState {
  email: FieldState;
  password: FieldState;
}

const INITIAL_FIELD: FieldState = { value: '', error: null, touched: false };

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateEmail(value: string): string | null {
  if (!value.trim()) return 'Email is required.';
  if (!EMAIL_REGEX.test(value)) return 'Please enter a valid email address.';
  return null;
}

function validatePassword(value: string): string | null {
  if (!value) return 'Password is required.';
  if (value.length < 8) return 'Password must be at least 8 characters.';
  return null;
}

export interface LoginFormProps {
  onSubmit?: (email: string, password: string) => void | Promise<void>;
}

const LoginForm: React.FC<LoginFormProps> = ({ onSubmit }) => {
  const [form, setForm] = useState<FormState>({
    email: { ...INITIAL_FIELD },
    password: { ...INITIAL_FIELD },
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const updateField = useCallback(
    (field: keyof FormState, value: string, touched = true) => {
      const error =
        field === 'email' ? validateEmail(value) : validatePassword(value);
      setForm((prev) => ({
        ...prev,
        [field]: { value, error: touched ? error : null, touched },
      }));
    },
    []
  );

  const handleChange = (field: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateField(field, e.target.value, form[field].touched);
    };

  const handleBlur = (field: keyof FormState) =>
    (e: React.FocusEvent<HTMLInputElement>) => {
      updateField(field, e.target.value, true);
    };

  const isFormValid =
    !validateEmail(form.email.value) && !validatePassword(form.password.value);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setForm((prev) => ({
      email: { ...prev.email, touched: true, error: validateEmail(prev.email.value) },
      password: { ...prev.password, touched: true, error: validatePassword(prev.password.value) },
    }));
    if (!isFormValid) return;
    setIsSubmitting(true);
    try {
      await onSubmit?.(form.email.value, form.password.value);
      setSubmitSuccess(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Welcome Back</h1>
      <form className={styles.form} onSubmit={handleSubmit} noValidate aria-label="Login form">
        <div className={styles.fieldGroup}>
          <label htmlFor="email" className={styles.label}>Email address</label>
          <input
            id="email" type="email" autoComplete="email"
            value={form.email.value}
            onChange={handleChange('email')} onBlur={handleBlur('email')}
            aria-invalid={!!form.email.error}
            aria-describedby={form.email.error ? 'email-error' : undefined}
            className={`${styles.input} ${form.email.error ? styles.inputError : ''}`}
            placeholder="you@example.com"
          />
          {form.email.error && (
            <span id="email-error" role="alert" className={styles.errorMessage} data-testid="email-error">
              {form.email.error}
            </span>
          )}
        </div>
        <div className={styles.fieldGroup}>
          <label htmlFor="password" className={styles.label}>Password</label>
          <input
            id="password" type="password" autoComplete="current-password"
            value={form.password.value}
            onChange={handleChange('password')} onBlur={handleBlur('password')}
            aria-invalid={!!form.password.error}
            aria-describedby={form.password.error ? 'password-error' : undefined}
            className={`${styles.input} ${form.password.error ? styles.inputError : ''}`}
            placeholder="••••••••"
          />
          {form.password.error && (
            <span id="password-error" role="alert" className={styles.errorMessage} data-testid="password-error">
              {form.password.error}
            </span>
          )}
        </div>
        <button type="submit" className={styles.submitButton} disabled={isSubmitting} aria-busy={isSubmitting}>
          {isSubmitting ? 'Signing in…' : 'Sign In'}
        </button>
        {submitSuccess && <p role="status" className={styles.successMessage}>Login successful! Redirecting…</p>}
      </form>
    </div>
  );
};

export default LoginForm;
