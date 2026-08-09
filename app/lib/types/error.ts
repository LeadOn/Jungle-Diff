export interface ApiError {
  statusCode: number
  message: string
  details?: unknown
}

export class AppError extends Error {
  statusCode: number
  details?: unknown

  constructor(message: string, statusCode: number = 500, details?: unknown) {
    super(message)
    this.name = 'AppError'
    this.statusCode = statusCode
    this.details = details
  }
}
