import React, { useState, useEffect } from 'react';
import { api } from '../App';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { ScrollArea } from '../components/ui/scroll-area';
import { toast } from 'sonner';
import {
  Settings,
  DollarSign,
  Tag,
  Plus,
  Edit,
  Trash2,
  Loader2,
  Palette,
} from 'lucide-react';

const CATEGORY_COLORS = [
  '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#f43f5e', 
  '#ec4899', '#6366f1', '#14b8a6', '#ef4444', '#f97316',
  '#eab308', '#6b7280', '#84cc16', '#06b6d4', '#a855f7',
];

export const SettingsPage = () => {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState(null);
  const [currencies, setCurrencies] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedTab, setSelectedTab] = useState('currency');
  const [categoryTab, setCategoryTab] = useState('income');
  
  // Category dialog
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [catName, setCatName] = useState('');
  const [catColor, setCatColor] = useState(CATEGORY_COLORS[0]);
  const [catType, setCatType] = useState('income');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [settingsRes, currenciesRes, categoriesRes] = await Promise.all([
        api.get('/settings'),
        api.get('/settings/currencies'),
        api.get('/categories'),
      ]);
      setSettings(settingsRes.data);
      setCurrencies(currenciesRes.data);
      setCategories(categoriesRes.data);
    } catch (error) {
      toast.error('Помилка завантаження налаштувань');
    } finally {
      setLoading(false);
    }
  };

  const handleCurrencyChange = async (code) => {
    const currency = currencies.find(c => c.code === code);
    if (!currency) return;
    
    try {
      await api.put('/settings', {
        currency: currency.code,
        currency_symbol: currency.symbol,
      });
      setSettings(prev => ({
        ...prev,
        currency: currency.code,
        currency_symbol: currency.symbol,
      }));
      toast.success(`Валюту змінено на ${currency.name}`);
    } catch (error) {
      toast.error('Помилка зміни валюти');
    }
  };

  const handleCategorySubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCategory) {
        await api.put(`/categories/${editingCategory.id}`, {
          name: catName,
          color: catColor,
        });
        toast.success('Категорію оновлено');
      } else {
        await api.post('/categories', {
          name: catName,
          type: catType,
          color: catColor,
        });
        toast.success('Категорію створено');
      }
      setCatDialogOpen(false);
      resetCatForm();
      fetchData();
    } catch (error) {
      toast.error('Помилка збереження');
    }
  };

  const handleDeleteCategory = async (id) => {
    try {
      await api.delete(`/categories/${id}`);
      toast.success('Категорію видалено');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Помилка видалення');
    }
  };

  const openEditDialog = (cat) => {
    setEditingCategory(cat);
    setCatName(cat.name);
    setCatColor(cat.color);
    setCatType(cat.type);
    setCatDialogOpen(true);
  };

  const resetCatForm = () => {
    setEditingCategory(null);
    setCatName('');
    setCatColor(CATEGORY_COLORS[0]);
  };

  const openAddDialog = (type) => {
    resetCatForm();
    setCatType(type);
    setCatDialogOpen(true);
  };

  const getCategoriesByType = (type) => categories.filter(c => c.type === type);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn" data-testid="settings-page">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Налаштування</h1>
        <p className="text-muted-foreground mt-1">Керуйте валютою та категоріями</p>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="currency" data-testid="currency-tab">
            <DollarSign className="h-4 w-4 mr-2" />
            Валюта
          </TabsTrigger>
          <TabsTrigger value="categories" data-testid="categories-tab">
            <Tag className="h-4 w-4 mr-2" />
            Категорії
          </TabsTrigger>
        </TabsList>

        {/* Currency Tab */}
        <TabsContent value="currency">
          <Card className="bento-card max-w-md">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <DollarSign className="h-4 w-4" />
                Валюта для відображення
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Оберіть валюту, яка буде використовуватись для відображення сум у фінансах.
                </p>
                <Select value={settings?.currency || 'USD'} onValueChange={handleCurrencyChange}>
                  <SelectTrigger data-testid="currency-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border/40">
                    {currencies.map((cur) => (
                      <SelectItem key={cur.code} value={cur.code}>
                        <div className="flex items-center gap-2">
                          <span className="font-mono w-6">{cur.symbol}</span>
                          <span>{cur.name} ({cur.code})</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="p-4 bg-accent/30 rounded-lg">
                  <p className="text-sm">
                    Поточна валюта: <span className="font-semibold">{settings?.currency_symbol} ({settings?.currency})</span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories">
          <Card className="bento-card">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Tag className="h-4 w-4" />
                Управління категоріями
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={categoryTab} onValueChange={setCategoryTab}>
                <TabsList className="mb-4">
                  <TabsTrigger value="income">Доходи</TabsTrigger>
                  <TabsTrigger value="expense">Витрати</TabsTrigger>
                  <TabsTrigger value="task">Завдання</TabsTrigger>
                  <TabsTrigger value="goal">Цілі</TabsTrigger>
                </TabsList>

                {['income', 'expense', 'task', 'goal'].map((type) => (
                  <TabsContent key={type} value={type}>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <p className="text-sm text-muted-foreground">
                          {type === 'income' && 'Категорії доходів для фінансового трекера'}
                          {type === 'expense' && 'Категорії витрат для фінансового трекера'}
                          {type === 'task' && 'Категорії для завдань'}
                          {type === 'goal' && 'Категорії для цілей'}
                        </p>
                        <Button size="sm" onClick={() => openAddDialog(type)} data-testid={`add-${type}-category-btn`}>
                          <Plus className="h-4 w-4 mr-1" />
                          Додати
                        </Button>
                      </div>
                      
                      <ScrollArea className="h-[300px]">
                        <div className="space-y-2">
                          {getCategoriesByType(type).map((cat) => (
                            <div
                              key={cat.id}
                              className="flex items-center justify-between p-3 rounded-lg bg-accent/20 hover:bg-accent/30 transition-colors"
                              data-testid={`category-${cat.id}`}
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className="w-4 h-4 rounded-full"
                                  style={{ backgroundColor: cat.color }}
                                />
                                <span className="text-sm">{cat.name}</span>
                                {cat.is_default && (
                                  <span className="text-xs text-muted-foreground px-1.5 py-0.5 bg-accent rounded">
                                    За замовч.
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => openEditDialog(cat)}
                                  data-testid={`edit-cat-${cat.id}`}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                {!cat.is_default && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                    onClick={() => handleDeleteCategory(cat.id)}
                                    data-testid={`delete-cat-${cat.id}`}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                          {getCategoriesByType(type).length === 0 && (
                            <p className="text-sm text-muted-foreground text-center py-8">
                              Немає категорій цього типу
                            </p>
                          )}
                        </div>
                      </ScrollArea>
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Category Dialog */}
      <Dialog open={catDialogOpen} onOpenChange={(open) => { setCatDialogOpen(open); if (!open) resetCatForm(); }}>
        <DialogContent className="bg-card border-border/40">
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'Редагувати категорію' : 'Нова категорія'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCategorySubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Назва категорії</Label>
              <Input
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                placeholder="Наприклад: Рекламні інтеграції"
                required
                data-testid="category-name-input"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Колір</Label>
              <div className="flex gap-2 flex-wrap">
                {CATEGORY_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`w-8 h-8 rounded-full transition-transform ${catColor === c ? 'ring-2 ring-white ring-offset-2 ring-offset-background scale-110' : ''}`}
                    style={{ backgroundColor: c }}
                    onClick={() => setCatColor(c)}
                  />
                ))}
              </div>
            </div>
            
            <Button type="submit" className="w-full" data-testid="submit-category-btn">
              {editingCategory ? 'Зберегти зміни' : 'Створити категорію'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SettingsPage;
