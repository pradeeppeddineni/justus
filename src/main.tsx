import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { loadConfig, applyThemeToDOM } from './config/configLoader';
import App from './App';
import './styles/global.css';

// Load config and apply theme before render
const config = loadConfig();
applyThemeToDOM(config);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App config={config} />
  </StrictMode>,
);
