import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../App';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Progress } from '../components/ui/progress';
import { ScrollArea } from '../components/ui/scroll-area';
import { Checkbox } from '../components/ui/checkbox';
import { toast } from 'sonner';
import {
  Plus,
  Target,
  Trash2,
  Edit,
  CheckCircle2,
  Circle,
  Loader2,
  Calendar,
  TrendingUp,
  Settings,
} from 'lucide-react';

export const GoalsPage = () => {
  const [goals, setGoals] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [filterCategory, setFilterCategory] = useState('all');
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [metric, setMetric] = useState('');
  const [targetValue, setTargetValue] = useState('');
  const [deadline, setDeadline] = useState('');
  
  // Milestone form
  const [milestoneDialog, setMilestoneDialog] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState(null);
  const [milestoneTitle, setMilestoneTitle] = useState('');

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (categories.length > 0) {
      fetchGoals();
    }
  }, [filterCategory, categories.length]);

  const fetchCategories = async () => {
    try {
      const response = await api.get('/categories?type=goal');
      setCategories(response.data);
      if (response.data.length > 0) {
        setCategory(response.data[0].name);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchGoals = async () => {
    setLoading(true);
    try {
      const params = filterCategory !== 'all' ? `?category=${filterCategory}` : '';
      const response = await api.get(`/goals${params}`);
      setGoals(response.data);
    } catch (error) {
      toast.error('Помилка завантаження цілей');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingGoal) {
        await api.put(`/goals/${editingGoal.id}`, {
          title,
          description,
          category,
          metric,
          target_value: targetValue ? parseFloat(targetValue) : null,
          deadline: deadline || null,
        });
        toast.success('Ціль оновлено');
      } else {
        await api.post('/goals', {
          title,
          description,
          category,
          metric,
          target_value: targetValue ? parseFloat(targetValue) : null,
          deadline: deadline || null,
        });
        toast.success('Ціль створено');
      }
      setDialogOpen(false);
      resetForm();
      fetchGoals();
    } catch (error) {
      toast.error('Помилка збереження');
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/goals/${id}`);
      toast.success('Ціль видалено');
      fetchGoals();
    } catch (error) {
      toast.error('Помилка видалення');
    }
  };

  const handleToggleComplete = async (goal) => {
    try {
      await api.put(`/goals/${goal.id}`, { completed: !goal.completed });
      toast.success(goal.completed ? 'Ціль відкрито' : 'Ціль завершено!');
      fetchGoals();
    } catch (error) {
      toast.error('Помилка оновлення');
    }
  };

  const handleUpdateProgress = async (goal, newValue) => {
    try {
      await api.put(`/goals/${goal.id}`, { current_value: parseFloat(newValue) });
      fetchGoals();
    } catch (error) {
      toast.error('Помилка оновлення');
    }
  };

  const handleAddMilestone = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/goals/${selectedGoalId}/milestones`, { title: milestoneTitle });
      toast.success('Етап додано');
      setMilestoneDialog(false);
      setMilestoneTitle('');
      fetchGoals();
    } catch (error) {
      toast.error('Помилка додавання етапу');
    }
  };

  const handleToggleMilestone = async (goalId, milestone) => {
    try {
      const goal = goals.find(g => g.id === goalId);
      const updatedMilestones = goal.milestones.map(m =>
        m.id === milestone.id ? { ...m, completed: !m.completed } : m
      );
      await api.put(`/goals/${goalId}`, { milestones: updatedMilestones });
      fetchGoals();
    } catch (error) {
      toast.error('Помилка оновлення');
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setCategory(categories.length > 0 ? categories[0].name : '');
    setMetric('');
    setTargetValue('');
    setDeadline('');
    setEditingGoal(null);
  };

  const openEditDialog = (goal) => {
    setEditingGoal(goal);
    setTitle(goal.title);
    setDescription(goal.description || '');
    setCategory(goal.category);
    setMetric(goal.metric || '');
    setTargetValue(goal.target_value?.toString() || '');
    setDeadline(goal.deadline || '');
    setDialogOpen(true);
  };

  const getCategoryInfo = (catName) => {
    const cat = categories.find(c => c.name === catName);
    return cat || { name: catName, color: '#6b7280' };
  };

  if (loading && categories.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const activeGoals = goals.filter(g => !g.completed);
  const completedGoals = goals.filter(g => g.completed);

  return (
    <div className="space-y-6 animate-fadeIn" data-testid="goals-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Цілі</h1>
          <p className="text-muted-foreground mt-1">Ваші довгострокові цілі та прогрес</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-40" data-testid="category-filter">
              <SelectValue placeholder="Всі категорії" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border/40">
              <SelectItem value="all">Всі категорії</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.name}>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                    {cat.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Link to="/settings">
            <Button variant="outline" size="icon" title="Налаштування категорій" data-testid="settings-link">
              <Settings className="h-4 w-4" />
            </Button>
          </Link>
          
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button data-testid="add-goal-btn">
                <Plus className="h-4 w-4 mr-2" />
                Нова ціль
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border/40 max-w-md">
              <DialogHeader>
                <DialogTitle>{editingGoal ? 'Редагувати ціль' : 'Нова ціль'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Назва цілі</Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Наприклад: Заробити $50,000 за рік"
                    required
                    data-testid="goal-title-input"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Опис</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Детальний опис цілі..."
                    rows={3}
                    data-testid="goal-description-input"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Категорія</Label>
                      <Link to="/settings" className="text-xs text-muted-foreground hover:text-foreground">
                        + Додати
                      </Link>
                    </div>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger data-testid="goal-category-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border/40">
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.name}>
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                              {cat.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Дедлайн</Label>
                    <Input
                      type="date"
                      value={deadline}
                      onChange={(e) => setDeadline(e.target.value)}
                      data-testid="goal-deadline-input"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Метрика</Label>
                    <Input
                      value={metric}
                      onChange={(e) => setMetric(e.target.value)}
                      placeholder="Дохід, тренування..."
                      data-testid="goal-metric-input"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Цільове значення</Label>
                    <Input
                      type="number"
                      value={targetValue}
                      onChange={(e) => setTargetValue(e.target.value)}
                      placeholder="50000"
                      data-testid="goal-target-input"
                    />
                  </div>
                </div>
                
                <Button type="submit" className="w-full" data-testid="submit-goal-btn">
                  {editingGoal ? 'Зберегти зміни' : 'Створити ціль'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bento-card">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="data-value">{goals.length}</p>
              <p className="label-uppercase mt-1">Всього цілей</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bento-card">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="data-value text-[hsl(var(--tasks))]">{activeGoals.length}</p>
              <p className="label-uppercase mt-1">Активних</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bento-card">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="data-value text-[hsl(var(--finance-profit))]">{completedGoals.length}</p>
              <p className="label-uppercase mt-1">Завершених</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bento-card">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="data-value">
                {goals.length > 0 ? Math.round(completedGoals.length / goals.length * 100) : 0}%
              </p>
              <p className="label-uppercase mt-1">Успішність</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Goals Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {goals.length === 0 ? (
          <Card className="bento-card col-span-full">
            <CardContent className="py-12 text-center">
              <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Немає цілей. Створіть першу ціль!</p>
            </CardContent>
          </Card>
        ) : (
          goals.map((goal) => {
            const catInfo = getCategoryInfo(goal.category);
            const progress = goal.target_value > 0 ? (goal.current_value / goal.target_value) * 100 : 0;
            const completedMilestones = goal.milestones?.filter(m => m.completed).length || 0;
            
            return (
              <Card 
                key={goal.id} 
                className={`bento-card ${goal.completed ? 'opacity-60' : ''}`}
                data-testid={`goal-card-${goal.id}`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: catInfo.color }}
                      />
                      <span className="text-xs text-muted-foreground">{catInfo.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleToggleComplete(goal)}
                        data-testid={`toggle-goal-${goal.id}`}
                      >
                        {goal.completed ? (
                          <CheckCircle2 className="h-4 w-4 text-[hsl(var(--finance-profit))]" />
                        ) : (
                          <Circle className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEditDialog(goal)}
                        data-testid={`edit-goal-${goal.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(goal.id)}
                        data-testid={`delete-goal-${goal.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <CardTitle className={`text-lg ${goal.completed ? 'line-through' : ''}`}>
                    {goal.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {goal.description && (
                    <p className="text-sm text-muted-foreground">{goal.description}</p>
                  )}
                  
                  {/* Progress */}
                  {goal.target_value > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{goal.metric || 'Прогрес'}</span>
                        <span className="font-mono">
                          {goal.current_value} / {goal.target_value}
                        </span>
                      </div>
                      <Progress value={progress} className="h-2" />
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          placeholder="Оновити прогрес"
                          className="h-8 text-sm"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleUpdateProgress(goal, e.target.value);
                              e.target.value = '';
                            }
                          }}
                          data-testid={`progress-input-${goal.id}`}
                        />
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  )}
                  
                  {/* Deadline */}
                  {goal.deadline && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>Дедлайн: {new Date(goal.deadline).toLocaleDateString('uk-UA')}</span>
                    </div>
                  )}
                  
                  {/* Milestones */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="label-uppercase">
                        Етапи ({completedMilestones}/{goal.milestones?.length || 0})
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => {
                          setSelectedGoalId(goal.id);
                          setMilestoneDialog(true);
                        }}
                        data-testid={`add-milestone-${goal.id}`}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Етап
                      </Button>
                    </div>
                    {goal.milestones?.length > 0 && (
                      <ScrollArea className="h-24">
                        <div className="space-y-1">
                          {goal.milestones.map((ms) => (
                            <div
                              key={ms.id}
                              className="flex items-center gap-2 p-1.5 rounded hover:bg-accent/30 cursor-pointer"
                              onClick={() => handleToggleMilestone(goal.id, ms)}
                            >
                              <Checkbox checked={ms.completed} className="h-4 w-4" />
                              <span className={`text-sm ${ms.completed ? 'line-through text-muted-foreground' : ''}`}>
                                {ms.title}
                              </span>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Milestone Dialog */}
      <Dialog open={milestoneDialog} onOpenChange={setMilestoneDialog}>
        <DialogContent className="bg-card border-border/40">
          <DialogHeader>
            <DialogTitle>Додати етап</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddMilestone} className="space-y-4">
            <div className="space-y-2">
              <Label>Назва етапу</Label>
              <Input
                value={milestoneTitle}
                onChange={(e) => setMilestoneTitle(e.target.value)}
                placeholder="Наприклад: Завершити перший модуль"
                required
                data-testid="milestone-title-input"
              />
            </div>
            <Button type="submit" className="w-full" data-testid="submit-milestone-btn">
              Додати
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GoalsPage;
