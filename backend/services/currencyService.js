const axios = require('axios');
const NodeCache = require('node-cache');

// Initialize cache for exchange rates (cache for 1 hour by default)
const exchangeRateCache = new NodeCache({ stdTTL: 3600, checkperiod: 3660 });

class CurrencyService {
  constructor() {
    this.apiKey = process.env.CURRENCY_API_KEY;
    this.baseCurrency = process.env.CURRENCY_BASE_CURRENCY || 'USD';
    this.apiUrl = 'https://api.exchangerate-api.com/v4/latest/';
    this.updateInterval = process.env.CURRENCY_UPDATE_INTERVAL || '1h'; // Default to 1 hour
  }

  // Get exchange rates from API
  async fetchExchangeRates(baseCurrency = null) {
    const base = baseCurrency || this.baseCurrency;
    const cacheKey = `exchange_rates_${base}`;

    // Check if rates are cached
    const cachedRates = exchangeRateCache.get(cacheKey);
    if (cachedRates) {
      return cachedRates;
    }

    try {
      const response = await axios.get(`${this.apiUrl}${base}`);
      const rates = response.data.rates;

      // Cache the rates
      exchangeRateCache.set(cacheKey, rates, 3600); // Cache for 1 hour

      return rates;
    } catch (error) {
      console.error('Error fetching exchange rates:', error.message);
      throw new Error(`Failed to fetch exchange rates: ${error.message}`);
    }
  }

  // Convert amount from one currency to another
  async convertCurrency(amount, fromCurrency, toCurrency) {
    if (fromCurrency === toCurrency) {
      return parseFloat(amount);
    }

    const rates = await this.fetchExchangeRates(fromCurrency);

    if (!rates[toCurrency]) {
      throw new Error(`Exchange rate not available for ${toCurrency}`);
    }

    const convertedAmount = parseFloat(amount) * rates[toCurrency];
    return parseFloat(convertedAmount.toFixed(2));
  }

  // Get exchange rate between two currencies
  async getExchangeRate(fromCurrency, toCurrency) {
    if (fromCurrency === toCurrency) {
      return 1.0;
    }

    const rates = await this.fetchExchangeRates(fromCurrency);

    if (!rates[toCurrency]) {
      throw new Error(`Exchange rate not available for ${toCurrency}`);
    }

    return rates[toCurrency];
  }

  // Get supported currencies
  async getSupportedCurrencies() {
    const rates = await this.fetchExchangeRates();
    return [this.baseCurrency, ...Object.keys(rates)];
  }

  // Update exchange rates periodically (should be called once at startup)
  startPeriodicUpdates() {
    const intervalMs = this.parseInterval(this.updateInterval);
    
    setInterval(async () => {
      try {
        // Pre-fetch rates for common currencies
        await this.fetchExchangeRates(this.baseCurrency);
        console.log('Exchange rates updated successfully');
      } catch (error) {
        console.error('Failed to update exchange rates:', error.message);
      }
    }, intervalMs);
  }

  // Parse interval string to milliseconds
  parseInterval(intervalStr) {
    const match = intervalStr.match(/^(\d+)([smhd])$/);
    if (!match) {
      throw new Error('Invalid interval format. Use format like: 1h, 30m, 2d');
    }

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 's': return value * 1000;
      case 'm': return value * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      default: throw new Error('Invalid interval unit. Use s, m, h, or d');
    }
  }

  // Get all rates for a specific base currency
  async getAllRates(baseCurrency = null) {
    const base = baseCurrency || this.baseCurrency;
    return await this.fetchExchangeRates(base);
  }
}

// Singleton instance
const currencyService = new CurrencyService();

module.exports = currencyService;