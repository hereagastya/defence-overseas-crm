import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginInput } from '@doc/shared';
import type { AxiosError } from 'axios';
import { useLogin } from './api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

export function LoginPage() {
  const navigate = useNavigate();
  const { mutate: login, isPending } = useLogin();

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  function onSubmit(values: LoginInput) {
    form.clearErrors();
    login(values, {
      onSuccess: () => navigate('/dashboard', { replace: true }),
      onError: (error) => {
        const message =
          (error as AxiosError<{ error?: { message?: string } }>)?.response?.data?.error?.message ??
          'Login failed. Please try again.';
        form.setError('root', { message });
      },
    });
  }

  return (
    <div className="flex min-h-screen">
      {/* Left panel — dark green brand panel */}
      <div
        className="hidden lg:flex lg:w-5/12 flex-col items-center justify-center px-12 py-16"
        style={{ background: 'linear-gradient(160deg, #0F5132 0%, #052E1B 100%)' }}
      >
        <div className="flex flex-col items-center gap-8 text-center max-w-xs">
          <img
            src="/logo.webp"
            alt="Defence Overseas"
            className="h-20 w-20 rounded-2xl object-cover shadow-2xl"
          />
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight" style={{ color: '#E7F2EB' }}>
              Defence Overseas CRM
            </h2>
            <p className="mt-3 text-base leading-relaxed" style={{ color: '#87A395' }}>
              Manage your counseling pipeline, track leads, and guide students to their dream
              universities.
            </p>
          </div>
          <div className="flex gap-3">
            {['Leads', 'Students', 'Reports'].map((tag) => (
              <span
                key={tag}
                className="rounded-full px-3 py-1 text-xs font-semibold"
                style={{ background: 'rgba(255,255,255,0.08)', color: '#87A395' }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 flex-col items-center justify-center bg-background px-6 py-12">
        <div className="w-full max-w-sm space-y-8">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 lg:hidden">
            <img
              src="/logo.webp"
              alt="Defence Overseas"
              className="h-10 w-10 rounded-xl object-cover"
            />
            <span className="text-lg font-bold text-foreground">Defence Overseas</span>
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Welcome back</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Sign in to your account to continue
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {form.formState.errors.root && (
                <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {form.formState.errors.root.message}
                </div>
              )}

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="you@example.com"
                        autoComplete="email"
                        disabled={isPending}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        autoComplete="current-password"
                        disabled={isPending}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? 'Signing in…' : 'Sign in'}
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
