import { defineConfig } from "vite";
export default defineConfig({
  base: "/MTDM-AI-Lab/",
  worker: { format: "es" },
  build: { outDir: "dist", emptyOutDir: true }
});
