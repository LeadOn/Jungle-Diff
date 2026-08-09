import { useRuntimeConfig } from '#app'
import { GameOnClient } from '~/lib/api/GameOnClient'

let client: GameOnClient | null = null

export const useGameOnLol = () => {
  if (!client) {
    const config = useRuntimeConfig()
    client = new GameOnClient(config.public.gameOnApiUrl as string)
  }
  return client
}
