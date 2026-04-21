import React, { useState } from 'react';
import styles from './RegistrationForm.module.css';

export interface RegistrationPayload {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface RegistrationResult {
  success: boolean;
  message: string;
}

export interface RegistrationFormProps {
  onSubmit?: (payload: RegistrationPayload) => Promise<RegistrationResult>;
}

const defaultSubmit = async (payload: RegistrationPayload): Promise<RegistrationResult> => {
  const response = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: payload.username,
      email: payload.email,
      password: payload.password,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    return {
      success: false,
      message: data?.message || 'Registration failed. Please try again.',
    };
  }

  return {
    success: true,
    message: 'Your account has been created successfully! You can now log in.',
  };
};

const RegistrationForm: React.FC<RegistrationFormProps> = ({ onSubmit = defaultSubmit }) => {
  const [formData, setFormData] = useState<RegistrationPayload>({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [fieldErrors, setFieldErrors] = useState<Partial<RegistrationPayload>>({});
  const [feedback, setFeedback] = useState<RegistrationResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = (): boolean => {
    const errors: Partial<RegistrationPayload> = {};

    if (!formData.username.trim()) {
      errors.username = 'Username is required.';
    } else if (formData.username.length < 3) {
      errors.username = 'Username must be at least 3 characters.';
    }

    if (!formData.email.trim()) {
      errors.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address.';
    }

    if (!formData.password) {
      errors.password = 'Password is required.';
    } else if (formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters.';
    }

    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password.';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name as keyof RegistrationPayload]) {
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    }
    if (feedback) setFeedback(null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFeedback(null);

    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const result = await onSubmit(formData);
      setFeedback(result);
      if (result.success) {
        setFormData({ username: '', email: '', password: '', confirmPassword: '' });
        setFieldErrors({});
      }
    } catch {
      setFeedback({
        success: false,
        message: 'An unexpected error occurred. Please try again later.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Create an Account</h1>

      {feedback && (
        <div
          role="alert"
          aria-live="assertive"
          className={`${styles.feedback} ${
            feedback.success ? styles.feedbackSuccess : styles.feedbackError
          }`}
        >
          <span className={styles.feedbackIcon}>{feedback.success ? '✓' : '✕'}</span>
          {feedback.message}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className={styles.form}>
        <div className={styles.field}>
          <label htmlFor="username" className={styles.label}>Username</label>
          <input id="username" name="username" type="text" autoComplete="username"
            value={formData.username} onChange={handleChange}
            aria-describedby={fieldErrors.username ? 'username-error' : undefined}
            aria-invalid={!!fieldErrors.username}
            className={`${styles.input} ${fieldErrors.username ? styles.inputError : ''}`}
            disabled={isSubmitting} />
          {fieldErrors.username && (
            <span id="username-error" role="alert" className={styles.fieldError}>{fieldErrors.username}</span>
          )}
        </div>

        <div className={styles.field}>
          <label htmlFor="email" className={styles.label}>Email Address</label>
          <input id="email" name="email" type="email" autoComplete="email"
            value={formData.email} onChange={handleChange}
            aria-describedby={fieldErrors.email ? 'email-error' : undefined}
            aria-invalid={!!fieldErrors.email}
            className={`${styles.input} ${fieldErrors.email ? styles.inputError : ''}`}
            disabled={isSubmitting} />
          {fieldErrors.email && (
            <span id="email-error" role="alert" className={styles.fieldError}>{fieldErrors.email}</span>
          )}
        </div>

        <div className={styles.field}>
          <label htmlFor="password" className={styles.label}>Password</label>
          <input id="password" name="password" type="password" autoComplete="new-password"
            value={formData.password} onChange={handleChange}
            aria-describedby={fieldErrors.password ? 'password-error' : undefined}
            aria-invalid={!!fieldErrors.password}
            className={`${styles.input} ${fieldErrors.password ? styles.inputError : ''}`}
            disabled={isSubmitting} />
          {fieldErrors.password && (
            <span id="password-error" role="alert" className={styles.fieldError}>{fieldErrors.password}</span>
          )}
        </div>

        <div className={styles.field}>
          <label htmlFor="confirmPassword" className={styles.label}>Confirm Password</label>
          <input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password"
            value={formData.confirmPassword} onChange={handleChange}
            aria-describedby={fieldErrors.confirmPassword ? 'confirmPassword-error' : undefined}
            aria-invalid={!!fieldErrors.confirmPassword}
            className={`${styles.input} ${fieldErrors.confirmPassword ? styles.inputError : ''}`}
            disabled={isSubmitting} />
          {fieldErrors.confirmPassword && (
            <span id="confirmPassword-error" role="alert" className={styles.fieldError}>{fieldErrors.confirmPassword}</span>
          )}
        </div>

        <button type="submit" className={styles.submitButton} disabled={isSubmitting} aria-busy={isSubmitting}>
          {isSubmitting ? 'Creating Account…' : 'Create Account'}
        </button>
      </form>
    </div>
  );
};

export default RegistrationForm;
