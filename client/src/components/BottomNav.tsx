function BottomNav() {
  const location = useLocation();
  const tab = location.pathname;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[#fc7102] text-white z-20 shadow-lg">
      <div className="max-w-4xl mx-auto flex items-center justify-between px-4 py-8 text-sm font-medium">
        <Link
          to="/"
          className={`flex-1 text-center ${
            tab === "/" ? "opacity-100 font-semibold" : "opacity-80"
          }`}
        >
          Heim
        </Link>

        <Link
          to="/search"
          className={`flex-1 text-center ${
            tab === "/search" ? "opacity-100 font-semibold" : "opacity-80"
          }`}
        >
          Leita
        </Link>

        <Link
          to="/categories"
          className={`flex-1 text-center ${
            tab === "/categories" ? "opacity-100 font-semibold" : "opacity-80"
          }`}
        >
          Flokkar
        </Link>

        <Link
          to="/profile"
          className={`flex-1 text-center ${
            tab === "/profile" ? "opacity-100 font-semibold" : "opacity-80"
          }`}
        >
          Prófíll
        </Link>
      </div>
    </nav>
  );
}
