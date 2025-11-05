import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import WeekView from '../components/CalenderView/WeekView';
import { Event, RepeatType } from '../types';
import { fillZero, getWeekDates } from '../utils/dateUtils';

const meta = {
  title: 'Calendar/WeekView',
  component: WeekView,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    currentDate: { control: 'date' },
    weekDates: { control: 'object' },
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
} satisfies Meta<typeof WeekView>;

export default meta;
type Story = StoryObj<typeof meta>;

const today = new Date();
const year = today.getFullYear();
const month = today.getMonth();
const weekDates = getWeekDates(today);

const sampleEvents: Event[] = [
  {
    id: '1',
    title: '기존 회의',
    date: `${year}-${fillZero(month + 1)}-${fillZero(today.getDate())}`,
    startTime: '09:00',
    endTime: '10:00',
    description: '기존 팀 미팅',
    location: '회의실 B',
    category: '업무',
    repeat: { type: 'none', interval: 0 },
    notificationTime: 10,
  },
  {
    id: '2',
    title: '매일 운동',
    date: `${year}-${fillZero(month + 1)}-${fillZero(weekDates[1].getDate())}`,
    startTime: '07:00',
    endTime: '08:00',
    description: '매일 아침 운동',
    location: '홈짐',
    category: '건강',
    repeat: { type: 'daily', interval: 1 },
    notificationTime: 30,
  },
];

export const Default: Story = {
  args: {
    currentDate: today,
    weekDates,
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
    dragOverCellDate: `${year}-${fillZero(month + 1)}-${fillZero(weekDates[3].getDate())}`,
  },
};

export const WithRecurringEvents: Story = {
  args: {
    ...Default.args,
    filteredEvents: [
      {
        id: '3',
        title: '주간 회의',
        date: `${year}-${fillZero(month + 1)}-${fillZero(weekDates[1].getDate())}`,
        startTime: '14:00',
        endTime: '15:00',
        description: '매주 월요일 팀 회의',
        location: '회의실 A',
        category: '업무',
        repeat: { type: 'weekly', interval: 1 },
        notificationTime: 15,
      },
      {
        id: '4',
        title: '월급날',
        date: `${year}-${fillZero(month + 1)}-${fillZero(weekDates[4].getDate())}`,
        startTime: '00:00',
        endTime: '23:59',
        description: '매월 25일',
        location: '',
        category: '재정',
        repeat: { type: 'monthly', interval: 1, endDate: '2025-12-25' },
        notificationTime: 0,
      },
    ],
  },
};

export const WithMultipleEvents: Story = {
  args: {
    ...Default.args,
    filteredEvents: [
      {
        id: '5',
        title: '아침 회의',
        date: `${year}-${fillZero(month + 1)}-${fillZero(weekDates[1].getDate())}`,
        startTime: '09:00',
        endTime: '10:00',
        description: '아침 스탠드업',
        location: '회의실 A',
        category: '업무',
        repeat: { type: 'none', interval: 0 },
        notificationTime: 15,
      },
      {
        id: '6',
        title: '점심 식사',
        date: `${year}-${fillZero(month + 1)}-${fillZero(weekDates[1].getDate())}`,
        startTime: '12:00',
        endTime: '13:00',
        description: '팀 점심',
        location: '식당',
        category: '업무',
        repeat: { type: 'none', interval: 0 },
        notificationTime: 0,
      },
      {
        id: '7',
        title: '오후 미팅',
        date: `${year}-${fillZero(month + 1)}-${fillZero(weekDates[1].getDate())}`,
        startTime: '15:00',
        endTime: '16:00',
        description: '프로젝트 리뷰',
        location: '회의실 B',
        category: '업무',
        repeat: { type: 'none', interval: 0 },
        notificationTime: 30,
      },
    ],
  },
};
