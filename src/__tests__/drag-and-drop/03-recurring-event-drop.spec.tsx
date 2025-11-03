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

describe('[Story] 반복 일정 드롭', () => {
  // Given: 캘린더 월간 뷰에 반복 일정이 존재 (setupTests.ts에서 시간이 2025-10-01로 고정)

  describe('검증 포인트 1: RecurringEventDialog 표시', () => {
    it('반복 일정을 드롭하면 RecurringEventDialog가 열린다', async () => {
      // Given: 2025-10-01의 "매주 회의" 주간 반복 일정이 존재
      const recurringEvent: EventType = {
        id: 'event-rec-1',
        title: '매주 회의',
        date: '2025-10-01',
        startTime: '09:00',
        endTime: '10:00',
        description: '주간 회의',
        location: '회의실 A',
        category: '업무',
        repeat: { type: 'weekly', interval: 1, id: 'repeat-series-1' },
        notificationTime: 10,
      };

      server.use(
        http.get('/api/events', () => {
          return HttpResponse.json({ events: [recurringEvent] });
        })
      );

      setup(<App />);

      // 월간 뷰 로드 대기
      const monthView = await screen.findByTestId('month-view');
      const eventBox = await within(monthView).findByText('매주 회의');
      const eventElement = eventBox.closest('[draggable]') as HTMLElement;

      // When: "매주 회의" 일정을 2025-10-08 날짜 셀로 드래그 앤 드롭
      const dataTransfer = new DataTransfer();

      const dragStartEvent = new DragEvent('dragstart', {
        bubbles: true,
        cancelable: true,
        dataTransfer,
      });
      eventElement.dispatchEvent(dragStartEvent);

      // 2025-10-08 날짜 셀 찾기
      const dateCells = within(monthView).getAllByRole('cell');
      const targetCell = dateCells.find((cell) => {
        const dayNumber = within(cell).queryByText('8');
        return dayNumber !== null;
      });

      expect(targetCell).toBeDefined();

      const dropEvent = new DragEvent('drop', {
        bubbles: true,
        cancelable: true,
        dataTransfer,
      });
      targetCell!.dispatchEvent(dropEvent);

      // Then: RecurringEventDialog가 열림
      await waitFor(() => {
        const dialog = screen.getByText('반복 일정 수정');
        expect(dialog).toBeInTheDocument();
      });
    });

    it('RecurringEventDialog가 mode="edit"로 열린다', async () => {
      // Given: 2025-10-01의 "매주 회의" 주간 반복 일정이 존재
      const recurringEvent: EventType = {
        id: 'event-rec-1',
        title: '매주 회의',
        date: '2025-10-01',
        startTime: '09:00',
        endTime: '10:00',
        description: '주간 회의',
        location: '회의실 A',
        category: '업무',
        repeat: { type: 'weekly', interval: 1, id: 'repeat-series-1' },
        notificationTime: 10,
      };

      server.use(
        http.get('/api/events', () => {
          return HttpResponse.json({ events: [recurringEvent] });
        })
      );

      setup(<App />);

      const monthView = await screen.findByTestId('month-view');
      const eventBox = await within(monthView).findByText('매주 회의');
      const eventElement = eventBox.closest('[draggable]') as HTMLElement;

      // When: "매주 회의" 일정을 2025-10-08 날짜 셀로 드롭
      const dataTransfer = new DataTransfer();

      const dragStartEvent = new DragEvent('dragstart', {
        bubbles: true,
        cancelable: true,
        dataTransfer,
      });
      eventElement.dispatchEvent(dragStartEvent);

      const dateCells = within(monthView).getAllByRole('cell');
      const targetCell = dateCells.find((cell) => {
        const dayNumber = within(cell).queryByText('8');
        return dayNumber !== null;
      });

      expect(targetCell).toBeDefined();

      const dropEvent = new DragEvent('drop', {
        bubbles: true,
        cancelable: true,
        dataTransfer,
      });
      targetCell!.dispatchEvent(dropEvent);

      // Then: mode="edit"로 다이얼로그가 표시됨 (제목과 메시지로 확인)
      await waitFor(() => {
        expect(screen.getByText('반복 일정 수정')).toBeInTheDocument();
        expect(screen.getByText('해당 일정만 수정하시겠어요?')).toBeInTheDocument();
      });
    });

    it('다이얼로그에 "예"와 "아니오" 버튼이 표시된다', async () => {
      // Given: 2025-10-01의 "매주 회의" 주간 반복 일정이 존재
      const recurringEvent: EventType = {
        id: 'event-rec-1',
        title: '매주 회의',
        date: '2025-10-01',
        startTime: '09:00',
        endTime: '10:00',
        description: '주간 회의',
        location: '회의실 A',
        category: '업무',
        repeat: { type: 'weekly', interval: 1, id: 'repeat-series-1' },
        notificationTime: 10,
      };

      server.use(
        http.get('/api/events', () => {
          return HttpResponse.json({ events: [recurringEvent] });
        })
      );

      setup(<App />);

      const monthView = await screen.findByTestId('month-view');
      const eventBox = await within(monthView).findByText('매주 회의');
      const eventElement = eventBox.closest('[draggable]') as HTMLElement;

      // When: "매주 회의" 일정을 2025-10-08 날짜 셀로 드롭
      const dataTransfer = new DataTransfer();

      const dragStartEvent = new DragEvent('dragstart', {
        bubbles: true,
        cancelable: true,
        dataTransfer,
      });
      eventElement.dispatchEvent(dragStartEvent);

      const dateCells = within(monthView).getAllByRole('cell');
      const targetCell = dateCells.find((cell) => {
        const dayNumber = within(cell).queryByText('8');
        return dayNumber !== null;
      });

      expect(targetCell).toBeDefined();

      const dropEvent = new DragEvent('drop', {
        bubbles: true,
        cancelable: true,
        dataTransfer,
      });
      targetCell!.dispatchEvent(dropEvent);

      // Then: "예"와 "아니오" 버튼이 표시됨
      await waitFor(() => {
        expect(screen.getByText('예')).toBeInTheDocument();
        expect(screen.getByText('아니오')).toBeInTheDocument();
        expect(screen.getByText('취소')).toBeInTheDocument();
      });
    });
  });

  describe('검증 포인트 2: 단일 수정', () => {
    it('"예" 버튼을 클릭하면 해당 일정만 날짜가 변경된다', async () => {
      // Given: 2025-10-01의 "매주 회의" 주간 반복 일정이 존재
      const recurringEvent: EventType = {
        id: 'event-rec-1',
        title: '매주 회의',
        date: '2025-10-01',
        startTime: '09:00',
        endTime: '10:00',
        description: '주간 회의',
        location: '회의실 A',
        category: '업무',
        repeat: { type: 'weekly', interval: 1, id: 'repeat-series-1' },
        notificationTime: 10,
      };

      let capturedRequest: EventType | null = null;

      server.use(
        http.get('/api/events', () => {
          return HttpResponse.json({ events: [recurringEvent] });
        }),
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

      const { user } = setup(<App />);

      const monthView = await screen.findByTestId('month-view');
      const eventBox = await within(monthView).findByText('매주 회의');
      const eventElement = eventBox.closest('[draggable]') as HTMLElement;

      // When: "매주 회의" 일정을 2025-10-08 날짜 셀로 드롭
      const dataTransfer = new DataTransfer();

      const dragStartEvent = new DragEvent('dragstart', {
        bubbles: true,
        cancelable: true,
        dataTransfer,
      });
      eventElement.dispatchEvent(dragStartEvent);

      const dateCells = within(monthView).getAllByRole('cell');
      const targetCell = dateCells.find((cell) => {
        const dayNumber = within(cell).queryByText('8');
        return dayNumber !== null;
      });

      expect(targetCell).toBeDefined();

      const dropEvent = new DragEvent('drop', {
        bubbles: true,
        cancelable: true,
        dataTransfer,
      });
      targetCell!.dispatchEvent(dropEvent);

      // 다이얼로그가 열릴 때까지 대기
      await waitFor(() => {
        expect(screen.getByText('반복 일정 수정')).toBeInTheDocument();
      });

      // "예" 버튼 클릭 (이 일정만 수정)
      const yesButton = screen.getByText('예');
      await user.click(yesButton);

      // Then: 다이얼로그가 닫히고 PUT API가 호출되어 event-rec-1만 2025-10-08로 변경됨
      await waitFor(() => {
        expect(screen.queryByText('반복 일정 수정')).not.toBeInTheDocument();
      });

      await waitFor(() => {
        expect(capturedRequest).not.toBeNull();
        expect(capturedRequest?.id).toBe('event-rec-1');
        expect(capturedRequest?.date).toBe('2025-10-08');
      });

      // 성공 스낵바 표시 확인
      await waitFor(() => {
        expect(screen.getByText('일정이 이동되었습니다')).toBeInTheDocument();
      });
    });
  });

  describe('검증 포인트 3: 전체 수정', () => {
    it('"아니오" 버튼을 클릭하면 모든 반복 일정의 날짜가 변경된다', async () => {
      // Given: "매주 회의" 주간 반복 일정 시리즈 (repeat.id가 같음)
      const recurringEvents: EventType[] = [
        {
          id: 'event-rec-1',
          title: '매주 회의',
          date: '2025-10-01',
          startTime: '09:00',
          endTime: '10:00',
          description: '주간 회의',
          location: '회의실 A',
          category: '업무',
          repeat: { type: 'weekly', interval: 1, id: 'repeat-series-1' },
          notificationTime: 10,
        },
        {
          id: 'event-rec-2',
          title: '매주 회의',
          date: '2025-10-08',
          startTime: '09:00',
          endTime: '10:00',
          description: '주간 회의',
          location: '회의실 A',
          category: '업무',
          repeat: { type: 'weekly', interval: 1, id: 'repeat-series-1' },
          notificationTime: 10,
        },
        {
          id: 'event-rec-3',
          title: '매주 회의',
          date: '2025-10-15',
          startTime: '09:00',
          endTime: '10:00',
          description: '주간 회의',
          location: '회의실 A',
          category: '업무',
          repeat: { type: 'weekly', interval: 1, id: 'repeat-series-1' },
          notificationTime: 10,
        },
      ];

      let capturedRequest: { events: EventType[] } | null = null;

      server.use(
        http.get('/api/events', () => {
          return HttpResponse.json({ events: recurringEvents });
        }),
        http.put('/api/events-list', async ({ request }) => {
          const body = (await request.json()) as { events: EventType[] };
          capturedRequest = body;

          return HttpResponse.json(body.events);
        })
      );

      const { user } = setup(<App />);

      const monthView = await screen.findByTestId('month-view');
      const eventBoxes = await within(monthView).findAllByText('매주 회의');
      // 첫 번째 이벤트 (2025-10-01)를 드래그
      const eventElement = eventBoxes[0].closest('[draggable]') as HTMLElement;

      // When: "매주 회의" 일정을 2025-10-03 날짜 셀로 드롭 (2일 이동)
      const dataTransfer = new DataTransfer();

      const dragStartEvent = new DragEvent('dragstart', {
        bubbles: true,
        cancelable: true,
        dataTransfer,
      });
      eventElement.dispatchEvent(dragStartEvent);

      const dateCells = within(monthView).getAllByRole('cell');
      const targetCell = dateCells.find((cell) => {
        const dayNumber = within(cell).queryByText('3');
        return dayNumber !== null;
      });

      expect(targetCell).toBeDefined();

      const dropEvent = new DragEvent('drop', {
        bubbles: true,
        cancelable: true,
        dataTransfer,
      });
      targetCell!.dispatchEvent(dropEvent);

      // 다이얼로그가 열릴 때까지 대기
      await waitFor(() => {
        expect(screen.getByText('반복 일정 수정')).toBeInTheDocument();
      });

      // "아니오" 버튼 클릭 (모든 일정 수정)
      const noButton = screen.getByText('아니오');
      await user.click(noButton);

      // Then: 다이얼로그가 닫히고 PUT /api/events-list API가 호출되어 모든 반복 일정의 날짜가 2일씩 이동됨
      await waitFor(() => {
        expect(screen.queryByText('반복 일정 수정')).not.toBeInTheDocument();
      });

      await waitFor(() => {
        expect(capturedRequest).not.toBeNull();
        expect(capturedRequest?.events).toHaveLength(3);

        // 모든 이벤트가 2일씩 이동했는지 확인
        expect(capturedRequest?.events[0].date).toBe('2025-10-03'); // 2025-10-01 + 2일
        expect(capturedRequest?.events[1].date).toBe('2025-10-10'); // 2025-10-08 + 2일
        expect(capturedRequest?.events[2].date).toBe('2025-10-17'); // 2025-10-15 + 2일
      });

      // 성공 스낵바 표시 확인
      await waitFor(() => {
        expect(screen.getByText('일정이 이동되었습니다')).toBeInTheDocument();
      });
    });
  });

  describe('검증 포인트 4: 다양한 반복 유형 테스트', () => {
    it('월간 반복 일정을 드롭하면 RecurringEventDialog가 열린다', async () => {
      // Given: 2025-10-01의 "월간 보고" 월간 반복 일정이 존재
      const recurringEvent: EventType = {
        id: 'event-rec-2',
        title: '월간 보고',
        date: '2025-10-01',
        startTime: '14:00',
        endTime: '15:00',
        description: '월간 보고 회의',
        location: '회의실 B',
        category: '업무',
        repeat: { type: 'monthly', interval: 1, id: 'repeat-series-2' },
        notificationTime: 10,
      };

      server.use(
        http.get('/api/events', () => {
          return HttpResponse.json({ events: [recurringEvent] });
        })
      );

      setup(<App />);

      const monthView = await screen.findByTestId('month-view');
      const eventBox = await within(monthView).findByText('월간 보고');
      const eventElement = eventBox.closest('[draggable]') as HTMLElement;

      // When: "월간 보고" 일정을 2025-10-10 날짜 셀로 드롭
      const dataTransfer = new DataTransfer();

      const dragStartEvent = new DragEvent('dragstart', {
        bubbles: true,
        cancelable: true,
        dataTransfer,
      });
      eventElement.dispatchEvent(dragStartEvent);

      const dateCells = within(monthView).getAllByRole('cell');
      const targetCell = dateCells.find((cell) => {
        const dayNumber = within(cell).queryByText('10');
        return dayNumber !== null;
      });

      expect(targetCell).toBeDefined();

      const dropEvent = new DragEvent('drop', {
        bubbles: true,
        cancelable: true,
        dataTransfer,
      });
      targetCell!.dispatchEvent(dropEvent);

      // Then: RecurringEventDialog가 열림
      await waitFor(() => {
        expect(screen.getByText('반복 일정 수정')).toBeInTheDocument();
      });
    });

    it('매일 반복 일정을 드롭하면 RecurringEventDialog가 열린다', async () => {
      // Given: 2025-10-01의 "일일 스탠드업" 일일 반복 일정이 존재
      const recurringEvent: EventType = {
        id: 'event-rec-3',
        title: '일일 스탠드업',
        date: '2025-10-01',
        startTime: '10:00',
        endTime: '10:30',
        description: '일일 스탠드업 미팅',
        location: '온라인',
        category: '업무',
        repeat: { type: 'daily', interval: 1, id: 'repeat-series-3' },
        notificationTime: 10,
      };

      server.use(
        http.get('/api/events', () => {
          return HttpResponse.json({ events: [recurringEvent] });
        })
      );

      setup(<App />);

      const monthView = await screen.findByTestId('month-view');
      const eventBox = await within(monthView).findByText('일일 스탠드업');
      const eventElement = eventBox.closest('[draggable]') as HTMLElement;

      // When: "일일 스탠드업" 일정을 2025-10-02 날짜 셀로 드롭
      const dataTransfer = new DataTransfer();

      const dragStartEvent = new DragEvent('dragstart', {
        bubbles: true,
        cancelable: true,
        dataTransfer,
      });
      eventElement.dispatchEvent(dragStartEvent);

      const dateCells = within(monthView).getAllByRole('cell');
      const targetCell = dateCells.find((cell) => {
        const dayNumber = within(cell).queryByText('2');
        return dayNumber !== null;
      });

      expect(targetCell).toBeDefined();

      const dropEvent = new DragEvent('drop', {
        bubbles: true,
        cancelable: true,
        dataTransfer,
      });
      targetCell!.dispatchEvent(dropEvent);

      // Then: RecurringEventDialog가 열림
      await waitFor(() => {
        expect(screen.getByText('반복 일정 수정')).toBeInTheDocument();
      });
    });

    it('연간 반복 일정을 드롭하면 RecurringEventDialog가 열린다', async () => {
      // Given: 2025-10-01의 "연례 행사" 연간 반복 일정이 존재
      const recurringEvent: EventType = {
        id: 'event-rec-4',
        title: '연례 행사',
        date: '2025-10-01',
        startTime: '09:00',
        endTime: '18:00',
        description: '연례 행사',
        location: '본사',
        category: '행사',
        repeat: { type: 'yearly', interval: 1, id: 'repeat-series-4' },
        notificationTime: 10,
      };

      server.use(
        http.get('/api/events', () => {
          return HttpResponse.json({ events: [recurringEvent] });
        })
      );

      setup(<App />);

      const monthView = await screen.findByTestId('month-view');
      const eventBox = await within(monthView).findByText('연례 행사');
      const eventElement = eventBox.closest('[draggable]') as HTMLElement;

      // When: "연례 행사" 일정을 2025-10-15 날짜 셀로 드롭
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

      // Then: RecurringEventDialog가 열림
      await waitFor(() => {
        expect(screen.getByText('반복 일정 수정')).toBeInTheDocument();
      });
    });
  });
});
