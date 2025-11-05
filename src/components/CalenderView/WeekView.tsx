import Notifications from '@mui/icons-material/Notifications';
import Repeat from '@mui/icons-material/Repeat';
import {
  Box,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import { DragEvent } from 'react';

import { eventBoxStyles, weekDays } from '../../constants';
import { Event, RepeatType } from '../../types';
import { fillZero, formatWeek } from '../../utils/dateUtils';

export interface WeekViewProps {
  currentDate: Date;
  weekDates: Date[];
  holidays: { [key: string]: string };
  handleDateCellClick: (dateString: string, day: number | null) => void;
  handleDragOverCell: (e: DragEvent<HTMLTableCellElement>, dateString: string) => void;
  handleDragLeaveCell: (e: DragEvent<HTMLElement>) => void;
  handleDrop: (e: DragEvent<HTMLTableCellElement>, dateString: string) => void;
  handleDragStart: (e: DragEvent<HTMLElement>, eventId: string) => void;
  handleDragEnd: (e: DragEvent<HTMLElement>) => void;
  getRepeatTypeLabel: (type: RepeatType) => string;
  filteredEvents: Event[];
  dragOverCellDate: string | null;
  notifiedEvents: string[];
}

const WeekView = ({
  currentDate,
  weekDates,
  handleDateCellClick,
  handleDragOverCell,
  handleDragLeaveCell,
  handleDrop,
  handleDragStart,
  handleDragEnd,
  getRepeatTypeLabel,
  filteredEvents,
  dragOverCellDate,
  notifiedEvents,
}: WeekViewProps) => {
  return (
    <Stack data-testid="week-view" spacing={4} sx={{ width: '100%' }}>
      <Typography variant="h5">{formatWeek(currentDate)}</Typography>
      <TableContainer>
        <Table sx={{ tableLayout: 'fixed', width: '100%' }}>
          <TableHead>
            <TableRow>
              {weekDays.map((day) => (
                <TableCell key={day} sx={{ width: '14.28%', padding: 1, textAlign: 'center' }}>
                  {day}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              {weekDates.map((date) => {
                const dateString = [
                  date.getFullYear(),
                  fillZero(date.getMonth() + 1),
                  fillZero(date.getDate()),
                ].join('-');
                return (
                  <TableCell
                    key={date.toISOString()}
                    role="cell"
                    onClick={() => handleDateCellClick(dateString, date.getDate())}
                    onDragOver={(e) => handleDragOverCell(e, dateString)}
                    onDragLeave={handleDragLeaveCell}
                    onDrop={(e) => handleDrop(e, dateString)}
                    style={{
                      backgroundColor: dragOverCellDate === dateString ? '#e3f2fd' : 'transparent',
                    }}
                    sx={{
                      height: '120px',
                      verticalAlign: 'top',
                      width: '14.28%',
                      padding: 1,
                      border: '1px solid #e0e0e0',
                      overflow: 'hidden',
                    }}
                  >
                    <Typography variant="body2" fontWeight="bold">
                      {date.getDate()}
                    </Typography>
                    {filteredEvents
                      .filter(
                        (event) => new Date(event.date).toDateString() === date.toDateString()
                      )
                      .sort((a, b) => {
                        // 시작 시간 순으로 정렬
                        if (a.startTime < b.startTime) return -1;
                        if (a.startTime > b.startTime) return 1;
                        return 0;
                      })
                      .map((event) => {
                        const isNotified = notifiedEvents.includes(event.id);
                        const isRepeating = event.repeat.type !== 'none';

                        return (
                          <Box
                            key={event.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, event.id)}
                            onDragEnd={handleDragEnd}
                            sx={{
                              ...eventBoxStyles.common,
                              ...(isNotified ? eventBoxStyles.notified : eventBoxStyles.normal),
                              cursor: 'grab',
                            }}
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
                              <Typography
                                variant="caption"
                                noWrap
                                sx={{ fontSize: '0.75rem', lineHeight: 1.2 }}
                              >
                                {event.title}
                              </Typography>
                            </Stack>
                          </Box>
                        );
                      })}
                  </TableCell>
                );
              })}
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    </Stack>
  );
};

export default WeekView;
