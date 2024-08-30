import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import Home from './index'
import "./styles/globals.css";
import "./styles/controls.css";

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Home />
  </StrictMode>,
)
