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

const requestedIssue = new URLSearchParams(window.location.search).get('issue');
const requestedIssueIndex = requestedIssue
  ? issues.findIndex((issue) => issue.slug === requestedIssue)
  : -1;
const activeIssueIndex = requestedIssueIndex >= 0 ? requestedIssueIndex : issues.length - 1;
const activeIssue = issues[activeIssueIndex];
const photoSource = await activeIssue.load();

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
const issueNumber = getRequiredElement<HTMLElement>('#issue-number');
const issueYear = getRequiredElement<HTMLElement>('#issue-year');
const heroYear = getRequiredElement<HTMLElement>('#hero-year');
const previousIssueLink = getRequiredElement<HTMLAnchorElement>('#previous-issue');
const nextIssueLink = getRequiredElement<HTMLAnchorElement>('#next-issue');

const parsed = parsePhotoEntries(photoSource);
let layoutFrame: number | undefined;
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

issueNumber.textContent = formatPhotoNumber(activeIssue.number);
issueYear.textContent = String(activeIssue.year);
heroYear.textContent = String(activeIssue.year);
document.title = `PHOTO B — Issue ${formatPhotoNumber(activeIssue.number)} / ${activeIssue.year}`;
configureIssueLink(previousIssueLink, issues[activeIssueIndex - 1], 'Previous');
configureIssueLink(nextIssueLink, issues[activeIssueIndex + 1], 'Next');

parsed.warnings.forEach((warning) => console.warn(`[PHOTO B] ${warning}`));

function updateViewCount(current: number, total: number): void {
  viewCount.textContent = `VIEW ${formatPhotoNumber(current)} / ${formatPhotoNumber(total)}`;
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

  image.alt = `PHOTO B gallery photograph ${number}`;
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

if (parsed.photos.length === 0) {
  gallery.hidden = true;
  emptyState.hidden = false;
  updateViewCount(0, 0);
} else {
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
    const activeIndex = lightbox.getActiveSlideIndex() ?? 0;
    updateViewCount(activeIndex + 1, parsed.photos.length);
  });

  lightbox.on('close', () => updateViewCount(1, parsed.photos.length));
}
