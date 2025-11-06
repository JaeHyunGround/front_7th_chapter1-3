import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { SnackbarProvider } from 'notistack';
import { ReactElement } from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { setupMockHandlerUpdating } from '../../__mocks__/handlersUtils';
import App from '../../App';

const theme = createTheme();

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

describe('캘린더 날짜 선택 통합 테스트', () => {
  beforeEach(() => {
    // 날짜를 2025-11-20으로 고정
    vi.setSystemTime(new Date('2025-11-20T10:00:00'));
  });

  it('월간뷰에서 캘린더 날짜 클릭 시 왼쪽 폼에 날짜가 반영된다', async () => {
    setupMockHandlerUpdating([]);
    const { user } = setup(<App />);

    // 일정 로딩 완료 대기
    await screen.findByText('일정 로딩 완료!');

    // 월간 뷰 확인
    const monthView = screen.getByTestId('month-view');
    expect(monthView).toBeInTheDocument();

    // 날짜 셀 찾기 (21일)
    const dateCells = within(monthView).getAllByRole('cell');
    const targetDateCell = dateCells.find((cell) => {
      const dayText = cell.textContent;
      return dayText && dayText.includes('21') && !dayText.includes('팀 회의');
    });

    expect(targetDateCell).toBeDefined();

    // 날짜 셀 클릭
    await user.click(targetDateCell!);

    // 폼의 날짜 필드에 2025-11-21이 반영되었는지 확인
    const dateInput = screen.getByLabelText('날짜');
    expect(dateInput).toHaveValue('2025-11-21');
  });

  it('주간뷰에서 캘린더 날짜 클릭 시 왼쪽 폼에 날짜가 반영된다', async () => {
    setupMockHandlerUpdating([]);
    const { user } = setup(<App />);

    // 일정 로딩 완료 대기
    await screen.findByText('일정 로딩 완료!');

    // 주간 뷰로 전환
    const viewSelect = within(screen.getByLabelText('뷰 타입 선택')).getByRole('combobox');
    await user.click(viewSelect);
    await user.click(screen.getByRole('option', { name: 'week-option' }));

    // 주간 뷰 확인
    const weekView = screen.getByTestId('week-view');
    expect(weekView).toBeInTheDocument();

    // 날짜 셀 찾기 (21일)
    const dateCells = within(weekView).getAllByRole('cell');
    const targetDateCell = dateCells.find((cell) => {
      const dayText = cell.textContent;
      return dayText && dayText.includes('21');
    });

    expect(targetDateCell).toBeDefined();

    // 날짜 셀 클릭
    await user.click(targetDateCell!);

    // 폼의 날짜 필드에 2025-11-21이 반영되었는지 확인
    const dateInput = screen.getByLabelText('날짜');
    expect(dateInput).toHaveValue('2025-11-21');
  });

  it('편집 모드일 때는 캘린더 날짜 클릭 시 폼에 날짜가 반영되지 않는다', async () => {
    setupMockHandlerUpdating([
      {
        id: '1',
        title: '기존 회의',
        date: '2025-11-20',
        startTime: '10:00',
        endTime: '11:00',
        description: '기존 회의 설명',
        location: '회의실 A',
        category: '업무',
        repeat: { type: 'none', interval: 0 },
        notificationTime: 10,
      },
    ]);

    const { user } = setup(<App />);

    // 일정 로딩 완료 대기
    await screen.findByText('일정 로딩 완료!');

    // 편집 모드로 전환
    const editButton = screen.getByLabelText('Edit event');
    await user.click(editButton);

    // 편집 모드인지 확인 (제목 필드에 기존 값이 있는지)
    const titleInput = screen.getByLabelText('제목');
    expect(titleInput).toHaveValue('기존 회의');

    // 현재 날짜 필드 값 확인
    const dateInputBefore = screen.getByLabelText('날짜');
    const dateBefore = dateInputBefore.getAttribute('value') || '';

    // 월간 뷰에서 다른 날짜 클릭 (21일)
    const monthView = screen.getByTestId('month-view');
    const dateCells = within(monthView).getAllByRole('cell');
    const targetDateCell = dateCells.find((cell) => {
      const dayText = cell.textContent;
      return dayText && dayText.includes('21') && !dayText.includes('기존 회의');
    });

    expect(targetDateCell).toBeDefined();

    // 날짜 셀 클릭
    await user.click(targetDateCell!);

    // 편집 모드에서는 날짜가 변경되지 않아야 함
    const dateInputAfter = screen.getByLabelText('날짜');
    expect(dateInputAfter).toHaveValue(dateBefore);
  });
});
