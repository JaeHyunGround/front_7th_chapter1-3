import fs from 'fs';
import path from 'path';

import { test, expect } from '@playwright/test';

test.describe('기본 일정 워크플로우', () => {
  test.beforeEach(async ({ page }) => {
    const rootDir = process.cwd();
    const mockDir = path.join(rootDir, 'src', '__mocks__', 'response');
    const dbPath = path.join(mockDir, 'e2e.json');
    const seedPath = path.join(mockDir, 'e2e-default.json');
    fs.copyFileSync(seedPath, dbPath);
    await page.goto('/');
  });

  test('새로운 일정을 추가한다.', async ({ page }) => {
    await expect(page.getByRole('heading', { name: '일정 추가' })).toBeVisible();

    await page.getByText('제목').click();
    await page.getByRole('textbox', { name: '제목' }).fill('축구');
    await page.getByRole('textbox', { name: '날짜' }).fill('2025-11-21');
    await page.getByRole('textbox', { name: '시작 시간' }).fill('20:00');
    await page.getByRole('textbox', { name: '종료 시간' }).fill('21:00');
    await page.getByRole('textbox', { name: '설명' }).fill('운동');
    await page.getByRole('textbox', { name: '위치' }).fill('축구장');
    await page.getByLabel('카테고리').click();
    await page.getByRole('option', { name: '업무' }).click();
    await page.getByTestId('event-submit-button').click();

    await expect(page.getByText('일정이 추가되었습니다')).toBeVisible();
    await expect(page.getByTestId('month-view').getByText('축구')).toBeVisible();
  });

  test('기존 일정을 수정하면 변경사항이 반영된다.', async ({ page }) => {
    const editButtons = page.getByLabel('Edit event');
    await editButtons.first().waitFor({ state: 'visible' });

    await editButtons.first().click();
    await page.getByRole('textbox', { name: '제목' }).fill('수정된 팀 회의');
    await page.getByRole('textbox', { name: '설명' }).fill('주간 팀 미팅 수정');
    await page.getByRole('textbox', { name: '위치' }).fill('회의실 C');
    await page.getByTestId('event-submit-button').click();

    await expect(page.getByText('일정이 수정되었습니다')).toBeVisible();
    await expect(page.getByTestId('event-list').getByText('수정된 팀 회의')).toBeVisible();
  });

  test('일정을 삭제한다.', async ({ page }) => {
    const eventTitle = page.getByText('팀 회의').first();
    const deleteButtons = page.getByLabel('Delete event');
    await deleteButtons.first().waitFor({ state: 'visible' });

    await deleteButtons.first().click();

    await expect(page.getByText('일정이 삭제되었습니다')).toBeVisible();
    await expect(eventTitle).not.toBeVisible();
  });
});
