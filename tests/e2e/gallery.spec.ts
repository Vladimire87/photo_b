import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

const galleryImage = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"></svg>',
);
const deletedImagePlaceholder = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" width="130" height="60"></svg>',
);

function countIssuePhotos(issueSlug: string): number {
  return readFileSync(
    new URL(`../../src/data/issues/${issueSlug}.txt`, import.meta.url),
    'utf8',
  )
    .split(/\r?\n/)
    .filter((line) => {
      const value = line.trim();
      return value !== '' && !value.startsWith('#');
    })
    .length;
}

async function mockImages(
  page: Page,
  onImageRequest?: (url: string) => void,
  deletedImageUrl?: string,
): Promise<void> {
  await page.route('https://**/*', async (route) => {
    if (route.request().resourceType() === 'image') {
      const url = route.request().url();
      onImageRequest?.(url);
      await route.fulfill({
        status: deletedImageUrl && url.includes(deletedImageUrl) ? 404 : 200,
        contentType: 'image/svg+xml',
        headers: { 'cache-control': 'no-store' },
        body: deletedImageUrl && url.includes(deletedImageUrl)
          ? deletedImagePlaceholder
          : galleryImage,
      });
      return;
    }

    await route.continue();
  });
}

test('publishes a complete large-image social preview', async ({ page, request }) => {
  await page.goto('/');

  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', 'PHOTO B — Photos I Like');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    'content',
    'https://photob.pages.dev/assets/photo-b-og.png',
  );
  await expect(page.locator('meta[property="og:image:width"]')).toHaveAttribute('content', '1200');
  await expect(page.locator('meta[property="og:image:height"]')).toHaveAttribute('content', '630');
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image');

  const preview = await request.get('/assets/photo-b-og.png');
  expect(preview.ok()).toBe(true);
  expect(preview.headers()['content-type']).toContain('image/png');
});

test('renders the complete editorial gallery without horizontal overflow', async ({ page }) => {
  await mockImages(page);
  await page.goto('/');

  await expect(page.getByRole('heading', { name: /photos i keep/i })).toBeVisible();
  await expect(page.locator('#issue-label')).toContainText(/Issue \d{2}/);
  const photoCount = await page.locator('.photo-card').count();
  expect(photoCount).toBeGreaterThan(0);
  await expect(page.locator('#view-count')).toHaveText(`PHOTO 01 / ${String(photoCount).padStart(2, '0')}`);
  await expect(page.locator('.photo-card').first()).toHaveClass(/is-loaded/);

  expect(await page.locator('.photo-card img').nth(0).getAttribute('loading')).toBe('eager');
  expect(await page.locator('.photo-card img').nth(2).getAttribute('loading')).toBe('lazy');
  await expect(page.locator('.photo-card img').first()).toHaveAttribute('sizes', /100vw/);
  await expect(page.locator('.photo-card img').first()).toHaveAttribute('srcset', /480w/);

  const dimensions = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
  }));

  expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport + 1);

  const galleryLayout = await page.locator('#gallery').evaluate((element) => ({
    height: element.getBoundingClientRect().height,
    firstCardPosition: getComputedStyle(element.querySelector('.photo-card')!).position,
  }));

  expect(galleryLayout.height).toBeGreaterThan(0);
  expect(galleryLayout.firstCardPosition).toBe(page.viewportSize()!.width <= 680 ? 'static' : 'absolute');

  if (page.viewportSize()!.width > 1100 && photoCount >= 2) {
    const composition = await page.evaluate(() => {
      const hero = document.querySelector('.hero')!.getBoundingClientRect();
      const gallery = document.querySelector('#gallery')!.getBoundingClientRect();
      const cards = [...document.querySelectorAll('.photo-card')]
        .map((card) => card.getBoundingClientRect());
      const firstRow = cards.filter((card) => Math.abs(card.top - cards[0].top) < 2);
      const occupiedWidth = firstRow.reduce((total, card) => total + card.width, 0);

      return {
        heroRight: Math.round(hero.right),
        firstLeft: Math.round(cards[0].left),
        galleryWidth: Math.round(gallery.width),
        firstWidth: Math.round(cards[0].width),
        firstRowCount: firstRow.length,
        occupiedWidth: Math.round(occupiedWidth),
      };
    });

    expect(composition.firstLeft).toBeGreaterThan(composition.heroRight);
    expect(composition.firstRowCount).toBeGreaterThan(1);
    expect(composition.firstWidth).toBeGreaterThan(composition.galleryWidth * 0.3);
    expect(composition.firstWidth).toBeLessThan(composition.galleryWidth * 0.6);
    expect(composition.occupiedWidth).toBeGreaterThan(composition.galleryWidth * 0.9);
  } else if (page.viewportSize()!.width <= 680) {
    const mobileComposition = await page.locator('.photo-card').first().evaluate((card) => {
      const bounds = card.getBoundingClientRect();
      return {
        top: bounds.top,
        width: bounds.width,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
      };
    });

    expect(mobileComposition.width).toBeGreaterThanOrEqual(mobileComposition.viewportWidth - 1);
    expect(mobileComposition.top).toBeLessThan(mobileComposition.viewportHeight);
  }

  const logoAlignment = await page.evaluate(() => {
    const mark = document.querySelector('.brand__mark')?.getBoundingClientRect();
    const wordmark = document.querySelector('.brand__wordmark')?.getBoundingClientRect();

    if (!mark || !wordmark) {
      return Number.POSITIVE_INFINITY;
    }

    return Math.abs(mark.top + mark.height / 2 - (wordmark.top + wordmark.height / 2));
  });

  expect(logoAlignment).toBeLessThanOrEqual(2);

  const footerLogoAlignment = await page.evaluate(() => {
    const mark = document.querySelector('.footer-brand .brand__mark')?.getBoundingClientRect();
    const label = document.querySelector('.footer-brand > span:last-child')?.getBoundingClientRect();

    if (!mark || !label) {
      return Number.POSITIVE_INFINITY;
    }

    return Math.abs(mark.top + mark.height / 2 - (label.top + label.height / 2));
  });

  expect(footerLogoAlignment).toBeLessThanOrEqual(1);
});

