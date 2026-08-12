import { useRuntimeConfig } from '#app'
import { GameOnClient } from '~/lib/api/GameOnClient'

export const useGameOnLol = () => {
  const config = useRuntimeConfig()
  return new GameOnClient(config.public.gameOnApiUrl as string)
}
