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

describe('[Story] 일반 일정 드롭', () => {
  // Given: 캘린더 월간 뷰에 2025-10-15의 "기존 회의" 일정이 존재 (setupTests.ts에서 시간이 2025-10-01로 고정)

  describe('검증 포인트 1: 날짜 변경 및 API 호출', () => {
    it('일정을 다른 날짜로 드롭하면 날짜가 변경된다', async () => {
      // Given: 캘린더 월간 뷰에 2025-10-15의 "기존 회의" 일정이 존재
      let capturedRequest: EventType | null = null;

      // PUT API 핸들러를 오버라이드하여 요청 캡처
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

      const monthView = await screen.findByTestId('month-view');
      const eventBox = within(monthView).getByText('기존 회의');
      const eventElement = eventBox.closest('[draggable]') as HTMLElement;

      // When: "기존 회의" 일정을 2025-10-20 날짜 셀로 드래그 앤 드롭
      const dataTransfer = new DataTransfer();

      // 드래그 시작
      const dragStartEvent = new DragEvent('dragstart', {
        bubbles: true,
        cancelable: true,
        dataTransfer,
      });
      eventElement.dispatchEvent(dragStartEvent);

      // 2025-10-20 날짜 셀 찾기
      const dateCells = within(monthView).getAllByRole('cell');
      const targetCell = dateCells.find((cell) => {
        const dayNumber = within(cell).queryByText('20');
        return dayNumber !== null;
      });

      expect(targetCell).toBeDefined();

      // 드롭 실행
      const dropEvent = new DragEvent('drop', {
        bubbles: true,
        cancelable: true,
        dataTransfer,
      });
      targetCell!.dispatchEvent(dropEvent);

      // Then: PUT API가 호출되고 날짜가 "2025-10-20"로 변경됨
      await waitFor(() => {
        expect(capturedRequest).not.toBeNull();
        expect(capturedRequest?.date).toBe('2025-10-20');
      });
    });

    it('일정을 다른 날짜로 드롭해도 시작 시간과 종료 시간은 유지된다', async () => {
      // Given: 캘린더 월간 뷰에 2025-10-15 09:00-10:00의 "기존 회의" 일정이 존재
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

      const monthView = await screen.findByTestId('month-view');
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

      // Then: startTime과 endTime이 "09:00", "10:00"으로 유지됨
      await waitFor(() => {
        expect(capturedRequest).not.toBeNull();
        expect(capturedRequest?.startTime).toBe('09:00');
        expect(capturedRequest?.endTime).toBe('10:00');
      });
    });

    it('일정을 다른 날짜로 드롭하면 PUT API가 호출된다', async () => {
      // Given: 캘린더 월간 뷰에 2025-10-15의 "기존 회의" 일정이 존재 (id: "1")
      let apiCalled = false;

      server.use(
        http.put('/api/events/1', async ({ request }) => {
          apiCalled = true;
          const updatedEvent = (await request.json()) as EventType;

          return HttpResponse.json({
            ...updatedEvent,
            id: '1',
          });
        })
      );

      setup(<App />);

      const monthView = await screen.findByTestId('month-view');
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

      // Then: PUT /api/events/1 요청이 전송됨
      await waitFor(() => {
        expect(apiCalled).toBe(true);
      });
    });

    it('일정을 다른 날짜로 드롭하면 성공 스낵바가 표시된다', async () => {
      // Given: 캘린더 월간 뷰에 2025-10-15의 "기존 회의" 일정이 존재
      server.use(
        http.put('/api/events/:id', async ({ params, request }) => {
          const { id } = params;
          const updatedEvent = (await request.json()) as EventType;

          return HttpResponse.json({
            ...updatedEvent,
            id,
          });
        })
      );

      setup(<App />);

      const monthView = await screen.findByTestId('month-view');
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

      // Then: "일정이 이동되었습니다" 스낵바가 표시됨
      await waitFor(() => {
        const snackbar = screen.getByText('일정이 이동되었습니다');
        expect(snackbar).toBeInTheDocument();
      });
    });
  });

  describe('검증 포인트 2: 동일 날짜 드롭', () => {
    it('일정을 동일한 날짜에 드롭하면 API가 호출되지 않는다', async () => {
      // Given: 2025-10-15의 "기존 회의" 일정을 드래그 중
      let apiCalled = false;

      server.use(
        http.put('/api/events/:id', async ({ request }) => {
          apiCalled = true;
          const updatedEvent = (await request.json()) as EventType;

          return HttpResponse.json(updatedEvent);
        })
      );

      setup(<App />);

      const monthView = await screen.findByTestId('month-view');
      const eventBox = within(monthView).getByText('기존 회의');
      const eventElement = eventBox.closest('[draggable]') as HTMLElement;

      // When: "기존 회의" 일정을 동일한 날짜(2025-10-15)에 드롭
      const dataTransfer = new DataTransfer();

      const dragStartEvent = new DragEvent('dragstart', {
        bubbles: true,
        cancelable: true,
        dataTransfer,
      });
      eventElement.dispatchEvent(dragStartEvent);

      // 2025-10-15 날짜 셀 찾기 (현재 일정이 있는 날짜)
      const dateCells = within(monthView).getAllByRole('cell');
      const sameCell = dateCells.find((cell) => {
        const dayNumber = within(cell).queryByText('15');
        return dayNumber !== null;
      });

      expect(sameCell).toBeDefined();

      const dropEvent = new DragEvent('drop', {
        bubbles: true,
        cancelable: true,
        dataTransfer,
      });
      sameCell!.dispatchEvent(dropEvent);

      // Then: API 요청이 전송되지 않음
      await waitFor(
        () => {
          expect(apiCalled).toBe(false);
        },
        { timeout: 1000 }
      );
    });
  });

  describe('검증 포인트 3: 드래그 상태 초기화', () => {
    it('드롭 완료 후 드래그 상태가 초기화된다', async () => {
      // Given: 캘린더 월간 뷰에 2025-10-15의 "기존 회의" 일정이 존재
      server.use(
        http.put('/api/events/:id', async ({ params, request }) => {
          const { id } = params;
          const updatedEvent = (await request.json()) as EventType;

          return HttpResponse.json({
            ...updatedEvent,
            id,
          });
        })
      );

      setup(<App />);

      const monthView = await screen.findByTestId('month-view');
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

      // 드래그 시작 시 data-dragging 속성 확인
      expect(eventElement).toHaveAttribute('data-dragging', 'true');

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

      // Then: 드롭 완료 후 data-dragging 속성이 제거되고 투명도가 복원됨
      await waitFor(() => {
        expect(eventElement).not.toHaveAttribute('data-dragging');
        const styles = window.getComputedStyle(eventElement);
        expect(styles.opacity).toBe('1');
      });
    });
  });
});
