const DEFAULT_API_BASE_URL = 'http://localhost:3000';
const AUTH_STORAGE_KEY = 'sejong_admin_auth';
const ACCESS_TOKEN_STORAGE_KEY = 'sejong_admin_access_token';
const USER_STORAGE_KEY = 'sejong_admin_user';
const AUTH_EXPIRED_MESSAGE_STORAGE_KEY = 'sejong_admin_auth_expired_message';
const AUTH_EXPIRED_MESSAGE = '로그인이 만료되었습니다. 다시 로그인해주세요.';

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

const getErrorCode = (body: unknown) => {
  if (body && typeof body === 'object') {
    const maybeError = body as { code?: unknown; error?: { code?: unknown } };

    if (typeof maybeError.error?.code === 'string') return maybeError.error.code;
    if (typeof maybeError.code === 'string') return maybeError.code;
  }

  return '';
};

const isExpiredTokenError = (status: number, body: unknown) => {
  const message = getErrorMessage(body).toLowerCase();
  const code = getErrorCode(body).toUpperCase();

  return status === 401 || code === 'INVALID_TOKEN' || message.includes('jwt expired');
};

const clearAuthAndRedirectToLogin = () => {
  localStorage.removeItem(AUTH_STORAGE_KEY);
  localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
  localStorage.removeItem(USER_STORAGE_KEY);
  sessionStorage.setItem(AUTH_EXPIRED_MESSAGE_STORAGE_KEY, AUTH_EXPIRED_MESSAGE);

  if (window.location.pathname !== '/login') {
    window.location.assign('/login');
  }
};

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { auth = true, headers, ...requestOptions } = options;
  const requestHeaders = new Headers(headers);
  const isFormDataBody = typeof FormData !== 'undefined' && requestOptions.body instanceof FormData;

  if (!requestHeaders.has('Content-Type') && requestOptions.body && !isFormDataBody) {
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
    if (auth && isExpiredTokenError(response.status, body)) {
      clearAuthAndRedirectToLogin();
    }

    throw new ApiError(response.status, getErrorMessage(body), body);
  }

  return body as T;
}
