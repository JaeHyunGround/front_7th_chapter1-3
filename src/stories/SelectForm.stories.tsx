import { Box } from '@mui/material';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import SelectForm from '../components/Form/SelectForm';

const meta = {
  title: 'Form/SelectForm',
  component: SelectForm,
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
} satisfies Meta<typeof SelectForm>;

export default meta;
type Story = StoryObj<typeof meta>;

const defaultOptions = [
  { value: 'option1', label: '옵션 1', ariaLabel: '옵션 1 선택' },
  { value: 'option2', label: '옵션 2', ariaLabel: '옵션 2 선택' },
  { value: 'option3', label: '옵션 3', ariaLabel: '옵션 3 선택' },
];

export const Default: Story = {
  args: {
    id: 'default-select',
    label: '기본',
    labelId: 'default-select-label',
    value: '',
    options: defaultOptions,
    ariaLabel: '기본',
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
    id: 'value-select',
    label: '값 선택',
    labelId: 'value-select-label',
    value: 'option2',
    options: defaultOptions,
    ariaLabel: '값 선택',
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
