import Notifications from '@mui/icons-material/Notifications';
import Repeat from '@mui/icons-material/Repeat';
import { Box, Stack, SxProps, Theme, Tooltip, Typography } from '@mui/material';
import { DragEvent } from 'react';

import { Event, RepeatType } from '../types';

export interface EventCellProps {
  event: Event;
  sx: SxProps<Theme> | undefined;
  handleDragStart: (e: DragEvent<HTMLElement>, eventId: string) => void;
  handleDragEnd: (e: DragEvent<HTMLElement>) => void;
  getRepeatTypeLabel: (type: RepeatType) => string;
  isNotified: boolean;
  isRepeating: boolean;
}

const EventCell = ({
  event,
  sx,
  handleDragStart,
  handleDragEnd,
  getRepeatTypeLabel,
  isNotified,
  isRepeating,
}: EventCellProps) => {
  return (
    <Box
      key={event.id}
      draggable
      onDragStart={(e) => handleDragStart(e, event.id)}
      onDragEnd={handleDragEnd}
      sx={sx}
    >
      <Stack direction="row" spacing={1} alignItems="center">
        {isNotified && <Notifications fontSize="small" />}
        {/* ! TEST CASE */}
        {isRepeating && (
          <Tooltip
            title={`${event.repeat.interval}${getRepeatTypeLabel(event.repeat.type)}마다 반복${
              event.repeat.endDate ? ` (종료: ${event.repeat.endDate})` : ''
            }`}
          >
            <Repeat fontSize="small" />
          </Tooltip>
        )}
        <Typography variant="caption" noWrap sx={{ fontSize: '0.75rem', lineHeight: 1.2 }}>
          {event.title}
        </Typography>
      </Stack>
    </Box>
  );
};

export default EventCell;
