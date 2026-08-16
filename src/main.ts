import GLightbox from 'glightbox';
import 'glightbox/dist/css/glightbox.css';
import { initializeAnalytics, trackPhotoView } from './analytics';
import {
  formatPhotoNumber,
  isUsablePhotoDimensions,
  parsePhotoEntries,
  type PhotoEntry,
} from './gallery';

interface IssueSource {
  slug: string;
  year: number;
  number: number;
  load: () => Promise<string>;
}

type PageView = 'gallery' | 'collections' | 'about';

const issueModules = import.meta.glob('./data/issues/*.txt', {
  query: '?raw',
  import: 'default',
}) as Record<string, () => Promise<string>>;

const issues = Object.entries(issueModules)
  .map<IssueSource | null>(([path, load]) => {
    const match = path.match(/\/([0-9]{4})-([0-9]{2})\.txt$/);

    if (!match) {
      console.warn(`[PHOTO B] Ignoring issue file with an invalid name: ${path}`);
      return null;
    }

    return {
      slug: `${match[1]}-${match[2]}`,
      year: Number(match[1]),
      number: Number(match[2]),
      load,
    };
  })
  .filter((issue): issue is IssueSource => issue !== null)
  .sort((first, second) => first.slug.localeCompare(second.slug));

if (issues.length === 0) {
  throw new Error('No gallery issues found in src/data/issues.');
}

const searchParams = new URLSearchParams(window.location.search);
const requestedView = searchParams.get('view');
const pageView: PageView = requestedView === 'collections' || requestedView === 'about'
  ? requestedView
  : 'gallery';
const requestedIssue = searchParams.get('issue');
const requestedIssueIndex = requestedIssue
  ? issues.findIndex((issue) => issue.slug === requestedIssue)
  : -1;
const activeIssueIndex = requestedIssueIndex >= 0 ? requestedIssueIndex : issues.length - 1;
const activeIssue = issues[activeIssueIndex];
const photoSource = pageView === 'gallery' ? await activeIssue.load() : '';

function getRequiredElement<T extends HTMLElement>(selector: string): T {
  const element = document.querySelector<T>(selector);

  if (!element) {
    throw new Error(`Required gallery element is missing: ${selector}`);
  }

  return element;
}

const gallery = getRequiredElement<HTMLElement>('#gallery');
const emptyState = getRequiredElement<HTMLElement>('#empty-state');
const viewCount = getRequiredElement<HTMLElement>('#view-count');
const viewStatus = getRequiredElement<HTMLElement>('#view-status');
const issueNumber = getRequiredElement<HTMLElement>('#issue-number');
const issueYear = getRequiredElement<HTMLElement>('#issue-year');
const heroIssueNumber = getRequiredElement<HTMLElement>('#hero-issue-number');
const heroYear = getRequiredElement<HTMLElement>('#hero-year');
const previousIssueLink = getRequiredElement<HTMLAnchorElement>('#previous-issue');
const nextIssueLink = getRequiredElement<HTMLAnchorElement>('#next-issue');
const issueSwitcher = getRequiredElement<HTMLElement>('.issue-switcher');
const siteHeader = getRequiredElement<HTMLElement>('#site-header');
const siteMain = getRequiredElement<HTMLElement>('main');
const siteFooter = getRequiredElement<HTMLElement>('.site-footer');
const galleryPage = getRequiredElement<HTMLElement>('#gallery-page');
const collectionsPage = getRequiredElement<HTMLElement>('#collections-page');
const collectionsGrid = getRequiredElement<HTMLElement>('#collections-grid');
const aboutPage = getRequiredElement<HTMLElement>('#about-page');
const latestLink = getRequiredElement<HTMLAnchorElement>('#latest-link');
const collectionsLink = getRequiredElement<HTMLAnchorElement>('#collections-link');
const aboutLink = getRequiredElement<HTMLAnchorElement>('#about-link');
const maturityGate = getRequiredElement<HTMLElement>('#maturity-gate');
const maturityEnter = getRequiredElement<HTMLButtonElement>('#maturity-enter');
const maturityLeave = getRequiredElement<HTMLButtonElement>('#maturity-leave');