test('does not request distant photos until they approach the viewport', async ({ page }) => {
  const requestedImages: string[] = [];
  await mockImages(page, (url) => requestedImages.push(url));
  await page.goto('/?issue=2026-01');

  const lastImage = page.locator('.photo-card img').last();
  await expect(lastImage).not.toHaveAttribute('src', /.+/);
  const lastImageSource = await lastImage.getAttribute('data-src');
  expect(lastImageSource).toMatch(/^https:\/\//);
  const lastImagePath = new URL(lastImageSource!).pathname;
  expect(requestedImages.some((url) => new URL(url).pathname === lastImagePath)).toBe(false);

  await lastImage.scrollIntoViewIfNeeded();

  await expect(lastImage).toHaveAttribute('src', /^https:\/\//);
  await expect(lastImage).not.toHaveAttribute('data-src');
  expect(requestedImages.some((url) => new URL(url).pathname === lastImagePath)).toBe(true);
  await expect(lastImage.locator('..').locator('..')).toHaveClass(/is-loaded/);
});

test('opens the latest issue at its stable URL and disables missing neighbors', async ({ page }) => {
  await mockImages(page);
  await page.goto('/');

  await expect(page).toHaveTitle(/PHOTO B — Issue \d{2} \/ 20\d{2}/);
  await expect(page.locator('#issue-label')).toContainText(/Issue \d{2}/);
  expect(await page.locator('.photo-card').count()).toBeGreaterThan(0);
  await expect(page.locator('#previous-issue')).not.toHaveAttribute('aria-disabled', 'true');
  await expect(page.locator('#next-issue')).toHaveAttribute('aria-disabled', 'true');

  const previousIssue = page.locator('#previous-issue');
  await expect(previousIssue).toHaveAttribute('href', /^\?issue=\d{4}-\d{2}$/);
  await previousIssue.click();
  await expect(page).toHaveURL(/\?issue=\d{4}-\d{2}$/);
  await expect(page).toHaveTitle(/PHOTO B — Issue \d{2} \/ 20\d{2}/);
  await expect(page.locator('#issue-label')).toContainText(/Issue \d{2}/);
  expect(await page.locator('.photo-card').count()).toBeGreaterThan(0);
  await expect(page.locator('#previous-issue')).toHaveAttribute('aria-disabled', 'true');
  await expect(page.locator('#next-issue')).toHaveAttribute('href', /^\?issue=\d{4}-\d{2}$/);
});

test('falls back to the latest issue when an unknown issue is requested', async ({ page }) => {
  const requestedImages: string[] = [];
  await mockImages(page, (url) => requestedImages.push(url));
  await page.goto('/');
  const latestTitle = await page.title();
  const latestIssueLabel = (await page.locator('#issue-label').innerText()).replace(/\s+/g, ' ').trim();

  await page.goto('/?issue=2026-99');
  await expect(page.locator('.photo-card').first()).toHaveClass(/is-loaded/);

  await expect(page).toHaveTitle(latestTitle);
  expect((await page.locator('#issue-label').innerText()).replace(/\s+/g, ' ').trim()).toBe(latestIssueLabel);
  expect(requestedImages.length).toBeGreaterThan(0);
});

test('renders the collections archive and opens an issue', async ({ page }) => {
  await mockImages(page);
  await page.goto('/?view=collections');

  await expect(page).toHaveTitle('PHOTO B — Collections');
  await expect(page.getByRole('heading', { name: /collections/i })).toBeVisible();
  await expect(page.locator('#collections-link')).toHaveAttribute('aria-current', 'page');
  expect(await page.locator('.collection-card').count()).toBeGreaterThan(0);
  await expect(page.locator('.collection-card').first()).toContainText(/ISSUE \d{2} — 20\d{2}/);
  await expect(page.locator('.collection-card').first()).toContainText('LATEST');
  await expect(page.locator('#view-status')).toBeHidden();

  const dimensions = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
  }));
  expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport + 1);

  await page.locator('.collection-card__link').first().click();
  await expect(page).toHaveURL(/\?issue=\d{4}-\d{2}$/);
  await expect(page.locator('#issue-label')).toContainText(/Issue \d{2}/);
});

