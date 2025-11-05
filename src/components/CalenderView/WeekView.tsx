import {
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { DragEvent } from 'react';

import { eventBoxStyles, weekDays } from '../../constants';
import { Event, RepeatType } from '../../types';
import { fillZero, formatWeek } from '../../utils/dateUtils';
import DateCell from '../DateCell';

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
          {/* 일정 카드 */}
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
                          <DateCell
                            key={event.id}
                            event={event}
                            sx={{
                              ...eventBoxStyles.common,
                              ...(isNotified ? eventBoxStyles.notified : eventBoxStyles.normal),
                              cursor: 'grab',
                            }}
                            handleDragStart={handleDragStart}
                            handleDragEnd={handleDragEnd}
                            getRepeatTypeLabel={getRepeatTypeLabel}
                            isNotified={isNotified}
                            isRepeating={isRepeating}
                          />
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
