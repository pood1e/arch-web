import { ReactFlowProvider } from "@xyflow/react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@xyflow/react/dist/style.css";
import "@/index.css";
import { App } from "@/App";

const root = document.getElementById("root");
if (!root) throw new Error("缺少 #root 挂载点");

createRoot(root).render(
  <StrictMode>
    <ReactFlowProvider>
      <App />
    </ReactFlowProvider>
  </StrictMode>,
);