const parsed = parsePhotoEntries(photoSource);
let layoutFrame: number | undefined;
let lastViewedPhotoIndex = 0;
let lastTrackedPhotoIndex: number | null = null;
let lastOpenedPhotoLink: HTMLAnchorElement | null = null;
let reloadLightbox: (() => void) | undefined;
let unobservePhotoCard: ((card: HTMLElement) => void) | undefined;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const galleryImageSizes = '(max-width: 680px) 100vw, (max-width: 1100px) 66vw, 75vw';
const collectionImageSizes = '(max-width: 680px) 100vw, (max-width: 1100px) 58vw, 67vw';
const featureAspectThreshold = 1.4;
const maturityStorageKey = 'photo-b-maturity-confirmed';
const maturityStorageLifetime = 30 * 24 * 60 * 60 * 1000;
const maturityGuardedRegions = [siteHeader, siteMain, siteFooter];

interface ResponsiveImageSources {
  sizes: string;
  srcset?: string;
}

function hasMaturityConfirmation(): boolean {
  try {
    const confirmedAt = Number(window.localStorage.getItem(maturityStorageKey));

    if (!Number.isFinite(confirmedAt) || Date.now() - confirmedAt >= maturityStorageLifetime) {
      window.localStorage.removeItem(maturityStorageKey);
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

function rememberMaturityConfirmation(): void {
  try {
    window.localStorage.setItem(maturityStorageKey, String(Date.now()));
  } catch {
    // Continue without persistence when storage is unavailable.
  }
}

async function requestMaturityConfirmation(): Promise<boolean> {
  if ((pageView !== 'gallery' && pageView !== 'collections') || hasMaturityConfirmation()) {
    return false;
  }

  maturityGate.hidden = false;
  document.body.classList.add('maturity-gate-open');
  maturityGuardedRegions.forEach((region) => {
    region.setAttribute('aria-hidden', 'true');
    region.setAttribute('inert', '');
  });

  const previouslyFocused = document.activeElement instanceof HTMLElement
    && document.activeElement !== document.body
    ? document.activeElement
    : null;

  return new Promise<boolean>((resolve) => {
    const focusableControls = [maturityEnter, maturityLeave];

    const closeGate = (): void => {
      maturityGate.hidden = true;
      document.body.classList.remove('maturity-gate-open');
      maturityGuardedRegions.forEach((region) => {
        region.removeAttribute('aria-hidden');
        region.removeAttribute('inert');
      });
      maturityEnter.removeEventListener('click', confirmEntry);
      maturityLeave.removeEventListener('click', leaveSite);
      maturityGate.removeEventListener('keydown', trapFocus);

      if (previouslyFocused?.isConnected) {
        previouslyFocused.focus({ preventScroll: true });
      }

      resolve(true);
    };

    const confirmEntry = (): void => {
      rememberMaturityConfirmation();
      closeGate();
    };

    const leaveSite = (): void => {
      if (window.history.length > 1) {
        window.history.back();
        return;
      }

      window.location.replace('about:blank');
    };

    const trapFocus = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault();
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      const firstControl = focusableControls[0];
      const lastControl = focusableControls[focusableControls.length - 1];

      if (event.shiftKey && document.activeElement === firstControl) {
        event.preventDefault();
        lastControl.focus();
      } else if (!event.shiftKey && document.activeElement === lastControl) {
        event.preventDefault();
        firstControl.focus();
      }
    };

    maturityEnter.addEventListener('click', confirmEntry);
    maturityLeave.addEventListener('click', leaveSite);
    maturityGate.addEventListener('keydown', trapFocus);
    maturityEnter.focus({ preventScroll: true });
  });
}

function getResponsiveImageSources(url: string, sizes: string): ResponsiveImageSources {
  try {
    const sourceUrl = new URL(url);

    if (!/^(?:preview|external-preview)\.redd\.it$/i.test(sourceUrl.hostname)) {
      return { sizes };
    }

    const originalWidth = Number(sourceUrl.searchParams.get('width'));

    if (!Number.isSafeInteger(originalWidth) || originalWidth <= 0) {
      return { sizes };
    }

    return {
      sizes,
      srcset: `${sourceUrl.href} ${originalWidth}w`,
    };
  } catch {
    return { sizes };
  }
}

function hydrateLazyImage(image: HTMLImageElement): void {
  const sourceSet = image.dataset.srcset;

  if (sourceSet) {
    image.srcset = sourceSet;
    delete image.dataset.srcset;
  }

  const source = image.dataset.src;

  if (source) {
    image.src = source;
    delete image.dataset.src;
  }
}

const lazyImageObserver = 'IntersectionObserver' in window
  ? new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }

          const image = entry.target as HTMLImageElement;
          hydrateLazyImage(image);

          observer.unobserve(image);
        });
      },
      { rootMargin: '600px 0px' },
    )
  : null;

