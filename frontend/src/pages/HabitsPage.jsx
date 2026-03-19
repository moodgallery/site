import React, { useState, useEffect } from 'react';
import { api } from '../App';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { ScrollArea } from '../components/ui/scroll-area';
import { toast } from 'sonner';
import {
  Plus,
  Sparkles,
  Trash2,
  Check,
  Flame,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const HABIT_COLORS = [
  '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#f43f5e', '#ec4899', '#6366f1', '#14b8a6',
];

export const HabitsPage = () => {
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [habitLogs, setHabitLogs] = useState({});
  
  // Form state
  const [name, setName] = useState('');
  const [color, setColor] = useState(HABIT_COLORS[0]);
  const [targetDays, setTargetDays] = useState(7);

  useEffect(() => {
    fetchHabits();
  }, []);

  useEffect(() => {
    if (habits.length > 0) {
      fetchHabitLogs();
    }
  }, [habits, selectedMonth]);

  const fetchHabits = async () => {
    setLoading(true);
    try {
      const response = await api.get('/habits');
      setHabits(response.data);
    } catch (error) {
      toast.error('Помилка завантаження звичок');
    } finally {
      setLoading(false);
    }
  };

  const fetchHabitLogs = async () => {
    const monthStr = `${selectedMonth.getFullYear()}-${String(selectedMonth.getMonth() + 1).padStart(2, '0')}`;
    try {
      const logsMap = {};
      for (const habit of habits) {
        const response = await api.get(`/habits/${habit.id}/logs?month=${monthStr}`);
        logsMap[habit.id] = response.data;
      }
      setHabitLogs(logsMap);
    } catch (error) {
      console.error('Error fetching logs:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/habits', {
        name,
        color,
        target_days: targetDays,
      });
      toast.success('Звичку створено');
      setDialogOpen(false);
      resetForm();
      fetchHabits();
    } catch (error) {
      toast.error('Помилка створення');
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/habits/${id}`);
      toast.success('Звичку видалено');
      fetchHabits();
    } catch (error) {
      toast.error('Помилка видалення');
    }
  };

  const formatDateLocal = (d) => {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const handleToggleDay = async (habitId, date) => {
    const dateStr = formatDateLocal(date);
    const logs = habitLogs[habitId] || [];
    const existingLog = logs.find(l => l.date === dateStr);
    const newCompleted = !existingLog?.completed;

    // Optimistic update
    setHabitLogs(prev => ({
      ...prev,
      [habitId]: existingLog
        ? prev[habitId].map(l => l.date === dateStr ? { ...l, completed: newCompleted } : l)
        : [...(prev[habitId] || []), { date: dateStr, completed: true }]
    }));

    try {
      await api.post(`/habits/${habitId}/log`, { date: dateStr, completed: newCompleted });
      fetchHabits(); // Update streaks
    } catch (error) {
      toast.error('Помилка оновлення');
      fetchHabitLogs(); // Revert on error
    }
  };

  const resetForm = () => {
    setName('');
    setColor(HABIT_COLORS[0]);
    setTargetDays(7);
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const isDateCompleted = (habitId, date) => {
    const dateStr = formatDateLocal(date);
    const logs = habitLogs[habitId] || [];
    return logs.some(l => l.date === dateStr && l.completed);
  };

  const getMonthStats = (habitId) => {
    const logs = habitLogs[habitId] || [];
    const completedDays = logs.filter(l => l.completed).length;
    const daysInMonth = getDaysInMonth(selectedMonth).length;
    return { completedDays, daysInMonth, percentage: Math.round((completedDays / daysInMonth) * 100) };
  };

  const navigateMonth = (direction) => {
    setSelectedMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + direction);
      return newDate;
    });
  };

  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isFuture = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date > today;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const days = getDaysInMonth(selectedMonth);
  const monthNames = ['Січень', 'Лютий', 'Березень', 'Квітень', 'Травень', 'Червень', 
                      'Липень', 'Серпень', 'Вересень', 'Жовтень', 'Листопад', 'Грудень'];

  return (
    <div className="space-y-6 animate-fadeIn" data-testid="habits-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Звички</h1>
          <p className="text-muted-foreground mt-1">Відстежуйте щоденні звички та серії</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="add-habit-btn">
              <Plus className="h-4 w-4 mr-2" />
              Нова звичка
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border/40">
            <DialogHeader>
              <DialogTitle>Нова звичка</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Назва звички</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Наприклад: Ранкова пробіжка"
                  required
                  data-testid="habit-name-input"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Колір</Label>
                <div className="flex gap-2 flex-wrap">
                  {HABIT_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`w-8 h-8 rounded-full transition-transform ${color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-background scale-110' : ''}`}
                      style={{ backgroundColor: c }}
                      onClick={() => setColor(c)}
                      data-testid={`color-${c}`}
                    />
                  ))}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Ціль: днів на тиждень</Label>
                <Input
                  type="number"
                  min={1}
                  max={7}
                  value={targetDays}
                  onChange={(e) => setTargetDays(parseInt(e.target.value))}
                  data-testid="target-days-input"
                />
              </div>
              
              <Button type="submit" className="w-full" data-testid="submit-habit-btn">
                Створити звичку
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Month Navigation */}
      <Card className="bento-card">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={() => navigateMonth(-1)} data-testid="prev-month-btn">
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h2 className="text-lg font-semibold">
              {monthNames[selectedMonth.getMonth()]} {selectedMonth.getFullYear()}
            </h2>
            <Button variant="ghost" size="icon" onClick={() => navigateMonth(1)} data-testid="next-month-btn">
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Habits Grid */}
      {habits.length === 0 ? (
        <Card className="bento-card">
          <CardContent className="py-12 text-center">
            <Sparkles className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Немає звичок. Створіть першу звичку!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {habits.map((habit) => {
            const stats = getMonthStats(habit.id);
            
            return (
              <Card key={habit.id} className="bento-card gradient-habits" data-testid={`habit-card-${habit.id}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: habit.color }}
                      />
                      <CardTitle className="text-base">{habit.name}</CardTitle>
                      {habit.streak > 0 && (
                        <div className="flex items-center gap-1 text-orange-500">
                          <Flame className="h-4 w-4" />
                          <span className="text-sm font-mono">{habit.streak}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {stats.completedDays}/{stats.daysInMonth} ({stats.percentage}%)
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(habit.id)}
                        data-testid={`delete-habit-${habit.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="w-full">
                    <div className="flex gap-1 pb-2">
                      {days.map((day) => {
                        const completed = isDateCompleted(habit.id, day);
                        const future = isFuture(day);
                        const today = isToday(day);
                        
                        return (
                          <button
                            key={day.toISOString()}
                            className={`
                              habit-calendar-day flex-shrink-0 flex items-center justify-center
                              ${today ? 'ring-2 ring-white/50' : ''}
                              ${future ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer hover:scale-125'}
                            `}
                            style={{
                              backgroundColor: completed ? habit.color : 'hsl(var(--accent))',
                              width: '28px',
                              height: '28px',
                              borderRadius: '4px',
                            }}
                            onClick={() => !future && handleToggleDay(habit.id, day)}
                            disabled={future}
                            title={day.toLocaleDateString('uk-UA')}
                            data-testid={`day-${habit.id}-${day.getDate()}`}
                          >
                            {completed && <Check className="h-3 w-3 text-white" />}
                            {!completed && (
                              <span className="text-[10px] text-muted-foreground font-mono">
                                {day.getDate()}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Stats Summary */}
      {habits.length > 0 && (
        <Card className="bento-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Статистика місяця</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {habits.map((habit) => {
                const stats = getMonthStats(habit.id);
                return (
                  <div key={habit.id} className="text-center">
                    <div 
                      className="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-2"
                      style={{ backgroundColor: `${habit.color}20`, border: `2px solid ${habit.color}` }}
                    >
                      <span className="font-mono font-bold text-lg" style={{ color: habit.color }}>
                        {stats.percentage}%
                      </span>
                    </div>
                    <p className="text-sm truncate">{habit.name}</p>
                    <p className="text-xs text-muted-foreground">{stats.completedDays} днів</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default HabitsPage;
