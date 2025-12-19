import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

console.log("System initializing: Mounting React application...");

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error("Critical Error: Could not find root element with ID 'root'");
  throw new Error("Could not find root element to mount to");
}

try {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  console.log("Application mounted successfully.");
} catch (error) {
  console.error("Failed to render React application:", error);
}