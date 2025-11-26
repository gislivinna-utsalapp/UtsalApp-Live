// client/src/lib/PrivateRoute.tsx

import { Navigate } from "react-router-dom";
import { useAuth } from "./auth";
import { ReactNode } from "react";

export default function PrivateRoute({ children }: { children: ReactNode }) {
  const { authUser, loading } = useAuth();

  // Meðan auth er að hlaðast
  if (loading) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        Hleð innskráningarástandi...
      </div>
    );
  }

  // Ef ekki innskráður → á login
  if (!authUser) {
    return <Navigate to="/login" replace />;
  }

  // Innskráður → leyfa aðgang
  return <>{children}</>;
}
