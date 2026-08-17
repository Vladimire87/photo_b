import { readdirSync, readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

const galleryImage = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"></svg>',
);
const deletedImagePlaceholder = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" width="130" height="60"></svg>',
);

interface MockImageOptions {
  acceptMaturity?: boolean;
}

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

function latestIssueSlug(): string {
  return readdirSync(new URL('../../src/data/issues', import.meta.url))
    .map((name) => name.match(/^(\d{4}-\d{2})\.txt$/)?.[1])
    .filter((slug): slug is string => Boolean(slug))
    .sort()
    .at(-1)!;
}

function firstIssuePhotoUrl(issueSlug: string): string {
  return readFileSync(
    new URL(`../../src/data/issues/${issueSlug}.txt`, import.meta.url),
    'utf8',
  )
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line !== '' && !line.startsWith('#'))!
    .split('|')[0]
    .trim();
}

async function acceptMaturity(page: Page): Promise<void> {
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem('photo-b-maturity-confirmed', String(Date.now()));
    } catch {
      // Keep the test usable when browser storage is unavailable.
    }
  });
}

async function mockImages(
  page: Page,
  onImageRequest?: (url: string) => void,
  deletedImageUrl?: string,
  options: MockImageOptions = {},
): Promise<void> {
  if (options.acceptMaturity !== false) {
    await acceptMaturity(page);
  }

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

test('shows the mature-content notice before requesting gallery photos', async ({ page }) => {
  const requestedImages: string[] = [];
  await mockImages(page, (url) => requestedImages.push(url), undefined, { acceptMaturity: false });
  await page.goto('/?issue=2026-02');

  const gate = page.getByRole('dialog', { name: /photo b/i });
  await expect(gate).toBeVisible();
  await expect(gate).toContainText('artistic nudity and erotic imagery');
  await expect(page.locator('.photo-card')).toHaveCount(0);
  expect(requestedImages).toEqual([]);
  await expect(page.getByRole('button', { name: /enter photo b/i })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: /leave/i })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: /enter photo b/i })).toBeFocused();

  await page.getByRole('button', { name: /enter photo b/i }).click();
  await expect(gate).toBeHidden();
  await expect(page.locator('.photo-card').first()).toHaveClass(/is-loaded/);
  expect(requestedImages.length).toBeGreaterThan(0);

  await page.reload();
  await expect(page.getByRole('dialog', { name: /photo b/i })).toBeHidden();
  await expect(page.locator('.photo-card').first()).toHaveClass(/is-loaded/);
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

  const latestSlug = latestIssueSlug();
  const firstPhotoUrl = firstIssuePhotoUrl(latestSlug);
  const firstPhotoWidth = new URL(firstPhotoUrl).searchParams.get('width');

  if (firstPhotoWidth) {
    await expect(page.locator('.photo-card img').first()).toHaveAttribute(
      'srcset',
      `${firstPhotoUrl} ${firstPhotoWidth}w`,
    );
  } else {
    await expect(page.locator('.photo-card img').first()).not.toHaveAttribute('srcset', /.+/);
  }

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
      const rowTops = [...new Set(cards.map((card) => Math.round(card.top)))];
      const rowCounts = rowTops.map((top) => cards.filter((card) => Math.abs(card.top - top) < 2).length);
      const occupiedWidth = firstRow.reduce((total, card) => total + card.width, 0);

      return {
        heroRight: Math.round(hero.right),
        firstLeft: Math.round(cards[0].left),
        galleryWidth: Math.round(gallery.width),
        firstWidth: Math.round(cards[0].width),
        firstRowCount: firstRow.length,
        occupiedWidth: Math.round(occupiedWidth),
        rowCounts,
      };
    });

    expect(composition.firstLeft).toBeGreaterThan(composition.heroRight);
    expect(composition.firstRowCount).toBeGreaterThan(1);
    expect(composition.firstWidth).toBeGreaterThan(composition.galleryWidth * 0.25);
    expect(composition.firstWidth).toBeLessThan(composition.galleryWidth * 0.75);
    expect(composition.occupiedWidth).toBeGreaterThan(composition.galleryWidth * 0.9);
    expect(new Set(composition.rowCounts).size).toBeGreaterThan(1);
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

