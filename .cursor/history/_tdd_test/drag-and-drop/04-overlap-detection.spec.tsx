import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { render, screen, within, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { SnackbarProvider } from 'notistack';
import { ReactElement } from 'react';

import App from '../../../../src/App';
import { server } from '../../../../src/setupTests';
import { Event as EventType } from '../../../../src/types';

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

/**
 * Story 4: 일정 겹침 감지
 * - 드래그 앤 드롭 시, 대상 날짜에 동일 시간대의 일정이 있으면 겹침 경고 다이얼로그 표시
 * - "취소" 선택 시 API 호출 없음 및 원래 날짜 유지
 * - "계속 진행" 선택 시 API 호출 및 새 날짜로 이동
 */
describe.skip('[Story] 일정 겹침 감지 (D&D)', () => {
  const existingOnTarget: EventType = {
    id: '1',
    title: '기존 회의',
    date: '2025-10-03',
    startTime: '10:00',
    endTime: '11:00',
    description: '기존 팀 미팅',
    location: '회의실 A',
    category: '업무',
    repeat: { type: 'none', interval: 0 },
    notificationTime: 10,
  };

  const draggableEvent: EventType = {
    id: '2',
    title: '새 회의',
    date: '2025-10-01',
    startTime: '10:00',
    endTime: '11:00',
    description: '새로운 미팅',
    location: '회의실 B',
    category: '업무',
    repeat: { type: 'none', interval: 0 },
    notificationTime: 10,
  };

  const nonOverlappingDraggable: EventType = {
    ...draggableEvent,
    id: '3',
    title: '새 회의(비겹침)',
    startTime: '09:00',
    endTime: '10:00',
  };

  const renderAppWithEvents = (events: EventType[]) => {
    server.use(
      http.get('/api/events', () => {
        return HttpResponse.json({ events });
      })
    );

    return setup(<App />);
  };

  describe('검증 포인트 1: 겹침 감지 및 다이얼로그 표시', () => {
    it('겹치는 시간대의 일정이 있으면 겹침 경고 다이얼로그가 표시된다', async () => {
      renderAppWithEvents([existingOnTarget, draggableEvent]);

      const monthView = await screen.findByTestId('month-view');
      const eventBox = await within(monthView).findByText('새 회의');
      const eventElement = eventBox.closest('[draggable]') as HTMLElement;

      const dataTransfer = new DataTransfer();

      const dragStartEvent = new DragEvent('dragstart', {
        bubbles: true,
        cancelable: true,
        dataTransfer,
      });
      eventElement.dispatchEvent(dragStartEvent);

      // 2025-10-03 날짜 셀 찾기
      const dateCells = within(monthView).getAllByRole('cell');
      const targetCell = dateCells.find((cell) => within(cell).queryByText('3') !== null);
      expect(targetCell).toBeDefined();

      const dropEvent = new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer });
      targetCell!.dispatchEvent(dropEvent);

      // Then: 겹침 경고 다이얼로그 표시
      await waitFor(() => {
        expect(screen.getByText('일정 겹침 경고')).toBeInTheDocument();
      });
    });

    it('다이얼로그에 겹치는 일정 정보가 표시된다', async () => {
      renderAppWithEvents([existingOnTarget, draggableEvent]);

      const monthView = await screen.findByTestId('month-view');
      const eventBox = await within(monthView).findByText('새 회의');
      const eventElement = eventBox.closest('[draggable]') as HTMLElement;

      const dataTransfer = new DataTransfer();
      const dragStartEvent = new DragEvent('dragstart', {
        bubbles: true,
        cancelable: true,
        dataTransfer,
      });
      eventElement.dispatchEvent(dragStartEvent);

      const dateCells = within(monthView).getAllByRole('cell');
      const targetCell = dateCells.find((cell) => within(cell).queryByText('3') !== null);
      expect(targetCell).toBeDefined();

      const dropEvent = new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer });
      targetCell!.dispatchEvent(dropEvent);

      await waitFor(() => {
        expect(screen.getByText('일정 겹침 경고')).toBeInTheDocument();
      });

      // Then: 겹치는 일정 정보 표시
      expect(screen.getByText('기존 회의 (2025-10-03 10:00-11:00)')).toBeInTheDocument();
    });
  });

  describe('검증 포인트 2: 취소 선택', () => {
    it('"취소"를 선택하면 다이얼로그가 닫히고 API가 호출되지 않으며 원래 날짜에 유지된다', async () => {
      let apiCalled = false;

      server.use(
        http.get('/api/events', () => {
          return HttpResponse.json({ events: [existingOnTarget, draggableEvent] });
        }),
        http.put('/api/events/:id', async ({ request, params }) => {
          apiCalled = true;
          const { id } = params;
          const updatedEvent = (await request.json()) as EventType;
          return HttpResponse.json({ ...updatedEvent, id });
        })
      );

      const { user } = setup(<App />);

      const monthView = await screen.findByTestId('month-view');
      const eventBox = await within(monthView).findByText('새 회의');
      const eventElement = eventBox.closest('[draggable]') as HTMLElement;

      const dataTransfer = new DataTransfer();
      const dragStartEvent = new DragEvent('dragstart', {
        bubbles: true,
        cancelable: true,
        dataTransfer,
      });
      eventElement.dispatchEvent(dragStartEvent);

      const dateCells = within(monthView).getAllByRole('cell');
      const targetCell = dateCells.find((cell) => within(cell).queryByText('3') !== null);
      expect(targetCell).toBeDefined();

      const dropEvent = new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer });
      targetCell!.dispatchEvent(dropEvent);

      // 다이얼로그 열림 대기
      await waitFor(() => {
        expect(screen.getByText('일정 겹침 경고')).toBeInTheDocument();
      });

      // When: 취소 클릭
      const cancelButton = screen.getByText('취소');
      await user.click(cancelButton);

      // Then: 다이얼로그 닫힘, API 미호출, 원래 날짜 유지
      await waitFor(() => {
        expect(screen.queryByText('일정 겹침 경고')).not.toBeInTheDocument();
        expect(apiCalled).toBe(false);
      });

      // 원래 날짜(1일)에 "새 회의"가 여전히 표시됨
      const firstDayCell = dateCells.find((cell) => within(cell).queryByText('1') !== null)!;
      expect(within(firstDayCell).getByText('새 회의')).toBeInTheDocument();
    });
  });

  describe('검증 포인트 3: 계속 진행 선택', () => {
    it('"계속 진행"을 선택하면 API가 호출되고 새 날짜로 이동된다', async () => {
      let capturedRequest: EventType | null = null;

      server.use(
        http.get('/api/events', () => {
          return HttpResponse.json({ events: [existingOnTarget, draggableEvent] });
        }),
        http.put('/api/events/:id', async ({ params, request }) => {
          const { id } = params;
          const updatedEvent = (await request.json()) as EventType;
          capturedRequest = updatedEvent;
          return HttpResponse.json({ ...updatedEvent, id });
        })
      );

      const { user } = setup(<App />);

      const monthView = await screen.findByTestId('month-view');
      const eventBox = await within(monthView).findByText('새 회의');
      const eventElement = eventBox.closest('[draggable]') as HTMLElement;

      const dataTransfer = new DataTransfer();
      const dragStartEvent = new DragEvent('dragstart', {
        bubbles: true,
        cancelable: true,
        dataTransfer,
      });
      eventElement.dispatchEvent(dragStartEvent);

      const dateCells = within(monthView).getAllByRole('cell');
      const targetCell = dateCells.find((cell) => within(cell).queryByText('3') !== null);
      expect(targetCell).toBeDefined();

      const dropEvent = new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer });
      targetCell!.dispatchEvent(dropEvent);

      // 다이얼로그 열림 대기
      await waitFor(() => {
        expect(screen.getByText('일정 겹침 경고')).toBeInTheDocument();
      });

      // When: 계속 진행 클릭
      const proceedButton = screen.getByText('계속 진행');
      await user.click(proceedButton);

      // Then: PUT API 호출 및 날짜가 2025-10-03으로 변경됨
      await waitFor(() => {
        expect(capturedRequest).not.toBeNull();
        expect(capturedRequest?.date).toBe('2025-10-03');
      });
    });
  });

  describe('검증 포인트 4: 겹치지 않는 경우', () => {
    it('겹침이 없으면 다이얼로그 없이 바로 이동된다', async () => {
      let capturedRequest: EventType | null = null;

      server.use(
        http.get('/api/events', () => {
          return HttpResponse.json({ events: [existingOnTarget, nonOverlappingDraggable] });
        }),
        http.put('/api/events/:id', async ({ params, request }) => {
          const { id } = params;
          const updatedEvent = (await request.json()) as EventType;
          capturedRequest = updatedEvent;
          return HttpResponse.json({ ...updatedEvent, id });
        })
      );

      setup(<App />);

      const monthView = await screen.findByTestId('month-view');
      const eventBox = await within(monthView).findByText('새 회의(비겹침)');
      const eventElement = eventBox.closest('[draggable]') as HTMLElement;

      const dataTransfer = new DataTransfer();
      const dragStartEvent = new DragEvent('dragstart', {
        bubbles: true,
        cancelable: true,
        dataTransfer,
      });
      eventElement.dispatchEvent(dragStartEvent);

      const dateCells = within(monthView).getAllByRole('cell');
      const targetCell = dateCells.find((cell) => within(cell).queryByText('3') !== null);
      expect(targetCell).toBeDefined();

      const dropEvent = new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer });
      targetCell!.dispatchEvent(dropEvent);

      // Then: 다이얼로그 없이 바로 이동되므로 PUT 호출됨, 다이얼로그 없음
      await waitFor(() => {
        expect(capturedRequest).not.toBeNull();
        expect(capturedRequest?.date).toBe('2025-10-03');
      });

      expect(screen.queryByText('일정 겹침 경고')).not.toBeInTheDocument();
    });
  });
});
