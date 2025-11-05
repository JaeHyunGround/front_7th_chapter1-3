import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import MonthView from '../components/CalenderView/MonthView';
import { Event, RepeatType } from '../types';

const meta = {
  title: 'Calendar/MonthView',
  component: MonthView,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    currentDate: { control: 'date' },
    weeks: { control: 'object' },
    holidays: { control: 'object' },
    dragOverCellDate: { control: 'text' },
    filteredEvents: { control: 'object' },
    notifiedEvents: { control: 'object' },
  },
  args: {
    handleDragLeaveCell: fn(),
    handleDragOverCell: fn(),
    handleDrop: fn(),
    handleDateCellClick: fn(),
    handleDragStart: fn(),
    handleDragEnd: fn(),
    getEventsForDay: (events: Event[], date: number) =>
      events.filter((event) => new Date(event.date).getDate() === date),
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
} satisfies Meta<typeof MonthView>;

export default meta;
type Story = StoryObj<typeof meta>;

const today = new Date();
const year = today.getFullYear();
const month = today.getMonth();

const firstDayOfMonth = new Date(year, month, 1);
const lastDayOfMonth = new Date(year, month + 1, 0);

const startDayOfWeek = firstDayOfMonth.getDay();
const totalDays = lastDayOfMonth.getDate();

const weeks: (number | null)[][] = [];
let week: (number | null)[] = [];
let day = 1;

for (let i = 0; i < startDayOfWeek; i++) {
  week.push(null);
}

while (day <= totalDays) {
  week.push(day);
  if (week.length === 7) {
    weeks.push(week);
    week = [];
  }
  day++;
}

if (week.length > 0) {
  while (week.length < 7) {
    week.push(null);
  }
  weeks.push(week);
}

const sampleEvents: Event[] = [
  {
    id: '1',
    title: '기존 회의',
    date: '2025-10-15',
    startTime: '09:00',
    endTime: '10:00',
    description: '기존 팀 미팅',
    location: '회의실 B',
    category: '업무',
    repeat: { type: 'none', interval: 0 },
    notificationTime: 10,
  },
];

export const Default: Story = {
  args: {
    currentDate: today,
    weeks,
    holidays: {},
    dragOverCellDate: null,
    filteredEvents: sampleEvents,
    notifiedEvents: [],
  },
};

export const WithNotifiedEvents: Story = {
  args: {
    ...Default.args,
    notifiedEvents: ['1'],
  },
};

export const DraggingOver: Story = {
  args: {
    ...Default.args,
    dragOverCellDate: `${year}-${String(month + 1).padStart(2, '0')}-12`,
  },
};

export const WithRecurringEvents: Story = {
  args: {
    ...Default.args,
    filteredEvents: [
      {
        id: '2',
        title: '매일 운동',
        date: `${year}-${String(month + 1).padStart(2, '0')}-05`,
        startTime: '07:00',
        endTime: '08:00',
        description: '매일 아침 운동',
        location: '홈짐',
        category: '건강',
        repeat: { type: 'daily', interval: 1 },
        notificationTime: 30,
      },
    ],
  },
};
