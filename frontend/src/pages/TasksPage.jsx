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
import { Checkbox } from '../components/ui/checkbox';
import { ScrollArea } from '../components/ui/scroll-area';
import { toast } from 'sonner';
import {
  Plus,
  CheckSquare,
  Trash2,
  Edit,
  GripVertical,
  Loader2,
  Calendar,
  Filter,
  Settings,
} from 'lucide-react';

const PRIORITIES = [
  { value: 'high', label: 'Високий', color: '#f43f5e' },
  { value: 'medium', label: 'Середній', color: '#f59e0b' },
  { value: 'low', label: 'Низький', color: '#3b82f6' },
];

export const TasksPage = () => {
  const [tasks, setTasks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [filterCategory, setFilterCategory] = useState('all');
  const [showCompleted, setShowCompleted] = useState(false);
  const [draggedTask, setDraggedTask] = useState(null);
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState('medium');
  const [deadline, setDeadline] = useState('');

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (categories.length > 0) {
      fetchTasks();
    }
  }, [filterCategory, showCompleted, categories.length]);

  const fetchCategories = async () => {
    try {
      const response = await api.get('/categories?type=task');
      setCategories(response.data);
      if (response.data.length > 0) {
        setCategory(response.data[0].name);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchTasks = async () => {
    setLoading(true);
    try {
      let url = '/tasks';
      const params = [];
      if (filterCategory !== 'all') params.push(`category=${filterCategory}`);
      if (!showCompleted) params.push('completed=false');
      if (params.length > 0) url += '?' + params.join('&');
      
      const response = await api.get(url);
      setTasks(response.data);
    } catch (error) {
      toast.error('Помилка завантаження завдань');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingTask) {
        await api.put(`/tasks/${editingTask.id}`, {
          title,
          description,
          category,
          priority,
          deadline: deadline || null,
        });
        toast.success('Завдання оновлено');
      } else {
        await api.post('/tasks', {
          title,
          description,
          category,
          priority,
          deadline: deadline || null,
        });
        toast.success('Завдання створено');
      }
      setDialogOpen(false);
      resetForm();
      fetchTasks();
    } catch (error) {
      toast.error('Помилка збереження');
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/tasks/${id}`);
      toast.success('Завдання видалено');
      fetchTasks();
    } catch (error) {
      toast.error('Помилка видалення');
    }
  };

  const handleToggleComplete = async (task) => {
    try {
      await api.put(`/tasks/${task.id}`, { completed: !task.completed });
      toast.success(task.completed ? 'Завдання відкрито' : 'Завдання виконано!');
      fetchTasks();
    } catch (error) {
      toast.error('Помилка оновлення');
    }
  };

  const handleDragStart = (task) => {
    setDraggedTask(task);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = async (targetTask) => {
    if (!draggedTask || draggedTask.id === targetTask.id) return;
    
    const newTasks = [...tasks];
    const draggedIndex = newTasks.findIndex(t => t.id === draggedTask.id);
    const targetIndex = newTasks.findIndex(t => t.id === targetTask.id);
    
    newTasks.splice(draggedIndex, 1);
    newTasks.splice(targetIndex, 0, draggedTask);
    
    setTasks(newTasks);
    setDraggedTask(null);
    
    try {
      await api.post('/tasks/reorder', { task_ids: newTasks.map(t => t.id) });
    } catch (error) {
      fetchTasks(); // Revert on error
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setCategory(categories.length > 0 ? categories[0].name : '');
    setPriority('medium');
    setDeadline('');
    setEditingTask(null);
  };

  const openEditDialog = (task) => {
    setEditingTask(task);
    setTitle(task.title);
    setDescription(task.description || '');
    setCategory(task.category);
    setPriority(task.priority);
    setDeadline(task.deadline || '');
    setDialogOpen(true);
  };

  const getCategoryInfo = (catName) => {
    const cat = categories.find(c => c.name === catName);
    return cat || { name: catName, color: '#6b7280' };
  };
  const getPriorityInfo = (pri) => PRIORITIES.find(p => p.value === pri) || PRIORITIES[1];

  if (loading && categories.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn" data-testid="tasks-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Завдання</h1>
          <p className="text-muted-foreground mt-1">Керуйте своїми завданнями та пріоритетами</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-40" data-testid="category-filter">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Категорія" />
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
          
          <div className="flex items-center gap-2">
            <Checkbox 
              checked={showCompleted} 
              onCheckedChange={setShowCompleted}
              id="show-completed"
              data-testid="show-completed-checkbox"
            />
            <label htmlFor="show-completed" className="text-sm text-muted-foreground">
              Виконані
            </label>
          </div>
          
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button data-testid="add-task-btn">
                <Plus className="h-4 w-4 mr-2" />
                Нове завдання
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border/40">
              <DialogHeader>
                <DialogTitle>{editingTask ? 'Редагувати завдання' : 'Нове завдання'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Назва завдання</Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Що потрібно зробити?"
                    required
                    data-testid="task-title-input"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Опис</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Деталі завдання..."
                    rows={2}
                    data-testid="task-description-input"
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
                      <SelectTrigger data-testid="task-category-select">
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
                    <Label>Пріоритет</Label>
                    <Select value={priority} onValueChange={setPriority}>
                      <SelectTrigger data-testid="task-priority-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border/40">
                        {PRIORITIES.map((pri) => (
                          <SelectItem key={pri.value} value={pri.value}>
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: pri.color }} />
                              {pri.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Дедлайн</Label>
                  <Input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    data-testid="task-deadline-input"
                  />
                </div>
                
                <Button type="submit" className="w-full" data-testid="submit-task-btn">
                  {editingTask ? 'Зберегти зміни' : 'Створити завдання'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {categories.slice(0, 5).map((cat) => {
          const categoryTasks = tasks.filter(t => t.category === cat.name);
          const completed = categoryTasks.filter(t => t.completed).length;
          
          return (
            <Card key={cat.id} className="bento-card">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                  <span className="text-xs text-muted-foreground truncate">{cat.name}</span>
                </div>
                <p className="data-value text-lg">{categoryTasks.length - completed}</p>
                <p className="text-xs text-muted-foreground">активних</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Tasks List */}
      <Card className="bento-card" data-testid="tasks-list-card">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <CheckSquare className="h-4 w-4 text-[hsl(var(--tasks))]" />
            Список завдань ({tasks.filter(t => !t.completed).length} активних)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            {tasks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Немає завдань</p>
            ) : (
              <div className="space-y-2">
                {tasks.map((task) => {
                  const catInfo = getCategoryInfo(task.category);
                  const priInfo = getPriorityInfo(task.priority);
                  
                  return (
                    <div
                      key={task.id}
                      className={`
                        flex items-center gap-3 p-3 rounded-lg bg-accent/20 hover:bg-accent/30 
                        transition-all cursor-grab active:cursor-grabbing
                        ${task.completed ? 'opacity-50' : ''}
                        ${task.priority === 'high' ? 'priority-high' : task.priority === 'medium' ? 'priority-medium' : 'priority-low'}
                        ${draggedTask?.id === task.id ? 'opacity-50 scale-[0.98]' : ''}
                      `}
                      draggable
                      onDragStart={() => handleDragStart(task)}
                      onDragOver={handleDragOver}
                      onDrop={() => handleDrop(task)}
                      data-testid={`task-item-${task.id}`}
                    >
                      <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      
                      <Checkbox
                        checked={task.completed}
                        onCheckedChange={() => handleToggleComplete(task)}
                        className="flex-shrink-0"
                        data-testid={`task-checkbox-${task.id}`}
                      />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`text-sm font-medium ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
                            {task.title}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span 
                            className="text-xs px-1.5 py-0.5 rounded"
                            style={{ backgroundColor: `${catInfo.color}20`, color: catInfo.color }}
                          >
                            {catInfo.name}
                          </span>
                          {task.deadline && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(task.deadline).toLocaleDateString('uk-UA')}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <div 
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: priInfo.color }}
                          title={priInfo.label}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEditDialog(task)}
                          data-testid={`edit-task-${task.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDelete(task.id)}
                          data-testid={`delete-task-${task.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default TasksPage;
