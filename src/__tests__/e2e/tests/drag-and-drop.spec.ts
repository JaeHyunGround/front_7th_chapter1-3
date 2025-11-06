import fs from 'fs';
import path from 'path';

import { test, expect } from '@playwright/test';

test.describe('드래그 앤 드롭 검증', () => {
  test.beforeEach(async ({ page }) => {
    // 날짜를 2025-11-20으로 고정 (팀 회의 일정이 있는 날짜)
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

  test('월간 뷰에서 D&D로 일정을 옮기면, 성공 스낵바가 뜨고, 일정이 수정된다.', async ({
    page,
  }) => {
    // Given: 월간 뷰에 "팀 회의" 일정이 2025-11-20에 존재
    const monthView = page.getByTestId('month-view');
    await expect(monthView).toBeVisible();

    // 2025-11-20 날짜 셀에서 "팀 회의" 일정 찾기
    const sourceDateCell = monthView.getByRole('cell').filter({ hasText: '20' }).first();
    await expect(sourceDateCell).toBeVisible();

    // 드래그 가능한 요소 찾기 (EventCell의 Box 요소)
    const draggableElement = sourceDateCell
      .locator('[draggable="true"]')
      .filter({ hasText: '팀 회의' })
      .first();
    await expect(draggableElement).toBeVisible();

    // When: "팀 회의" 일정을 2025-11-21 날짜 셀로 드래그 앤 드롭
    const targetDateCell = monthView.getByRole('cell').filter({ hasText: '21' }).first();
    await expect(targetDateCell).toBeVisible();

    // page.evaluate를 사용하여 실제 드래그 앤 드롭 이벤트 발생
    // 요소를 직접 찾기 위해 고유한 속성 사용
    await page.evaluate(
      ([eventId]) => {
        // 드래그 가능한 요소 찾기 (팀 회의 일정)
        const monthView = document.querySelector('[data-testid="month-view"]');
        if (!monthView) {
          throw new Error('Month view not found');
        }

        // 20일 셀에서 "팀 회의" 텍스트를 포함한 draggable 요소 찾기
        const cells = monthView.querySelectorAll('[role="cell"]');
        let draggableElement: HTMLElement | null = null;

        for (const cell of cells) {
          const dayText = cell.textContent;
          if (dayText && dayText.includes('20')) {
            // 해당 셀 내에서 draggable 요소 찾기
            const draggable = cell.querySelector('[draggable="true"]') as HTMLElement;
            if (draggable && draggable.textContent?.includes('팀 회의')) {
              draggableElement = draggable;
              break;
            }
          }
        }

        if (!draggableElement) {
          throw new Error('Draggable element not found');
        }

        // 21일 셀 찾기
        let targetCell: HTMLElement | null = null;
        for (const cell of cells) {
          const dayText = cell.textContent;
          if (dayText && dayText.includes('21') && !dayText.includes('팀 회의')) {
            targetCell = cell as HTMLElement;
            break;
          }
        }

        if (!targetCell) {
          throw new Error('Target cell not found');
        }

        // DataTransfer 객체 생성
        const dataTransfer = new DataTransfer();
        dataTransfer.setData('text/plain', eventId as string);
        dataTransfer.effectAllowed = 'move';

        // dragstart 이벤트 발생 (draggableElement에서)
        const dragStartEvent = new DragEvent('dragstart', {
          bubbles: true,
          cancelable: true,
          dataTransfer,
        });
        draggableElement.dispatchEvent(dragStartEvent);

        // dragover 이벤트 발생 (targetCell에서)
        const dragOverEvent = new DragEvent('dragover', {
          bubbles: true,
          cancelable: true,
          dataTransfer,
        });
        dragOverEvent.preventDefault();
        targetCell.dispatchEvent(dragOverEvent);

        // drop 이벤트 발생 (targetCell에서)
        // React의 onDrop 핸들러가 자동으로 호출되며, dateString은 클로저에 의해 캡처됨
        const dropEvent = new DragEvent('drop', {
          bubbles: true,
          cancelable: true,
          dataTransfer,
        });
        dropEvent.preventDefault();
        targetCell.dispatchEvent(dropEvent);
      },
      ['2b7545a6-ebee-426c-b906-2329bc8d62bd']
    );

    // Then: 성공 스낵바가 표시됨
    await expect(page.getByText('일정이 이동되었습니다')).toBeVisible({ timeout: 10000 });

    // Then: 일정이 새로운 날짜(2025-11-21)로 이동했는지 확인
    await expect(targetDateCell.getByText('팀 회의')).toBeVisible({ timeout: 10000 });
  });

  test('주간 뷰에서 D&D로 일정을 옮기면, 성공 스낵바가 뜨고, 일정이 수정된다.', async ({
    page,
  }) => {
    // Given: 주간 뷰로 전환
    const viewSelect = page.getByLabel('뷰 타입 선택');
    await viewSelect.click();
    await page.getByRole('option', { name: 'week-option' }).click();

    const weekView = page.getByTestId('week-view');
    await expect(weekView).toBeVisible();

    // 2025-11-20 날짜 셀에서 "팀 회의" 일정 찾기
    const sourceDateCell = weekView.getByRole('cell').filter({ hasText: '20' }).first();
    await expect(sourceDateCell).toBeVisible();

    // 드래그 가능한 요소 찾기 (EventCell의 Box 요소)
    const draggableElement = sourceDateCell
      .locator('[draggable="true"]')
      .filter({ hasText: '팀 회의' })
      .first();
    await expect(draggableElement).toBeVisible();

    // When: "팀 회의" 일정을 2025-11-21 날짜 셀로 드래그 앤 드롭
    const targetDateCell = weekView.getByRole('cell').filter({ hasText: '21' }).first();
    await expect(targetDateCell).toBeVisible();

    // page.evaluate를 사용하여 실제 드래그 앤 드롭 이벤트 발생
    // 요소를 직접 찾기 위해 고유한 속성 사용
    await page.evaluate(
      ([eventId]) => {
        // 드래그 가능한 요소 찾기 (팀 회의 일정)
        const weekView = document.querySelector('[data-testid="week-view"]');
        if (!weekView) {
          throw new Error('Week view not found');
        }

        // 20일 셀에서 "팀 회의" 텍스트를 포함한 draggable 요소 찾기
        const cells = weekView.querySelectorAll('[role="cell"]');
        let draggableElement: HTMLElement | null = null;

        for (const cell of cells) {
          const dayText = cell.textContent;
          if (dayText && dayText.includes('20')) {
            // 해당 셀 내에서 draggable 요소 찾기
            const draggable = cell.querySelector('[draggable="true"]') as HTMLElement;
            if (draggable && draggable.textContent?.includes('팀 회의')) {
              draggableElement = draggable;
              break;
            }
          }
        }

        if (!draggableElement) {
          throw new Error('Draggable element not found');
        }

        // 21일 셀 찾기
        let targetCell: HTMLElement | null = null;
        for (const cell of cells) {
          const dayText = cell.textContent;
          if (dayText && dayText.includes('21') && !dayText.includes('팀 회의')) {
            targetCell = cell as HTMLElement;
            break;
          }
        }

        if (!targetCell) {
          throw new Error('Target cell not found');
        }

        // DataTransfer 객체 생성
        const dataTransfer = new DataTransfer();
        dataTransfer.setData('text/plain', eventId as string);
        dataTransfer.effectAllowed = 'move';

        // dragstart 이벤트 발생 (draggableElement에서)
        const dragStartEvent = new DragEvent('dragstart', {
          bubbles: true,
          cancelable: true,
          dataTransfer,
        });
        draggableElement.dispatchEvent(dragStartEvent);

        // dragover 이벤트 발생 (targetCell에서)
        const dragOverEvent = new DragEvent('dragover', {
          bubbles: true,
          cancelable: true,
          dataTransfer,
        });
        dragOverEvent.preventDefault();
        targetCell.dispatchEvent(dragOverEvent);

        // drop 이벤트 발생 (targetCell에서)
        // React의 onDrop 핸들러가 자동으로 호출되며, dateString은 클로저에 의해 캡처됨
        const dropEvent = new DragEvent('drop', {
          bubbles: true,
          cancelable: true,
          dataTransfer,
        });
        dropEvent.preventDefault();
        targetCell.dispatchEvent(dropEvent);
      },
      ['2b7545a6-ebee-426c-b906-2329bc8d62bd']
    );

    // Then: 성공 스낵바가 표시됨
    await expect(page.getByText('일정이 이동되었습니다')).toBeVisible({ timeout: 10000 });

    // Then: 일정이 새로운 날짜(2025-11-21)로 이동했는지 확인
    await expect(targetDateCell.getByText('팀 회의')).toBeVisible({ timeout: 10000 });
  });

  test('D&D로 겹침일정일 경우 알림이 뜨고, 취소를 선택하면 일정이 이동하지 않는다.', async ({
    page,
  }) => {
    // Given: 겹치는 일정 생성 (2025-11-21 10:00-11:00)
    await page.getByText('제목').click();
    await page.getByRole('textbox', { name: '제목' }).fill('겹치는 일정');
    await page.getByRole('textbox', { name: '날짜' }).fill('2025-11-21');
    await page.getByRole('textbox', { name: '시작 시간' }).fill('10:00');
    await page.getByRole('textbox', { name: '종료 시간' }).fill('11:00');
    await page.getByRole('textbox', { name: '설명' }).fill('겹치는 일정 설명');
    await page.getByRole('textbox', { name: '위치' }).fill('회의실 B');
    await page.getByTestId('event-submit-button').click();

    // 겹침 다이얼로그가 나타나면 계속 진행하여 일정 생성
    const overlapDialog = page.getByRole('heading', { name: '일정 겹침 경고' });
    if (await overlapDialog.isVisible()) {
      await page.getByRole('button', { name: '계속 진행' }).click();
    }

    await expect(page.getByText('일정이 추가되었습니다')).toBeVisible();

    // Given: 월간 뷰에 "팀 회의" 일정이 2025-11-20에 존재
    const monthView = page.getByTestId('month-view');
    await expect(monthView).toBeVisible();

    // 2025-11-20 날짜 셀에서 "팀 회의" 일정 찾기
    const sourceDateCell = monthView.getByRole('cell').filter({ hasText: '20' }).first();
    await expect(sourceDateCell).toBeVisible();

    const draggableElement = sourceDateCell
      .locator('[draggable="true"]')
      .filter({ hasText: '팀 회의' })
      .first();
    await expect(draggableElement).toBeVisible();

    // When: "팀 회의" 일정을 2025-11-21 날짜 셀로 드래그 앤 드롭 (겹치는 일정이 있는 날짜)
    const targetDateCell = monthView.getByRole('cell').filter({ hasText: '21' }).first();
    await expect(targetDateCell).toBeVisible();

    // 드래그 앤 드롭 이벤트 발생
    await page.evaluate(
      ([eventId]) => {
        const monthView = document.querySelector('[data-testid="month-view"]');
        if (!monthView) {
          throw new Error('Month view not found');
        }

        const cells = monthView.querySelectorAll('[role="cell"]');
        let draggableElement: HTMLElement | null = null;

        for (const cell of cells) {
          const dayText = cell.textContent;
          if (dayText && dayText.includes('20')) {
            const draggable = cell.querySelector('[draggable="true"]') as HTMLElement;
            if (draggable && draggable.textContent?.includes('팀 회의')) {
              draggableElement = draggable;
              break;
            }
          }
        }

        if (!draggableElement) {
          throw new Error('Draggable element not found');
        }

        let targetCell: HTMLElement | null = null;
        for (const cell of cells) {
          const dayText = cell.textContent;
          if (dayText && dayText.includes('21')) {
            targetCell = cell as HTMLElement;
            break;
          }
        }

        if (!targetCell) {
          throw new Error('Target cell not found');
        }

        const dataTransfer = new DataTransfer();
        dataTransfer.setData('text/plain', eventId as string);
        dataTransfer.effectAllowed = 'move';

        const dragStartEvent = new DragEvent('dragstart', {
          bubbles: true,
          cancelable: true,
          dataTransfer,
        });
        draggableElement.dispatchEvent(dragStartEvent);

        const dragOverEvent = new DragEvent('dragover', {
          bubbles: true,
          cancelable: true,
          dataTransfer,
        });
        dragOverEvent.preventDefault();
        targetCell.dispatchEvent(dragOverEvent);

        const dropEvent = new DragEvent('drop', {
          bubbles: true,
          cancelable: true,
          dataTransfer,
        });
        dropEvent.preventDefault();
        targetCell.dispatchEvent(dropEvent);
      },
      ['2b7545a6-ebee-426c-b906-2329bc8d62bd']
    );

    // Then: 겹침 경고 다이얼로그가 표시됨
    await expect(page.getByRole('heading', { name: '일정 겹침 경고' })).toBeVisible({
      timeout: 10000,
    });

    // When: 취소 버튼 클릭
    await page.getByRole('button', { name: '취소' }).click();

    // Then: 일정이 이동하지 않음 (원래 위치에 그대로 있음)
    await expect(sourceDateCell.getByText('팀 회의')).toBeVisible({ timeout: 10000 });
    await expect(targetDateCell.getByText('팀 회의')).not.toBeVisible();
  });

  test('D&D로 겹침일정일 경우 알림이 뜨고, 계속 진행을 선택하면 일정이 이동한다.', async ({
    page,
  }) => {
    // Given: 겹치는 일정 생성 (2025-11-21 10:00-11:00)
    await page.getByText('제목').click();
    await page.getByRole('textbox', { name: '제목' }).fill('겹치는 일정');
    await page.getByRole('textbox', { name: '날짜' }).fill('2025-11-21');
    await page.getByRole('textbox', { name: '시작 시간' }).fill('10:00');
    await page.getByRole('textbox', { name: '종료 시간' }).fill('11:00');
    await page.getByRole('textbox', { name: '설명' }).fill('겹치는 일정 설명');
    await page.getByRole('textbox', { name: '위치' }).fill('회의실 B');
    await page.getByTestId('event-submit-button').click();

    // 겹침 다이얼로그가 나타나면 계속 진행하여 일정 생성
    const overlapDialog = page.getByRole('heading', { name: '일정 겹침 경고' });
    if (await overlapDialog.isVisible()) {
      await page.getByRole('button', { name: '계속 진행' }).click();
    }

    await expect(page.getByText('일정이 추가되었습니다')).toBeVisible();

    // Given: 월간 뷰에 "팀 회의" 일정이 2025-11-20에 존재
    const monthView = page.getByTestId('month-view');
    await expect(monthView).toBeVisible();

    // 2025-11-20 날짜 셀에서 "팀 회의" 일정 찾기
    const sourceDateCell = monthView.getByRole('cell').filter({ hasText: '20' }).first();
    await expect(sourceDateCell).toBeVisible();

    const draggableElement = sourceDateCell
      .locator('[draggable="true"]')
      .filter({ hasText: '팀 회의' })
      .first();
    await expect(draggableElement).toBeVisible();

    // When: "팀 회의" 일정을 2025-11-21 날짜 셀로 드래그 앤 드롭 (겹치는 일정이 있는 날짜)
    const targetDateCell = monthView.getByRole('cell').filter({ hasText: '21' }).first();
    await expect(targetDateCell).toBeVisible();

    // 드래그 앤 드롭 이벤트 발생
    await page.evaluate(
      ([eventId]) => {
        const monthView = document.querySelector('[data-testid="month-view"]');
        if (!monthView) {
          throw new Error('Month view not found');
        }

        const cells = monthView.querySelectorAll('[role="cell"]');
        let draggableElement: HTMLElement | null = null;

        for (const cell of cells) {
          const dayText = cell.textContent;
          if (dayText && dayText.includes('20')) {
            const draggable = cell.querySelector('[draggable="true"]') as HTMLElement;
            if (draggable && draggable.textContent?.includes('팀 회의')) {
              draggableElement = draggable;
              break;
            }
          }
        }

        if (!draggableElement) {
          throw new Error('Draggable element not found');
        }

        let targetCell: HTMLElement | null = null;
        for (const cell of cells) {
          const dayText = cell.textContent;
          if (dayText && dayText.includes('21')) {
            targetCell = cell as HTMLElement;
            break;
          }
        }

        if (!targetCell) {
          throw new Error('Target cell not found');
        }

        const dataTransfer = new DataTransfer();
        dataTransfer.setData('text/plain', eventId as string);
        dataTransfer.effectAllowed = 'move';

        const dragStartEvent = new DragEvent('dragstart', {
          bubbles: true,
          cancelable: true,
          dataTransfer,
        });
        draggableElement.dispatchEvent(dragStartEvent);

        const dragOverEvent = new DragEvent('dragover', {
          bubbles: true,
          cancelable: true,
          dataTransfer,
        });
        dragOverEvent.preventDefault();
        targetCell.dispatchEvent(dragOverEvent);

        const dropEvent = new DragEvent('drop', {
          bubbles: true,
          cancelable: true,
          dataTransfer,
        });
        dropEvent.preventDefault();
        targetCell.dispatchEvent(dropEvent);
      },
      ['2b7545a6-ebee-426c-b906-2329bc8d62bd']
    );

    // Then: 겹침 경고 다이얼로그가 표시됨
    await expect(page.getByRole('heading', { name: '일정 겹침 경고' })).toBeVisible({
      timeout: 10000,
    });

    // When: 계속 진행 버튼 클릭
    await page.getByRole('button', { name: '계속 진행' }).click();

    // Then: 성공 스낵바가 표시됨
    await expect(page.getByText('일정이 이동되었습니다')).toBeVisible({ timeout: 10000 });

    // Then: 일정이 새로운 날짜(2025-11-21)로 이동했는지 확인
    await expect(targetDateCell.getByText('팀 회의')).toBeVisible({ timeout: 10000 });
  });

  test('D&D로 반복일정을 옮기면, 알림이 뜨고, 예를 선택하면 해당 일정만 이동한다.', async ({
    page,
  }) => {
    // Given: 월간 뷰에 "반복일정" 일정이 2025-11-01에 존재 (반복 일정)
    const monthView = page.getByTestId('month-view');
    await expect(monthView).toBeVisible();

    // 2025-11-01 날짜 셀에서 "반복일정" 일정 찾기
    const sourceDateCell = monthView.getByRole('cell').filter({ hasText: '1' }).first();
    await expect(sourceDateCell).toBeVisible();

    const draggableElement = sourceDateCell
      .locator('[draggable="true"]')
      .filter({ hasText: '반복일정' })
      .first();
    await expect(draggableElement).toBeVisible();

    // When: "반복일정" 일정을 2025-11-05 날짜 셀로 드래그 앤 드롭
    const targetDateCell = monthView.getByRole('cell').filter({ hasText: '5' }).first();
    await expect(targetDateCell).toBeVisible();

    // 드래그 앤 드롭 이벤트 발생
    await page.evaluate(
      ([eventId]) => {
        const monthView = document.querySelector('[data-testid="month-view"]');
        if (!monthView) {
          throw new Error('Month view not found');
        }

        const cells = monthView.querySelectorAll('[role="cell"]');
        let draggableElement: HTMLElement | null = null;

        for (const cell of cells) {
          const dayText = cell.textContent;
          if (dayText && dayText.includes('1')) {
            const draggable = cell.querySelector('[draggable="true"]') as HTMLElement;
            if (draggable && draggable.textContent?.includes('반복일정')) {
              draggableElement = draggable;
              break;
            }
          }
        }

        if (!draggableElement) {
          throw new Error('Draggable element not found');
        }

        let targetCell: HTMLElement | null = null;
        for (const cell of cells) {
          const dayText = cell.textContent;
          if (dayText && dayText.includes('5') && !dayText.includes('반복일정')) {
            targetCell = cell as HTMLElement;
            break;
          }
        }

        if (!targetCell) {
          throw new Error('Target cell not found');
        }

        const dataTransfer = new DataTransfer();
        dataTransfer.setData('text/plain', eventId as string);
        dataTransfer.effectAllowed = 'move';

        const dragStartEvent = new DragEvent('dragstart', {
          bubbles: true,
          cancelable: true,
          dataTransfer,
        });
        draggableElement.dispatchEvent(dragStartEvent);

        const dragOverEvent = new DragEvent('dragover', {
          bubbles: true,
          cancelable: true,
          dataTransfer,
        });
        dragOverEvent.preventDefault();
        targetCell.dispatchEvent(dragOverEvent);

        const dropEvent = new DragEvent('drop', {
          bubbles: true,
          cancelable: true,
          dataTransfer,
        });
        dropEvent.preventDefault();
        targetCell.dispatchEvent(dropEvent);
      },
      ['05618614-e14b-4ee1-af10-dc8ef3fdd6d5']
    );

    // Then: 반복 일정 수정 다이얼로그가 표시됨
    await expect(page.getByRole('heading', { name: '반복 일정 수정' })).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText('해당 일정만 수정하시겠어요?')).toBeVisible();

    // When: "예" 버튼 클릭 (해당 일정만 수정)
    await page.getByRole('button', { name: '예' }).click();

    // Then: 성공 스낵바가 표시됨
    await expect(page.getByText('일정이 이동되었습니다')).toBeVisible({ timeout: 10000 });

    // Then: 해당 일정만 이동했는지 확인 (2025-11-05에 반복일정이 표시됨)
    await expect(targetDateCell.getByText('반복일정')).toBeVisible({ timeout: 10000 });

    // Then: 다른 반복 일정들은 원래 날짜에 그대로 있음 (2025-11-08에 반복일정이 여전히 표시됨)
    const originalNextDateCell = monthView.getByRole('cell').filter({ hasText: '8' }).first();
    await expect(originalNextDateCell.getByText('반복일정')).toBeVisible({ timeout: 10000 });
  });

  test('D&D로 반복일정을 옮기면, 알림이 뜨고, 아니오를 선택하면 모든 반복 일정이 이동한다.', async ({
    page,
  }) => {
    // Given: 월간 뷰에 "반복일정" 일정이 2025-11-01에 존재 (반복 일정)
    const monthView = page.getByTestId('month-view');
    await expect(monthView).toBeVisible();

    // 2025-11-01 날짜 셀에서 "반복일정" 일정 찾기
    const sourceDateCell = monthView.getByRole('cell').filter({ hasText: '1' }).first();
    await expect(sourceDateCell).toBeVisible();

    const draggableElement = sourceDateCell
      .locator('[draggable="true"]')
      .filter({ hasText: '반복일정' })
      .first();
    await expect(draggableElement).toBeVisible();

    // When: "반복일정" 일정을 2025-11-05 날짜 셀로 드래그 앤 드롭
    const targetDateCell = monthView.getByRole('cell').filter({ hasText: '5' }).first();
    await expect(targetDateCell).toBeVisible();

    // 드래그 앤 드롭 이벤트 발생
    await page.evaluate(
      ([eventId]) => {
        const monthView = document.querySelector('[data-testid="month-view"]');
        if (!monthView) {
          throw new Error('Month view not found');
        }

        const cells = monthView.querySelectorAll('[role="cell"]');
        let draggableElement: HTMLElement | null = null;

        for (const cell of cells) {
          const dayText = cell.textContent;
          if (dayText && dayText.includes('1')) {
            const draggable = cell.querySelector('[draggable="true"]') as HTMLElement;
            if (draggable && draggable.textContent?.includes('반복일정')) {
              draggableElement = draggable;
              break;
            }
          }
        }

        if (!draggableElement) {
          throw new Error('Draggable element not found');
        }

        let targetCell: HTMLElement | null = null;
        for (const cell of cells) {
          const dayText = cell.textContent;
          if (dayText && dayText.includes('5') && !dayText.includes('반복일정')) {
            targetCell = cell as HTMLElement;
            break;
          }
        }

        if (!targetCell) {
          throw new Error('Target cell not found');
        }

        const dataTransfer = new DataTransfer();
        dataTransfer.setData('text/plain', eventId as string);
        dataTransfer.effectAllowed = 'move';

        const dragStartEvent = new DragEvent('dragstart', {
          bubbles: true,
          cancelable: true,
          dataTransfer,
        });
        draggableElement.dispatchEvent(dragStartEvent);

        const dragOverEvent = new DragEvent('dragover', {
          bubbles: true,
          cancelable: true,
          dataTransfer,
        });
        dragOverEvent.preventDefault();
        targetCell.dispatchEvent(dragOverEvent);

        const dropEvent = new DragEvent('drop', {
          bubbles: true,
          cancelable: true,
          dataTransfer,
        });
        dropEvent.preventDefault();
        targetCell.dispatchEvent(dropEvent);
      },
      ['05618614-e14b-4ee1-af10-dc8ef3fdd6d5']
    );

    // Then: 반복 일정 수정 다이얼로그가 표시됨
    await expect(page.getByRole('heading', { name: '반복 일정 수정' })).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText('해당 일정만 수정하시겠어요?')).toBeVisible();

    // When: "아니오" 버튼 클릭 (모든 반복 일정 수정)
    await page.getByRole('button', { name: '아니오' }).click();

    // Then: 성공 스낵바가 표시됨
    await expect(page.getByText('일정이 이동되었습니다')).toBeVisible({ timeout: 10000 });

    // Then: 모든 반복 일정이 4일씩 이동했는지 확인
    // 원래 2025-11-01 -> 2025-11-05로 이동
    await expect(targetDateCell.getByText('반복일정')).toBeVisible({ timeout: 10000 });

    // 원래 2025-11-08 -> 2025-11-12로 이동
    const movedNextDateCell = monthView.getByRole('cell').filter({ hasText: '12' }).first();
    await expect(movedNextDateCell.getByText('반복일정')).toBeVisible({ timeout: 10000 });

    // 원래 위치에는 더 이상 반복일정이 없음
    await expect(sourceDateCell.getByText('반복일정')).not.toBeVisible();
    const originalNextDateCell = monthView.getByRole('cell').filter({ hasText: '8' }).first();
    await expect(originalNextDateCell.getByText('반복일정')).not.toBeVisible();
  });
});
