import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import RecurringEventDialog from '../components/Dialog/RecurringEventDialog';
import { Event } from '../types';

const meta = {
  title: 'Calendar/RecurringEventDialog',
  component: RecurringEventDialog,
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
    open: { control: 'boolean' },
    mode: {
      control: 'select',
      options: ['edit', 'delete'],
    },
  },
  args: {
    open: false, // Docs에서는 기본적으로 닫힌 상태
    onClose: fn(),
    onConfirm: fn(),
    mode: 'edit',
  },
} satisfies Meta<typeof RecurringEventDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

const sampleRecurringEvent: Event = {
  id: '1',
  title: '주간 팀 미팅',
  date: '2025-01-15',
  startTime: '09:00',
  endTime: '10:00',
  description: '매주 팀 미팅',
  location: '회의실 A',
  category: '업무',
  repeat: { type: 'weekly', interval: 1 },
  notificationTime: 10,
};

export const EditMode: Story = {
  args: {
    open: true,
    onClose: fn(),
    onConfirm: fn(),
    event: sampleRecurringEvent,
    mode: 'edit',
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
    return <RecurringEventDialog {...args} open={isInDocs ? false : args.open} />;
  },
};

export const DeleteMode: Story = {
  args: {
    open: true,
    onClose: fn(),
    onConfirm: fn(),
    event: sampleRecurringEvent,
    mode: 'delete',
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
    return <RecurringEventDialog {...args} open={isInDocs ? false : args.open} />;
  },
};