function configureIssueLink(
  link: HTMLAnchorElement,
  issue: IssueSource | undefined,
  direction: 'Previous' | 'Next',
): void {
  if (!issue) {
    link.removeAttribute('href');
    link.setAttribute('aria-disabled', 'true');
    link.classList.add('is-disabled');
    return;
  }

  link.href = `?issue=${issue.slug}`;
  link.setAttribute('aria-label', `${direction} issue: ${formatPhotoNumber(issue.number)}, ${issue.year}`);
}

function setActiveNavigation(link: HTMLAnchorElement): void {
  link.classList.add('is-active');
  link.setAttribute('aria-current', 'page');
}

function setCanonicalPath(path: string): void {
  const canonicalLink = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  const canonicalBase = new URL(canonicalLink?.href ?? 'https://photob.pages.dev/');
  canonicalLink?.setAttribute('href', new URL(path, canonicalBase).href);
}

issueNumber.textContent = formatPhotoNumber(activeIssue.number);
heroIssueNumber.textContent = formatPhotoNumber(activeIssue.number);
issueYear.textContent = String(activeIssue.year);
heroYear.textContent = String(activeIssue.year);
configureIssueLink(previousIssueLink, issues[activeIssueIndex - 1], 'Previous');
configureIssueLink(nextIssueLink, issues[activeIssueIndex + 1], 'Next');

galleryPage.hidden = pageView !== 'gallery';
collectionsPage.hidden = pageView !== 'collections';
aboutPage.hidden = pageView !== 'about';
issueSwitcher.hidden = pageView !== 'gallery';
viewStatus.hidden = pageView !== 'gallery';
siteHeader.classList.toggle('site-header--simple', pageView !== 'gallery');

if (pageView === 'collections') {
  document.title = 'PHOTO B — Collections';
  setActiveNavigation(collectionsLink);
} else if (pageView === 'about') {
  document.title = 'PHOTO B — About';
  setActiveNavigation(aboutLink);
} else {
  document.title = `PHOTO B — Issue ${formatPhotoNumber(activeIssue.number)} / ${activeIssue.year}`;
  setActiveNavigation(latestLink);
}

setCanonicalPath(
  pageView === 'gallery'
    ? activeIssueIndex === issues.length - 1
      ? '/'
      : `/?issue=${activeIssue.slug}`
    : `/?view=${pageView}`,
);

parsed.warnings.forEach((warning) => console.warn(`[PHOTO B] ${warning}`));

function updateViewCount(current: number, total: number): void {
  viewCount.textContent = `PHOTO ${formatPhotoNumber(current)} / ${formatPhotoNumber(total)}`;
}

function classifyFeatureFrames(cards: HTMLElement[]): void {
  let previousWasFeature = false;

  cards.forEach((card, index) => {
    const aspect = Number.parseFloat(card.dataset.photoAspect ?? '');
    const isFeature = index > 0
      && !previousWasFeature
      && Number.isFinite(aspect)
      && aspect >= featureAspectThreshold;
    card.classList.toggle('is-feature', isFeature);
    previousWasFeature = isFeature;
  });
}

