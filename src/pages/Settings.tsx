import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  Accessibility,
  BookOpen,
  CheckCircle2,
  Database,
  Download,
  EyeOff,
  FileQuestion,
  FolderPlus,
  HardDrive,
  HelpCircle,
  Loader2,
  Monitor,
  PanelLeftOpen,
  RefreshCw,
  ShieldCheck,
  User,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import DashboardLayout from "@/components/layout/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { WorkspacePage, WorkspacePageHeader } from "@/components/workspace/WorkspacePage";
import {
  WorkspaceMetric,
  WorkspaceStatusNote,
} from "@/components/workspace/WorkspaceWorkflow";
import { useAuth } from "@/contexts/AuthContext";
import {
  downloadWorkspaceBackup,
  getStoredReviewCount,
  getWorkspaceStorageSummary,
  type WorkspaceStorageSummary,
} from "@/lib/researchWorkspaceBackup";
import {
  getFontSizePreference,
  getPreferredProjectType,
  getPrivacyModePreference,
  getReduceMotionPreference,
  getSidebarDefaultPreference,
  setFontSizePreference,
  setPreferredProjectType as savePreferredProjectType,
  setPrivacyModePreference,
  setReduceMotionPreference,
  setSidebarDefaultPreference,
  type FontSize,
  type PreferredProjectType,
  type SidebarDefault,
} from "@/lib/userPreferences";

type SettingsSectionProps = {
  id: string;
  icon: ReactNode;
  title: string;
  description: string;
  children: ReactNode;
};

type PreferenceRowProps = {
  label: string;
  description: string;
  children: ReactNode;
};

