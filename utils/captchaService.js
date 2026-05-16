const axios = require('axios');
require('dotenv').config();

/**
 * Verify Google reCAPTCHA v2 token
 * @param {string} captchaToken - The reCAPTCHA token from the client
 * @param {string} userIP - The user's IP address (optional)
 * @returns {Promise<Object>} - Verification result
 */
const verifyRecaptcha = async (captchaToken, userIP = null) => {
  try {
    if (!captchaToken) {
      return {
        success: false,
        error: 'Captcha token is required'
      };
    }

    if (!process.env.RECAPTCHA_SECRET_KEY) {
      console.error('RECAPTCHA_SECRET_KEY not configured');
      return {
        success: false,
        error: 'Captcha verification not configured'
      };
    }

    const verificationURL = 'https://www.google.com/recaptcha/api/siteverify';
    
    const params = new URLSearchParams();
    params.append('secret', process.env.RECAPTCHA_SECRET_KEY);
    params.append('response', captchaToken);
    
    if (userIP) {
      params.append('remoteip', userIP);
    }

    const response = await axios.post(verificationURL, params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      timeout: 10000 // 10 seconds timeout
    });

    const result = response.data;

    if (result.success) {
      return {
        success: true,
        score: result.score || null, // For reCAPTCHA v3
        action: result.action || null, // For reCAPTCHA v3
        hostname: result.hostname || null,
        challenge_ts: result.challenge_ts || null
      };
    } else {
      return {
        success: false,
        error: 'Captcha verification failed',
        errorCodes: result['error-codes'] || []
      };
    }
  } catch (error) {
    console.error('Error verifying captcha:', error.message);
    return {
      success: false,
      error: 'Captcha verification service unavailable'
    };
  }
};

/**
 * Verify hCaptcha token
 * @param {string} captchaToken - The hCaptcha token from the client
 * @param {string} userIP - The user's IP address (optional)
 * @returns {Promise<Object>} - Verification result
 */
const verifyHcaptcha = async (captchaToken, userIP = null) => {
  try {
    if (!captchaToken) {
      return {
        success: false,
        error: 'Captcha token is required'
      };
    }

    if (!process.env.HCAPTCHA_SECRET_KEY) {
      console.error('HCAPTCHA_SECRET_KEY not configured');
      return {
        success: false,
        error: 'Captcha verification not configured'
      };
    }

    const verificationURL = 'https://api.hcaptcha.com/siteverify';
    
    const params = new URLSearchParams();
    params.append('secret', process.env.HCAPTCHA_SECRET_KEY);
    params.append('response', captchaToken);
    
    if (userIP) {
      params.append('remoteip', userIP);
    }

    const response = await axios.post(verificationURL, params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      timeout: 10000
    });

    const result = response.data;

    if (result.success) {
      return {
        success: true,
        hostname: result.hostname || null,
        challenge_ts: result.challenge_ts || null
      };
    } else {
      return {
        success: false,
        error: 'Captcha verification failed',
        errorCodes: result['error-codes'] || []
      };
    }
  } catch (error) {
    console.error('Error verifying hCaptcha:', error.message);
    return {
      success: false,
      error: 'Captcha verification service unavailable'
    };
  }
};

/**
 * Main captcha verification function that supports multiple providers
 * @param {string} captchaToken - The captcha token from the client
 * @param {string} provider - The captcha provider ('recaptcha' or 'hcaptcha', default: 'hcaptcha')
 * @param {string} userIP - The user's IP address (optional)
 * @returns {Promise<Object>} - Verification result
 */
const verifyCaptcha = async (captchaToken, provider = 'hcaptcha', userIP = null) => {
  switch (provider.toLowerCase()) {
    case 'recaptcha':
      return await verifyRecaptcha(captchaToken, userIP);
    case 'hcaptcha':
      return await verifyHcaptcha(captchaToken, userIP);
    default:
      return {
        success: false,
        error: 'Unsupported captcha provider'
      };
  }
};

/**
 * Express middleware for captcha validation
 * @param {Object} options - Configuration options
 * @param {string} options.provider - Captcha provider ('recaptcha' or 'hcaptcha', default: 'hcaptcha')
 * @param {string} options.tokenField - Field name containing the captcha token (default: 'captchaToken')
 * @param {boolean} options.skipInDevelopment - Skip validation in development mode
 * @returns {Function} - Express middleware function
 */
const captchaMiddleware = (options = {}) => {
  const {
    provider = 'hcaptcha',
    tokenField = 'captchaToken',
    skipInDevelopment = false
  } = options;

  return async (req, res, next) => {
    try {
      // Skip captcha validation in development if configured
      if (skipInDevelopment && process.env.NODE_ENV === 'development') {
        console.log('Skipping captcha validation in development mode');
        return next();
      }

      const captchaToken = req.body[tokenField];
      const userIP = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];

      if (!captchaToken) {
        return res.status(400).json({
          success: false,
          message: 'Captcha verification is required',
          error: 'Missing captcha token'
        });
      }

      const verificationResult = await verifyCaptcha(captchaToken, provider, userIP);

      if (!verificationResult.success) {
        return res.status(400).json({
          success: false,
          message: 'Captcha verification failed',
          error: verificationResult.error,
          errorCodes: verificationResult.errorCodes
        });
      }

      // Add verification result to request object for potential use in route handlers
      req.captchaVerification = verificationResult;
      next();
    } catch (error) {
      console.error('Captcha middleware error:', error);
      return res.status(500).json({
        success: false,
        message: 'Captcha verification service error',
        error: 'Internal server error'
      });
    }
  };
};

module.exports = {
  verifyRecaptcha,
  verifyHcaptcha,
  verifyCaptcha,
  captchaMiddleware
};