function layoutGallery(): void {
  layoutFrame = undefined;
  const cards = [...gallery.querySelectorAll<HTMLElement>('.photo-card')];
  classifyFeatureFrames(cards);

  if (window.matchMedia('(max-width: 680px)').matches) {
    gallery.style.removeProperty('height');
    cards.forEach((card) => {
      card.style.removeProperty('position');
      card.style.removeProperty('transform');
      card.style.removeProperty('width');
    });
    gallery.classList.add('is-arranged');
    return;
  }

  const galleryStyles = getComputedStyle(gallery);
  const columnGap = Number.parseFloat(galleryStyles.columnGap) || 0;
  const rowGap = Number.parseFloat(galleryStyles.rowGap) || 0;
  const availableWidth = gallery.clientWidth;
  if (availableWidth <= 0) {
    return;
  }

  const rowProfiles = [
    { minimum: 280, preferred: 0.42, maximum: 460 },
    { minimum: 150, preferred: 0.27, maximum: 330 },
    { minimum: 220, preferred: 0.36, maximum: 400 },
    { minimum: 140, preferred: 0.24, maximum: 290 },
  ];
  let row: HTMLElement[] = [];
  let aspectSum = 0;
  let rowIndex = 0;
  let top = 0;

  const getAspect = (card: HTMLElement): number => {
    const aspect = Number.parseFloat(card.dataset.photoAspect ?? '');
    return Number.isFinite(aspect) && aspect > 0 ? aspect : 4 / 5;
  };

  const getTargetRowHeight = (index: number): number => {
    const profile = rowProfiles[index % rowProfiles.length];
    return Math.min(
      profile.maximum,
      Math.max(profile.minimum, availableWidth * profile.preferred),
    );
  };

  const getSoloRowHeight = (): number => Math.min(640, Math.max(360, availableWidth * 0.55));

  const placeRow = (shouldFill: boolean): void => {
    if (row.length === 0) {
      return;
    }

    const gapsWidth = columnGap * Math.max(0, row.length - 1);
    const naturalRowHeight = (availableWidth - gapsWidth) / aspectSum;
    const rowHeight = shouldFill || row.length > 1
      ? naturalRowHeight
      : Math.min(getSoloRowHeight(), naturalRowHeight);
    const rowWidth = rowHeight * aspectSum + gapsWidth;
    let left = shouldFill ? 0 : Math.max(0, (availableWidth - rowWidth) / 2);
    let bottom = top;

    row.forEach((card) => {
      const width = rowHeight * getAspect(card);
      card.style.position = 'absolute';
      card.style.width = `${width}px`;
      card.style.transform = `translate3d(${left}px, ${top}px, 0)`;
      left += width + columnGap;
      bottom = Math.max(bottom, top + card.getBoundingClientRect().height);
    });

    top = bottom + rowGap;
    row = [];
    aspectSum = 0;
    rowIndex += 1;
  };

  const placeFeature = (card: HTMLElement): void => {
    const aspect = getAspect(card);
    const maxHeight = Math.max(360, window.innerHeight - 128);
    const height = Math.min(availableWidth / aspect, maxHeight);
    const width = height * aspect;
    const left = Math.max(0, (availableWidth - width) / 2);
    card.style.position = 'absolute';
    card.style.width = `${width}px`;
    card.style.transform = `translate3d(${left}px, ${top}px, 0)`;
    top += card.getBoundingClientRect().height + rowGap;
    rowIndex += 1;
  };

  cards.forEach((card, index) => {
    if (card.classList.contains('is-feature')) {
      placeRow(false);
      placeFeature(card);
      return;
    }

    const cardAspect = getAspect(card);
    row.push(card);
    aspectSum += cardAspect;

    const projectedHeight = (
      availableWidth - columnGap * Math.max(0, row.length - 1)
    ) / aspectSum;
    const targetRowHeight = getTargetRowHeight(rowIndex);

    if (projectedHeight <= targetRowHeight) {
      const previousAspectSum = aspectSum - cardAspect;
      const previousHeight = row.length > 1
        ? (
            availableWidth - columnGap * Math.max(0, row.length - 2)
          ) / previousAspectSum
        : Number.POSITIVE_INFINITY;

      if (
        row.length > 1
        && !cards[index + 1]?.classList.contains('is-feature')
        && Math.abs(previousHeight - targetRowHeight)
          <= Math.abs(projectedHeight - targetRowHeight)
      ) {
        row.pop();
        aspectSum = previousAspectSum;
        placeRow(true);
        row.push(card);
        aspectSum = cardAspect;
        return;
      }

      placeRow(true);
    }
  });

  if (row.length > 0) {
    placeRow(row.length > 1);
  }

  gallery.style.height = `${Math.max(0, top - rowGap)}px`;
  gallery.classList.add('is-arranged');
}

