export interface ApiError {
  statusCode: number
  message: string
  details?: unknown
}

export class AppError extends Error {
  statusCode: number
  details?: unknown

  /**
   * True when the request was cancelled by the caller (filter change, component unmounted).
   *
   * Without this flag a cancellation surfaces like any other network failure, and the UI would
   * report "the service did not respond" when in fact we hung up on it ourselves.
   */
  readonly aborted: boolean

  constructor(message: string, statusCode: number = 500, details?: unknown, aborted = false) {
    super(message)
    this.name = 'AppError'
    this.statusCode = statusCode
    this.details = details
    this.aborted = aborted
  }
}

/** Use inside `catch` blocks to ignore a deliberate cancellation. */
export const isAbortError = (error: unknown): boolean => {
  if (error instanceof AppError) return error.aborted
  return error instanceof Error && error.name === 'AbortError'
}
