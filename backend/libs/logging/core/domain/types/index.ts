export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  PREMIUM = 'premium',
  GUEST = 'guest',
}

/**
 * Global Error Codes for the logging library.
 * These are generic system-level errors that can occur in any service.
 * Domain-specific errors should be defined within their respective modules.
 */
export enum ErrorCode {
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  TIMEOUT = 'TIMEOUT',
  UNKNOWN = 'UNKNOWN',
}
