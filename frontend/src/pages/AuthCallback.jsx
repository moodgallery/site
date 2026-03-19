import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, api } from '../App';
import { Loader2 } from 'lucide-react';

export const AuthCallback = () => {
  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const hasProcessed = useRef(false);

  useEffect(() => {
    // Use useRef to prevent double processing in StrictMode
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processAuth = async () => {
      const hash = window.location.hash;
      const sessionIdMatch = hash.match(/session_id=([^&]+)/);
      
      if (!sessionIdMatch) {
        navigate('/login', { replace: true });
        return;
      }

      const sessionId = sessionIdMatch[1];

      try {
        const response = await api.post('/auth/google/session', { session_id: sessionId });
        const { token, ...userData } = response.data;
        loginWithGoogle(userData, token);
        // Clear the hash and navigate
        window.history.replaceState(null, '', window.location.pathname);
        navigate('/dashboard', { replace: true });
      } catch (error) {
        console.error('Auth callback error:', error);
        navigate('/login', { replace: true });
      }
    };

    processAuth();
  }, [loginWithGoogle, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-muted-foreground">Авторизація...</p>
      </div>
    </div>
  );
};

export default AuthCallback;
