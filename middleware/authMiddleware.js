const axios = require('axios');
require('dotenv').config();

/**
 * Auth0 Token Verification Middleware
 * Verifies the Auth0 token from the authtoken header
 * Attaches user info to req.user if verification is successful
 */
const verifyAuth0Token = async (req, res, next) => {
  try {
    const authHeader = req.headers.authtoken;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
        error: 'Missing or invalid Authorization header'
      });
    }

    // Verify token with Auth0
    const userInfoResponse = await axios.get(
      `${process.env.AUTH0_DOMAIN}/userinfo`,
      {
        headers: {
          Authorization: `Bearer ${authHeader}`
        },
        timeout: 10000 // 10 seconds timeout
      }
    );

    // Attach user info to request object for use in route handlers
    req.user = userInfoResponse.data;
    req.authToken = authHeader;

    next();
  } catch (error) {
    console.error('Auth verification error:', error.message);

    // Determine the appropriate error response
    if (error.response?.status === 401) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
        error: 'Invalid or expired token'
      });
    }

    if (error.code === 'ECONNABORTED') {
      return res.status(503).json({
        success: false,
        message: 'Service Unavailable',
        error: 'Auth service timeout'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Internal Server Error',
      error: 'Failed to verify authentication'
    });
  }
};

/**
 * Optional Auth Middleware
 * Verifies token if provided, but doesn't require it
 * Useful for endpoints that can be accessed by both authenticated and unauthenticated users
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authtoken;

    if (authHeader) {
      const userInfoResponse = await axios.get(
        `${process.env.AUTH0_DOMAIN}/userinfo`,
        {
          headers: {
            Authorization: `Bearer ${authHeader}`
          },
          timeout: 10000
        }
      );

      req.user = userInfoResponse.data;
      req.authToken = authHeader;
    }

    next();
  } catch (error) {
    console.error('Optional auth verification error:', error.message);
    // Don't fail the request, just continue without user info
    next();
  }
};

module.exports = {
  verifyAuth0Token,
  optionalAuth
};