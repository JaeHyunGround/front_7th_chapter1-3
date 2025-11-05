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

import { weekDays } from '../../constants';
import { Event, RepeatType } from '../../types';
import { formatDate, formatMonth } from '../../utils/dateUtils';
import EventBox from '../EventBox';

export interface MonthViewProps {
  currentDate: Date;
  weeks: (number | null)[][];
  holidays: { [key: string]: string };
  handleDragLeaveCell: (e: DragEvent<HTMLElement>) => void;
  handleDragOverCell: (e: DragEvent<HTMLTableCellElement>, dateString: string) => void;
  handleDrop: (e: DragEvent<HTMLTableCellElement>, dateString: string) => void;
  handleDateCellClick: (dateString: string, day: number | null) => void;
  handleDragStart: (e: DragEvent<HTMLElement>, eventId: string) => void;
  handleDragEnd: (e: DragEvent<HTMLElement>) => void;
  getEventsForDay: (events: Event[], date: number) => Event[];
  getRepeatTypeLabel: (type: RepeatType) => string;
  dragOverCellDate: string | null;
  filteredEvents: Event[];
  notifiedEvents: string[];
}

const MonthView = ({
  currentDate,
  weeks,
  holidays,
  handleDragLeaveCell,
  handleDragOverCell,
  handleDrop,
  handleDateCellClick,
  handleDragStart,
  handleDragEnd,
  getEventsForDay,
  getRepeatTypeLabel,
  dragOverCellDate,
  filteredEvents,
  notifiedEvents,
}: MonthViewProps) => {
  return (
    <Stack data-testid="month-view" spacing={4} sx={{ width: '100%' }}>
      <Typography variant="h5">{formatMonth(currentDate)}</Typography>
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
            {weeks.map((week, weekIndex) => (
              <TableRow key={weekIndex}>
                {week.map((day, dayIndex) => {
                  const dateString = day ? formatDate(currentDate, day) : '';
                  const holiday = holidays[dateString];

                  return (
                    <TableCell
                      key={dayIndex}
                      role="cell"
                      onClick={() => handleDateCellClick(dateString, day)}
                      onDragOver={(e) => day && handleDragOverCell(e, dateString)}
                      onDragLeave={(e) => handleDragLeaveCell(e)}
                      onDrop={(e) => day && handleDrop(e, dateString)}
                      style={{
                        backgroundColor:
                          dragOverCellDate === dateString ? '#e3f2fd' : 'transparent',
                      }}
                      sx={{
                        height: '120px',
                        verticalAlign: 'top',
                        width: '14.28%',
                        padding: 1,
                        border: '1px solid #e0e0e0',
                        overflow: 'hidden',
                        position: 'relative',
                      }}
                    >
                      {day && (
                        <>
                          <Typography variant="body2" fontWeight="bold">
                            {day}
                          </Typography>
                          {holiday && (
                            <Typography variant="body2" color="error">
                              {holiday}
                            </Typography>
                          )}
                          {getEventsForDay(filteredEvents, day).map((event) => {
                            const isNotified = notifiedEvents.includes(event.id);
                            const isRepeating = event.repeat.type !== 'none';

                            return (
                              <EventBox
                                key={event.id}
                                event={event}
                                sx={{
                                  p: 0.5,
                                  my: 0.5,
                                  backgroundColor: isNotified ? '#ffebee' : '#f5f5f5',
                                  borderRadius: 1,
                                  fontWeight: isNotified ? 'bold' : 'normal',
                                  color: isNotified ? '#d32f2f' : 'inherit',
                                  minHeight: '18px',
                                  width: '100%',
                                  overflow: 'hidden',
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
                        </>
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Stack>
  );
};

export default MonthView;
