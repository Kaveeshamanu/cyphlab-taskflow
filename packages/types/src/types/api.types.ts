export interface FieldError {
  field: string
  message: string
}

export interface ApiResponse<T = null> {
  success: boolean
  data: T | null
  message: string
  errors: FieldError[] | null
}

export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: PaginationMeta
}