function scheduleGalleryLayout(): void {
  if (layoutFrame !== undefined) {
    return;
  }

  layoutFrame = window.requestAnimationFrame(layoutGallery);
}

function trackVisiblePhoto(index: number): void {
  if (lastTrackedPhotoIndex === index) {
    return;
  }

  const cards = [...gallery.querySelectorAll<HTMLElement>('.photo-card')];
  const card = cards[index];

  if (!card) {
    return;
  }

  trackPhotoView({
    caption: card.dataset.caption ?? '',
    issue: activeIssue.slug,
    photoNumber: index + 1,
  });
  lastTrackedPhotoIndex = index;
}

function refreshPhotoSequence(): void {
  const cards = [...gallery.querySelectorAll<HTMLElement>('.photo-card')];

  cards.forEach((card, index) => {
    const number = formatPhotoNumber(index + 1);
    const caption = card.dataset.caption ?? '';
    const link = card.querySelector<HTMLAnchorElement>('.photo-card__media');
    const image = card.querySelector<HTMLImageElement>('img');
    const numberElement = card.querySelector<HTMLElement>('.photo-card__number');

    card.dataset.photoIndex = String(index);

    if (numberElement) {
      numberElement.textContent = number;
    }

    if (link) {
      link.dataset.title = caption ? `${number} — ${caption}` : `Photo ${number}`;
      link.setAttribute('aria-label', `Open photo ${number} in full-screen gallery`);
    }

    if (image) {
      image.alt = caption || `PHOTO B gallery photograph ${number}`;
    }
  });

  if (cards.length === 0) {
    gallery.hidden = true;
    emptyState.hidden = false;
    emptyState.querySelector('h2')!.textContent = 'Photographs unavailable.';
    emptyState.querySelector('p')!.textContent = 'The image files for this issue could not be loaded.';
    updateViewCount(0, 0);
  } else {
    lastViewedPhotoIndex = Math.min(lastViewedPhotoIndex, cards.length - 1);
    updateViewCount(lastViewedPhotoIndex + 1, cards.length);
  }

  reloadLightbox?.();
  scheduleGalleryLayout();
}

function createCollectionCard(
  issue: IssueSource,
  photos: PhotoEntry[],
  isLatest: boolean,
  index: number,
): HTMLElement {
  const article = document.createElement('article');
  const link = document.createElement('a');
  const media = document.createElement('span');
  const meta = document.createElement('span');
  const issueLabel = document.createElement('span');
  const count = document.createElement('span');
  const cover = photos[0];

  article.className = 'collection-card';
  link.className = 'collection-card__link';
  link.href = `?issue=${issue.slug}`;
  link.setAttribute('aria-label', `Open issue ${formatPhotoNumber(issue.number)}, ${issue.year}`);
  media.className = 'collection-card__media';
  meta.className = 'collection-card__meta';
  issueLabel.className = 'collection-card__issue';
  issueLabel.textContent = `ISSUE ${formatPhotoNumber(issue.number)} — ${issue.year}`;
  count.className = 'collection-card__count';
  count.textContent = `${formatPhotoNumber(photos.length)} PHOTOGRAPHS`;

  if (isLatest) {
    const latest = document.createElement('span');
    latest.className = 'collection-card__latest';
    latest.textContent = 'LATEST';
    meta.append(latest);
  }

  if (cover) {
    const image = document.createElement('img');
    const imageSources = getResponsiveImageSources(cover.url, collectionImageSizes);
    image.sizes = imageSources.sizes;
    if (imageSources.srcset) {
      image.srcset = imageSources.srcset;
    }
    image.src = cover.url;
    image.alt = cover.caption
      ? `${cover.caption}, cover of issue ${formatPhotoNumber(issue.number)}, ${issue.year}`
      : `Cover of issue ${formatPhotoNumber(issue.number)}, ${issue.year}`;
    image.loading = index === 0 ? 'eager' : 'lazy';
    image.decoding = 'async';

    if (index === 0) {
      image.fetchPriority = 'high';
    }

    image.addEventListener('load', () => article.classList.add('is-loaded'), { once: true });
    image.addEventListener('error', () => article.classList.add('is-error'), { once: true });
    media.append(image);
  } else {
    article.classList.add('is-error');
  }

  meta.append(issueLabel, count);
  link.append(media, meta);
  article.append(link);

  return article;
}

