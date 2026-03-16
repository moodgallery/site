import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../App';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { ScrollArea } from '../components/ui/scroll-area';
import { Progress } from '../components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';
import {
  Plus,
  Wallet,
  TrendingUp,
  TrendingDown,
  Trash2,
  Target,
  Loader2,
  Settings,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export const FinancePage = () => {
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  
  // Categories & Settings
  const [incomeCategories, setIncomeCategories] = useState([]);
  const [expenseCategories, setExpenseCategories] = useState([]);
  const [settings, setSettings] = useState({ currency: 'USD', currency_symbol: '$' });
  
  // Form state
  const [transType, setTransType] = useState('income');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [transDate, setTransDate] = useState(new Date().toISOString().slice(0, 10));
  
  // Goal form state
  const [goalTitle, setGoalTitle] = useState('');
  const [goalAmount, setGoalAmount] = useState('');

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (incomeCategories.length > 0) {
      fetchData();
    }
  }, [selectedMonth, incomeCategories.length]);

  const fetchInitialData = async () => {
    try {
      const [settingsRes, incomeCatRes, expenseCatRes] = await Promise.all([
        api.get('/settings'),
        api.get('/categories?type=income'),
        api.get('/categories?type=expense'),
      ]);
      setSettings(settingsRes.data);
      setIncomeCategories(incomeCatRes.data);
      setExpenseCategories(expenseCatRes.data);
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [transRes, summaryRes, goalsRes] = await Promise.all([
        api.get(`/finance/transactions?month=${selectedMonth}`),
        api.get(`/finance/summary?month=${selectedMonth}`),
        api.get('/finance/goals'),
      ]);
      setTransactions(transRes.data);
      setSummary(summaryRes.data);
      setGoals(goalsRes.data);
    } catch (error) {
      toast.error('Помилка завантаження');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTransaction = async (e) => {
    e.preventDefault();
    try {
      await api.post('/finance/transactions', {
        type: transType,
        amount: parseFloat(amount),
        category,
        description,
        date: transDate,
      });
      toast.success('Транзакцію додано');
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error('Помилка додавання');
    }
  };

  const handleDeleteTransaction = async (id) => {
    try {
      await api.delete(`/finance/transactions/${id}`);
      toast.success('Транзакцію видалено');
      fetchData();
    } catch (error) {
      toast.error('Помилка видалення');
    }
  };

  const handleAddGoal = async (e) => {
    e.preventDefault();
    try {
      await api.post('/finance/goals', {
        title: goalTitle,
        target_amount: parseFloat(goalAmount),
        month: selectedMonth,
      });
      toast.success('Ціль додано');
      setGoalDialogOpen(false);
      setGoalTitle('');
      setGoalAmount('');
      fetchData();
    } catch (error) {
      toast.error('Помилка додавання цілі');
    }
  };

  const resetForm = () => {
    setAmount('');
    setCategory('');
    setDescription('');
    setTransDate(new Date().toISOString().slice(0, 10));
  };

  const getCategoryInfo = (catName, type) => {
    const cats = type === 'income' ? incomeCategories : expenseCategories;
    return cats.find(c => c.name === catName) || { name: catName, color: '#6b7280' };
  };

  const cs = settings.currency_symbol || '$';

  // Prepare chart data
  const incomeChartData = Object.entries(summary?.income_by_category || {}).map(([key, value]) => {
    const cat = getCategoryInfo(key, 'income');
    return {
      name: key,
      value,
      color: cat.color || '#6b7280',
    };
  });

  const expenseChartData = Object.entries(summary?.expense_by_category || {}).map(([key, value]) => {
    const cat = getCategoryInfo(key, 'expense');
    return {
      name: key,
      value,
      color: cat.color || '#6b7280',
    };
  });

  // Monthly trend (last 6 months mock)
  const monthlyTrend = [
    { month: 'Лип', income: 5000, expense: 3000 },
    { month: 'Сер', income: 6200, expense: 3500 },
    { month: 'Вер', income: 5800, expense: 3200 },
    { month: 'Жов', income: 7100, expense: 4000 },
    { month: 'Лис', income: 8500, expense: 4200 },
    { month: 'Гру', income: summary?.total_income || 0, expense: summary?.total_expense || 0 },
  ];

  if (loading && incomeCategories.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const currentGoal = goals.find(g => g.month === selectedMonth);
  const currentCategories = transType === 'income' ? incomeCategories : expenseCategories;

  return (
    <div className="space-y-6 animate-fadeIn" data-testid="finance-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Фінанси</h1>
          <p className="text-muted-foreground mt-1">Відстежуйте доходи та витрати</p>
        </div>
        <div className="flex items-center gap-3">
          <Input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-40"
            data-testid="month-selector"
          />
          <Link to="/settings">
            <Button variant="outline" size="icon" title="Налаштування категорій" data-testid="settings-link">
              <Settings className="h-4 w-4" />
            </Button>
          </Link>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="add-transaction-btn">
                <Plus className="h-4 w-4 mr-2" />
                Додати
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border/40">
              <DialogHeader>
                <DialogTitle>Нова транзакція</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddTransaction} className="space-y-4">
                <Tabs value={transType} onValueChange={(v) => { setTransType(v); setCategory(''); }}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="income" data-testid="income-tab">Дохід</TabsTrigger>
                    <TabsTrigger value="expense" data-testid="expense-tab">Витрата</TabsTrigger>
                  </TabsList>
                </Tabs>
                
                <div className="space-y-2">
                  <Label>Сума ({cs})</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    data-testid="amount-input"
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Категорія</Label>
                    <Link to="/settings" className="text-xs text-muted-foreground hover:text-foreground">
                      + Додати категорію
                    </Link>
                  </div>
                  <Select value={category} onValueChange={setCategory} required>
                    <SelectTrigger data-testid="category-select">
                      <SelectValue placeholder="Оберіть категорію" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border/40">
                      {currentCategories.map((cat) => (
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
                  <Label>Опис (опціонально)</Label>
                  <Input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Деталі транзакції"
                    data-testid="description-input"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Дата</Label>
                  <Input
                    type="date"
                    value={transDate}
                    onChange={(e) => setTransDate(e.target.value)}
                    required
                    data-testid="date-input"
                  />
                </div>
                
                <Button type="submit" className="w-full" data-testid="submit-transaction-btn">
                  Додати транзакцію
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bento-card gradient-finance" data-testid="income-summary-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[hsl(var(--finance-profit))]/10">
                <TrendingUp className="h-5 w-5 text-[hsl(var(--finance-profit))]" />
              </div>
              <div>
                <p className="label-uppercase">Дохід</p>
                <p className="data-value finance-positive">{cs}{summary?.total_income?.toLocaleString() || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bento-card" data-testid="expense-summary-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[hsl(var(--finance-loss))]/10">
                <TrendingDown className="h-5 w-5 text-[hsl(var(--finance-loss))]" />
              </div>
              <div>
                <p className="label-uppercase">Витрати</p>
                <p className="data-value finance-negative">{cs}{summary?.total_expense?.toLocaleString() || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bento-card" data-testid="balance-summary-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent">
                <Wallet className="h-5 w-5" />
              </div>
              <div>
                <p className="label-uppercase">Баланс</p>
                <p className={`data-value ${summary?.balance >= 0 ? 'finance-positive' : 'finance-negative'}`}>
                  {cs}{summary?.balance?.toLocaleString() || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Financial Goal */}
      <Card className="bento-card" data-testid="financial-goal-card">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-4 w-4 text-[hsl(var(--goals))]" />
            Фінансова ціль на місяць
          </CardTitle>
          <Dialog open={goalDialogOpen} onOpenChange={setGoalDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" data-testid="add-goal-btn">
                <Plus className="h-4 w-4 mr-1" />
                Ціль
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border/40">
              <DialogHeader>
                <DialogTitle>Нова фінансова ціль</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddGoal} className="space-y-4">
                <div className="space-y-2">
                  <Label>Назва цілі</Label>
                  <Input
                    value={goalTitle}
                    onChange={(e) => setGoalTitle(e.target.value)}
                    placeholder={`Наприклад: Дохід ${cs}10,000`}
                    required
                    data-testid="goal-title-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Цільова сума ({cs})</Label>
                  <Input
                    type="number"
                    value={goalAmount}
                    onChange={(e) => setGoalAmount(e.target.value)}
                    placeholder="10000"
                    required
                    data-testid="goal-amount-input"
                  />
                </div>
                <Button type="submit" className="w-full" data-testid="submit-goal-btn">
                  Створити ціль
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {currentGoal ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-medium">{currentGoal.title}</span>
                <span className="text-sm text-muted-foreground">
                  {cs}{summary?.total_income?.toLocaleString() || 0} / {cs}{currentGoal.target_amount.toLocaleString()}
                </span>
              </div>
              <Progress value={(summary?.total_income || 0) / currentGoal.target_amount * 100} className="h-3" />
              <p className="text-sm text-muted-foreground">
                {Math.round((summary?.total_income || 0) / currentGoal.target_amount * 100)}% досягнуто
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Немає цілі на цей місяць</p>
          )}
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Income by Category */}
        <Card className="bento-card" data-testid="income-chart-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Дохід по категоріях</CardTitle>
          </CardHeader>
          <CardContent>
            {incomeChartData.length > 0 ? (
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={incomeChartData}
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {incomeChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                      formatter={(value) => [`${cs}${value.toLocaleString()}`, '']}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-2 justify-center mt-2">
                  {incomeChartData.map((item, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-muted-foreground">{item.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">Немає даних</p>
            )}
          </CardContent>
        </Card>

        {/* Monthly Trend */}
        <Card className="bento-card" data-testid="trend-chart-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Динаміка за 6 місяців</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyTrend}>
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                    formatter={(value) => [`${cs}${value.toLocaleString()}`, '']}
                  />
                  <Bar dataKey="income" fill="hsl(var(--finance-profit))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" fill="hsl(var(--finance-loss))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transactions List */}
      <Card className="bento-card" data-testid="transactions-list-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Останні транзакції</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            {transactions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Немає транзакцій</p>
            ) : (
              <div className="space-y-2">
                {transactions.map((trans) => {
                  const catInfo = getCategoryInfo(trans.category, trans.type);
                  return (
                    <div
                      key={trans.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-accent/20 hover:bg-accent/30 transition-colors"
                      data-testid={`transaction-${trans.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-2 h-8 rounded-full"
                          style={{ backgroundColor: catInfo.color || '#6b7280' }}
                        />
                        <div>
                          <p className="text-sm font-medium">{trans.category}</p>
                          <p className="text-xs text-muted-foreground">
                            {trans.description || trans.date}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`font-mono font-semibold ${trans.type === 'income' ? 'finance-positive' : 'finance-negative'}`}>
                          {trans.type === 'income' ? '+' : '-'}{cs}{trans.amount.toLocaleString()}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDeleteTransaction(trans.id)}
                          data-testid={`delete-trans-${trans.id}`}
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

export default FinancePage;
