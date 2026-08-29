import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft,
  LayoutDashboard, 
  FileText, 
  BookOpen, 
  ClipboardCheck,
  FileCheck2,
  Settings, 
  LogOut, 
  Plus, 
  Menu,
  X,
  Shield,
  FileSearch,
  HelpCircle,
  Lightbulb,
  SearchCheck,
  MessageSquareText,
  Wand2,
  GraduationCap,
  UserCheck,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { BrandLogo } from '@/components/brand/BrandLogo';
import {
  applyFontSizePreference,
  applyReduceMotionPreference,
  getPrivacyModePreference,
  getSidebarDefaultPreference,
  SIDEBAR_DEFAULT_KEY,
  USER_PREFERENCE_EVENT,
} from '@/lib/userPreferences';

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  badge?: string;
  active?: boolean;
  onClick?: () => void;
  onCompactReveal?: () => void;
  desktopCollapsed?: boolean;
}

type NavItemConfig = Pick<NavItemProps, "to" | "icon" | "label" | "badge">;

interface NavGroupConfig {
  label: string;
  items: NavItemConfig[];
}

const isDesktopViewport = () =>
  typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches;

const NavItem: React.FC<NavItemProps> = ({
  to,
  icon,
  label,
  badge,
  active,
  onClick,
  onCompactReveal,
  desktopCollapsed,
}) => {
  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (desktopCollapsed && isDesktopViewport()) {
      event.preventDefault();
      onCompactReveal?.();
      return;
    }

    onClick?.();
  };

  return (
    <Link
      to={to}
      className={cn(
        "flex min-h-10 items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-[background-color,color,padding,gap] duration-200 ease-out",
        desktopCollapsed && "lg:justify-center lg:gap-0 lg:px-2",
        active
          ? "bg-primary/10 text-primary"
          : "text-foreground/70 hover:bg-muted hover:text-foreground"
      )}
      onClick={handleClick}
      aria-current={active ? "page" : undefined}
      title={desktopCollapsed ? label : undefined}
    >
      <span className={cn("shrink-0 transition-transform duration-200 ease-out", desktopCollapsed && "lg:scale-105")}>
        {icon}
      </span>
      <span
        className={cn(
          "truncate transition-[opacity,transform,width] duration-150 ease-out",
          desktopCollapsed && "lg:w-0 lg:translate-x-1 lg:opacity-0"
        )}
      >
        {label}
      </span>
      {badge && (
        <span className={cn(
          "ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary",
          desktopCollapsed && "lg:hidden"
        )}>
          {badge}
        </span>
      )}
    </Link>
  );
};

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const NAVIGATION_STACK_KEY = 'uhpab:navigation-stack';
let inMemoryNavigationStack: string[] = [];

const getPageLabel = (pathname: string) => {
  if (pathname.startsWith('/projects/new')) return 'Create project';
  if (pathname.startsWith('/projects')) return 'My research work';
  if (pathname.startsWith('/supervisor-students/')) return 'Student review';
  if (pathname.startsWith('/student-workspace')) return 'Student workspace';

  const labels: Record<string, string> = {
    '/dashboard': 'Today',
    '/getting-started': 'Help / Start here',
    '/review-history': 'My research work',
    '/school-dashboard': 'School workspace',
    '/student-workspace': 'Student workspace',
    '/supervisor-dashboard': 'Supervisor workspace',
    '/supervisor-students': 'Assigned students',
    '/guidelines': 'UHPAB guidelines',
    '/marking-guide': 'Marking guide',
    '/document-analysis': 'Check my document',
    '/content-improvement': 'Improve my writing',
    '/humanizer': 'Human review',
    '/plagiarism-checker': 'Check originality',
    '/research-topic-generator': 'Research topic generator',
    '/premium': 'Premium',
    '/settings': 'Settings',
  };

  return labels[pathname] || 'UHPAB Research';
};

