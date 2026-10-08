import { NETWORK_ERROR_MSG, type ErrorRetryProps } from '../lib/safeFetch';

export default function FetchErrorState({ message, onRetry }: ErrorRetryProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mb-3">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-400">
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      </div>
      <p className="text-sm font-medium text-gray-600 mb-3 max-w-xs">
        {message ?? NETWORK_ERROR_MSG}
      </p>
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-2 bg-[#0891b2] text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-cyan-700 transition active:scale-95"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12a9 9 0 1 1-3-6.7L21 8" />
          <path d="M21 3v5h-5" />
        </svg>
        Try Again
      </button>
    </div>
  );
}
