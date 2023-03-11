import { resolve } from "path";
import { defineConfig } from "vite";
import typescript from "@rollup/plugin-typescript";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [typescript()],
  build: {
    lib: {
      // Could also be a dictionary or array of multiple entry points
      entry: resolve("./", "lib/index.ts"),
      name: "CropImage",
      // the proper extensions will be added
      fileName: "index",
    },
  },
});
