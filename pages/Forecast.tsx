import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { Sparkles, BrainCircuit, TrendingUp, AlertTriangle, Loader2 } from 'lucide-react';
import { useTransactions } from '../hooks/useTransactions';
import { generateForecast, ForecastResult } from '../services/geminiService';
import { PageLoader, EmptyState } from '../components/ui/Loading';
import toast from 'react-hot-toast';

type ScenarioType = 'base' | 'optimistic' | 'conservative';

const Forecast = () => {
  const { transactions, loading: transactionsLoading } = useTransactions({ realtime: true });
  const [isGenerating, setIsGenerating] = useState(false);
  const [scenario, setScenario] = useState<ScenarioType>('base');
  const [forecastData, setForecastData] = useState<ForecastResult['data'] | null>(null);
  const [hasGenerated, setHasGenerated] = useState(false);

  // Calculate metrics from transactions
  const calculateMetrics = () => {
    const now = new Date();
    const threeMonthsAgo = new Date(now);
    threeMonthsAgo.setMonth(now.getMonth() - 3);

    const recentTransactions = transactions.filter(
      (t) => new Date(t.date) >= threeMonthsAgo
    );

    const totalRevenue = recentTransactions
      .filter((t) => t.type === 'revenue')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpenses = recentTransactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const monthlyBurnRate = totalExpenses / 3;
    const monthlyRevenue = totalRevenue / 3;
    const netMonthly = monthlyRevenue - monthlyBurnRate;

    // Estimate runway (simplified)
    const currentCash = 250000; // This could be fetched from settings
    const runway = netMonthly < 0 ? currentCash / Math.abs(netMonthly) : Infinity;

    // Estimate break-even
    const breakEvenDate = new Date();
    if (netMonthly < 0 && monthlyRevenue > 0) {
      const monthsToBreakeven = Math.ceil(monthlyBurnRate / (monthlyRevenue * 0.1)); // Assuming 10% monthly growth
      breakEvenDate.setMonth(breakEvenDate.getMonth() + monthsToBreakeven);
    }

    return {
      burnRate: monthlyBurnRate,
      runway: runway === Infinity ? 'Profitable' : `${Math.round(runway)} months`,
      breakEven: netMonthly >= 0 ? 'Profitable' : breakEvenDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
    };
  };

  const handleGenerateForecast = async () => {
    setIsGenerating(true);
    try {
      const result = await generateForecast(transactions, 6);
      if (result.success && result.data) {
        setForecastData(result.data);
        setHasGenerated(true);
        toast.success('Forecast generated successfully');
      } else if (result.data) {
        // Fallback data available
        setForecastData(result.data);
        setHasGenerated(true);
        toast.success('Generated forecast using historical data');
      } else {
        toast.error(result.error || 'Failed to generate forecast');
      }
    } catch (err) {
      toast.error('Failed to generate forecast');
    } finally {
      setIsGenerating(false);
    }
  };

  // Auto-generate on first load if we have transactions
  useEffect(() => {
    if (transactions.length > 0 && !hasGenerated && !transactionsLoading) {
      handleGenerateForecast();
    }
  }, [transactions.length, transactionsLoading]);

  const getChartData = () => {
    if (!forecastData) return [];

    const scenarioData =
      scenario === 'base'
        ? forecastData.baseCase
        : scenario === 'optimistic'
        ? forecastData.optimistic
        : forecastData.conservative;

    return scenarioData.map((point, index) => {
      const conservative = forecastData.conservative[index];
      const optimistic = forecastData.optimistic[index];
      return {
        month: new Date(point.month + '-01').toLocaleDateString('en-US', { month: 'short' }),
        profit: point.profit,
        revenue: point.revenue,
        expenses: point.expenses,
        ci_low: conservative?.profit || point.profit * 0.85,
        ci_high: optimistic?.profit || point.profit * 1.15,
      };
    });
  };

  const metrics = calculateMetrics();

  if (transactionsLoading) {
    return <PageLoader message="Loading financial data..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <BrainCircuit className="text-indigo-600" />
            AI Financial Forecast
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Powered by Google Gemini AI
          </p>
        </div>
        <div className="flex bg-white rounded-lg border border-slate-200 p-1 shadow-sm">
          <button
            onClick={() => setScenario('base')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              scenario === 'base'
                ? 'bg-indigo-50 text-indigo-700'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Base Case
          </button>
          <button
            onClick={() => setScenario('optimistic')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              scenario === 'optimistic'
                ? 'bg-emerald-50 text-emerald-700'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Optimistic
          </button>
          <button
            onClick={() => setScenario('conservative')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              scenario === 'conservative'
                ? 'bg-slate-100 text-slate-700'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Conservative
          </button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Main Chart */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>6-Month Projection</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[350px] w-full relative">
              {isGenerating && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex items-center justify-center flex-col gap-3">
                  <Sparkles className="animate-spin text-indigo-600 w-8 h-8" />
                  <p className="text-sm font-medium text-indigo-600 animate-pulse">
                    Consulting Gemini AI...
                  </p>
                </div>
              )}
              {!hasGenerated && !isGenerating ? (
                <EmptyState
                  icon={<BrainCircuit className="w-6 h-6 text-slate-400" />}
                  title="No forecast generated"
                  description="Click the button below to generate an AI-powered forecast"
                />
              ) : forecastData ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={getChartData()}>
                    <defs>
                      <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(val) => `$${(val / 1000).toFixed(0)}K`}
                    />
                    <Tooltip
                      formatter={(value: number) => [`$${value.toLocaleString()}`, '']}
                      labelFormatter={(label) => `Month: ${label}`}
                    />
                    <Area
                      type="monotone"
                      dataKey="ci_high"
                      stroke="transparent"
                      fill="#e0e7ff"
                      fillOpacity={0.5}
                      name="Upper Bound"
                    />
                    <Area
                      type="monotone"
                      dataKey="ci_low"
                      stroke="transparent"
                      fill="#ffffff"
                      name="Lower Bound"
                    />
                    <Area
                      type="monotone"
                      dataKey="profit"
                      stroke="#6366f1"
                      strokeWidth={3}
                      fill="url(#colorProfit)"
                      name="Projected Profit"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : null}
            </div>
          </CardContent>
        </Card>

        {/* Insights Panel */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
                Key Metrics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500 uppercase font-semibold">
                  Monthly Burn Rate
                </p>
                <p className="text-lg font-bold text-slate-900">
                  ${(metrics.burnRate / 1000).toFixed(1)}K{' '}
                  <span className="text-sm font-normal text-slate-500">/ month</span>
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500 uppercase font-semibold">
                  Runway
                </p>
                <p className="text-lg font-bold text-slate-900">{metrics.runway}</p>
              </div>
              <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-lg">
                <p className="text-xs text-indigo-600 uppercase font-semibold">
                  Break-even Point
                </p>
                <p className="text-lg font-bold text-indigo-900">{metrics.breakEven}</p>
              </div>
            </CardContent>
          </Card>

          {/* AI Insights */}
          {forecastData && forecastData.insights.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  AI Insights
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-700 space-y-2">
                {forecastData.insights.slice(0, 3).map((insight, i) => (
                  <p key={i}>• {insight}</p>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Recommendations */}
          {forecastData && forecastData.recommendations.length > 0 && (
            <Card className="border-amber-200 bg-amber-50/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-amber-800 text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-amber-900 space-y-2">
                {forecastData.recommendations.slice(0, 3).map((rec, i) => (
                  <p key={i}>• {rec}</p>
                ))}
              </CardContent>
            </Card>
          )}

          <button
            onClick={handleGenerateForecast}
            disabled={isGenerating}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium shadow-sm transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isGenerating ? (
              <Loader2 className="animate-spin w-4 h-4" />
            ) : (
              <Sparkles size={16} />
            )}
            {hasGenerated ? 'Regenerate Forecast' : 'Generate Forecast'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Forecast;