const formatBytes = (bytes: number | null) => {
  if (bytes === null) return "Not available";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const SettingsSection = ({
  id,
  icon,
  title,
  description,
  children,
}: SettingsSectionProps) => (
  <Card id={id} className="scroll-mt-24 p-5 sm:p-6">
    <div className="flex flex-col gap-3 border-b pb-5 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-primary/10 text-primary">
          {icon}
        </span>
        <div className="min-w-0">
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
      </div>
    </div>
    <div className="mt-6">{children}</div>
  </Card>
);

const PreferenceRow = ({ label, description, children }: PreferenceRowProps) => (
  <div className="flex flex-col gap-3 border-t pt-5 first:border-t-0 first:pt-0 sm:flex-row sm:items-center sm:justify-between">
    <div className="min-w-0">
      <p className="font-medium">{label}</p>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
    <div className="w-full sm:w-auto sm:min-w-[220px]">{children}</div>
  </div>
);

const Settings = () => {
  const { user, school, isPremium } = useAuth();
  const { theme, setTheme } = useTheme();
  const [fontSize, setFontSize] = useState<FontSize>(() => getFontSizePreference());
  const [preferredProjectType, setPreferredProjectTypeState] =
    useState<PreferredProjectType>(() => getPreferredProjectType());
  const [sidebarDefault, setSidebarDefaultState] =
    useState<SidebarDefault>(() => getSidebarDefaultPreference());
  const [privacyMode, setPrivacyModeState] = useState(() => getPrivacyModePreference());
  const [reduceMotion, setReduceMotionState] = useState(() => getReduceMotionPreference());
  const [storageSummary, setStorageSummary] = useState<WorkspaceStorageSummary | null>(null);
  const [isCheckingStorage, setIsCheckingStorage] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const htin = user?.htin || user?.studentId || "";
  const schoolName = user?.schoolName || school?.name || "";
  const schoolLocation = user?.schoolLocation || school?.location || "";
  const hasPremiumAccess = isPremium();
  const userId = user?.id || "guest";
  const currentPlanLabel =
    user?.role === "school-admin" || user?.role === "school-student"
      ? "School plan"
      : hasPremiumAccess
        ? "Premium"
        : "Free tier";

  const refreshStorageSummary = useCallback(async (notify = false) => {
    setIsCheckingStorage(true);
    try {
      const summary = await getWorkspaceStorageSummary(userId);
      setStorageSummary(summary);
      if (notify) toast.success("Stored work checked");
    } catch (error) {
      console.error("Could not inspect workspace storage", error);
      toast.error("Stored work could not be checked");
    } finally {
      setIsCheckingStorage(false);
    }
  }, [userId]);

  useEffect(() => {
    void refreshStorageSummary();
  }, [refreshStorageSummary]);

  const handleFontSizeChange = (value: string) => {
    const nextValue = value as FontSize;
    setFontSize(nextValue);
    setFontSizePreference(nextValue);
  };

  const handleProjectTypeChange = (value: string) => {
    const nextValue = value as PreferredProjectType;
    setPreferredProjectTypeState(nextValue);
    savePreferredProjectType(nextValue);
  };

  const handleSidebarDefaultChange = (value: string) => {
    const nextValue = value as SidebarDefault;
    setSidebarDefaultState(nextValue);
    setSidebarDefaultPreference(nextValue);
  };

  const handlePrivacyModeChange = (enabled: boolean) => {
    setPrivacyModeState(enabled);
    setPrivacyModePreference(enabled);
  };

  const handleReduceMotionChange = (enabled: boolean) => {
    setReduceMotionState(enabled);
    setReduceMotionPreference(enabled);
  };

  const downloadBackup = async () => {
    const toastId = toast.loading("Preparing workspace backup");
    setIsDownloading(true);
    try {
      await downloadWorkspaceBackup(userId, user?.email);
      toast.success("Workspace backup downloaded", { id: toastId });
    } catch (error) {
      console.error("Workspace backup failed", error);
      toast.error("Your workspace backup could not be prepared", { id: toastId });
    } finally {
      setIsDownloading(false);
    }
  };

  const reviewCount = storageSummary ? getStoredReviewCount(storageSummary) : 0;
  const settingsLinks = [
    {
      href: "#account",
      label: "Account details",
      detail: "Profile, school, and plan",
      icon: <User className="h-4 w-4" />,
    },
    {
      href: "#display",
      label: "Display",
      detail: "Theme, text, motion",
      icon: <Monitor className="h-4 w-4" />,
    },
    {
      href: "#workspace",
      label: "Workspace defaults",
      detail: "Projects and sidebar",
      icon: <PanelLeftOpen className="h-4 w-4" />,
    },
    {
      href: "#data",
      label: "Saved data",
      detail: "Storage and backup",
      icon: <Database className="h-4 w-4" />,
    },
    {
      href: "#help",
      label: "Help",
      detail: "Guides and support",
      icon: <HelpCircle className="h-4 w-4" />,
    },
  ];

  return (
    <DashboardLayout>
      <WorkspacePage width="wide" className="space-y-6">
        <WorkspacePageHeader
          eyebrow="Workspace preferences"
          tone="neutral"
          icon={<User size={14} />}
          title="Settings"
          description="Everything is visible on one page: profile details, screen comfort, workspace defaults, saved data, and help."
          aside={
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <User size={18} />
                </span>
                <div className="min-w-0">
                  <p className="truncate font-semibold">
                    {privacyMode ? "Private workspace" : user?.name || "Research user"}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">
                    {privacyMode ? "Identity hidden on this screen" : user?.email || "No email shown"}
                  </p>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border bg-muted/35 p-3">
                  <p className="text-xs text-muted-foreground">Plan</p>
                  <p className="mt-1 font-semibold">{currentPlanLabel}</p>
                </div>
                <div className="rounded-lg border bg-muted/35 p-3">
                  <p className="text-xs text-muted-foreground">Saved reviews</p>
                  <p className="mt-1 font-semibold">{storageSummary ? reviewCount : "Checking"}</p>
                </div>
              </div>
            </div>
          }
        />

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5" aria-label="Settings sections">
          {settingsLinks.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="group flex min-h-[104px] items-start gap-3 rounded-lg border bg-card p-4 shadow-sm transition-colors hover:border-primary/40 hover:bg-primary/5"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                {item.icon}
              </span>
              <span className="min-w-0">
                <span className="block font-semibold leading-5">{item.label}</span>
                <span className="mt-1 block text-sm leading-5 text-muted-foreground">
                  {item.detail}
                </span>
              </span>
            </a>
          ))}
        </section>

        <SettingsSection
          id="account"
          icon={<User className="h-5 w-5" />}
          title="Account details"
          description="These details are used when the app prepares title pages, declarations, approvals, and school forms."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={user?.name || ""} readOnly />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={user?.email || ""} readOnly />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="htin">HTIN number</Label>
              <Input id="htin" value={htin} readOnly placeholder="Added during registration" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="className">Class / course</Label>
              <Input
                id="className"
                value={user?.className || ""}
                readOnly
                placeholder="Added during registration"
              />
            </div>
            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="schoolName">School</Label>
              <Input
                id="schoolName"
                value={schoolName}
                readOnly
                placeholder="Choose a school during registration"
              />
            </div>
            {schoolLocation && (
              <div className="grid gap-2 md:col-span-2">
                <Label htmlFor="schoolLocation">School location</Label>
                <Input id="schoolLocation" value={schoolLocation} readOnly />
              </div>
            )}
            <div className="flex flex-col items-start gap-4 border-t pt-5 md:col-span-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <Label>Current plan</Label>
                <div className="mt-1 flex items-center gap-2">
                  <span className="font-semibold">{currentPlanLabel}</span>
                  <Badge variant={hasPremiumAccess ? "default" : "secondary"}>
                    {hasPremiumAccess ? "Active" : "Current plan"}
                  </Badge>
                </div>
              </div>
              {!hasPremiumAccess && (
                <Button asChild>
                  <Link to="/premium">View premium plans</Link>
                </Button>
              )}
            </div>
          </div>
        </SettingsSection>

        <SettingsSection
          id="display"
          icon={<Accessibility className="h-5 w-5" />}
          title="Display and accessibility"
          description="Choose how the app looks and feels on this computer or tablet."
        >
          <div className="space-y-5">
            <PreferenceRow label="Screen theme" description="Use a light screen, dark screen, or follow the device setting.">
              <Select value={theme || "system"} onValueChange={setTheme}>
                <SelectTrigger id="theme" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </PreferenceRow>
            <PreferenceRow label="Text size" description="Make labels, buttons, and report text easier to read.">
              <Select value={fontSize} onValueChange={handleFontSizeChange}>
                <SelectTrigger id="fontSize" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">Small</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="large">Large</SelectItem>
                </SelectContent>
              </Select>
            </PreferenceRow>
            <PreferenceRow label="Reduce animation" description="Use calmer screen changes and shorter movement effects.">
              <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-2">
                <span className="text-sm font-medium">{reduceMotion ? "On" : "Off"}</span>
                <Switch
                  id="reduceMotion"
                  checked={reduceMotion}
                  onCheckedChange={handleReduceMotionChange}
                  aria-label="Reduce animation"
                />
              </div>
            </PreferenceRow>
            <PreferenceRow label="Privacy screen" description="Hide your name and email in the sidebar when presenting or sharing a device.">
              <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-2">
                <span className="flex items-center gap-2 text-sm font-medium">
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                  {privacyMode ? "Hidden" : "Shown"}
                </span>
                <Switch
                  id="privacyMode"
                  checked={privacyMode}
                  onCheckedChange={handlePrivacyModeChange}
                  aria-label="Hide identity details"
                />
              </div>
            </PreferenceRow>
          </div>
        </SettingsSection>

        <SettingsSection
          id="workspace"
          icon={<PanelLeftOpen className="h-5 w-5" />}
          title="Workspace defaults"
          description="Set the starting choices the app should use when you open common work areas."
        >
          <div className="space-y-5">
            <PreferenceRow label="Default new project type" description="Choose the option that should already be selected when you create a project.">
              <Select value={preferredProjectType} onValueChange={handleProjectTypeChange}>
                <SelectTrigger id="preferredProjectType" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="proposal">Research proposal</SelectItem>
                  <SelectItem value="report">Final report</SelectItem>
                </SelectContent>
              </Select>
            </PreferenceRow>
            <PreferenceRow label="Sidebar start" description="Choose whether the side navigation starts with icons only or full labels.">
              <Select value={sidebarDefault} onValueChange={handleSidebarDefaultChange}>
                <SelectTrigger id="sidebarDefault" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="compact">Compact icons</SelectItem>
                  <SelectItem value="expanded">Full labels</SelectItem>
                </SelectContent>
              </Select>
            </PreferenceRow>
            <WorkspaceStatusNote
              tone="info"
              icon={<FolderPlus className="h-4 w-4" />}
              title="Saved on this device"
              description="These defaults stay in this browser. Another computer can have different settings."
            />
          </div>
        </SettingsSection>

        <SettingsSection
          id="data"
          icon={<Database className="h-5 w-5" />}
          title="Saved research data"
          description="Check what has been saved in this browser and download a backup for your records."
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <Badge variant="outline" className="w-fit gap-1.5 border-emerald-200 bg-emerald-50 text-emerald-800">
              <ShieldCheck className="h-3.5 w-3.5" />
              Local device storage
            </Badge>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <WorkspaceMetric
              label="Projects"
              value={storageSummary?.projects ?? "..."}
              detail="Research workspaces"
              tone="info"
            />
            <WorkspaceMetric
              label="Saved reviews"
              value={storageSummary ? reviewCount : "..."}
              detail="Tool results in this browser"
              tone="success"
            />
            <WorkspaceMetric
              label="Browser storage used"
              value={formatBytes(storageSummary?.usedBytes ?? null)}
              detail="Estimated local storage"
              tone="warning"
            />
          </div>

          <WorkspaceStatusNote
            tone="warning"
            icon={<HardDrive className="h-4 w-4" />}
            title="Keep original documents"
            description="The backup includes project text and review results. Original PDF and DOCX uploads are not embedded, so keep the files separately."
            className="mt-6"
          />

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button className="gap-2" onClick={downloadBackup} disabled={isDownloading}>
              {isDownloading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {isDownloading ? "Preparing backup" : "Download workspace backup"}
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => void refreshStorageSummary(true)}
              disabled={isCheckingStorage}
            >
              {isCheckingStorage ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Check stored work
            </Button>
          </div>
          <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-muted-foreground">
            <HardDrive className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Workspace backups are JSON files that can be inspected later or used during future import work.
          </p>
        </SettingsSection>

        <SettingsSection
          id="help"
          icon={<HelpCircle className="h-5 w-5" />}
          title="Help and guidance"
          description="Jump to the pages students most often need when they are unsure what to do next."
        >
          <div className="grid gap-3 md:grid-cols-3">
            <Button variant="outline" className="h-auto justify-start gap-3 p-4 text-left" asChild>
              <Link to="/getting-started">
                <HelpCircle className="h-5 w-5 shrink-0 text-primary" />
                <span>
                  <span className="block font-medium">Start here</span>
                  <span className="block text-sm text-muted-foreground">See the step-by-step guide</span>
                </span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto justify-start gap-3 p-4 text-left" asChild>
              <Link to="/guidelines">
                <BookOpen className="h-5 w-5 shrink-0 text-primary" />
                <span>
                  <span className="block font-medium">UHPAB guide</span>
                  <span className="block text-sm text-muted-foreground">Check structure and format</span>
                </span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto justify-start gap-3 p-4 text-left" asChild>
              <Link to="/document-analysis">
                <FileQuestion className="h-5 w-5 shrink-0 text-primary" />
                <span>
                  <span className="block font-medium">Check my document</span>
                  <span className="block text-sm text-muted-foreground">Find missing parts before submission</span>
                </span>
              </Link>
            </Button>
          </div>
          <div className="mt-6 flex items-center gap-2 border-t pt-5 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            The app currently supports English research documents.
          </div>
        </SettingsSection>
      </WorkspacePage>
    </DashboardLayout>
  );
};

export default Settings;
