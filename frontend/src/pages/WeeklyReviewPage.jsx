import React, { useState, useEffect } from 'react';
import { api } from '../App';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { Progress } from '../components/ui/progress';
import { toast } from 'sonner';
import {
  BarChart3,
  CheckSquare,
  Sparkles,
  Wallet,
  TrendingUp,
  Brain,
  Save,
  Loader2,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export const WeeklyReviewPage = () => {
  const [reviewData, setReviewData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiReport, setAiReport] = useState(null);
  
  // Reflection form
  const [whatWorked, setWhatWorked] = useState('');
  const [whatEarned, setWhatEarned] = useState('');
  const [whatToRemove, setWhatToRemove] = useState('');

  useEffect(() => {
    fetchReview();
  }, []);

  const fetchReview = async () => {
    setLoading(true);
    try {
      const response = await api.get('/weekly-review');
      setReviewData(response.data);
      
      if (response.data.reflection) {
        setWhatWorked(response.data.reflection.what_worked || '');
        setWhatEarned(response.data.reflection.what_earned || '');
        setWhatToRemove(response.data.reflection.what_to_remove || '');
      }
    } catch (error) {
      toast.error('Помилка завантаження');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveReflection = async () => {
    setSaving(true);
    try {
      await api.post('/weekly-review/reflection', {
        what_worked: whatWorked,
        what_earned: whatEarned,
        what_to_remove: whatToRemove,
      });
      toast.success('Рефлексію збережено');
    } catch (error) {
      toast.error('Помилка збереження');
    } finally {
      setSaving(false);
    }
  };

  const generateAiReport = async () => {
    setAiLoading(true);
    try {
      const response = await api.post('/ai/analyze', { analysis_type: 'weekly_report' });
      setAiReport(response.data);
    } catch (error) {
      toast.error('Помилка генерації звіту');
    } finally {
      setAiLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const formatDateRange = () => {
    if (!reviewData) return '';
    const start = new Date(reviewData.week_start);
    const end = new Date(reviewData.week_end);
    const options = { day: 'numeric', month: 'short' };
    return `${start.toLocaleDateString('uk-UA', options)} - ${end.toLocaleDateString('uk-UA', options)}`;
  };

  // Chart data
  const habitsChartData = [
    { name: 'Виконано', value: reviewData?.habits_completion_rate || 0, color: 'hsl(var(--habits))' },
    { name: 'Залишилось', value: 100 - (reviewData?.habits_completion_rate || 0), color: 'hsl(var(--border))' },
  ];

  const summaryData = [
    { name: 'Завдання', value: reviewData?.tasks_completed || 0, icon: CheckSquare, color: 'hsl(var(--tasks))' },
    { name: 'Звички', value: `${reviewData?.habits_completion_rate || 0}%`, icon: Sparkles, color: 'hsl(var(--habits))' },
    { name: 'Дохід', value: `$${reviewData?.total_income?.toLocaleString() || 0}`, icon: TrendingUp, color: 'hsl(var(--finance-profit))' },
    { name: 'Витрати', value: `$${reviewData?.total_expense?.toLocaleString() || 0}`, icon: Wallet, color: 'hsl(var(--finance-loss))' },
  ];

  return (
    <div className="space-y-6 animate-fadeIn" data-testid="weekly-review-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Огляд тижня</h1>
          <p className="text-muted-foreground mt-1">{formatDateRange()}</p>
        </div>
        <Button onClick={generateAiReport} disabled={aiLoading} data-testid="generate-ai-report-btn">
          {aiLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Brain className="h-4 w-4 mr-2" />}
          AI Звіт
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {summaryData.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.name} className="bento-card">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div 
                    className="p-2 rounded-lg"
                    style={{ backgroundColor: `${item.color}20` }}
                  >
                    <Icon className="h-5 w-5" style={{ color: item.color }} />
                  </div>
                  <div>
                    <p className="label-uppercase">{item.name}</p>
                    <p className="data-value text-xl">{item.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Habits Completion */}
        <Card className="bento-card gradient-habits">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4" />
              Виконання звичок
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center">
              <div className="relative w-40 h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={habitsChartData}
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={2}
                      dataKey="value"
                      startAngle={90}
                      endAngle={-270}
                    >
                      {habitsChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center flex-col">
                  <span className="text-3xl font-bold font-mono">{Math.round(reviewData?.habits_completion_rate || 0)}%</span>
                  <span className="text-xs text-muted-foreground">виконано</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Finance Summary */}
        <Card className="bento-card gradient-finance">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4" />
              Фінанси тижня
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-muted-foreground">Дохід</span>
                  <span className="font-mono text-sm finance-positive">
                    ${reviewData?.total_income?.toLocaleString() || 0}
                  </span>
                </div>
                <Progress value={100} className="h-2 bg-[hsl(var(--finance-profit))]/20" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-muted-foreground">Витрати</span>
                  <span className="font-mono text-sm finance-negative">
                    ${reviewData?.total_expense?.toLocaleString() || 0}
                  </span>
                </div>
                <Progress 
                  value={reviewData?.total_income > 0 ? (reviewData?.total_expense / reviewData?.total_income) * 100 : 0} 
                  className="h-2"
                />
              </div>
              <div className="pt-2 border-t border-border/40">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Чистий результат</span>
                  <span className={`font-mono font-semibold ${(reviewData?.total_income - reviewData?.total_expense) >= 0 ? 'finance-positive' : 'finance-negative'}`}>
                    ${((reviewData?.total_income || 0) - (reviewData?.total_expense || 0)).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Report */}
      {aiReport && (
        <Card className="bento-card" data-testid="ai-report-card">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Brain className="h-4 w-4" />
              AI Аналіз тижня
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm whitespace-pre-wrap">{aiReport.analysis}</p>
              {aiReport.suggestions?.length > 0 && (
                <div className="pt-3 border-t border-border/40">
                  <p className="label-uppercase mb-2">Рекомендації на наступний тиждень:</p>
                  <ul className="space-y-1">
                    {aiReport.suggestions.map((suggestion, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-[hsl(var(--finance-profit))]">•</span>
                        {suggestion}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reflection */}
      <Card className="bento-card" data-testid="reflection-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Рефлексія тижня</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm">Що спрацювало цього тижня?</Label>
            <Textarea
              value={whatWorked}
              onChange={(e) => setWhatWorked(e.target.value)}
              placeholder="Які дії, звички чи рішення принесли результат..."
              rows={3}
              data-testid="what-worked-textarea"
            />
          </div>
          
          <div className="space-y-2">
            <Label className="text-sm">Що принесло дохід?</Label>
            <Textarea
              value={whatEarned}
              onChange={(e) => setWhatEarned(e.target.value)}
              placeholder="Які активності генерували дохід цього тижня..."
              rows={3}
              data-testid="what-earned-textarea"
            />
          </div>
          
          <div className="space-y-2">
            <Label className="text-sm">Що варто прибрати наступного тижня?</Label>
            <Textarea
              value={whatToRemove}
              onChange={(e) => setWhatToRemove(e.target.value)}
              placeholder="Що забирало час/енергію без результату..."
              rows={3}
              data-testid="what-to-remove-textarea"
            />
          </div>
          
          <Button onClick={handleSaveReflection} disabled={saving} data-testid="save-reflection-btn">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Зберегти рефлексію
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default WeeklyReviewPage;
