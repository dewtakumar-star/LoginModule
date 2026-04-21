import React, { useState, useCallback } from 'react';
import styles from './SignupForm.module.css';

interface FormFields {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface FormErrors {
  username?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

interface TouchedFields {
  username: boolean;
  email: boolean;
  password: boolean;
  confirmPassword: boolean;
}

const INITIAL_FIELDS: FormFields = {
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
};

const INITIAL_TOUCHED: TouchedFields = {
  username: false,
  email: false,
  password: false,
  confirmPassword: false,
};

export const validateUsername = (value: string): string | undefined => {
  if (!value.trim()) return 'Username is required.';
  if (value.trim().length < 3) return 'Username must be at least 3 characters.';
  if (value.trim().length > 20) return 'Username must be 20 characters or fewer.';
  if (!/^[a-zA-Z0-9_]+$/.test(value.trim()))
    return 'Username may only contain letters, numbers, and underscores.';
  return undefined;
};

export const validateEmail = (value: string): string | undefined => {
  if (!value.trim()) return 'Email is required.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()))
    return 'Please enter a valid email address.';
  return undefined;
};

export const validatePassword = (value: string): string | undefined => {
  if (!value) return 'Password is required.';
  if (value.length < 8) return 'Password must be at least 8 characters.';
  if (!/[A-Z]/.test(value)) return 'Password must contain at least one uppercase letter.';
  if (!/[a-z]/.test(value)) return 'Password must contain at least one lowercase letter.';
  if (!/[0-9]/.test(value)) return 'Password must contain at least one number.';
  if (!/[^a-zA-Z0-9]/.test(value)) return 'Password must contain at least one special character.';
  return undefined;
};

export const validateConfirmPassword = (value: string, password: string): string | undefined => {
  if (!value) return 'Please confirm your password.';
  if (value !== password) return 'Passwords do not match.';
  return undefined;
};

const validateAll = (fields: FormFields): FormErrors => ({
  username: validateUsername(fields.username),
  email: validateEmail(fields.email),
  password: validatePassword(fields.password),
  confirmPassword: validateConfirmPassword(fields.confirmPassword, fields.password),
});

const SignupForm: React.FC = () => {
  const [fields, setFields] = useState<FormFields>(INITIAL_FIELDS);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<TouchedFields>(INITIAL_TOUCHED);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      const updatedFields = { ...fields, [name]: value };
      setFields(updatedFields);
      if (touched[name as keyof TouchedFields]) {
        const allErrors = validateAll(updatedFields);
        setErrors((prev) => ({ ...prev, [name]: allErrors[name as keyof FormErrors] }));
        if (name === 'password') {
          setErrors((prev) => ({ ...prev, confirmPassword: allErrors.confirmPassword }));
        }
      }
    },
    [fields, touched]
  );

  const handleBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      const { name } = e.target;
      setTouched((prev) => ({ ...prev, [name]: true }));
      const allErrors = validateAll(fields);
      setErrors((prev) => ({ ...prev, [name]: allErrors[name as keyof FormErrors] }));
    },
    [fields]
  );

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setTouched({ username: true, email: true, password: true, confirmPassword: true });
    const allErrors = validateAll(fields);
    setErrors(allErrors);
    if (Object.values(allErrors).every((err) => !err)) setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className={styles.successBanner} role="alert" aria-live="polite">
        <h2>🎉 Account created successfully!</h2>
        <p>Welcome, <strong>{fields.username}</strong>. Please check your email to verify your account.</p>
      </div>
    );
  }

  const hasErrors = Object.values(errors).some(Boolean);

  return (
    <div className={styles.wrapper}>
      <h1 className={styles.heading}>Create an Account</h1>
      <form className={styles.form} onSubmit={handleSubmit} noValidate aria-label="Sign up form">

        {/* Username */}
        <div className={styles.fieldGroup}>
          <label htmlFor="username" className={styles.label}>
            Username <span aria-hidden="true">*</span>
          </label>
          <input
            id="username" name="username" type="text" autoComplete="username"
            value={fields.username} onChange={handleChange} onBlur={handleBlur}
            aria-required="true"
            aria-describedby={errors.username && touched.username ? 'username-error' : undefined}
            aria-invalid={!!(errors.username && touched.username)}
            className={`${styles.input} ${touched.username ? (errors.username ? styles.inputError : styles.inputValid) : ''}`}
          />
          {touched.username && errors.username && (
            <span id="username-error" className={styles.errorText} role="alert">{errors.username}</span>
          )}
          {touched.username && !errors.username && (
            <span className={styles.validText} aria-live="polite">✓ Looks good!</span>
          )}
        </div>

        {/* Email */}
        <div className={styles.fieldGroup}>
          <label htmlFor="email" className={styles.label}>
            Email <span aria-hidden="true">*</span>
          </label>
          <input
            id="email" name="email" type="email" autoComplete="email"
            value={fields.email} onChange={handleChange} onBlur={handleBlur}
            aria-required="true"
            aria-describedby={errors.email && touched.email ? 'email-error' : undefined}
            aria-invalid={!!(errors.email && touched.email)}
            className={`${styles.input} ${touched.email ? (errors.email ? styles.inputError : styles.inputValid) : ''}`}
          />
          {touched.email && errors.email && (
            <span id="email-error" className={styles.errorText} role="alert">{errors.email}</span>
          )}
          {touched.email && !errors.email && (
            <span className={styles.validText} aria-live="polite">✓ Looks good!</span>
          )}
        </div>

        {/* Password */}
        <div className={styles.fieldGroup}>
          <label htmlFor="password" className={styles.label}>
            Password <span aria-hidden="true">*</span>
          </label>
          <input
            id="password" name="password" type="password" autoComplete="new-password"
            value={fields.password} onChange={handleChange} onBlur={handleBlur}
            aria-required="true"
            aria-describedby={errors.password && touched.password ? 'password-error' : 'password-hint'}
            aria-invalid={!!(errors.password && touched.password)}
            className={`${styles.input} ${touched.password ? (errors.password ? styles.inputError : styles.inputValid) : ''}`}
          />
          <span id="password-hint" className={styles.hintText}>
            Min 8 chars · uppercase · lowercase · number · special character
          </span>
          {touched.password && errors.password && (
            <span id="password-error" className={styles.errorText} role="alert">{errors.password}</span>
          )}
          {touched.password && !errors.password && (
            <span className={styles.validText} aria-live="polite">✓ Strong password!</span>
          )}
        </div>

        {/* Confirm Password */}
        <div className={styles.fieldGroup}>
          <label htmlFor="confirmPassword" className={styles.label}>
            Confirm Password <span aria-hidden="true">*</span>
          </label>
          <input
            id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password"
            value={fields.confirmPassword} onChange={handleChange} onBlur={handleBlur}
            aria-required="true"
            aria-describedby={errors.confirmPassword && touched.confirmPassword ? 'confirmPassword-error' : undefined}
            aria-invalid={!!(errors.confirmPassword && touched.confirmPassword)}
            className={`${styles.input} ${touched.confirmPassword ? (errors.confirmPassword ? styles.inputError : styles.inputValid) : ''}`}
          />
          {touched.confirmPassword && errors.confirmPassword && (
            <span id="confirmPassword-error" className={styles.errorText} role="alert">{errors.confirmPassword}</span>
          )}
          {touched.confirmPassword && !errors.confirmPassword && (
            <span className={styles.validText} aria-live="polite">✓ Passwords match!</span>
          )}
        </div>

        <button type="submit" className={styles.submitButton} aria-disabled={hasErrors}>
          Create Account
        </button>
      </form>
    </div>
  );
};

export default SignupForm;
