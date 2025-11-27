// client/src/lib/PrivateRoute.tsx
import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";

type Props = {
  children: ReactNode;
};

export default function PrivateRoute({ children }: Props) {
  const { authUser, loading } = useAuth();
  const location = useLocation();

  // Bíðum eftir auth (lesa úr localStorage o.s.frv.)
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-600 text-sm">
        Hleð innskráningarstöðu...
      </div>
    );
  }

  // Ekki innskráður → senda á /login og muna hvaðan var verið að koma
  if (!authUser) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname || "/" }}
      />
    );
  }

  // Innskráður → hleypa að
  return <>{children}</>;
}
