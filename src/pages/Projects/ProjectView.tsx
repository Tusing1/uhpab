import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { WorkspacePage, WorkspacePageHeader } from '@/components/workspace/WorkspacePage';
import {
  WorkspaceEmptyState,
  WorkspaceMetric,
  WorkspaceStatusNote,
} from '@/components/workspace/WorkspaceWorkflow';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useProjects } from '@/contexts/ProjectContext';
import { useAuth } from '@/contexts/AuthContext';
import { MoreVertical, Edit, Trash2, Download, AlertCircle, CalendarDays, Clock, Library, FileText, Loader2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from "sonner";
import { generateReport } from '@/lib/api';
import { sanitizeFileName, triggerBrowserDownload } from '@/lib/download';
import { Progress } from '@/components/ui/progress';
import type { Project } from '@/types';

const ProjectView = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [isDownloading, setIsDownloading] = useState(false);
  const [lastDownload, setLastDownload] = useState<{ url: string; fileName: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [openDeleteAlert, setOpenDeleteAlert] = useState(false);
  const navigate = useNavigate();
  const [error, setError] = useState<string>('');
  
  const { projects, getProject, deleteProject, isLoading } = useProjects();
  const [projectData, setProjectData] = useState<Project | null>(null);
  
  const { user } = useAuth();

  useEffect(() => {
    if (projectId) {
      const project = projects.find(p => p.id === projectId) || getProject(projectId);
      setProjectData(project);
    }
  }, [projectId, projects, getProject]);

  const handleEdit = () => {
    navigate(`/projects/${projectId}/edit`);
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      if (projectId) {
        await deleteProject(projectId);
        navigate('/projects');
        toast.success("Project deleted successfully");
      }
    } catch (err) {
      console.error("Failed to delete project:", err);
      setError("Failed to delete project. Please try again.");
      toast.error("Failed to delete project. Please try again.");
    } finally {
      setIsDeleting(false);
      setOpenDeleteAlert(false);
    }
  };

  const handleDownload = async () => {
    if (!projectId || !user?.id || !projectData) {
      toast.error("Project ID or User ID is missing.");
      return;
    }

    setIsDownloading(true);
    const downloadToastId = toast.loading("Preparing editable DOCX", {
      description: "Collecting the saved project sections.",
    });
    try {
      const report = await generateReport(projectId, user.id, projectData.type, 'docx', {
        title: projectData.title,
        chapters: projectData.chapters,
        student: user
      });
      
      if (report && report.url) {
        const fileName = `${sanitizeFileName(projectData.title || 'research')}.${report.format}`;
        triggerBrowserDownload(report.url, fileName, { notify: false });
        setLastDownload({ url: report.url, fileName });
        toast.success("Download started", {
          id: downloadToastId,
          description: `${fileName} is being saved to your downloads.`,
        });
      } else {
        toast.error("Failed to generate report or URL is missing.", { id: downloadToastId });
        setError("Failed to generate report or URL is missing.");
      }
    } catch (err) {
      console.error("Download failed:", err);
      setError("Failed to generate report. Please try again.");
      toast.error("Failed to generate report. Please try again.", { id: downloadToastId });
    } finally {
      setIsDownloading(false);
    }
  };

  // Calculate average progress
  const getAverageProgress = () => {
    if (!projectData || !projectData.progress) return 0;
    
    const values = Object.values(projectData.progress) as number[];
    if (values.length === 0) return 0;
    
    const sum = values.reduce((a: number, b: number) => a + b, 0);
    const average = sum / values.length;
    return Math.round(average); // Return a rounded integer percentage
  };

  // Format date to readable format
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const sourceCount = Array.isArray(projectData?.chapters?._sourcesLibrary) ? projectData.chapters._sourcesLibrary.length : 0;
  const referenceCount = Array.isArray(projectData?.chapters?.references?.items) ? projectData.chapters.references.items.length : 0;
  const tableFigureCount = Array.isArray(projectData?.chapters?._tableFigureRegister) ? projectData.chapters._tableFigureRegister.length : 0;

  if (isLoading) {
    return (
      <DashboardLayout>
        <WorkspacePage>
          <WorkspaceEmptyState
            icon={<Loader2 className="h-5 w-5 animate-spin" />}
            title="Loading project"
            description="Your saved research workspace is being prepared."
          />
        </WorkspacePage>
      </DashboardLayout>
    );
  }

  if (!projectData && !isLoading) {
    return (
      <DashboardLayout>
        <WorkspacePage>
          <WorkspaceEmptyState
            tone="warning"
            icon={<FileText size={22} />}
            title="Project not found"
            description="The project you are looking for does not exist or has been deleted."
            actions={<Button onClick={() => navigate('/projects')}>Back to projects</Button>}
          />
        </WorkspacePage>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <WorkspacePage width="wide" className="space-y-6">
        <WorkspacePageHeader
          eyebrow={projectData?.type === 'proposal' ? 'Research proposal' : 'Final report'}
          tone="info"
          icon={<FileText size={14} />}
          title={projectData?.title || 'Research project'}
          description="Review the project status, continue writing, organize evidence, or download the editable research file."
          actions={
            <>
              <Button onClick={handleEdit} className="gap-2">
                <Edit className="h-4 w-4" />
                Continue writing
              </Button>
              <Button onClick={handleDownload} disabled={isDownloading} variant="outline" className="gap-2 bg-white/80">
                {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                {isDownloading ? 'Preparing DOCX' : 'Download DOCX'}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" aria-label="More project actions" title="More project actions">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Project actions</DropdownMenuLabel>
                  <DropdownMenuItem onClick={handleEdit}>
                    <Edit className="mr-2 h-4 w-4" /> Edit project
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <AlertDialog open={openDeleteAlert} onOpenChange={setOpenDeleteAlert}>
                    <AlertDialogTrigger asChild>
                      <DropdownMenuItem onSelect={(event) => {
                        event.preventDefault();
                        setOpenDeleteAlert(true);
                      }}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        <span>Delete project</span>
                      </DropdownMenuItem>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete this project?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This permanently deletes this research project and its saved sections. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction disabled={isDeleting} onClick={handleDelete}>
                          {isDeleting ? 'Deleting...' : 'Delete project'}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          }
          aside={
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Badge variant="outline" className="capitalize">{projectData?.type}</Badge>
                  <p className="mt-3 text-3xl font-bold">{getAverageProgress()}%</p>
                  <p className="text-sm text-muted-foreground">overall progress</p>
                </div>
                <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <FileText className="h-5 w-5" />
                </span>
              </div>
              <Progress value={getAverageProgress()} className="h-2" />
            </div>
          }
        />

        {error && (
          <WorkspaceStatusNote
            tone="danger"
            icon={<AlertCircle className="h-4 w-4" />}
            title="Project action failed"
            description={error}
          />
        )}

        {lastDownload && (
          <WorkspaceStatusNote
            tone="success"
            icon={<Download className="h-4 w-4" />}
            title="Download started"
            description={
              <span>
                If nothing appeared in your browser, use this link:{" "}
                <a href={lastDownload.url} download={lastDownload.fileName} className="font-medium underline">
                  {lastDownload.fileName}
                </a>
              </span>
            }
          />
        )}

        <section className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
          <Card className="study-card rounded-lg">
            <CardHeader>
              <CardTitle>Project details</CardTitle>
              <CardDescription>Core dates, type, and current writing status.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="rounded-lg border bg-muted/30 p-4">
                <p className="text-sm font-medium text-muted-foreground">Title</p>
                <p className="mt-1 break-words text-lg font-semibold">{projectData?.title}</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border bg-card p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <CalendarDays className="h-4 w-4" />
                    Created
                  </div>
                  <p className="mt-2 font-semibold">{projectData?.createdAt ? formatDate(projectData.createdAt) : 'Not available'}</p>
                </div>
                <div className="rounded-lg border bg-card p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    Last updated
                  </div>
                  <p className="mt-2 font-semibold">{projectData?.updatedAt ? formatDate(projectData.updatedAt) : 'Not available'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="study-card rounded-lg">
            <CardHeader>
              <CardTitle>Evidence workspace</CardTitle>
              <CardDescription>Sources, references, and result data connected to this project.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <WorkspaceMetric label="Saved sources" value={sourceCount} detail="Evidence library" tone="info" />
                <WorkspaceMetric label="References" value={referenceCount} detail="APA entries" tone="success" />
                <WorkspaceMetric label="Tables/figures" value={tableFigureCount} detail="Report items" tone="warning" />
              </div>
              <Button onClick={handleEdit} className="w-full gap-2">
                <Library className="h-4 w-4" />
                Open evidence tools
              </Button>
            </CardContent>
          </Card>
        </section>

        {projectData?.chapters && Object.keys(projectData.chapters).length > 0 && (
          <Card className="study-card rounded-lg">
            <CardHeader>
              <CardTitle>Research content</CardTitle>
              <CardDescription>Progress on each section of your proposal or report.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              {Object.entries(projectData.progress || {}).map(([key, value]) => {
                let chapterTitle;

                switch(key) {
                  case 'preliminaryPages':
                    chapterTitle = 'Preliminary pages';
                    break;
                  case 'chapter1':
                    chapterTitle = 'Chapter 1: Introduction';
                    break;
                  case 'chapter2':
                    chapterTitle = 'Chapter 2: Literature review';
                    break;
                  case 'chapter3':
                    chapterTitle = 'Chapter 3: Methodology';
                    break;
                  case 'chapter4':
                    chapterTitle = 'Chapter 4: Results and findings';
                    break;
                  case 'chapter5':
                    chapterTitle = 'Chapter 5: Discussion and conclusion';
                    break;
                  case 'references':
                    chapterTitle = 'References';
                    break;
                  case 'appendices':
                    chapterTitle = 'Appendices';
                    break;
                  default:
                    chapterTitle = key;
                }

                return (
                  <div key={key} className="rounded-lg border bg-card p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium">{chapterTitle}</p>
                      <p className="text-sm font-semibold">{value as number}%</p>
                    </div>
                    <Progress value={value as number} className="mt-3 h-2" />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}
      </WorkspacePage>
    </DashboardLayout>
  );
};

export default ProjectView;
