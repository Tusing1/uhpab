
import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { WorkspacePage, WorkspacePageHeader } from '@/components/workspace/WorkspacePage';
import {
  WorkspaceEmptyState,
  WorkspaceMetric,
} from '@/components/workspace/WorkspaceWorkflow';
import { Button } from '@/components/ui/button';
import { 
  Archive,
  FileText,
  Plus,
  Search,
  Calendar,
  Clock,
  FileEdit,
  FilePlus,
  Loader2,
} from 'lucide-react';
import { useProjects } from '@/contexts/ProjectContext';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import type { Project } from '@/types';
import { ReviewArchivePanel } from '@/pages/ReviewArchive';
import { cn } from '@/lib/utils';

type ResearchWorkView = 'projects' | 'archive';

const ProjectsPage = () => {
  const { projects, isLoading } = useProjects();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [sortBy, setSortBy] = React.useState('updated');
  const [filterType, setFilterType] = React.useState('all');
  const activeView: ResearchWorkView = searchParams.get('view') === 'archive' ? 'archive' : 'projects';

  const setActiveView = (view: ResearchWorkView) => {
    const nextParams = new URLSearchParams(searchParams);
    if (view === 'archive') {
      nextParams.set('view', 'archive');
    } else {
      nextParams.delete('view');
    }
    setSearchParams(nextParams);
  };

  const getAverageProgress = (project: Project) => {
    const values = Object.values(project.progress || {}).filter((value): value is number => typeof value === 'number');
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  };

  const proposalCount = projects.filter((project) => project.type === 'proposal').length;
  const reportCount = projects.filter((project) => project.type === 'report').length;
  const averageProgress = projects.length
    ? Math.round(projects.reduce((sum, project) => sum + getAverageProgress(project), 0) / projects.length)
    : 0;

  // Filter and sort projects
  const filteredProjects = projects
    .filter(project => {
      // Filter by search term
      const matchesSearch = 
        project.title.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Filter by type
      const matchesType = 
        filterType === 'all' || 
        project.type === filterType;
      
      return matchesSearch && matchesType;
    })
    .sort((a, b) => {
      // Sort by selected option
      if (sortBy === 'updated') {
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      } else if (sortBy === 'created') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      } else if (sortBy === 'alphabetical') {
        return a.title.localeCompare(b.title);
      } else if (sortBy === 'progress') {
        return getAverageProgress(b) - getAverageProgress(a);
      }
      return 0;
    });

  return (
    <DashboardLayout>
      <WorkspacePage width="wide" className="space-y-6">
        <WorkspacePageHeader
          eyebrow="Research workspace"
          tone="info"
          icon={<FileText size={14} />}
          title="My research work"
          description="Continue projects and reopen saved document reviews from one place."
          actions={
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                onClick={() => navigate('/projects/new')}
                className="gap-2"
              >
                <Plus size={16} />
                <span>New project</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/document-analysis')}
                className="gap-2"
              >
                <FileText size={16} />
                <span>Check document</span>
              </Button>
            </div>
          }
          aside={
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              <WorkspaceMetric label="Projects" value={projects.length} detail="Total workspaces" tone="info" />
              <WorkspaceMetric label="Proposals / reports" value={`${proposalCount}/${reportCount}`} detail="Current split" tone="success" />
              <WorkspaceMetric label="Average progress" value={`${averageProgress}%`} detail="Across all projects" tone={averageProgress >= 70 ? 'success' : averageProgress >= 35 ? 'warning' : 'neutral'} />
            </div>
          }
        />

        <section className="grid gap-3 md:grid-cols-2" aria-label="Research work areas">
          <button
            type="button"
            onClick={() => setActiveView('projects')}
            aria-pressed={activeView === 'projects'}
            className={cn(
              "flex min-h-[106px] items-start gap-3 rounded-lg border bg-card p-4 text-left shadow-sm transition-colors hover:border-primary/40 hover:bg-primary/5",
              activeView === 'projects' && "border-primary/50 bg-primary/5"
            )}
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FileText className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="flex flex-wrap items-center gap-2 font-semibold">
                Research projects
                {activeView === 'projects' && <Badge>Open</Badge>}
              </span>
              <span className="mt-1 block text-sm leading-6 text-muted-foreground">
                Proposal and report workspaces, progress, and project files.
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveView('archive')}
            aria-pressed={activeView === 'archive'}
            className={cn(
              "flex min-h-[106px] items-start gap-3 rounded-lg border bg-card p-4 text-left shadow-sm transition-colors hover:border-primary/40 hover:bg-primary/5",
              activeView === 'archive' && "border-primary/50 bg-primary/5"
            )}
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Archive className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="flex flex-wrap items-center gap-2 font-semibold">
                Saved review archive
                {activeView === 'archive' && <Badge>Open</Badge>}
              </span>
              <span className="mt-1 block text-sm leading-6 text-muted-foreground">
                Marking-guide reports, writing corrections, human reviews, and originality checks.
              </span>
            </span>
          </button>
        </section>

        {activeView === 'archive' ? (
          <ReviewArchivePanel />
        ) : (
          <>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search projects..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select
                value={filterType}
                onValueChange={setFilterType}
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="proposal">Proposals</SelectItem>
                  <SelectItem value="report">Reports</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={sortBy}
                onValueChange={setSortBy}
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="updated">Last updated</SelectItem>
                  <SelectItem value="created">Recently created</SelectItem>
                  <SelectItem value="alphabetical">Alphabetical</SelectItem>
                  <SelectItem value="progress">Highest Progress</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <WorkspaceEmptyState
                icon={<Loader2 className="h-5 w-5 animate-spin" />}
                title="Loading projects"
                description="Your research workspaces are being prepared."
              />
            ) : filteredProjects.length === 0 ? (
              <WorkspaceEmptyState
                icon={searchTerm || filterType !== 'all' ? <Search size={22} /> : <FileText size={22} />}
                title={searchTerm || filterType !== 'all' ? 'No matching projects found' : 'No projects yet'}
                description={
                  searchTerm || filterType !== 'all'
                    ? "Try adjusting your search or filters to find the project you need."
                    : "Create your first research project to get started with UHPAB guidelines."
                }
                actions={
                  searchTerm || filterType !== 'all' ? (
                    <Button
                      variant="outline"
                      className="gap-2"
                      onClick={() => {
                        setSearchTerm('');
                        setFilterType('all');
                      }}
                    >
                      <Search size={16} />
                      Clear filters
                    </Button>
                  ) : (
                    <Button className="gap-2" onClick={() => navigate('/projects/new')}>
                      <Plus size={16} />
                      New project
                    </Button>
                  )
                }
              />
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredProjects.map((project) => (
                  <button
                    type="button"
                    key={project.id}
                    className="bg-card text-card-foreground border rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden cursor-pointer group text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    onClick={() => navigate(`/projects/${project.id}`)}
                    aria-label={`View project: ${project.title}`}
                  >
                    <div className={`h-1 w-full ${project.type === 'proposal' ? 'bg-blue-500' : 'bg-green-500'}`} />
                    <div className="p-5">
                      <div className="flex justify-between items-start mb-3">
                        <Badge variant={project.type === 'proposal' ? 'default' : 'secondary'} className="capitalize">
                          {project.type === 'proposal' ? (
                            <FilePlus size={12} className="mr-1" />
                          ) : (
                            <FileEdit size={12} className="mr-1" />
                          )}
                          {project.type}
                        </Badge>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock size={12} />
                          <span>{new Date(project.updatedAt).toLocaleDateString()}</span>
                        </div>
                      </div>

                      <h3 className="font-medium line-clamp-2 mb-2 group-hover:text-primary transition-colors">
                        {project.title}
                      </h3>

                      <div className="space-y-2 mb-3">
                        <div className="flex justify-between items-center text-xs mb-1">
                          <span>Overall progress</span>
                          <span className="font-medium">{Math.round(getAverageProgress(project))}%</span>
                        </div>
                        <Progress value={getAverageProgress(project)} className="h-1.5" />
                      </div>

                      <div className="flex justify-between items-center text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar size={12} />
                          <span>Created: {new Date(project.createdAt).toLocaleDateString()}</span>
                        </div>
                        <span className="text-primary font-medium text-xs">View project</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </WorkspacePage>
    </DashboardLayout>
  );
};

export default ProjectsPage;
