import { mergeConfig } from "vite"
import base from "../../vite.config"
export default mergeConfig(base, {
  server: { port: 3023, watch: { ignored: ["**/.tmp/**", "**/output/**"] } },
})
