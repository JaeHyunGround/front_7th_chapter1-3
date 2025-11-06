import fs from 'fs';
import path from 'path';

import { test, expect } from '@playwright/test';

test.describe('알림 시스템 관련 노출 조건 검증', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      let fixedTime = new Date('2025-11-20T13:00:00').getTime();

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

  test('알림 시간이 되면, 알림 메시지가 표시된다.', async ({ page }) => {
    await page.getByText('제목').click();
    await page.getByRole('textbox', { name: '제목' }).fill('축구');
    await page.getByRole('textbox', { name: '날짜' }).fill('2025-11-20');
    await page.getByRole('textbox', { name: '시작 시간' }).fill('13:10'); // 13:00 기준 10분 뒤의 일정 생성
    await page.getByRole('textbox', { name: '종료 시간' }).fill('16:00');
    await page.getByRole('textbox', { name: '설명' }).fill('운동');
    await page.getByRole('textbox', { name: '위치' }).fill('축구장');
    await page.getByRole('combobox', { name: '분 전' }).click();
    await page.getByRole('option', { name: '10-option' }).click(); // 10분 전 알람 설정
    await page.getByTestId('event-submit-button').click();

    await page.getByText('10분 후 축구 일정이 시작됩니다.').waitFor({ state: 'visible' });
    expect(page.getByText('10분 후 축구 일정이 시작됩니다.')).toBeVisible();
  });
});
