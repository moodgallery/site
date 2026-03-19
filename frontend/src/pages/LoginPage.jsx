import React, { useState, useCallback, useEffect, useRef } from 'react';
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
  const { login, register, user } = useAuth();
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

  const googleBtnRef = useRef(null);
  const googleInitialized = useRef(false);

  const handleGoogleCredential = useCallback(async (response) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/google', { credential: response.credential });
      const { token, ...userData } = res.data;
      loginWithGoogle(userData, token);
      navigate('/dashboard', { replace: true });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Помилка входу через Google');
    } finally {
      setLoading(false);
    }
  }, [loginWithGoogle, navigate]);

  useEffect(() => {
    if (googleInitialized.current || user) return;
    const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
    if (!clientId) return;

    const initGoogle = () => {
      if (!window.google?.accounts?.id) return;
      googleInitialized.current = true;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleGoogleCredential,
      });
      if (googleBtnRef.current) {
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          theme: 'filled_black',
          size: 'large',
          width: '100%',
          text: 'signin_with',
          locale: 'uk',
        });
      }
    };

    if (window.google?.accounts?.id) {
      initGoogle();
    } else {
      const interval = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(interval);
          initGoogle();
        }
      }, 100);
      return () => clearInterval(interval);
    }
  }, [handleGoogleCredential, user]);

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

            <div
              ref={googleBtnRef}
              className="flex justify-center"
              data-testid="google-login-btn"
            />
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