async function renderCollections(): Promise<void> {
  const issueCollections = await Promise.all(
    [...issues].reverse().map(async (issue) => {
      const parsedIssue = parsePhotoEntries(await issue.load());
      parsedIssue.warnings.forEach((warning) => console.warn(`[PHOTO B / ${issue.slug}] ${warning}`));
      return { issue, photos: parsedIssue.photos };
    }),
  );
  const fragment = document.createDocumentFragment();

  issueCollections.forEach(({ issue, photos }, index) => {
    fragment.append(createCollectionCard(issue, photos, index === 0, index));
  });

  collectionsGrid.append(fragment);
}

function createPhotoCard(photo: PhotoEntry, index: number): HTMLElement {
  const number = formatPhotoNumber(index + 1);
  const figure = document.createElement('figure');
  const link = document.createElement('a');
  const image = document.createElement('img');
  const meta = document.createElement('figcaption');
  const numberElement = document.createElement('span');
  const ruleElement = document.createElement('span');

  figure.className = 'photo-card is-loading';
  figure.dataset.photoIndex = String(index);
  figure.dataset.photoAspect = String(4 / 5);
  figure.dataset.caption = photo.caption ?? '';

  link.className = 'photo-card__media glightbox';
  link.href = photo.url;
  link.dataset.gallery = 'photo-b';
  link.dataset.type = 'image';
  link.dataset.title = photo.caption ? `${number} — ${photo.caption}` : `Photo ${number}`;
  link.setAttribute('aria-label', `Open photo ${number} in full-screen gallery`);

  const imageSources = getResponsiveImageSources(photo.url, galleryImageSizes);
  link.dataset.sizes = imageSources.sizes;
  if (imageSources.srcset) {
    link.dataset.srcset = imageSources.srcset;
  }

  image.alt = photo.caption || `PHOTO B gallery photograph ${number}`;
  image.sizes = imageSources.sizes;
  image.loading = index < 2 ? 'eager' : 'lazy';
  image.decoding = 'async';

  if (index < 2) {
    if (imageSources.srcset) {
      image.srcset = imageSources.srcset;
    }
    image.src = photo.url;
    image.fetchPriority = 'high';
  } else {
    image.dataset.src = photo.url;
    if (imageSources.srcset) {
      image.dataset.srcset = imageSources.srcset;
    }
  }

  const markFailed = (): void => {
    lazyImageObserver?.unobserve(image);
    unobservePhotoCard?.(figure);
    figure.remove();
    refreshPhotoSequence();
  };

  const markLoaded = (): void => {
    if (!isUsablePhotoDimensions(image.naturalWidth, image.naturalHeight)) {
      markFailed();
      return;
    }

    const aspect = image.naturalWidth / image.naturalHeight;
    figure.dataset.photoAspect = String(aspect);
    figure.style.setProperty('--photo-aspect', String(aspect));
    figure.classList.remove('is-loading');
    figure.classList.add('is-loaded');
    scheduleGalleryLayout();
  };

  image.addEventListener('load', markLoaded, { once: true });
  image.addEventListener('error', markFailed, { once: true });
  link.addEventListener('click', () => {
    if (!link.hasAttribute('href')) {
      return;
    }

    const cards = [...gallery.querySelectorAll<HTMLElement>('.photo-card')];
    const currentIndex = cards.indexOf(figure);

    if (currentIndex < 0) {
      return;
    }

    lastViewedPhotoIndex = currentIndex;
    lastOpenedPhotoLink = link;
    updateViewCount(currentIndex + 1, cards.length);
    trackVisiblePhoto(currentIndex);
  });

  if (image.getAttribute('src') && image.complete) {
    if (image.naturalWidth > 0) {
      markLoaded();
    } else {
      markFailed();
    }
  }

  meta.className = 'photo-card__meta';
  numberElement.className = 'photo-card__number';
  numberElement.textContent = number;
  ruleElement.className = 'photo-card__rule';
  ruleElement.setAttribute('aria-hidden', 'true');
  meta.append(numberElement);

  if (photo.caption) {
    const labelElement = document.createElement('span');
    labelElement.className = 'photo-card__label';
    labelElement.textContent = photo.caption;
    meta.append(labelElement);
  } else {
    meta.classList.add('photo-card__meta--number-only');
  }

  meta.append(ruleElement);

  link.append(image);
  figure.append(link, meta);

  return figure;
}

