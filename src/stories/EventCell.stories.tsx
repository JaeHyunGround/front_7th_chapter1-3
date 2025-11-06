import { Box } from '@mui/material';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import EventCell from '../components/EventCell';
import { eventBoxStyles } from '../constants';
import { RepeatType } from '../types';

const meta = {
  title: 'Calendar/EventCell',
  component: EventCell,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    isNotified: { control: 'boolean' },
    isRepeating: { control: 'boolean' },
  },
  args: {
    handleDragStart: fn(),
    handleDragEnd: fn(),
    getRepeatTypeLabel: (type: RepeatType) => {
      switch (type) {
        case 'daily':
          return '일';
        case 'weekly':
          return '주';
        case 'monthly':
          return '개월';
        case 'yearly':
          return '년';
        default:
          return '';
      }
    },
  },
} satisfies Meta<typeof EventCell>;

export default meta;
type Story = StoryObj<typeof meta>;

const sampleEvent = {
  id: '1',
  title: '회의 일정',
  date: '2025-01-15',
  startTime: '09:00',
  endTime: '10:00',
  description: '팀 미팅',
  location: '회의실 A',
  category: '업무',
  repeat: { type: 'none' as RepeatType, interval: 0 },
  notificationTime: 10,
};

export const Default: Story = {
  args: {
    event: sampleEvent,
    sx: {
      ...eventBoxStyles.common,
      ...eventBoxStyles.normal,
    },
    isNotified: false,
    isRepeating: false,
  },
  decorators: [
    (Story) => (
      <Box sx={{ width: 200, p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
        <Story />
      </Box>
    ),
  ],
};

export const WithNotified: Story = {
  args: {
    event: sampleEvent,
    sx: {
      ...eventBoxStyles.common,
      ...eventBoxStyles.notified,
    },
    isNotified: true,
    isRepeating: false,
  },
  decorators: [
    (Story) => (
      <Box sx={{ width: 200, p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
        <Story />
      </Box>
    ),
  ],
};

export const WithRepeating: Story = {
  args: {
    event: {
      ...sampleEvent,
      repeat: { type: 'daily' as RepeatType, interval: 1 },
    },
    sx: {
      ...eventBoxStyles.common,
      ...eventBoxStyles.normal,
    },
    isNotified: false,
    isRepeating: true,
  },
  decorators: [
    (Story) => (
      <Box sx={{ width: 200, p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
        <Story />
      </Box>
    ),
  ],
};

export const WithNotifiedAndRepeating: Story = {
  args: {
    event: {
      ...sampleEvent,
      repeat: { type: 'weekly' as RepeatType, interval: 2, endDate: '2025-12-31' },
    },
    sx: {
      ...eventBoxStyles.common,
      ...eventBoxStyles.notified,
    },
    isNotified: true,
    isRepeating: true,
  },
  decorators: [
    (Story) => (
      <Box sx={{ width: 200, p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
        <Story />
      </Box>
    ),
  ],
};
