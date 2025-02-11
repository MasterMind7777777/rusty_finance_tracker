import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000, // <--- specify the desired port
    host: "0.0.0.0", // <--- important if you want to be reachable from outside
  },
});
