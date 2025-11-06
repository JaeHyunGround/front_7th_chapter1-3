import { Box } from '@mui/material';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import CheckboxForm from '../components/Form/CheckboxForm';

const meta = {
  title: 'Form/CheckboxForm',
  component: CheckboxForm,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    fullWidth: {
      control: 'boolean',
    },
  },
  args: {
    onChange: fn(),
  },
} satisfies Meta<typeof CheckboxForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: '기본 체크박스',
    checkedValue: false,
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

export const Checked: Story = {
  args: {
    label: '체크된 체크박스',
    checkedValue: true,
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