test('keeps gallery and collection images still on hover', async ({ page }) => {
  await mockImages(page);
  await page.goto('/');

  const galleryImage = page.locator('.photo-card__media img').first();
  await expect(galleryImage.locator('..').locator('..')).toHaveClass(/is-loaded/);
  const galleryStyleBeforeHover = await galleryImage.evaluate((image) => {
    const styles = getComputedStyle(image);
    return { filter: styles.filter, transform: styles.transform };
  });
  await galleryImage.locator('..').hover();
  const galleryStyleAfterHover = await galleryImage.evaluate((image) => {
    const styles = getComputedStyle(image);
    return { filter: styles.filter, transform: styles.transform };
  });
  expect(galleryStyleAfterHover).toEqual(galleryStyleBeforeHover);

  await page.goto('/?view=collections');
  const collectionImage = page.locator('.collection-card__media img').first();
  await expect(page.locator('.collection-card').first()).toHaveClass(/is-loaded/);
  const collectionStyleBeforeHover = await collectionImage.evaluate((image) => {
    const styles = getComputedStyle(image);
    return { filter: styles.filter, transform: styles.transform };
  });
  await page.locator('.collection-card__link').first().hover();
  const collectionStyleAfterHover = await collectionImage.evaluate((image) => {
    const styles = getComputedStyle(image);
    return { filter: styles.filter, transform: styles.transform };
  });
  expect(collectionStyleAfterHover).toEqual(collectionStyleBeforeHover);
});

test('loads the first photograph without a sideways reveal', async ({ page }) => {
  await mockImages(page);
  await page.goto('/');

  const firstCard = page.locator('.photo-card').first();
  await expect(firstCard).toHaveClass(/is-loaded/);
  await expect(firstCard.locator('.photo-card__media')).toHaveCSS('animation-name', 'none');
});

test('renders the typographic about page without requesting gallery photos', async ({ page }) => {
  const requestedImages: string[] = [];
  await mockImages(page, (url) => requestedImages.push(url));
  await page.goto('/?view=about');

  await expect(page).toHaveTitle('PHOTO B — About');
  await expect(page.getByRole('heading', { name: /a personal collection/i })).toBeVisible();
  await expect(page.locator('.about-page__lead')).toContainText('Photographs I want to return to');
  await expect(page.locator('#about-link')).toHaveAttribute('aria-current', 'page');
  await expect(page.locator('#view-status')).toBeHidden();
  await expect(page.locator('.photo-card')).toHaveCount(0);
  expect(requestedImages).toEqual([]);

  const dimensions = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
  }));
  expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport + 1);
});

test('keeps editorial navigation and long titles usable at 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await mockImages(page);
  await page.goto('/?view=collections');

  const metrics = await page.evaluate(() => {
    const title = document.querySelector<HTMLElement>('#collections-title')!;
    const navigationLinks = [...document.querySelectorAll<HTMLElement>('.editorial-nav a')];

    return {
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
      titleClientWidth: title.clientWidth,
      titleScrollWidth: title.scrollWidth,
      navigationTargets: navigationLinks.map((link) => ({
        width: link.getBoundingClientRect().width,
        height: link.getBoundingClientRect().height,
      })),
    };
  });

  expect(metrics.documentWidth).toBeLessThanOrEqual(metrics.viewportWidth + 1);
  expect(metrics.titleScrollWidth).toBeLessThanOrEqual(metrics.titleClientWidth + 1);
  expect(metrics.navigationTargets.every(({ width, height }) => width >= 44 && height >= 44)).toBe(true);
});

test('flows directly from the issue intro into the gallery on a short mobile screen', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await mockImages(page);
  await page.goto('/');

  await expect(page.locator('a[href="#gallery"]')).toHaveCount(0);

  const firstPhotoTop = await page.locator('.photo-card').first().evaluate(
    (card) => card.getBoundingClientRect().top,
  );
  expect(firstPhotoTop).toBeLessThan(568);
});

