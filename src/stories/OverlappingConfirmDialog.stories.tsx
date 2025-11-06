import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import OverlappingConfirmDialog from '../components/Dialog/OverlappingConfirmDialog';
import { Event } from '../types';

const meta = {
  title: 'Calendar/OverlappingConfirmDialog',
  component: OverlappingConfirmDialog,
  parameters: {
    layout: 'centered',
    docs: {
      canvas: {
        sourceState: 'shown',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    isOverlapDialogOpen: { control: 'boolean' },
  },
  args: {
    isOverlapDialogOpen: false, // Docs에서는 기본적으로 닫힌 상태
  },
} satisfies Meta<typeof OverlappingConfirmDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

const sampleOverlappingEvents: Event[] = [
  {
    id: '1',
    title: '기존 회의 일정',
    date: '2025-01-15',
    startTime: '09:00',
    endTime: '10:00',
    description: '팀 미팅',
    location: '회의실 A',
    category: '업무',
    repeat: { type: 'none', interval: 0 },
    notificationTime: 10,
  },
];

const multipleOverlappingEvents: Event[] = [
  {
    id: '1',
    title: '기존 회의 일정',
    date: '2025-01-15',
    startTime: '09:00',
    endTime: '10:00',
    description: '팀 미팅',
    location: '회의실 A',
    category: '업무',
    repeat: { type: 'none', interval: 0 },
    notificationTime: 10,
  },
  {
    id: '2',
    title: '프로젝트 리뷰',
    date: '2025-01-15',
    startTime: '09:30',
    endTime: '11:00',
    description: '주간 리뷰',
    location: '회의실 B',
    category: '업무',
    repeat: { type: 'none', interval: 0 },
    notificationTime: 15,
  },
  {
    id: '3',
    title: '클라이언트 미팅',
    date: '2025-01-15',
    startTime: '10:00',
    endTime: '11:30',
    description: '고객 면담',
    location: '회의실 C',
    category: '외부',
    repeat: { type: 'none', interval: 0 },
    notificationTime: 30,
  },
];

export const Default: Story = {
  args: {
    isOverlapDialogOpen: true,
    setIsOverlapDialogOpen: fn(),
    setPendingOverlapDropEvent: fn(),
    overlappingEvents: sampleOverlappingEvents,
    handleConfirmClick: fn(),
  },
  parameters: {
    docs: {
      story: {
        inline: false,
      },
    },
  },
  render: (args, context) => {
    // Docs에서는 Dialog를 닫힌 상태로 표시
    const isInDocs = context.viewMode === 'docs';
    return (
      <OverlappingConfirmDialog
        {...args}
        isOverlapDialogOpen={isInDocs ? false : args.isOverlapDialogOpen}
      />
    );
  },
};

export const MultipleOverlappingEvents: Story = {
  args: {
    isOverlapDialogOpen: true,
    setIsOverlapDialogOpen: fn(),
    setPendingOverlapDropEvent: fn(),
    overlappingEvents: multipleOverlappingEvents,
    handleConfirmClick: fn(),
  },
  parameters: {
    docs: {
      story: {
        inline: false,
      },
    },
  },
  render: (args, context) => {
    // Docs에서는 Dialog를 닫힌 상태로 표시
    const isInDocs = context.viewMode === 'docs';
    return (
      <OverlappingConfirmDialog
        {...args}
        isOverlapDialogOpen={isInDocs ? false : args.isOverlapDialogOpen}
      />
    );
  },
};

export const SingleOverlappingEvent: Story = {
  args: {
    isOverlapDialogOpen: true,
    setIsOverlapDialogOpen: fn(),
    setPendingOverlapDropEvent: fn(),
    overlappingEvents: sampleOverlappingEvents,
    handleConfirmClick: fn(),
  },
  parameters: {
    docs: {
      story: {
        inline: false,
      },
    },
  },
  render: (args, context) => {
    // Docs에서는 Dialog를 닫힌 상태로 표시
    const isInDocs = context.viewMode === 'docs';
    return (
      <OverlappingConfirmDialog
        {...args}
        isOverlapDialogOpen={isInDocs ? false : args.isOverlapDialogOpen}
      />
    );
  },
};
