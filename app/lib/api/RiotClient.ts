import { BaseApiService } from './BaseApiService'

export class RiotClient extends BaseApiService {
  constructor(baseUrl: string) {
    super(baseUrl, false) // No auth headers for Riot CDN
  }

  public getVersions(signal?: AbortSignal) {
    return this.get<string[]>('/api/versions.json', { signal })
  }
}
