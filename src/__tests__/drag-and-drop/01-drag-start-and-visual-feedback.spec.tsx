import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { SnackbarProvider } from 'notistack';
import { ReactElement } from 'react';

import App from '../../App';

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

describe('[Story] 드래그 시작 및 시각적 피드백', () => {
  // Given: 캘린더 월간 뷰에 2025-10-15의 "기존 회의" 일정이 존재 (setupTests.ts에서 시간이 2025-10-01로 고정)

  describe('검증 포인트 1: 드래그 가능 커서 표시', () => {
    it('일정 박스에 마우스를 올리면 grab 커서가 표시된다', async () => {
      // Given: 캘린더 월간 뷰에 2025-10-15의 "기존 회의" 일정이 존재
      setup(<App />);

      // 월간 뷰 내에서만 검색하여 캘린더의 일정 박스를 가져옴
      const monthView = await screen.findByTestId('month-view');
      const eventBox = within(monthView).getByText('기존 회의');

      // When: "기존 회의" 일정 박스에 마우스를 올림
      // (hover는 실제로는 CSS로 처리되므로, 여기서는 일정 박스에 draggable 속성과 커서 스타일이 있는지 확인)

      // Then: 일정 박스에 draggable 속성이 있고 커서 스타일이 grab으로 설정되어야 함
      const eventElement = eventBox.closest('[draggable]');
      expect(eventElement).toBeInTheDocument();
      expect(eventElement).toHaveAttribute('draggable', 'true');

      // 스타일 검증: cursor: grab
      const styles = window.getComputedStyle(eventElement!);
      expect(styles.cursor).toBe('grab');
    });
  });

  describe('검증 포인트 2: 드래그 시작 - 투명도 변경', () => {
    it('일정 박스를 드래그하면 투명도가 0.5로 변경된다', async () => {
      // Given: 캘린더 월간 뷰에 2025-10-15의 "기존 회의" 일정이 존재
      setup(<App />);

      const monthView = await screen.findByTestId('month-view');
      const eventBox = within(monthView).getByText('기존 회의');
      const eventElement = eventBox.closest('[draggable]') as HTMLElement;

      // When: "기존 회의" 일정 박스를 클릭하고 드래그 시작
      // dragStart 이벤트 트리거
      const dataTransfer = new DataTransfer();
      const dragStartEvent = new DragEvent('dragstart', {
        bubbles: true,
        cancelable: true,
        dataTransfer,
      });
      eventElement.dispatchEvent(dragStartEvent);

      // Then: 일정 박스의 투명도가 0.5로 변경됨
      const styles = window.getComputedStyle(eventElement);
      expect(styles.opacity).toBe('0.5');
    });
  });

  describe('검증 포인트 3: 드래그 시작 - 속성 추가', () => {
    it('일정 박스를 드래그하면 data-dragging 속성이 추가된다', async () => {
      // Given: 캘린더 월간 뷰에 2025-10-15의 "기존 회의" 일정이 존재
      setup(<App />);

      const monthView = await screen.findByTestId('month-view');
      const eventBox = within(monthView).getByText('기존 회의');
      const eventElement = eventBox.closest('[draggable]') as HTMLElement;

      // When: "기존 회의" 일정 박스를 클릭하고 드래그 시작
      const dataTransfer = new DataTransfer();
      const dragStartEvent = new DragEvent('dragstart', {
        bubbles: true,
        cancelable: true,
        dataTransfer,
      });
      eventElement.dispatchEvent(dragStartEvent);

      // Then: 드래그 중임을 나타내는 data-dragging="true" 속성이 추가됨
      expect(eventElement).toHaveAttribute('data-dragging', 'true');
    });
  });

  describe('검증 포인트 4: 드롭 가능 영역 배경색 변경', () => {
    it('드롭 가능한 날짜 셀 위로 마우스를 이동하면 배경색이 변경된다', async () => {
      // Given: 2025-10-15의 "기존 회의" 일정을 드래그 중
      setup(<App />);

      const monthView = await screen.findByTestId('month-view');
      const eventBox = within(monthView).getByText('기존 회의');
      const eventElement = eventBox.closest('[draggable]') as HTMLElement;

      // 드래그 시작
      const dataTransfer = new DataTransfer();
      const dragStartEvent = new DragEvent('dragstart', {
        bubbles: true,
        cancelable: true,
        dataTransfer,
      });
      eventElement.dispatchEvent(dragStartEvent);

      // When: 마우스를 2025-10-20 날짜 셀 위로 이동 (다른 날짜로 드롭 테스트)
      // 월간 뷰에서 날짜 셀 찾기
      const dateCells = within(monthView).getAllByRole('cell');

      // 2025-10-20 날짜 셀 찾기 (20일이 표시된 셀)
      const targetCell = dateCells.find((cell) => {
        const dayNumber = within(cell).queryByText('20');
        return dayNumber !== null;
      });

      expect(targetCell).toBeDefined();

      // dragOver 이벤트 트리거
      const dragOverEvent = new DragEvent('dragover', {
        bubbles: true,
        cancelable: true,
        dataTransfer,
      });
      targetCell!.dispatchEvent(dragOverEvent);

      // Then: 2025-10-20 셀의 배경색이 #e3f2fd로 변경됨
      const styles = window.getComputedStyle(targetCell!);
      expect(styles.backgroundColor).toBe('rgb(227, 242, 253)'); // #e3f2fd의 RGB 값
    });
  });

  describe('검증 포인트 5: 드롭 가능 속성 추가', () => {
    it('드롭 가능한 날짜 셀에 data-droppable 속성이 추가된다', async () => {
      // Given: 2025-10-15의 "기존 회의" 일정을 드래그 중
      setup(<App />);

      const monthView = await screen.findByTestId('month-view');
      const eventBox = within(monthView).getByText('기존 회의');
      const eventElement = eventBox.closest('[draggable]') as HTMLElement;

      // 드래그 시작
      const dataTransfer = new DataTransfer();
      const dragStartEvent = new DragEvent('dragstart', {
        bubbles: true,
        cancelable: true,
        dataTransfer,
      });
      eventElement.dispatchEvent(dragStartEvent);

      // When: 마우스를 2025-10-20 날짜 셀 위로 이동
      const dateCells = within(monthView).getAllByRole('cell');

      // 2025-10-20 날짜 셀 찾기
      const targetCell = dateCells.find((cell) => {
        const dayNumber = within(cell).queryByText('20');
        return dayNumber !== null;
      });

      expect(targetCell).toBeDefined();

      // dragOver 이벤트 트리거
      const dragOverEvent = new DragEvent('dragover', {
        bubbles: true,
        cancelable: true,
        dataTransfer,
      });
      targetCell!.dispatchEvent(dragOverEvent);

      // Then: data-droppable="true" 속성이 해당 셀에 추가됨
      expect(targetCell).toHaveAttribute('data-droppable', 'true');
    });
  });

  describe('검증 포인트 6: 드롭 불가능 영역 커서 표시', () => {
    it('캘린더 외부 영역으로 마우스를 이동하면 not-allowed 커서가 표시된다', async () => {
      // Given: 2025-10-15의 "기존 회의" 일정을 드래그 중
      setup(<App />);

      const monthView = await screen.findByTestId('month-view');
      const eventBox = within(monthView).getByText('기존 회의');
      const eventElement = eventBox.closest('[draggable]') as HTMLElement;

      // 드래그 시작
      const dataTransfer = new DataTransfer();
      const dragStartEvent = new DragEvent('dragstart', {
        bubbles: true,
        cancelable: true,
        dataTransfer,
      });
      eventElement.dispatchEvent(dragStartEvent);

      // When: 마우스를 캘린더 외부 영역으로 이동
      // 캘린더 외부 영역 (예: 사이드바 영역) 찾기
      const eventList = screen.getByTestId('event-list');

      // dragOver 이벤트 트리거 (캘린더 외부)
      const dragOverEvent = new DragEvent('dragover', {
        bubbles: true,
        cancelable: true,
        dataTransfer,
      });
      eventList.dispatchEvent(dragOverEvent);

      // Then: 커서가 'not-allowed'로 변경됨
      // 드래그 중일 때 document.body 또는 특정 요소의 커서가 not-allowed로 설정되어야 함
      const styles = window.getComputedStyle(document.body);
      expect(styles.cursor).toBe('not-allowed');
    });
  });
});
