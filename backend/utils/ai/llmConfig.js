const fs = require('fs');
const path = require('path');

// Load configuration from config.yml
const loadConfig = () => {
  try {
    const configPath = path.join(__dirname, '../../config.yml');
    if (fs.existsSync(configPath)) {
      const yaml = require('js-yaml');
      const configFile = fs.readFileSync(configPath, 'utf8');
      return yaml.load(configFile);
    } else {
      console.warn('config.yml not found, using default configuration');
      // Return default configuration
      return {
        llm: {
          provider: "openai", // Default to OpenAI since we're using @langchain/openai
          assistant: {
            model: "gpt-3.5-turbo",
            max_tokens: 1000,
            temperature: 0.7
          },
          extension: {
            model: "gpt-3.5-turbo",
            max_tokens: 500,
            temperature: 0.3
          }
        },
        rate_limits: {
          global: 1000,
          per_user: 100,
          ai_assistant: 50,
          ai_extension: 200
        }
      };
    }
  } catch (error) {
    console.error('Error loading config.yml:', error);
    throw error;
  }
};

// Get LLM configuration based on usage type
const getLLMConfig = (usageType = 'assistant') => {
  const config = loadConfig();
  
  if (!config.llm) {
    throw new Error('LLM configuration not found in config.yml');
  }
  
  const providerConfig = config.llm;
  const usageConfig = providerConfig[usageType];
  
  if (!usageConfig) {
    throw new Error(`Configuration for ${usageType} not found in config.yml`);
  }
  
  // Determine the API key based on the provider
  let apiKey;
  switch(providerConfig.provider.toLowerCase()) {
    case 'openai':
      apiKey = process.env.OPENAI_API_KEY;
      break;
    case 'mistral':
      apiKey = process.env.MISTRAL_API_KEY;
      break;
    case 'cerebras':
      apiKey = process.env.CEREBRAS_API_KEY;
      break;
    default:
      throw new Error(`Unsupported LLM provider: ${providerConfig.provider}`);
  }
  
  if (!apiKey) {
    throw new Error(`API key not found for provider: ${providerConfig.provider}. Please set the appropriate environment variable.`);
  }
  
  return {
    provider: providerConfig.provider,
    apiKey,
    modelName: usageConfig.model,
    maxTokens: usageConfig.max_tokens,
    temperature: usageConfig.temperature,
    // Additional options can be added here
  };
};

// Get rate limiting configuration
const getRateLimitConfig = () => {
  const config = loadConfig();
  return config.rate_limits || {
    global: 1000,
    per_user: 100,
    ai_assistant: 50,
    ai_extension: 200
  };
};

module.exports = {
  loadConfig,
  getLLMConfig,
  getRateLimitConfig
};