test('keeps mixed aspect ratios visible without forcing the first photo to fill the stage', async ({ page }) => {
  await acceptMaturity(page);

  const dimensions = [
    { marker: 'jlm5t449d8fh1', width: 800, height: 1200 },
    { marker: 'charleen-weiss', width: 1400, height: 700 },
  ];

  await page.route('https://**/*', async (route) => {
    if (route.request().resourceType() === 'image') {
      const dimension = dimensions.find(({ marker }) => route.request().url().includes(marker))
        ?? { width: 900, height: 900 };
      await route.fulfill({
        status: 200,
        contentType: 'image/svg+xml',
        headers: { 'cache-control': 'no-store' },
        body: `<svg xmlns="http://www.w3.org/2000/svg" width="${dimension.width}" height="${dimension.height}"></svg>`,
      });
      return;
    }

    await route.continue();
  });

  await page.goto('/');
  await expect(page.locator('.photo-card').first()).toHaveClass(/is-loaded/);
  await expect(page.locator('.photo-card').nth(1)).toHaveClass(/is-loaded/);

  const composition = await page.evaluate(() => {
    const gallery = document.querySelector('#gallery')!.getBoundingClientRect();
    const cards = [...document.querySelectorAll('.photo-card')]
      .slice(0, 2)
      .map((card) => card.getBoundingClientRect());

    return {
      galleryLeft: gallery.left,
      galleryRight: gallery.right,
      first: cards[0],
      second: cards[1],
      firstMediaHeight: document.querySelector('.photo-card__media')!.getBoundingClientRect().height,
      secondMediaHeight: document.querySelectorAll('.photo-card__media')[1]!.getBoundingClientRect().height,
      overflow: document.documentElement.scrollWidth - window.innerWidth,
    };
  });

  if (page.viewportSize()!.width > 680) {
    expect(composition.first.width).toBeLessThan(
      (composition.galleryRight - composition.galleryLeft) * 0.4,
    );
    expect(composition.first.left).toBeGreaterThanOrEqual(composition.galleryLeft - 1);
    expect(composition.second.width).toBeGreaterThan(
      (composition.galleryRight - composition.galleryLeft) * 0.9,
    );
    expect(composition.second.top).toBeGreaterThan(composition.first.top);
    expect(
      Math.abs(composition.secondMediaHeight - composition.second.width / 2),
    ).toBeLessThanOrEqual(3);
  } else {
    expect(composition.first.width).toBeGreaterThanOrEqual(page.viewportSize()!.width - 1);
    expect(composition.firstMediaHeight).toBeGreaterThan(composition.first.width * 1.3);
  }

  expect(composition.overflow).toBeLessThanOrEqual(1);
});

test('keeps a wide first photograph from overflowing its solo row', async ({ page }) => {
  await page.setViewportSize({ width: 700, height: 800 });
  await acceptMaturity(page);

  await page.route('https://**/*', async (route) => {
    if (route.request().resourceType() === 'image') {
      await route.fulfill({
        status: 200,
        contentType: 'image/svg+xml',
        headers: { 'cache-control': 'no-store' },
        body: '<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="700"></svg>',
      });
      return;
    }

    await route.continue();
  });

  await page.goto('/');
  await expect(page.locator('.photo-card').first()).toHaveClass(/is-loaded/);

  const dimensions = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
  }));

  expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport + 1);
});

