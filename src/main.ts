import GLightbox from 'glightbox';
import 'glightbox/dist/css/glightbox.css';
import './styles.css';
import {
  formatPhotoNumber,
  getLayoutVariant,
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
const heroYear = getRequiredElement<HTMLElement>('#hero-year');
const previousIssueLink = getRequiredElement<HTMLAnchorElement>('#previous-issue');
const nextIssueLink = getRequiredElement<HTMLAnchorElement>('#next-issue');
const issueSwitcher = getRequiredElement<HTMLElement>('.issue-switcher');
const siteHeader = getRequiredElement<HTMLElement>('#site-header');
const galleryPage = getRequiredElement<HTMLElement>('#gallery-page');
const collectionsPage = getRequiredElement<HTMLElement>('#collections-page');
const collectionsGrid = getRequiredElement<HTMLElement>('#collections-grid');
const aboutPage = getRequiredElement<HTMLElement>('#about-page');
const latestLink = getRequiredElement<HTMLAnchorElement>('#latest-link');
const collectionsLink = getRequiredElement<HTMLAnchorElement>('#collections-link');
const aboutLink = getRequiredElement<HTMLAnchorElement>('#about-link');

const parsed = parsePhotoEntries(photoSource);
let layoutFrame: number | undefined;
let lastViewedPhotoIndex = 0;
let lastOpenedPhotoLink: HTMLAnchorElement | null = null;
const lazyImageObserver = 'IntersectionObserver' in window
  ? new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }

          const image = entry.target as HTMLImageElement;
          const source = image.dataset.src;

          if (source) {
            image.src = source;
            delete image.dataset.src;
          }

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

issueNumber.textContent = formatPhotoNumber(activeIssue.number);
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

parsed.warnings.forEach((warning) => console.warn(`[PHOTO B] ${warning}`));

function updateViewCount(current: number, total: number): void {
  viewCount.textContent = `PHOTO ${formatPhotoNumber(current)} / ${formatPhotoNumber(total)}`;
}

function layoutGallery(): void {
  layoutFrame = undefined;
  const cards = [...gallery.querySelectorAll<HTMLElement>('.photo-card')];

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
  const columns = window.matchMedia('(max-width: 1100px)').matches ? 6 : 12;
  const columnGap = Number.parseFloat(galleryStyles.columnGap) || 0;
  const rowGap = Number.parseFloat(galleryStyles.rowGap) || 0;
  const columnWidth = (gallery.clientWidth - columnGap * (columns - 1)) / columns;
  const columnBottoms = Array<number>(columns).fill(0);

  cards.forEach((card) => {
    const requestedSpan = Number.parseInt(getComputedStyle(card).getPropertyValue('--card-columns'), 10) || 3;
    const span = Math.min(requestedSpan, columns);
    let bestColumn = 0;
    let bestTop = Number.POSITIVE_INFINITY;

    for (let column = 0; column <= columns - span; column += 1) {
      const candidateTop = Math.max(...columnBottoms.slice(column, column + span));

      if (candidateTop < bestTop) {
        bestColumn = column;
        bestTop = candidateTop;
      }
    }

    const width = columnWidth * span + columnGap * (span - 1);
    const x = bestColumn * (columnWidth + columnGap);
    card.style.position = 'absolute';
    card.style.width = `${width}px`;
    card.style.transform = `translate3d(${x}px, ${bestTop}px, 0)`;

    const bottom = bestTop + card.getBoundingClientRect().height + rowGap;
    columnBottoms.fill(bottom, bestColumn, bestColumn + span);
  });

  gallery.style.height = `${Math.max(...columnBottoms, 0) - rowGap}px`;
  gallery.classList.add('is-arranged');
}

function scheduleGalleryLayout(): void {
  if (layoutFrame !== undefined) {
    return;
  }

  layoutFrame = window.requestAnimationFrame(layoutGallery);
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

  figure.className = `photo-card photo-card--${getLayoutVariant(index)} is-loading`;
  figure.dataset.photoIndex = String(index);

  link.className = 'photo-card__media glightbox';
  link.href = photo.url;
  link.dataset.gallery = 'photo-b';
  link.dataset.type = 'image';
  link.dataset.title = photo.caption ? `${number} — ${photo.caption}` : `Photo ${number}`;
  link.setAttribute('aria-label', `Open photo ${number} in full-screen gallery`);

  image.alt = photo.caption || `PHOTO B gallery photograph ${number}`;
  image.loading = index < 2 ? 'eager' : 'lazy';
  image.decoding = 'async';

  if (index < 2) {
    image.src = photo.url;
    image.fetchPriority = 'high';
  } else {
    image.dataset.src = photo.url;
  }

  const markLoaded = (): void => {
    figure.style.setProperty('--photo-aspect', `${image.naturalWidth} / ${image.naturalHeight}`);
    figure.classList.remove('is-loading');
    figure.classList.add('is-loaded');
    scheduleGalleryLayout();
  };

  const markFailed = (): void => {
    figure.classList.remove('is-loading', 'is-loaded');
    figure.classList.add('is-error');
    link.removeAttribute('href');
    link.setAttribute('aria-disabled', 'true');
    link.setAttribute('aria-label', `Photo ${number} could not be loaded`);
    scheduleGalleryLayout();
  };

  image.addEventListener('load', markLoaded, { once: true });
  image.addEventListener('error', markFailed, { once: true });
  link.addEventListener('click', () => {
    if (!link.hasAttribute('href')) {
      return;
    }

    lastViewedPhotoIndex = index;
    lastOpenedPhotoLink = link;
    updateViewCount(index + 1, parsed.photos.length);
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

    image.src = image.dataset.src ?? '';
    delete image.dataset.src;
  });
  updateViewCount(1, parsed.photos.length);
  scheduleGalleryLayout();

  const resizeObserver = new ResizeObserver(scheduleGalleryLayout);
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
    openEffect: 'fade',
    closeEffect: 'fade',
    slideEffect: 'slide',
  });

  lightbox.on('slide_changed', () => {
    lastViewedPhotoIndex = lightbox.getActiveSlideIndex() ?? lastViewedPhotoIndex;
    updateViewCount(lastViewedPhotoIndex + 1, parsed.photos.length);
  });

  lightbox.on('close', () => {
    updateViewCount(lastViewedPhotoIndex + 1, parsed.photos.length);
    lastOpenedPhotoLink?.focus({ preventScroll: true });
  });
}
