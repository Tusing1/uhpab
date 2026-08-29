import React, { createContext, useContext, useEffect, useState } from "react";
import type { User as SupabaseUser } from "@supabase/supabase-js";

import { findSchoolById } from "@/data/schools";
import { supabase } from "@/integrations/supabase/client";
import { isDemoAuthEnabled, isSupabaseConfigured } from "@/lib/runtimeConfig";
import { School, User, UserRole } from "@/types";

type StudentRegistrationProfile = {
  schoolId: string;
  className: string;
  htin: string;
  researchTopic?: string;
};

type DemoUser = User & { password: string };

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, profile: StudentRegistrationProfile) => Promise<void>;
  registerSchool: (email: string, password: string, schoolId: string, schoolName?: string, studentLimit?: number) => Promise<void>;
  logout: () => Promise<void>;
  isPremium: () => boolean;
  isSchoolAdmin: () => boolean;
  isSchoolSupervisor: () => boolean;
  isSchoolStudent: () => boolean;
  school: School | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const customSchoolPrefix = "custom-school:";
const userStorageKey = "uhpabUser";
const legacyUserStorageKey = "unmebUser";
const localDemoUsersKey = "uhpabDemoUsers";

const roleValues: UserRole[] = ["free", "premium", "school-admin", "school-supervisor", "school-student"];

const seededDemoUsers: DemoUser[] = [
  {
    id: "1",
    email: "demo@uhpab.edu",
    password: "password",
    name: "Demo User",
    role: "free",
    studentId: "UHPAB12345",
    htin: "UHPAB12345",
    className: "Diploma in Nursing",
    researchTopic: "Factors Associated with Uptake of Cervical Cancer Screening Among Women of Reproductive Age at Kampala Hospital",
    schoolName: "Kampala Nursing School",
    schoolId: "school1",
    schoolLocation: "Kampala Capital City",
  },
  {
    id: "2",
    email: "premium@uhpab.edu",
    password: "password",
    name: "Premium User",
    role: "premium",
    studentId: "UHPAB67890",
  },
  {
    id: "3",
    email: "school@example.edu",
    password: "password",
    name: "School Admin",
    role: "school-admin",
    schoolId: "school1",
    schoolName: "Kampala Nursing School",
    schoolLocation: "Kampala Capital City",
  },
  {
    id: "4",
    email: "akello@school.example",
    password: "password",
    name: "Sr. Akello",
    role: "school-supervisor",
    schoolId: "school1",
    schoolName: "Kampala Nursing School",
    schoolLocation: "Kampala Capital City",
    supervisorId: "sup-akello",
    supervisorName: "Sr. Akello",
  },
  {
    id: "5",
    email: "anitah@student.example",
    password: "password",
    name: "Anitah N.",
    role: "school-student",
    studentId: "school1-stu-001",
    htin: "UHPAB/24/DN/001",
    className: "Diploma Nursing - Year 3",
    researchTopic: "Knowledge and attitude towards cervical cancer screening among women attending ANC",
    schoolId: "school1",
    schoolName: "Kampala Nursing School",
    schoolLocation: "Kampala Capital City",
  },
];

const getCustomSchoolName = (schoolValue?: string) =>
  schoolValue?.startsWith(customSchoolPrefix) ? schoolValue.replace(customSchoolPrefix, "").trim() : "";

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const isUserRole = (role: unknown): role is UserRole =>
  typeof role === "string" && roleValues.includes(role as UserRole);

const readStoredDemoUsers = (): DemoUser[] => {
  try {
    const stored = window.localStorage.getItem(localDemoUsersKey);
    return stored ? (JSON.parse(stored) as DemoUser[]) : [];
  } catch {
    return [];
  }
};

const getDemoUsers = () => [...seededDemoUsers, ...readStoredDemoUsers()];

const saveDemoUser = (user: DemoUser) => {
  const storedUsers = readStoredDemoUsers().filter((storedUser) => normalizeEmail(storedUser.email) !== normalizeEmail(user.email));
  window.localStorage.setItem(localDemoUsersKey, JSON.stringify([...storedUsers, user]));
};

