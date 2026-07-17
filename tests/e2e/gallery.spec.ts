import { expect, test, type Page } from '@playwright/test';

const transparentPixel = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+X7i4WQAAAABJRU5ErkJggg==',
  'base64',
);

async function mockImages(page: Page, onImageRequest?: (url: string) => void): Promise<void> {
  await page.route('https://**/*', async (route) => {
    if (route.request().resourceType() === 'image') {
      onImageRequest?.(route.request().url());
      await route.fulfill({
        status: 200,
        contentType: 'image/png',
        headers: { 'cache-control': 'no-store' },
        body: transparentPixel,
      });
      return;
    }

    await route.continue();
  });
}

test('renders the complete editorial gallery without horizontal overflow', async ({ page }) => {
  await mockImages(page);
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'THE ONES I KEEP' })).toBeVisible();
  await expect(page.locator('#issue-label')).toContainText('ISSUE 03 — 2026');
  const photoCount = await page.locator('.photo-card').count();
  expect(photoCount).toBeGreaterThan(0);
  await expect(page.locator('#view-count')).toHaveText(`VIEW 01 / ${String(photoCount).padStart(2, '0')}`);
  await expect(page.locator('.photo-card').first()).toHaveClass(/is-loaded/);

  expect(await page.locator('.photo-card img').nth(0).getAttribute('loading')).toBe('eager');
  expect(await page.locator('.photo-card img').nth(2).getAttribute('loading')).toBe('lazy');

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

  if (page.viewportSize()!.width > 1100 && photoCount >= 3) {
    const firstRow = await page.locator('.photo-card').evaluateAll((cards) =>
      cards.slice(0, 3).map((card) => {
        const bounds = card.getBoundingClientRect();
        return { x: Math.round(bounds.x), y: Math.round(bounds.y), width: Math.round(bounds.width) };
      }),
    );

    expect(new Set(firstRow.map(({ x }) => x)).size).toBe(3);
    expect(new Set(firstRow.map(({ y }) => y)).size).toBe(1);
    expect(new Set(firstRow.map(({ width }) => width)).size).toBe(1);

    if (photoCount >= 4) {
      const captionClearance = await page.locator('.photo-card').evaluateAll((cards) => {
        const bounds = cards.map((card) => card.getBoundingClientRect());
        const gaps = bounds.flatMap((card, index) => {
          const nextCard = bounds
            .filter((_, candidateIndex) => candidateIndex !== index)
            .filter((candidate) => Math.abs(candidate.x - card.x) < 1 && candidate.top >= card.bottom)
            .sort((a, b) => a.top - b.top)[0];

          return nextCard ? [nextCard.top - card.bottom] : [];
        });

        return Math.min(...gaps);
      });

      expect(captionClearance).toBeGreaterThanOrEqual(30);
    }
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
  await mockImages(page);
  await page.goto('/?issue=2026-01');

  const lastImage = page.locator('.photo-card img').last();
  await expect(lastImage).not.toHaveAttribute('src', /.+/);
  await expect(lastImage).toHaveAttribute('data-src', /^https:\/\//);

  await lastImage.scrollIntoViewIfNeeded();

  await expect(lastImage).toHaveAttribute('src', /^https:\/\//);
  await expect(lastImage).not.toHaveAttribute('data-src');
  await expect(lastImage.locator('..').locator('..')).toHaveClass(/is-loaded/);
});

test('opens the latest issue and navigates between stable issue URLs', async ({ page }) => {
  await mockImages(page);
  await page.goto('/');

  await expect(page).toHaveTitle('PHOTO B — Issue 03 / 2026');
  await expect(page.locator('#issue-label')).toContainText('ISSUE 03 — 2026');
  await expect(page.locator('.photo-card')).toHaveCount(6);
  await expect(page.locator('#next-issue')).toHaveAttribute('aria-disabled', 'true');

  await page.locator('#previous-issue').click();
  await expect(page).toHaveURL(/\?issue=2026-02$/);
  await expect(page.locator('#issue-label')).toContainText('ISSUE 02 — 2026');
  await expect(page.locator('.photo-card')).toHaveCount(6);

  await page.locator('#previous-issue').click();
  await expect(page).toHaveURL(/\?issue=2026-01$/);
  await expect(page.locator('#issue-label')).toContainText('ISSUE 01 — 2026');
  await expect(page.locator('.photo-card')).toHaveCount(19);
  await expect(page.locator('#previous-issue')).toHaveAttribute('aria-disabled', 'true');
});

test('requests photographs only from the selected issue', async ({ page }) => {
  const requestedImages: string[] = [];
  await mockImages(page, (url) => requestedImages.push(url));
  await page.goto('/?issue=2026-02');
  await expect(page.locator('.photo-card').first()).toHaveClass(/is-loaded/);

  expect(requestedImages.length).toBeGreaterThan(0);
  expect(requestedImages.every((url) => url.includes('photo-b-2026-02'))).toBe(true);
});

test('renders the collections archive and opens an issue', async ({ page }) => {
  await mockImages(page);
  await page.goto('/?view=collections');

  await expect(page).toHaveTitle('PHOTO B — Collections');
  await expect(page.getByRole('heading', { name: 'COLLECTIONS' })).toBeVisible();
  await expect(page.locator('#collections-link')).toHaveAttribute('aria-current', 'page');
  await expect(page.locator('.collection-card')).toHaveCount(3);
  await expect(page.locator('.collection-card').first()).toContainText('ISSUE 03 — 2026');
  await expect(page.locator('.collection-card').first()).toContainText('LATEST');
  await expect(page.locator('#view-status')).toBeHidden();

  const dimensions = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
  }));
  expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport + 1);

  await page.locator('.collection-card__link').nth(1).click();
  await expect(page).toHaveURL(/\?issue=2026-02$/);
  await expect(page.locator('#issue-label')).toContainText('ISSUE 02 — 2026');
});

test('renders the typographic about page without requesting gallery photos', async ({ page }) => {
  const requestedImages: string[] = [];
  await mockImages(page, (url) => requestedImages.push(url));
  await page.goto('/?view=about');

  await expect(page).toHaveTitle('PHOTO B — About');
  await expect(page.getByRole('heading', { name: 'PHOTOS I LIKE.' })).toBeVisible();
  await expect(page.locator('.about-page__lead')).toContainText('simply photos I like');
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

test('opens and closes the touch-friendly lightbox', async ({ page }) => {
  await mockImages(page);
  await page.goto('/');
  await page.locator('.photo-card__media').first().click();
  const photoCount = await page.locator('.photo-card').count();

  await expect(page.locator('.glightbox-container')).toBeVisible();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#view-count')).toHaveText(`VIEW 02 / ${String(photoCount).padStart(2, '0')}`);
  await page.keyboard.press('Escape');
  await expect(page.locator('.glightbox-container')).toBeHidden();
});

test('keeps the layout stable when an external image fails', async ({ page }) => {
  await mockImages(page);
  await page.goto('/');

  const firstCard = page.locator('.photo-card').first();
  const photoCount = await page.locator('.photo-card').count();
  await expect(firstCard).toHaveClass(/is-loaded/);
  await firstCard.locator('img').evaluate((image) => image.dispatchEvent(new Event('error')));
  await expect(firstCard).toHaveClass(/is-error/);
  await expect(firstCard.locator('.photo-card__media')).toHaveAttribute('aria-disabled', 'true');
  await expect(page.locator('.photo-card')).toHaveCount(photoCount);
});
