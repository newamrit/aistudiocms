import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { initializeOfflineSupport } from "./utils/offlineDB";

// Initialize offline support
initializeOfflineSupport().then(() => {
  console.log('Offline support initialized');
}).catch((error) => {
  console.error('Failed to initialize offline support:', error);
});

ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
