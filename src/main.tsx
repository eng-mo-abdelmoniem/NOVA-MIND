import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { HudCommandProvider } from './context/HudCommandContext'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HudCommandProvider>
      <App />
    </HudCommandProvider>
  </StrictMode>,
)
