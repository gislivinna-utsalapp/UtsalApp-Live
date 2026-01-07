import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../lib/auth";

export default function BottomNav() {
  const location = useLocation();
  const tab = location.pathname;

  const { isAdmin, loading } = useAuth();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-primary text-primary-foreground z-20 shadow-lg">
      <div className="max-w-4xl mx-auto flex items-center justify-between px-4 py-2 text-xs font-medium">
        <Link
          to="/"
          className={`flex-1 text-center transition-opacity ${
            tab === "/" ? "opacity-100 font-semibold" : "opacity-70"
          }`}
        >
          Heim
        </Link>

        <Link
          to="/search"
          className={`flex-1 text-center transition-opacity ${
            tab === "/search" ? "opacity-100 font-semibold" : "opacity-70"
          }`}
        >
          Leita
        </Link>

        <Link
          to="/categories"
          className={`flex-1 text-center transition-opacity ${
            tab === "/categories" ? "opacity-100 font-semibold" : "opacity-70"
          }`}
        >
          Flokkar
        </Link>

        <Link
          to="/profile"
          className={`flex-1 text-center transition-opacity ${
            tab === "/profile" ? "opacity-100 font-semibold" : "opacity-70"
          }`}
        >
          Prófíll
        </Link>

        {!loading && isAdmin && (
          <Link
            to="/admin"
            className={`px-2 text-center transition-opacity ${
              tab === "/admin"
                ? "opacity-100 font-semibold underline"
                : "opacity-70"
            }`}
          >
            Admin
          </Link>
        )}
      </div>
    </nav>
  );
}
