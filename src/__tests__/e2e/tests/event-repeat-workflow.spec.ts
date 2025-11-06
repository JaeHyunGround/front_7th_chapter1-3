import fs from 'fs';
import path from 'path';

import { test, expect } from '@playwright/test';

test.describe('반복 일정 워크플로우', () => {
  test.beforeEach(async ({ page }) => {
    const rootDir = process.cwd();
    const mockDir = path.join(rootDir, 'src', '__mocks__', 'response');
    const dbPath = path.join(mockDir, 'e2e.json');
    const seedPath = path.join(mockDir, 'e2e-default.json');
    fs.copyFileSync(seedPath, dbPath);
    await page.goto('/');
  });

  test('새로운 매주 반복 일정을 추가한다.', async ({ page }) => {
    await expect(page.getByRole('heading', { name: '일정 추가' })).toBeVisible();

    await page.getByText('제목').click();
    await page.getByRole('textbox', { name: '제목' }).fill('매주 회의');
    await page.getByRole('textbox', { name: '날짜' }).fill('2025-11-21');
    await page.getByRole('textbox', { name: '시작 시간' }).fill('20:00');
    await page.getByRole('textbox', { name: '종료 시간' }).fill('21:00');
    await page.getByRole('textbox', { name: '설명' }).fill('매주 정기 회의');
    await page.getByRole('textbox', { name: '위치' }).fill('소회의실');
    await page.getByLabel('카테고리').click();
    await page.getByRole('option', { name: '업무-option' }).click();
    await page.getByRole('checkbox', { name: '반복 일정' }).check();
    await page.getByRole('combobox', { name: '매일' }).click();
    await page.getByRole('option', { name: 'weekly-option' }).click();

    const intervalInput = page.getByLabel('반복 간격');
    await intervalInput.clear();
    await intervalInput.fill('1');

    await page.getByLabel('반복 종료일').fill('2025-11-24');

    await page.getByTestId('event-submit-button').click();

    await expect(page.getByText('일정이 추가되었습니다')).toBeVisible();

    const mettingEvents = page.getByText('매주 회의');
    await expect(mettingEvents.first()).toBeVisible();
  });

  test('반복 일정 수정을 시도할 때, 반복 일정 수정 다이얼로그가 나타난다.', async ({ page }) => {
    const editButtons = page.getByLabel('Edit event');
    await editButtons.nth(1).waitFor({ state: 'visible' });

    await editButtons.nth(1).click();

    await expect(page.getByRole('heading', { name: '반복 일정 수정' })).toBeVisible();
    await expect(page.getByText('해당 일정만 수정하시겠어요?')).toBeVisible();
  });

  test('반복 일정을 수정할 때 단일 일정만 수정한다.', async ({ page }) => {
    const targetEvent = page
      .getByTestId('event-list')
      .locator('div')
      .filter({ hasText: '반복일정2025-11-0113:00 - 18:00' })
      .first();
    const editButton = targetEvent.getByRole('button', { name: 'Edit event' });
    await editButton.click();

    // 다이얼로그 출력 확인
    await expect(page.getByRole('heading', { name: '반복 일정 수정' })).toBeVisible();

    // 단일 일정만 수정하는 경우 선택
    await page.getByRole('button', { name: '예' }).click();

    // 제목 수정
    await page.getByRole('textbox', { name: '제목' }).fill('반복 일정 이었던 것');

    await page.getByTestId('event-submit-button').click();

    await expect(page.getByText('반복 일정 이었던 것').first()).toBeVisible();
  });

  test('반복 일정을 수정할 때 모든 일정을 수정한다.', async ({ page }) => {
    const targetEvent = page
      .getByTestId('event-list')
      .locator('div')
      .filter({ hasText: '반복일정2025-11-0113:00 - 18:00' })
      .first();
    const editButton = targetEvent.getByRole('button', { name: 'Edit event' });
    await editButton.click();

    // 다이얼로그 출력 확인
    await expect(page.getByRole('heading', { name: '반복 일정 수정' })).toBeVisible();

    // 모든 일정을 수정하는 경우 선택
    await page.getByRole('button', { name: '아니오' }).click();

    // 위치 수정
    await page.getByRole('textbox', { name: '위치' }).fill('수정된 위치');

    await page.getByTestId('event-submit-button').click();

    await expect(page.getByText('수정된 위치')).toHaveCount(5);
  });

  test('반복 일정을 삭제할 때 단일 일정만 삭제한다.', async ({ page }) => {
    const targetEvent = page
      .getByTestId('event-list')
      .locator('div')
      .filter({ hasText: '반복일정2025-11-0113:00 - 18:00' })
      .first();
    const deleteButton = targetEvent.getByRole('button', { name: 'Delete event' });
    await deleteButton.click();

    await expect(page.getByRole('heading', { name: '반복 일정 삭제' })).toBeVisible();
    await expect(page.getByText('해당 일정만 삭제하시겠어요?')).toBeVisible();

    // 단일 일정 삭제
    await page.getByRole('button', { name: '예' }).click();

    await expect(page.getByText('일정이 삭제되었습니다')).toBeVisible();

    // 반복 일정이 기존에 5개였는데, 1개를 삭제했으므로 4개가 남아있어야 함
    // 반복 일정의 위치는 집
    await expect(page.getByText('집')).toHaveCount(4);
  });

  test('반복 일정을 삭제할 때 모든 일정을 삭제한다.', async ({ page }) => {
    const targetEvent = page
      .getByTestId('event-list')
      .locator('div')
      .filter({ hasText: '반복일정2025-11-0113:00 - 18:00' })
      .first();
    const deleteButton = targetEvent.getByRole('button', { name: 'Delete event' });
    await deleteButton.click();

    await expect(page.getByRole('heading', { name: '반복 일정 삭제' })).toBeVisible();
    await expect(page.getByText('해당 일정만 삭제하시겠어요?')).toBeVisible();

    // 모든 일정 삭제
    await page.getByRole('button', { name: '아니오' }).click();

    await expect(page.getByText('일정이 삭제되었습니다')).toBeVisible();

    await expect(page.getByText('반복일정2025-11-0113:00 - 18:00')).not.toBeVisible();
  });
});
