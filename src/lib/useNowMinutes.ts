import { useEffect, useState } from 'react'

/** Minuto del día actual (0..1439), refrescado cada 30 s: basta para relojes de minutos (bloque «Ahora»,
 * tiempo que queda de jornada) sin re-renderizar cada segundo. */
export function useNowMinutes(): number {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(id)
  }, [])
  return now.getHours() * 60 + now.getMinutes()
}
