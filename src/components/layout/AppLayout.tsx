import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useUnreadFeedback } from "@/hooks/useUnreadFeedback";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
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
  ChevronLeft,
  UserCog,
  X,
  BarChart3,
  GraduationCap,
  Bell,
  Globe,
  Wrench,
  Building2,
  Link2,
  Lightbulb,
  Inbox,
} from "lucide-react";
import type { UserRole } from "@/types/intake";

interface NavSection {
  label: string;
  badge?: string;
  badgeColor?: string;
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
      { name: "Innovationen", href: "/innovations", icon: Lightbulb, roles: ["requester", "architect", "engineer_lead", "admin"] },
    ],
  },
  {
    label: "ARCHITEKTUR & REVIEW",
    badge: "ARC",
    badgeColor: "text-primary border-primary/30 bg-primary/10",
    items: [
      { name: "Architect Queue", href: "/architect", icon: ClipboardCheck, roles: ["architect", "admin"] },
      { name: "Metriken", href: "/metrics", icon: BarChart3, roles: ["architect", "admin"] },
      { name: "Interview Config", href: "/admin/interview-config", icon: Wrench, roles: ["architect", "admin"] },
    ],
  },
  {
    label: "COMPLIANCE & GOVERNANCE",
    badge: "GOV",
    badgeColor: "text-accent border-accent/30 bg-accent/10",
    items: [
      { name: "Compliance", href: "/admin/policies", icon: Shield, roles: ["admin", "architect"] },
      { name: "Audit Log", href: "/audit", icon: FileText, roles: ["admin"] },
    ],
  },
  {
    label: "ADMINISTRATION",
    badge: "ADM",
    badgeColor: "text-coral border-coral/30 bg-coral/10",
    items: [
      { name: "Plattform-Admin", href: "/platform-admin", icon: Shield, roles: ["admin"] },
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
  const { workspace, workspaces, setWorkspace } = useWorkspace();
  const { totalUnread } = useUnreadFeedback();
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
      <div className="flex items-center gap-3 px-5 h-14 shrink-0 border-b border-border/50">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-primary/50 bg-primary/5">
          <svg className="h-4 w-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        </div>
        {!sidebarCollapsed && (
          <span className="font-serif text-lg text-primary leading-none">
            Intake Router
          </span>
        )}
      </div>


      {/* Nav sections */}
      <nav className="flex-1 overflow-y-auto pt-2 pb-4">
        {navSections.map((section, sIdx) => {
          const visibleItems = section.items.filter((item) => item.roles.includes(user.role));
          if (visibleItems.length === 0) return null;

          return (
            <div key={section.label} className={cn(sIdx > 0 && "mt-6")}>
              {!sidebarCollapsed && (
                <div className="flex items-center gap-2.5 px-6 mb-1.5">
                  <span className="text-[11px] font-semibold tracking-[0.08em] text-muted-foreground/60 uppercase select-none">
                    {section.label}
                  </span>
                  {section.badge && (
                    <span className={cn(
                      "text-[9px] font-bold tracking-wider px-1.5 py-[1px] rounded border",
                      section.badgeColor || "text-primary border-primary/30 bg-primary/10"
                    )}>
                      {section.badge}
                    </span>
                  )}
                </div>
              )}
              <div className="mt-1 space-y-[2px] px-3">
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
                        "relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-[14px] transition-colors duration-150",
                        sidebarCollapsed && "justify-center px-2",
                        isActive
                          ? "bg-secondary text-foreground font-medium"
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary/40 font-normal",
                      )}
                      title={sidebarCollapsed ? item.name : undefined}
                    >
                      <item.icon className="h-5 w-5 shrink-0" strokeWidth={1.8} />
                      {!sidebarCollapsed && <span className="flex-1">{item.name}</span>}
                      {!sidebarCollapsed && item.href === "/innovations" && totalUnread > 0 && (
                        <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1.5">
                          {totalUnread}
                        </span>
                      )}
                      {sidebarCollapsed && item.href === "/innovations" && totalUnread > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[8px] font-bold px-1">
                          {totalUnread}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="hidden md:flex border-t border-border px-3 py-3 justify-center shrink-0">
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-colors"
        >
          <ChevronLeft className={cn("h-4 w-4 transition-transform duration-200", sidebarCollapsed && "rotate-180")} />
        </button>
      </div>
    </div>
  );

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      {/* Sidebar – Desktop */}
      <aside
        className={cn(
          "hidden md:flex flex-col border-r border-border shrink-0 transition-all duration-300",
          sidebarCollapsed ? "w-[60px]" : "w-[260px]",
        )}
        style={{ background: "hsl(216 28% 5%)" }}
      >
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileNavOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden" onClick={() => setMobileNavOpen(false)} />
          <aside
            className="fixed inset-y-0 left-0 z-50 w-[260px] border-r border-border md:hidden"
            style={{ background: "hsl(216 28% 5%)" }}
          >
            <SidebarContent onLinkClick={() => setMobileNavOpen(false)} />
          </aside>
        </>
      )}

      {/* Right side */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Impersonation Banner */}
        {isImpersonating && (
          <div className="bg-warning text-warning-foreground px-4 py-1.5 flex items-center justify-center gap-3 text-xs shrink-0">
            <UserCog className="h-3.5 w-3.5" />
            <span>Ansicht als <strong>{roleLabels[user.role]}</strong></span>
            <Button variant="outline" size="sm" onClick={stopImpersonating} className="h-5 gap-1 text-[10px] bg-background text-foreground hover:bg-muted px-2">
              <X className="h-3 w-3" /> Beenden
            </Button>
          </div>
        )}

        {/* Top Header Bar */}
        <header className="shrink-0 border-b border-border bg-card/60 backdrop-blur-md">
          <div className="flex h-14 items-center justify-between px-5">
            {/* Left */}
            <div className="flex items-center gap-3">
              <button
                className="md:hidden p-1.5 rounded-lg hover:bg-secondary/40 text-muted-foreground"
                onClick={() => setMobileNavOpen(true)}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              {workspace && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-muted-foreground gap-2">
                      <Building2 className="h-4 w-4" />
                      <span className="hidden sm:inline">{workspace.name}</span>
                      {(workspace as any).external_workspace_id && (
                        <Badge variant="secondary" className="text-[9px] px-1.5 py-0 gap-1 bg-primary/10 text-primary border-primary/20 hidden sm:inline-flex">
                          <Link2 className="h-2.5 w-2.5" /> Sculptor
                        </Badge>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="bg-card border-border">
                    {workspaces.map((ws) => {
                      const linked = !!(ws as any).external_workspace_id;
                      return (
                        <DropdownMenuItem
                          key={ws.id}
                          onClick={() => setWorkspace(ws)}
                          className={cn(ws.id === workspace.id && "text-primary")}
                        >
                          <span className="flex-1">{ws.name}</span>
                          {linked && (
                            <Badge variant="secondary" className="ml-2 text-[9px] px-1 py-0 bg-primary/10 text-primary border-primary/20">
                              <Link2 className="h-2.5 w-2.5" />
                            </Badge>
                          )}
                        </DropdownMenuItem>
                      );
                    })}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate("/workspace")}>
                      Workspace verwalten
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            {/* Right */}
            <div className="flex items-center gap-3">
              {/* Role Switcher */}
              {isAdmin && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-1.5 h-9 text-xs text-muted-foreground hover:text-foreground">
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

              <button className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-colors">
                <Globe className="h-[18px] w-[18px]" />
              </button>
              <button
                className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-colors"
                onClick={() => navigate("/innovations")}
                title="Ungelesene Kommentare"
              >
                <Bell className="h-[18px] w-[18px]" />
                {totalUnread > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold px-1">
                    {totalUnread}
                  </span>
                )}
              </button>

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="p-1 rounded-lg hover:bg-secondary/40 transition-colors">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatarUrl} />
                      <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
                        {user.displayName.split(" ").map((n) => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                  </button>
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
