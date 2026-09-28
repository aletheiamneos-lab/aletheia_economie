import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './styles.css'
import './admission.css'
import './theme.css'
import './home.css'
import './report.css'
import './lessons.css'
import './library.css'
import './sidebar.css'
import './login.css'
import './admin.css'
import './games.css'
import './responsive.css'
import './polish.css'
import './appearance.css'
import './math-workspace.css'
import './mind-map.css'
import './flashcards.css'
import './mobile.css'
import './mobile-type.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
