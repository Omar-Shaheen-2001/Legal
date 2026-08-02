import { useState } from 'react';
import { useLogin } from '@workspace/api-client-react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Scale, Lock, User } from 'lucide-react';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const loginMutation = useLogin();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    loginMutation.mutate(
      { data: { username, password } },
      {
        onSuccess: () => {
          setLocation('/');
        },
        onError: (error: any) => {
          const detail = error?.data?.error || error?.message;
          let description = 'اسم المستخدم أو كلمة المرور غير صحيحة';
          if (detail && detail !== 'Invalid username or password.') {
            description = `خطأ في الاتصال بالخادم: ${detail}`;
          }
          toast({
            title: 'فشل تسجيل الدخول',
            description,
            variant: 'destructive',
          });
        },
      }
    );
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background p-4" dir="rtl">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-chart-3/5 blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Card */}
        <div className="rounded-2xl border border-border bg-card shadow-xl overflow-hidden">
          {/* Top accent */}
          <div className="h-1 bg-gradient-to-l from-primary via-chart-3 to-primary/30" />

          <div className="p-8">
            {/* Logo */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 mx-auto flex items-center justify-center mb-4">
                <Scale className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-xl font-bold">نظام إدارة جلسات المحكمة</h1>
              <p className="text-sm text-muted-foreground mt-1.5">
                سجّل دخولك للوصول إلى بوابة السكرتير القانوني
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="username" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  اسم المستخدم
                </Label>
                <div className="relative">
                  <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="أدخل اسم المستخدم"
                    required
                    disabled={loginMutation.isPending}
                    autoComplete="username"
                    className="pr-9 h-10"
                    data-testid="input-username"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  كلمة المرور
                </Label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="أدخل كلمة المرور"
                    required
                    disabled={loginMutation.isPending}
                    autoComplete="current-password"
                    className="pr-9 h-10"
                    data-testid="input-password"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-11 font-bold mt-2 shadow-sm"
                disabled={loginMutation.isPending}
                data-testid="button-login"
              >
                {loginMutation.isPending ? 'جارٍ تسجيل الدخول...' : 'تسجيل الدخول'}
              </Button>
            </form>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground/60 mt-4">
          نظام إدارة جلسات المحكمة — بوابة السكرتير القانوني
        </p>
      </div>
    </div>
  );
}