test('fills the row that a wide feature photograph interrupts', async ({ page, isMobile }) => {
  test.skip(isMobile, 'The masonry gallery layout only applies on desktop.');
  await page.setViewportSize({ width: 1728, height: 1117 });
  await acceptMaturity(page);

  const dimensionsByMarker: Record<string, [number, number]> = {
    'pbxnq8x2njdh1': [0, 0],
    'charleen-weiss': [1080, 1440],
    'inde-navarrette': [794, 1140],
    'yB1ny0WT4LQUZ0A1bJaPD6hAp1jD': [640, 758],
    'sisse-marie': [640, 960],
    'anastasiia': [640, 960],
    'sara-sampaio': [640, 399],
  };

  await page.route('https://**/*', async (route) => {
    if (route.request().resourceType() === 'image') {
      const url = route.request().url();
      const marker = Object.keys(dimensionsByMarker).find((key) => url.includes(key));

      if (marker === 'pbxnq8x2njdh1') {
        await route.fulfill({
          status: 404,
          contentType: 'image/svg+xml',
          body: deletedImagePlaceholder,
        });
        return;
      }

      const [width, height] = marker ? dimensionsByMarker[marker] : [640, 960];
      await route.fulfill({
        status: 200,
        contentType: 'image/svg+xml',
        headers: { 'cache-control': 'no-store' },
        body: `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"></svg>`,
      });
      return;
    }

    await route.continue();
  });

  await page.goto('/?issue=2026-02');
  await expect(page.locator('.photo-card').first()).toHaveClass(/is-loaded/);

  const row = await page.evaluate(() => {
    const gallery = document.querySelector('#gallery')!.getBoundingClientRect();
    const cards = [...document.querySelectorAll<HTMLElement>('.photo-card')];
    const sisse = cards.find((card) => card.dataset.caption === 'Sisse Marie')!;
    const anastasiia = cards.find((card) => card.dataset.caption === 'Anastasiia')!;
    const sisseBounds = sisse.getBoundingClientRect();
    const anastasiiaBounds = anastasiia.getBoundingClientRect();

    return {
      sameRow: Math.abs(sisseBounds.top - anastasiiaBounds.top) < 2,
      span: Math.max(sisseBounds.right, anastasiiaBounds.right)
        - Math.min(sisseBounds.left, anastasiiaBounds.left),
      galleryWidth: gallery.width,
      sisseWidth: sisseBounds.width,
      anastasiiaWidth: anastasiiaBounds.width,
    };
  });

  expect(row.sameRow).toBe(true);
  expect(row.span).toBeGreaterThan(row.galleryWidth * 0.9);
  expect(row.sisseWidth).toBeGreaterThan(row.galleryWidth * 0.4);
  expect(row.anastasiiaWidth).toBeGreaterThan(row.galleryWidth * 0.4);
});

