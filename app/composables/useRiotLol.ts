import { RiotClient } from '~/lib/api/RiotClient'

let dataDragonClient: RiotClient | null = null
let communityDragonClient: RiotClient | null = null

export const useRiotLol = () => {
  if (!dataDragonClient) {
    dataDragonClient = new RiotClient('https://ddragon.leagueoflegends.com')
  }
  if (!communityDragonClient) {
    communityDragonClient = new RiotClient('https://raw.communitydragon.org')
  }
  
  return {
    getVersions: (signal?: AbortSignal) => dataDragonClient!.getVersions(signal)
    // Add other generic riot endpoints here if needed
  }
}
