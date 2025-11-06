import fs from 'fs';
import path from 'path';

import { test, expect } from '@playwright/test';

test.describe('검색 및 필터링 검증', () => {
  test.beforeEach(async ({ page }) => {
    const rootDir = process.cwd();
    const mockDir = path.join(rootDir, 'src', '__mocks__', 'response');
    const dbPath = path.join(mockDir, 'e2e.json');
    const seedPath = path.join(mockDir, 'e2e-default.json');
    fs.copyFileSync(seedPath, dbPath);
    await page.goto('/');
  });

  test('검색어를 입력하면, 해당 검색어와 일치하는 일정만 표시된다.', async ({ page }) => {
    await page.getByRole('textbox', { name: '일정 검색' }).click();
    await page.getByRole('textbox', { name: '일정 검색' }).fill('팀');

    const eventList = page.getByTestId('event-list');
    const events = eventList.locator('button[aria-label="Edit event"]');
    await expect(events).toHaveCount(1); // 일정 목록 에서 팀 회의는 1개뿐
  });

  test('일치하는 검색어가 없으면 "검색 결과가 없습니다."가 표시된다.', async ({ page }) => {
    await page.getByRole('textbox', { name: '일정 검색' }).click();
    await page.getByRole('textbox', { name: '일정 검색' }).fill('연관 없는 검색어');

    await expect(page.getByText('검색 결과가 없습니다')).toBeVisible();
  });
});
