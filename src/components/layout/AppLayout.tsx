import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard,
  PlusCircle,
  ClipboardCheck,
  Settings,
  FileText,
  Shield,
  LogOut,
  User,
  ChevronDown,
  UserCog,
  X,
} from "lucide-react";
import type { UserRole } from "@/types/intake";

const navigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["requester", "architect", "engineer_lead", "admin"],
  },
  { name: "New Intake", href: "/intake/new", icon: PlusCircle, roles: ["requester", "architect", "admin"] },
  { name: "Config", href: "/configuration", icon: PlusCircle, roles: ["architect", "admin"] },
  { name: "Architect Queue", href: "/architect", icon: ClipboardCheck, roles: ["architect", "admin"] },
  { name: "Audit Log", href: "/audit", icon: FileText, roles: ["admin"] },
  { name: "Policies", href: "/admin/policies", icon: Shield, roles: ["admin"] },
  { name: "Integrations", href: "/admin/integrations", icon: Settings, roles: ["admin"] },
];

const roleLabels: Record<UserRole, string> = {
  requester: "Requester",
  architect: "Architect",
  engineer_lead: "Engineer Lead",
  admin: "Admin",
};

const roleBadgeVariants: Record<UserRole, "default" | "secondary" | "outline" | "destructive"> = {
  requester: "secondary",
  architect: "default",
  engineer_lead: "outline",
  admin: "destructive",
};

export function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin, isImpersonating, switchRole, stopImpersonating, logout } = useAuth();

  if (!user) {
    return <>{children}</>;
  }

  const visibleNavigation = navigation.filter((item) => item.roles.includes(user.role));

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Impersonation Banner */}
      {isImpersonating && (
        <div className="bg-warning text-warning-foreground px-4 py-2 flex items-center justify-center gap-4">
          <UserCog className="h-4 w-4" />
          <span className="text-sm font-medium">
            Sie sehen die App als <strong>{roleLabels[user.role]}</strong>
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={stopImpersonating}
            className="h-6 gap-1 bg-background text-foreground hover:bg-muted"
          >
            <X className="h-3 w-3" />
            Beenden
          </Button>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card shadow-sm">
        <div className="flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-8">
            <Link to="/dashboard" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center bg-primary text-primary-foreground font-bold">
                AI
              </div>
              <span className="text-lg font-semibold text-foreground">Intake Router</span>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              {visibleNavigation.map((item) => {
                const isActive =
                  location.pathname === item.href ||
                  (item.href !== "/dashboard" && location.pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            {/* Role Switcher (Admin only) */}
            {isAdmin && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Badge variant={roleBadgeVariants[user.role]}>{roleLabels[user.role]}</Badge>
                    {isImpersonating && <span className="text-xs text-muted-foreground">(Impersonation)</span>}
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Rolle wechseln (Admin)</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {Object.entries(roleLabels).map(([role, label]) => (
                    <DropdownMenuItem
                      key={role}
                      onClick={() => switchRole(role as UserRole)}
                      className={cn(user.role === role && "bg-accent")}
                    >
                      {label}
                      {role === user.actualRole && (
                        <Badge variant="outline" className="ml-2 text-xs">
                          Ihre Rolle
                        </Badge>
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Non-admin role badge */}
            {!isAdmin && <Badge variant={roleBadgeVariants[user.role]}>{roleLabels[user.role]}</Badge>}

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2 px-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.avatarUrl} />
                    <AvatarFallback className="bg-secondary text-secondary-foreground">
                      {user.displayName
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden md:inline text-sm font-medium">{user.displayName}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{user.displayName}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/profile")}>
                  <User className="mr-2 h-4 w-4" />
                  Profil
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/settings")}>
                  <Settings className="mr-2 h-4 w-4" />
                  Einstellungen
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Abmelden
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">{children}</main>
    </div>
  );
}
