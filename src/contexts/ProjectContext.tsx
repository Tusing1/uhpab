import React, { createContext, useContext, useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";

import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Project } from "@/types";

interface ProjectContextType {
  projects: Project[];
  currentProject: Project | null;
  isLoading: boolean;
  createProject: (title: string, type: "proposal" | "report") => Promise<Project>;
  getProject: (id: string) => Project | null;
  updateProject: (project: Project) => Promise<Project>;
  deleteProject: (id: string) => Promise<void>;
  setCurrentProject: (project: Project | null) => void;
  importAnalyzedDocument: (file: File, documentType: "proposal" | "report", issues: string[]) => Promise<Project>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);
type DbProject = Tables<"projects">;

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const localProjectsKey = (userId: string) => `projects_${userId}`;

const canUseRemoteProjects = (userId?: string) => Boolean(supabase && userId && uuidPattern.test(userId));
const getRemoteSchoolId = (schoolId?: string | null) => (schoolId && uuidPattern.test(schoolId) ? schoolId : null);
const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return "Unknown error";
};

const defaultProgress = (type: "proposal" | "report"): Project["progress"] => ({
  chapter1: 0,
  chapter2: 0,
  chapter3: 0,
  ...(type === "report" ? { chapter4: 0, chapter5: 0, references: 0 } : {}),
  appendices: 0,
});

const readLocalProjects = (userId: string): Project[] => {
  try {
    const stored = window.localStorage.getItem(localProjectsKey(userId));
    return stored ? (JSON.parse(stored) as Project[]) : [];
  } catch {
    return [];
  }
};

const writeLocalProjects = (userId: string, nextProjects: Project[]) => {
  window.localStorage.setItem(localProjectsKey(userId), JSON.stringify(nextProjects));
};

const convertToProjectType = (dbProject: DbProject): Project => ({
  id: dbProject.id,
  userId: dbProject.user_id,
  title: dbProject.title,
  type: dbProject.type as "proposal" | "report",
  createdAt: dbProject.created_at,
  updatedAt: dbProject.updated_at,
  progress: dbProject.progress || defaultProgress(dbProject.type as "proposal" | "report"),
  chapters: dbProject.chapters || {},
  preliminaryPages: dbProject.preliminary_pages || undefined,
  importedFrom: dbProject.imported_from || undefined,
  schoolId: dbProject.school_id || undefined,
  plagiarismScore: dbProject.plagiarism_score || undefined,
});

