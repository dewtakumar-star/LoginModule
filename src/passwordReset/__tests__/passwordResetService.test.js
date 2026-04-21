const jwt = require('jsonwebtoken');
const {
  generateResetToken,
  verifyResetToken,
  sendPasswordResetEmail,
  requestPasswordReset,
} = require('../passwordResetService');

describe('generateResetToken', () => {
  it('should return a non-empty string', () => {
    const token = generateResetToken('user-123');
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);
  });

  it('should encode the correct userId as sub claim', () => {
    const token = generateResetToken('user-42');
    const decoded = jwt.decode(token);
    expect(decoded.sub).toBe('user-42');
  });

  it('should set purpose claim to password-reset', () => {
    const token = generateResetToken('user-1');
    const decoded = jwt.decode(token);
    expect(decoded.purpose).toBe('password-reset');
  });

  it('should include a unique jti to prevent token reuse', () => {
    const t1 = generateResetToken('user-1');
    const t2 = generateResetToken('user-1');
    expect(jwt.decode(t1).jti).not.toBe(jwt.decode(t2).jti);
  });

  it('should throw when no userId is provided', () => {
    expect(() => generateResetToken(null)).toThrow('userId is required');
    expect(() => generateResetToken('')).toThrow('userId is required');
    expect(() => generateResetToken(undefined)).toThrow('userId is required');
  });
});

describe('verifyResetToken', () => {
  it('should return the decoded payload for a valid token', () => {
    const token = generateResetToken('user-7');
    const payload = verifyResetToken(token);
    expect(payload.sub).toBe('user-7');
    expect(payload.purpose).toBe('password-reset');
  });

  it('should throw for a tampered token', () => {
    const token = generateResetToken('user-7');
    expect(() => verifyResetToken(token + 'tampered')).toThrow();
  });

  it('should throw when token is missing', () => {
    expect(() => verifyResetToken(null)).toThrow('token is required');
    expect(() => verifyResetToken('')).toThrow('token is required');
  });

  it('should throw for a token with incorrect purpose', () => {
    const wrongToken = jwt.sign(
      { sub: 'user-1', purpose: 'email-verification' },
      process.env.JWT_SECRET || 'super-secret-key',
      { expiresIn: '1h' }
    );
    expect(() => verifyResetToken(wrongToken)).toThrow('Invalid token purpose');
  });

  it('should throw for an expired token', async () => {
    const expiredToken = jwt.sign(
      { sub: 'user-1', purpose: 'password-reset' },
      process.env.JWT_SECRET || 'super-secret-key',
      { expiresIn: '0s' }
    );
    await new Promise((r) => setTimeout(r, 10));
    expect(() => verifyResetToken(expiredToken)).toThrow();
  });
});

describe('sendPasswordResetEmail', () => {
  const mockMailer = { sendMail: jest.fn().mockResolvedValue({ messageId: 'test-id' }) };

  beforeEach(() => jest.clearAllMocks());

  it('should call mailer.sendMail with correct to/subject', async () => {
    const token = generateResetToken('user-99');
    await sendPasswordResetEmail(mockMailer, 'user@example.com', token);
    expect(mockMailer.sendMail).toHaveBeenCalledTimes(1);
    const [mailOptions] = mockMailer.sendMail.mock.calls[0];
    expect(mailOptions.to).toBe('user@example.com');
    expect(mailOptions.subject).toBe('Password Reset Request');
  });

  it('should include the reset link containing the token in the email body', async () => {
    const token = generateResetToken('user-99');
    await sendPasswordResetEmail(mockMailer, 'user@example.com', token);
    const [mailOptions] = mockMailer.sendMail.mock.calls[0];
    expect(mailOptions.text).toContain(encodeURIComponent(token));
    expect(mailOptions.html).toContain(encodeURIComponent(token));
  });

  it('should throw if mailer is not provided', async () => {
    const token = generateResetToken('user-1');
    await expect(sendPasswordResetEmail(null, 'a@b.com', token)).rejects.toThrow('mailer is required');
  });

  it('should throw if toEmail is not provided', async () => {
    const token = generateResetToken('user-1');
    await expect(sendPasswordResetEmail(mockMailer, '', token)).rejects.toThrow('toEmail is required');
  });

  it('should throw if token is not provided', async () => {
    await expect(sendPasswordResetEmail(mockMailer, 'a@b.com', '')).rejects.toThrow('token is required');
  });

  it('should resolve with the mailer result', async () => {
    const token = generateResetToken('user-5');
    const result = await sendPasswordResetEmail(mockMailer, 'user@example.com', token);
    expect(result).toEqual({ messageId: 'test-id' });
  });
});

describe('requestPasswordReset', () => {
  const mockMailer = { sendMail: jest.fn().mockResolvedValue({ messageId: 'ok' }) };
  const existingUser = { id: 'user-55', email: 'found@example.com' };
  const findUserByEmail = jest.fn();

  beforeEach(() => jest.clearAllMocks());

  it('should send reset email and return generic message when user exists', async () => {
    findUserByEmail.mockResolvedValue(existingUser);
    const result = await requestPasswordReset(
      { findUserByEmail, mailer: mockMailer },
      'found@example.com'
    );
    expect(findUserByEmail).toHaveBeenCalledWith('found@example.com');
    expect(mockMailer.sendMail).toHaveBeenCalledTimes(1);
    expect(result.message).toMatch(/reset link has been sent/i);
  });

  it('should return the same generic message when user does NOT exist (prevent enumeration)', async () => {
    findUserByEmail.mockResolvedValue(null);
    const result = await requestPasswordReset(
      { findUserByEmail, mailer: mockMailer },
      'unknown@example.com'
    );
    expect(mockMailer.sendMail).not.toHaveBeenCalled();
    expect(result.message).toMatch(/reset link has been sent/i);
  });

  it('should throw if email is not provided', async () => {
    await expect(
      requestPasswordReset({ findUserByEmail, mailer: mockMailer }, '')
    ).rejects.toThrow('email is required');
  });

  it('should send the email to the address stored on the user record, not the raw input', async () => {
    findUserByEmail.mockResolvedValue(existingUser);
    await requestPasswordReset(
      { findUserByEmail, mailer: mockMailer },
      'found@example.com'
    );
    const [mailOptions] = mockMailer.sendMail.mock.calls[0];
    expect(mailOptions.to).toBe(existingUser.email);
  });
});
