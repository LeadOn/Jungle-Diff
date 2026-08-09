import { $fetch } from 'ofetch'
import type { FetchOptions } from 'ofetch'
import { AppError } from '../types/error'
import { useAuth } from '~/composables/useAuth'

export class BaseApiService {
  protected readonly baseUrl: string
  protected readonly requiresAuth: boolean

  constructor(baseUrl: string, requiresAuth = false) {
    this.baseUrl = baseUrl
    this.requiresAuth = requiresAuth
  }

  protected async request<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
    const config = useRuntimeConfig()
    const isGameOnApi = this.baseUrl === config.public.gameOnApiUrl

    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string> || {})
    }

    if (this.requiresAuth && isGameOnApi) {
      const auth = useAuth()
      const token = await auth.getToken()
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
    }

    try {
      return await $fetch<T>(`${this.baseUrl}${endpoint}`, {
        ...(options as any),
        headers
      })
    } catch (error: unknown) {
      const err = error as Record<string, unknown>
      const errData = err?.data as Record<string, unknown> | undefined
      const errResponse = err?.response as Record<string, unknown> | undefined
      throw new AppError(
        (errData?.message as string) || (err?.message as string) || 'API Request Failed',
        (errResponse?.status as number) || 500,
        errData
      )
    }
  }

  public async get<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' })
  }

  public async post<T>(endpoint: string, data?: unknown, options: FetchOptions = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'POST', body: data as any })
  }
}