const convertToDbFormat = (project: Project) => ({
  id: project.id,
  user_id: project.userId,
  title: project.title,
  type: project.type,
  created_at: project.createdAt,
  updated_at: project.updatedAt,
  progress: project.progress,
  chapters: project.chapters,
  preliminary_pages: project.preliminaryPages || null,
  imported_from: project.importedFrom || null,
  school_id: project.schoolId || null,
  plagiarism_score: project.plagiarismScore || null,
});

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setProjects([]);
      setCurrentProject(null);
      setIsLoading(false);
      return;
    }

    const loadProjects = async () => {
      setIsLoading(true);

      try {
        if (canUseRemoteProjects(user.id)) {
          const { data, error } = await supabase!
            .from("projects")
            .select("*")
            .eq("user_id", user.id)
            .order("updated_at", { ascending: false });

          if (error) throw error;

          const remoteProjects = (data || []).map(convertToProjectType);
          setProjects(remoteProjects);

          const savedProjectId = window.localStorage.getItem("currentProjectId");
          setCurrentProject(savedProjectId ? remoteProjects.find((project) => project.id === savedProjectId) || null : null);
          return;
        }

        const localProjects = readLocalProjects(user.id);
        setProjects(localProjects);

        const savedProjectId = window.localStorage.getItem("currentProjectId");
        setCurrentProject(savedProjectId ? localProjects.find((project) => project.id === savedProjectId) || null : null);
      } catch (error) {
        console.error("Could not load projects", error);
        setProjects([]);
        setCurrentProject(null);
        toast.error("Projects could not be loaded");
      } finally {
        setIsLoading(false);
      }
    };

    void loadProjects();
  }, [user?.id]);

  const saveLocalProjectList = (nextProjects: Project[]) => {
    if (!user?.id) return;
    writeLocalProjects(user.id, nextProjects);
    setProjects(nextProjects);
  };

  const createProject = async (title: string, type: "proposal" | "report"): Promise<Project> => {
    if (!user?.id) throw new Error("User must be logged in to create a project");

    setIsLoading(true);
    const now = new Date().toISOString();

    try {
      if (canUseRemoteProjects(user.id)) {
        const { data, error } = await supabase!
          .from("projects")
          .insert({
            title,
            type,
            user_id: user.id,
            school_id: getRemoteSchoolId(user.schoolId),
            progress: defaultProgress(type),
            chapters: {},
            created_at: now,
            updated_at: now,
          })
          .select("*")
          .single();

        if (error || !data) throw error || new Error("Project did not save.");

        const createdProject = convertToProjectType(data);
        setProjects((current) => [createdProject, ...current]);
        setCurrentProject(createdProject);
        window.localStorage.setItem("currentProjectId", createdProject.id);
        toast.success("Project created");
        return createdProject;
      }

      const newProject: Project = {
        id: uuidv4(),
        userId: user.id,
        title,
        type,
        createdAt: now,
        updatedAt: now,
        progress: defaultProgress(type),
        chapters: {},
        schoolId: user.schoolId,
      };

      const nextProjects = [newProject, ...projects];
      saveLocalProjectList(nextProjects);
      setCurrentProject(newProject);
      window.localStorage.setItem("currentProjectId", newProject.id);
      toast.success("Project created");
      return newProject;
    } catch (error) {
      const message = getErrorMessage(error);
      toast.error(`Failed to create project: ${message}`);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const getProject = (id: string): Project | null => projects.find((project) => project.id === id) || null;

  const updateProject = async (project: Project): Promise<Project> => {
    setIsLoading(true);
    const updatedProject = {
      ...project,
      updatedAt: new Date().toISOString(),
    };

    try {
      if (canUseRemoteProjects(project.userId)) {
        const { data, error } = await supabase!
          .from("projects")
          .update(convertToDbFormat(updatedProject))
          .eq("id", project.id)
          .select("*")
          .single();

        if (error || !data) throw error || new Error("Project update failed.");

        const remoteProject = convertToProjectType(data);
        setProjects((current) => current.map((item) => (item.id === project.id ? remoteProject : item)));
        if (currentProject?.id === project.id) setCurrentProject(remoteProject);
        return remoteProject;
      }

      const nextProjects = projects.map((item) => (item.id === project.id ? updatedProject : item));
      if (project.userId) writeLocalProjects(project.userId, nextProjects);
      setProjects(nextProjects);
      if (currentProject?.id === project.id) setCurrentProject(updatedProject);
      return updatedProject;
    } catch (error) {
      const message = getErrorMessage(error);
      toast.error(`Failed to update project: ${message}`);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteProject = async (id: string): Promise<void> => {
    if (!user?.id) return;

    setIsLoading(true);

    try {
      if (canUseRemoteProjects(user.id)) {
        const { error } = await supabase!.from("projects").delete().eq("id", id);
        if (error) throw error;
      }

      const nextProjects = projects.filter((project) => project.id !== id);
      if (!canUseRemoteProjects(user.id)) writeLocalProjects(user.id, nextProjects);
      setProjects(nextProjects);

      if (currentProject?.id === id) {
        setCurrentProject(null);
        window.localStorage.removeItem("currentProjectId");
      }
    } catch (error) {
      const message = getErrorMessage(error);
      toast.error(`Failed to delete project: ${message}`);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const importAnalyzedDocument = async (
    file: File,
    documentType: "proposal" | "report",
    issues: string[],
  ): Promise<Project> => {
    if (!user?.id) throw new Error("User must be logged in to import a document");

    const now = new Date().toISOString();
    const title = `${file.name.replace(/\.[^.]+$/, "")} (Imported)`;
    const importedProject: Project = {
      id: uuidv4(),
      userId: user.id,
      title,
      type: documentType,
      createdAt: now,
      updatedAt: now,
      progress: {
        ...defaultProgress(documentType),
        chapter1: 30,
        chapter2: 20,
        chapter3: 10,
      },
      chapters: {
        chapter1: {
          issuesNeedingAttention: issues.slice(0, 2).join("\n\n"),
          background: "Imported document background section requires refinement.",
        },
      },
      importedFrom: {
        fileName: file.name,
        importDate: now,
        analysisIssues: issues,
      },
      schoolId: user.schoolId,
    };

    setIsLoading(true);

    try {
      if (canUseRemoteProjects(user.id)) {
        const { data, error } = await supabase!
          .from("projects")
          .insert({
            ...convertToDbFormat(importedProject),
            school_id: getRemoteSchoolId(user.schoolId),
          })
          .select("*")
          .single();

        if (error || !data) throw error || new Error("Failed to import document");

        const createdProject = convertToProjectType(data);
        setProjects((current) => [createdProject, ...current]);
        setCurrentProject(createdProject);
        window.localStorage.setItem("currentProjectId", createdProject.id);
        toast.success("Document imported as project");
        return createdProject;
      }

      const nextProjects = [importedProject, ...projects];
      saveLocalProjectList(nextProjects);
      setCurrentProject(importedProject);
      window.localStorage.setItem("currentProjectId", importedProject.id);
      toast.success("Document imported as project");
      return importedProject;
    } catch (error) {
      const message = getErrorMessage(error);
      toast.error(`Failed to import document: ${message}`);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ProjectContext.Provider
      value={{
        projects,
        currentProject,
        isLoading,
        createProject,
        getProject,
        updateProject,
        deleteProject,
        setCurrentProject,
        importAnalyzedDocument,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
};

export const useProjects = () => {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error("useProjects must be used within a ProjectProvider");
  }
  return context;
};
