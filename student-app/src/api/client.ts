import { appStorage } from './storage';

const DEFAULT_API_BASE_URL = 'https://sejongapplication-production.up.railway.app';
export const ACCESS_TOKEN_STORAGE_KEY = 'sejong_student_access_token';
export const USER_STORAGE_KEY = 'sejong_student_user';
const AUTH_EXPIRED_MESSAGE_STORAGE_KEY = 'sejong_student_auth_expired_message';
const AUTH_EXPIRED_MESSAGE = '로그인이 만료되었습니다. 다시 로그인해주세요.';
const API_CONFIGURATION_ERROR_MESSAGE =
  'API 서버 주소 설정이 올바르지 않습니다. VITE_API_BASE_URL을 확인해주세요.';
const NETWORK_ERROR_MESSAGE = '서버에 연결할 수 없습니다. 네트워크 상태를 확인한 뒤 다시 시도해주세요.';

type ApiRequestOptions = RequestInit & {
  auth?: boolean;
};

export class ApiConfigurationError extends Error {
  constructor(message = API_CONFIGURATION_ERROR_MESSAGE) {
    super(message);
    this.name = 'ApiConfigurationError';
  }
}

export class ApiNetworkError extends Error {
  cause: unknown;

  constructor(message = NETWORK_ERROR_MESSAGE, cause?: unknown) {
    super(message);
    this.name = 'ApiNetworkError';
    this.cause = cause;
  }
}

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
  const env = process.env.VITE_API_BASE_URL?.trim() || DEFAULT_API_BASE_URL;
  const normalizedUrl = env.replace(/\/$/, '').replace(/\/api$/, '');

  try {
    const parsedUrl = new URL(normalizedUrl);

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new Error('Unsupported API protocol');
    }
  } catch {
    throw new ApiConfigurationError();
  }

  return normalizedUrl;
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

export const clearStudentAuth = () => {
  appStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
  appStorage.removeItem(USER_STORAGE_KEY);
};

export const getAuthExpiredMessage = () => {
  const message = appStorage.getItem(AUTH_EXPIRED_MESSAGE_STORAGE_KEY) ?? '';
  appStorage.removeItem(AUTH_EXPIRED_MESSAGE_STORAGE_KEY);
  return message;
};

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { auth = true, headers, ...requestOptions } = options;
  const requestHeaders = new Headers(headers);

  if (!requestHeaders.has('Content-Type') && requestOptions.body) {
    requestHeaders.set('Content-Type', 'application/json');
  }

  if (auth) {
    const accessToken = appStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);

    if (accessToken) {
      requestHeaders.set('Authorization', `Bearer ${accessToken}`);
    }
  }

  let response: Response;

  try {
    response = await fetch(resolveApiUrl(path), {
      ...requestOptions,
      headers: requestHeaders,
    });
  } catch (error) {
    throw new ApiNetworkError(undefined, error);
  }

  const text = await response.text();
  const body = text ? JSON.parse(text) : null;

  if (!response.ok) {
    if (auth && isExpiredTokenError(response.status, body)) {
      clearStudentAuth();
      appStorage.setItem(AUTH_EXPIRED_MESSAGE_STORAGE_KEY, AUTH_EXPIRED_MESSAGE);
    }

    throw new ApiError(response.status, getErrorMessage(body), body);
  }

  return body as T;
}
