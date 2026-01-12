// Custom fetcher for Orval-generated API client

// Configuration
let baseUrl = 'http://localhost:4000'
let defaultHeaders: Record<string, string> = {
  'Content-Type': 'application/json',
}

// Configure the API client
export function configureApi(config: { baseUrl?: string; headers?: Record<string, string> }) {
  if (config.baseUrl) {
    baseUrl = config.baseUrl
  }
  if (config.headers) {
    defaultHeaders = { ...defaultHeaders, ...config.headers }
  }
}

// Get current config
export function getApiConfig() {
  return { baseUrl, headers: defaultHeaders }
}

// API Error class
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public data?: unknown
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

// Orval React Query passes objects like { url, method, signal } as the first argument
export interface OrvalFetchOptions {
  url: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  params?: Record<string, unknown>
  data?: unknown
  headers?: Record<string, string>
  signal?: AbortSignal
}

// Custom fetcher compatible with Orval's generated code
// Supports both:
// 1. Vanilla: customFetcher(url, requestInit)
// 2. React Query: customFetcher({ url, method, signal }, requestOptions)
export async function customFetcher<T>(
  urlOrOptions: string | OrvalFetchOptions,
  requestOptions?: RequestInit
): Promise<T> {
  let url: string
  let method: string
  let params: Record<string, unknown> | undefined
  let data: unknown
  let headers: Record<string, string> = {}
  let signal: AbortSignal | undefined
  
  if (typeof urlOrOptions === 'string') {
    // Vanilla client: customFetcher(url, requestInit)
    url = urlOrOptions
    method = requestOptions?.method || 'GET'
    headers = (requestOptions?.headers as Record<string, string>) || {}
    signal = requestOptions?.signal ?? undefined
    data = requestOptions?.body
  } else {
    // React Query: customFetcher({ url, method, signal }, requestOptions)
    url = urlOrOptions.url
    method = urlOrOptions.method
    params = urlOrOptions.params
    data = urlOrOptions.data
    headers = urlOrOptions.headers || {}
    signal = urlOrOptions.signal
    
    // Merge requestOptions headers if provided
    if (requestOptions?.headers) {
      headers = { ...headers, ...(requestOptions.headers as Record<string, string>) }
    }
  }

  // Build full URL
  const fullUrl = new URL(url, baseUrl)

  // Add query params
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        fullUrl.searchParams.append(key, String(value))
      }
    })
  }

  // Build request init
  const requestInit: RequestInit = {
    method,
    headers: {
      ...defaultHeaders,
      ...headers,
    },
    signal,
  }

  // Add body for non-GET requests
  if (data && method !== 'GET') {
    requestInit.body = typeof data === 'string' ? data : JSON.stringify(data)
  }

  // Make request
  const response = await fetch(fullUrl.toString(), requestInit)

  // Handle response
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new ApiError(
      response.status,
      errorData.message || `Request failed with status ${response.status}`,
      errorData
    )
  }

  // Parse response and wrap in standard format for generated types
  const contentType = response.headers.get('content-type')
  let responseData: unknown
  
  if (contentType?.includes('application/json')) {
    responseData = await response.json()
  } else {
    responseData = await response.text()
  }

  // Generated types expect { data, status } format
  return { data: responseData, status: response.status } as T
}

// Type helper for Orval - SecondParameter extracts the second parameter type
export type SecondParameter<T extends (...args: never[]) => unknown> = 
  T extends (arg1: never, arg2: infer P, ...args: never[]) => unknown ? P : never

export type CustomFetcher = typeof customFetcher
