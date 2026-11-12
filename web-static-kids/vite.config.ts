import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// For a project-page URL like https://<user>.github.io/<repo>, set VITE_BASE=/<repo>/
// For a custom domain (e.g. auction.example.com) or user-page (<user>.github.io), leave VITE_BASE unset.
export default defineConfig({
  base: process.env.VITE_BASE ?? "/",
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src")
    }
  },
  build: {
    outDir: "dist",
    sourcemap: false,
    target: "es2022",
    rollupOptions: {
      output: {
        manualChunks: {
          firebase: [
            "firebase/app",
            "firebase/auth",
            "firebase/database"
          ],
          react: ["react", "react-dom", "react-router-dom"]
        }
      }
    }
  }
});
