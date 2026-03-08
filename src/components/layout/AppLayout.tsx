import { useState } from "react";
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
import { Separator } from "@/components/ui/separator";
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
  ChevronLeft,
  UserCog,
  X,
  BarChart3,
  GraduationCap,
  Bell,
  Globe,
  Wrench,
} from "lucide-react";
import type { UserRole } from "@/types/intake";

interface NavSection {
  label: string;
  badge?: string;
  items: NavItem[];
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  roles: string[];
}

const navSections: NavSection[] = [
  {
    label: "ÜBERSICHT",
    items: [
      { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["requester", "architect", "engineer_lead", "admin"] },
      { name: "Neuer Intake", href: "/intake/new", icon: PlusCircle, roles: ["requester", "architect", "admin"] },
    ],
  },
  {
    label: "ARCHITEKTUR & REVIEW",
    badge: "ARC",
    items: [
      { name: "Architect Queue", href: "/architect", icon: ClipboardCheck, roles: ["architect", "admin"] },
      { name: "Metriken", href: "/metrics", icon: BarChart3, roles: ["architect", "admin"] },
      { name: "Interview Config", href: "/admin/interview-config", icon: Wrench, roles: ["architect", "admin"] },
    ],
  },
  {
    label: "COMPLIANCE & GOVERNANCE",
    badge: "GOV",
    items: [
      { name: "Compliance", href: "/admin/policies", icon: Shield, roles: ["admin", "architect"] },
      { name: "Audit Log", href: "/audit", icon: FileText, roles: ["admin"] },
    ],
  },
  {
    label: "ADMINISTRATION",
    badge: "ADM",
    items: [
      { name: "Integrationen", href: "/admin/integrations", icon: Settings, roles: ["admin"] },
      { name: "Benutzer", href: "/admin/users", icon: UserCog, roles: ["admin"] },
    ],
  },
  {
    label: "HILFE",
    items: [
      { name: "Tutorials", href: "/tutorials", icon: GraduationCap, roles: ["requester", "architect", "engineer_lead", "admin"] },
    ],
  },
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  if (!user) {
    return <>{children}</>;
  }

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const SidebarContent = ({ onLinkClick }: { onLinkClick?: () => void }) => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/10">
          <span className="text-primary font-bold text-sm">AI</span>
        </div>
        {!sidebarCollapsed && (
          <span className="font-serif text-lg text-primary font-semibold tracking-wide">
            Intake Router
          </span>
        )}
      </div>

      {/* Nav sections */}
      <nav className="flex-1 overflow-y-auto px-3 space-y-5 pb-4">
        {navSections.map((section) => {
          const visibleItems = section.items.filter((item) => item.roles.includes(user.role));
          if (visibleItems.length === 0) return null;

          return (
            <div key={section.label}>
              {!sidebarCollapsed && (
                <div className="flex items-center gap-2 px-2 mb-2">
                  <span className="text-[10px] font-semibold tracking-widest text-muted-foreground/70 uppercase">
                    {section.label}
                  </span>
                  {section.badge && (
                    <span className="text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                      {section.badge}
                    </span>
                  )}
                </div>
              )}
              <div className="space-y-0.5">
                {visibleItems.map((item) => {
                  const isActive =
                    location.pathname === item.href ||
                    (item.href !== "/dashboard" && location.pathname.startsWith(item.href));
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={onLinkClick}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                        sidebarCollapsed && "justify-center px-2",
                        isActive
                          ? "bg-secondary text-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary/50",
                      )}
                      title={sidebarCollapsed ? item.name : undefined}
                    >
                      <item.icon className="h-[18px] w-[18px] shrink-0" />
                      {!sidebarCollapsed && <span>{item.name}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Collapse toggle (desktop only) */}
      <div className="hidden md:flex border-t border-border px-3 py-3 justify-center">
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
        >
          <ChevronLeft className={cn("h-4 w-4 transition-transform", sidebarCollapsed && "rotate-180")} />
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar – Desktop */}
      <aside
        className={cn(
          "hidden md:flex flex-col border-r border-border bg-sidebar shrink-0 transition-all duration-300",
          sidebarCollapsed ? "w-16" : "w-60 lg:w-64",
        )}
      >
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileNavOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden" onClick={() => setMobileNavOpen(false)} />
          <aside className="fixed inset-y-0 left-0 z-50 w-64 border-r border-border bg-sidebar md:hidden">
            <SidebarContent onLinkClick={() => setMobileNavOpen(false)} />
          </aside>
        </>
      )}

      {/* Right side */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Impersonation Banner */}
        {isImpersonating && (
          <div className="bg-warning text-warning-foreground px-4 py-1.5 flex items-center justify-center gap-3 text-xs">
            <UserCog className="h-3.5 w-3.5" />
            <span>
              Ansicht als <strong>{roleLabels[user.role]}</strong>
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={stopImpersonating}
              className="h-5 gap-1 text-[10px] bg-background text-foreground hover:bg-muted px-2"
            >
              <X className="h-3 w-3" /> Beenden
            </Button>
          </div>
        )}

        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 border-b border-border bg-card/80 backdrop-blur-md">
          <div className="flex h-12 items-center justify-between px-4">
            {/* Left: mobile hamburger + page context */}
            <div className="flex items-center gap-3">
              <button
                className="md:hidden p-1.5 rounded-md hover:bg-secondary/50 text-muted-foreground"
                onClick={() => setMobileNavOpen(true)}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span className="font-medium text-foreground">Intake Funnel</span>
              </div>
            </div>

            {/* Right: actions */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Role Switcher */}
              {isAdmin && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-1.5 h-8 text-xs text-muted-foreground hover:text-foreground">
                      <Badge variant={roleBadgeVariants[user.role]} className="text-[10px] px-1.5 py-0">
                        {roleLabels[user.role]}
                      </Badge>
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Rolle wechseln</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {Object.entries(roleLabels).map(([role, label]) => (
                      <DropdownMenuItem
                        key={role}
                        onClick={() => switchRole(role as UserRole)}
                        className={cn(user.role === role && "bg-secondary")}
                      >
                        {label}
                        {role === user.actualRole && (
                          <Badge variant="outline" className="ml-2 text-[10px]">Ihre Rolle</Badge>
                        )}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground">
                <Globe className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground">
                <Bell className="h-4 w-4" />
              </Button>

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={user.avatarUrl} />
                      <AvatarFallback className="bg-secondary text-secondary-foreground text-[10px]">
                        {user.displayName.split(" ").map((n) => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
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
                    <User className="mr-2 h-4 w-4" /> Profil
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/settings")}>
                    <Settings className="mr-2 h-4 w-4" /> Einstellungen
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                    <LogOut className="mr-2 h-4 w-4" /> Abmelden
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
