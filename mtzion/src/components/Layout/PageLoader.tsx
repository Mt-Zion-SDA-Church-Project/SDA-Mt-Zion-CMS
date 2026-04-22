import React from 'react';
import logo from '../../assets/sda-logo.png';

export type PageLoaderVariant = 'app' | 'inline';

export interface PageLoaderProps {
  /** Shown under the logo */
  message?: string;
  /** `app` = full viewport (auth boot). `inline` = section height (e.g. QR processing). */
  variant?: PageLoaderVariant;
  className?: string;
}

/**
 * Full-page or inline loading UI — replaces bare spinners with a calmer, branded experience.
 */
export default function PageLoader({
  message = 'Almost there…',
  variant = 'app',
  className = '',
}: PageLoaderProps) {
  const isApp = variant === 'app';

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={[
        'flex flex-col items-center justify-center relative overflow-hidden',
        isApp
          ? 'min-h-screen bg-gradient-to-br from-slate-50 via-sky-50/90 to-cyan-100/35'
          : 'min-h-[56vh] w-full py-10',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {isApp && (
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute -top-20 -left-20 h-72 w-72 rounded-full bg-primary/[0.07] blur-3xl" />
          <div className="absolute top-1/3 -right-16 h-64 w-64 rounded-full bg-indigo-300/15 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-56 w-96 rounded-full bg-sky-200/25 blur-3xl" />
        </div>
      )}

      <div className="relative z-10 flex flex-col items-center gap-7 px-6 w-full max-w-md">
        <div className="relative animate-soft-breathe">
          <div
            className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-primary/15 via-blue-400/10 to-transparent blur-md"
            aria-hidden
          />
          <div className="relative rounded-2xl bg-white/85 backdrop-blur-md shadow-lg shadow-slate-200/60 border border-white/80 px-12 py-10 sm:px-14 sm:py-11 flex flex-col items-center">
            <img
              src={logo}
              alt=""
              width={160}
              height={160}
              className="w-36 h-36 sm:w-40 sm:h-40 object-contain select-none"
            />
            <div className="mt-8 h-1.5 w-full max-w-[260px] rounded-full bg-slate-200/90 overflow-hidden">
              <div className="h-full w-[42%] rounded-full bg-gradient-to-r from-primary via-sky-500 to-cyan-400 shadow-sm animate-bar-slide" />
            </div>
          </div>
        </div>

        <div className="text-center space-y-1">
          <p className="text-[0.8125rem] font-semibold tracking-wide text-slate-700 uppercase">
            Mt. Zion CMS
          </p>
          <p className="text-sm text-slate-500 font-medium leading-snug">{message}</p>
        </div>
      </div>
    </div>
  );
}
