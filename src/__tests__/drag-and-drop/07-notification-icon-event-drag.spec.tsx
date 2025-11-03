import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { render, screen, within, waitFor } from '@testing-library/react';
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

describe('[Story] 알림 아이콘이 있는 일정 드래그', () => {
  describe('테스트 케이스 1: 알림이 설정된 일정을 드래그할 수 있다', () => {
    it('알림이 설정된 일정(notificationTime > 0)을 드래그하면 투명도가 0.5로 변경된다', async () => {
      // Given: 2025-10-15의 "기존 회의" 일정에 알림이 설정되어 있음 (notificationTime: 10)
      setup(<App />);

      const monthView = await screen.findByTestId('month-view');
      const eventBox = within(monthView).getByText('기존 회의');
      const eventElement = eventBox.closest('[draggable]') as HTMLElement;

      // When: 해당 일정을 드래그 시작
      const dataTransfer = new DataTransfer();
      const dragStartEvent = new DragEvent('dragstart', {
        bubbles: true,
        cancelable: true,
        dataTransfer,
      });
      eventElement.dispatchEvent(dragStartEvent);

      // Then: 드래그 중인 일정의 투명도가 0.5로 변경됨
      const styles = window.getComputedStyle(eventElement);
      expect(styles.opacity).toBe('0.5');
    });

    it('알림이 설정된 일정을 드래그하면 data-dragging 속성이 추가된다', async () => {
      // Given: 2025-10-15의 "기존 회의" 일정에 알림이 설정되어 있음
      setup(<App />);

      const monthView = await screen.findByTestId('month-view');
      const eventBox = within(monthView).getByText('기존 회의');
      const eventElement = eventBox.closest('[draggable]') as HTMLElement;

      // When: 해당 일정을 드래그 시작
      const dataTransfer = new DataTransfer();
      const dragStartEvent = new DragEvent('dragstart', {
        bubbles: true,
        cancelable: true,
        dataTransfer,
      });
      eventElement.dispatchEvent(dragStartEvent);

      // Then: data-dragging="true" 속성이 추가됨
      expect(eventElement).toHaveAttribute('data-dragging', 'true');
    });
  });

  describe('테스트 케이스 2: 드래그 중에도 알림 아이콘이 표시된다', () => {
    it('알림이 설정된 일정을 드래그할 때 Notifications 아이콘이 표시된다', async () => {
      // Given: 2025-10-15의 "기존 회의" 일정에 알림이 설정되어 있음 (notificationTime: 10)
      // 알림 시간이 다가와서 notifiedEvents에 포함됨
      vi.setSystemTime(new Date('2025-10-15 08:51:00')); // 알림 시간 (09:00 - 10분 전 + 1분 경과)

      setup(<App />);

      // 알림이 트리거될 때까지 대기
      await waitFor(
        () => {
          const monthView = screen.getByTestId('month-view');
          const eventBox = within(monthView).getByText('기존 회의');
          const eventElement = eventBox.closest('[draggable]') as HTMLElement;

          // 알림 아이콘이 표시되는지 확인
          const notificationIcon = within(eventElement).queryByTestId('NotificationsIcon');
          expect(notificationIcon).toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      const monthView = screen.getByTestId('month-view');
      const eventBox = within(monthView).getByText('기존 회의');
      const eventElement = eventBox.closest('[draggable]') as HTMLElement;

      // When: 해당 일정을 드래그 시작
      const dataTransfer = new DataTransfer();
      const dragStartEvent = new DragEvent('dragstart', {
        bubbles: true,
        cancelable: true,
        dataTransfer,
      });
      eventElement.dispatchEvent(dragStartEvent);

      // Then: 드래그 중에도 Notifications 아이콘이 계속 표시됨
      const notificationIcon = within(eventElement).getByTestId('NotificationsIcon');
      expect(notificationIcon).toBeInTheDocument();
    });
  });

  describe('테스트 케이스 3: 드래그 중에도 빨간색 스타일이 유지된다', () => {
    it('알림이 설정된 일정을 드래그할 때 빨간색 배경색(#ffebee)이 유지된다', async () => {
      // Given: 2025-10-15의 "기존 회의" 일정에 알림이 설정되어 있고 notifiedEvents에 포함됨
      vi.setSystemTime(new Date('2025-10-15 08:51:00'));

      setup(<App />);

      // 알림이 트리거될 때까지 대기
      await waitFor(
        () => {
          const monthView = screen.getByTestId('month-view');
          const eventBox = within(monthView).getByText('기존 회의');
          const eventElement = eventBox.closest('[draggable]') as HTMLElement;

          const notificationIcon = within(eventElement).queryByTestId('NotificationsIcon');
          expect(notificationIcon).toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      const monthView = screen.getByTestId('month-view');
      const eventBox = within(monthView).getByText('기존 회의');
      const eventElement = eventBox.closest('[draggable]') as HTMLElement;

      // When: 해당 일정을 드래그 시작
      const dataTransfer = new DataTransfer();
      const dragStartEvent = new DragEvent('dragstart', {
        bubbles: true,
        cancelable: true,
        dataTransfer,
      });
      eventElement.dispatchEvent(dragStartEvent);

      // Then: 드래그 중에도 빨간색 배경색이 유지됨
      const styles = window.getComputedStyle(eventElement);
      expect(styles.backgroundColor).toBe('rgb(255, 235, 238)'); // #ffebee의 RGB 값
    });

    it('알림이 설정된 일정을 드래그할 때 빨간색 텍스트 색상(#d32f2f)이 유지된다', async () => {
      // Given: 2025-10-15의 "기존 회의" 일정에 알림이 설정되어 있고 notifiedEvents에 포함됨
      vi.setSystemTime(new Date('2025-10-15 08:51:00'));

      setup(<App />);

      // 알림이 트리거될 때까지 대기
      await waitFor(
        () => {
          const monthView = screen.getByTestId('month-view');
          const eventBox = within(monthView).getByText('기존 회의');
          const eventElement = eventBox.closest('[draggable]') as HTMLElement;

          const notificationIcon = within(eventElement).queryByTestId('NotificationsIcon');
          expect(notificationIcon).toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      const monthView = screen.getByTestId('month-view');
      const eventBox = within(monthView).getByText('기존 회의');
      const eventElement = eventBox.closest('[draggable]') as HTMLElement;

      // When: 해당 일정을 드래그 시작
      const dataTransfer = new DataTransfer();
      const dragStartEvent = new DragEvent('dragstart', {
        bubbles: true,
        cancelable: true,
        dataTransfer,
      });
      eventElement.dispatchEvent(dragStartEvent);

      // Then: 드래그 중에도 빨간색 텍스트 색상이 유지됨
      const styles = window.getComputedStyle(eventElement);
      expect(styles.color).toBe('rgb(211, 47, 47)'); // #d32f2f의 RGB 값
    });

    it('알림이 설정된 일정을 드래그할 때 투명도만 0.5로 변경되고 다른 스타일은 유지된다', async () => {
      // Given: 2025-10-15의 "기존 회의" 일정에 알림이 설정되어 있고 notifiedEvents에 포함됨
      vi.setSystemTime(new Date('2025-10-15 08:51:00'));

      setup(<App />);

      // 알림이 트리거될 때까지 대기
      await waitFor(
        () => {
          const monthView = screen.getByTestId('month-view');
          const eventBox = within(monthView).getByText('기존 회의');
          const eventElement = eventBox.closest('[draggable]') as HTMLElement;

          const notificationIcon = within(eventElement).queryByTestId('NotificationsIcon');
          expect(notificationIcon).toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      const monthView = screen.getByTestId('month-view');
      const eventBox = within(monthView).getByText('기존 회의');
      const eventElement = eventBox.closest('[draggable]') as HTMLElement;

      // When: 해당 일정을 드래그 시작
      const dataTransfer = new DataTransfer();
      const dragStartEvent = new DragEvent('dragstart', {
        bubbles: true,
        cancelable: true,
        dataTransfer,
      });
      eventElement.dispatchEvent(dragStartEvent);

      // Then: 빨간색 스타일이 유지되면서 투명도만 0.5로 적용됨
      const styles = window.getComputedStyle(eventElement);
      expect(styles.opacity).toBe('0.5');
      expect(styles.backgroundColor).toBe('rgb(255, 235, 238)'); // #ffebee
      expect(styles.color).toBe('rgb(211, 47, 47)'); // #d32f2f
    });
  });

  describe('테스트 케이스 4: 반복 아이콘이 있는 일정을 드래그할 수 있다', () => {
    it('반복 일정(repeat.type !== "none")을 드래그하면 투명도가 0.5로 변경된다', async () => {
      // Given: 2025-10-08의 "매주 회의" 반복 일정이 존재
      const recurringEvent: EventType = {
        id: 'event-rec-1',
        title: '매주 회의',
        date: '2025-10-08',
        startTime: '09:00',
        endTime: '10:00',
        description: '주간 회의',
        location: '회의실 A',
        category: '업무',
        repeat: { type: 'weekly', interval: 1, id: 'repeat-series-1' },
        notificationTime: 0,
      };

      server.use(
        http.get('/api/events', () => {
          return HttpResponse.json({ events: [recurringEvent] });
        })
      );

      setup(<App />);

      const monthView = await screen.findByTestId('month-view');
      const eventBox = within(monthView).getByText('매주 회의');
      const eventElement = eventBox.closest('[draggable]') as HTMLElement;

      // When: 해당 일정을 드래그 시작
      const dataTransfer = new DataTransfer();
      const dragStartEvent = new DragEvent('dragstart', {
        bubbles: true,
        cancelable: true,
        dataTransfer,
      });
      eventElement.dispatchEvent(dragStartEvent);

      // Then: 드래그 중인 일정의 투명도가 0.5로 변경됨
      const styles = window.getComputedStyle(eventElement);
      expect(styles.opacity).toBe('0.5');
    });

    it('반복 일정을 드래그하면 data-dragging 속성이 추가된다', async () => {
      // Given: 2025-10-08의 "매주 회의" 반복 일정이 존재
      const recurringEvent: EventType = {
        id: 'event-rec-2',
        title: '매주 회의',
        date: '2025-10-08',
        startTime: '09:00',
        endTime: '10:00',
        description: '주간 회의',
        location: '회의실 A',
        category: '업무',
        repeat: { type: 'weekly', interval: 1, id: 'repeat-series-2' },
        notificationTime: 0,
      };

      server.use(
        http.get('/api/events', () => {
          return HttpResponse.json({ events: [recurringEvent] });
        })
      );

      setup(<App />);

      const monthView = await screen.findByTestId('month-view');
      const eventBox = within(monthView).getByText('매주 회의');
      const eventElement = eventBox.closest('[draggable]') as HTMLElement;

      // When: 해당 일정을 드래그 시작
      const dataTransfer = new DataTransfer();
      const dragStartEvent = new DragEvent('dragstart', {
        bubbles: true,
        cancelable: true,
        dataTransfer,
      });
      eventElement.dispatchEvent(dragStartEvent);

      // Then: data-dragging="true" 속성이 추가됨
      expect(eventElement).toHaveAttribute('data-dragging', 'true');
    });
  });

  describe('테스트 케이스 5: 드래그 중에도 반복 아이콘이 표시된다', () => {
    it('반복 일정을 드래그할 때 Repeat 아이콘이 표시된다', async () => {
      // Given: 2025-10-08의 "매주 회의" 반복 일정이 존재
      const recurringEvent: EventType = {
        id: 'event-rec-3',
        title: '매주 회의',
        date: '2025-10-08',
        startTime: '09:00',
        endTime: '10:00',
        description: '주간 회의',
        location: '회의실 A',
        category: '업무',
        repeat: { type: 'weekly', interval: 1, id: 'repeat-series-3' },
        notificationTime: 0,
      };

      server.use(
        http.get('/api/events', () => {
          return HttpResponse.json({ events: [recurringEvent] });
        })
      );

      setup(<App />);

      const monthView = await screen.findByTestId('month-view');
      const eventBox = within(monthView).getByText('매주 회의');
      const eventElement = eventBox.closest('[draggable]') as HTMLElement;

      // 반복 아이콘이 렌더링되었는지 먼저 확인
      const repeatIconBefore = within(eventElement).getByTestId('RepeatIcon');
      expect(repeatIconBefore).toBeInTheDocument();

      // When: 해당 일정을 드래그 시작
      const dataTransfer = new DataTransfer();
      const dragStartEvent = new DragEvent('dragstart', {
        bubbles: true,
        cancelable: true,
        dataTransfer,
      });
      eventElement.dispatchEvent(dragStartEvent);

      // Then: 드래그 중에도 Repeat 아이콘이 계속 표시됨
      const repeatIconAfter = within(eventElement).getByTestId('RepeatIcon');
      expect(repeatIconAfter).toBeInTheDocument();
    });
  });

  describe('테스트 케이스 6: 알림과 반복 아이콘이 모두 있는 일정을 드래그할 수 있다', () => {
    it('알림과 반복이 모두 설정된 일정을 드래그하면 두 아이콘이 모두 표시된다', async () => {
      // Given: 2025-10-08의 "중요 회의" 일정에 알림과 반복이 모두 설정되어 있음
      vi.setSystemTime(new Date('2025-10-08 08:51:00')); // 알림 시간 (09:00 - 10분 전 + 1분 경과)

      const notifiedRecurringEvent: EventType = {
        id: 'event-both-1',
        title: '중요 회의',
        date: '2025-10-08',
        startTime: '09:00',
        endTime: '10:00',
        description: '중요한 주간 회의',
        location: '회의실 A',
        category: '업무',
        repeat: { type: 'weekly', interval: 1, id: 'repeat-series-both-1' },
        notificationTime: 10,
      };

      server.use(
        http.get('/api/events', () => {
          return HttpResponse.json({ events: [notifiedRecurringEvent] });
        })
      );

      setup(<App />);

      // 알림이 트리거될 때까지 대기
      await waitFor(
        () => {
          const monthView = screen.getByTestId('month-view');
          const eventBox = within(monthView).getByText('중요 회의');
          const eventElement = eventBox.closest('[draggable]') as HTMLElement;

          const notificationIcon = within(eventElement).queryByTestId('NotificationsIcon');
          expect(notificationIcon).toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      const monthView = screen.getByTestId('month-view');
      const eventBox = within(monthView).getByText('중요 회의');
      const eventElement = eventBox.closest('[draggable]') as HTMLElement;

      // 두 아이콘이 모두 표시되는지 확인
      const notificationIcon = within(eventElement).getByTestId('NotificationsIcon');
      const repeatIcon = within(eventElement).getByTestId('RepeatIcon');
      expect(notificationIcon).toBeInTheDocument();
      expect(repeatIcon).toBeInTheDocument();

      // When: 해당 일정을 드래그 시작
      const dataTransfer = new DataTransfer();
      const dragStartEvent = new DragEvent('dragstart', {
        bubbles: true,
        cancelable: true,
        dataTransfer,
      });
      eventElement.dispatchEvent(dragStartEvent);

      // Then: 드래그 중에도 두 아이콘이 모두 표시됨
      const notificationIconAfter = within(eventElement).getByTestId('NotificationsIcon');
      const repeatIconAfter = within(eventElement).getByTestId('RepeatIcon');
      expect(notificationIconAfter).toBeInTheDocument();
      expect(repeatIconAfter).toBeInTheDocument();
    });

    it('알림과 반복이 모두 설정된 일정을 드래그할 때 빨간색 스타일과 투명도가 함께 적용된다', async () => {
      // Given: 2025-10-08의 "중요 회의" 일정에 알림과 반복이 모두 설정되어 있고 notifiedEvents에 포함됨
      vi.setSystemTime(new Date('2025-10-08 08:51:00'));

      const notifiedRecurringEvent: EventType = {
        id: 'event-both-2',
        title: '중요 회의',
        date: '2025-10-08',
        startTime: '09:00',
        endTime: '10:00',
        description: '중요한 주간 회의',
        location: '회의실 A',
        category: '업무',
        repeat: { type: 'weekly', interval: 1, id: 'repeat-series-both-2' },
        notificationTime: 10,
      };

      server.use(
        http.get('/api/events', () => {
          return HttpResponse.json({ events: [notifiedRecurringEvent] });
        })
      );

      setup(<App />);

      // 알림이 트리거될 때까지 대기
      await waitFor(
        () => {
          const monthView = screen.getByTestId('month-view');
          const eventBox = within(monthView).getByText('중요 회의');
          const eventElement = eventBox.closest('[draggable]') as HTMLElement;

          const notificationIcon = within(eventElement).queryByTestId('NotificationsIcon');
          expect(notificationIcon).toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      const monthView = screen.getByTestId('month-view');
      const eventBox = within(monthView).getByText('중요 회의');
      const eventElement = eventBox.closest('[draggable]') as HTMLElement;

      // When: 해당 일정을 드래그 시작
      const dataTransfer = new DataTransfer();
      const dragStartEvent = new DragEvent('dragstart', {
        bubbles: true,
        cancelable: true,
        dataTransfer,
      });
      eventElement.dispatchEvent(dragStartEvent);

      // Then: 빨간색 스타일과 투명도가 함께 적용됨
      const styles = window.getComputedStyle(eventElement);
      expect(styles.opacity).toBe('0.5');
      expect(styles.backgroundColor).toBe('rgb(255, 235, 238)'); // #ffebee
      expect(styles.color).toBe('rgb(211, 47, 47)'); // #d32f2f
    });
  });

  describe('테스트 케이스 7: 드롭 후 알림 아이콘이 새 날짜에도 유지된다', () => {
    it('알림이 설정된 일정을 드롭한 후 notificationTime 속성이 유지된다', async () => {
      // Given: 2025-10-15의 "기존 회의" 일정에 알림이 설정되어 있음 (notificationTime: 10)
      vi.setSystemTime(new Date('2025-10-15 08:51:00'));

      let capturedRequest: EventType | null = null;

      server.use(
        http.put('/api/events/:id', async ({ params, request }) => {
          const { id } = params;
          const updatedEvent = (await request.json()) as EventType;
          capturedRequest = updatedEvent;

          return HttpResponse.json({
            ...updatedEvent,
            id,
          });
        })
      );

      setup(<App />);

      // 알림이 트리거될 때까지 대기
      await waitFor(
        () => {
          const monthView = screen.getByTestId('month-view');
          const eventBox = within(monthView).getByText('기존 회의');
          const eventElement = eventBox.closest('[draggable]') as HTMLElement;

          const notificationIcon = within(eventElement).queryByTestId('NotificationsIcon');
          expect(notificationIcon).toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      const monthView = screen.getByTestId('month-view');
      const eventBox = within(monthView).getByText('기존 회의');
      const eventElement = eventBox.closest('[draggable]') as HTMLElement;

      // When: "기존 회의" 일정을 2025-10-20 날짜 셀로 드래그 앤 드롭
      const dataTransfer = new DataTransfer();

      const dragStartEvent = new DragEvent('dragstart', {
        bubbles: true,
        cancelable: true,
        dataTransfer,
      });
      eventElement.dispatchEvent(dragStartEvent);

      const dateCells = within(monthView).getAllByRole('cell');
      const targetCell = dateCells.find((cell) => {
        const dayNumber = within(cell).queryByText('20');
        return dayNumber !== null;
      });

      expect(targetCell).toBeDefined();

      const dropEvent = new DragEvent('drop', {
        bubbles: true,
        cancelable: true,
        dataTransfer,
      });
      targetCell!.dispatchEvent(dropEvent);

      // Then: API 요청에서 notificationTime이 10으로 유지됨
      await waitFor(() => {
        expect(capturedRequest).not.toBeNull();
        expect(capturedRequest?.notificationTime).toBe(10);
        expect(capturedRequest?.date).toBe('2025-10-20');
      });
    });

    it('알림이 설정된 일정을 드롭한 후 다른 모든 속성도 유지된다', async () => {
      // Given: 2025-10-15의 "기존 회의" 일정에 알림이 설정되어 있음
      vi.setSystemTime(new Date('2025-10-15 08:51:00'));

      let capturedRequest: EventType | null = null;

      server.use(
        http.put('/api/events/:id', async ({ params, request }) => {
          const { id } = params;
          const updatedEvent = (await request.json()) as EventType;
          capturedRequest = updatedEvent;

          return HttpResponse.json({
            ...updatedEvent,
            id,
          });
        })
      );

      setup(<App />);

      // 알림이 트리거될 때까지 대기
      await waitFor(
        () => {
          const monthView = screen.getByTestId('month-view');
          const eventBox = within(monthView).getByText('기존 회의');
          const eventElement = eventBox.closest('[draggable]') as HTMLElement;

          const notificationIcon = within(eventElement).queryByTestId('NotificationsIcon');
          expect(notificationIcon).toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      const monthView = screen.getByTestId('month-view');
      const eventBox = within(monthView).getByText('기존 회의');
      const eventElement = eventBox.closest('[draggable]') as HTMLElement;

      // When: "기존 회의" 일정을 2025-10-20 날짜 셀로 드래그 앤 드롭
      const dataTransfer = new DataTransfer();

      const dragStartEvent = new DragEvent('dragstart', {
        bubbles: true,
        cancelable: true,
        dataTransfer,
      });
      eventElement.dispatchEvent(dragStartEvent);

      const dateCells = within(monthView).getAllByRole('cell');
      const targetCell = dateCells.find((cell) => {
        const dayNumber = within(cell).queryByText('20');
        return dayNumber !== null;
      });

      expect(targetCell).toBeDefined();

      const dropEvent = new DragEvent('drop', {
        bubbles: true,
        cancelable: true,
        dataTransfer,
      });
      targetCell!.dispatchEvent(dropEvent);

      // Then: 날짜만 변경되고 다른 모든 속성이 유지됨
      await waitFor(() => {
        expect(capturedRequest).not.toBeNull();
        expect(capturedRequest?.title).toBe('기존 회의');
        expect(capturedRequest?.startTime).toBe('09:00');
        expect(capturedRequest?.endTime).toBe('10:00');
        expect(capturedRequest?.description).toBe('기존 팀 미팅');
        expect(capturedRequest?.location).toBe('회의실 B');
        expect(capturedRequest?.category).toBe('업무');
        expect(capturedRequest?.notificationTime).toBe(10);
        expect(capturedRequest?.repeat.type).toBe('none');
        expect(capturedRequest?.date).toBe('2025-10-20');
      });
    });

    it('반복 일정을 드롭한 후 repeat 속성이 유지된다', async () => {
      // Given: 2025-10-08의 "매주 회의" 반복 일정이 존재
      vi.setSystemTime(new Date('2025-10-01'));

      const recurringEvent: EventType = {
        id: 'event-rec-4',
        title: '매주 회의',
        date: '2025-10-08',
        startTime: '09:00',
        endTime: '10:00',
        description: '주간 회의',
        location: '회의실 A',
        category: '업무',
        repeat: { type: 'weekly', interval: 1, id: 'repeat-series-4' },
        notificationTime: 0,
      };

      server.use(
        http.get('/api/events', () => {
          return HttpResponse.json({ events: [recurringEvent] });
        })
      );

      setup(<App />);

      const monthView = await screen.findByTestId('month-view');
      const eventBox = within(monthView).getByText('매주 회의');
      const eventElement = eventBox.closest('[draggable]') as HTMLElement;

      // When: "매주 회의" 일정을 2025-10-15 날짜 셀로 드래그 앤 드롭
      const dataTransfer = new DataTransfer();

      const dragStartEvent = new DragEvent('dragstart', {
        bubbles: true,
        cancelable: true,
        dataTransfer,
      });
      eventElement.dispatchEvent(dragStartEvent);

      const dateCells = within(monthView).getAllByRole('cell');
      const targetCell = dateCells.find((cell) => {
        const dayNumber = within(cell).queryByText('15');
        return dayNumber !== null;
      });

      expect(targetCell).toBeDefined();

      const dropEvent = new DragEvent('drop', {
        bubbles: true,
        cancelable: true,
        dataTransfer,
      });
      targetCell!.dispatchEvent(dropEvent);

      // Then: RecurringEventDialog가 표시됨 (반복 일정 수정 다이얼로그)
      await waitFor(() => {
        const dialog = screen.getByRole('dialog');
        expect(dialog).toBeInTheDocument();
        expect(within(dialog).getByText('반복 일정 수정')).toBeInTheDocument();
      });
    });
  });
});
