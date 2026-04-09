import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { useCart } from "@/hooks/useCart";

export default function BottomNav() {
  const location = useLocation();
  const tab = location.pathname;
  const { isAdmin, loading } = useAuth();
  const { cartCount } = useCart();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-primary text-primary-foreground z-20 shadow-lg"
      style={{
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <div
        className="
          max-w-4xl mx-auto
          flex items-center justify-between
          px-4
          py-3
          text-sm
          font-medium
        "
        style={{
          minHeight: "64px",
        }}
      >
        <Link
          to="/"
          className={`flex-1 text-center transition-opacity ${
            tab === "/" ? "opacity-100 font-semibold" : "opacity-70"
          }`}
        >
          Heim
        </Link>

        <Link
          to="/leit"
          className={`flex-1 text-center transition-opacity ${
            tab === "/leit" ? "opacity-100 font-semibold" : "opacity-70"
          }`}
        >
          Leita
        </Link>

        <Link
          to="/flokkar"
          className={`flex-1 text-center transition-opacity ${
            tab === "/flokkar" ? "opacity-100 font-semibold" : "opacity-70"
          }`}
        >
          Flokkar
        </Link>

        <Link
          to="/karfa"
          className={`flex-1 text-center transition-opacity relative ${
            tab === "/karfa" ? "opacity-100 font-semibold" : "opacity-70"
          }`}
          data-testid="nav-cart"
        >
          Karfa
          {cartCount > 0 && (
            <span className="absolute -top-1.5 right-1/2 translate-x-4 min-w-[16px] h-4 px-1 rounded-full bg-white text-primary text-[10px] font-bold flex items-center justify-center leading-none">
              {cartCount}
            </span>
          )}
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
            className={`px-3 text-center transition-opacity ${
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
