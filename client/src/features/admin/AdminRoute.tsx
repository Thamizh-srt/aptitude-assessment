import { useEffect, useState, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { LoaderCircle } from "lucide-react";
import { getAdminSession } from "./admin.api";

type AdminRouteProps = { children: ReactNode };

export function AdminRoute({ children }: AdminRouteProps) {
  const location = useLocation();
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    getAdminSession()
      .then(() => {
        if (active) setAuthorized(true);
      })
      .catch(() => {
        if (active) setAuthorized(false);
      });
    return () => {
      active = false;
    };
  }, []);

  if (authorized === null) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex items-center gap-3 text-sm font-medium text-slate-500">
          <LoaderCircle className="h-5 w-5 animate-spin text-indigo-600" />
          Verifying administrator session…
        </div>
      </main>
    );
  }

  if (!authorized) {
    return (
      <Navigate
        to="/admin/login"
        replace
        state={{ from: location.pathname }}
      />
    );
  }
  return children;
}
