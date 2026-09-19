import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import { useAuth } from "../lib/AuthContext";

export default function Login() {
  const { signIn, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (user) {
    navigate("/");
    return null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const raw = email.trim().toLowerCase();
    const loginEmail = raw.includes("@") ? raw : `${raw}@voco.internal`;
    const { error } = await signIn(loginEmail, password);
    setBusy(false);
    if (error) {
      setError("Login failed — check the username/password and try again.");
    } else {
      navigate("/");
    }
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-sm mx-auto px-4 py-16">
        <h1 className="font-display text-2xl font-semibold text-ink mb-1">Staff Login</h1>
        <p className="text-sm text-ink-soft mb-6">
          For AV, IT, Sales &amp; Banquet team members who upload or edit BEOs.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="block text-xs font-semibold text-ink-soft mb-1 uppercase tracking-wide">
              Username
            </span>
            <input
              type="text"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-neutral-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-honey-500"
              placeholder="e.g. av"
            />
          </label>
          <label className="block">
            <span className="block text-xs font-semibold text-ink-soft mb-1 uppercase tracking-wide">
              Password
            </span>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-neutral-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-honey-500"
            />
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full bg-honey-500 hover:bg-honey-600 disabled:opacity-60 text-ink font-semibold py-2.5 rounded-md transition-colors"
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p className="text-xs text-ink-soft mt-6">
          Just here to check today's events? You don't need an account —{" "}
          <a href="./" className="text-petrol-500 underline">
            go back to the board
          </a>
          .
        </p>
      </main>
    </div>
  );
}
