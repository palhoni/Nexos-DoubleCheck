import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/colors_and_type.css'
import './styles/dark-overrides.css'
import './styles/global.css'
import './styles/setup.css'
import './styles/renault-dashboard.css'
import './styles/renault-system.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
