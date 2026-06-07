/** Shared domain types across all apps */

export interface Patient {
  id: string
  firstName: string
  lastName: string
  dateOfBirth: string
  email: string
  phone: string
  createdAt: string
  updatedAt: string
}

export interface Appointment {
  id: string
  patientId: string
  providerId: string
  startTime: string
  endTime: string
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no-show'
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface Provider {
  id: string
  firstName: string
  lastName: string
  specialty: string
  email: string
  clinicId: string
}

export interface Clinic {
  id: string
  name: string
  /** Links to BrandTheme clientId */
  clientId: string
  address: string
  phone: string
  email: string
}

export interface ApiResponse<T> {
  data: T
  success: boolean
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}
