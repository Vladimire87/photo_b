type YandexMetrika = (counterId: number, method: string, ...arguments_: unknown[]) => void;

interface QueuedYandexMetrika extends YandexMetrika {
  a?: unknown[][];
  l?: number;
}

declare global {
  interface Window {
    ym?: QueuedYandexMetrika;
  }
}

const DEFAULT_COUNTER_ID = 111029295;
const counterId = Number(import.meta.env.VITE_YANDEX_METRIKA_ID || DEFAULT_COUNTER_ID);

function isAnalyticsEnabled(): boolean {
  return import.meta.env.PROD && Number.isSafeInteger(counterId) && counterId > 0;
}

function getYandexMetrika(): QueuedYandexMetrika {
  if (window.ym) {
    return window.ym;
  }

  const queuedYandexMetrika = ((...arguments_: unknown[]) => {
    queuedYandexMetrika.a ??= [];
    queuedYandexMetrika.a.push(arguments_);
  }) as QueuedYandexMetrika;

  queuedYandexMetrika.l = Date.now();
  window.ym = queuedYandexMetrika;

  return queuedYandexMetrika;
}

export function initializeAnalytics(): void {
  if (!isAnalyticsEnabled()) {
    return;
  }

  const ym = getYandexMetrika();
  ym(counterId, 'init', {
    accurateTrackBounce: true,
    clickmap: true,
    trackLinks: true,
    webvisor: false,
  });

  if (document.querySelector('script[data-yandex-metrika]')) {
    return;
  }

  const script = document.createElement('script');
  script.async = true;
  script.dataset.yandexMetrika = '';
  script.src = 'https://mc.yandex.ru/metrika/tag.js';
  document.head.append(script);
}

interface PhotoView {
  caption: string;
  issue: string;
  photoNumber: number;
}

export function trackPhotoView({ caption, issue, photoNumber }: PhotoView): void {
  if (!isAnalyticsEnabled() || !window.ym) {
    return;
  }

  const formattedNumber = String(photoNumber).padStart(2, '0');
  const title = caption
    ? `PHOTO ${formattedNumber} — ${caption}`
    : `PHOTO ${formattedNumber}`;

  window.ym(counterId, 'hit', `/photos/${issue}/${formattedNumber}`, {
    params: {
      photo: {
        caption: caption || undefined,
        issue,
        number: photoNumber,
      },
    },
    referer: window.location.href,
    title,
  });
}
