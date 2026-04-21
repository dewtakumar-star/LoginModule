const { invalidateToken, clearRefreshToken } = require('./token.service');

/**
 * POST /auth/logout
 * Terminates the user session by invalidating the access token and clearing the refresh token.
 */
async function logout(req, res) {
  try {
    const authHeader = req.headers['authorization'];
    const accessToken = authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : null;

    if (!accessToken) {
      return res.status(401).json({ message: 'No active session found.' });
    }

    // Invalidate (blacklist) the access token
    await invalidateToken(accessToken);

    // Clear the refresh token associated with this user
    const userId = req.user && req.user.id;
    if (userId) {
      await clearRefreshToken(userId);
    }

    // Clear the refresh token cookie if present
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
    });

    return res.status(200).json({ message: 'Successfully logged out.' });
  } catch (error) {
    console.error('[Logout] Error during logout:', error);
    return res.status(500).json({ message: 'An error occurred during logout. Please try again.' });
  }
}

module.exports = { logout };
