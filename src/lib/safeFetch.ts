export const NETWORK_ERROR_MSG =
  "Couldn't connect to the server. Please check your connection and try again.";

const DEFAULT_TIMEOUT = 8000;

export function isNetworkError(msg: string): boolean {
  return (
    msg.includes('Failed to fetch') ||
    msg.includes('NetworkError') ||
    msg.includes('Network request failed') ||
    msg.includes('Aborted')
  );
}

export function withTimeout<T>(
  promise: Promise<T>,
  ms: number = DEFAULT_TIMEOUT
): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('Request timed out')), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

export function getErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    return isNetworkError(err.message) ? NETWORK_ERROR_MSG : err.message;
  }
  return NETWORK_ERROR_MSG;
}

export type ErrorRetryProps = {
  message?: string;
  onRetry: () => void;
};
