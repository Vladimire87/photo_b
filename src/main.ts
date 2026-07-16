import GLightbox from 'glightbox';
import 'glightbox/dist/css/glightbox.css';
import './styles.css';
import photoSource from './data/photos.txt?raw';
import {
  formatPhotoNumber,
  getLayoutVariant,
  parsePhotoEntries,
  type PhotoEntry,
} from './gallery';

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

const parsed = parsePhotoEntries(photoSource);
let layoutFrame: number | undefined;

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

  image.src = photo.url;
  image.alt = `PHOTO B gallery photograph ${number}`;
  image.loading = index < 2 ? 'eager' : 'lazy';
  image.decoding = 'async';

  if (index < 2) {
    image.fetchPriority = 'high';
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

  if (image.complete) {
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
