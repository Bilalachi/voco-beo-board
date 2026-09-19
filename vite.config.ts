import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Base path matches the GitHub Pages repo name so assets resolve correctly
// when served from https://<user>.github.io/<repo>/.
// Set VITE_BASE_PATH in the GitHub Actions workflow env if your repo name differs.
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE_PATH || "/",
  build: {
    outDir: "dist",
  },
});
