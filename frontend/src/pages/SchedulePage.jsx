import React, { useState, useEffect } from 'react';
import { api } from '../App';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { ScrollArea } from '../components/ui/scroll-area';
import { toast } from 'sonner';
import {
  Plus,
  Calendar,
  Clock,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react';

const BLOCK_COLORS = [
  { value: '#3b82f6', label: 'Синій' },
  { value: '#10b981', label: 'Зелений' },
  { value: '#8b5cf6', label: 'Фіолетовий' },
  { value: '#f59e0b', label: 'Жовтий' },
  { value: '#f43f5e', label: 'Червоний' },
  { value: '#6b7280', label: 'Сірий' },
];

const TIME_SLOTS = Array.from({ length: 24 }, (_, i) => {
  const hour = i.toString().padStart(2, '0');
  return `${hour}:00`;
});

export const SchedulePage = () => {
  const [blocks, setBlocks] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  
  // Form state
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [color, setColor] = useState('#3b82f6');
  const [taskId, setTaskId] = useState('');

  useEffect(() => {
    fetchData();
  }, [selectedDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [blocksRes, tasksRes] = await Promise.all([
        api.get(`/schedule?date=${selectedDate}`),
        api.get('/tasks?completed=false'),
      ]);
      setBlocks(blocksRes.data);
      setTasks(tasksRes.data);
    } catch (error) {
      toast.error('Помилка завантаження');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/schedule', {
        title,
        start_time: startTime,
        end_time: endTime,
        date: selectedDate,
        color,
        task_id: taskId || null,
      });
      toast.success('Блок додано');
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error('Помилка створення');
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/schedule/${id}`);
      toast.success('Блок видалено');
      fetchData();
    } catch (error) {
      toast.error('Помилка видалення');
    }
  };

  const resetForm = () => {
    setTitle('');
    setStartTime('09:00');
    setEndTime('10:00');
    setColor('#3b82f6');
    setTaskId('');
  };

  const navigateDay = (direction) => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + direction);
    setSelectedDate(date.toISOString().slice(0, 10));
  };

  const getBlockPosition = (startTime, endTime) => {
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    
    const top = (startHour * 60 + startMin) / (24 * 60) * 100;
    const height = ((endHour * 60 + endMin) - (startHour * 60 + startMin)) / (24 * 60) * 100;
    
    return { top: `${top}%`, height: `${Math.max(height, 2)}%` };
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const options = { weekday: 'long', day: 'numeric', month: 'long' };
    return date.toLocaleDateString('uk-UA', options);
  };

  const isToday = selectedDate === new Date().toISOString().slice(0, 10);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Get current hour for time indicator
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const timeIndicatorPosition = (currentHour * 60 + currentMinute) / (24 * 60) * 100;

  return (
    <div className="space-y-6 animate-fadeIn" data-testid="schedule-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Розклад</h1>
          <p className="text-muted-foreground mt-1">Плануйте свій день з time blocking</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="add-block-btn">
              <Plus className="h-4 w-4 mr-2" />
              Новий блок
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border/40">
            <DialogHeader>
              <DialogTitle>Новий часовий блок</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Назва</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Наприклад: Глибока робота"
                  required
                  data-testid="block-title-input"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Початок</Label>
                  <Select value={startTime} onValueChange={setStartTime}>
                    <SelectTrigger data-testid="start-time-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border/40 max-h-48">
                      {TIME_SLOTS.map((time) => (
                        <SelectItem key={time} value={time}>{time}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Кінець</Label>
                  <Select value={endTime} onValueChange={setEndTime}>
                    <SelectTrigger data-testid="end-time-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border/40 max-h-48">
                      {TIME_SLOTS.map((time) => (
                        <SelectItem key={time} value={time}>{time}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Колір</Label>
                <div className="flex gap-2">
                  {BLOCK_COLORS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      className={`w-8 h-8 rounded-full transition-transform ${color === c.value ? 'ring-2 ring-white ring-offset-2 ring-offset-background scale-110' : ''}`}
                      style={{ backgroundColor: c.value }}
                      onClick={() => setColor(c.value)}
                      title={c.label}
                    />
                  ))}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Пов'язане завдання (опціонально)</Label>
                <Select value={taskId} onValueChange={setTaskId}>
                  <SelectTrigger data-testid="task-select">
                    <SelectValue placeholder="Оберіть завдання" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border/40">
                    <SelectItem value="">Без завдання</SelectItem>
                    {tasks.map((task) => (
                      <SelectItem key={task.id} value={task.id}>{task.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <Button type="submit" className="w-full" data-testid="submit-block-btn">
                Додати блок
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Date Navigation */}
      <Card className="bento-card">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={() => navigateDay(-1)} data-testid="prev-day-btn">
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="text-center">
              <h2 className="text-lg font-semibold capitalize">{formatDate(selectedDate)}</h2>
              {isToday && <span className="text-xs text-muted-foreground">Сьогодні</span>}
            </div>
            <Button variant="ghost" size="icon" onClick={() => navigateDay(1)} data-testid="next-day-btn">
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Schedule Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Time Blocks View */}
        <Card className="bento-card lg:col-span-2" data-testid="schedule-grid">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4" />
              Розклад дня
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px]">
              <div className="relative" style={{ height: '1440px' }}>
                {/* Time labels */}
                {TIME_SLOTS.filter((_, i) => i % 2 === 0).map((time, i) => (
                  <div
                    key={time}
                    className="absolute left-0 w-12 text-xs text-muted-foreground font-mono"
                    style={{ top: `${(i * 2) / 24 * 100}%` }}
                  >
                    {time}
                  </div>
                ))}
                
                {/* Grid lines */}
                {TIME_SLOTS.map((_, i) => (
                  <div
                    key={i}
                    className="absolute left-14 right-0 border-t border-border/30"
                    style={{ top: `${i / 24 * 100}%` }}
                  />
                ))}
                
                {/* Current time indicator */}
                {isToday && (
                  <div
                    className="absolute left-14 right-0 border-t-2 border-[hsl(var(--finance-loss))] z-10"
                    style={{ top: `${timeIndicatorPosition}%` }}
                  >
                    <div className="absolute -left-1 -top-1.5 w-3 h-3 rounded-full bg-[hsl(var(--finance-loss))]" />
                  </div>
                )}
                
                {/* Time blocks */}
                {blocks.map((block) => {
                  const position = getBlockPosition(block.start_time, block.end_time);
                  return (
                    <div
                      key={block.id}
                      className="absolute left-14 right-0 rounded-lg p-2 overflow-hidden group"
                      style={{
                        top: position.top,
                        height: position.height,
                        backgroundColor: `${block.color}30`,
                        borderLeft: `3px solid ${block.color}`,
                      }}
                      data-testid={`block-${block.id}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{block.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {block.start_time} - {block.end_time}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleDelete(block.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Summary & Quick Add */}
        <div className="space-y-4">
          <Card className="bento-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Сьогоднішній план</CardTitle>
            </CardHeader>
            <CardContent>
              {blocks.length === 0 ? (
                <p className="text-sm text-muted-foreground">Немає запланованих блоків</p>
              ) : (
                <div className="space-y-2">
                  {blocks.sort((a, b) => a.start_time.localeCompare(b.start_time)).map((block) => (
                    <div
                      key={block.id}
                      className="flex items-center gap-2 p-2 rounded-lg bg-accent/20"
                    >
                      <div 
                        className="w-2 h-8 rounded-full flex-shrink-0"
                        style={{ backgroundColor: block.color }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{block.title}</p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {block.start_time} - {block.end_time}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bento-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Статистика</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Блоків сьогодні</span>
                  <span className="font-mono font-semibold">{blocks.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Заплановано годин</span>
                  <span className="font-mono font-semibold">
                    {blocks.reduce((acc, b) => {
                      const [sh, sm] = b.start_time.split(':').map(Number);
                      const [eh, em] = b.end_time.split(':').map(Number);
                      return acc + (eh * 60 + em - sh * 60 - sm) / 60;
                    }, 0).toFixed(1)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bento-card gradient-tasks">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Ключова задача дня</CardTitle>
            </CardHeader>
            <CardContent>
              {tasks.filter(t => t.priority === 'high').length > 0 ? (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[hsl(var(--finance-loss))]" />
                  <p className="text-sm">{tasks.find(t => t.priority === 'high')?.title}</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Немає задач з високим пріоритетом</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SchedulePage;
