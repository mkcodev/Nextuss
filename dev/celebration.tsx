// Demo de desarrollo del primitivo Celebration (fase 1a del rediseño v2). Parámetros de URL:
//   ?theme=dark|light  tema · ?auto=1  lanza la celebración en la fila del medio al cargar.
import { createRoot } from 'react-dom/client'
import { MotionProvider } from '../src/design/MotionProvider'
import { Demo } from './CelebrationDemo'
import '../src/index.css'

document.documentElement.setAttribute('data-theme', new URLSearchParams(location.search).get('theme') === 'dark' ? 'dark' : 'light')

createRoot(document.getElementById('root')!).render(
  <MotionProvider>
    <Demo />
  </MotionProvider>,
)
