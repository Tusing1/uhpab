import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";

import RouteLoadingScreen from "@/components/app/RouteLoadingScreen";
import { useAuth } from "@/contexts/AuthContext";

type RequireAuthProps = {
  children: ReactNode;
  schoolAdminOnly?: boolean;
  schoolSupervisorOnly?: boolean;
  schoolStudentOnly?: boolean;
  redirectSchoolAdminTo?: string;
  redirectSupervisorTo?: string;
  redirectStudentTo?: string;
};

const RequireAuth = ({
  children,
  schoolAdminOnly = false,
  schoolSupervisorOnly = false,
  schoolStudentOnly = false,
  redirectSchoolAdminTo,
  redirectSupervisorTo,
  redirectStudentTo,
}: RequireAuthProps) => {
  const { user, isLoading, isSchoolAdmin, isSchoolSupervisor, isSchoolStudent } = useAuth();
  const location = useLocation();

  if (isLoading) return <RouteLoadingScreen />;

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (schoolAdminOnly && !isSchoolAdmin()) {
    return <Navigate to={isSchoolSupervisor() ? "/supervisor-dashboard" : isSchoolStudent() ? "/student-workspace" : "/dashboard"} replace />;
  }

  if (schoolSupervisorOnly && !isSchoolSupervisor()) {
    return <Navigate to={isSchoolAdmin() ? "/school-dashboard" : isSchoolStudent() ? "/student-workspace" : "/dashboard"} replace />;
  }

  if (schoolStudentOnly && !isSchoolStudent()) {
    return <Navigate to={isSchoolAdmin() ? "/school-dashboard" : isSchoolSupervisor() ? "/supervisor-dashboard" : "/dashboard"} replace />;
  }

  if (redirectSchoolAdminTo && isSchoolAdmin()) {
    return <Navigate to={redirectSchoolAdminTo} replace />;
  }

  if (redirectSupervisorTo && isSchoolSupervisor()) {
    return <Navigate to={redirectSupervisorTo} replace />;
  }

  if (redirectStudentTo && isSchoolStudent()) {
    return <Navigate to={redirectStudentTo} replace />;
  }

  return <>{children}</>;
};

export default RequireAuth;
