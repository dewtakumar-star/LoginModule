import React, { useState } from 'react';
import './RegistrationForm.css';

const RegistrationForm = ({ onSubmit }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    dateOfBirth: '',
    phone: '',
  });

  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const validate = (data) => {
    const newErrors = {};

    if (!data.firstName.trim()) {
      newErrors.firstName = 'First name is required.';
    }

    if (!data.lastName.trim()) {
      newErrors.lastName = 'Last name is required.';
    }

    if (!data.email.trim()) {
      newErrors.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      newErrors.email = 'Please enter a valid email address.';
    }

    if (!data.password) {
      newErrors.password = 'Password is required.';
    } else if (data.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters.';
    }

    if (!data.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password.';
    } else if (data.password !== data.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match.';
    }

    if (!data.dateOfBirth) {
      newErrors.dateOfBirth = 'Date of birth is required.';
    }

    if (!data.phone.trim()) {
      newErrors.phone = 'Phone number is required.';
    } else if (!/^[\d\s\-\+\(\)]{7,15}$/.test(data.phone)) {
      newErrors.phone = 'Please enter a valid phone number.';
    }

    return newErrors;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const validationErrors = validate(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});
    setSubmitted(true);
    if (onSubmit) {
      onSubmit(formData);
    }
  };

  if (submitted) {
    return (
      <div className="registration-success" role="alert">
        <h2>Registration Successful!</h2>
        <p>Welcome, {formData.firstName}! Your account has been created.</p>
      </div>
    );
  }

  return (
    <div className="registration-container">
      <h1 className="registration-title">Create an Account</h1>
      <p className="registration-subtitle">Fill in the details below to get started.</p>

      <form
        className="registration-form"
        onSubmit={handleSubmit}
        noValidate
        aria-label="Registration Form"
      >
        <div className="form-group">
          <label htmlFor="firstName">First Name <span className="required">*</span></label>
          <input type="text" id="firstName" name="firstName" value={formData.firstName} onChange={handleChange} placeholder="Enter your first name" aria-required="true" aria-describedby={errors.firstName ? 'firstName-error' : undefined} className={errors.firstName ? 'input-error' : ''} />
          {errors.firstName && (<span id="firstName-error" className="error-message" role="alert">{errors.firstName}</span>)}
        </div>

        <div className="form-group">
          <label htmlFor="lastName">Last Name <span className="required">*</span></label>
          <input type="text" id="lastName" name="lastName" value={formData.lastName} onChange={handleChange} placeholder="Enter your last name" aria-required="true" aria-describedby={errors.lastName ? 'lastName-error' : undefined} className={errors.lastName ? 'input-error' : ''} />
          {errors.lastName && (<span id="lastName-error" className="error-message" role="alert">{errors.lastName}</span>)}
        </div>

        <div className="form-group">
          <label htmlFor="email">Email Address <span className="required">*</span></label>
          <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} placeholder="Enter your email address" aria-required="true" aria-describedby={errors.email ? 'email-error' : undefined} className={errors.email ? 'input-error' : ''} />
          {errors.email && (<span id="email-error" className="error-message" role="alert">{errors.email}</span>)}
        </div>

        <div className="form-group">
          <label htmlFor="phone">Phone Number <span className="required">*</span></label>
          <input type="tel" id="phone" name="phone" value={formData.phone} onChange={handleChange} placeholder="Enter your phone number" aria-required="true" aria-describedby={errors.phone ? 'phone-error' : undefined} className={errors.phone ? 'input-error' : ''} />
          {errors.phone && (<span id="phone-error" className="error-message" role="alert">{errors.phone}</span>)}
        </div>

        <div className="form-group">
          <label htmlFor="dateOfBirth">Date of Birth <span className="required">*</span></label>
          <input type="date" id="dateOfBirth" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleChange} aria-required="true" aria-describedby={errors.dateOfBirth ? 'dateOfBirth-error' : undefined} className={errors.dateOfBirth ? 'input-error' : ''} />
          {errors.dateOfBirth && (<span id="dateOfBirth-error" className="error-message" role="alert">{errors.dateOfBirth}</span>)}
        </div>

        <div className="form-group">
          <label htmlFor="password">Password <span className="required">*</span></label>
          <input type="password" id="password" name="password" value={formData.password} onChange={handleChange} placeholder="Minimum 8 characters" aria-required="true" aria-describedby={errors.password ? 'password-error' : undefined} className={errors.password ? 'input-error' : ''} />
          {errors.password && (<span id="password-error" className="error-message" role="alert">{errors.password}</span>)}
        </div>

        <div className="form-group">
          <label htmlFor="confirmPassword">Confirm Password <span className="required">*</span></label>
          <input type="password" id="confirmPassword" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} placeholder="Re-enter your password" aria-required="true" aria-describedby={errors.confirmPassword ? 'confirmPassword-error' : undefined} className={errors.confirmPassword ? 'input-error' : ''} />
          {errors.confirmPassword && (<span id="confirmPassword-error" className="error-message" role="alert">{errors.confirmPassword}</span>)}
        </div>

        <p className="required-note"><span className="required">*</span> Indicates a required field</p>
        <button type="submit" className="submit-button">Create Account</button>
      </form>
    </div>
  );
};

export default RegistrationForm;
