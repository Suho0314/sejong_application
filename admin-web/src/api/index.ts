const DEFAULT_API_BASE_URL = 'http://localhost:3000';
const ACCESS_TOKEN_STORAGE_KEY = 'sejong_admin_access_token';

type ApiRequestOptions = RequestInit & {
  auth?: boolean;
};

export class ApiError extends Error {
  status: number;
  details: unknown;

  constructor(status: number, message: string, details: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

const getApiBaseUrl = () => {
  const configuredUrl = import.meta.env.VITE_API_BASE_URL ?? DEFAULT_API_BASE_URL;
  return configuredUrl.replace(/\/$/, '').replace(/\/api$/, '');
};

const resolveApiUrl = (path: string) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const apiPath = normalizedPath.startsWith('/api') ? normalizedPath : `/api${normalizedPath}`;
  return `${getApiBaseUrl()}${apiPath}`;
};

const getErrorMessage = (body: unknown) => {
  if (body && typeof body === 'object') {
    const maybeError = body as { message?: unknown; error?: { message?: unknown } };

    if (typeof maybeError.error?.message === 'string') return maybeError.error.message;
    if (typeof maybeError.message === 'string') return maybeError.message;
    if (Array.isArray(maybeError.message)) return maybeError.message.join('\n');
  }

  return '요청 처리 중 오류가 발생했습니다.';
};

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { auth = true, headers, ...requestOptions } = options;
  const requestHeaders = new Headers(headers);

  if (!requestHeaders.has('Content-Type') && requestOptions.body) {
    requestHeaders.set('Content-Type', 'application/json');
  }

  if (auth) {
    const accessToken = localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);

    if (accessToken) {
      requestHeaders.set('Authorization', `Bearer ${accessToken}`);
    }
  }

  const response = await fetch(resolveApiUrl(path), {
    ...requestOptions,
    headers: requestHeaders,
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new ApiError(response.status, getErrorMessage(body), body);
  }

  return body as T;
}