const readNavigationStack = () => {
  if (inMemoryNavigationStack.length > 0) return inMemoryNavigationStack;
  if (typeof window === 'undefined') return [];

  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(NAVIGATION_STACK_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
};

const writeNavigationStack = (stack: string[]) => {
  inMemoryNavigationStack = stack.slice(-20);
  if (typeof window === 'undefined') return;

  try {
    window.sessionStorage.setItem(NAVIGATION_STACK_KEY, JSON.stringify(inMemoryNavigationStack));
  } catch {
    // In-memory history still keeps the header back button working during this app session.
  }
};

const getSameOriginReferrerRoute = (currentRoute: string) => {
  if (typeof window === 'undefined' || typeof document === 'undefined' || !document.referrer) return null;

  try {
    const referrerUrl = new URL(document.referrer);
    if (referrerUrl.origin !== window.location.origin) return null;

    const referrerRoute = `${referrerUrl.pathname}${referrerUrl.search}${referrerUrl.hash}`;
    return referrerRoute && referrerRoute !== currentRoute ? referrerRoute : null;
  } catch {
    return null;
  }
};

const getFallbackBackRoute = (pathname: string) => {
  if (pathname === '/dashboard') return null;
  if (pathname === '/supervisor-dashboard') return null;
  if (pathname === '/student-workspace') return null;
  if (pathname.startsWith('/supervisor-students/')) return '/supervisor-students';
  if (pathname === '/supervisor-students') return '/supervisor-dashboard';
  if (pathname === '/projects/new') return '/projects';
  if (pathname === '/projects') return '/dashboard';

  const projectEditMatch = pathname.match(/^\/projects\/([^/]+)\/edit$/);
  if (projectEditMatch) return `/projects/${projectEditMatch[1]}`;
  if (pathname.startsWith('/projects/')) return '/projects';

  return '/dashboard';
};

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { user, logout, isPremium, isSchoolAdmin, isSchoolSupervisor, isSchoolStudent } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState(
    () => getSidebarDefaultPreference() === "compact"
  );
  const [canGoBack, setCanGoBack] = useState(false);
  const [privacyMode, setPrivacyMode] = useState(() => getPrivacyModePreference());
  const routeKey = `${location.pathname}${location.search}${location.hash}`;
  const schoolAdmin = isSchoolAdmin();
  const schoolSupervisor = isSchoolSupervisor();
  const schoolStudent = isSchoolStudent();
  const schoolStaff = schoolAdmin || schoolSupervisor || schoolStudent;
  const homeRoute = schoolAdmin ? "/school-dashboard" : schoolSupervisor ? "/supervisor-dashboard" : schoolStudent ? "/student-workspace" : "/dashboard";

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Logged out successfully");
      navigate('/login');
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Failed to log out. Please try again.");
    }
  };

  const closeMobileSidebar = () => {
    setIsSidebarOpen(false);
  };

  const revealDesktopSidebar = () => {
    setIsDesktopSidebarCollapsed(false);
  };

  const revealDesktopSidebarBeforeAction = () => {
    if (isDesktopSidebarCollapsed && isDesktopViewport()) {
      revealDesktopSidebar();
      return true;
    }

    return false;
  };

  useEffect(() => {
    const stack = readNavigationStack();
    const referrerBackRoute = getSameOriginReferrerRoute(routeKey);
    const fallbackBackRoute = getFallbackBackRoute(location.pathname);
    const resolvedFallbackBackRoute =
      schoolStaff && fallbackBackRoute === "/dashboard"
        ? location.pathname === homeRoute
          ? null
          : homeRoute
        : fallbackBackRoute;
    const last = stack[stack.length - 1];
    let nextStack = stack;

    if (last === routeKey) {
      nextStack = stack;
    } else if (stack[stack.length - 2] === routeKey) {
      nextStack = stack.slice(0, -1);
    } else {
      const existingIndex = stack.lastIndexOf(routeKey);
      nextStack = existingIndex >= 0 ? stack.slice(0, existingIndex + 1) : [...stack, routeKey];
    }

    writeNavigationStack(nextStack);
    setCanGoBack(nextStack.length > 1 || Boolean(referrerBackRoute) || Boolean(resolvedFallbackBackRoute));
  }, [homeRoute, location.pathname, routeKey, schoolStaff]);

  useEffect(() => {
    const syncPreferences = (event?: Event) => {
      applyFontSizePreference();
      applyReduceMotionPreference();
      setPrivacyMode(getPrivacyModePreference());

      if (
        event instanceof CustomEvent &&
        event.detail?.key === SIDEBAR_DEFAULT_KEY
      ) {
        setIsDesktopSidebarCollapsed(getSidebarDefaultPreference() === "compact");
      }
    };

    const syncStoragePreferences = (event: StorageEvent) => {
      if (!event.key) return;
      syncPreferences();
      if (event.key === SIDEBAR_DEFAULT_KEY) {
        setIsDesktopSidebarCollapsed(getSidebarDefaultPreference() === "compact");
      }
    };

    syncPreferences();
    window.addEventListener(USER_PREFERENCE_EVENT, syncPreferences);
    window.addEventListener("storage", syncStoragePreferences);

    return () => {
      window.removeEventListener(USER_PREFERENCE_EVENT, syncPreferences);
      window.removeEventListener("storage", syncStoragePreferences);
    };
  }, []);

  const handleGoBack = () => {
    const stack = readNavigationStack();
    if (stack.length > 1) {
      const previousRoute = stack[stack.length - 2];
      const nextStack = stack.slice(0, -1);
      writeNavigationStack(nextStack);
      setCanGoBack(nextStack.length > 1);
      closeMobileSidebar();
      navigate(previousRoute);
      return;
    }

    const referrerBackRoute = getSameOriginReferrerRoute(routeKey);
    if (referrerBackRoute) {
      writeNavigationStack([referrerBackRoute]);
      setCanGoBack(false);
      closeMobileSidebar();
      navigate(referrerBackRoute);
      return;
    }

    const fallbackBackRoute = getFallbackBackRoute(location.pathname);
    const resolvedFallbackBackRoute =
      schoolStaff && fallbackBackRoute === "/dashboard"
        ? location.pathname === homeRoute
          ? null
          : homeRoute
        : fallbackBackRoute;
    if (resolvedFallbackBackRoute) {
      writeNavigationStack([resolvedFallbackBackRoute]);
      setCanGoBack(resolvedFallbackBackRoute !== homeRoute);
      closeMobileSidebar();
      navigate(resolvedFallbackBackRoute);
    }
  };

  const pageLabel = getPageLabel(location.pathname);
  const isProjectRoute = location.pathname.startsWith('/projects');
  const showPrimaryAction = schoolStaff ? location.pathname !== homeRoute : !isProjectRoute;
  const primaryActionLabel = schoolAdmin ? "School workspace" : schoolSupervisor ? "Supervisor workspace" : schoolStudent ? "Student workspace" : "Create project";
  const primaryActionShortLabel = schoolAdmin ? "School" : schoolSupervisor ? "Review" : schoolStudent ? "Work" : "Create";
  const primaryActionRoute = schoolStaff ? homeRoute : "/projects/new";
  const planLabel = schoolAdmin ? "School plan" : schoolSupervisor ? "Supervisor" : schoolStudent ? "Student" : isPremium() ? "Premium" : "Free";
  const visibleUserName = privacyMode ? "Private workspace" : user?.name;
  const visibleUserEmail = privacyMode ? "Identity hidden on this screen" : user?.email;
  const userInitials =
    privacyMode
      ? "UR"
      : user?.name
      ?.split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() ||
    user?.email?.slice(0, 2).toUpperCase() ||
    "UR";
  const isNavActive = (to: string) => location.pathname === to || (to === '/projects' && location.pathname.startsWith('/projects'));
  const navGroups: NavGroupConfig[] = [
    {
      label: schoolAdmin ? "School" : schoolSupervisor ? "Supervision" : schoolStudent ? "Student" : "Dashboard",
      items: schoolAdmin
        ? [
            { to: '/school-dashboard', icon: <GraduationCap size={18} />, label: 'School workspace' },
            { to: '/getting-started', icon: <HelpCircle size={18} />, label: 'Start here' },
          ]
        : schoolSupervisor
          ? [
              { to: '/supervisor-dashboard', icon: <UserCheck size={18} />, label: 'Supervisor workspace' },
              { to: '/supervisor-students', icon: <GraduationCap size={18} />, label: 'Assigned students' },
              { to: '/getting-started', icon: <HelpCircle size={18} />, label: 'Start here' },
            ]
          : schoolStudent
            ? [
                { to: '/student-workspace', icon: <FileCheck2 size={18} />, label: 'Student workspace' },
                { to: '/getting-started', icon: <HelpCircle size={18} />, label: 'Start here' },
                { to: '/research-topic-generator', icon: <Lightbulb size={18} />, label: 'Topic builder' },
                { to: '/projects/new?type=proposal', icon: <Plus size={18} />, label: 'Start proposal' },
                { to: '/projects/new?type=report', icon: <BookOpen size={18} />, label: 'Start report' },
                { to: '/projects', icon: <FileText size={18} />, label: 'My research work' },
              ]
        : [
            { to: '/dashboard', icon: <LayoutDashboard size={18} />, label: 'Today' },
            { to: '/getting-started', icon: <HelpCircle size={18} />, label: 'Start here' },
          ],
    },
    ...(schoolAdmin || schoolSupervisor || schoolStudent
      ? []
      : [
          {
            label: "My Work",
            items: [
              { to: '/projects', icon: <FileText size={18} />, label: 'My research work' },
            ],
          },
        ]),
    {
      label: "Review Tools",
      items: [
        { to: '/document-analysis', icon: <FileSearch size={18} />, label: 'Document analysis' },
        { to: '/plagiarism-checker', icon: <SearchCheck size={18} />, label: 'Originality check' },
        { to: '/marking-guide', icon: <ClipboardCheck size={18} />, label: 'Marking guide' },
      ],
    },
    {
      label: "Writing Tools",
      items: [
        { to: '/content-improvement', icon: <MessageSquareText size={18} />, label: 'Improve writing' },
        { to: '/humanizer', icon: <Wand2 size={18} />, label: 'Human review', badge: 'Deep' },
        { to: '/guidelines', icon: <BookOpen size={18} />, label: 'UHPAB guidelines' },
      ],
    },
    {
      label: "Account",
      items: [
        ...(!isPremium()
          ? [{ to: '/premium', icon: <Shield size={18} />, label: 'Premium tools' }]
          : []),
        { to: '/settings', icon: <Settings size={18} />, label: 'Settings' },
      ],
    },
  ];

  return (
    <div className="study-surface flex min-h-screen">
      {/* Backdrop overlay */}
      {isSidebarOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity lg:hidden"
          onClick={closeMobileSidebar}
        />
      )}
      
      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 shrink-0 transform overflow-hidden border-r bg-card shadow-xl transition-[transform,width,border-color] duration-300 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] lg:sticky lg:z-20 lg:translate-x-0 lg:shadow-none",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          isDesktopSidebarCollapsed ? "lg:w-20" : "lg:w-72"
        )}
      >
        <div className={cn(
          "flex h-full w-full flex-col"
        )}>
          <div className={cn("flex items-center justify-between px-4 py-4", isDesktopSidebarCollapsed && "lg:justify-center lg:px-3")}>
            <div
              className="min-w-0"
              title="UHPAB Study"
              onClick={(event) => {
                if (revealDesktopSidebarBeforeAction()) {
                  event.preventDefault?.();
                }
              }}
            >
              <BrandLogo
                title="UHPAB Study"
                markClassName="h-9 w-9"
                textClassName={cn(
                  "transition-[opacity,transform,width] duration-150 ease-out",
                  isDesktopSidebarCollapsed && "lg:w-0 lg:translate-x-1 lg:opacity-0"
                )}
              />
            </div>
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={closeMobileSidebar} aria-label="Close navigation" title="Close navigation">
              <X size={20} />
            </Button>
          </div>
          
          <div className={cn(
            "mx-4 mb-3 rounded-lg border bg-muted/45 p-3 transition-[margin,padding] duration-200 ease-out",
            isDesktopSidebarCollapsed && "lg:mx-3 lg:flex lg:justify-center lg:p-2"
          )}>
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-bold text-primary">
                {userInitials}
              </span>
              <div className={cn(
                "min-w-0 transition-[opacity,transform,width] duration-150 ease-out",
                isDesktopSidebarCollapsed && "lg:w-0 lg:translate-x-1 lg:opacity-0"
              )}>
                <p className="truncate text-sm font-medium">{visibleUserName}</p>
                <p className="truncate text-xs text-muted-foreground">{visibleUserEmail}</p>
              </div>
            </div>
            <div className={cn("mt-2", isDesktopSidebarCollapsed && "lg:hidden")}>
              <span className={cn(
                "text-xs px-2 py-0.5 rounded-full",
                isPremium() 
                  ? "bg-primary/20 text-primary" 
                  : "bg-muted text-muted-foreground"
              )}>
                {planLabel}
              </span>
            </div>
          </div>
          
          <nav className="flex-1 overflow-y-auto px-4 pb-3">
            {navGroups.map((group, groupIndex) => (
              <div key={group.label}>
                {groupIndex > 0 && <Separator className="my-3" />}
                <p className={cn(
                  "px-3 pb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground transition-[opacity,height,padding] duration-150 ease-out",
                  isDesktopSidebarCollapsed && "lg:h-0 lg:overflow-hidden lg:p-0 lg:opacity-0"
                )}>
                  {group.label}
                </p>
                <div className="space-y-1">
                  {group.items.map((item) => (
                    <NavItem
                      key={item.to}
                      to={item.to}
                      icon={item.icon}
                      label={item.label}
                      badge={item.badge}
                      active={isNavActive(item.to)}
                      onClick={closeMobileSidebar}
                      onCompactReveal={revealDesktopSidebar}
                      desktopCollapsed={isDesktopSidebarCollapsed}
                    />
                  ))}
                </div>
              </div>
            ))}
          </nav>
          
          <div className="space-y-4 p-4">
            {showPrimaryAction && (
              <Button
                variant="default"
                size="sm"
                className={cn("w-full gap-2 transition-[padding] duration-200 ease-out", isDesktopSidebarCollapsed && "lg:px-2")}
                onClick={() => {
                  if (revealDesktopSidebarBeforeAction()) return;
                  navigate(primaryActionRoute);
                  closeMobileSidebar();
                }}
                aria-label={primaryActionLabel}
                title={primaryActionLabel}
              >
                {schoolAdmin ? <GraduationCap size={16} /> : schoolSupervisor ? <UserCheck size={16} /> : <Plus size={16} />}
                <span className={cn(isDesktopSidebarCollapsed && "lg:hidden")}>{primaryActionLabel}</span>
              </Button>
            )}

            {showPrimaryAction && <Separator />}
            
            <Button 
              variant="ghost" 
              size="sm" 
              className={cn(
                "w-full justify-start gap-2 text-muted-foreground transition-[justify-content,padding] duration-200 ease-out",
                isDesktopSidebarCollapsed && "lg:justify-center lg:px-2"
              )}
              onClick={() => {
                if (revealDesktopSidebarBeforeAction()) return;
                void handleLogout();
              }}
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut size={16} />
              <span className={cn(isDesktopSidebarCollapsed && "lg:hidden")}>Sign out</span>
            </Button>
          </div>
        </div>
      </aside>
      
      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <header className="sticky top-0 z-30 border-b bg-card/95 backdrop-blur-xl">
          <div className="container flex min-h-14 items-center gap-3 py-2">
            <Button 
              variant="ghost" 
              size="icon" 
              className="shrink-0 lg:hidden"
              onClick={() => setIsSidebarOpen(true)}
              aria-label="Open mobile navigation"
              title="Open mobile navigation"
            >
              <Menu size={20} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="hidden shrink-0 lg:inline-flex"
              onClick={() => setIsDesktopSidebarCollapsed((current) => !current)}
              aria-label={isDesktopSidebarCollapsed ? "Open navigation" : "Collapse navigation"}
              title={isDesktopSidebarCollapsed ? "Open navigation" : "Collapse navigation"}
              aria-expanded={!isDesktopSidebarCollapsed}
            >
              {isDesktopSidebarCollapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
            </Button>
            {canGoBack && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 shrink-0 gap-1.5 px-2 text-muted-foreground hover:text-foreground"
                onClick={handleGoBack}
                aria-label="Go back to previous page"
                title="Go back"
              >
                <ArrowLeft size={16} />
                <span className="hidden sm:inline">Back</span>
              </Button>
            )}

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Link to={homeRoute} className="hidden text-xs font-medium text-muted-foreground hover:text-foreground sm:inline">
                  UHPAB Study
                </Link>
                <span className="hidden text-muted-foreground/40 sm:inline">/</span>
                <p className="truncate text-sm font-semibold sm:text-base">{pageLabel}</p>
              </div>
              <p className="hidden text-xs text-muted-foreground md:block">
                {schoolAdmin
                  ? "School workspace: candidates, cohorts, supervisors, assignments, and submissions."
                  : schoolSupervisor
                    ? "Supervisor workspace: assigned candidates, review decisions, comments, and submissions."
                    : schoolStudent
                      ? "Student workspace: assignments, submissions, correction requests, and supervisor responses."
                  : "Your research workspace: roadmap, document checks, writing help, and UHPAB guidance."}
              </p>
            </div>
            
            <div className="ml-auto flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="hidden gap-2 xl:flex"
                onClick={() => navigate('/document-analysis')}
              >
                <SearchCheck size={15} />
                Check document
              </Button>
              {showPrimaryAction && (
                <Button
                  variant="default"
                  size="sm"
                  className="gap-2"
                  onClick={() => navigate(primaryActionRoute)}
                >
                  {schoolAdmin ? <GraduationCap size={15} /> : schoolSupervisor ? <UserCheck size={15} /> : schoolStudent ? <FileCheck2 size={15} /> : <Plus size={15} />}
                  <span className="hidden sm:inline">{primaryActionLabel}</span>
                  <span className="sm:hidden">{primaryActionShortLabel}</span>
                </Button>
              )}
              {!isPremium() && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="hidden gap-1 border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 xl:flex"
                  onClick={() => navigate('/premium')}
                >
                  <Shield size={14} className="text-primary" />
                  <span>Premium</span>
                </Button>
              )}
            </div>
          </div>
        </header>
        
        {/* Main */}
        <main className="flex-1">
          {children}
        </main>
        
        {/* Footer */}
        <footer className="border-t bg-card py-4">
          <div className="container flex flex-col gap-3 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <BrandLogo to={homeRoute} markClassName="h-8 w-8" textClassName="font-semibold text-foreground" />
              <span className="hidden h-4 w-px bg-border sm:block" />
              <p className="min-w-0 truncate">
                {schoolAdmin
                  ? "School administration workspace for UHPAB research candidates."
                  : schoolSupervisor
                    ? "Supervisor review workspace for assigned UHPAB research candidates."
                    : schoolStudent
                      ? "Student submission workspace for school research supervision."
                  : "Research workspace for UHPAB proposals and reports."}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
              <p>Copyright {new Date().getFullYear()} UHPAB Research Assistant.</p>
              <Link to="/privacy" className="hover:text-foreground">Privacy Policy</Link>
              <Link to="/terms" className="hover:text-foreground">Terms of Service</Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default DashboardLayout;