const maturityGateWasShown = await requestMaturityConfirmation();

if (pageView === 'gallery' || pageView === 'collections') {
  initializeAnalytics();
}

if (pageView === 'collections') {
  await renderCollections();
} else if (pageView === 'gallery' && parsed.photos.length === 0) {
  gallery.hidden = true;
  emptyState.hidden = false;
  updateViewCount(0, 0);
} else if (pageView === 'gallery') {
  const fragment = document.createDocumentFragment();
  parsed.photos.forEach((photo, index) => fragment.append(createPhotoCard(photo, index)));
  gallery.append(fragment);
  gallery.querySelectorAll<HTMLImageElement>('img[data-src]').forEach((image) => {
    if (lazyImageObserver) {
      lazyImageObserver.observe(image);
      return;
    }

    hydrateLazyImage(image);
  });
  updateViewCount(1, parsed.photos.length);
  scheduleGalleryLayout();

  const resizeObserver = new ResizeObserver(scheduleGalleryLayout);
  unobservePhotoCard = (card) => resizeObserver.unobserve(card);
  resizeObserver.observe(gallery);
  gallery.querySelectorAll<HTMLElement>('.photo-card').forEach((card) => resizeObserver.observe(card));
  void document.fonts.ready.then(scheduleGalleryLayout);
  window.addEventListener('resize', scheduleGalleryLayout, { passive: true });

  const lightbox = GLightbox({
    selector: '.glightbox',
    touchNavigation: true,
    touchFollowAxis: true,
    keyboardNavigation: true,
    closeOnOutsideClick: true,
    loop: true,
    zoomable: true,
    draggable: true,
    openEffect: reduceMotion ? 'none' : 'fade',
    closeEffect: reduceMotion ? 'none' : 'fade',
    slideEffect: reduceMotion ? 'none' : 'slide',
  });
  reloadLightbox = () => lightbox.reload();

  lightbox.on('open', () => {
    const modal = document.querySelector<HTMLElement>('.glightbox-container');

    if (!modal) {
      return;
    }

    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', 'PHOTO B photo viewer');
    modal.querySelector<HTMLButtonElement>('.gclose')?.focus({ preventScroll: true });
  });

  lightbox.on('slide_changed', () => {
    lastViewedPhotoIndex = lightbox.getActiveSlideIndex() ?? lastViewedPhotoIndex;
    updateViewCount(
      lastViewedPhotoIndex + 1,
      gallery.querySelectorAll('.photo-card').length,
    );
    trackVisiblePhoto(lastViewedPhotoIndex);
  });

  lightbox.on('close', () => {
    updateViewCount(
      lastViewedPhotoIndex + 1,
      gallery.querySelectorAll('.photo-card').length,
    );
    lastTrackedPhotoIndex = null;
    lastOpenedPhotoLink?.focus({ preventScroll: true });
  });
}

if (maturityGateWasShown) {
  window.requestAnimationFrame(() => {
    const firstContentLink = pageView === 'collections'
      ? document.querySelector<HTMLElement>('.collection-card__link')
      : document.querySelector<HTMLElement>('.photo-card__media');
    firstContentLink?.focus({ preventScroll: true });
  });
}
