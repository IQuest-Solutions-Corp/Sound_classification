/**
 * src/main.jsx  —  React Entry Point
 * ====================================
 * This is the ONLY file that directly imports PumpAnomalyDashboard.
 *
 * Execution chain:
 *   index.html (loads this file via <script type="module">)
 *     → main.jsx (creates the React root, mounts <App />)
 *       → PumpAnomalyDashboard.jsx (your entire UI lives here)
 */

import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";            // ← global styles: scrollbars, resets
import App from "./PumpAnomalyDashboard";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);