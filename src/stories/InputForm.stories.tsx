import { Box } from '@mui/material';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import InputForm from '../components/Form/InputForm';

const meta = {
  title: 'Form/InputForm',
  component: InputForm,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    id: {
      description: '입력 필드의 고유 식별자',
      control: 'text',
    },
    label: {
      description: '입력 필드의 레이블 텍스트',
      control: 'text',
    },
    value: {
      description: '입력 필드의 값 (문자열 또는 숫자)',
      control: 'text',
    },
    type: {
      description: '입력 필드의 타입 (text, date, time, number)',
      control: 'select',
      options: ['text', 'date', 'time', 'number'],
    },
    onChange: {
      description: '값이 변경될 때 호출되는 콜백 함수',
      action: 'changed',
    },
    onBlur: {
      description: '입력 필드가 포커스를 잃을 때 호출되는 콜백 함수',
      action: 'blurred',
    },
    error: {
      description:
        '에러 메시지 (문자열) 또는 에러 상태 (불린값). 에러가 있으면 Tooltip으로 표시됩니다.',
      control: 'text',
    },
    fullWidth: {
      description: '입력 필드가 전체 너비를 차지할지 여부',
      control: 'boolean',
    },
  },
  args: {
    onChange: fn(),
    onBlur: fn(),
  },
} satisfies Meta<typeof InputForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    id: 'default-input',
    label: '기본',
    value: '',
    type: 'text',
    fullWidth: true,
  },
  decorators: [
    (Story) => (
      <Box sx={{ width: 400, p: 2 }}>
        <Story />
      </Box>
    ),
  ],
};

export const WithValue: Story = {
  args: {
    id: 'value-input',
    label: '값이 있을 때',
    value: '입력된 텍스트',
    type: 'text',
    fullWidth: true,
  },
  decorators: [
    (Story) => (
      <Box sx={{ width: 400, p: 2 }}>
        <Story />
      </Box>
    ),
  ],
};

export const WithError: Story = {
  args: {
    id: 'error-input',
    label: '에러',
    value: '잘못된 값',
    type: 'text',
    error: '에러 Tooltip 출력',
    fullWidth: true,
  },
  decorators: [
    (Story) => (
      <Box sx={{ width: 400, p: 2 }}>
        <Story />
      </Box>
    ),
  ],
};

export const DateType: Story = {
  args: {
    id: 'date-input',
    label: '날짜 입력',
    value: '2025-01-15',
    type: 'date',
    fullWidth: true,
  },
  decorators: [
    (Story) => (
      <Box sx={{ width: 400, p: 2 }}>
        <Story />
      </Box>
    ),
  ],
};

export const TimeType: Story = {
  args: {
    id: 'time-input',
    label: '시간 입력',
    value: '09:00',
    type: 'time',
    fullWidth: true,
  },
  decorators: [
    (Story) => (
      <Box sx={{ width: 400, p: 2 }}>
        <Story />
      </Box>
    ),
  ],
};

export const NumberType: Story = {
  args: {
    id: 'number-input',
    label: '숫자 입력',
    value: 100,
    type: 'number',
    fullWidth: true,
  },
  decorators: [
    (Story) => (
      <Box sx={{ width: 400, p: 2 }}>
        <Story />
      </Box>
    ),
  ],
};
