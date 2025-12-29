import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const success = await login(email, password);
      if (success) {
        toast.success('Welcome back!');
        navigate('/dashboard');
      } else {
        toast.error('Invalid credentials');
      }
    } catch (error) {
      toast.error('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async (role: 'requester' | 'architect' | 'admin') => {
    const emails: Record<string, string> = {
      requester: 'maria.meier@example.com',
      architect: 'thomas.architect@example.com',
      admin: 'admin@example.com',
    };
    setEmail(emails[role]);
    setIsLoading(true);
    
    try {
      await login(emails[role], 'demo');
      toast.success(`Logged in as ${role}`);
      navigate('/dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center bg-primary text-primary-foreground font-bold text-xl">
              AI
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">AI Intake Router</h1>
          <p className="text-muted-foreground">Enterprise software intake and routing</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
            <CardDescription>Enter your credentials to access the platform</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign in
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Demo Access</CardTitle>
            <CardDescription>Try the app with different roles</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => handleDemoLogin('requester')}
              disabled={isLoading}
            >
              <span className="bg-secondary text-secondary-foreground px-2 py-0.5 text-xs font-medium mr-2">
                Requester
              </span>
              Frau Maria Meier (Business User)
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => handleDemoLogin('architect')}
              disabled={isLoading}
            >
              <span className="bg-primary text-primary-foreground px-2 py-0.5 text-xs font-medium mr-2">
                Architect
              </span>
              Thomas Weber (Enterprise Architect)
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => handleDemoLogin('admin')}
              disabled={isLoading}
            >
              <span className="bg-primary text-primary-foreground px-2 py-0.5 text-xs font-medium mr-2">
                Admin
              </span>
              System Administrator
            </Button>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          In production, this will use Supabase Auth.
          <br />
          Demo mode uses local authentication.
        </p>
      </div>
    </div>
  );
}
