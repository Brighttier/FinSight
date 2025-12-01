import { CurrencyCode, SUPPORTED_CURRENCIES } from '../types';

// Default exchange rates to USD (fallback when API is unavailable)
// These should be updated periodically or fetched from an API
const DEFAULT_EXCHANGE_RATES: Record<CurrencyCode, number> = {
  USD: 1,
  INR: 0.012, // 1 INR = 0.012 USD (approx 83 INR = 1 USD)
  EUR: 1.08,  // 1 EUR = 1.08 USD
  GBP: 1.27,  // 1 GBP = 1.27 USD
  CAD: 0.74,  // 1 CAD = 0.74 USD
  AUD: 0.65,  // 1 AUD = 0.65 USD
  SGD: 0.74,  // 1 SGD = 0.74 USD
};

// Cache for exchange rates
let cachedRates: Record<CurrencyCode, number> = { ...DEFAULT_EXCHANGE_RATES };
let lastFetchTime: number = 0;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

/**
 * Fetch latest exchange rates from a free API
 * Falls back to default rates if fetch fails
 */
export async function fetchExchangeRates(): Promise<Record<CurrencyCode, number>> {
  const now = Date.now();

  // Return cached rates if still valid
  if (now - lastFetchTime < CACHE_DURATION && lastFetchTime > 0) {
    return cachedRates;
  }

  try {
    // Using exchangerate-api.com free tier (or you can use another free API)
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');

    if (!response.ok) {
      throw new Error('Failed to fetch exchange rates');
    }

    const data = await response.json();
    const rates = data.rates;

    // Convert from "X per USD" to "USD per X"
    const newRates: Record<CurrencyCode, number> = {
      USD: 1,
      INR: rates.INR ? 1 / rates.INR : DEFAULT_EXCHANGE_RATES.INR,
      EUR: rates.EUR ? 1 / rates.EUR : DEFAULT_EXCHANGE_RATES.EUR,
      GBP: rates.GBP ? 1 / rates.GBP : DEFAULT_EXCHANGE_RATES.GBP,
      CAD: rates.CAD ? 1 / rates.CAD : DEFAULT_EXCHANGE_RATES.CAD,
      AUD: rates.AUD ? 1 / rates.AUD : DEFAULT_EXCHANGE_RATES.AUD,
      SGD: rates.SGD ? 1 / rates.SGD : DEFAULT_EXCHANGE_RATES.SGD,
    };

    cachedRates = newRates;
    lastFetchTime = now;

    return newRates;
  } catch (error) {
    console.warn('Failed to fetch exchange rates, using defaults:', error);
    return DEFAULT_EXCHANGE_RATES;
  }
}

/**
 * Get current exchange rate for a currency to USD
 */
export function getExchangeRate(currency: CurrencyCode): number {
  return cachedRates[currency] || DEFAULT_EXCHANGE_RATES[currency] || 1;
}

/**
 * Convert an amount from one currency to USD
 */
export function convertToUSD(amount: number, fromCurrency: CurrencyCode): number {
  const rate = getExchangeRate(fromCurrency);
  return amount * rate;
}

/**
 * Convert an amount from USD to another currency
 */
export function convertFromUSD(amountUSD: number, toCurrency: CurrencyCode): number {
  const rate = getExchangeRate(toCurrency);
  if (rate === 0) return 0;
  return amountUSD / rate;
}

/**
 * Format a currency amount with proper symbol and formatting
 */
export function formatCurrencyAmount(
  amount: number,
  currency: CurrencyCode,
  options?: { minimumFractionDigits?: number; maximumFractionDigits?: number }
): string {
  const currencyInfo = SUPPORTED_CURRENCIES[currency];

  const formatter = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: options?.minimumFractionDigits ?? 0,
    maximumFractionDigits: options?.maximumFractionDigits ?? 0,
  });

  return `${currencyInfo.symbol}${formatter.format(amount)}`;
}

/**
 * Format currency with code (e.g., "₹50,000 INR")
 */
export function formatCurrencyWithCode(
  amount: number,
  currency: CurrencyCode,
  options?: { minimumFractionDigits?: number; maximumFractionDigits?: number }
): string {
  return `${formatCurrencyAmount(amount, currency, options)} ${currency}`;
}

/**
 * Get display string for exchange rate
 */
export function getExchangeRateDisplay(fromCurrency: CurrencyCode, toCurrency: CurrencyCode = 'USD'): string {
  if (fromCurrency === toCurrency) return '1:1';

  const fromInfo = SUPPORTED_CURRENCIES[fromCurrency];
  const toInfo = SUPPORTED_CURRENCIES[toCurrency];
  const rate = getExchangeRate(fromCurrency);

  // Show how many units of fromCurrency = 1 USD
  const inverseRate = rate > 0 ? 1 / rate : 0;

  return `1 ${toInfo.code} = ${inverseRate.toFixed(2)} ${fromInfo.code}`;
}

/**
 * Initialize exchange rates on app load
 */
export async function initializeExchangeRates(): Promise<void> {
  await fetchExchangeRates();
}

/**
 * Get all supported currencies as options for dropdown
 */
export function getCurrencyOptions(): { value: CurrencyCode; label: string }[] {
  return Object.values(SUPPORTED_CURRENCIES).map((currency) => ({
    value: currency.code,
    label: `${currency.code} - ${currency.name} (${currency.symbol})`,
  }));
}
