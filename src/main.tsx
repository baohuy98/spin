import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ThemeProvider } from './components/ThemeProvider'
import { ViewThemeProvider } from './components/ViewThemeProvider'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider defaultTheme="light" storageKey="heyspinner-theme">
      <ViewThemeProvider defaultTheme="none" storageKey="spin-view-theme">
        <App />
      </ViewThemeProvider>
    </ThemeProvider>
  </StrictMode>,
)