test('keeps a wide feature photograph within the viewport on ultra-wide screens', async ({ page }) => {
  await page.setViewportSize({ width: 3440, height: 1440 });
  await acceptMaturity(page);

  await page.route('https://**/*', async (route) => {
    if (route.request().resourceType() === 'image') {
      await route.fulfill({
        status: 200,
        contentType: 'image/svg+xml',
        headers: { 'cache-control': 'no-store' },
        body: '<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="1000"></svg>',
      });
      return;
    }

    await route.continue();
  });

  await page.goto('/');
  await expect(page.locator('.photo-card').first()).toHaveClass(/is-loaded/);

  const featureMetrics = await page.evaluate(() => {
    const gallery = document.querySelector('#gallery')!.getBoundingClientRect();
    const card = document.querySelector<HTMLElement>('.photo-card.is-feature')!;
    const bounds = card.getBoundingClientRect();

    return {
      height: bounds.height,
      left: bounds.left,
      right: bounds.right,
      galleryLeft: gallery.left,
      galleryRight: gallery.right,
      viewportHeight: window.innerHeight,
      overflow: document.documentElement.scrollWidth - window.innerWidth,
    };
  });

  expect(featureMetrics.height).toBeLessThanOrEqual(featureMetrics.viewportHeight);
  expect(featureMetrics.left).toBeGreaterThanOrEqual(featureMetrics.galleryLeft - 1);
  expect(featureMetrics.right).toBeLessThanOrEqual(featureMetrics.galleryRight + 1);
  expect(featureMetrics.overflow).toBeLessThanOrEqual(1);
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
  await expect.poll(
    () => requestedImages.some((url) => new URL(url).pathname === lastImagePath),
  ).toBe(true);
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

test('keeps gallery images still on hover while the projector lamp brightens them', async ({ page }) => {
  await mockImages(page);
  await page.goto('/');

  const galleryImage = page.locator('.photo-card__media img').first();
  await expect(galleryImage.locator('..').locator('..')).toHaveClass(/is-loaded/);
  const galleryStyleBeforeHover = await galleryImage.evaluate((image) => {
    const styles = getComputedStyle(image);
    return { filter: styles.filter, transform: styles.transform };
  });
  const canHover = await page.evaluate(() => window.matchMedia('(hover: hover)').matches);
  await galleryImage.locator('..').hover();

  if (canHover) {
    await expect.poll(
      () => galleryImage.evaluate((image) => getComputedStyle(image).filter),
    ).toBe('brightness(1.08)');
    const galleryStyleAfterHover = await galleryImage.evaluate((image) => {
      const styles = getComputedStyle(image);
      return { transform: styles.transform };
    });
    expect(galleryStyleAfterHover.transform).toBe(galleryStyleBeforeHover.transform);
  } else {
    const galleryStyleAfterHover = await galleryImage.evaluate((image) => {
      const styles = getComputedStyle(image);
      return { filter: styles.filter, transform: styles.transform };
    });
    expect(galleryStyleAfterHover).toEqual(galleryStyleBeforeHover);
  }

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

test('keeps editorial type from breaking words at narrow widths', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await acceptMaturity(page);
  await page.goto('/?view=about');

  const aboutTypography = await page.locator('.about-page__hero h1').evaluate((element) => {
    const textNode = element.firstChild;
    const lineByCharacter = new Map<number, string>();

    if (textNode?.nodeType === Node.TEXT_NODE) {
      for (let index = 0; index < textNode.textContent!.length; index += 1) {
        const range = document.createRange();
        range.setStart(textNode, index);
        range.setEnd(textNode, index + 1);
        const line = Math.round(range.getBoundingClientRect().top);
        lineByCharacter.set(line, `${lineByCharacter.get(line) ?? ''}${textNode.textContent![index]}`);
      }
    }

    const bounds = element.getBoundingClientRect();
    return {
      lines: [...lineByCharacter.values()].map((line) => line.trim()),
      scrollWidth: element.scrollWidth,
      width: bounds.width,
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    };
  });

  expect(aboutTypography.lines).toEqual(['A personal', 'collection.']);
  expect(aboutTypography.scrollWidth).toBeLessThanOrEqual(aboutTypography.width + 1);
  expect(aboutTypography.documentWidth).toBeLessThanOrEqual(aboutTypography.viewportWidth + 1);

  await page.goto('/?view=collections');
  const collectionIssue = page.locator('.collection-card__issue').first();
  await expect(collectionIssue).toBeVisible();

  const issueLineCount = await collectionIssue.evaluate((element) => {
    const textNode = element.firstChild;
    const lineTops = new Set<number>();

    if (textNode?.nodeType === Node.TEXT_NODE) {
      for (let index = 0; index < textNode.textContent!.length; index += 1) {
        const range = document.createRange();
        range.setStart(textNode, index);
        range.setEnd(textNode, index + 1);
        lineTops.add(Math.round(range.getBoundingClientRect().top));
      }
    }

    return lineTops.size;
  });

  expect(issueLineCount).toBe(1);
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

  const issueLabel = await page.locator('#issue-label').evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }));
  expect(issueLabel.scrollWidth).toBeLessThanOrEqual(issueLabel.clientWidth + 1);
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

test('keeps a failed photo frame in place with stable numbering', async ({ page }) => {
  await mockImages(page);
  await page.goto('/');

  const firstCard = page.locator('.photo-card').first();
  const photoCount = await page.locator('.photo-card').count();
  await expect(firstCard).toHaveClass(/is-loaded/);
  await firstCard.locator('img').evaluate((image) => image.dispatchEvent(new Event('error')));
  await expect(firstCard).toHaveClass(/is-error/);
  await expect(firstCard.locator('.photo-card__media')).not.toHaveAttribute('href', /.+/);
  const failedMediaContent = await firstCard.locator('.photo-card__media').evaluate(
    (media) => getComputedStyle(media, '::after').content,
  );
  expect(failedMediaContent).toContain('FRAME UNAVAILABLE');
  await expect(page.locator('.photo-card')).toHaveCount(photoCount);
  await expect(page.locator('.photo-card').first().locator('.photo-card__number')).toHaveText('01');
  await expect(page.locator('.photo-card').nth(1).locator('.photo-card__number')).toHaveText('02');
  await expect(page.locator('#view-count')).toHaveText(
    `PHOTO 01 / ${String(photoCount).padStart(2, '0')}`,
  );

  await page.locator('.photo-card__media').nth(1).click();
  await expect(page.locator('.glightbox-container')).toBeVisible();
  await expect(page.locator('.glightbox-container .gslide')).toHaveCount(photoCount - 1);
});

test('keeps a deletion placeholder frame in place with an error notice', async ({ page }) => {
  const deletedUrl = 'pbxnq8x2njdh1.jpeg';
  const expectedPhotoCount = countIssuePhotos('2026-01');
  await mockImages(page, undefined, deletedUrl);
  await page.goto('/?issue=2026-01');

  await expect(page.locator(`img[src*="${deletedUrl}"]`)).toHaveCount(1);
  await expect(page.locator('.photo-card')).toHaveCount(expectedPhotoCount);
  const failedCard = page.locator(`.photo-card:has(img[src*="${deletedUrl}"])`);
  await expect(failedCard).toHaveClass(/is-error/);
  await expect(page.locator('#view-count')).toHaveText(
    `PHOTO 01 / ${String(expectedPhotoCount).padStart(2, '0')}`,
  );
});
