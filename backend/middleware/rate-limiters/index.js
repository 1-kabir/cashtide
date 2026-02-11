const { getRateLimitConfig } = require('../utils/ai/llmConfig');

// Simple in-memory store for rate limiting (in production, use Redis or similar)
const rateLimitStore = new Map();

// Helper function to get current timestamp in minutes
const getCurrentMinute = () => Math.floor(Date.now() / 60000);

// Generic rate limiter middleware
const createRateLimiter = (limit, windowMs, keyGenerator) => {
  return (req, res, next) => {
    const key = keyGenerator ? keyGenerator(req) : req.ip;
    const currentMinute = getCurrentMinute();
    
    if (!rateLimitStore.has(key)) {
      rateLimitStore.set(key, {
        count: 1,
        resetTime: currentMinute + Math.ceil(windowMs / 60000) // Convert ms to minutes
      });
      return next();
    }
    
    const record = rateLimitStore.get(key);
    
    if (record.resetTime <= currentMinute) {
      // Reset the counter if the window has passed
      record.count = 1;
      record.resetTime = currentMinute + Math.ceil(windowMs / 60000);
      return next();
    }
    
    if (record.count >= limit) {
      return res.status(429).json({
        error: {
          message: 'Rate limit exceeded',
          retryAfter: (record.resetTime - currentMinute) * 60 // in seconds
        }
      });
    }
    
    record.count++;
    next();
  };
};

// Global rate limiter middleware
const globalRateLimiter = () => {
  const config = getRateLimitConfig();
  return createRateLimiter(config.global, 60 * 60 * 1000, () => 'global'); // 1 hour window
};

// Per-user rate limiter middleware
const userRateLimiter = () => {
  const config = getRateLimitConfig();
  return createRateLimiter(config.per_user, 60 * 60 * 1000, (req) => {
    return req.user ? `user_${req.user.id}` : req.ip;
  });
};

// AI assistant rate limiter middleware
const aiAssistantRateLimiter = () => {
  const config = getRateLimitConfig();
  return createRateLimiter(config.ai_assistant, 60 * 60 * 1000, (req) => {
    return req.user ? `ai_assistant_user_${req.user.id}` : `ai_assistant_ip_${req.ip}`;
  });
};

// AI extension rate limiter middleware
const aiExtensionRateLimiter = () => {
  const config = getRateLimitConfig();
  return createRateLimiter(config.ai_extension, 60 * 60 * 1000, (req) => {
    return req.user ? `ai_extension_user_${req.user.id}` : `ai_extension_ip_${req.ip}`;
  });
};

module.exports = {
  globalRateLimiter,
  userRateLimiter,
  aiAssistantRateLimiter,
  aiExtensionRateLimiter,
  createRateLimiter
};