const resolveSchool = (appUser: User | null): School | null => {
  if (!appUser?.schoolId) return null;

  const officialSchool = findSchoolById(appUser.schoolId);
  if (officialSchool) {
    return {
      id: officialSchool.id,
      name: officialSchool.name,
      email: appUser.email,
      location: officialSchool.location,
      category: officialSchool.categoryLabel,
      subscriptionTier: appUser.role === "school-admin" || appUser.role === "school-supervisor" ? "standard" : "basic",
      studentLimit: appUser.role === "school-admin" || appUser.role === "school-supervisor" ? 250 : 50,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  if (appUser.schoolName) {
    return {
      id: appUser.schoolId,
      name: appUser.schoolName,
      email: appUser.email,
      location: appUser.schoolLocation,
      category: "Health training institution",
      subscriptionTier: appUser.role === "school-admin" || appUser.role === "school-supervisor" ? "standard" : "basic",
      studentLimit: appUser.role === "school-admin" || appUser.role === "school-supervisor" ? 250 : 50,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  return null;
};

const toAppUser = (supabaseUser: SupabaseUser): User => {
  const metadata = supabaseUser.user_metadata || {};
  const role = isUserRole(metadata.role) ? metadata.role : "free";

  return {
    id: supabaseUser.id,
    email: supabaseUser.email || "",
    name: metadata.name || metadata.full_name || supabaseUser.email?.split("@")[0] || "Student",
    role,
    studentId: metadata.studentId || metadata.student_id || metadata.htin,
    htin: metadata.htin || metadata.studentId || metadata.student_id,
    className: metadata.className || metadata.class_name,
    researchTopic: metadata.researchTopic || metadata.research_topic,
    schoolId: metadata.schoolId || metadata.school_id,
    schoolName: metadata.schoolName || metadata.school_name,
    schoolLocation: metadata.schoolLocation || metadata.school_location,
    supervisorId: metadata.supervisorId || metadata.supervisor_id,
    supervisorName: metadata.supervisorName || metadata.supervisor_name,
  };
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [school, setSchool] = useState<School | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const applyUser = (nextUser: User | null, persist = true) => {
    setUser(nextUser);
    setSchool(resolveSchool(nextUser));

    if (!persist) return;
    if (nextUser) {
      window.localStorage.setItem(userStorageKey, JSON.stringify(nextUser));
      window.localStorage.removeItem(legacyUserStorageKey);
    } else {
      window.localStorage.removeItem(userStorageKey);
      window.localStorage.removeItem(legacyUserStorageKey);
    }
  };

  useEffect(() => {
    let isMounted = true;
    let unsubscribe: (() => void) | undefined;

    const loadStoredDemoSession = () => {
      if (!isDemoAuthEnabled) {
        applyUser(null);
        return;
      }

      const storedUser = window.localStorage.getItem(userStorageKey) || window.localStorage.getItem(legacyUserStorageKey);
      if (!storedUser) {
        applyUser(null);
        return;
      }

      try {
        applyUser(JSON.parse(storedUser) as User);
      } catch {
        applyUser(null);
      }
    };

    const bootstrap = async () => {
      setIsLoading(true);

      if (supabase) {
        const { data } = await supabase.auth.getSession();
        if (!isMounted) return;

        if (data.session?.user) {
          applyUser(toAppUser(data.session.user));
        } else {
          loadStoredDemoSession();
        }

        const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
          if (!isMounted) return;
          applyUser(session?.user ? toAppUser(session.user) : null);
        });
        unsubscribe = () => authListener.subscription.unsubscribe();
      } else {
        loadStoredDemoSession();
      }

      if (isMounted) setIsLoading(false);
    };

    void bootstrap();

    return () => {
      isMounted = false;
      unsubscribe?.();
    };
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    const normalizedEmail = normalizeEmail(email);

    try {
      if (supabase) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });

        if (!error && data.user) {
          applyUser(toAppUser(data.user));
          return;
        }

        if (!isDemoAuthEnabled) {
          throw new Error(error?.message || "Invalid email or password");
        }
      }

      if (!isDemoAuthEnabled) {
        throw new Error("Authentication is not configured for this deployment.");
      }

      const foundUser = getDemoUsers().find(
        (demoUser) => normalizeEmail(demoUser.email) === normalizedEmail && demoUser.password === password,
      );

      if (!foundUser) {
        throw new Error(
          isSupabaseConfigured
            ? "Invalid email or password"
            : "Demo login is disabled. Configure Supabase before signing in.",
        );
      }

      const { password: _password, ...userWithoutPassword } = foundUser;
      applyUser(userWithoutPassword);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string, name: string, profile: StudentRegistrationProfile) => {
    setIsLoading(true);
    const selectedSchool = findSchoolById(profile.schoolId);
    const customSchoolName = getCustomSchoolName(profile.schoolId);
    const normalizedEmail = normalizeEmail(email);

    try {
      const metadata = {
        name: name.trim(),
        role: "school-student" satisfies UserRole,
        htin: profile.htin.trim(),
        studentId: profile.htin.trim(),
        className: profile.className.trim(),
        researchTopic: profile.researchTopic,
        schoolId: selectedSchool?.id || profile.schoolId,
        schoolName: selectedSchool?.name || customSchoolName || profile.schoolId,
        schoolLocation: selectedSchool?.location,
      };

      if (supabase) {
        const { data, error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: { data: metadata },
        });

        if (error) throw new Error(error.message);
        if (!data.user) throw new Error("Account could not be created. Please try again.");

        applyUser(toAppUser(data.user));
        return;
      }

      if (!isDemoAuthEnabled) {
        throw new Error("Account creation is not configured for this deployment.");
      }

      if (getDemoUsers().some((demoUser) => normalizeEmail(demoUser.email) === normalizedEmail)) {
        throw new Error("User already exists");
      }

      const newUser: DemoUser = {
        id: crypto.randomUUID?.() || Math.random().toString(36).slice(2),
        email: normalizedEmail,
        password,
        name: metadata.name,
        role: "school-student",
        studentId: metadata.studentId,
        htin: metadata.htin,
        className: metadata.className,
        researchTopic: metadata.researchTopic,
        schoolId: metadata.schoolId,
        schoolName: metadata.schoolName,
        schoolLocation: metadata.schoolLocation,
      };

      saveDemoUser(newUser);
      const { password: _password, ...userWithoutPassword } = newUser;
      applyUser(userWithoutPassword);
    } finally {
      setIsLoading(false);
    }
  };

  const registerSchool = async (email: string, password: string, schoolId: string, schoolName?: string, studentLimit = 50) => {
    setIsLoading(true);
    const selectedSchool = findSchoolById(schoolId);
    const customSchoolName = getCustomSchoolName(schoolId);
    const normalizedEmail = normalizeEmail(email);
    const resolvedSchoolId = selectedSchool?.id || schoolId;
    const resolvedSchoolName = selectedSchool?.name || schoolName || customSchoolName || "Health Training Institution";

    try {
      const metadata = {
        name: `${resolvedSchoolName} Admin`,
        role: "school-admin" satisfies UserRole,
        schoolId: resolvedSchoolId,
        schoolName: resolvedSchoolName,
        schoolLocation: selectedSchool?.location,
        studentLimit,
      };

      if (supabase) {
        const { data, error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: { data: metadata },
        });

        if (error) throw new Error(error.message);
        if (!data.user) throw new Error("School account could not be created. Please try again.");

        applyUser(toAppUser(data.user));
        return;
      }

      if (!isDemoAuthEnabled) {
        throw new Error("School signup is not configured for this deployment.");
      }

      if (getDemoUsers().some((demoUser) => normalizeEmail(demoUser.email) === normalizedEmail)) {
        throw new Error("School already exists with this email");
      }

      const newUser: DemoUser = {
        id: crypto.randomUUID?.() || Math.random().toString(36).slice(2),
        email: normalizedEmail,
        password,
        name: metadata.name,
        role: "school-admin",
        schoolId: metadata.schoolId,
        schoolName: metadata.schoolName,
        schoolLocation: metadata.schoolLocation,
      };

      saveDemoUser(newUser);
      const { password: _password, ...userWithoutPassword } = newUser;
      applyUser(userWithoutPassword);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      if (supabase) {
        await supabase.auth.signOut();
      }
      applyUser(null);
      window.localStorage.removeItem("currentProjectId");
    } finally {
      setIsLoading(false);
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    login,
    register,
    registerSchool,
    logout,
    isPremium: () =>
      user?.role === "premium" ||
      user?.role === "school-admin" ||
      user?.role === "school-supervisor" ||
      user?.role === "school-student",
    isSchoolAdmin: () => user?.role === "school-admin",
    isSchoolSupervisor: () => user?.role === "school-supervisor",
    isSchoolStudent: () => user?.role === "school-student",
    school,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
