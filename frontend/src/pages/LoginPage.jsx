import React, { useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth, api } from '../App';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Mail, Lock, User, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export const LoginPage = () => {
  const { login, register, loginWithGoogle, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  
  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // Register form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');

  // Redirect if already logged in
  React.useEffect(() => {
    if (user) {
      const from = location.state?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [user, navigate, location]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(loginEmail, loginPassword);
      const from = location.state?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Помилка входу');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(regName, regEmail, regPassword);
      navigate('/dashboard', { replace: true });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Помилка реєстрації');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = useCallback(() => {
    const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
    if (!clientId || !window.google?.accounts?.oauth2) return;

    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'email profile',
      callback: async (tokenResponse) => {
        if (tokenResponse.error) return;
        setLoading(true);
        try {
          const res = await api.post('/auth/google', { access_token: tokenResponse.access_token });
          const { token, ...userData } = res.data;
          loginWithGoogle(userData, token);
          navigate('/dashboard', { replace: true });
        } catch (error) {
          toast.error(error.response?.data?.detail || 'Помилка входу через Google');
        } finally {
          setLoading(false);
        }
      },
    });
    client.requestAccessToken();
  }, [loginWithGoogle, navigate]);

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-30"
          style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1762417108293-91614140073a?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA2MTJ8MHwxfHNlYXJjaHwzfHxtaW5pbWFsaXN0JTIwZGFyayUyMGFic3RyYWN0JTIwdGV4dHVyZXxlbnwwfHx8fDE3NzM1MzI4MTN8MA&ixlib=rb-4.1.0&q=85)' }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background/90 to-transparent" />
        <div className="relative z-10 flex flex-col justify-center p-12">
          <h1 className="text-5xl font-bold tracking-tight mb-4">
            Personal<br />
            <span className="text-muted-foreground">Operating System</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-md">
            Ваша персональна система управління життям. Оптимізуйте дохід, дисципліну та продуктивність.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            {['Фінанси', 'Цілі', 'Звички', 'Завдання', 'Розклад'].map((item) => (
              <span key={item} className="px-3 py-1.5 rounded-full bg-accent/50 text-sm text-muted-foreground border border-border/40">
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Right side - Auth forms */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6">
        <Card className="w-full max-w-md bg-card border-border/40" data-testid="auth-card">
          <CardHeader className="text-center">
            <div className="lg:hidden mb-4">
              <h1 className="text-2xl font-bold tracking-tight">Personal OS</h1>
            </div>
            <CardTitle className="text-xl">Ласкаво просимо</CardTitle>
            <CardDescription>Увійдіть або створіть акаунт</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login" data-testid="login-tab">Вхід</TabsTrigger>
                <TabsTrigger value="register" data-testid="register-tab">Реєстрація</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="your@email.com"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        className="pl-10"
                        required
                        data-testid="login-email-input"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Пароль</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="login-password"
                        type="password"
                        placeholder="••••••••"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        className="pl-10"
                        required
                        data-testid="login-password-input"
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full btn-press" disabled={loading} data-testid="login-submit-btn">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Увійти
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reg-name">Ім'я</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="reg-name"
                        type="text"
                        placeholder="Ваше ім'я"
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        className="pl-10"
                        required
                        data-testid="register-name-input"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="reg-email"
                        type="email"
                        placeholder="your@email.com"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        className="pl-10"
                        required
                        data-testid="register-email-input"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-password">Пароль</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="reg-password"
                        type="password"
                        placeholder="••••••••"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        className="pl-10"
                        required
                        minLength={6}
                        data-testid="register-password-input"
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full btn-press" disabled={loading} data-testid="register-submit-btn">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Створити акаунт
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border/40" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">або</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full h-11 gap-3 border-border/40 hover:bg-accent/50 transition-colors"
              onClick={handleGoogleLogin}
              disabled={loading || !process.env.REACT_APP_GOOGLE_CLIENT_ID}
              data-testid="google-login-btn"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Увійти через Google
            </Button>
            {!process.env.REACT_APP_GOOGLE_CLIENT_ID && (
              <p className="text-xs text-muted-foreground text-center mt-2">
                Google Sign-In не налаштовано
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;
