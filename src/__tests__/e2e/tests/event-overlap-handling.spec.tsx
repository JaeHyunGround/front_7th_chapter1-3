import fs from 'fs';
import path from 'path';

import { test, expect } from '@playwright/test';

test.describe('일정 겹침 처리 방식 검증', () => {
  test.beforeEach(async ({ page }) => {
    const rootDir = process.cwd();
    const mockDir = path.join(rootDir, 'src', '__mocks__', 'response');
    const dbPath = path.join(mockDir, 'e2e.json');
    const seedPath = path.join(mockDir, 'e2e-default.json');
    fs.copyFileSync(seedPath, dbPath);
    await page.goto('/');
  });

  test('일정 생성 시 겹치는 일정이 있으면, 경고 다이얼로그가 표시된다.', async ({ page }) => {
    // 겹치는 일정 생성
    await page.getByText('제목').click();
    await page.getByRole('textbox', { name: '제목' }).fill('축구');
    await page.getByRole('textbox', { name: '날짜' }).fill('2025-11-20');
    await page.getByRole('textbox', { name: '시작 시간' }).fill('10:00');
    await page.getByRole('textbox', { name: '종료 시간' }).fill('12:00');
    await page.getByRole('textbox', { name: '설명' }).fill('운동');
    await page.getByRole('textbox', { name: '위치' }).fill('축구장');
    await page.getByTestId('event-submit-button').click();

    expect(page.getByRole('heading', { name: '일정 겹침 경고' })).toBeVisible();
  });

  test('일정 생성 시 경고 다이얼로그에서 "계속 진행"을 선택하면 일정이 추가된다', async ({
    page,
  }) => {
    // 겹치는 일정 생성
    await page.getByText('제목').click();
    await page.getByRole('textbox', { name: '제목' }).fill('겹치는 일정 추가');
    await page.getByRole('textbox', { name: '날짜' }).fill('2025-11-20');
    await page.getByRole('textbox', { name: '시작 시간' }).fill('10:00');
    await page.getByRole('textbox', { name: '종료 시간' }).fill('12:00');
    await page.getByRole('textbox', { name: '설명' }).fill('운동');
    await page.getByRole('textbox', { name: '위치' }).fill('축구장');
    await page.getByTestId('event-submit-button').click();

    expect(page.getByRole('heading', { name: '일정 겹침 경고' })).toBeVisible();
    await page.getByRole('button', { name: '계속 진행' }).click();

    expect(page.getByText('일정이 추가되었습니다')).toBeVisible();
    expect(page.getByText('겹치는 일정 추가').first()).toBeVisible();
  });

  test('일정 생성 시 경고 다이얼로그에서 "취소"을 선택하면 일정이 추가되지 않는다', async ({
    page,
  }) => {
    // 겹치는 일정 생성
    await page.getByText('제목').click();
    await page.getByRole('textbox', { name: '제목' }).fill('겹치는 일정 추가');
    await page.getByRole('textbox', { name: '날짜' }).fill('2025-11-20');
    await page.getByRole('textbox', { name: '시작 시간' }).fill('10:00');
    await page.getByRole('textbox', { name: '종료 시간' }).fill('12:00');
    await page.getByRole('textbox', { name: '설명' }).fill('운동');
    await page.getByRole('textbox', { name: '위치' }).fill('축구장');
    await page.getByTestId('event-submit-button').click();

    expect(page.getByRole('heading', { name: '일정 겹침 경고' })).toBeVisible();
    await page.getByRole('button', { name: '취소' }).click();

    expect(page.getByText('겹치는 일정 추가')).not.toBeVisible();
  });

  test('일정 수정 시 겹치는 일정이 있으면, 경고 다이얼로그가 표시된다.', async ({ page }) => {
    const editButtons = page.getByLabel('Edit event');
    await editButtons.first().waitFor({ state: 'visible' });

    await editButtons.first().click();

    await page.getByLabel('날짜').fill('2025-11-08');
    await page.getByLabel('시작 시간').fill('09:30');
    await page.getByLabel('종료 시간').fill('15:30');

    await page.getByTestId('event-submit-button').click();

    expect(page.getByRole('heading', { name: '일정 겹침 경고' })).toBeVisible();
  });

  test('일정 수정 시 경고 다이얼로그에서 "계속 진행"을 선택하면 일정이 추가된다', async ({
    page,
  }) => {
    const editButtons = page.getByLabel('Edit event');
    await editButtons.first().waitFor({ state: 'visible' });

    await editButtons.first().click();

    await page.getByLabel('제목').fill('겹치는 일정 수정');
    await page.getByLabel('날짜').fill('2025-11-08');
    await page.getByLabel('시작 시간').fill('09:30');
    await page.getByLabel('종료 시간').fill('15:30');

    await page.getByTestId('event-submit-button').click();

    expect(page.getByRole('heading', { name: '일정 겹침 경고' })).toBeVisible();

    await page.getByRole('button', { name: '계속 진행' }).click();

    expect(page.getByText('일정이 수정되었습니다')).toBeVisible();
    await expect(page.getByText('겹치는 일정 수정2025-11-0809:30 - 15:30')).toBeVisible();
  });

  test('일정 수정 시 경고 다이얼로그에서 "취소"을 선택하면 일정이 수정되지 않는다', async ({
    page,
  }) => {
    const editButtons = page.getByLabel('Edit event');
    await editButtons.first().waitFor({ state: 'visible' });

    await editButtons.first().click();

    await page.getByLabel('제목').fill('겹치는 일정 수정');
    await page.getByLabel('날짜').fill('2025-11-08');
    await page.getByLabel('시작 시간').fill('09:30');
    await page.getByLabel('종료 시간').fill('15:30');

    await page.getByTestId('event-submit-button').click();

    expect(page.getByRole('heading', { name: '일정 겹침 경고' })).toBeVisible();

    await page.getByRole('button', { name: '취소' }).click();

    await expect(page.getByText('겹치는 일정 수정2025-11-0809:30 - 15:30')).not.toBeVisible();
  });
});
