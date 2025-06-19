import { createFileRoute, useNavigate } from '@tanstack/solid-router';
import { Show, createSignal } from 'solid-js';
import { useQuery, useQueryClient, type QueryObserverResult } from '@tanstack/solid-query';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader } from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { authClient } from '~/lib/auth-client';
import { sessionQueryOptions } from '~/lib/auth-guard';
import { useSignOut } from '~/lib/auth-actions';
import type { User, Session } from 'better-auth';

type SessionQueryResult = {
    user: User,
    session: Session
} | null;

const Spinner = (props: { class?: string }) => (
    <div
        class={`h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-t-transparent ${props.class ?? ''}`}
    />
);

type AuthAction = 'signIn' | 'signUp' | 'google' | null;
type AuthTab = 'signIn' | 'signUp';

function AuthPage() {
  const queryClient = useQueryClient();
  const sessionQuery = useQuery(() => sessionQueryOptions()) as QueryObserverResult<SessionQueryResult, Error>;
  const navigate = useNavigate();
  const signOut = useSignOut();

  const [activeTab, setActiveTab] = createSignal<AuthTab>('signIn');
  const [name, setName] = createSignal('');
  const [email, setEmail] = createSignal('');
  const [password, setPassword] = createSignal('');
  const [loadingAction, setLoadingAction] = createSignal<AuthAction>(null);

  const handleSignIn = async () => {
    if (!email() || !password()) return;
    setLoadingAction('signIn');
    const { data, error } = await authClient.signIn.email({
      email: email(),
      password: password(),
    });
    if (data) {
      await queryClient.invalidateQueries({ queryKey: ['session'] });
      navigate({ to: '/dashboard' });
    }
    if (error) {
      alert(error.message);
      setLoadingAction(null);
    }
  };

  const handleSignUp = async () => {
    if (!email() || !password()) return;
    setLoadingAction('signUp');
    const { data, error } = await authClient.signUp.email({
        email: email(),
        password: password(),
        name: name() || email().split('@')[0],
    });
    if (data) {
        await queryClient.invalidateQueries({ queryKey: ['session'] });
        navigate({ to: '/dashboard' });
    }
    if (error) {
      alert(error.message);
      setLoadingAction(null);
    }
  };

  const handleGoogleSignIn = () => {
    setLoadingAction('google');
    authClient.signIn.social({
      provider: 'google',
    });
  };

  return (
    <div class="p-8 min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-stone-50 via-stone-100 to-stone-400/60 text-gray-900">
      <Card class="w-full max-w-sm overflow-hidden transition-all duration-300 ease-in-out">
        <CardHeader class="p-0">
            <div class="flex">
                <button 
                    onClick={() => setActiveTab('signIn')}
                    class={`flex-1 p-4 text-center font-semibold border-b-2 transition-all duration-300 ${activeTab() === 'signIn' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground opacity-60 hover:bg-muted/50'}`}
                >
                    Sign In
                </button>
                <div class="w-px bg-border"></div>
                <button 
                    onClick={() => setActiveTab('signUp')}
                    class={`flex-1 p-4 text-center font-semibold border-b-2 transition-all duration-300 ${activeTab() === 'signUp' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground opacity-60 hover:bg-muted/50'}`}
                >
                    Sign Up
                </button>
            </div>
        </CardHeader>
        <CardContent class="p-6">
          <Show when={sessionQuery.isPending}>
            <p>Loading session...</p>
          </Show>
          <Show when={!sessionQuery.isPending && sessionQuery.data}>
            <div class="space-y-4 text-center">
              <p>Welcome back, {sessionQuery.data?.user.name || sessionQuery.data?.user.email}!</p>
              <Button onClick={signOut} class="w-full">Sign Out</Button>
            </div>
          </Show>
          <Show when={!sessionQuery.isPending && !sessionQuery.data}>
            <div class="space-y-4">
                <div>
                    {/* Sign In Form */}
                    <div class={`grid transition-[grid-template-rows] duration-300 ease-in-out ${activeTab() === 'signIn' ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                        <div class="overflow-hidden">
                            <div class={`space-y-4 pt-4 transition-opacity duration-150 ${activeTab() === 'signIn' ? 'opacity-100' : 'opacity-0'}`}>
                                <div class="space-y-2">
                                    <Label for="email-signin">Email</Label>
                                    <Input id="email-signin" type="email" placeholder="your@email.com" value={email()} onChange={setEmail} disabled={loadingAction() !== null} />
                                </div>
                                <div class="space-y-2">
                                    <Label for="password-signin">Password</Label>
                                    <Input id="password-signin" type="password" placeholder="••••••••" value={password()} onChange={setPassword} disabled={loadingAction() !== null} />
                                </div>
                                <Button onClick={handleSignIn} class="w-full" disabled={loadingAction() !== null}>
                                    <Show when={loadingAction() === 'signIn'}><Spinner class="mr-2" /></Show>
                                    Sign In
                                </Button>
                            </div>
                        </div>
                    </div>
                    {/* Sign Up Form */}
                    <div class={`grid transition-[grid-template-rows] duration-300 ease-in-out ${activeTab() === 'signUp' ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                        <div class="overflow-hidden">
                            <div class={`space-y-4 pt-4 transition-opacity duration-150 ${activeTab() === 'signUp' ? 'opacity-100' : 'opacity-0'}`}>
                                <div class="space-y-2">
                                    <Label for="name-signup">Name (Optional)</Label>
                                    <Input id="name-signup" type="text" placeholder="Your Name" value={name()} onChange={setName} disabled={loadingAction() !== null} />
                                </div>
                                <div class="space-y-2">
                                    <Label for="email-signup">Email</Label>
                                    <Input id="email-signup" type="email" placeholder="your@email.com" value={email()} onChange={setEmail} disabled={loadingAction() !== null} />
                                </div>
                                <div class="space-y-2">
                                    <Label for="password-signup">Password</Label>
                                    <Input id="password-signup" type="password" placeholder="••••••••" value={password()} onChange={setPassword} disabled={loadingAction() !== null} />
                                </div>
                                <Button onClick={handleSignUp} class="w-full" disabled={loadingAction() !== null}>
                                    <Show when={loadingAction() === 'signUp'}><Spinner class="mr-2" /></Show>
                                    Create Account
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

              <div class="relative py-2">
                <div class="absolute inset-0 flex items-center"><span class="w-full border-t" /></div>
                <div class="relative flex justify-center text-xs uppercase">
                  <span class="bg-card px-2 text-muted-foreground">Or continue with</span>
                </div>
              </div>

              <Button variant="outline" class="w-full" onClick={handleGoogleSignIn} disabled={loadingAction() !== null}>
                <Show when={loadingAction() === 'google'}><Spinner class="mr-2" /></Show>
                <Show when={loadingAction() !== 'google'}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" class="mr-2 h-4 w-4">
                      <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
                      <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
                      <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.223,0-9.641-3.219-11.303-7.583l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
                      <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l6.19,5.238C42.022,36.407,44,30.638,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
                    </svg>
                </Show>
                Sign In with Google
              </Button>
            </div>
          </Show>
        </CardContent>
      </Card>
    </div>
  );
}

export const Route = createFileRoute('/auth')({
  component: AuthPage,
});