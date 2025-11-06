import fs from 'fs';
import path from 'path';

import { test, expect } from '@playwright/test';

test.describe('캘린더 날짜 선택 검증', () => {
  test.beforeEach(async ({ page }) => {
    // 날짜를 2025-11-20으로 고정
    await page.addInitScript(() => {
      let fixedTime = new Date('2025-11-20T10:00:00').getTime();

      // 완전한 Date 모킹
      const OriginalDate = window.Date;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const MockedDate = function (this: Date, ...args: any[]) {
        if (args.length === 0) {
          return new OriginalDate(fixedTime);
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return new (OriginalDate as any)(...args);
      } as unknown as typeof Date;

      // Date의 모든 정적 메서드와 프로퍼티 복사
      Object.setPrototypeOf(MockedDate, OriginalDate);
      Object.defineProperty(MockedDate, 'prototype', {
        value: OriginalDate.prototype,
        writable: false,
        enumerable: false,
        configurable: false,
      });

      // Date.now() 오버라이드
      MockedDate.now = () => fixedTime;

      // Date.parse() 유지
      MockedDate.parse = OriginalDate.parse;

      // Date.UTC() 유지
      MockedDate.UTC = OriginalDate.UTC;

      // globalThis에 Date 교체
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).Date = MockedDate;

      // 시간 변경 함수
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).__setNow = (iso: string) => {
        fixedTime = new OriginalDate(iso).getTime();
        // 강제로 이벤트 발생시켜 리렌더링 유도
        window.dispatchEvent(new Event('timechange'));
      };
    });

    const rootDir = process.cwd();
    const mockDir = path.join(rootDir, 'src', '__mocks__', 'response');
    const dbPath = path.join(mockDir, 'e2e.json');
    const seedPath = path.join(mockDir, 'e2e-default.json');
    fs.copyFileSync(seedPath, dbPath);
    await page.goto('/');
  });

  test('월간뷰에서 캘린더 날짜 클릭 시 왼쪽 폼에 날짜가 반영되고, 일정을 추가된다', async ({
    page,
  }) => {
    // Given: 월간 뷰가 표시됨
    const monthView = page.getByTestId('month-view');
    await expect(monthView).toBeVisible();

    // Given: 일정 추가 폼이 표시됨
    await expect(page.getByRole('heading', { name: '일정 추가' })).toBeVisible();

    // When: 캘린더에서 2025-11-21 날짜 셀 클릭
    const dateCell = monthView.getByRole('cell').filter({ hasText: '21' }).first();
    await expect(dateCell).toBeVisible();
    await dateCell.click();

    // Then: 왼쪽 폼의 날짜 필드에 2025-11-21이 반영됨
    const dateInput = page.getByRole('textbox', { name: '날짜' });
    await expect(dateInput).toHaveValue('2025-11-21');

    // When: 나머지 일정 정보 입력
    await page.getByText('제목').click();
    await page.getByRole('textbox', { name: '제목' }).fill('캘린더에서 선택한 일정');
    await page.getByRole('textbox', { name: '시작 시간' }).fill('14:00');
    await page.getByRole('textbox', { name: '종료 시간' }).fill('15:00');
    await page.getByRole('textbox', { name: '설명' }).fill('캘린더 날짜 선택 테스트');
    await page.getByRole('textbox', { name: '위치' }).fill('회의실 C');
    await page.getByTestId('event-submit-button').click();

    // Then: 일정이 추가되었음을 확인
    await expect(page.getByText('일정이 추가되었습니다')).toBeVisible();

    // Then: 캘린더에 추가된 일정이 표시됨
    await expect(monthView.getByText('캘린더에서 선택한 일정')).toBeVisible();
  });

  test('주간뷰에서 캘린더 날짜 클릭 시 왼쪽 폼에 날짜가 반영되고, 일정을 추가한다', async ({
    page,
  }) => {
    // Given: 주간 뷰로 전환
    const viewSelect = page.getByLabel('뷰 타입 선택');
    await viewSelect.click();
    await page.getByRole('option', { name: 'week-option' }).click();

    const weekView = page.getByTestId('week-view');
    await expect(weekView).toBeVisible();

    // Given: 일정 추가 폼이 표시됨
    await expect(page.getByRole('heading', { name: '일정 추가' })).toBeVisible();

    // When: 캘린더에서 2025-11-21 날짜 셀 클릭
    const dateCell = weekView.getByRole('cell').filter({ hasText: '21' }).first();
    await expect(dateCell).toBeVisible();
    await dateCell.click();

    // Then: 왼쪽 폼의 날짜 필드에 2025-11-21이 반영됨
    const dateInput = page.getByRole('textbox', { name: '날짜' });
    await expect(dateInput).toHaveValue('2025-11-21');

    // When: 나머지 일정 정보 입력
    await page.getByText('제목').click();
    await page.getByRole('textbox', { name: '제목' }).fill('주간뷰에서 선택한 일정');
    await page.getByRole('textbox', { name: '시작 시간' }).fill('16:00');
    await page.getByRole('textbox', { name: '종료 시간' }).fill('17:00');
    await page.getByRole('textbox', { name: '설명' }).fill('주간뷰 날짜 선택 테스트');
    await page.getByRole('textbox', { name: '위치' }).fill('회의실 D');
    await page.getByTestId('event-submit-button').click();

    // Then: 일정이 추가되었음을 확인
    await expect(page.getByText('일정이 추가되었습니다')).toBeVisible();

    // Then: 캘린더에 추가된 일정이 표시됨
    await expect(weekView.getByText('주간뷰에서 선택한 일정')).toBeVisible();
  });
});
