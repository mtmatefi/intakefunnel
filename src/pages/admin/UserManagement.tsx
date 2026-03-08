import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, UserCog, Loader2, Shield } from 'lucide-react';

const roleLabels: Record<string, string> = {
  requester: 'Requester',
  architect: 'Architect',
  engineer_lead: 'Engineer Lead',
  admin: 'Administrator',
};

const roleBadgeVariants: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  requester: 'secondary',
  architect: 'default',
  engineer_lead: 'outline',
  admin: 'destructive',
};

interface UserWithRole {
  user_id: string;
  display_name: string;
  email: string | null;
  role: string;
  role_id: string;
}

export default function UserManagementPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      // Fetch profiles and roles
      const { data: profiles, error: profErr } = await supabase
        .from('profiles')
        .select('user_id, display_name, email')
        .order('display_name');
      if (profErr) throw profErr;

      const { data: roles, error: roleErr } = await supabase
        .from('user_roles')
        .select('id, user_id, role');
      if (roleErr) throw roleErr;

      const roleMap = new Map(roles?.map(r => [r.user_id, { role: r.role, id: r.id }]));

      return (profiles || []).map(p => ({
        user_id: p.user_id,
        display_name: p.display_name,
        email: p.email,
        role: roleMap.get(p.user_id)?.role || 'requester',
        role_id: roleMap.get(p.user_id)?.id || '',
      })) as UserWithRole[];
    },
    enabled: user?.role === 'admin',
  });

  const updateRole = useMutation({
    mutationFn: async ({ userId, roleId, newRole }: { userId: string; roleId: string; newRole: string }) => {
      if (roleId) {
        const { error } = await supabase
          .from('user_roles')
          .update({ role: newRole as any })
          .eq('id', roleId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role: newRole as any });
        if (error) throw error;
      }

      // Audit log
      await supabase.from('audit_logs').insert({
        actor_id: user!.id,
        action: 'UPDATE',
        entity_type: 'user_role',
        entity_id: userId,
        metadata_json: { newRole },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('Rolle aktualisiert');
    },
    onError: () => {
      toast.error('Fehler beim Aktualisieren der Rolle');
    },
  });

  if (user?.role !== 'admin') {
    return (
      <AppLayout>
        <div className="p-6">
          <Card>
            <CardContent className="pt-6 text-center">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-warning" />
              <h2 className="text-xl font-bold mb-2">Zugriff beschränkt</h2>
              <p className="text-muted-foreground">Nur Administratoren können Benutzerrollen verwalten.</p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-6 max-w-4xl">
        <div className="flex items-center gap-3">
          <UserCog className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Benutzerverwaltung</h1>
            <p className="text-muted-foreground">Rollen und Berechtigungen verwalten</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Benutzer & Rollen
            </CardTitle>
            <CardDescription>{users.length} registrierte Benutzer</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>E-Mail</TableHead>
                    <TableHead>Aktuelle Rolle</TableHead>
                    <TableHead>Rolle ändern</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.user_id}>
                      <TableCell className="font-medium">{u.display_name}</TableCell>
                      <TableCell className="text-muted-foreground">{u.email || '—'}</TableCell>
                      <TableCell>
                        <Badge variant={roleBadgeVariants[u.role] || 'outline'}>
                          {roleLabels[u.role] || u.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={u.role}
                          onValueChange={(newRole) => {
                            if (newRole !== u.role) {
                              updateRole.mutate({ userId: u.user_id, roleId: u.role_id, newRole });
                            }
                          }}
                        >
                          <SelectTrigger className="w-[160px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(roleLabels).map(([role, label]) => (
                              <SelectItem key={role} value={role}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
