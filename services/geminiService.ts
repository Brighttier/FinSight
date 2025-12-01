import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Transaction, ForecastDataPoint } from '../types';

// Initialize with API key from environment
const getGeminiClient = () => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Gemini API key not configured. Please set VITE_GEMINI_API_KEY in your environment.');
  }
  return new GoogleGenerativeAI(apiKey);
};

export interface ForecastResult {
  success: boolean;
  data?: {
    baseCase: ForecastDataPoint[];
    optimistic: ForecastDataPoint[];
    conservative: ForecastDataPoint[];
    insights: string[];
    recommendations: string[];
  };
  error?: string;
}

/**
 * Generate financial forecasts using Gemini AI
 */
export async function generateForecast(
  transactions: Transaction[],
  months: number = 6
): Promise<ForecastResult> {
  try {
    const genAI = getGeminiClient();
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // Prepare transaction summary for the AI
    const summary = prepareTransactionSummary(transactions);

    const prompt = `You are a financial analyst AI. Analyze the following business financial data and generate a ${months}-month forecast.

FINANCIAL DATA:
${summary}

Please provide your response in the following JSON format ONLY (no markdown, no code blocks, just raw JSON):
{
  "baseCase": [
    {"month": "YYYY-MM", "revenue": number, "expenses": number, "profit": number}
  ],
  "optimistic": [
    {"month": "YYYY-MM", "revenue": number, "expenses": number, "profit": number}
  ],
  "conservative": [
    {"month": "YYYY-MM", "revenue": number, "expenses": number, "profit": number}
  ],
  "insights": ["insight 1", "insight 2", "insight 3"],
  "recommendations": ["recommendation 1", "recommendation 2", "recommendation 3"]
}

Generate forecasts for the next ${months} months starting from ${new Date().toISOString().slice(0, 7)}.
- Base case: Most likely scenario based on current trends
- Optimistic: 15-25% better performance
- Conservative: 15-25% worse performance

Include 3-5 actionable insights and recommendations based on the data patterns.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Parse the JSON response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse AI response');
    }

    const forecast = JSON.parse(jsonMatch[0]);

    return {
      success: true,
      data: {
        baseCase: forecast.baseCase || [],
        optimistic: forecast.optimistic || [],
        conservative: forecast.conservative || [],
        insights: forecast.insights || [],
        recommendations: forecast.recommendations || [],
      },
    };
  } catch (error: any) {
    console.error('Gemini forecast error:', error);

    // Return fallback forecast if AI fails
    if (error.message?.includes('API key')) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: 'Failed to generate forecast. Please try again.',
      data: generateFallbackForecast(transactions, months),
    };
  }
}

/**
 * Prepare transaction data summary for AI analysis
 */
function prepareTransactionSummary(transactions: Transaction[]): string {
  if (transactions.length === 0) {
    return 'No historical transaction data available.';
  }

  // Group by month
  const byMonth: Record<string, { revenue: number; expenses: number }> = {};

  transactions.forEach((t) => {
    const month = t.date.slice(0, 7);
    if (!byMonth[month]) {
      byMonth[month] = { revenue: 0, expenses: 0 };
    }
    if (t.type === 'revenue') {
      byMonth[month].revenue += t.amount;
    } else {
      byMonth[month].expenses += t.amount;
    }
  });

  // Group by category
  const byCategory: Record<string, number> = {};
  transactions.forEach((t) => {
    byCategory[t.category] = (byCategory[t.category] || 0) + t.amount;
  });

  // Calculate totals
  const totalRevenue = transactions
    .filter((t) => t.type === 'revenue')
    .reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  let summary = `Total Transactions: ${transactions.length}\n`;
  summary += `Total Revenue: $${totalRevenue.toLocaleString()}\n`;
  summary += `Total Expenses: $${totalExpenses.toLocaleString()}\n`;
  summary += `Net Profit: $${(totalRevenue - totalExpenses).toLocaleString()}\n\n`;

  summary += 'Monthly Breakdown:\n';
  Object.entries(byMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([month, data]) => {
      summary += `${month}: Revenue $${data.revenue.toLocaleString()}, Expenses $${data.expenses.toLocaleString()}, Profit $${(data.revenue - data.expenses).toLocaleString()}\n`;
    });

  summary += '\nCategory Breakdown:\n';
  Object.entries(byCategory)
    .sort(([, a], [, b]) => b - a)
    .forEach(([category, amount]) => {
      summary += `${category}: $${amount.toLocaleString()}\n`;
    });

  return summary;
}

/**
 * Generate fallback forecast when AI is unavailable
 */
function generateFallbackForecast(
  transactions: Transaction[],
  months: number
): ForecastResult['data'] {
  // Calculate averages from historical data
  const avgRevenue =
    transactions
      .filter((t) => t.type === 'revenue')
      .reduce((sum, t) => sum + t.amount, 0) / Math.max(1, transactions.filter((t) => t.type === 'revenue').length);

  const avgExpenses =
    transactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0) / Math.max(1, transactions.filter((t) => t.type === 'expense').length);

  const baseRevenue = avgRevenue || 10000;
  const baseExpenses = avgExpenses || 7000;

  const baseCase: ForecastDataPoint[] = [];
  const optimistic: ForecastDataPoint[] = [];
  const conservative: ForecastDataPoint[] = [];

  const startDate = new Date();

  for (let i = 0; i < months; i++) {
    const date = new Date(startDate);
    date.setMonth(date.getMonth() + i + 1);
    const month = date.toISOString().slice(0, 7);

    // Small growth factor
    const growth = 1 + i * 0.02;

    const baseRev = Math.round(baseRevenue * growth);
    const baseExp = Math.round(baseExpenses * growth * 0.98);

    baseCase.push({
      month,
      revenue: baseRev,
      expenses: baseExp,
      profit: baseRev - baseExp,
    });

    optimistic.push({
      month,
      revenue: Math.round(baseRev * 1.2),
      expenses: Math.round(baseExp * 0.9),
      profit: Math.round(baseRev * 1.2 - baseExp * 0.9),
    });

    conservative.push({
      month,
      revenue: Math.round(baseRev * 0.85),
      expenses: Math.round(baseExp * 1.1),
      profit: Math.round(baseRev * 0.85 - baseExp * 1.1),
    });
  }

  return {
    baseCase,
    optimistic,
    conservative,
    insights: [
      'Based on historical averages - AI analysis unavailable',
      'Revenue shows steady patterns based on available data',
      'Consider reviewing expense categories for optimization',
    ],
    recommendations: [
      'Configure Gemini API for more accurate forecasting',
      'Add more historical data for better predictions',
      'Review spending patterns monthly',
    ],
  };
}

/**
 * Get AI-powered financial insights
 */
export async function getFinancialInsights(
  transactions: Transaction[]
): Promise<{ insights: string[]; error?: string }> {
  try {
    const genAI = getGeminiClient();
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const summary = prepareTransactionSummary(transactions);

    const prompt = `Analyze this business financial data and provide 5 key insights. Be specific and actionable.

${summary}

Respond with a JSON array of strings only:
["insight 1", "insight 2", "insight 3", "insight 4", "insight 5"]`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('Failed to parse insights');
    }

    return { insights: JSON.parse(jsonMatch[0]) };
  } catch (error: any) {
    return {
      insights: [
        'Unable to generate AI insights. Please check your API configuration.',
      ],
      error: error.message,
    };
  }
}
