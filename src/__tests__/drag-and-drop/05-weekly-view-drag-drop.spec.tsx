import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { act, render, screen, within, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { SnackbarProvider } from 'notistack';
import { ReactElement } from 'react';

import App from '../../App';
import { server } from '../../setupTests';
import { Event as EventType } from '../../types';

const theme = createTheme();

// DataTransfer Mock (JSDOM에서 지원하지 않음)
class MockDataTransfer {
  data: Record<string, string> = {};
  dropEffect: string = 'none';
  effectAllowed: string = 'all';
  files: FileList = [] as unknown as FileList;
  items: DataTransferItemList = [] as unknown as DataTransferItemList;
  types: string[] = [];

  clearData() {
    this.data = {};
  }

  getData(format: string) {
    return this.data[format] || '';
  }

  setData(format: string, data: string) {
    this.data[format] = data;
  }

  setDragImage() {
    // no-op
  }
}

// DragEvent Mock 클래스 정의
class MockDragEvent extends Event {
  dataTransfer: MockDataTransfer;

  constructor(
    type: string,
    options?: { bubbles?: boolean; cancelable?: boolean; dataTransfer?: MockDataTransfer }
  ) {
    super(type, options);
    this.dataTransfer = options?.dataTransfer || new MockDataTransfer();
  }
}

// DataTransfer를 글로벌 환경에 추가
(global as unknown as { DataTransfer: typeof MockDataTransfer }).DataTransfer = MockDataTransfer;

// DragEvent를 글로벌 환경에 추가 (JSDOM에서 제대로 작동하지 않음)
if (typeof DragEvent === 'undefined') {
  (global as unknown as { DragEvent: typeof MockDragEvent }).DragEvent = MockDragEvent;
}

const setup = (element: ReactElement) => {
  const user = userEvent.setup();

  return {
    ...render(
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <SnackbarProvider>{element}</SnackbarProvider>
      </ThemeProvider>
    ),
    user,
  };
};

const renderAppWithEvents = (events: EventType[]) => {
  server.use(
    http.get('/api/events', () => {
      return HttpResponse.json({ events });
    })
  );

  return setup(<App />);
};

const switchToWeekView = async () => {
  const viewSelectContainer = await screen.findByLabelText('뷰 타입 선택');
  const viewSelect = within(viewSelectContainer).getByRole('combobox');
  await userEvent.click(viewSelect);
  const weekOption = await screen.findByRole('option', { name: 'week-option' });
  await userEvent.click(weekOption);
  await screen.findByTestId('week-view');
};

describe.skip('[Story] 주간 뷰 드래그 앤 드롭', () => {
  // Given: 주간 뷰로 전환됨, 2025-10-01(수) 일정 존재 (setupTests.ts에서 기준 날짜 고정)

  const baseEvent: EventType = {
    id: 'e-1',
    title: '팀 회의',
    date: '2025-10-01',
    startTime: '10:00',
    endTime: '11:00',
    description: '주간 팀 회의',
    location: '회의실 A',
    category: '업무',
    repeat: { type: 'none', interval: 0 },
    notificationTime: 10,
  };

  describe('테스트 케이스 1: 주간 뷰에서 일정을 드래그할 수 있다', () => {
    it('이벤트 박스가 draggable이어야 한다', async () => {
      renderAppWithEvents([baseEvent]);
      await switchToWeekView();

      const weekView = await screen.findByTestId('week-view');
      const eventNode = await within(weekView).findByText('팀 회의');
      const eventElement = eventNode.closest('[draggable]') as HTMLElement | null;

      // Then: draggable 속성이 있어야 함 (현재 구현에서는 없음 → Red)
      expect(eventElement).toHaveAttribute('draggable', 'true');
    });
  });

  describe('테스트 케이스 2: 주간 뷰에서 일정을 다른 날짜로 드롭할 수 있다', () => {
    it('수요일(1일)에서 금요일(3일)로 드롭 가능해야 한다', async () => {
      let apiCalled = false;

      server.use(
        http.put('/api/events/:id', async ({ params, request }) => {
          apiCalled = true;
          const { id } = params;
          const updatedEvent = (await request.json()) as EventType;
          return HttpResponse.json({ ...updatedEvent, id });
        })
      );

      renderAppWithEvents([baseEvent]);
      await switchToWeekView();

      const weekView = await screen.findByTestId('week-view');
      const eventNode = await within(weekView).findByText('팀 회의');
      const eventElement = (eventNode.closest('[draggable]') || eventNode) as HTMLElement;

      const dataTransfer = new DataTransfer();
      const dragStartEvent = new DragEvent('dragstart', {
        bubbles: true,
        cancelable: true,
        dataTransfer,
      });
      act(() => {
        eventElement.dispatchEvent(dragStartEvent);
      });

      // 3일(금요일) 셀 찾기
      const weekCells = within(weekView).getAllByRole('cell');
      const targetCell = weekCells.find((cell) => within(cell).queryByText('3') !== null);
      expect(targetCell).toBeDefined();

      const dropEvent = new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer });
      act(() => {
        targetCell!.dispatchEvent(dropEvent);
      });

      // Then: 드롭 처리로 API가 호출되어야 함 (현재 주간 뷰 셀에 onDrop 없음 → Red)
      await waitFor(() => {
        expect(apiCalled).toBe(true);
      });
    });
  });

  describe('테스트 케이스 3: 주간 뷰에서 드롭 시 날짜가 정확히 변경된다', () => {
    it('드롭 후 요청 바디의 date가 2025-10-03이어야 한다', async () => {
      let capturedRequest: EventType | null = null;

      server.use(
        http.put('/api/events/:id', async ({ params, request }) => {
          const { id } = params;
          const updatedEvent = (await request.json()) as EventType;
          capturedRequest = updatedEvent;
          return HttpResponse.json({ ...updatedEvent, id });
        })
      );

      renderAppWithEvents([baseEvent]);
      await switchToWeekView();

      const weekView = await screen.findByTestId('week-view');
      const eventNode = await within(weekView).findByText('팀 회의');
      const eventElement = (eventNode.closest('[draggable]') || eventNode) as HTMLElement;

      const dataTransfer = new DataTransfer();
      const dragStartEvent = new DragEvent('dragstart', {
        bubbles: true,
        cancelable: true,
        dataTransfer,
      });
      act(() => {
        eventElement.dispatchEvent(dragStartEvent);
      });

      const weekCells = within(weekView).getAllByRole('cell');
      const targetCell = weekCells.find((cell) => within(cell).queryByText('3') !== null);
      expect(targetCell).toBeDefined();

      const dropEvent = new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer });
      act(() => {
        targetCell!.dispatchEvent(dropEvent);
      });

      // Then: 날짜가 2025-10-03으로 전송되어야 함 (현재 구현상 전송되지 않음 → Red)
      await waitFor(() => {
        expect(capturedRequest).not.toBeNull();
        expect(capturedRequest?.date).toBe('2025-10-03');
      });
    });
  });

  describe('테스트 케이스 4: 주간 뷰에서 드롭 시 API가 정상적으로 호출된다', () => {
    it('PUT /api/events/:id 호출', async () => {
      let apiCalled = false;

      server.use(
        http.put('/api/events/:id', async ({ params, request }) => {
          apiCalled = true;
          const { id } = params;
          const updatedEvent = (await request.json()) as EventType;
          return HttpResponse.json({ ...updatedEvent, id });
        })
      );

      renderAppWithEvents([baseEvent]);
      await switchToWeekView();

      const weekView = await screen.findByTestId('week-view');
      const eventNode = await within(weekView).findByText('팀 회의');
      const eventElement = (eventNode.closest('[draggable]') || eventNode) as HTMLElement;

      const dataTransfer = new DataTransfer();
      const dragStartEvent = new DragEvent('dragstart', {
        bubbles: true,
        cancelable: true,
        dataTransfer,
      });
      act(() => {
        eventElement.dispatchEvent(dragStartEvent);
      });

      const weekCells = within(weekView).getAllByRole('cell');
      const targetCell = weekCells.find((cell) => within(cell).queryByText('3') !== null);
      expect(targetCell).toBeDefined();

      const dropEvent = new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer });
      act(() => {
        targetCell!.dispatchEvent(dropEvent);
      });

      await waitFor(() => {
        expect(apiCalled).toBe(true);
      });
    });
  });

  describe('테스트 케이스 5: 주간 뷰에서 드래그 중 시각적 피드백이 표시된다', () => {
    it('드래그 시작 시 opacity 0.5, 셀 hover 시 배경 하이라이트', async () => {
      renderAppWithEvents([baseEvent]);
      await switchToWeekView();

      const weekView = await screen.findByTestId('week-view');
      const eventNode = await within(weekView).findByText('팀 회의');
      const eventElement = (eventNode.closest('[draggable]') || eventNode) as HTMLElement;

      const dataTransfer = new DataTransfer();
      const dragStartEvent = new DragEvent('dragstart', {
        bubbles: true,
        cancelable: true,
        dataTransfer,
      });
      act(() => {
        eventElement.dispatchEvent(dragStartEvent);
      });

      // Then: 이벤트 opacity 0.5 (computed style 기준으로 검증)
      const eventStyles = window.getComputedStyle(eventElement as HTMLElement);
      expect(eventStyles.opacity).toBe('0.5');

      // When: 특정 셀로 dragover
      const weekCells = within(weekView).getAllByRole('cell');
      const targetCell = weekCells.find((cell) => within(cell).queryByText('3') !== null)!;
      const dragOverEvent = new DragEvent('dragover', {
        bubbles: true,
        cancelable: true,
        dataTransfer,
      });
      act(() => {
        targetCell.dispatchEvent(dragOverEvent);
      });

      // Then: 셀 배경 하이라이트 (computed style 기준으로 검증)
      await waitFor(() => {
        const styles = window.getComputedStyle(targetCell as HTMLElement);
        expect(styles.backgroundColor).toBe('rgb(227, 242, 253)');
      });
    });
  });

  describe('테스트 케이스 6: 주간/월간 뷰 전환 시에도 드래그 상태가 유지된다', () => {
    it('주간에서 드래그 시작 후 월간으로 전환해 드롭해도 동작해야 한다', async () => {
      let apiCalled = false;

      server.use(
        http.put('/api/events/:id', async ({ params, request }) => {
          apiCalled = true;
          const { id } = params;
          const updatedEvent = (await request.json()) as EventType;
          return HttpResponse.json({ ...updatedEvent, id });
        })
      );

      renderAppWithEvents([baseEvent]);
      await switchToWeekView();

      const weekView = await screen.findByTestId('week-view');
      const eventNode = await within(weekView).findByText('팀 회의');
      const eventElement = (eventNode.closest('[draggable]') || eventNode) as HTMLElement;

      const dataTransfer = new DataTransfer();
      const dragStartEvent = new DragEvent('dragstart', {
        bubbles: true,
        cancelable: true,
        dataTransfer,
      });
      act(() => {
        eventElement.dispatchEvent(dragStartEvent);
      });

      // 뷰를 월간으로 전환
      const viewSelectContainer = await screen.findByLabelText('뷰 타입 선택');
      const viewSelect = within(viewSelectContainer).getByRole('combobox');
      await userEvent.click(viewSelect);
      const monthOption = await screen.findByRole('option', { name: 'month-option' });
      await userEvent.click(monthOption);
      const monthView = await screen.findByTestId('month-view');

      // 월간 뷰의 3일 셀로 드롭
      const monthCells = within(monthView).getAllByRole('cell');
      const targetCell = monthCells.find((cell) => within(cell).queryByText('3') !== null);
      expect(targetCell).toBeDefined();

      const dropEvent = new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer });
      act(() => {
        targetCell!.dispatchEvent(dropEvent);
      });

      // Then: 드래그 상태가 유지되어 드롭 동작 및 API 호출 (현재 주간 뷰 드래그 미구현 → Red)
      await waitFor(() => {
        expect(apiCalled).toBe(true);
      });
    });
  });
});
