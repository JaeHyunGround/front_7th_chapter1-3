import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { SnackbarProvider } from 'notistack';
import { ReactElement } from 'react';

import { setupMockHandlerListCreation } from '../../__mocks__/handlersUtils';
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

describe('월 뷰에서 비어있는 날짜 셀 클릭', () => {
  beforeEach(() => {
    // 이벤트가 없는 상태로 초기화 (2025-10-15에 이벤트가 있으므로 빈 이벤트 리스트로 설정)
    setupMockHandlerListCreation([]);
  });

  // 검증 포인트 1: 현재 월의 날짜 셀 클릭
  it('현재 월의 비어있는 날짜 셀(2025-10-15)을 클릭하면 폼의 날짜 필드에 "2025-10-15"가 자동으로 채워져야 한다', async () => {
    const { user } = setup(<App />);

    // Given: 월 뷰에서 2025-10-15 날짜 셀 (이벤트 없음)
    await screen.findByText('일정 로딩 완료!');

    const monthView = screen.getByTestId('month-view');
    const dateCell = within(monthView).getByText('15').closest('td');

    expect(dateCell).toBeInTheDocument();

    // When: 해당 셀을 클릭
    await user.click(dateCell!);

    // Then: 폼의 날짜 필드에 "2025-10-15"가 자동으로 채워짐
    const dateInput = screen.getByLabelText('날짜') as HTMLInputElement;
    expect(dateInput.value).toBe('2025-10-15');
  });

  // 테스트 케이스 2: 올바른 형식 검증
  it('날짜 셀을 클릭하면 날짜 필드에 올바른 형식(YYYY-MM-DD)으로 채워져야 한다', async () => {
    const { user } = setup(<App />);

    await screen.findByText('일정 로딩 완료!');

    const monthView = screen.getByTestId('month-view');

    // 2025-10-01 클릭
    const dateCell1 = within(monthView).getByText('1').closest('td');
    await user.click(dateCell1!);

    const dateInput = screen.getByLabelText('날짜') as HTMLInputElement;
    expect(dateInput.value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(dateInput.value).toBe('2025-10-01');
  });

  // 테스트 데이터: 현재 월의 첫 날
  it('현재 월의 첫 날 셀(2025-10-01)을 클릭하면 폼의 날짜 필드에 "2025-10-01"이 채워져야 한다', async () => {
    const { user } = setup(<App />);

    await screen.findByText('일정 로딩 완료!');

    const monthView = screen.getByTestId('month-view');
    const dateCell = within(monthView).getByText('1').closest('td');

    expect(dateCell).toBeInTheDocument();

    await user.click(dateCell!);

    const dateInput = screen.getByLabelText('날짜') as HTMLInputElement;
    expect(dateInput.value).toBe('2025-10-01');
  });

  // 테스트 데이터: 현재 월의 마지막 날
  it('현재 월의 마지막 날 셀(2025-10-31)을 클릭하면 폼의 날짜 필드에 "2025-10-31"이 채워져야 한다', async () => {
    const { user } = setup(<App />);

    await screen.findByText('일정 로딩 완료!');

    const monthView = screen.getByTestId('month-view');
    const dateCell = within(monthView).getByText('31').closest('td');

    expect(dateCell).toBeInTheDocument();

    await user.click(dateCell!);

    const dateInput = screen.getByLabelText('날짜') as HTMLInputElement;
    expect(dateInput.value).toBe('2025-10-31');
  });
});
