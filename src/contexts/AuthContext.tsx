import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';
import type { UserRole } from '@/types/intake';

interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  actualRole: UserRole; // The real role from the database
  avatarUrl?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAdmin: boolean;
  isImpersonating: boolean;
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  signup: (email: string, password: string, displayName: string) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
  switchRole: (role: UserRole) => void;
  stopImpersonating: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        
        if (session?.user) {
          // Defer profile fetch to avoid deadlock
          setTimeout(() => {
            fetchUserProfile(session.user.id);
          }, 0);
        } else {
          setUser(null);
          setIsLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId: string) => {
    try {
      // Fetch profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      // Fetch role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      const actualRole = (roleData?.role as UserRole) || 'requester';
      
      // Check if there's an impersonated role in sessionStorage (only for admins)
      const impersonatedRole = sessionStorage.getItem('impersonated_role') as UserRole | null;
      const effectiveRole = (actualRole === 'admin' && impersonatedRole) ? impersonatedRole : actualRole;

      if (profile) {
        setUser({
          id: userId,
          email: profile.email || '',
          displayName: profile.display_name,
          role: effectiveRole,
          actualRole: actualRole,
          avatarUrl: profile.avatar_url || undefined,
        });
      } else {
        // Profile not created yet, use session data
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser({
            id: userId,
            email: session.user.email || '',
            displayName: session.user.email?.split('@')[0] || 'User',
            role: actualRole,
            actualRole: actualRole,
          });
        }
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      return { error: error.message };
    }
    return { error: null };
  };

  const signup = async (email: string, password: string, displayName: string): Promise<{ error: string | null }> => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          display_name: displayName,
        },
      },
    });
    
    if (error) {
      return { error: error.message };
    }
    return { error: null };
  };

  const logout = async () => {
    sessionStorage.removeItem('impersonated_role');
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  // Only admins can impersonate other roles
  const switchRole = (role: UserRole) => {
    if (!user || user.actualRole !== 'admin') return;
    
    sessionStorage.setItem('impersonated_role', role);
    setUser({ ...user, role });
  };

  const stopImpersonating = () => {
    if (!user) return;
    
    sessionStorage.removeItem('impersonated_role');
    setUser({ ...user, role: user.actualRole });
  };

  const isAdmin = user?.actualRole === 'admin';
  const isImpersonating = user ? user.role !== user.actualRole : false;

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isAuthenticated: !!session,
        isLoading,
        isAdmin,
        isImpersonating,
        login,
        signup,
        logout,
        switchRole,
        stopImpersonating,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
