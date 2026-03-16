import React, { useState, useEffect } from 'react';
import { api } from '../App';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { ScrollArea } from '../components/ui/scroll-area';
import { toast } from 'sonner';
import {
  Wallet,
  Target,
  Sparkles,
  CheckSquare,
  TrendingUp,
  TrendingDown,
  Check,
  Circle,
  Flame,
  Brain,
  Loader2,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

export const DashboardPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const response = await api.get('/dashboard');
      setData(response.data);
    } catch (error) {
      toast.error('Помилка завантаження даних');
    } finally {
      setLoading(false);
    }
  };

  const toggleHabit = async (habitId) => {
    const habit = data.habits_today.find(h => h.id === habitId);
    const newCompleted = !habit.completed_today;
    
    // Optimistic update
    setData(prev => ({
      ...prev,
      habits_today: prev.habits_today.map(h =>
        h.id === habitId ? { ...h, completed_today: newCompleted } : h
      )
    }));

    try {
      await api.post(`/habits/${habitId}/log`, { completed: newCompleted });
      toast.success(newCompleted ? 'Звичка виконана!' : 'Звичку скасовано');
    } catch (error) {
      // Revert on error
      setData(prev => ({
        ...prev,
        habits_today: prev.habits_today.map(h =>
          h.id === habitId ? { ...h, completed_today: !newCompleted } : h
        )
      }));
      toast.error('Помилка оновлення');
    }
  };

  const toggleTask = async (taskId) => {
    try {
      await api.put(`/tasks/${taskId}`, { completed: true });
      setData(prev => ({
        ...prev,
        today_tasks: prev.today_tasks.filter(t => t.id !== taskId)
      }));
      toast.success('Завдання виконано!');
    } catch (error) {
      toast.error('Помилка оновлення');
    }
  };

  const getAiAnalysis = async () => {
    setAiLoading(true);
    try {
      const response = await api.post('/ai/analyze', { analysis_type: 'productivity' });
      setAiAnalysis(response.data);
    } catch (error) {
      toast.error('Помилка AI аналізу');
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

  const habitsCompleted = data?.habits_today?.filter(h => h.completed_today).length || 0;
  const habitsTotal = data?.habits_today?.length || 0;
  const habitsPercentage = habitsTotal > 0 ? (habitsCompleted / habitsTotal) * 100 : 0;

  const habitsPieData = [
    { name: 'Виконано', value: habitsCompleted, color: 'hsl(var(--habits))' },
    { name: 'Залишилось', value: habitsTotal - habitsCompleted, color: 'hsl(var(--border))' },
  ];

  return (
    <div className="space-y-6 animate-fadeIn" data-testid="dashboard-page">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Дашборд</h1>
        <p className="text-muted-foreground mt-1">Ваш день на одному екрані</p>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        
        {/* Finance Card */}
        <Card className="bento-card-glow gradient-finance col-span-1 md:col-span-2 lg:col-span-2" data-testid="finance-card">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Wallet className="h-4 w-4" />
              Фінанси (цей місяць)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="label-uppercase mb-1">Дохід</p>
                <p className="data-value finance-positive">${data?.finance?.income?.toLocaleString() || 0}</p>
              </div>
              <div>
                <p className="label-uppercase mb-1">Витрати</p>
                <p className="data-value finance-negative">${data?.finance?.expense?.toLocaleString() || 0}</p>
              </div>
              <div>
                <p className="label-uppercase mb-1">Баланс</p>
                <p className={`data-value ${data?.finance?.balance >= 0 ? 'finance-positive' : 'finance-negative'}`}>
                  ${data?.finance?.balance?.toLocaleString() || 0}
                </p>
              </div>
            </div>
            {data?.finance?.goals?.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border/40">
                <p className="label-uppercase mb-2">Ціль: {data.finance.goals[0].title}</p>
                <Progress 
                  value={(data.finance.income / data.finance.goals[0].target_amount) * 100} 
                  className="h-2"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  ${data.finance.income.toLocaleString()} / ${data.finance.goals[0].target_amount.toLocaleString()}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Habits Ring Card */}
        <Card className="bento-card-glow gradient-habits" data-testid="habits-card">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4" />
              Звички
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center">
              <div className="relative w-32 h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={habitsPieData}
                      innerRadius={35}
                      outerRadius={50}
                      paddingAngle={2}
                      dataKey="value"
                      startAngle={90}
                      endAngle={-270}
                    >
                      {habitsPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center flex-col">
                  <span className="text-2xl font-bold font-mono">{Math.round(habitsPercentage)}%</span>
                </div>
              </div>
            </div>
            <p className="text-center text-sm text-muted-foreground mt-2">
              {habitsCompleted} з {habitsTotal} виконано
            </p>
          </CardContent>
        </Card>

        {/* Weekly Productivity */}
        <Card className="bento-card-glow gradient-tasks" data-testid="productivity-card">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4" />
              Продуктивність
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Завдань за тиждень</span>
                <span className="font-mono font-semibold">{data?.weekly_productivity?.tasks_completed || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Звичок сьогодні</span>
                <span className="font-mono font-semibold">
                  {data?.weekly_productivity?.habits_completed || 0}/{data?.weekly_productivity?.total_habits || 0}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Today's Habits */}
        <Card className="bento-card col-span-1 md:col-span-1 lg:col-span-2 row-span-1" data-testid="today-habits-card">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Flame className="h-4 w-4 text-[hsl(var(--habits))]" />
              Звички сьогодні
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[180px]">
              <div className="space-y-2">
                {data?.habits_today?.length === 0 && (
                  <p className="text-sm text-muted-foreground">Немає звичок. Додайте в розділі "Звички"</p>
                )}
                {data?.habits_today?.map((habit) => (
                  <div
                    key={habit.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/30 transition-colors cursor-pointer"
                    onClick={() => toggleHabit(habit.id)}
                    data-testid={`habit-item-${habit.id}`}
                  >
                    <div
                      className={`habit-check ${habit.completed_today ? 'habit-check-completed' : 'habit-check-pending'}`}
                      style={{ borderColor: habit.completed_today ? habit.color : undefined, backgroundColor: habit.completed_today ? habit.color : undefined }}
                    >
                      {habit.completed_today && <Check className="h-5 w-5" />}
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm ${habit.completed_today ? 'line-through text-muted-foreground' : ''}`}>
                        {habit.name}
                      </p>
                      {habit.streak > 0 && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Flame className="h-3 w-3 text-orange-500" />
                          {habit.streak} днів поспіль
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Today's Tasks */}
        <Card className="bento-card col-span-1 md:col-span-1 lg:col-span-2 row-span-1" data-testid="today-tasks-card">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckSquare className="h-4 w-4 text-[hsl(var(--tasks))]" />
              Завдання на сьогодні
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[180px]">
              <div className="space-y-2">
                {data?.today_tasks?.length === 0 && (
                  <p className="text-sm text-muted-foreground">Немає завдань на сьогодні</p>
                )}
                {data?.today_tasks?.slice(0, 5).map((task) => (
                  <div
                    key={task.id}
                    className={`flex items-center gap-3 p-2 rounded-lg hover:bg-accent/30 transition-colors cursor-pointer ${
                      task.priority === 'high' ? 'priority-high' : task.priority === 'medium' ? 'priority-medium' : 'priority-low'
                    }`}
                    onClick={() => toggleTask(task.id)}
                    data-testid={`task-item-${task.id}`}
                  >
                    <Circle className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{task.title}</p>
                      <p className="text-xs text-muted-foreground">{task.category}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Goals Progress */}
        <Card className="bento-card gradient-goals col-span-1 md:col-span-2 lg:col-span-2" data-testid="goals-card">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-4 w-4 text-[hsl(var(--goals))]" />
              Активні цілі
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data?.goals?.length === 0 && (
                <p className="text-sm text-muted-foreground">Немає активних цілей</p>
              )}
              {data?.goals?.slice(0, 3).map((goal) => {
                const progress = goal.target_value > 0 ? (goal.current_value / goal.target_value) * 100 : 0;
                return (
                  <div key={goal.id} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium truncate flex-1">{goal.title}</span>
                      <span className="text-xs text-muted-foreground ml-2">{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} className="h-1.5" />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* AI Assistant */}
        <Card className="bento-card col-span-1 md:col-span-2 lg:col-span-2" data-testid="ai-card">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Brain className="h-4 w-4" />
              AI Асистент
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!aiAnalysis ? (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground mb-3">
                  Отримайте AI-аналіз вашої продуктивності
                </p>
                <Button onClick={getAiAnalysis} disabled={aiLoading} data-testid="ai-analyze-btn">
                  {aiLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Аналізувати
                </Button>
              </div>
            ) : (
              <ScrollArea className="h-[150px]">
                <div className="space-y-2">
                  <p className="text-sm whitespace-pre-wrap">{aiAnalysis.analysis.slice(0, 500)}...</p>
                  {aiAnalysis.suggestions?.length > 0 && (
                    <div className="pt-2 border-t border-border/40">
                      <p className="label-uppercase mb-1">Рекомендації:</p>
                      <ul className="text-xs text-muted-foreground space-y-1">
                        {aiAnalysis.suggestions.slice(0, 3).map((s, i) => (
                          <li key={i}>• {s}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardPage;
