import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { router } from './app/router'
import { ensureSingletons } from './db/init'
import '@fontsource-variable/inter'
import './index.css'

const root = createRoot(document.getElementById('root')!)

ensureSingletons()
  .then(() => {
    root.render(
      <StrictMode>
        <RouterProvider router={router} />
      </StrictMode>,
    )
  })
  .catch((error: unknown) => {
    console.error('Fallo al inicializar la base de datos', error)
    root.render(
      <div className="flex h-screen flex-col items-center justify-center gap-3 bg-bg p-6 text-center text-text">
        <h1 className="text-lg font-semibold">No se pudo abrir la base de datos</h1>
        <p className="max-w-md text-sm text-text-muted">
          Nextuss no pudo inicializar el almacenamiento local. Recarga la página; si el problema
          continúa, puede deberse a que el navegador tenga el almacenamiento bloqueado o lleno.
        </p>
      </div>,
    )
  })