test('opens and closes the touch-friendly lightbox', async ({ page }) => {
  await mockImages(page);
  await page.goto('/');
  const trigger = page.locator('.photo-card__media').first();
  await trigger.click();
  const photoCount = await page.locator('.photo-card').count();

  await expect(page.locator('.glightbox-container')).toBeVisible();
  await expect(page.locator('.glightbox-container')).toHaveAttribute('role', 'dialog');
  await expect(page.locator('.glightbox-container')).toHaveAttribute('aria-modal', 'true');
  await expect(page.locator('.glightbox-container')).toHaveAttribute('aria-label', 'PHOTO B photo viewer');
  await expect(page.locator('.gclose')).toBeFocused();
  const lightboxBounds = await page.evaluate(() => {
    const image = document.querySelector<HTMLElement>('.gslide.current .gslide-image img')!;
    const description = document.querySelector<HTMLElement>('.gslide.current .gslide-description')!;
    const imageRect = image.getBoundingClientRect();
    const descriptionRect = description.getBoundingClientRect();

    return {
      imageTop: imageRect.top,
      descriptionBottom: descriptionRect.bottom,
      viewportHeight: window.innerHeight,
    };
  });
  expect(lightboxBounds.imageTop).toBeGreaterThanOrEqual(0);
  expect(lightboxBounds.descriptionBottom).toBeLessThanOrEqual(lightboxBounds.viewportHeight);
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#view-count')).toHaveText(`PHOTO 02 / ${String(photoCount).padStart(2, '0')}`);
  await page.keyboard.press('Escape');
  await expect(page.locator('.glightbox-container')).toBeHidden();
  await expect(page.locator('#view-count')).toHaveText(`PHOTO 02 / ${String(photoCount).padStart(2, '0')}`);
  await expect(trigger).toBeFocused();
});

test('removes gallery and lightbox motion for reduced-motion users', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await mockImages(page);
  await page.goto('/');
  await expect(page.locator('.photo-card').first()).toHaveClass(/is-loaded/);

  const galleryMotion = await page.locator('#gallery').evaluate((element) => {
    const styles = getComputedStyle(element);
    return {
      animationName: styles.animationName,
      transitionDuration: styles.transitionDuration,
    };
  });
  expect(galleryMotion).toEqual({ animationName: 'none', transitionDuration: '0s' });

  await page.locator('.photo-card__media').first().click();
  await expect(page.locator('.glightbox-container')).toBeVisible();
  const lightboxMotion = await page.evaluate(() => {
    const selectors = ['.gslider', '.gslide.current', '.goverlay', '.gloader'];
    return selectors.map((selector) => {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) {
        return null;
      }

      const styles = getComputedStyle(element);
      return {
        selector,
        animationName: styles.animationName,
        transitionDuration: styles.transitionDuration,
      };
    });
  });
  expect(lightboxMotion.filter(Boolean).every((motion) => (
    motion!.animationName === 'none' && motion!.transitionDuration === '0s'
  ))).toBe(true);
  await page.keyboard.press('Escape');
});

test('removes a failed external image and rebuilds the gallery sequence', async ({ page }) => {
  await mockImages(page);
  await page.goto('/');

  const firstCard = page.locator('.photo-card').first();
  const photoCount = await page.locator('.photo-card').count();
  await expect(firstCard).toHaveClass(/is-loaded/);
  const removedPhotoAlt = await firstCard.locator('img').getAttribute('alt');
  await firstCard.locator('img').evaluate((image) => image.dispatchEvent(new Event('error')));
  await expect(page.getByAltText(removedPhotoAlt!)).toHaveCount(0);
  await expect(page.locator('.photo-card')).toHaveCount(photoCount - 1);
  await expect(page.locator('.photo-card').first().locator('.photo-card__number')).toHaveText('01');
  await expect(page.locator('#view-count')).toHaveText(
    `PHOTO 01 / ${String(photoCount - 1).padStart(2, '0')}`,
  );

  await page.locator('.photo-card__media').first().click();
  await expect(page.locator('.glightbox-container')).toBeVisible();
  await expect(page.locator('.glightbox-container .gslide')).toHaveCount(photoCount - 1);
});

test('removes a deletion placeholder returned as a valid image body', async ({ page }) => {
  const deletedUrl = 'pbxnq8x2njdh1.jpeg';
  const expectedPhotoCount = countIssuePhotos('2026-01');
  await mockImages(page, undefined, deletedUrl);
  await page.goto('/?issue=2026-01');

  await expect(page.locator(`img[src*="${deletedUrl}"]`)).toHaveCount(0);
  await expect(page.locator('.photo-card')).toHaveCount(expectedPhotoCount - 1);
  await expect(page.locator('#view-count')).toHaveText(
    `PHOTO 01 / ${String(expectedPhotoCount - 1).padStart(2, '0')}`,
  );
});
