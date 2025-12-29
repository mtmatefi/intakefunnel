import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { demoIntakes, deliveryPathInfo } from '@/data/demo';
import type { IntakeStatus, DeliveryPath } from '@/types/intake';
import { 
  PlusCircle, 
  Search, 
  Filter, 
  ArrowUpRight,
  Clock,
  CheckCircle,
  AlertCircle,
  FileText,
  Send,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const statusConfig: Record<IntakeStatus, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive'; icon: typeof Clock }> = {
  draft: { label: 'Draft', variant: 'outline', icon: FileText },
  gathering_info: { label: 'Gathering Info', variant: 'secondary', icon: Clock },
  spec_generated: { label: 'Spec Ready', variant: 'secondary', icon: FileText },
  pending_approval: { label: 'Pending Approval', variant: 'default', icon: Clock },
  approved: { label: 'Approved', variant: 'default', icon: CheckCircle },
  rejected: { label: 'Rejected', variant: 'destructive', icon: AlertCircle },
  exported: { label: 'Exported', variant: 'default', icon: Send },
  closed: { label: 'Closed', variant: 'outline', icon: CheckCircle },
};

const priorityColors = {
  low: 'bg-muted text-muted-foreground',
  medium: 'bg-info/20 text-info',
  high: 'bg-warning/20 text-warning',
  critical: 'bg-destructive/20 text-destructive',
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const filteredIntakes = demoIntakes.filter(intake => {
    const matchesSearch = intake.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      intake.requesterName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || intake.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || intake.category === categoryFilter;
    
    // Requesters only see their own intakes
    if (user?.role === 'requester') {
      return matchesSearch && matchesStatus && matchesCategory && intake.requesterId === user.id;
    }
    
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const stats = {
    total: demoIntakes.length,
    pending: demoIntakes.filter(i => i.status === 'pending_approval').length,
    approved: demoIntakes.filter(i => i.status === 'approved').length,
    draft: demoIntakes.filter(i => i.status === 'draft').length,
  };

  const categories = [...new Set(demoIntakes.map(i => i.category).filter(Boolean))];

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground">
              {user?.role === 'requester' 
                ? 'Track your software intake requests'
                : 'Manage and review intake requests'}
            </p>
          </div>
          <Button asChild>
            <Link to="/intake/new">
              <PlusCircle className="mr-2 h-4 w-4" />
              New Intake
            </Link>
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">Total Intakes</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-warning">{stats.pending}</div>
              <p className="text-xs text-muted-foreground">Pending Approval</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-success">{stats.approved}</div>
              <p className="text-xs text-muted-foreground">Approved</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.draft}</div>
              <p className="text-xs text-muted-foreground">Drafts</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search intakes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[160px]">
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {Object.entries(statusConfig).map(([key, config]) => (
                      <SelectItem key={key} value={key}>{config.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map(cat => (
                      <SelectItem key={cat} value={cat!}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[300px]">Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Requester</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredIntakes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No intakes found. Create your first intake to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredIntakes.map((intake) => {
                    const status = statusConfig[intake.status];
                    return (
                      <TableRow key={intake.id}>
                        <TableCell>
                          <Link 
                            to={`/intake/${intake.id}`}
                            className="font-medium text-foreground hover:underline"
                          >
                            {intake.title}
                          </Link>
                          {intake.valueStream && (
                            <p className="text-xs text-muted-foreground">{intake.valueStream}</p>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={status.variant} className="gap-1">
                            <status.icon className="h-3 w-3" />
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {intake.category || '—'}
                        </TableCell>
                        <TableCell>
                          {intake.priority && (
                            <span className={cn(
                              'px-2 py-1 text-xs font-medium capitalize',
                              priorityColors[intake.priority]
                            )}>
                              {intake.priority}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {intake.requesterName}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {new Date(intake.updatedAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" asChild>
                            <Link to={`/intake/${intake.id}`}>
                              <ArrowUpRight className="h-4 w-4" />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Delivery Path Legend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Delivery Paths</CardTitle>
            <CardDescription>How intakes are routed based on complexity and requirements</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              {Object.entries(deliveryPathInfo).map(([key, info]) => (
                <div key={key} className="flex items-start gap-2 p-2 border border-border">
                  <div className={cn(
                    'w-3 h-3 mt-1 flex-shrink-0',
                    `bg-${info.color}`
                  )} style={{ backgroundColor: `hsl(var(--${info.color}))` }} />
                  <div>
                    <p className="font-medium text-sm">{info.label}</p>
                    <p className="text-xs text-muted-foreground">{info.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
