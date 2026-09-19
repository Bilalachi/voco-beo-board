import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";

export default function Header({ onNewBeo }: { onNewBeo?: () => void }) {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="bg-petrol-500 text-white sticky top-0 z-30 shadow-md">
      <div className="honeycomb-bg">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <Link to="/" className="flex flex-col leading-tight">
            <span className="font-display font-semibold text-lg tracking-tight">
              voco <span className="text-honey-500">BEO Board</span>
            </span>
            <span className="text-[11px] uppercase tracking-wider text-petrol-100/70">
              Banquet Event Orders
            </span>
          </Link>

          <div className="flex items-center gap-2">
            {user ? (
              <>
                <span className="hidden sm:inline text-xs text-petrol-100/80">
                  Signed in as <b className="text-white">{profile?.displayName}</b>
                </span>
                {onNewBeo && (
                  <button
                    onClick={onNewBeo}
                    className="bg-honey-500 hover:bg-honey-600 text-ink font-semibold text-sm px-3 py-2 rounded-md transition-colors"
                  >
                    + New BEO
                  </button>
                )}
                <button
                  onClick={async () => {
                    await signOut();
                    navigate("/");
                  }}
                  className="border border-white/30 hover:bg-white/10 text-white text-sm px-3 py-2 rounded-md transition-colors"
                >
                  Log out
                </button>
              </>
            ) : (
              <button
                onClick={() => navigate("/login")}
                className="border border-white/30 hover:bg-white/10 text-white text-sm px-3 py-2 rounded-md transition-colors"
              >
                Staff Login
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
