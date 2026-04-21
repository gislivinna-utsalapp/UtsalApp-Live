import { Link, useLocation } from "react-router-dom";
import { Home, Search, Grid3x3, ShoppingBag, User } from "lucide-react";
import { useAuth } from "../lib/auth";
import { useCart } from "@/hooks/useCart";

const tabs = [
  { to: "/", label: "Heim", Icon: Home },
  { to: "/leit", label: "Leita", Icon: Search },
  { to: "/flokkar", label: "Flokkar", Icon: Grid3x3 },
  { to: "/karfa", label: "Karfa", Icon: ShoppingBag, cart: true },
  { to: "/profile", label: "Mín", Icon: User },
];

export default function BottomNav() {
  const location = useLocation();
  const tab = location.pathname;
  const { isAdmin, loading } = useAuth();
  const { cartCount } = useCart();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-200 z-40"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="max-w-lg mx-auto flex items-stretch">
        {tabs.map(({ to, label, Icon, cart }) => {
          const active = to === "/" ? tab === "/" : tab.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 relative"
              data-testid={`nav-${label.toLowerCase()}`}
            >
              <div className="relative">
                <Icon
                  className={`w-5 h-5 ${active ? "text-neutral-900" : "text-neutral-400"}`}
                  strokeWidth={active ? 2.5 : 1.5}
                />
                {cart && cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-3.5 px-0.5 rounded-full bg-[#ff4d00] text-white text-[9px] font-bold flex items-center justify-center leading-none">
                    {cartCount}
                  </span>
                )}
              </div>
              <span
                className={`text-[10px] leading-none ${
                  active ? "font-semibold text-neutral-900" : "text-neutral-400"
                }`}
              >
                {label}
              </span>
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-neutral-900 rounded-b-full" />
              )}
            </Link>
          );
        })}

        {!loading && isAdmin && (
          <Link
            to="/admin"
            className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2"
          >
            <Grid3x3
              className={`w-5 h-5 ${tab === "/admin" ? "text-neutral-900" : "text-neutral-400"}`}
              strokeWidth={tab === "/admin" ? 2.5 : 1.5}
            />
            <span
              className={`text-[10px] leading-none ${
                tab === "/admin" ? "font-semibold text-neutral-900" : "text-neutral-400"
              }`}
            >
              Admin
            </span>
          </Link>
        )}
      </div>
    </nav>
  );
}
