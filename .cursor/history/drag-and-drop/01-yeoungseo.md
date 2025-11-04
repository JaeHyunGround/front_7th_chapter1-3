# Write functional code for existing tests
_Exported on 2025. 11. 3. at 23시 24분 10초 GMT+9 from Cursor (2.0.38)_

---

**User**

@Yeongseo.md @01-drag-start-and-visual-feedback.spec.tsx 



작성된 테스트 코드를 통과하는 기능 코드를 작성해줘.



단, 기능 코드를 추가했을 때 **기존의 테스트 코드는 절대로 실패하면 안돼**

---

**Cursor**

네, 테스트 코드를 분석하고 통과시키는 기능 코드를 작성하겠습니다. 먼저 현재 프로젝트 구조를 파악하겠습니다.

테스트 코드를 분석했습니다. 드래그 앤 드롭 기능을 구현하기 위해 필요한 기능을 파악했습니다:

1. **이벤트 박스**: `draggable="true"`, `cursor: grab` 스타일
2. **드래그 시작**: 투명도 0.5, `data-dragging="true"` 속성
3. **드롭 영역**: dragover 시 배경색 변경, `data-droppable="true"` 속성
4. **캘린더 외부**: `cursor: not-allowed`

이제 App.tsx에 드래그 앤 드롭 기능을 추가하겠습니다.

```typescriptreact
import ChevronLeft from '@mui/icons-material/ChevronLeft';
import ChevronRight from '@mui/icons-material/ChevronRight';
import Close from '@mui/icons-material/Close';
import Delete from '@mui/icons-material/Delete';
import Edit from '@mui/icons-material/Edit';
import Notifications from '@mui/icons-material/Notifications';
import Repeat from '@mui/icons-material/Repeat';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormLabel,
  IconButton,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useSnackbar } from 'notistack';
import { DragEvent as ReactDragEvent, useState } from 'react';

import RecurringEventDialog from './components/RecurringEventDialog.tsx';
import { useCalendarView } from './hooks/useCalendarView.ts';
import { useEventForm } from './hooks/useEventForm.ts';
import { useEventOperations } from './hooks/useEventOperations.ts';
import { useNotifications } from './hooks/useNotifications.ts';
import { useRecurringEventOperations } from './hooks/useRecurringEventOperations.ts';
import { useSearch } from './hooks/useSearch.ts';
import { Event, EventForm, RepeatType } from './types.ts';
import {
  formatDate,
  formatMonth,
  formatWeek,
  getEventsForDay,
  getWeekDates,
  getWeeksAtMonth,
} from './utils/dateUtils.ts';
import { findOverlappingEvents } from './utils/eventOverlap.ts';
import { getTimeErrorMessage } from './utils/timeValidation.ts';

const categories = ['업무', '개인', '가족', '기타'];

const weekDays = ['일', '월', '화', '수', '목', '금', '토'];

const notificationOptions = [
  { value: 1, label: '1분 전' },
  { value: 10, label: '10분 전' },
  { value: 60, label: '1시간 전' },
  { value: 120, label: '2시간 전' },
  { value: 1440, label: '1일 전' },
];

// 스타일 상수
const eventBoxStyles = {
  notified: {
    backgroundColor: '#ffebee',
    fontWeight: 'bold',
    color: '#d32f2f',
  },
  normal: {
    backgroundColor: '#f5f5f5',
    fontWeight: 'normal',
    color: 'inherit',
  },
  common: {
    p: 0.5,
    my: 0.5,
    borderRadius: 1,
    minHeight: '18px',
    width: '100%',
    overflow: 'hidden',
  },
};

const getRepeatTypeLabel = (type: RepeatType): string => {
  switch (type) {
    case 'daily':
      return '일';
    case 'weekly':
      return '주';
    case 'monthly':
      return '월';
    case 'yearly':
      return '년';
    default:
      return '';
  }
};

function App() {
  const {
    title,
    setTitle,
    date,
    setDate,
    startTime,
    endTime,
    description,
    setDescription,
    location,
    setLocation,
    category,
    setCategory,
    isRepeating,
    setIsRepeating,
    repeatType,
    setRepeatType,
    repeatInterval,
    setRepeatInterval,
    repeatEndDate,
    setRepeatEndDate,
    notificationTime,
    setNotificationTime,
    startTimeError,
    endTimeError,
    editingEvent,
    setEditingEvent,
    handleStartTimeChange,
    handleEndTimeChange,
    resetForm,
    editEvent,
  } = useEventForm();

  const { events, saveEvent, deleteEvent, createRepeatEvent, fetchEvents } = useEventOperations(
    Boolean(editingEvent),
    () => setEditingEvent(null)
  );

  const { handleRecurringEdit, handleRecurringDelete } = useRecurringEventOperations(
    events,
    async () => {
      // After recurring edit, refresh events from server
      await fetchEvents();
    }
  );

  const { notifications, notifiedEvents, setNotifications } = useNotifications(events);
  const { view, setView, currentDate, holidays, navigate } = useCalendarView();
  const { searchTerm, filteredEvents, setSearchTerm } = useSearch(events, currentDate, view);

  const [isOverlapDialogOpen, setIsOverlapDialogOpen] = useState(false);
  const [overlappingEvents, setOverlappingEvents] = useState<Event[]>([]);
  const [isRecurringDialogOpen, setIsRecurringDialogOpen] = useState(false);
  const [pendingRecurringEdit, setPendingRecurringEdit] = useState<Event | null>(null);
  const [pendingRecurringDelete, setPendingRecurringDelete] = useState<Event | null>(null);
  const [recurringEditMode, setRecurringEditMode] = useState<boolean | null>(null); // true = single, false = all
  const [recurringDialogMode, setRecurringDialogMode] = useState<'edit' | 'delete'>('edit');

  const { enqueueSnackbar } = useSnackbar();

  const handleRecurringConfirm = async (editSingleOnly: boolean) => {
    if (recurringDialogMode === 'edit' && pendingRecurringEdit) {
      // 편집 모드 저장하고 편집 폼으로 이동
      setRecurringEditMode(editSingleOnly);
      editEvent(pendingRecurringEdit);
      setIsRecurringDialogOpen(false);
      setPendingRecurringEdit(null);
    } else if (recurringDialogMode === 'delete' && pendingRecurringDelete) {
      // 반복 일정 삭제 처리
      try {
        await handleRecurringDelete(pendingRecurringDelete, editSingleOnly);
        enqueueSnackbar('일정이 삭제되었습니다', { variant: 'success' });
      } catch (error) {
        console.error(error);
        enqueueSnackbar('일정 삭제 실패', { variant: 'error' });
      }
      setIsRecurringDialogOpen(false);
      setPendingRecurringDelete(null);
    }
  };

  const isRecurringEvent = (event: Event): boolean => {
    return event.repeat.type !== 'none' && event.repeat.interval > 0;
  };

  const handleEditEvent = (event: Event) => {
    if (isRecurringEvent(event)) {
      // Show recurring edit dialog
      setPendingRecurringEdit(event);
      setRecurringDialogMode('edit');
      setIsRecurringDialogOpen(true);
    } else {
      // Regular event editing
      editEvent(event);
    }
  };

  const handleDeleteEvent = (event: Event) => {
    if (isRecurringEvent(event)) {
      // Show recurring delete dialog
      setPendingRecurringDelete(event);
      setRecurringDialogMode('delete');
      setIsRecurringDialogOpen(true);
    } else {
      // Regular event deletion
      deleteEvent(event.id);
    }
  };

  const addOrUpdateEvent = async () => {
    if (!title || !date || !startTime || !endTime) {
      enqueueSnackbar('필수 정보를 모두 입력해주세요.', { variant: 'error' });
      return;
    }

    if (startTimeError || endTimeError) {
      enqueueSnackbar('시간 설정을 확인해주세요.', { variant: 'error' });
      return;
    }

    const eventData: Event | EventForm = {
      id: editingEvent ? editingEvent.id : undefined,
      title,
      date,
      startTime,
      endTime,
      description,
      location,
      category,
      repeat: editingEvent
        ? editingEvent.repeat // Keep original repeat settings for recurring event detection
        : {
            type: isRepeating ? repeatType : 'none',
            interval: repeatInterval,
            endDate: repeatEndDate || undefined,
          },
      notificationTime,
    };

    const overlapping = findOverlappingEvents(eventData, events);
    const hasOverlapEvent = overlapping.length > 0;

    // 수정
    if (editingEvent) {
      if (hasOverlapEvent) {
        setOverlappingEvents(overlapping);
        setIsOverlapDialogOpen(true);
        return;
      }

      if (
        editingEvent.repeat.type !== 'none' &&
        editingEvent.repeat.interval > 0 &&
        recurringEditMode !== null
      ) {
        await handleRecurringEdit(eventData as Event, recurringEditMode);
        setRecurringEditMode(null);
      } else {
        await saveEvent(eventData);
      }

      resetForm();
      return;
    }

    // 생성
    if (isRepeating) {
      // 반복 생성은 반복 일정을 고려하지 않는다.
      await createRepeatEvent(eventData);
      resetForm();
      return;
    }

    if (hasOverlapEvent) {
      setOverlappingEvents(overlapping);
      setIsOverlapDialogOpen(true);
      return;
    }

    await saveEvent(eventData);
    resetForm();
  };

  const renderWeekView = () => {
    const weekDates = getWeekDates(currentDate);
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
                {weekDates.map((date) => (
                  <TableCell
                    key={date.toISOString()}
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
                      .map((event) => {
                        const isNotified = notifiedEvents.includes(event.id);
                        const isRepeating = event.repeat.type !== 'none';

                        return (
                          <Box
                            key={event.id}
                            sx={{
                              ...eventBoxStyles.common,
                              ...(isNotified ? eventBoxStyles.notified : eventBoxStyles.normal),
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
                ))}
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Stack>
    );
  };

  const renderMonthView = () => {
    const weeks = getWeeksAtMonth(currentDate);

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
                                <Box
                                  key={event.id}
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
                                  }}
                                >
                                  <Stack direction="row" spacing={1} alignItems="center">
                                    {isNotified && <Notifications fontSize="small" />}
                                    {/* ! TEST CASE */}
                                    {isRepeating && (
                                      <Tooltip
                                        title={`${event.repeat.interval}${getRepeatTypeLabel(event.repeat.type)}마다 반복${
                                          event.repeat.endDate
                                            ? ` (종료: ${event.repeat.endDate})`
                                            : ''
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

  return (
    <Box sx={{ width: '100%', height: '100vh', margin: 'auto', p: 5 }}>
      <Stack direction="row" spacing={6} sx={{ height: '100%' }}>
        <Stack spacing={2} sx={{ width: '20%' }}>
          <Typography variant="h4">{editingEvent ? '일정 수정' : '일정 추가'}</Typography>

          <FormControl fullWidth>
            <FormLabel htmlFor="title">제목</FormLabel>
            <TextField
              id="title"
              size="small"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </FormControl>

          <FormControl fullWidth>
            <FormLabel htmlFor="date">날짜</FormLabel>
            <TextField
              id="date"
              size="small"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </FormControl>

          <Stack direction="row" spacing={2}>
            <FormControl fullWidth>
              <FormLabel htmlFor="start-time">시작 시간</FormLabel>
              <Tooltip title={startTimeError || ''} open={!!startTimeError} placement="top">
                <TextField
                  id="start-time"
                  size="small"
                  type="time"
                  value={startTime}
                  onChange={handleStartTimeChange}
                  onBlur={() => getTimeErrorMessage(startTime, endTime)}
                  error={!!startTimeError}
                />
              </Tooltip>
            </FormControl>
            <FormControl fullWidth>
              <FormLabel htmlFor="end-time">종료 시간</FormLabel>
              <Tooltip title={endTimeError || ''} open={!!endTimeError} placement="top">
                <TextField
                  id="end-time"
                  size="small"
                  type="time"
                  value={endTime}
                  onChange={handleEndTimeChange}
                  onBlur={() => getTimeErrorMessage(startTime, endTime)}
                  error={!!endTimeError}
                />
              </Tooltip>
            </FormControl>
          </Stack>

          <FormControl fullWidth>
            <FormLabel htmlFor="description">설명</FormLabel>
            <TextField
              id="description"
              size="small"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </FormControl>

          <FormControl fullWidth>
            <FormLabel htmlFor="location">위치</FormLabel>
            <TextField
              id="location"
              size="small"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </FormControl>

          <FormControl fullWidth>
            <FormLabel id="category-label">카테고리</FormLabel>
            <Select
              id="category"
              size="small"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              aria-labelledby="category-label"
              aria-label="카테고리"
            >
              {categories.map((cat) => (
                <MenuItem key={cat} value={cat} aria-label={`${cat}-option`}>
                  {cat}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {!editingEvent && (
            <FormControl>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={isRepeating}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setIsRepeating(checked);
                      if (checked) {
                        setRepeatType('daily');
                      } else {
                        setRepeatType('none');
                      }
                    }}
                  />
                }
                label="반복 일정"
              />
            </FormControl>
          )}

          {/* ! TEST CASE */}
          {isRepeating && !editingEvent && (
            <Stack spacing={2}>
              <FormControl fullWidth>
                <FormLabel>반복 유형</FormLabel>
                <Select
                  size="small"
                  value={repeatType}
                  aria-label="반복 유형"
                  onChange={(e) => setRepeatType(e.target.value as RepeatType)}
                >
                  <MenuItem value="daily" aria-label="daily-option">
                    매일
                  </MenuItem>
                  <MenuItem value="weekly" aria-label="weekly-option">
                    매주
                  </MenuItem>
                  <MenuItem value="monthly" aria-label="monthly-option">
                    매월
                  </MenuItem>
                  <MenuItem value="yearly" aria-label="yearly-option">
                    매년
                  </MenuItem>
                </Select>
              </FormControl>
              <Stack direction="row" spacing={2}>
                <FormControl fullWidth>
                  <FormLabel htmlFor="repeat-interval">반복 간격</FormLabel>
                  <TextField
                    id="repeat-interval"
                    size="small"
                    type="number"
                    value={repeatInterval}
                    onChange={(e) => setRepeatInterval(Number(e.target.value))}
                    slotProps={{ htmlInput: { min: 1 } }}
                  />
                </FormControl>
                <FormControl fullWidth>
                  <FormLabel htmlFor="repeat-end-date">반복 종료일</FormLabel>
                  <TextField
                    id="repeat-end-date"
                    size="small"
                    type="date"
                    value={repeatEndDate}
                    onChange={(e) => setRepeatEndDate(e.target.value)}
                  />
                </FormControl>
              </Stack>
            </Stack>
          )}

          <FormControl fullWidth>
            <FormLabel htmlFor="notification">알림 설정</FormLabel>
            <Select
              id="notification"
              size="small"
              value={notificationTime}
              onChange={(e) => setNotificationTime(Number(e.target.value))}
            >
              {notificationOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Button
            data-testid="event-submit-button"
            onClick={addOrUpdateEvent}
            variant="contained"
            color="primary"
          >
            {editingEvent ? '일정 수정' : '일정 추가'}
          </Button>
        </Stack>

        <Stack flex={1} spacing={5}>
          <Typography variant="h4">일정 보기</Typography>

          <Stack direction="row" spacing={2} justifyContent="space-between" alignItems="center">
            <IconButton aria-label="Previous" onClick={() => navigate('prev')}>
              <ChevronLeft />
            </IconButton>
            <Select
              size="small"
              aria-label="뷰 타입 선택"
              value={view}
              onChange={(e) => setView(e.target.value as 'week' | 'month')}
            >
              <MenuItem value="week" aria-label="week-option">
                Week
              </MenuItem>
              <MenuItem value="month" aria-label="month-option">
                Month
              </MenuItem>
            </Select>
            <IconButton aria-label="Next" onClick={() => navigate('next')}>
              <ChevronRight />
            </IconButton>
          </Stack>

          {view === 'week' && renderWeekView()}
          {view === 'month' && renderMonthView()}
        </Stack>

        <Stack
          data-testid="event-list"
          spacing={2}
          sx={{ width: '30%', height: '100%', overflowY: 'auto' }}
        >
          <FormControl fullWidth>
            <FormLabel htmlFor="search">일정 검색</FormLabel>
            <TextField
              id="search"
              size="small"
              placeholder="검색어를 입력하세요"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </FormControl>

          {filteredEvents.length === 0 ? (
            <Typography>검색 결과가 없습니다.</Typography>
          ) : (
            filteredEvents.map((event) => (
              <Box key={event.id} sx={{ border: 1, borderRadius: 2, p: 3, width: '100%' }}>
                <Stack direction="row" justifyContent="space-between">
                  <Stack>
                    <Stack direction="row" spacing={1} alignItems="center">
                      {notifiedEvents.includes(event.id) && <Notifications color="error" />}
                      {event.repeat.type !== 'none' && (
                        <Tooltip
                          title={`${event.repeat.interval}${getRepeatTypeLabel(event.repeat.type)}마다 반복${
                            event.repeat.endDate ? ` (종료: ${event.repeat.endDate})` : ''
                          }`}
                        >
                          <Repeat fontSize="small" />
                        </Tooltip>
                      )}
                      <Typography
                        fontWeight={notifiedEvents.includes(event.id) ? 'bold' : 'normal'}
                        color={notifiedEvents.includes(event.id) ? 'error' : 'inherit'}
                      >
                        {event.title}
                      </Typography>
                    </Stack>
                    <Typography>{event.date}</Typography>
                    <Typography>
                      {event.startTime} - {event.endTime}
                    </Typography>
                    <Typography>{event.description}</Typography>
                    <Typography>{event.location}</Typography>
                    <Typography>카테고리: {event.category}</Typography>
                    {event.repeat.type !== 'none' && (
                      <Typography>
                        반복: {event.repeat.interval}
                        {event.repeat.type === 'daily' && '일'}
                        {event.repeat.type === 'weekly' && '주'}
                        {event.repeat.type === 'monthly' && '월'}
                        {event.repeat.type === 'yearly' && '년'}
                        마다
                        {event.repeat.endDate && ` (종료: ${event.repeat.endDate})`}
                      </Typography>
                    )}
                    <Typography>
                      알림:{' '}
                      {
                        notificationOptions.find(
                          (option) => option.value === event.notificationTime
                        )?.label
                      }
                    </Typography>
                  </Stack>
                  <Stack>
                    <IconButton aria-label="Edit event" onClick={() => handleEditEvent(event)}>
                      <Edit />
                    </IconButton>
                    <IconButton aria-label="Delete event" onClick={() => handleDeleteEvent(event)}>
                      <Delete />
                    </IconButton>
                  </Stack>
                </Stack>
              </Box>
            ))
          )}
        </Stack>
      </Stack>

      <Dialog open={isOverlapDialogOpen} onClose={() => setIsOverlapDialogOpen(false)}>
        <DialogTitle>일정 겹침 경고</DialogTitle>
        <DialogContent>
          <DialogContentText>다음 일정과 겹칩니다:</DialogContentText>
          {overlappingEvents.map((event) => (
            <Typography key={event.id} sx={{ ml: 1, mb: 1 }}>
              {event.title} ({event.date} {event.startTime}-{event.endTime})
            </Typography>
          ))}
          <DialogContentText>계속 진행하시겠습니까?</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsOverlapDialogOpen(false)}>취소</Button>
          <Button
            color="error"
            onClick={() => {
              setIsOverlapDialogOpen(false);
              saveEvent({
                id: editingEvent ? editingEvent.id : undefined,
                title,
                date,
                startTime,
                endTime,
                description,
                location,
                category,
                repeat: {
                  type: isRepeating ? repeatType : 'none',
                  interval: repeatInterval,
                  endDate: repeatEndDate || undefined,
                },
                notificationTime,
              });
            }}
          >
            계속 진행
          </Button>
        </DialogActions>
      </Dialog>

      <RecurringEventDialog
        open={isRecurringDialogOpen}
        onClose={() => {
          setIsRecurringDialogOpen(false);
          setPendingRecurringEdit(null);
          setPendingRecurringDelete(null);
        }}
        onConfirm={handleRecurringConfirm}
        event={recurringDialogMode === 'edit' ? pendingRecurringEdit : pendingRecurringDelete}
        mode={recurringDialogMode}
      />

      {notifications.length > 0 && (
        <Stack position="fixed" top={16} right={16} spacing={2} alignItems="flex-end">
          {notifications.map((notification, index) => (
            <Alert
              key={index}
              severity="info"
              sx={{ width: 'auto' }}
              action={
                <IconButton
                  size="small"
                  onClick={() => setNotifications((prev) => prev.filter((_, i) => i !== index))}
                >
                  <Close />
                </IconButton>
              }
            >
              <AlertTitle>{notification.message}</AlertTitle>
            </Alert>
          ))}
        </Stack>
      )}
    </Box>
  );
}

export default App;

```

```typescriptreact
import ChevronLeft from '@mui/icons-material/ChevronLeft';
import ChevronRight from '@mui/icons-material/ChevronRight';
import Close from '@mui/icons-material/Close';
import Delete from '@mui/icons-material/Delete';
import Edit from '@mui/icons-material/Edit';
import Notifications from '@mui/icons-material/Notifications';
import Repeat from '@mui/icons-material/Repeat';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormLabel,
  IconButton,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useSnackbar } from 'notistack';
import { DragEvent as ReactDragEvent, useState } from 'react';

import RecurringEventDialog from './components/RecurringEventDialog.tsx';
import { useCalendarView } from './hooks/useCalendarView.ts';
import { useEventForm } from './hooks/useEventForm.ts';
import { useEventOperations } from './hooks/useEventOperations.ts';
import { useNotifications } from './hooks/useNotifications.ts';
import { useRecurringEventOperations } from './hooks/useRecurringEventOperations.ts';
import { useSearch } from './hooks/useSearch.ts';
import { Event, EventForm, RepeatType } from './types.ts';
import {
  formatDate,
  formatMonth,
  formatWeek,
  getEventsForDay,
  getWeekDates,
  getWeeksAtMonth,
} from './utils/dateUtils.ts';
import { findOverlappingEvents } from './utils/eventOverlap.ts';
import { getTimeErrorMessage } from './utils/timeValidation.ts';

const categories = ['업무', '개인', '가족', '기타'];

const weekDays = ['일', '월', '화', '수', '목', '금', '토'];

const notificationOptions = [
  { value: 1, label: '1분 전' },
  { value: 10, label: '10분 전' },
  { value: 60, label: '1시간 전' },
  { value: 120, label: '2시간 전' },
  { value: 1440, label: '1일 전' },
];

// 스타일 상수
const eventBoxStyles = {
  notified: {
    backgroundColor: '#ffebee',
    fontWeight: 'bold',
    color: '#d32f2f',
  },
  normal: {
    backgroundColor: '#f5f5f5',
    fontWeight: 'normal',
    color: 'inherit',
  },
  common: {
    p: 0.5,
    my: 0.5,
    borderRadius: 1,
    minHeight: '18px',
    width: '100%',
    overflow: 'hidden',
  },
};

const getRepeatTypeLabel = (type: RepeatType): string => {
  switch (type) {
    case 'daily':
      return '일';
    case 'weekly':
      return '주';
    case 'monthly':
      return '월';
    case 'yearly':
      return '년';
    default:
      return '';
  }
};

function App() {
  const {
    title,
    setTitle,
    date,
    setDate,
    startTime,
    endTime,
    description,
    setDescription,
    location,
    setLocation,
    category,
    setCategory,
    isRepeating,
    setIsRepeating,
    repeatType,
    setRepeatType,
    repeatInterval,
    setRepeatInterval,
    repeatEndDate,
    setRepeatEndDate,
    notificationTime,
    setNotificationTime,
    startTimeError,
    endTimeError,
    editingEvent,
    setEditingEvent,
    handleStartTimeChange,
    handleEndTimeChange,
    resetForm,
    editEvent,
  } = useEventForm();

  const { events, saveEvent, deleteEvent, createRepeatEvent, fetchEvents } = useEventOperations(
    Boolean(editingEvent),
    () => setEditingEvent(null)
  );

  const { handleRecurringEdit, handleRecurringDelete } = useRecurringEventOperations(
    events,
    async () => {
      // After recurring edit, refresh events from server
      await fetchEvents();
    }
  );

  const { notifications, notifiedEvents, setNotifications } = useNotifications(events);
  const { view, setView, currentDate, holidays, navigate } = useCalendarView();
  const { searchTerm, filteredEvents, setSearchTerm } = useSearch(events, currentDate, view);

  const [isOverlapDialogOpen, setIsOverlapDialogOpen] = useState(false);
  const [overlappingEvents, setOverlappingEvents] = useState<Event[]>([]);
  const [isRecurringDialogOpen, setIsRecurringDialogOpen] = useState(false);
  const [pendingRecurringEdit, setPendingRecurringEdit] = useState<Event | null>(null);
  const [pendingRecurringDelete, setPendingRecurringDelete] = useState<Event | null>(null);
  const [recurringEditMode, setRecurringEditMode] = useState<boolean | null>(null); // true = single, false = all
  const [recurringDialogMode, setRecurringDialogMode] = useState<'edit' | 'delete'>('edit');
  
  // 드래그 앤 드롭 상태
  const [draggedEventId, setDraggedEventId] = useState<string | null>(null);
  const [dragOverCellDate, setDragOverCellDate] = useState<string | null>(null);
  const [isDraggingOverCalendar, setIsDraggingOverCalendar] = useState(false);

  const { enqueueSnackbar } = useSnackbar();

  const handleRecurringConfirm = async (editSingleOnly: boolean) => {
    if (recurringDialogMode === 'edit' && pendingRecurringEdit) {
      // 편집 모드 저장하고 편집 폼으로 이동
      setRecurringEditMode(editSingleOnly);
      editEvent(pendingRecurringEdit);
      setIsRecurringDialogOpen(false);
      setPendingRecurringEdit(null);
    } else if (recurringDialogMode === 'delete' && pendingRecurringDelete) {
      // 반복 일정 삭제 처리
      try {
        await handleRecurringDelete(pendingRecurringDelete, editSingleOnly);
        enqueueSnackbar('일정이 삭제되었습니다', { variant: 'success' });
      } catch (error) {
        console.error(error);
        enqueueSnackbar('일정 삭제 실패', { variant: 'error' });
      }
      setIsRecurringDialogOpen(false);
      setPendingRecurringDelete(null);
    }
  };

  const isRecurringEvent = (event: Event): boolean => {
    return event.repeat.type !== 'none' && event.repeat.interval > 0;
  };

  const handleEditEvent = (event: Event) => {
    if (isRecurringEvent(event)) {
      // Show recurring edit dialog
      setPendingRecurringEdit(event);
      setRecurringDialogMode('edit');
      setIsRecurringDialogOpen(true);
    } else {
      // Regular event editing
      editEvent(event);
    }
  };

  const handleDeleteEvent = (event: Event) => {
    if (isRecurringEvent(event)) {
      // Show recurring delete dialog
      setPendingRecurringDelete(event);
      setRecurringDialogMode('delete');
      setIsRecurringDialogOpen(true);
    } else {
      // Regular event deletion
      deleteEvent(event.id);
    }
  };

  const addOrUpdateEvent = async () => {
    if (!title || !date || !startTime || !endTime) {
      enqueueSnackbar('필수 정보를 모두 입력해주세요.', { variant: 'error' });
      return;
    }

    if (startTimeError || endTimeError) {
      enqueueSnackbar('시간 설정을 확인해주세요.', { variant: 'error' });
      return;
    }

    const eventData: Event | EventForm = {
      id: editingEvent ? editingEvent.id : undefined,
      title,
      date,
      startTime,
      endTime,
      description,
      location,
      category,
      repeat: editingEvent
        ? editingEvent.repeat // Keep original repeat settings for recurring event detection
        : {
            type: isRepeating ? repeatType : 'none',
            interval: repeatInterval,
            endDate: repeatEndDate || undefined,
          },
      notificationTime,
    };

    const overlapping = findOverlappingEvents(eventData, events);
    const hasOverlapEvent = overlapping.length > 0;

    // 수정
    if (editingEvent) {
      if (hasOverlapEvent) {
        setOverlappingEvents(overlapping);
        setIsOverlapDialogOpen(true);
        return;
      }

      if (
        editingEvent.repeat.type !== 'none' &&
        editingEvent.repeat.interval > 0 &&
        recurringEditMode !== null
      ) {
        await handleRecurringEdit(eventData as Event, recurringEditMode);
        setRecurringEditMode(null);
      } else {
        await saveEvent(eventData);
      }

      resetForm();
      return;
    }

    // 생성
    if (isRepeating) {
      // 반복 생성은 반복 일정을 고려하지 않는다.
      await createRepeatEvent(eventData);
      resetForm();
      return;
    }

    if (hasOverlapEvent) {
      setOverlappingEvents(overlapping);
      setIsOverlapDialogOpen(true);
      return;
    }

    await saveEvent(eventData);
    resetForm();
  };

  const renderWeekView = () => {
    const weekDates = getWeekDates(currentDate);
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
                {weekDates.map((date) => (
                  <TableCell
                    key={date.toISOString()}
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
                      .map((event) => {
                        const isNotified = notifiedEvents.includes(event.id);
                        const isRepeating = event.repeat.type !== 'none';

                        return (
                          <Box
                            key={event.id}
                            sx={{
                              ...eventBoxStyles.common,
                              ...(isNotified ? eventBoxStyles.notified : eventBoxStyles.normal),
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
                ))}
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Stack>
    );
  };

  const renderMonthView = () => {
    const weeks = getWeeksAtMonth(currentDate);

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
                                <Box
                                  key={event.id}
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
                                  }}
                                >
                                  <Stack direction="row" spacing={1} alignItems="center">
                                    {isNotified && <Notifications fontSize="small" />}
                                    {/* ! TEST CASE */}
                                    {isRepeating && (
                                      <Tooltip
                                        title={`${event.repeat.interval}${getRepeatTypeLabel(event.repeat.type)}마다 반복${
                                          event.repeat.endDate
                                            ? ` (종료: ${event.repeat.endDate})`
                                            : ''
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

  return (
    <Box sx={{ width: '100%', height: '100vh', margin: 'auto', p: 5 }}>
      <Stack direction="row" spacing={6} sx={{ height: '100%' }}>
        <Stack spacing={2} sx={{ width: '20%' }}>
          <Typography variant="h4">{editingEvent ? '일정 수정' : '일정 추가'}</Typography>

          <FormControl fullWidth>
            <FormLabel htmlFor="title">제목</FormLabel>
            <TextField
              id="title"
              size="small"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </FormControl>

          <FormControl fullWidth>
            <FormLabel htmlFor="date">날짜</FormLabel>
            <TextField
              id="date"
              size="small"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </FormControl>

          <Stack direction="row" spacing={2}>
            <FormControl fullWidth>
              <FormLabel htmlFor="start-time">시작 시간</FormLabel>
              <Tooltip title={startTimeError || ''} open={!!startTimeError} placement="top">
                <TextField
                  id="start-time"
                  size="small"
                  type="time"
                  value={startTime}
                  onChange={handleStartTimeChange}
                  onBlur={() => getTimeErrorMessage(startTime, endTime)}
                  error={!!startTimeError}
                />
              </Tooltip>
            </FormControl>
            <FormControl fullWidth>
              <FormLabel htmlFor="end-time">종료 시간</FormLabel>
              <Tooltip title={endTimeError || ''} open={!!endTimeError} placement="top">
                <TextField
                  id="end-time"
                  size="small"
                  type="time"
                  value={endTime}
                  onChange={handleEndTimeChange}
                  onBlur={() => getTimeErrorMessage(startTime, endTime)}
                  error={!!endTimeError}
                />
              </Tooltip>
            </FormControl>
          </Stack>

          <FormControl fullWidth>
            <FormLabel htmlFor="description">설명</FormLabel>
            <TextField
              id="description"
              size="small"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </FormControl>

          <FormControl fullWidth>
            <FormLabel htmlFor="location">위치</FormLabel>
            <TextField
              id="location"
              size="small"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </FormControl>

          <FormControl fullWidth>
            <FormLabel id="category-label">카테고리</FormLabel>
            <Select
              id="category"
              size="small"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              aria-labelledby="category-label"
              aria-label="카테고리"
            >
              {categories.map((cat) => (
                <MenuItem key={cat} value={cat} aria-label={`${cat}-option`}>
                  {cat}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {!editingEvent && (
            <FormControl>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={isRepeating}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setIsRepeating(checked);
                      if (checked) {
                        setRepeatType('daily');
                      } else {
                        setRepeatType('none');
                      }
                    }}
                  />
                }
                label="반복 일정"
              />
            </FormControl>
          )}

          {/* ! TEST CASE */}
          {isRepeating && !editingEvent && (
            <Stack spacing={2}>
              <FormControl fullWidth>
                <FormLabel>반복 유형</FormLabel>
                <Select
                  size="small"
                  value={repeatType}
                  aria-label="반복 유형"
                  onChange={(e) => setRepeatType(e.target.value as RepeatType)}
                >
                  <MenuItem value="daily" aria-label="daily-option">
                    매일
                  </MenuItem>
                  <MenuItem value="weekly" aria-label="weekly-option">
                    매주
                  </MenuItem>
                  <MenuItem value="monthly" aria-label="monthly-option">
                    매월
                  </MenuItem>
                  <MenuItem value="yearly" aria-label="yearly-option">
                    매년
                  </MenuItem>
                </Select>
              </FormControl>
              <Stack direction="row" spacing={2}>
                <FormControl fullWidth>
                  <FormLabel htmlFor="repeat-interval">반복 간격</FormLabel>
                  <TextField
                    id="repeat-interval"
                    size="small"
                    type="number"
                    value={repeatInterval}
                    onChange={(e) => setRepeatInterval(Number(e.target.value))}
                    slotProps={{ htmlInput: { min: 1 } }}
                  />
                </FormControl>
                <FormControl fullWidth>
                  <FormLabel htmlFor="repeat-end-date">반복 종료일</FormLabel>
                  <TextField
                    id="repeat-end-date"
                    size="small"
                    type="date"
                    value={repeatEndDate}
                    onChange={(e) => setRepeatEndDate(e.target.value)}
                  />
                </FormControl>
              </Stack>
            </Stack>
          )}

          <FormControl fullWidth>
            <FormLabel htmlFor="notification">알림 설정</FormLabel>
            <Select
              id="notification"
              size="small"
              value={notificationTime}
              onChange={(e) => setNotificationTime(Number(e.target.value))}
            >
              {notificationOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Button
            data-testid="event-submit-button"
            onClick={addOrUpdateEvent}
            variant="contained"
            color="primary"
          >
            {editingEvent ? '일정 수정' : '일정 추가'}
          </Button>
        </Stack>

        <Stack flex={1} spacing={5}>
          <Typography variant="h4">일정 보기</Typography>

          <Stack direction="row" spacing={2} justifyContent="space-between" alignItems="center">
            <IconButton aria-label="Previous" onClick={() => navigate('prev')}>
              <ChevronLeft />
            </IconButton>
            <Select
              size="small"
              aria-label="뷰 타입 선택"
              value={view}
              onChange={(e) => setView(e.target.value as 'week' | 'month')}
            >
              <MenuItem value="week" aria-label="week-option">
                Week
              </MenuItem>
              <MenuItem value="month" aria-label="month-option">
                Month
              </MenuItem>
            </Select>
            <IconButton aria-label="Next" onClick={() => navigate('next')}>
              <ChevronRight />
            </IconButton>
          </Stack>

          {view === 'week' && renderWeekView()}
          {view === 'month' && renderMonthView()}
        </Stack>

        <Stack
          data-testid="event-list"
          spacing={2}
          sx={{ width: '30%', height: '100%', overflowY: 'auto' }}
        >
          <FormControl fullWidth>
            <FormLabel htmlFor="search">일정 검색</FormLabel>
            <TextField
              id="search"
              size="small"
              placeholder="검색어를 입력하세요"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </FormControl>

          {filteredEvents.length === 0 ? (
            <Typography>검색 결과가 없습니다.</Typography>
          ) : (
            filteredEvents.map((event) => (
              <Box key={event.id} sx={{ border: 1, borderRadius: 2, p: 3, width: '100%' }}>
                <Stack direction="row" justifyContent="space-between">
                  <Stack>
                    <Stack direction="row" spacing={1} alignItems="center">
                      {notifiedEvents.includes(event.id) && <Notifications color="error" />}
                      {event.repeat.type !== 'none' && (
                        <Tooltip
                          title={`${event.repeat.interval}${getRepeatTypeLabel(event.repeat.type)}마다 반복${
                            event.repeat.endDate ? ` (종료: ${event.repeat.endDate})` : ''
                          }`}
                        >
                          <Repeat fontSize="small" />
                        </Tooltip>
                      )}
                      <Typography
                        fontWeight={notifiedEvents.includes(event.id) ? 'bold' : 'normal'}
                        color={notifiedEvents.includes(event.id) ? 'error' : 'inherit'}
                      >
                        {event.title}
                      </Typography>
                    </Stack>
                    <Typography>{event.date}</Typography>
                    <Typography>
                      {event.startTime} - {event.endTime}
                    </Typography>
                    <Typography>{event.description}</Typography>
                    <Typography>{event.location}</Typography>
                    <Typography>카테고리: {event.category}</Typography>
                    {event.repeat.type !== 'none' && (
                      <Typography>
                        반복: {event.repeat.interval}
                        {event.repeat.type === 'daily' && '일'}
                        {event.repeat.type === 'weekly' && '주'}
                        {event.repeat.type === 'monthly' && '월'}
                        {event.repeat.type === 'yearly' && '년'}
                        마다
                        {event.repeat.endDate && ` (종료: ${event.repeat.endDate})`}
                      </Typography>
                    )}
                    <Typography>
                      알림:{' '}
                      {
                        notificationOptions.find(
                          (option) => option.value === event.notificationTime
                        )?.label
                      }
                    </Typography>
                  </Stack>
                  <Stack>
                    <IconButton aria-label="Edit event" onClick={() => handleEditEvent(event)}>
                      <Edit />
                    </IconButton>
                    <IconButton aria-label="Delete event" onClick={() => handleDeleteEvent(event)}>
                      <Delete />
                    </IconButton>
                  </Stack>
                </Stack>
              </Box>
            ))
          )}
        </Stack>
      </Stack>

      <Dialog open={isOverlapDialogOpen} onClose={() => setIsOverlapDialogOpen(false)}>
        <DialogTitle>일정 겹침 경고</DialogTitle>
        <DialogContent>
          <DialogContentText>다음 일정과 겹칩니다:</DialogContentText>
          {overlappingEvents.map((event) => (
            <Typography key={event.id} sx={{ ml: 1, mb: 1 }}>
              {event.title} ({event.date} {event.startTime}-{event.endTime})
            </Typography>
          ))}
          <DialogContentText>계속 진행하시겠습니까?</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsOverlapDialogOpen(false)}>취소</Button>
          <Button
            color="error"
            onClick={() => {
              setIsOverlapDialogOpen(false);
              saveEvent({
                id: editingEvent ? editingEvent.id : undefined,
                title,
                date,
                startTime,
                endTime,
                description,
                location,
                category,
                repeat: {
                  type: isRepeating ? repeatType : 'none',
                  interval: repeatInterval,
                  endDate: repeatEndDate || undefined,
                },
                notificationTime,
              });
            }}
          >
            계속 진행
          </Button>
        </DialogActions>
      </Dialog>

      <RecurringEventDialog
        open={isRecurringDialogOpen}
        onClose={() => {
          setIsRecurringDialogOpen(false);
          setPendingRecurringEdit(null);
          setPendingRecurringDelete(null);
        }}
        onConfirm={handleRecurringConfirm}
        event={recurringDialogMode === 'edit' ? pendingRecurringEdit : pendingRecurringDelete}
        mode={recurringDialogMode}
      />

      {notifications.length > 0 && (
        <Stack position="fixed" top={16} right={16} spacing={2} alignItems="flex-end">
          {notifications.map((notification, index) => (
            <Alert
              key={index}
              severity="info"
              sx={{ width: 'auto' }}
              action={
                <IconButton
                  size="small"
                  onClick={() => setNotifications((prev) => prev.filter((_, i) => i !== index))}
                >
                  <Close />
                </IconButton>
              }
            >
              <AlertTitle>{notification.message}</AlertTitle>
            </Alert>
          ))}
        </Stack>
      )}
    </Box>
  );
}

export default App;

```

```typescriptreact
import ChevronLeft from '@mui/icons-material/ChevronLeft';
import ChevronRight from '@mui/icons-material/ChevronRight';
import Close from '@mui/icons-material/Close';
import Delete from '@mui/icons-material/Delete';
import Edit from '@mui/icons-material/Edit';
import Notifications from '@mui/icons-material/Notifications';
import Repeat from '@mui/icons-material/Repeat';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormLabel,
  IconButton,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useSnackbar } from 'notistack';
import { DragEvent as ReactDragEvent, useState } from 'react';

import RecurringEventDialog from './components/RecurringEventDialog.tsx';
import { useCalendarView } from './hooks/useCalendarView.ts';
import { useEventForm } from './hooks/useEventForm.ts';
import { useEventOperations } from './hooks/useEventOperations.ts';
import { useNotifications } from './hooks/useNotifications.ts';
import { useRecurringEventOperations } from './hooks/useRecurringEventOperations.ts';
import { useSearch } from './hooks/useSearch.ts';
import { Event, EventForm, RepeatType } from './types.ts';
import {
  formatDate,
  formatMonth,
  formatWeek,
  getEventsForDay,
  getWeekDates,
  getWeeksAtMonth,
} from './utils/dateUtils.ts';
import { findOverlappingEvents } from './utils/eventOverlap.ts';
import { getTimeErrorMessage } from './utils/timeValidation.ts';

const categories = ['업무', '개인', '가족', '기타'];

const weekDays = ['일', '월', '화', '수', '목', '금', '토'];

const notificationOptions = [
  { value: 1, label: '1분 전' },
  { value: 10, label: '10분 전' },
  { value: 60, label: '1시간 전' },
  { value: 120, label: '2시간 전' },
  { value: 1440, label: '1일 전' },
];

// 스타일 상수
const eventBoxStyles = {
  notified: {
    backgroundColor: '#ffebee',
    fontWeight: 'bold',
    color: '#d32f2f',
  },
  normal: {
    backgroundColor: '#f5f5f5',
    fontWeight: 'normal',
    color: 'inherit',
  },
  common: {
    p: 0.5,
    my: 0.5,
    borderRadius: 1,
    minHeight: '18px',
    width: '100%',
    overflow: 'hidden',
  },
};

const getRepeatTypeLabel = (type: RepeatType): string => {
  switch (type) {
    case 'daily':
      return '일';
    case 'weekly':
      return '주';
    case 'monthly':
      return '월';
    case 'yearly':
      return '년';
    default:
      return '';
  }
};

function App() {
  const {
    title,
    setTitle,
    date,
    setDate,
    startTime,
    endTime,
    description,
    setDescription,
    location,
    setLocation,
    category,
    setCategory,
    isRepeating,
    setIsRepeating,
    repeatType,
    setRepeatType,
    repeatInterval,
    setRepeatInterval,
    repeatEndDate,
    setRepeatEndDate,
    notificationTime,
    setNotificationTime,
    startTimeError,
    endTimeError,
    editingEvent,
    setEditingEvent,
    handleStartTimeChange,
    handleEndTimeChange,
    resetForm,
    editEvent,
  } = useEventForm();

  const { events, saveEvent, deleteEvent, createRepeatEvent, fetchEvents } = useEventOperations(
    Boolean(editingEvent),
    () => setEditingEvent(null)
  );

  const { handleRecurringEdit, handleRecurringDelete } = useRecurringEventOperations(
    events,
    async () => {
      // After recurring edit, refresh events from server
      await fetchEvents();
    }
  );

  const { notifications, notifiedEvents, setNotifications } = useNotifications(events);
  const { view, setView, currentDate, holidays, navigate } = useCalendarView();
  const { searchTerm, filteredEvents, setSearchTerm } = useSearch(events, currentDate, view);

  const [isOverlapDialogOpen, setIsOverlapDialogOpen] = useState(false);
  const [overlappingEvents, setOverlappingEvents] = useState<Event[]>([]);
  const [isRecurringDialogOpen, setIsRecurringDialogOpen] = useState(false);
  const [pendingRecurringEdit, setPendingRecurringEdit] = useState<Event | null>(null);
  const [pendingRecurringDelete, setPendingRecurringDelete] = useState<Event | null>(null);
  const [recurringEditMode, setRecurringEditMode] = useState<boolean | null>(null); // true = single, false = all
  const [recurringDialogMode, setRecurringDialogMode] = useState<'edit' | 'delete'>('edit');
  
  // 드래그 앤 드롭 상태
  const [draggedEventId, setDraggedEventId] = useState<string | null>(null);
  const [dragOverCellDate, setDragOverCellDate] = useState<string | null>(null);
  const [isDraggingOverCalendar, setIsDraggingOverCalendar] = useState(false);

  const { enqueueSnackbar } = useSnackbar();

  const handleRecurringConfirm = async (editSingleOnly: boolean) => {
    if (recurringDialogMode === 'edit' && pendingRecurringEdit) {
      // 편집 모드 저장하고 편집 폼으로 이동
      setRecurringEditMode(editSingleOnly);
      editEvent(pendingRecurringEdit);
      setIsRecurringDialogOpen(false);
      setPendingRecurringEdit(null);
    } else if (recurringDialogMode === 'delete' && pendingRecurringDelete) {
      // 반복 일정 삭제 처리
      try {
        await handleRecurringDelete(pendingRecurringDelete, editSingleOnly);
        enqueueSnackbar('일정이 삭제되었습니다', { variant: 'success' });
      } catch (error) {
        console.error(error);
        enqueueSnackbar('일정 삭제 실패', { variant: 'error' });
      }
      setIsRecurringDialogOpen(false);
      setPendingRecurringDelete(null);
    }
  };

  const isRecurringEvent = (event: Event): boolean => {
    return event.repeat.type !== 'none' && event.repeat.interval > 0;
  };

  const handleEditEvent = (event: Event) => {
    if (isRecurringEvent(event)) {
      // Show recurring edit dialog
      setPendingRecurringEdit(event);
      setRecurringDialogMode('edit');
      setIsRecurringDialogOpen(true);
    } else {
      // Regular event editing
      editEvent(event);
    }
  };

  const handleDeleteEvent = (event: Event) => {
    if (isRecurringEvent(event)) {
      // Show recurring delete dialog
      setPendingRecurringDelete(event);
      setRecurringDialogMode('delete');
      setIsRecurringDialogOpen(true);
    } else {
      // Regular event deletion
      deleteEvent(event.id);
    }
  };

  // 드래그 앤 드롭 핸들러
  const handleDragStart = (e: ReactDragEvent<HTMLElement>, eventId: string) => {
    setDraggedEventId(eventId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', eventId);
    
    // 드래그 중인 요소에 스타일 적용
    const target = e.currentTarget as HTMLElement;
    target.style.opacity = '0.5';
    target.setAttribute('data-dragging', 'true');
  };

  const handleDragEnd = (e: ReactDragEvent<HTMLElement>) => {
    setDraggedEventId(null);
    setDragOverCellDate(null);
    setIsDraggingOverCalendar(false);
    
    // 드래그 종료 시 스타일 복원
    const target = e.currentTarget as HTMLElement;
    target.style.opacity = '1';
    target.removeAttribute('data-dragging');
    
    // body 커서 스타일 복원
    document.body.style.cursor = '';
  };

  const handleDragOverCell = (e: ReactDragEvent<HTMLElement>, dateString: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverCellDate(dateString);
    setIsDraggingOverCalendar(true);
    
    // 셀에 droppable 속성 추가
    const target = e.currentTarget as HTMLElement;
    target.setAttribute('data-droppable', 'true');
    
    // body 커서 스타일 제거 (캘린더 내부)
    document.body.style.cursor = '';
  };

  const handleDragLeaveCell = (e: ReactDragEvent<HTMLElement>) => {
    const target = e.currentTarget as HTMLElement;
    target.removeAttribute('data-droppable');
  };

  const handleDragOverOutside = (e: ReactDragEvent<HTMLElement>) => {
    e.preventDefault();
    setIsDraggingOverCalendar(false);
    
    // 캘린더 외부일 때 not-allowed 커서 표시
    if (draggedEventId) {
      document.body.style.cursor = 'not-allowed';
    }
  };

  const handleDrop = (e: ReactDragEvent<HTMLElement>) => {
    e.preventDefault();
    const target = e.currentTarget as HTMLElement;
    target.removeAttribute('data-droppable');
    
    // TODO: 실제 드롭 처리 로직 (다음 스토리에서 구현)
  };

  const addOrUpdateEvent = async () => {
    if (!title || !date || !startTime || !endTime) {
      enqueueSnackbar('필수 정보를 모두 입력해주세요.', { variant: 'error' });
      return;
    }

    if (startTimeError || endTimeError) {
      enqueueSnackbar('시간 설정을 확인해주세요.', { variant: 'error' });
      return;
    }

    const eventData: Event | EventForm = {
      id: editingEvent ? editingEvent.id : undefined,
      title,
      date,
      startTime,
      endTime,
      description,
      location,
      category,
      repeat: editingEvent
        ? editingEvent.repeat // Keep original repeat settings for recurring event detection
        : {
            type: isRepeating ? repeatType : 'none',
            interval: repeatInterval,
            endDate: repeatEndDate || undefined,
          },
      notificationTime,
    };

    const overlapping = findOverlappingEvents(eventData, events);
    const hasOverlapEvent = overlapping.length > 0;

    // 수정
    if (editingEvent) {
      if (hasOverlapEvent) {
        setOverlappingEvents(overlapping);
        setIsOverlapDialogOpen(true);
        return;
      }

      if (
        editingEvent.repeat.type !== 'none' &&
        editingEvent.repeat.interval > 0 &&
        recurringEditMode !== null
      ) {
        await handleRecurringEdit(eventData as Event, recurringEditMode);
        setRecurringEditMode(null);
      } else {
        await saveEvent(eventData);
      }

      resetForm();
      return;
    }

    // 생성
    if (isRepeating) {
      // 반복 생성은 반복 일정을 고려하지 않는다.
      await createRepeatEvent(eventData);
      resetForm();
      return;
    }

    if (hasOverlapEvent) {
      setOverlappingEvents(overlapping);
      setIsOverlapDialogOpen(true);
      return;
    }

    await saveEvent(eventData);
    resetForm();
  };

  const renderWeekView = () => {
    const weekDates = getWeekDates(currentDate);
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
                {weekDates.map((date) => (
                  <TableCell
                    key={date.toISOString()}
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
                      .map((event) => {
                        const isNotified = notifiedEvents.includes(event.id);
                        const isRepeating = event.repeat.type !== 'none';

                        return (
                          <Box
                            key={event.id}
                            sx={{
                              ...eventBoxStyles.common,
                              ...(isNotified ? eventBoxStyles.notified : eventBoxStyles.normal),
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
                ))}
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Stack>
    );
  };

  const renderMonthView = () => {
    const weeks = getWeeksAtMonth(currentDate);

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
                                <Box
                                  key={event.id}
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
                                  }}
                                >
                                  <Stack direction="row" spacing={1} alignItems="center">
                                    {isNotified && <Notifications fontSize="small" />}
                                    {/* ! TEST CASE */}
                                    {isRepeating && (
                                      <Tooltip
                                        title={`${event.repeat.interval}${getRepeatTypeLabel(event.repeat.type)}마다 반복${
                                          event.repeat.endDate
                                            ? ` (종료: ${event.repeat.endDate})`
                                            : ''
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

  return (
    <Box sx={{ width: '100%', height: '100vh', margin: 'auto', p: 5 }}>
      <Stack direction="row" spacing={6} sx={{ height: '100%' }}>
        <Stack spacing={2} sx={{ width: '20%' }}>
          <Typography variant="h4">{editingEvent ? '일정 수정' : '일정 추가'}</Typography>

          <FormControl fullWidth>
            <FormLabel htmlFor="title">제목</FormLabel>
            <TextField
              id="title"
              size="small"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </FormControl>

          <FormControl fullWidth>
            <FormLabel htmlFor="date">날짜</FormLabel>
            <TextField
              id="date"
              size="small"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </FormControl>

          <Stack direction="row" spacing={2}>
            <FormControl fullWidth>
              <FormLabel htmlFor="start-time">시작 시간</FormLabel>
              <Tooltip title={startTimeError || ''} open={!!startTimeError} placement="top">
                <TextField
                  id="start-time"
                  size="small"
                  type="time"
                  value={startTime}
                  onChange={handleStartTimeChange}
                  onBlur={() => getTimeErrorMessage(startTime, endTime)}
                  error={!!startTimeError}
                />
              </Tooltip>
            </FormControl>
            <FormControl fullWidth>
              <FormLabel htmlFor="end-time">종료 시간</FormLabel>
              <Tooltip title={endTimeError || ''} open={!!endTimeError} placement="top">
                <TextField
                  id="end-time"
                  size="small"
                  type="time"
                  value={endTime}
                  onChange={handleEndTimeChange}
                  onBlur={() => getTimeErrorMessage(startTime, endTime)}
                  error={!!endTimeError}
                />
              </Tooltip>
            </FormControl>
          </Stack>

          <FormControl fullWidth>
            <FormLabel htmlFor="description">설명</FormLabel>
            <TextField
              id="description"
              size="small"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </FormControl>

          <FormControl fullWidth>
            <FormLabel htmlFor="location">위치</FormLabel>
            <TextField
              id="location"
              size="small"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </FormControl>

          <FormControl fullWidth>
            <FormLabel id="category-label">카테고리</FormLabel>
            <Select
              id="category"
              size="small"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              aria-labelledby="category-label"
              aria-label="카테고리"
            >
              {categories.map((cat) => (
                <MenuItem key={cat} value={cat} aria-label={`${cat}-option`}>
                  {cat}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {!editingEvent && (
            <FormControl>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={isRepeating}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setIsRepeating(checked);
                      if (checked) {
                        setRepeatType('daily');
                      } else {
                        setRepeatType('none');
                      }
                    }}
                  />
                }
                label="반복 일정"
              />
            </FormControl>
          )}

          {/* ! TEST CASE */}
          {isRepeating && !editingEvent && (
            <Stack spacing={2}>
              <FormControl fullWidth>
                <FormLabel>반복 유형</FormLabel>
                <Select
                  size="small"
                  value={repeatType}
                  aria-label="반복 유형"
                  onChange={(e) => setRepeatType(e.target.value as RepeatType)}
                >
                  <MenuItem value="daily" aria-label="daily-option">
                    매일
                  </MenuItem>
                  <MenuItem value="weekly" aria-label="weekly-option">
                    매주
                  </MenuItem>
                  <MenuItem value="monthly" aria-label="monthly-option">
                    매월
                  </MenuItem>
                  <MenuItem value="yearly" aria-label="yearly-option">
                    매년
                  </MenuItem>
                </Select>
              </FormControl>
              <Stack direction="row" spacing={2}>
                <FormControl fullWidth>
                  <FormLabel htmlFor="repeat-interval">반복 간격</FormLabel>
                  <TextField
                    id="repeat-interval"
                    size="small"
                    type="number"
                    value={repeatInterval}
                    onChange={(e) => setRepeatInterval(Number(e.target.value))}
                    slotProps={{ htmlInput: { min: 1 } }}
                  />
                </FormControl>
                <FormControl fullWidth>
                  <FormLabel htmlFor="repeat-end-date">반복 종료일</FormLabel>
                  <TextField
                    id="repeat-end-date"
                    size="small"
                    type="date"
                    value={repeatEndDate}
                    onChange={(e) => setRepeatEndDate(e.target.value)}
                  />
                </FormControl>
              </Stack>
            </Stack>
          )}

          <FormControl fullWidth>
            <FormLabel htmlFor="notification">알림 설정</FormLabel>
            <Select
              id="notification"
              size="small"
              value={notificationTime}
              onChange={(e) => setNotificationTime(Number(e.target.value))}
            >
              {notificationOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Button
            data-testid="event-submit-button"
            onClick={addOrUpdateEvent}
            variant="contained"
            color="primary"
          >
            {editingEvent ? '일정 수정' : '일정 추가'}
          </Button>
        </Stack>

        <Stack flex={1} spacing={5}>
          <Typography variant="h4">일정 보기</Typography>

          <Stack direction="row" spacing={2} justifyContent="space-between" alignItems="center">
            <IconButton aria-label="Previous" onClick={() => navigate('prev')}>
              <ChevronLeft />
            </IconButton>
            <Select
              size="small"
              aria-label="뷰 타입 선택"
              value={view}
              onChange={(e) => setView(e.target.value as 'week' | 'month')}
            >
              <MenuItem value="week" aria-label="week-option">
                Week
              </MenuItem>
              <MenuItem value="month" aria-label="month-option">
                Month
              </MenuItem>
            </Select>
            <IconButton aria-label="Next" onClick={() => navigate('next')}>
              <ChevronRight />
            </IconButton>
          </Stack>

          {view === 'week' && renderWeekView()}
          {view === 'month' && renderMonthView()}
        </Stack>

        <Stack
          data-testid="event-list"
          spacing={2}
          sx={{ width: '30%', height: '100%', overflowY: 'auto' }}
        >
          <FormControl fullWidth>
            <FormLabel htmlFor="search">일정 검색</FormLabel>
            <TextField
              id="search"
              size="small"
              placeholder="검색어를 입력하세요"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </FormControl>

          {filteredEvents.length === 0 ? (
            <Typography>검색 결과가 없습니다.</Typography>
          ) : (
            filteredEvents.map((event) => (
              <Box key={event.id} sx={{ border: 1, borderRadius: 2, p: 3, width: '100%' }}>
                <Stack direction="row" justifyContent="space-between">
                  <Stack>
                    <Stack direction="row" spacing={1} alignItems="center">
                      {notifiedEvents.includes(event.id) && <Notifications color="error" />}
                      {event.repeat.type !== 'none' && (
                        <Tooltip
                          title={`${event.repeat.interval}${getRepeatTypeLabel(event.repeat.type)}마다 반복${
                            event.repeat.endDate ? ` (종료: ${event.repeat.endDate})` : ''
                          }`}
                        >
                          <Repeat fontSize="small" />
                        </Tooltip>
                      )}
                      <Typography
                        fontWeight={notifiedEvents.includes(event.id) ? 'bold' : 'normal'}
                        color={notifiedEvents.includes(event.id) ? 'error' : 'inherit'}
                      >
                        {event.title}
                      </Typography>
                    </Stack>
                    <Typography>{event.date}</Typography>
                    <Typography>
                      {event.startTime} - {event.endTime}
                    </Typography>
                    <Typography>{event.description}</Typography>
                    <Typography>{event.location}</Typography>
                    <Typography>카테고리: {event.category}</Typography>
                    {event.repeat.type !== 'none' && (
                      <Typography>
                        반복: {event.repeat.interval}
                        {event.repeat.type === 'daily' && '일'}
                        {event.repeat.type === 'weekly' && '주'}
                        {event.repeat.type === 'monthly' && '월'}
                        {event.repeat.type === 'yearly' && '년'}
                        마다
                        {event.repeat.endDate && ` (종료: ${event.repeat.endDate})`}
                      </Typography>
                    )}
                    <Typography>
                      알림:{' '}
                      {
                        notificationOptions.find(
                          (option) => option.value === event.notificationTime
                        )?.label
                      }
                    </Typography>
                  </Stack>
                  <Stack>
                    <IconButton aria-label="Edit event" onClick={() => handleEditEvent(event)}>
                      <Edit />
                    </IconButton>
                    <IconButton aria-label="Delete event" onClick={() => handleDeleteEvent(event)}>
                      <Delete />
                    </IconButton>
                  </Stack>
                </Stack>
              </Box>
            ))
          )}
        </Stack>
      </Stack>

      <Dialog open={isOverlapDialogOpen} onClose={() => setIsOverlapDialogOpen(false)}>
        <DialogTitle>일정 겹침 경고</DialogTitle>
        <DialogContent>
          <DialogContentText>다음 일정과 겹칩니다:</DialogContentText>
          {overlappingEvents.map((event) => (
            <Typography key={event.id} sx={{ ml: 1, mb: 1 }}>
              {event.title} ({event.date} {event.startTime}-{event.endTime})
            </Typography>
          ))}
          <DialogContentText>계속 진행하시겠습니까?</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsOverlapDialogOpen(false)}>취소</Button>
          <Button
            color="error"
            onClick={() => {
              setIsOverlapDialogOpen(false);
              saveEvent({
                id: editingEvent ? editingEvent.id : undefined,
                title,
                date,
                startTime,
                endTime,
                description,
                location,
                category,
                repeat: {
                  type: isRepeating ? repeatType : 'none',
                  interval: repeatInterval,
                  endDate: repeatEndDate || undefined,
                },
                notificationTime,
              });
            }}
          >
            계속 진행
          </Button>
        </DialogActions>
      </Dialog>

      <RecurringEventDialog
        open={isRecurringDialogOpen}
        onClose={() => {
          setIsRecurringDialogOpen(false);
          setPendingRecurringEdit(null);
          setPendingRecurringDelete(null);
        }}
        onConfirm={handleRecurringConfirm}
        event={recurringDialogMode === 'edit' ? pendingRecurringEdit : pendingRecurringDelete}
        mode={recurringDialogMode}
      />

      {notifications.length > 0 && (
        <Stack position="fixed" top={16} right={16} spacing={2} alignItems="flex-end">
          {notifications.map((notification, index) => (
            <Alert
              key={index}
              severity="info"
              sx={{ width: 'auto' }}
              action={
                <IconButton
                  size="small"
                  onClick={() => setNotifications((prev) => prev.filter((_, i) => i !== index))}
                >
                  <Close />
                </IconButton>
              }
            >
              <AlertTitle>{notification.message}</AlertTitle>
            </Alert>
          ))}
        </Stack>
      )}
    </Box>
  );
}

export default App;

```

이제 월간 뷰의 이벤트 박스와 날짜 셀에 드래그 앤 드롭 기능을 적용하겠습니다.

```typescriptreact
import ChevronLeft from '@mui/icons-material/ChevronLeft';
import ChevronRight from '@mui/icons-material/ChevronRight';
import Close from '@mui/icons-material/Close';
import Delete from '@mui/icons-material/Delete';
import Edit from '@mui/icons-material/Edit';
import Notifications from '@mui/icons-material/Notifications';
import Repeat from '@mui/icons-material/Repeat';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormLabel,
  IconButton,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useSnackbar } from 'notistack';
import { DragEvent as ReactDragEvent, useState } from 'react';

import RecurringEventDialog from './components/RecurringEventDialog.tsx';
import { useCalendarView } from './hooks/useCalendarView.ts';
import { useEventForm } from './hooks/useEventForm.ts';
import { useEventOperations } from './hooks/useEventOperations.ts';
import { useNotifications } from './hooks/useNotifications.ts';
import { useRecurringEventOperations } from './hooks/useRecurringEventOperations.ts';
import { useSearch } from './hooks/useSearch.ts';
import { Event, EventForm, RepeatType } from './types.ts';
import {
  formatDate,
  formatMonth,
  formatWeek,
  getEventsForDay,
  getWeekDates,
  getWeeksAtMonth,
} from './utils/dateUtils.ts';
import { findOverlappingEvents } from './utils/eventOverlap.ts';
import { getTimeErrorMessage } from './utils/timeValidation.ts';

const categories = ['업무', '개인', '가족', '기타'];

const weekDays = ['일', '월', '화', '수', '목', '금', '토'];

const notificationOptions = [
  { value: 1, label: '1분 전' },
  { value: 10, label: '10분 전' },
  { value: 60, label: '1시간 전' },
  { value: 120, label: '2시간 전' },
  { value: 1440, label: '1일 전' },
];

// 스타일 상수
const eventBoxStyles = {
  notified: {
    backgroundColor: '#ffebee',
    fontWeight: 'bold',
    color: '#d32f2f',
  },
  normal: {
    backgroundColor: '#f5f5f5',
    fontWeight: 'normal',
    color: 'inherit',
  },
  common: {
    p: 0.5,
    my: 0.5,
    borderRadius: 1,
    minHeight: '18px',
    width: '100%',
    overflow: 'hidden',
  },
};

const getRepeatTypeLabel = (type: RepeatType): string => {
  switch (type) {
    case 'daily':
      return '일';
    case 'weekly':
      return '주';
    case 'monthly':
      return '월';
    case 'yearly':
      return '년';
    default:
      return '';
  }
};

function App() {
  const {
    title,
    setTitle,
    date,
    setDate,
    startTime,
    endTime,
    description,
    setDescription,
    location,
    setLocation,
    category,
    setCategory,
    isRepeating,
    setIsRepeating,
    repeatType,
    setRepeatType,
    repeatInterval,
    setRepeatInterval,
    repeatEndDate,
    setRepeatEndDate,
    notificationTime,
    setNotificationTime,
    startTimeError,
    endTimeError,
    editingEvent,
    setEditingEvent,
    handleStartTimeChange,
    handleEndTimeChange,
    resetForm,
    editEvent,
  } = useEventForm();

  const { events, saveEvent, deleteEvent, createRepeatEvent, fetchEvents } = useEventOperations(
    Boolean(editingEvent),
    () => setEditingEvent(null)
  );

  const { handleRecurringEdit, handleRecurringDelete } = useRecurringEventOperations(
    events,
    async () => {
      // After recurring edit, refresh events from server
      await fetchEvents();
    }
  );

  const { notifications, notifiedEvents, setNotifications } = useNotifications(events);
  const { view, setView, currentDate, holidays, navigate } = useCalendarView();
  const { searchTerm, filteredEvents, setSearchTerm } = useSearch(events, currentDate, view);

  const [isOverlapDialogOpen, setIsOverlapDialogOpen] = useState(false);
  const [overlappingEvents, setOverlappingEvents] = useState<Event[]>([]);
  const [isRecurringDialogOpen, setIsRecurringDialogOpen] = useState(false);
  const [pendingRecurringEdit, setPendingRecurringEdit] = useState<Event | null>(null);
  const [pendingRecurringDelete, setPendingRecurringDelete] = useState<Event | null>(null);
  const [recurringEditMode, setRecurringEditMode] = useState<boolean | null>(null); // true = single, false = all
  const [recurringDialogMode, setRecurringDialogMode] = useState<'edit' | 'delete'>('edit');
  
  // 드래그 앤 드롭 상태
  const [draggedEventId, setDraggedEventId] = useState<string | null>(null);
  const [dragOverCellDate, setDragOverCellDate] = useState<string | null>(null);
  const [isDraggingOverCalendar, setIsDraggingOverCalendar] = useState(false);

  const { enqueueSnackbar } = useSnackbar();

  const handleRecurringConfirm = async (editSingleOnly: boolean) => {
    if (recurringDialogMode === 'edit' && pendingRecurringEdit) {
      // 편집 모드 저장하고 편집 폼으로 이동
      setRecurringEditMode(editSingleOnly);
      editEvent(pendingRecurringEdit);
      setIsRecurringDialogOpen(false);
      setPendingRecurringEdit(null);
    } else if (recurringDialogMode === 'delete' && pendingRecurringDelete) {
      // 반복 일정 삭제 처리
      try {
        await handleRecurringDelete(pendingRecurringDelete, editSingleOnly);
        enqueueSnackbar('일정이 삭제되었습니다', { variant: 'success' });
      } catch (error) {
        console.error(error);
        enqueueSnackbar('일정 삭제 실패', { variant: 'error' });
      }
      setIsRecurringDialogOpen(false);
      setPendingRecurringDelete(null);
    }
  };

  const isRecurringEvent = (event: Event): boolean => {
    return event.repeat.type !== 'none' && event.repeat.interval > 0;
  };

  const handleEditEvent = (event: Event) => {
    if (isRecurringEvent(event)) {
      // Show recurring edit dialog
      setPendingRecurringEdit(event);
      setRecurringDialogMode('edit');
      setIsRecurringDialogOpen(true);
    } else {
      // Regular event editing
      editEvent(event);
    }
  };

  const handleDeleteEvent = (event: Event) => {
    if (isRecurringEvent(event)) {
      // Show recurring delete dialog
      setPendingRecurringDelete(event);
      setRecurringDialogMode('delete');
      setIsRecurringDialogOpen(true);
    } else {
      // Regular event deletion
      deleteEvent(event.id);
    }
  };

  // 드래그 앤 드롭 핸들러
  const handleDragStart = (e: ReactDragEvent<HTMLElement>, eventId: string) => {
    setDraggedEventId(eventId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', eventId);
    
    // 드래그 중인 요소에 스타일 적용
    const target = e.currentTarget as HTMLElement;
    target.style.opacity = '0.5';
    target.setAttribute('data-dragging', 'true');
  };

  const handleDragEnd = (e: ReactDragEvent<HTMLElement>) => {
    setDraggedEventId(null);
    setDragOverCellDate(null);
    setIsDraggingOverCalendar(false);
    
    // 드래그 종료 시 스타일 복원
    const target = e.currentTarget as HTMLElement;
    target.style.opacity = '1';
    target.removeAttribute('data-dragging');
    
    // body 커서 스타일 복원
    document.body.style.cursor = '';
  };

  const handleDragOverCell = (e: ReactDragEvent<HTMLElement>, dateString: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverCellDate(dateString);
    setIsDraggingOverCalendar(true);
    
    // 셀에 droppable 속성 추가
    const target = e.currentTarget as HTMLElement;
    target.setAttribute('data-droppable', 'true');
    
    // body 커서 스타일 제거 (캘린더 내부)
    document.body.style.cursor = '';
  };

  const handleDragLeaveCell = (e: ReactDragEvent<HTMLElement>) => {
    const target = e.currentTarget as HTMLElement;
    target.removeAttribute('data-droppable');
  };

  const handleDragOverOutside = (e: ReactDragEvent<HTMLElement>) => {
    e.preventDefault();
    setIsDraggingOverCalendar(false);
    
    // 캘린더 외부일 때 not-allowed 커서 표시
    if (draggedEventId) {
      document.body.style.cursor = 'not-allowed';
    }
  };

  const handleDrop = (e: ReactDragEvent<HTMLElement>) => {
    e.preventDefault();
    const target = e.currentTarget as HTMLElement;
    target.removeAttribute('data-droppable');
    
    // TODO: 실제 드롭 처리 로직 (다음 스토리에서 구현)
  };

  const addOrUpdateEvent = async () => {
    if (!title || !date || !startTime || !endTime) {
      enqueueSnackbar('필수 정보를 모두 입력해주세요.', { variant: 'error' });
      return;
    }

    if (startTimeError || endTimeError) {
      enqueueSnackbar('시간 설정을 확인해주세요.', { variant: 'error' });
      return;
    }

    const eventData: Event | EventForm = {
      id: editingEvent ? editingEvent.id : undefined,
      title,
      date,
      startTime,
      endTime,
      description,
      location,
      category,
      repeat: editingEvent
        ? editingEvent.repeat // Keep original repeat settings for recurring event detection
        : {
            type: isRepeating ? repeatType : 'none',
            interval: repeatInterval,
            endDate: repeatEndDate || undefined,
          },
      notificationTime,
    };

    const overlapping = findOverlappingEvents(eventData, events);
    const hasOverlapEvent = overlapping.length > 0;

    // 수정
    if (editingEvent) {
      if (hasOverlapEvent) {
        setOverlappingEvents(overlapping);
        setIsOverlapDialogOpen(true);
        return;
      }

      if (
        editingEvent.repeat.type !== 'none' &&
        editingEvent.repeat.interval > 0 &&
        recurringEditMode !== null
      ) {
        await handleRecurringEdit(eventData as Event, recurringEditMode);
        setRecurringEditMode(null);
      } else {
        await saveEvent(eventData);
      }

      resetForm();
      return;
    }

    // 생성
    if (isRepeating) {
      // 반복 생성은 반복 일정을 고려하지 않는다.
      await createRepeatEvent(eventData);
      resetForm();
      return;
    }

    if (hasOverlapEvent) {
      setOverlappingEvents(overlapping);
      setIsOverlapDialogOpen(true);
      return;
    }

    await saveEvent(eventData);
    resetForm();
  };

  const renderWeekView = () => {
    const weekDates = getWeekDates(currentDate);
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
                {weekDates.map((date) => (
                  <TableCell
                    key={date.toISOString()}
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
                      .map((event) => {
                        const isNotified = notifiedEvents.includes(event.id);
                        const isRepeating = event.repeat.type !== 'none';

                        return (
                          <Box
                            key={event.id}
                            sx={{
                              ...eventBoxStyles.common,
                              ...(isNotified ? eventBoxStyles.notified : eventBoxStyles.normal),
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
                ))}
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Stack>
    );
  };

  const renderMonthView = () => {
    const weeks = getWeeksAtMonth(currentDate);

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
                        onDragOver={(e) => day && handleDragOverCell(e, dateString)}
                        onDragLeave={handleDragLeaveCell}
                        onDrop={handleDrop}
                        sx={{
                          height: '120px',
                          verticalAlign: 'top',
                          width: '14.28%',
                          padding: 1,
                          border: '1px solid #e0e0e0',
                          overflow: 'hidden',
                          position: 'relative',
                          backgroundColor: dragOverCellDate === dateString ? '#e3f2fd' : 'transparent',
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
                                <Box
                                  key={event.id}
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
                                  }}
                                >
                                  <Stack direction="row" spacing={1} alignItems="center">
                                    {isNotified && <Notifications fontSize="small" />}
                                    {/* ! TEST CASE */}
                                    {isRepeating && (
                                      <Tooltip
                                        title={`${event.repeat.interval}${getRepeatTypeLabel(event.repeat.type)}마다 반복${
                                          event.repeat.endDate
                                            ? ` (종료: ${event.repeat.endDate})`
                                            : ''
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

  return (
    <Box sx={{ width: '100%', height: '100vh', margin: 'auto', p: 5 }}>
      <Stack direction="row" spacing={6} sx={{ height: '100%' }}>
        <Stack spacing={2} sx={{ width: '20%' }}>
          <Typography variant="h4">{editingEvent ? '일정 수정' : '일정 추가'}</Typography>

          <FormControl fullWidth>
            <FormLabel htmlFor="title">제목</FormLabel>
            <TextField
              id="title"
              size="small"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </FormControl>

          <FormControl fullWidth>
            <FormLabel htmlFor="date">날짜</FormLabel>
            <TextField
              id="date"
              size="small"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </FormControl>

          <Stack direction="row" spacing={2}>
            <FormControl fullWidth>
              <FormLabel htmlFor="start-time">시작 시간</FormLabel>
              <Tooltip title={startTimeError || ''} open={!!startTimeError} placement="top">
                <TextField
                  id="start-time"
                  size="small"
                  type="time"
                  value={startTime}
                  onChange={handleStartTimeChange}
                  onBlur={() => getTimeErrorMessage(startTime, endTime)}
                  error={!!startTimeError}
                />
              </Tooltip>
            </FormControl>
            <FormControl fullWidth>
              <FormLabel htmlFor="end-time">종료 시간</FormLabel>
              <Tooltip title={endTimeError || ''} open={!!endTimeError} placement="top">
                <TextField
                  id="end-time"
                  size="small"
                  type="time"
                  value={endTime}
                  onChange={handleEndTimeChange}
                  onBlur={() => getTimeErrorMessage(startTime, endTime)}
                  error={!!endTimeError}
                />
              </Tooltip>
            </FormControl>
          </Stack>

          <FormControl fullWidth>
            <FormLabel htmlFor="description">설명</FormLabel>
            <TextField
              id="description"
              size="small"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </FormControl>

          <FormControl fullWidth>
            <FormLabel htmlFor="location">위치</FormLabel>
            <TextField
              id="location"
              size="small"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </FormControl>

          <FormControl fullWidth>
            <FormLabel id="category-label">카테고리</FormLabel>
            <Select
              id="category"
              size="small"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              aria-labelledby="category-label"
              aria-label="카테고리"
            >
              {categories.map((cat) => (
                <MenuItem key={cat} value={cat} aria-label={`${cat}-option`}>
                  {cat}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {!editingEvent && (
            <FormControl>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={isRepeating}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setIsRepeating(checked);
                      if (checked) {
                        setRepeatType('daily');
                      } else {
                        setRepeatType('none');
                      }
                    }}
                  />
                }
                label="반복 일정"
              />
            </FormControl>
          )}

          {/* ! TEST CASE */}
          {isRepeating && !editingEvent && (
            <Stack spacing={2}>
              <FormControl fullWidth>
                <FormLabel>반복 유형</FormLabel>
                <Select
                  size="small"
                  value={repeatType}
                  aria-label="반복 유형"
                  onChange={(e) => setRepeatType(e.target.value as RepeatType)}
                >
                  <MenuItem value="daily" aria-label="daily-option">
                    매일
                  </MenuItem>
                  <MenuItem value="weekly" aria-label="weekly-option">
                    매주
                  </MenuItem>
                  <MenuItem value="monthly" aria-label="monthly-option">
                    매월
                  </MenuItem>
                  <MenuItem value="yearly" aria-label="yearly-option">
                    매년
                  </MenuItem>
                </Select>
              </FormControl>
              <Stack direction="row" spacing={2}>
                <FormControl fullWidth>
                  <FormLabel htmlFor="repeat-interval">반복 간격</FormLabel>
                  <TextField
                    id="repeat-interval"
                    size="small"
                    type="number"
                    value={repeatInterval}
                    onChange={(e) => setRepeatInterval(Number(e.target.value))}
                    slotProps={{ htmlInput: { min: 1 } }}
                  />
                </FormControl>
                <FormControl fullWidth>
                  <FormLabel htmlFor="repeat-end-date">반복 종료일</FormLabel>
                  <TextField
                    id="repeat-end-date"
                    size="small"
                    type="date"
                    value={repeatEndDate}
                    onChange={(e) => setRepeatEndDate(e.target.value)}
                  />
                </FormControl>
              </Stack>
            </Stack>
          )}

          <FormControl fullWidth>
            <FormLabel htmlFor="notification">알림 설정</FormLabel>
            <Select
              id="notification"
              size="small"
              value={notificationTime}
              onChange={(e) => setNotificationTime(Number(e.target.value))}
            >
              {notificationOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Button
            data-testid="event-submit-button"
            onClick={addOrUpdateEvent}
            variant="contained"
            color="primary"
          >
            {editingEvent ? '일정 수정' : '일정 추가'}
          </Button>
        </Stack>

        <Stack flex={1} spacing={5}>
          <Typography variant="h4">일정 보기</Typography>

          <Stack direction="row" spacing={2} justifyContent="space-between" alignItems="center">
            <IconButton aria-label="Previous" onClick={() => navigate('prev')}>
              <ChevronLeft />
            </IconButton>
            <Select
              size="small"
              aria-label="뷰 타입 선택"
              value={view}
              onChange={(e) => setView(e.target.value as 'week' | 'month')}
            >
              <MenuItem value="week" aria-label="week-option">
                Week
              </MenuItem>
              <MenuItem value="month" aria-label="month-option">
                Month
              </MenuItem>
            </Select>
            <IconButton aria-label="Next" onClick={() => navigate('next')}>
              <ChevronRight />
            </IconButton>
          </Stack>

          {view === 'week' && renderWeekView()}
          {view === 'month' && renderMonthView()}
        </Stack>

        <Stack
          data-testid="event-list"
          spacing={2}
          sx={{ width: '30%', height: '100%', overflowY: 'auto' }}
        >
          <FormControl fullWidth>
            <FormLabel htmlFor="search">일정 검색</FormLabel>
            <TextField
              id="search"
              size="small"
              placeholder="검색어를 입력하세요"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </FormControl>

          {filteredEvents.length === 0 ? (
            <Typography>검색 결과가 없습니다.</Typography>
          ) : (
            filteredEvents.map((event) => (
              <Box key={event.id} sx={{ border: 1, borderRadius: 2, p: 3, width: '100%' }}>
                <Stack direction="row" justifyContent="space-between">
                  <Stack>
                    <Stack direction="row" spacing={1} alignItems="center">
                      {notifiedEvents.includes(event.id) && <Notifications color="error" />}
                      {event.repeat.type !== 'none' && (
                        <Tooltip
                          title={`${event.repeat.interval}${getRepeatTypeLabel(event.repeat.type)}마다 반복${
                            event.repeat.endDate ? ` (종료: ${event.repeat.endDate})` : ''
                          }`}
                        >
                          <Repeat fontSize="small" />
                        </Tooltip>
                      )}
                      <Typography
                        fontWeight={notifiedEvents.includes(event.id) ? 'bold' : 'normal'}
                        color={notifiedEvents.includes(event.id) ? 'error' : 'inherit'}
                      >
                        {event.title}
                      </Typography>
                    </Stack>
                    <Typography>{event.date}</Typography>
                    <Typography>
                      {event.startTime} - {event.endTime}
                    </Typography>
                    <Typography>{event.description}</Typography>
                    <Typography>{event.location}</Typography>
                    <Typography>카테고리: {event.category}</Typography>
                    {event.repeat.type !== 'none' && (
                      <Typography>
                        반복: {event.repeat.interval}
                        {event.repeat.type === 'daily' && '일'}
                        {event.repeat.type === 'weekly' && '주'}
                        {event.repeat.type === 'monthly' && '월'}
                        {event.repeat.type === 'yearly' && '년'}
                        마다
                        {event.repeat.endDate && ` (종료: ${event.repeat.endDate})`}
                      </Typography>
                    )}
                    <Typography>
                      알림:{' '}
                      {
                        notificationOptions.find(
                          (option) => option.value === event.notificationTime
                        )?.label
                      }
                    </Typography>
                  </Stack>
                  <Stack>
                    <IconButton aria-label="Edit event" onClick={() => handleEditEvent(event)}>
                      <Edit />
                    </IconButton>
                    <IconButton aria-label="Delete event" onClick={() => handleDeleteEvent(event)}>
                      <Delete />
                    </IconButton>
                  </Stack>
                </Stack>
              </Box>
            ))
          )}
        </Stack>
      </Stack>

      <Dialog open={isOverlapDialogOpen} onClose={() => setIsOverlapDialogOpen(false)}>
        <DialogTitle>일정 겹침 경고</DialogTitle>
        <DialogContent>
          <DialogContentText>다음 일정과 겹칩니다:</DialogContentText>
          {overlappingEvents.map((event) => (
            <Typography key={event.id} sx={{ ml: 1, mb: 1 }}>
              {event.title} ({event.date} {event.startTime}-{event.endTime})
            </Typography>
          ))}
          <DialogContentText>계속 진행하시겠습니까?</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsOverlapDialogOpen(false)}>취소</Button>
          <Button
            color="error"
            onClick={() => {
              setIsOverlapDialogOpen(false);
              saveEvent({
                id: editingEvent ? editingEvent.id : undefined,
                title,
                date,
                startTime,
                endTime,
                description,
                location,
                category,
                repeat: {
                  type: isRepeating ? repeatType : 'none',
                  interval: repeatInterval,
                  endDate: repeatEndDate || undefined,
                },
                notificationTime,
              });
            }}
          >
            계속 진행
          </Button>
        </DialogActions>
      </Dialog>

      <RecurringEventDialog
        open={isRecurringDialogOpen}
        onClose={() => {
          setIsRecurringDialogOpen(false);
          setPendingRecurringEdit(null);
          setPendingRecurringDelete(null);
        }}
        onConfirm={handleRecurringConfirm}
        event={recurringDialogMode === 'edit' ? pendingRecurringEdit : pendingRecurringDelete}
        mode={recurringDialogMode}
      />

      {notifications.length > 0 && (
        <Stack position="fixed" top={16} right={16} spacing={2} alignItems="flex-end">
          {notifications.map((notification, index) => (
            <Alert
              key={index}
              severity="info"
              sx={{ width: 'auto' }}
              action={
                <IconButton
                  size="small"
                  onClick={() => setNotifications((prev) => prev.filter((_, i) => i !== index))}
                >
                  <Close />
                </IconButton>
              }
            >
              <AlertTitle>{notification.message}</AlertTitle>
            </Alert>
          ))}
        </Stack>
      )}
    </Box>
  );
}

export default App;

```

```typescriptreact
import ChevronLeft from '@mui/icons-material/ChevronLeft';
import ChevronRight from '@mui/icons-material/ChevronRight';
import Close from '@mui/icons-material/Close';
import Delete from '@mui/icons-material/Delete';
import Edit from '@mui/icons-material/Edit';
import Notifications from '@mui/icons-material/Notifications';
import Repeat from '@mui/icons-material/Repeat';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormLabel,
  IconButton,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useSnackbar } from 'notistack';
import { DragEvent as ReactDragEvent, useState } from 'react';

import RecurringEventDialog from './components/RecurringEventDialog.tsx';
import { useCalendarView } from './hooks/useCalendarView.ts';
import { useEventForm } from './hooks/useEventForm.ts';
import { useEventOperations } from './hooks/useEventOperations.ts';
import { useNotifications } from './hooks/useNotifications.ts';
import { useRecurringEventOperations } from './hooks/useRecurringEventOperations.ts';
import { useSearch } from './hooks/useSearch.ts';
import { Event, EventForm, RepeatType } from './types.ts';
import {
  formatDate,
  formatMonth,
  formatWeek,
  getEventsForDay,
  getWeekDates,
  getWeeksAtMonth,
} from './utils/dateUtils.ts';
import { findOverlappingEvents } from './utils/eventOverlap.ts';
import { getTimeErrorMessage } from './utils/timeValidation.ts';

const categories = ['업무', '개인', '가족', '기타'];

const weekDays = ['일', '월', '화', '수', '목', '금', '토'];

const notificationOptions = [
  { value: 1, label: '1분 전' },
  { value: 10, label: '10분 전' },
  { value: 60, label: '1시간 전' },
  { value: 120, label: '2시간 전' },
  { value: 1440, label: '1일 전' },
];

// 스타일 상수
const eventBoxStyles = {
  notified: {
    backgroundColor: '#ffebee',
    fontWeight: 'bold',
    color: '#d32f2f',
  },
  normal: {
    backgroundColor: '#f5f5f5',
    fontWeight: 'normal',
    color: 'inherit',
  },
  common: {
    p: 0.5,
    my: 0.5,
    borderRadius: 1,
    minHeight: '18px',
    width: '100%',
    overflow: 'hidden',
  },
};

const getRepeatTypeLabel = (type: RepeatType): string => {
  switch (type) {
    case 'daily':
      return '일';
    case 'weekly':
      return '주';
    case 'monthly':
      return '월';
    case 'yearly':
      return '년';
    default:
      return '';
  }
};

function App() {
  const {
    title,
    setTitle,
    date,
    setDate,
    startTime,
    endTime,
    description,
    setDescription,
    location,
    setLocation,
    category,
    setCategory,
    isRepeating,
    setIsRepeating,
    repeatType,
    setRepeatType,
    repeatInterval,
    setRepeatInterval,
    repeatEndDate,
    setRepeatEndDate,
    notificationTime,
    setNotificationTime,
    startTimeError,
    endTimeError,
    editingEvent,
    setEditingEvent,
    handleStartTimeChange,
    handleEndTimeChange,
    resetForm,
    editEvent,
  } = useEventForm();

  const { events, saveEvent, deleteEvent, createRepeatEvent, fetchEvents } = useEventOperations(
    Boolean(editingEvent),
    () => setEditingEvent(null)
  );

  const { handleRecurringEdit, handleRecurringDelete } = useRecurringEventOperations(
    events,
    async () => {
      // After recurring edit, refresh events from server
      await fetchEvents();
    }
  );

  const { notifications, notifiedEvents, setNotifications } = useNotifications(events);
  const { view, setView, currentDate, holidays, navigate } = useCalendarView();
  const { searchTerm, filteredEvents, setSearchTerm } = useSearch(events, currentDate, view);

  const [isOverlapDialogOpen, setIsOverlapDialogOpen] = useState(false);
  const [overlappingEvents, setOverlappingEvents] = useState<Event[]>([]);
  const [isRecurringDialogOpen, setIsRecurringDialogOpen] = useState(false);
  const [pendingRecurringEdit, setPendingRecurringEdit] = useState<Event | null>(null);
  const [pendingRecurringDelete, setPendingRecurringDelete] = useState<Event | null>(null);
  const [recurringEditMode, setRecurringEditMode] = useState<boolean | null>(null); // true = single, false = all
  const [recurringDialogMode, setRecurringDialogMode] = useState<'edit' | 'delete'>('edit');
  
  // 드래그 앤 드롭 상태
  const [draggedEventId, setDraggedEventId] = useState<string | null>(null);
  const [dragOverCellDate, setDragOverCellDate] = useState<string | null>(null);
  const [isDraggingOverCalendar, setIsDraggingOverCalendar] = useState(false);

  const { enqueueSnackbar } = useSnackbar();

  const handleRecurringConfirm = async (editSingleOnly: boolean) => {
    if (recurringDialogMode === 'edit' && pendingRecurringEdit) {
      // 편집 모드 저장하고 편집 폼으로 이동
      setRecurringEditMode(editSingleOnly);
      editEvent(pendingRecurringEdit);
      setIsRecurringDialogOpen(false);
      setPendingRecurringEdit(null);
    } else if (recurringDialogMode === 'delete' && pendingRecurringDelete) {
      // 반복 일정 삭제 처리
      try {
        await handleRecurringDelete(pendingRecurringDelete, editSingleOnly);
        enqueueSnackbar('일정이 삭제되었습니다', { variant: 'success' });
      } catch (error) {
        console.error(error);
        enqueueSnackbar('일정 삭제 실패', { variant: 'error' });
      }
      setIsRecurringDialogOpen(false);
      setPendingRecurringDelete(null);
    }
  };

  const isRecurringEvent = (event: Event): boolean => {
    return event.repeat.type !== 'none' && event.repeat.interval > 0;
  };

  const handleEditEvent = (event: Event) => {
    if (isRecurringEvent(event)) {
      // Show recurring edit dialog
      setPendingRecurringEdit(event);
      setRecurringDialogMode('edit');
      setIsRecurringDialogOpen(true);
    } else {
      // Regular event editing
      editEvent(event);
    }
  };

  const handleDeleteEvent = (event: Event) => {
    if (isRecurringEvent(event)) {
      // Show recurring delete dialog
      setPendingRecurringDelete(event);
      setRecurringDialogMode('delete');
      setIsRecurringDialogOpen(true);
    } else {
      // Regular event deletion
      deleteEvent(event.id);
    }
  };

  // 드래그 앤 드롭 핸들러
  const handleDragStart = (e: ReactDragEvent<HTMLElement>, eventId: string) => {
    setDraggedEventId(eventId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', eventId);
    
    // 드래그 중인 요소에 스타일 적용
    const target = e.currentTarget as HTMLElement;
    target.style.opacity = '0.5';
    target.setAttribute('data-dragging', 'true');
  };

  const handleDragEnd = (e: ReactDragEvent<HTMLElement>) => {
    setDraggedEventId(null);
    setDragOverCellDate(null);
    setIsDraggingOverCalendar(false);
    
    // 드래그 종료 시 스타일 복원
    const target = e.currentTarget as HTMLElement;
    target.style.opacity = '1';
    target.removeAttribute('data-dragging');
    
    // body 커서 스타일 복원
    document.body.style.cursor = '';
  };

  const handleDragOverCell = (e: ReactDragEvent<HTMLElement>, dateString: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverCellDate(dateString);
    setIsDraggingOverCalendar(true);
    
    // 셀에 droppable 속성 추가
    const target = e.currentTarget as HTMLElement;
    target.setAttribute('data-droppable', 'true');
    
    // body 커서 스타일 제거 (캘린더 내부)
    document.body.style.cursor = '';
  };

  const handleDragLeaveCell = (e: ReactDragEvent<HTMLElement>) => {
    const target = e.currentTarget as HTMLElement;
    target.removeAttribute('data-droppable');
  };

  const handleDragOverOutside = (e: ReactDragEvent<HTMLElement>) => {
    e.preventDefault();
    setIsDraggingOverCalendar(false);
    
    // 캘린더 외부일 때 not-allowed 커서 표시
    if (draggedEventId) {
      document.body.style.cursor = 'not-allowed';
    }
  };

  const handleDrop = (e: ReactDragEvent<HTMLElement>) => {
    e.preventDefault();
    const target = e.currentTarget as HTMLElement;
    target.removeAttribute('data-droppable');
    
    // TODO: 실제 드롭 처리 로직 (다음 스토리에서 구현)
  };

  const addOrUpdateEvent = async () => {
    if (!title || !date || !startTime || !endTime) {
      enqueueSnackbar('필수 정보를 모두 입력해주세요.', { variant: 'error' });
      return;
    }

    if (startTimeError || endTimeError) {
      enqueueSnackbar('시간 설정을 확인해주세요.', { variant: 'error' });
      return;
    }

    const eventData: Event | EventForm = {
      id: editingEvent ? editingEvent.id : undefined,
      title,
      date,
      startTime,
      endTime,
      description,
      location,
      category,
      repeat: editingEvent
        ? editingEvent.repeat // Keep original repeat settings for recurring event detection
        : {
            type: isRepeating ? repeatType : 'none',
            interval: repeatInterval,
            endDate: repeatEndDate || undefined,
          },
      notificationTime,
    };

    const overlapping = findOverlappingEvents(eventData, events);
    const hasOverlapEvent = overlapping.length > 0;

    // 수정
    if (editingEvent) {
      if (hasOverlapEvent) {
        setOverlappingEvents(overlapping);
        setIsOverlapDialogOpen(true);
        return;
      }

      if (
        editingEvent.repeat.type !== 'none' &&
        editingEvent.repeat.interval > 0 &&
        recurringEditMode !== null
      ) {
        await handleRecurringEdit(eventData as Event, recurringEditMode);
        setRecurringEditMode(null);
      } else {
        await saveEvent(eventData);
      }

      resetForm();
      return;
    }

    // 생성
    if (isRepeating) {
      // 반복 생성은 반복 일정을 고려하지 않는다.
      await createRepeatEvent(eventData);
      resetForm();
      return;
    }

    if (hasOverlapEvent) {
      setOverlappingEvents(overlapping);
      setIsOverlapDialogOpen(true);
      return;
    }

    await saveEvent(eventData);
    resetForm();
  };

  const renderWeekView = () => {
    const weekDates = getWeekDates(currentDate);
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
                {weekDates.map((date) => (
                  <TableCell
                    key={date.toISOString()}
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
                      .map((event) => {
                        const isNotified = notifiedEvents.includes(event.id);
                        const isRepeating = event.repeat.type !== 'none';

                        return (
                          <Box
                            key={event.id}
                            sx={{
                              ...eventBoxStyles.common,
                              ...(isNotified ? eventBoxStyles.notified : eventBoxStyles.normal),
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
                ))}
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Stack>
    );
  };

  const renderMonthView = () => {
    const weeks = getWeeksAtMonth(currentDate);

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
                        onDragOver={(e) => day && handleDragOverCell(e, dateString)}
                        onDragLeave={handleDragLeaveCell}
                        onDrop={handleDrop}
                        sx={{
                          height: '120px',
                          verticalAlign: 'top',
                          width: '14.28%',
                          padding: 1,
                          border: '1px solid #e0e0e0',
                          overflow: 'hidden',
                          position: 'relative',
                          backgroundColor: dragOverCellDate === dateString ? '#e3f2fd' : 'transparent',
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
                                <Box
                                  key={event.id}
                                  draggable
                                  onDragStart={(e) => handleDragStart(e, event.id)}
                                  onDragEnd={handleDragEnd}
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
                                >
                                  <Stack direction="row" spacing={1} alignItems="center">
                                    {isNotified && <Notifications fontSize="small" />}
                                    {/* ! TEST CASE */}
                                    {isRepeating && (
                                      <Tooltip
                                        title={`${event.repeat.interval}${getRepeatTypeLabel(event.repeat.type)}마다 반복${
                                          event.repeat.endDate
                                            ? ` (종료: ${event.repeat.endDate})`
                                            : ''
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

  return (
    <Box sx={{ width: '100%', height: '100vh', margin: 'auto', p: 5 }}>
      <Stack direction="row" spacing={6} sx={{ height: '100%' }}>
        <Stack spacing={2} sx={{ width: '20%' }}>
          <Typography variant="h4">{editingEvent ? '일정 수정' : '일정 추가'}</Typography>

          <FormControl fullWidth>
            <FormLabel htmlFor="title">제목</FormLabel>
            <TextField
              id="title"
              size="small"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </FormControl>

          <FormControl fullWidth>
            <FormLabel htmlFor="date">날짜</FormLabel>
            <TextField
              id="date"
              size="small"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </FormControl>

          <Stack direction="row" spacing={2}>
            <FormControl fullWidth>
              <FormLabel htmlFor="start-time">시작 시간</FormLabel>
              <Tooltip title={startTimeError || ''} open={!!startTimeError} placement="top">
                <TextField
                  id="start-time"
                  size="small"
                  type="time"
                  value={startTime}
                  onChange={handleStartTimeChange}
                  onBlur={() => getTimeErrorMessage(startTime, endTime)}
                  error={!!startTimeError}
                />
              </Tooltip>
            </FormControl>
            <FormControl fullWidth>
              <FormLabel htmlFor="end-time">종료 시간</FormLabel>
              <Tooltip title={endTimeError || ''} open={!!endTimeError} placement="top">
                <TextField
                  id="end-time"
                  size="small"
                  type="time"
                  value={endTime}
                  onChange={handleEndTimeChange}
                  onBlur={() => getTimeErrorMessage(startTime, endTime)}
                  error={!!endTimeError}
                />
              </Tooltip>
            </FormControl>
          </Stack>

          <FormControl fullWidth>
            <FormLabel htmlFor="description">설명</FormLabel>
            <TextField
              id="description"
              size="small"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </FormControl>

          <FormControl fullWidth>
            <FormLabel htmlFor="location">위치</FormLabel>
            <TextField
              id="location"
              size="small"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </FormControl>

          <FormControl fullWidth>
            <FormLabel id="category-label">카테고리</FormLabel>
            <Select
              id="category"
              size="small"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              aria-labelledby="category-label"
              aria-label="카테고리"
            >
              {categories.map((cat) => (
                <MenuItem key={cat} value={cat} aria-label={`${cat}-option`}>
                  {cat}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {!editingEvent && (
            <FormControl>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={isRepeating}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setIsRepeating(checked);
                      if (checked) {
                        setRepeatType('daily');
                      } else {
                        setRepeatType('none');
                      }
                    }}
                  />
                }
                label="반복 일정"
              />
            </FormControl>
          )}

          {/* ! TEST CASE */}
          {isRepeating && !editingEvent && (
            <Stack spacing={2}>
              <FormControl fullWidth>
                <FormLabel>반복 유형</FormLabel>
                <Select
                  size="small"
                  value={repeatType}
                  aria-label="반복 유형"
                  onChange={(e) => setRepeatType(e.target.value as RepeatType)}
                >
                  <MenuItem value="daily" aria-label="daily-option">
                    매일
                  </MenuItem>
                  <MenuItem value="weekly" aria-label="weekly-option">
                    매주
                  </MenuItem>
                  <MenuItem value="monthly" aria-label="monthly-option">
                    매월
                  </MenuItem>
                  <MenuItem value="yearly" aria-label="yearly-option">
                    매년
                  </MenuItem>
                </Select>
              </FormControl>
              <Stack direction="row" spacing={2}>
                <FormControl fullWidth>
                  <FormLabel htmlFor="repeat-interval">반복 간격</FormLabel>
                  <TextField
                    id="repeat-interval"
                    size="small"
                    type="number"
                    value={repeatInterval}
                    onChange={(e) => setRepeatInterval(Number(e.target.value))}
                    slotProps={{ htmlInput: { min: 1 } }}
                  />
                </FormControl>
                <FormControl fullWidth>
                  <FormLabel htmlFor="repeat-end-date">반복 종료일</FormLabel>
                  <TextField
                    id="repeat-end-date"
                    size="small"
                    type="date"
                    value={repeatEndDate}
                    onChange={(e) => setRepeatEndDate(e.target.value)}
                  />
                </FormControl>
              </Stack>
            </Stack>
          )}

          <FormControl fullWidth>
            <FormLabel htmlFor="notification">알림 설정</FormLabel>
            <Select
              id="notification"
              size="small"
              value={notificationTime}
              onChange={(e) => setNotificationTime(Number(e.target.value))}
            >
              {notificationOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Button
            data-testid="event-submit-button"
            onClick={addOrUpdateEvent}
            variant="contained"
            color="primary"
          >
            {editingEvent ? '일정 수정' : '일정 추가'}
          </Button>
        </Stack>

        <Stack flex={1} spacing={5}>
          <Typography variant="h4">일정 보기</Typography>

          <Stack direction="row" spacing={2} justifyContent="space-between" alignItems="center">
            <IconButton aria-label="Previous" onClick={() => navigate('prev')}>
              <ChevronLeft />
            </IconButton>
            <Select
              size="small"
              aria-label="뷰 타입 선택"
              value={view}
              onChange={(e) => setView(e.target.value as 'week' | 'month')}
            >
              <MenuItem value="week" aria-label="week-option">
                Week
              </MenuItem>
              <MenuItem value="month" aria-label="month-option">
                Month
              </MenuItem>
            </Select>
            <IconButton aria-label="Next" onClick={() => navigate('next')}>
              <ChevronRight />
            </IconButton>
          </Stack>

          {view === 'week' && renderWeekView()}
          {view === 'month' && renderMonthView()}
        </Stack>

        <Stack
          data-testid="event-list"
          spacing={2}
          sx={{ width: '30%', height: '100%', overflowY: 'auto' }}
        >
          <FormControl fullWidth>
            <FormLabel htmlFor="search">일정 검색</FormLabel>
            <TextField
              id="search"
              size="small"
              placeholder="검색어를 입력하세요"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </FormControl>

          {filteredEvents.length === 0 ? (
            <Typography>검색 결과가 없습니다.</Typography>
          ) : (
            filteredEvents.map((event) => (
              <Box key={event.id} sx={{ border: 1, borderRadius: 2, p: 3, width: '100%' }}>
                <Stack direction="row" justifyContent="space-between">
                  <Stack>
                    <Stack direction="row" spacing={1} alignItems="center">
                      {notifiedEvents.includes(event.id) && <Notifications color="error" />}
                      {event.repeat.type !== 'none' && (
                        <Tooltip
                          title={`${event.repeat.interval}${getRepeatTypeLabel(event.repeat.type)}마다 반복${
                            event.repeat.endDate ? ` (종료: ${event.repeat.endDate})` : ''
                          }`}
                        >
                          <Repeat fontSize="small" />
                        </Tooltip>
                      )}
                      <Typography
                        fontWeight={notifiedEvents.includes(event.id) ? 'bold' : 'normal'}
                        color={notifiedEvents.includes(event.id) ? 'error' : 'inherit'}
                      >
                        {event.title}
                      </Typography>
                    </Stack>
                    <Typography>{event.date}</Typography>
                    <Typography>
                      {event.startTime} - {event.endTime}
                    </Typography>
                    <Typography>{event.description}</Typography>
                    <Typography>{event.location}</Typography>
                    <Typography>카테고리: {event.category}</Typography>
                    {event.repeat.type !== 'none' && (
                      <Typography>
                        반복: {event.repeat.interval}
                        {event.repeat.type === 'daily' && '일'}
                        {event.repeat.type === 'weekly' && '주'}
                        {event.repeat.type === 'monthly' && '월'}
                        {event.repeat.type === 'yearly' && '년'}
                        마다
                        {event.repeat.endDate && ` (종료: ${event.repeat.endDate})`}
                      </Typography>
                    )}
                    <Typography>
                      알림:{' '}
                      {
                        notificationOptions.find(
                          (option) => option.value === event.notificationTime
                        )?.label
                      }
                    </Typography>
                  </Stack>
                  <Stack>
                    <IconButton aria-label="Edit event" onClick={() => handleEditEvent(event)}>
                      <Edit />
                    </IconButton>
                    <IconButton aria-label="Delete event" onClick={() => handleDeleteEvent(event)}>
                      <Delete />
                    </IconButton>
                  </Stack>
                </Stack>
              </Box>
            ))
          )}
        </Stack>
      </Stack>

      <Dialog open={isOverlapDialogOpen} onClose={() => setIsOverlapDialogOpen(false)}>
        <DialogTitle>일정 겹침 경고</DialogTitle>
        <DialogContent>
          <DialogContentText>다음 일정과 겹칩니다:</DialogContentText>
          {overlappingEvents.map((event) => (
            <Typography key={event.id} sx={{ ml: 1, mb: 1 }}>
              {event.title} ({event.date} {event.startTime}-{event.endTime})
            </Typography>
          ))}
          <DialogContentText>계속 진행하시겠습니까?</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsOverlapDialogOpen(false)}>취소</Button>
          <Button
            color="error"
            onClick={() => {
              setIsOverlapDialogOpen(false);
              saveEvent({
                id: editingEvent ? editingEvent.id : undefined,
                title,
                date,
                startTime,
                endTime,
                description,
                location,
                category,
                repeat: {
                  type: isRepeating ? repeatType : 'none',
                  interval: repeatInterval,
                  endDate: repeatEndDate || undefined,
                },
                notificationTime,
              });
            }}
          >
            계속 진행
          </Button>
        </DialogActions>
      </Dialog>

      <RecurringEventDialog
        open={isRecurringDialogOpen}
        onClose={() => {
          setIsRecurringDialogOpen(false);
          setPendingRecurringEdit(null);
          setPendingRecurringDelete(null);
        }}
        onConfirm={handleRecurringConfirm}
        event={recurringDialogMode === 'edit' ? pendingRecurringEdit : pendingRecurringDelete}
        mode={recurringDialogMode}
      />

      {notifications.length > 0 && (
        <Stack position="fixed" top={16} right={16} spacing={2} alignItems="flex-end">
          {notifications.map((notification, index) => (
            <Alert
              key={index}
              severity="info"
              sx={{ width: 'auto' }}
              action={
                <IconButton
                  size="small"
                  onClick={() => setNotifications((prev) => prev.filter((_, i) => i !== index))}
                >
                  <Close />
                </IconButton>
              }
            >
              <AlertTitle>{notification.message}</AlertTitle>
            </Alert>
          ))}
        </Stack>
      )}
    </Box>
  );
}

export default App;

```

```typescriptreact
import ChevronLeft from '@mui/icons-material/ChevronLeft';
import ChevronRight from '@mui/icons-material/ChevronRight';
import Close from '@mui/icons-material/Close';
import Delete from '@mui/icons-material/Delete';
import Edit from '@mui/icons-material/Edit';
import Notifications from '@mui/icons-material/Notifications';
import Repeat from '@mui/icons-material/Repeat';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormLabel,
  IconButton,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useSnackbar } from 'notistack';
import { DragEvent as ReactDragEvent, useState } from 'react';

import RecurringEventDialog from './components/RecurringEventDialog.tsx';
import { useCalendarView } from './hooks/useCalendarView.ts';
import { useEventForm } from './hooks/useEventForm.ts';
import { useEventOperations } from './hooks/useEventOperations.ts';
import { useNotifications } from './hooks/useNotifications.ts';
import { useRecurringEventOperations } from './hooks/useRecurringEventOperations.ts';
import { useSearch } from './hooks/useSearch.ts';
import { Event, EventForm, RepeatType } from './types.ts';
import {
  formatDate,
  formatMonth,
  formatWeek,
  getEventsForDay,
  getWeekDates,
  getWeeksAtMonth,
} from './utils/dateUtils.ts';
import { findOverlappingEvents } from './utils/eventOverlap.ts';
import { getTimeErrorMessage } from './utils/timeValidation.ts';

const categories = ['업무', '개인', '가족', '기타'];

const weekDays = ['일', '월', '화', '수', '목', '금', '토'];

const notificationOptions = [
  { value: 1, label: '1분 전' },
  { value: 10, label: '10분 전' },
  { value: 60, label: '1시간 전' },
  { value: 120, label: '2시간 전' },
  { value: 1440, label: '1일 전' },
];

// 스타일 상수
const eventBoxStyles = {
  notified: {
    backgroundColor: '#ffebee',
    fontWeight: 'bold',
    color: '#d32f2f',
  },
  normal: {
    backgroundColor: '#f5f5f5',
    fontWeight: 'normal',
    color: 'inherit',
  },
  common: {
    p: 0.5,
    my: 0.5,
    borderRadius: 1,
    minHeight: '18px',
    width: '100%',
    overflow: 'hidden',
  },
};

const getRepeatTypeLabel = (type: RepeatType): string => {
  switch (type) {
    case 'daily':
      return '일';
    case 'weekly':
      return '주';
    case 'monthly':
      return '월';
    case 'yearly':
      return '년';
    default:
      return '';
  }
};

function App() {
  const {
    title,
    setTitle,
    date,
    setDate,
    startTime,
    endTime,
    description,
    setDescription,
    location,
    setLocation,
    category,
    setCategory,
    isRepeating,
    setIsRepeating,
    repeatType,
    setRepeatType,
    repeatInterval,
    setRepeatInterval,
    repeatEndDate,
    setRepeatEndDate,
    notificationTime,
    setNotificationTime,
    startTimeError,
    endTimeError,
    editingEvent,
    setEditingEvent,
    handleStartTimeChange,
    handleEndTimeChange,
    resetForm,
    editEvent,
  } = useEventForm();

  const { events, saveEvent, deleteEvent, createRepeatEvent, fetchEvents } = useEventOperations(
    Boolean(editingEvent),
    () => setEditingEvent(null)
  );

  const { handleRecurringEdit, handleRecurringDelete } = useRecurringEventOperations(
    events,
    async () => {
      // After recurring edit, refresh events from server
      await fetchEvents();
    }
  );

  const { notifications, notifiedEvents, setNotifications } = useNotifications(events);
  const { view, setView, currentDate, holidays, navigate } = useCalendarView();
  const { searchTerm, filteredEvents, setSearchTerm } = useSearch(events, currentDate, view);

  const [isOverlapDialogOpen, setIsOverlapDialogOpen] = useState(false);
  const [overlappingEvents, setOverlappingEvents] = useState<Event[]>([]);
  const [isRecurringDialogOpen, setIsRecurringDialogOpen] = useState(false);
  const [pendingRecurringEdit, setPendingRecurringEdit] = useState<Event | null>(null);
  const [pendingRecurringDelete, setPendingRecurringDelete] = useState<Event | null>(null);
  const [recurringEditMode, setRecurringEditMode] = useState<boolean | null>(null); // true = single, false = all
  const [recurringDialogMode, setRecurringDialogMode] = useState<'edit' | 'delete'>('edit');
  
  // 드래그 앤 드롭 상태
  const [draggedEventId, setDraggedEventId] = useState<string | null>(null);
  const [dragOverCellDate, setDragOverCellDate] = useState<string | null>(null);
  const [isDraggingOverCalendar, setIsDraggingOverCalendar] = useState(false);

  const { enqueueSnackbar } = useSnackbar();

  const handleRecurringConfirm = async (editSingleOnly: boolean) => {
    if (recurringDialogMode === 'edit' && pendingRecurringEdit) {
      // 편집 모드 저장하고 편집 폼으로 이동
      setRecurringEditMode(editSingleOnly);
      editEvent(pendingRecurringEdit);
      setIsRecurringDialogOpen(false);
      setPendingRecurringEdit(null);
    } else if (recurringDialogMode === 'delete' && pendingRecurringDelete) {
      // 반복 일정 삭제 처리
      try {
        await handleRecurringDelete(pendingRecurringDelete, editSingleOnly);
        enqueueSnackbar('일정이 삭제되었습니다', { variant: 'success' });
      } catch (error) {
        console.error(error);
        enqueueSnackbar('일정 삭제 실패', { variant: 'error' });
      }
      setIsRecurringDialogOpen(false);
      setPendingRecurringDelete(null);
    }
  };

  const isRecurringEvent = (event: Event): boolean => {
    return event.repeat.type !== 'none' && event.repeat.interval > 0;
  };

  const handleEditEvent = (event: Event) => {
    if (isRecurringEvent(event)) {
      // Show recurring edit dialog
      setPendingRecurringEdit(event);
      setRecurringDialogMode('edit');
      setIsRecurringDialogOpen(true);
    } else {
      // Regular event editing
      editEvent(event);
    }
  };

  const handleDeleteEvent = (event: Event) => {
    if (isRecurringEvent(event)) {
      // Show recurring delete dialog
      setPendingRecurringDelete(event);
      setRecurringDialogMode('delete');
      setIsRecurringDialogOpen(true);
    } else {
      // Regular event deletion
      deleteEvent(event.id);
    }
  };

  // 드래그 앤 드롭 핸들러
  const handleDragStart = (e: ReactDragEvent<HTMLElement>, eventId: string) => {
    setDraggedEventId(eventId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', eventId);
    
    // 드래그 중인 요소에 스타일 적용
    const target = e.currentTarget as HTMLElement;
    target.style.opacity = '0.5';
    target.setAttribute('data-dragging', 'true');
  };

  const handleDragEnd = (e: ReactDragEvent<HTMLElement>) => {
    setDraggedEventId(null);
    setDragOverCellDate(null);
    setIsDraggingOverCalendar(false);
    
    // 드래그 종료 시 스타일 복원
    const target = e.currentTarget as HTMLElement;
    target.style.opacity = '1';
    target.removeAttribute('data-dragging');
    
    // body 커서 스타일 복원
    document.body.style.cursor = '';
  };

  const handleDragOverCell = (e: ReactDragEvent<HTMLElement>, dateString: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverCellDate(dateString);
    setIsDraggingOverCalendar(true);
    
    // 셀에 droppable 속성 추가
    const target = e.currentTarget as HTMLElement;
    target.setAttribute('data-droppable', 'true');
    
    // body 커서 스타일 제거 (캘린더 내부)
    document.body.style.cursor = '';
  };

  const handleDragLeaveCell = (e: ReactDragEvent<HTMLElement>) => {
    const target = e.currentTarget as HTMLElement;
    target.removeAttribute('data-droppable');
  };

  const handleDragOverOutside = (e: ReactDragEvent<HTMLElement>) => {
    e.preventDefault();
    setIsDraggingOverCalendar(false);
    
    // 캘린더 외부일 때 not-allowed 커서 표시
    if (draggedEventId) {
      document.body.style.cursor = 'not-allowed';
    }
  };

  const handleDrop = (e: ReactDragEvent<HTMLElement>) => {
    e.preventDefault();
    const target = e.currentTarget as HTMLElement;
    target.removeAttribute('data-droppable');
    
    // TODO: 실제 드롭 처리 로직 (다음 스토리에서 구현)
  };

  const addOrUpdateEvent = async () => {
    if (!title || !date || !startTime || !endTime) {
      enqueueSnackbar('필수 정보를 모두 입력해주세요.', { variant: 'error' });
      return;
    }

    if (startTimeError || endTimeError) {
      enqueueSnackbar('시간 설정을 확인해주세요.', { variant: 'error' });
      return;
    }

    const eventData: Event | EventForm = {
      id: editingEvent ? editingEvent.id : undefined,
      title,
      date,
      startTime,
      endTime,
      description,
      location,
      category,
      repeat: editingEvent
        ? editingEvent.repeat // Keep original repeat settings for recurring event detection
        : {
            type: isRepeating ? repeatType : 'none',
            interval: repeatInterval,
            endDate: repeatEndDate || undefined,
          },
      notificationTime,
    };

    const overlapping = findOverlappingEvents(eventData, events);
    const hasOverlapEvent = overlapping.length > 0;

    // 수정
    if (editingEvent) {
      if (hasOverlapEvent) {
        setOverlappingEvents(overlapping);
        setIsOverlapDialogOpen(true);
        return;
      }

      if (
        editingEvent.repeat.type !== 'none' &&
        editingEvent.repeat.interval > 0 &&
        recurringEditMode !== null
      ) {
        await handleRecurringEdit(eventData as Event, recurringEditMode);
        setRecurringEditMode(null);
      } else {
        await saveEvent(eventData);
      }

      resetForm();
      return;
    }

    // 생성
    if (isRepeating) {
      // 반복 생성은 반복 일정을 고려하지 않는다.
      await createRepeatEvent(eventData);
      resetForm();
      return;
    }

    if (hasOverlapEvent) {
      setOverlappingEvents(overlapping);
      setIsOverlapDialogOpen(true);
      return;
    }

    await saveEvent(eventData);
    resetForm();
  };

  const renderWeekView = () => {
    const weekDates = getWeekDates(currentDate);
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
                {weekDates.map((date) => (
                  <TableCell
                    key={date.toISOString()}
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
                      .map((event) => {
                        const isNotified = notifiedEvents.includes(event.id);
                        const isRepeating = event.repeat.type !== 'none';

                        return (
                          <Box
                            key={event.id}
                            sx={{
                              ...eventBoxStyles.common,
                              ...(isNotified ? eventBoxStyles.notified : eventBoxStyles.normal),
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
                ))}
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Stack>
    );
  };

  const renderMonthView = () => {
    const weeks = getWeeksAtMonth(currentDate);

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
                        onDragOver={(e) => day && handleDragOverCell(e, dateString)}
                        onDragLeave={handleDragLeaveCell}
                        onDrop={handleDrop}
                        sx={{
                          height: '120px',
                          verticalAlign: 'top',
                          width: '14.28%',
                          padding: 1,
                          border: '1px solid #e0e0e0',
                          overflow: 'hidden',
                          position: 'relative',
                          backgroundColor: dragOverCellDate === dateString ? '#e3f2fd' : 'transparent',
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
                                <Box
                                  key={event.id}
                                  draggable
                                  onDragStart={(e) => handleDragStart(e, event.id)}
                                  onDragEnd={handleDragEnd}
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
                                >
                                  <Stack direction="row" spacing={1} alignItems="center">
                                    {isNotified && <Notifications fontSize="small" />}
                                    {/* ! TEST CASE */}
                                    {isRepeating && (
                                      <Tooltip
                                        title={`${event.repeat.interval}${getRepeatTypeLabel(event.repeat.type)}마다 반복${
                                          event.repeat.endDate
                                            ? ` (종료: ${event.repeat.endDate})`
                                            : ''
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

  return (
    <Box sx={{ width: '100%', height: '100vh', margin: 'auto', p: 5 }}>
      <Stack direction="row" spacing={6} sx={{ height: '100%' }}>
        <Stack spacing={2} sx={{ width: '20%' }}>
          <Typography variant="h4">{editingEvent ? '일정 수정' : '일정 추가'}</Typography>

          <FormControl fullWidth>
            <FormLabel htmlFor="title">제목</FormLabel>
            <TextField
              id="title"
              size="small"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </FormControl>

          <FormControl fullWidth>
            <FormLabel htmlFor="date">날짜</FormLabel>
            <TextField
              id="date"
              size="small"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </FormControl>

          <Stack direction="row" spacing={2}>
            <FormControl fullWidth>
              <FormLabel htmlFor="start-time">시작 시간</FormLabel>
              <Tooltip title={startTimeError || ''} open={!!startTimeError} placement="top">
                <TextField
                  id="start-time"
                  size="small"
                  type="time"
                  value={startTime}
                  onChange={handleStartTimeChange}
                  onBlur={() => getTimeErrorMessage(startTime, endTime)}
                  error={!!startTimeError}
                />
              </Tooltip>
            </FormControl>
            <FormControl fullWidth>
              <FormLabel htmlFor="end-time">종료 시간</FormLabel>
              <Tooltip title={endTimeError || ''} open={!!endTimeError} placement="top">
                <TextField
                  id="end-time"
                  size="small"
                  type="time"
                  value={endTime}
                  onChange={handleEndTimeChange}
                  onBlur={() => getTimeErrorMessage(startTime, endTime)}
                  error={!!endTimeError}
                />
              </Tooltip>
            </FormControl>
          </Stack>

          <FormControl fullWidth>
            <FormLabel htmlFor="description">설명</FormLabel>
            <TextField
              id="description"
              size="small"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </FormControl>

          <FormControl fullWidth>
            <FormLabel htmlFor="location">위치</FormLabel>
            <TextField
              id="location"
              size="small"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </FormControl>

          <FormControl fullWidth>
            <FormLabel id="category-label">카테고리</FormLabel>
            <Select
              id="category"
              size="small"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              aria-labelledby="category-label"
              aria-label="카테고리"
            >
              {categories.map((cat) => (
                <MenuItem key={cat} value={cat} aria-label={`${cat}-option`}>
                  {cat}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {!editingEvent && (
            <FormControl>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={isRepeating}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setIsRepeating(checked);
                      if (checked) {
                        setRepeatType('daily');
                      } else {
                        setRepeatType('none');
                      }
                    }}
                  />
                }
                label="반복 일정"
              />
            </FormControl>
          )}

          {/* ! TEST CASE */}
          {isRepeating && !editingEvent && (
            <Stack spacing={2}>
              <FormControl fullWidth>
                <FormLabel>반복 유형</FormLabel>
                <Select
                  size="small"
                  value={repeatType}
                  aria-label="반복 유형"
                  onChange={(e) => setRepeatType(e.target.value as RepeatType)}
                >
                  <MenuItem value="daily" aria-label="daily-option">
                    매일
                  </MenuItem>
                  <MenuItem value="weekly" aria-label="weekly-option">
                    매주
                  </MenuItem>
                  <MenuItem value="monthly" aria-label="monthly-option">
                    매월
                  </MenuItem>
                  <MenuItem value="yearly" aria-label="yearly-option">
                    매년
                  </MenuItem>
                </Select>
              </FormControl>
              <Stack direction="row" spacing={2}>
                <FormControl fullWidth>
                  <FormLabel htmlFor="repeat-interval">반복 간격</FormLabel>
                  <TextField
                    id="repeat-interval"
                    size="small"
                    type="number"
                    value={repeatInterval}
                    onChange={(e) => setRepeatInterval(Number(e.target.value))}
                    slotProps={{ htmlInput: { min: 1 } }}
                  />
                </FormControl>
                <FormControl fullWidth>
                  <FormLabel htmlFor="repeat-end-date">반복 종료일</FormLabel>
                  <TextField
                    id="repeat-end-date"
                    size="small"
                    type="date"
                    value={repeatEndDate}
                    onChange={(e) => setRepeatEndDate(e.target.value)}
                  />
                </FormControl>
              </Stack>
            </Stack>
          )}

          <FormControl fullWidth>
            <FormLabel htmlFor="notification">알림 설정</FormLabel>
            <Select
              id="notification"
              size="small"
              value={notificationTime}
              onChange={(e) => setNotificationTime(Number(e.target.value))}
            >
              {notificationOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Button
            data-testid="event-submit-button"
            onClick={addOrUpdateEvent}
            variant="contained"
            color="primary"
          >
            {editingEvent ? '일정 수정' : '일정 추가'}
          </Button>
        </Stack>

        <Stack flex={1} spacing={5}>
          <Typography variant="h4">일정 보기</Typography>

          <Stack direction="row" spacing={2} justifyContent="space-between" alignItems="center">
            <IconButton aria-label="Previous" onClick={() => navigate('prev')}>
              <ChevronLeft />
            </IconButton>
            <Select
              size="small"
              aria-label="뷰 타입 선택"
              value={view}
              onChange={(e) => setView(e.target.value as 'week' | 'month')}
            >
              <MenuItem value="week" aria-label="week-option">
                Week
              </MenuItem>
              <MenuItem value="month" aria-label="month-option">
                Month
              </MenuItem>
            </Select>
            <IconButton aria-label="Next" onClick={() => navigate('next')}>
              <ChevronRight />
            </IconButton>
          </Stack>

          {view === 'week' && renderWeekView()}
          {view === 'month' && renderMonthView()}
        </Stack>

        <Stack
          data-testid="event-list"
          spacing={2}
          sx={{ width: '30%', height: '100%', overflowY: 'auto' }}
          onDragOver={handleDragOverOutside}
        >
          <FormControl fullWidth>
            <FormLabel htmlFor="search">일정 검색</FormLabel>
            <TextField
              id="search"
              size="small"
              placeholder="검색어를 입력하세요"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </FormControl>

          {filteredEvents.length === 0 ? (
            <Typography>검색 결과가 없습니다.</Typography>
          ) : (
            filteredEvents.map((event) => (
              <Box key={event.id} sx={{ border: 1, borderRadius: 2, p: 3, width: '100%' }}>
                <Stack direction="row" justifyContent="space-between">
                  <Stack>
                    <Stack direction="row" spacing={1} alignItems="center">
                      {notifiedEvents.includes(event.id) && <Notifications color="error" />}
                      {event.repeat.type !== 'none' && (
                        <Tooltip
                          title={`${event.repeat.interval}${getRepeatTypeLabel(event.repeat.type)}마다 반복${
                            event.repeat.endDate ? ` (종료: ${event.repeat.endDate})` : ''
                          }`}
                        >
                          <Repeat fontSize="small" />
                        </Tooltip>
                      )}
                      <Typography
                        fontWeight={notifiedEvents.includes(event.id) ? 'bold' : 'normal'}
                        color={notifiedEvents.includes(event.id) ? 'error' : 'inherit'}
                      >
                        {event.title}
                      </Typography>
                    </Stack>
                    <Typography>{event.date}</Typography>
                    <Typography>
                      {event.startTime} - {event.endTime}
                    </Typography>
                    <Typography>{event.description}</Typography>
                    <Typography>{event.location}</Typography>
                    <Typography>카테고리: {event.category}</Typography>
                    {event.repeat.type !== 'none' && (
                      <Typography>
                        반복: {event.repeat.interval}
                        {event.repeat.type === 'daily' && '일'}
                        {event.repeat.type === 'weekly' && '주'}
                        {event.repeat.type === 'monthly' && '월'}
                        {event.repeat.type === 'yearly' && '년'}
                        마다
                        {event.repeat.endDate && ` (종료: ${event.repeat.endDate})`}
                      </Typography>
                    )}
                    <Typography>
                      알림:{' '}
                      {
                        notificationOptions.find(
                          (option) => option.value === event.notificationTime
                        )?.label
                      }
                    </Typography>
                  </Stack>
                  <Stack>
                    <IconButton aria-label="Edit event" onClick={() => handleEditEvent(event)}>
                      <Edit />
                    </IconButton>
                    <IconButton aria-label="Delete event" onClick={() => handleDeleteEvent(event)}>
                      <Delete />
                    </IconButton>
                  </Stack>
                </Stack>
              </Box>
            ))
          )}
        </Stack>
      </Stack>

      <Dialog open={isOverlapDialogOpen} onClose={() => setIsOverlapDialogOpen(false)}>
        <DialogTitle>일정 겹침 경고</DialogTitle>
        <DialogContent>
          <DialogContentText>다음 일정과 겹칩니다:</DialogContentText>
          {overlappingEvents.map((event) => (
            <Typography key={event.id} sx={{ ml: 1, mb: 1 }}>
              {event.title} ({event.date} {event.startTime}-{event.endTime})
            </Typography>
          ))}
          <DialogContentText>계속 진행하시겠습니까?</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsOverlapDialogOpen(false)}>취소</Button>
          <Button
            color="error"
            onClick={() => {
              setIsOverlapDialogOpen(false);
              saveEvent({
                id: editingEvent ? editingEvent.id : undefined,
                title,
                date,
                startTime,
                endTime,
                description,
                location,
                category,
                repeat: {
                  type: isRepeating ? repeatType : 'none',
                  interval: repeatInterval,
                  endDate: repeatEndDate || undefined,
                },
                notificationTime,
              });
            }}
          >
            계속 진행
          </Button>
        </DialogActions>
      </Dialog>

      <RecurringEventDialog
        open={isRecurringDialogOpen}
        onClose={() => {
          setIsRecurringDialogOpen(false);
          setPendingRecurringEdit(null);
          setPendingRecurringDelete(null);
        }}
        onConfirm={handleRecurringConfirm}
        event={recurringDialogMode === 'edit' ? pendingRecurringEdit : pendingRecurringDelete}
        mode={recurringDialogMode}
      />

      {notifications.length > 0 && (
        <Stack position="fixed" top={16} right={16} spacing={2} alignItems="flex-end">
          {notifications.map((notification, index) => (
            <Alert
              key={index}
              severity="info"
              sx={{ width: 'auto' }}
              action={
                <IconButton
                  size="small"
                  onClick={() => setNotifications((prev) => prev.filter((_, i) => i !== index))}
                >
                  <Close />
                </IconButton>
              }
            >
              <AlertTitle>{notification.message}</AlertTitle>
            </Alert>
          ))}
        </Stack>
      )}
    </Box>
  );
}

export default App;

```

이제 린터 에러를 확인하고 테스트를 실행해보겠습니다.

좋습니다! 린터 에러가 없습니다. 이제 테스트를 실행하여 통과하는지 확인하겠습니다.

좋습니다! 대부분 통과했지만 2개 테스트가 실패했습니다:
1. **배경색 변경**: computed style이 제대로 반영되지 않음
2. **커서 표시**: document.body 커서가 설정되지 않음

이 문제들을 수정하겠습니다.

```typescriptreact
import ChevronLeft from '@mui/icons-material/ChevronLeft';
import ChevronRight from '@mui/icons-material/ChevronRight';
import Close from '@mui/icons-material/Close';
import Delete from '@mui/icons-material/Delete';
import Edit from '@mui/icons-material/Edit';
import Notifications from '@mui/icons-material/Notifications';
import Repeat from '@mui/icons-material/Repeat';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormLabel,
  IconButton,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useSnackbar } from 'notistack';
import { DragEvent as ReactDragEvent, useState } from 'react';

import RecurringEventDialog from './components/RecurringEventDialog.tsx';
import { useCalendarView } from './hooks/useCalendarView.ts';
import { useEventForm } from './hooks/useEventForm.ts';
import { useEventOperations } from './hooks/useEventOperations.ts';
import { useNotifications } from './hooks/useNotifications.ts';
import { useRecurringEventOperations } from './hooks/useRecurringEventOperations.ts';
import { useSearch } from './hooks/useSearch.ts';
import { Event, EventForm, RepeatType } from './types.ts';
import {
  formatDate,
  formatMonth,
  formatWeek,
  getEventsForDay,
  getWeekDates,
  getWeeksAtMonth,
} from './utils/dateUtils.ts';
import { findOverlappingEvents } from './utils/eventOverlap.ts';
import { getTimeErrorMessage } from './utils/timeValidation.ts';

const categories = ['업무', '개인', '가족', '기타'];

const weekDays = ['일', '월', '화', '수', '목', '금', '토'];

const notificationOptions = [
  { value: 1, label: '1분 전' },
  { value: 10, label: '10분 전' },
  { value: 60, label: '1시간 전' },
  { value: 120, label: '2시간 전' },
  { value: 1440, label: '1일 전' },
];

// 스타일 상수
const eventBoxStyles = {
  notified: {
    backgroundColor: '#ffebee',
    fontWeight: 'bold',
    color: '#d32f2f',
  },
  normal: {
    backgroundColor: '#f5f5f5',
    fontWeight: 'normal',
    color: 'inherit',
  },
  common: {
    p: 0.5,
    my: 0.5,
    borderRadius: 1,
    minHeight: '18px',
    width: '100%',
    overflow: 'hidden',
  },
};

const getRepeatTypeLabel = (type: RepeatType): string => {
  switch (type) {
    case 'daily':
      return '일';
    case 'weekly':
      return '주';
    case 'monthly':
      return '월';
    case 'yearly':
      return '년';
    default:
      return '';
  }
};

function App() {
  const {
    title,
    setTitle,
    date,
    setDate,
    startTime,
    endTime,
    description,
    setDescription,
    location,
    setLocation,
    category,
    setCategory,
    isRepeating,
    setIsRepeating,
    repeatType,
    setRepeatType,
    repeatInterval,
    setRepeatInterval,
    repeatEndDate,
    setRepeatEndDate,
    notificationTime,
    setNotificationTime,
    startTimeError,
    endTimeError,
    editingEvent,
    setEditingEvent,
    handleStartTimeChange,
    handleEndTimeChange,
    resetForm,
    editEvent,
  } = useEventForm();

  const { events, saveEvent, deleteEvent, createRepeatEvent, fetchEvents } = useEventOperations(
    Boolean(editingEvent),
    () => setEditingEvent(null)
  );

  const { handleRecurringEdit, handleRecurringDelete } = useRecurringEventOperations(
    events,
    async () => {
      // After recurring edit, refresh events from server
      await fetchEvents();
    }
  );

  const { notifications, notifiedEvents, setNotifications } = useNotifications(events);
  const { view, setView, currentDate, holidays, navigate } = useCalendarView();
  const { searchTerm, filteredEvents, setSearchTerm } = useSearch(events, currentDate, view);

  const [isOverlapDialogOpen, setIsOverlapDialogOpen] = useState(false);
  const [overlappingEvents, setOverlappingEvents] = useState<Event[]>([]);
  const [isRecurringDialogOpen, setIsRecurringDialogOpen] = useState(false);
  const [pendingRecurringEdit, setPendingRecurringEdit] = useState<Event | null>(null);
  const [pendingRecurringDelete, setPendingRecurringDelete] = useState<Event | null>(null);
  const [recurringEditMode, setRecurringEditMode] = useState<boolean | null>(null); // true = single, false = all
  const [recurringDialogMode, setRecurringDialogMode] = useState<'edit' | 'delete'>('edit');
  
  // 드래그 앤 드롭 상태
  const [draggedEventId, setDraggedEventId] = useState<string | null>(null);
  const [dragOverCellDate, setDragOverCellDate] = useState<string | null>(null);
  const [isDraggingOverCalendar, setIsDraggingOverCalendar] = useState(false);

  const { enqueueSnackbar } = useSnackbar();

  const handleRecurringConfirm = async (editSingleOnly: boolean) => {
    if (recurringDialogMode === 'edit' && pendingRecurringEdit) {
      // 편집 모드 저장하고 편집 폼으로 이동
      setRecurringEditMode(editSingleOnly);
      editEvent(pendingRecurringEdit);
      setIsRecurringDialogOpen(false);
      setPendingRecurringEdit(null);
    } else if (recurringDialogMode === 'delete' && pendingRecurringDelete) {
      // 반복 일정 삭제 처리
      try {
        await handleRecurringDelete(pendingRecurringDelete, editSingleOnly);
        enqueueSnackbar('일정이 삭제되었습니다', { variant: 'success' });
      } catch (error) {
        console.error(error);
        enqueueSnackbar('일정 삭제 실패', { variant: 'error' });
      }
      setIsRecurringDialogOpen(false);
      setPendingRecurringDelete(null);
    }
  };

  const isRecurringEvent = (event: Event): boolean => {
    return event.repeat.type !== 'none' && event.repeat.interval > 0;
  };

  const handleEditEvent = (event: Event) => {
    if (isRecurringEvent(event)) {
      // Show recurring edit dialog
      setPendingRecurringEdit(event);
      setRecurringDialogMode('edit');
      setIsRecurringDialogOpen(true);
    } else {
      // Regular event editing
      editEvent(event);
    }
  };

  const handleDeleteEvent = (event: Event) => {
    if (isRecurringEvent(event)) {
      // Show recurring delete dialog
      setPendingRecurringDelete(event);
      setRecurringDialogMode('delete');
      setIsRecurringDialogOpen(true);
    } else {
      // Regular event deletion
      deleteEvent(event.id);
    }
  };

  // 드래그 앤 드롭 핸들러
  const handleDragStart = (e: ReactDragEvent<HTMLElement>, eventId: string) => {
    setDraggedEventId(eventId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', eventId);
    
    // 드래그 중인 요소에 스타일 적용
    const target = e.currentTarget as HTMLElement;
    target.style.opacity = '0.5';
    target.setAttribute('data-dragging', 'true');
  };

  const handleDragEnd = (e: ReactDragEvent<HTMLElement>) => {
    setDraggedEventId(null);
    setDragOverCellDate(null);
    setIsDraggingOverCalendar(false);
    
    // 드래그 종료 시 스타일 복원
    const target = e.currentTarget as HTMLElement;
    target.style.opacity = '1';
    target.removeAttribute('data-dragging');
    
    // body 커서 스타일 복원
    document.body.style.cursor = '';
  };

  const handleDragOverCell = (e: ReactDragEvent<HTMLElement>, dateString: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverCellDate(dateString);
    setIsDraggingOverCalendar(true);
    
    // 셀에 droppable 속성 추가
    const target = e.currentTarget as HTMLElement;
    target.setAttribute('data-droppable', 'true');
    
    // body 커서 스타일 제거 (캘린더 내부)
    document.body.style.cursor = '';
  };

  const handleDragLeaveCell = (e: ReactDragEvent<HTMLElement>) => {
    const target = e.currentTarget as HTMLElement;
    target.removeAttribute('data-droppable');
  };

  const handleDragOverOutside = (e: ReactDragEvent<HTMLElement>) => {
    e.preventDefault();
    setIsDraggingOverCalendar(false);
    
    // 캘린더 외부일 때 not-allowed 커서 표시
    if (draggedEventId) {
      document.body.style.cursor = 'not-allowed';
    }
  };

  const handleDrop = (e: ReactDragEvent<HTMLElement>) => {
    e.preventDefault();
    const target = e.currentTarget as HTMLElement;
    target.removeAttribute('data-droppable');
    
    // TODO: 실제 드롭 처리 로직 (다음 스토리에서 구현)
  };

  const addOrUpdateEvent = async () => {
    if (!title || !date || !startTime || !endTime) {
      enqueueSnackbar('필수 정보를 모두 입력해주세요.', { variant: 'error' });
      return;
    }

    if (startTimeError || endTimeError) {
      enqueueSnackbar('시간 설정을 확인해주세요.', { variant: 'error' });
      return;
    }

    const eventData: Event | EventForm = {
      id: editingEvent ? editingEvent.id : undefined,
      title,
      date,
      startTime,
      endTime,
      description,
      location,
      category,
      repeat: editingEvent
        ? editingEvent.repeat // Keep original repeat settings for recurring event detection
        : {
            type: isRepeating ? repeatType : 'none',
            interval: repeatInterval,
            endDate: repeatEndDate || undefined,
          },
      notificationTime,
    };

    const overlapping = findOverlappingEvents(eventData, events);
    const hasOverlapEvent = overlapping.length > 0;

    // 수정
    if (editingEvent) {
      if (hasOverlapEvent) {
        setOverlappingEvents(overlapping);
        setIsOverlapDialogOpen(true);
        return;
      }

      if (
        editingEvent.repeat.type !== 'none' &&
        editingEvent.repeat.interval > 0 &&
        recurringEditMode !== null
      ) {
        await handleRecurringEdit(eventData as Event, recurringEditMode);
        setRecurringEditMode(null);
      } else {
        await saveEvent(eventData);
      }

      resetForm();
      return;
    }

    // 생성
    if (isRepeating) {
      // 반복 생성은 반복 일정을 고려하지 않는다.
      await createRepeatEvent(eventData);
      resetForm();
      return;
    }

    if (hasOverlapEvent) {
      setOverlappingEvents(overlapping);
      setIsOverlapDialogOpen(true);
      return;
    }

    await saveEvent(eventData);
    resetForm();
  };

  const renderWeekView = () => {
    const weekDates = getWeekDates(currentDate);
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
                {weekDates.map((date) => (
                  <TableCell
                    key={date.toISOString()}
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
                      .map((event) => {
                        const isNotified = notifiedEvents.includes(event.id);
                        const isRepeating = event.repeat.type !== 'none';

                        return (
                          <Box
                            key={event.id}
                            sx={{
                              ...eventBoxStyles.common,
                              ...(isNotified ? eventBoxStyles.notified : eventBoxStyles.normal),
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
                ))}
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Stack>
    );
  };

  const renderMonthView = () => {
    const weeks = getWeeksAtMonth(currentDate);

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
                        onDragOver={(e) => day && handleDragOverCell(e, dateString)}
                        onDragLeave={handleDragLeaveCell}
                        onDrop={handleDrop}
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
                                <Box
                                  key={event.id}
                                  draggable
                                  onDragStart={(e) => handleDragStart(e, event.id)}
                                  onDragEnd={handleDragEnd}
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
                                >
                                  <Stack direction="row" spacing={1} alignItems="center">
                                    {isNotified && <Notifications fontSize="small" />}
                                    {/* ! TEST CASE */}
                                    {isRepeating && (
                                      <Tooltip
                                        title={`${event.repeat.interval}${getRepeatTypeLabel(event.repeat.type)}마다 반복${
                                          event.repeat.endDate
                                            ? ` (종료: ${event.repeat.endDate})`
                                            : ''
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

  return (
    <Box sx={{ width: '100%', height: '100vh', margin: 'auto', p: 5 }}>
      <Stack direction="row" spacing={6} sx={{ height: '100%' }}>
        <Stack spacing={2} sx={{ width: '20%' }}>
          <Typography variant="h4">{editingEvent ? '일정 수정' : '일정 추가'}</Typography>

          <FormControl fullWidth>
            <FormLabel htmlFor="title">제목</FormLabel>
            <TextField
              id="title"
              size="small"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </FormControl>

          <FormControl fullWidth>
            <FormLabel htmlFor="date">날짜</FormLabel>
            <TextField
              id="date"
              size="small"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </FormControl>

          <Stack direction="row" spacing={2}>
            <FormControl fullWidth>
              <FormLabel htmlFor="start-time">시작 시간</FormLabel>
              <Tooltip title={startTimeError || ''} open={!!startTimeError} placement="top">
                <TextField
                  id="start-time"
                  size="small"
                  type="time"
                  value={startTime}
                  onChange={handleStartTimeChange}
                  onBlur={() => getTimeErrorMessage(startTime, endTime)}
                  error={!!startTimeError}
                />
              </Tooltip>
            </FormControl>
            <FormControl fullWidth>
              <FormLabel htmlFor="end-time">종료 시간</FormLabel>
              <Tooltip title={endTimeError || ''} open={!!endTimeError} placement="top">
                <TextField
                  id="end-time"
                  size="small"
                  type="time"
                  value={endTime}
                  onChange={handleEndTimeChange}
                  onBlur={() => getTimeErrorMessage(startTime, endTime)}
                  error={!!endTimeError}
                />
              </Tooltip>
            </FormControl>
          </Stack>

          <FormControl fullWidth>
            <FormLabel htmlFor="description">설명</FormLabel>
            <TextField
              id="description"
              size="small"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </FormControl>

          <FormControl fullWidth>
            <FormLabel htmlFor="location">위치</FormLabel>
            <TextField
              id="location"
              size="small"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </FormControl>

          <FormControl fullWidth>
            <FormLabel id="category-label">카테고리</FormLabel>
            <Select
              id="category"
              size="small"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              aria-labelledby="category-label"
              aria-label="카테고리"
            >
              {categories.map((cat) => (
                <MenuItem key={cat} value={cat} aria-label={`${cat}-option`}>
                  {cat}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {!editingEvent && (
            <FormControl>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={isRepeating}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setIsRepeating(checked);
                      if (checked) {
                        setRepeatType('daily');
                      } else {
                        setRepeatType('none');
                      }
                    }}
                  />
                }
                label="반복 일정"
              />
            </FormControl>
          )}

          {/* ! TEST CASE */}
          {isRepeating && !editingEvent && (
            <Stack spacing={2}>
              <FormControl fullWidth>
                <FormLabel>반복 유형</FormLabel>
                <Select
                  size="small"
                  value={repeatType}
                  aria-label="반복 유형"
                  onChange={(e) => setRepeatType(e.target.value as RepeatType)}
                >
                  <MenuItem value="daily" aria-label="daily-option">
                    매일
                  </MenuItem>
                  <MenuItem value="weekly" aria-label="weekly-option">
                    매주
                  </MenuItem>
                  <MenuItem value="monthly" aria-label="monthly-option">
                    매월
                  </MenuItem>
                  <MenuItem value="yearly" aria-label="yearly-option">
                    매년
                  </MenuItem>
                </Select>
              </FormControl>
              <Stack direction="row" spacing={2}>
                <FormControl fullWidth>
                  <FormLabel htmlFor="repeat-interval">반복 간격</FormLabel>
                  <TextField
                    id="repeat-interval"
                    size="small"
                    type="number"
                    value={repeatInterval}
                    onChange={(e) => setRepeatInterval(Number(e.target.value))}
                    slotProps={{ htmlInput: { min: 1 } }}
                  />
                </FormControl>
                <FormControl fullWidth>
                  <FormLabel htmlFor="repeat-end-date">반복 종료일</FormLabel>
                  <TextField
                    id="repeat-end-date"
                    size="small"
                    type="date"
                    value={repeatEndDate}
                    onChange={(e) => setRepeatEndDate(e.target.value)}
                  />
                </FormControl>
              </Stack>
            </Stack>
          )}

          <FormControl fullWidth>
            <FormLabel htmlFor="notification">알림 설정</FormLabel>
            <Select
              id="notification"
              size="small"
              value={notificationTime}
              onChange={(e) => setNotificationTime(Number(e.target.value))}
            >
              {notificationOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Button
            data-testid="event-submit-button"
            onClick={addOrUpdateEvent}
            variant="contained"
            color="primary"
          >
            {editingEvent ? '일정 수정' : '일정 추가'}
          </Button>
        </Stack>

        <Stack flex={1} spacing={5}>
          <Typography variant="h4">일정 보기</Typography>

          <Stack direction="row" spacing={2} justifyContent="space-between" alignItems="center">
            <IconButton aria-label="Previous" onClick={() => navigate('prev')}>
              <ChevronLeft />
            </IconButton>
            <Select
              size="small"
              aria-label="뷰 타입 선택"
              value={view}
              onChange={(e) => setView(e.target.value as 'week' | 'month')}
            >
              <MenuItem value="week" aria-label="week-option">
                Week
              </MenuItem>
              <MenuItem value="month" aria-label="month-option">
                Month
              </MenuItem>
            </Select>
            <IconButton aria-label="Next" onClick={() => navigate('next')}>
              <ChevronRight />
            </IconButton>
          </Stack>

          {view === 'week' && renderWeekView()}
          {view === 'month' && renderMonthView()}
        </Stack>

        <Stack
          data-testid="event-list"
          spacing={2}
          sx={{ width: '30%', height: '100%', overflowY: 'auto' }}
          onDragOver={handleDragOverOutside}
        >
          <FormControl fullWidth>
            <FormLabel htmlFor="search">일정 검색</FormLabel>
            <TextField
              id="search"
              size="small"
              placeholder="검색어를 입력하세요"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </FormControl>

          {filteredEvents.length === 0 ? (
            <Typography>검색 결과가 없습니다.</Typography>
          ) : (
            filteredEvents.map((event) => (
              <Box key={event.id} sx={{ border: 1, borderRadius: 2, p: 3, width: '100%' }}>
                <Stack direction="row" justifyContent="space-between">
                  <Stack>
                    <Stack direction="row" spacing={1} alignItems="center">
                      {notifiedEvents.includes(event.id) && <Notifications color="error" />}
                      {event.repeat.type !== 'none' && (
                        <Tooltip
                          title={`${event.repeat.interval}${getRepeatTypeLabel(event.repeat.type)}마다 반복${
                            event.repeat.endDate ? ` (종료: ${event.repeat.endDate})` : ''
                          }`}
                        >
                          <Repeat fontSize="small" />
                        </Tooltip>
                      )}
                      <Typography
                        fontWeight={notifiedEvents.includes(event.id) ? 'bold' : 'normal'}
                        color={notifiedEvents.includes(event.id) ? 'error' : 'inherit'}
                      >
                        {event.title}
                      </Typography>
                    </Stack>
                    <Typography>{event.date}</Typography>
                    <Typography>
                      {event.startTime} - {event.endTime}
                    </Typography>
                    <Typography>{event.description}</Typography>
                    <Typography>{event.location}</Typography>
                    <Typography>카테고리: {event.category}</Typography>
                    {event.repeat.type !== 'none' && (
                      <Typography>
                        반복: {event.repeat.interval}
                        {event.repeat.type === 'daily' && '일'}
                        {event.repeat.type === 'weekly' && '주'}
                        {event.repeat.type === 'monthly' && '월'}
                        {event.repeat.type === 'yearly' && '년'}
                        마다
                        {event.repeat.endDate && ` (종료: ${event.repeat.endDate})`}
                      </Typography>
                    )}
                    <Typography>
                      알림:{' '}
                      {
                        notificationOptions.find(
                          (option) => option.value === event.notificationTime
                        )?.label
                      }
                    </Typography>
                  </Stack>
                  <Stack>
                    <IconButton aria-label="Edit event" onClick={() => handleEditEvent(event)}>
                      <Edit />
                    </IconButton>
                    <IconButton aria-label="Delete event" onClick={() => handleDeleteEvent(event)}>
                      <Delete />
                    </IconButton>
                  </Stack>
                </Stack>
              </Box>
            ))
          )}
        </Stack>
      </Stack>

      <Dialog open={isOverlapDialogOpen} onClose={() => setIsOverlapDialogOpen(false)}>
        <DialogTitle>일정 겹침 경고</DialogTitle>
        <DialogContent>
          <DialogContentText>다음 일정과 겹칩니다:</DialogContentText>
          {overlappingEvents.map((event) => (
            <Typography key={event.id} sx={{ ml: 1, mb: 1 }}>
              {event.title} ({event.date} {event.startTime}-{event.endTime})
            </Typography>
          ))}
          <DialogContentText>계속 진행하시겠습니까?</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsOverlapDialogOpen(false)}>취소</Button>
          <Button
            color="error"
            onClick={() => {
              setIsOverlapDialogOpen(false);
              saveEvent({
                id: editingEvent ? editingEvent.id : undefined,
                title,
                date,
                startTime,
                endTime,
                description,
                location,
                category,
                repeat: {
                  type: isRepeating ? repeatType : 'none',
                  interval: repeatInterval,
                  endDate: repeatEndDate || undefined,
                },
                notificationTime,
              });
            }}
          >
            계속 진행
          </Button>
        </DialogActions>
      </Dialog>

      <RecurringEventDialog
        open={isRecurringDialogOpen}
        onClose={() => {
          setIsRecurringDialogOpen(false);
          setPendingRecurringEdit(null);
          setPendingRecurringDelete(null);
        }}
        onConfirm={handleRecurringConfirm}
        event={recurringDialogMode === 'edit' ? pendingRecurringEdit : pendingRecurringDelete}
        mode={recurringDialogMode}
      />

      {notifications.length > 0 && (
        <Stack position="fixed" top={16} right={16} spacing={2} alignItems="flex-end">
          {notifications.map((notification, index) => (
            <Alert
              key={index}
              severity="info"
              sx={{ width: 'auto' }}
              action={
                <IconButton
                  size="small"
                  onClick={() => setNotifications((prev) => prev.filter((_, i) => i !== index))}
                >
                  <Close />
                </IconButton>
              }
            >
              <AlertTitle>{notification.message}</AlertTitle>
            </Alert>
          ))}
        </Stack>
      )}
    </Box>
  );
}

export default App;

```

```typescriptreact
import ChevronLeft from '@mui/icons-material/ChevronLeft';
import ChevronRight from '@mui/icons-material/ChevronRight';
import Close from '@mui/icons-material/Close';
import Delete from '@mui/icons-material/Delete';
import Edit from '@mui/icons-material/Edit';
import Notifications from '@mui/icons-material/Notifications';
import Repeat from '@mui/icons-material/Repeat';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormLabel,
  IconButton,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useSnackbar } from 'notistack';
import { DragEvent as ReactDragEvent, useState } from 'react';

import RecurringEventDialog from './components/RecurringEventDialog.tsx';
import { useCalendarView } from './hooks/useCalendarView.ts';
import { useEventForm } from './hooks/useEventForm.ts';
import { useEventOperations } from './hooks/useEventOperations.ts';
import { useNotifications } from './hooks/useNotifications.ts';
import { useRecurringEventOperations } from './hooks/useRecurringEventOperations.ts';
import { useSearch } from './hooks/useSearch.ts';
import { Event, EventForm, RepeatType } from './types.ts';
import {
  formatDate,
  formatMonth,
  formatWeek,
  getEventsForDay,
  getWeekDates,
  getWeeksAtMonth,
} from './utils/dateUtils.ts';
import { findOverlappingEvents } from './utils/eventOverlap.ts';
import { getTimeErrorMessage } from './utils/timeValidation.ts';

const categories = ['업무', '개인', '가족', '기타'];

const weekDays = ['일', '월', '화', '수', '목', '금', '토'];

const notificationOptions = [
  { value: 1, label: '1분 전' },
  { value: 10, label: '10분 전' },
  { value: 60, label: '1시간 전' },
  { value: 120, label: '2시간 전' },
  { value: 1440, label: '1일 전' },
];

// 스타일 상수
const eventBoxStyles = {
  notified: {
    backgroundColor: '#ffebee',
    fontWeight: 'bold',
    color: '#d32f2f',
  },
  normal: {
    backgroundColor: '#f5f5f5',
    fontWeight: 'normal',
    color: 'inherit',
  },
  common: {
    p: 0.5,
    my: 0.5,
    borderRadius: 1,
    minHeight: '18px',
    width: '100%',
    overflow: 'hidden',
  },
};

const getRepeatTypeLabel = (type: RepeatType): string => {
  switch (type) {
    case 'daily':
      return '일';
    case 'weekly':
      return '주';
    case 'monthly':
      return '월';
    case 'yearly':
      return '년';
    default:
      return '';
  }
};

function App() {
  const {
    title,
    setTitle,
    date,
    setDate,
    startTime,
    endTime,
    description,
    setDescription,
    location,
    setLocation,
    category,
    setCategory,
    isRepeating,
    setIsRepeating,
    repeatType,
    setRepeatType,
    repeatInterval,
    setRepeatInterval,
    repeatEndDate,
    setRepeatEndDate,
    notificationTime,
    setNotificationTime,
    startTimeError,
    endTimeError,
    editingEvent,
    setEditingEvent,
    handleStartTimeChange,
    handleEndTimeChange,
    resetForm,
    editEvent,
  } = useEventForm();

  const { events, saveEvent, deleteEvent, createRepeatEvent, fetchEvents } = useEventOperations(
    Boolean(editingEvent),
    () => setEditingEvent(null)
  );

  const { handleRecurringEdit, handleRecurringDelete } = useRecurringEventOperations(
    events,
    async () => {
      // After recurring edit, refresh events from server
      await fetchEvents();
    }
  );

  const { notifications, notifiedEvents, setNotifications } = useNotifications(events);
  const { view, setView, currentDate, holidays, navigate } = useCalendarView();
  const { searchTerm, filteredEvents, setSearchTerm } = useSearch(events, currentDate, view);

  const [isOverlapDialogOpen, setIsOverlapDialogOpen] = useState(false);
  const [overlappingEvents, setOverlappingEvents] = useState<Event[]>([]);
  const [isRecurringDialogOpen, setIsRecurringDialogOpen] = useState(false);
  const [pendingRecurringEdit, setPendingRecurringEdit] = useState<Event | null>(null);
  const [pendingRecurringDelete, setPendingRecurringDelete] = useState<Event | null>(null);
  const [recurringEditMode, setRecurringEditMode] = useState<boolean | null>(null); // true = single, false = all
  const [recurringDialogMode, setRecurringDialogMode] = useState<'edit' | 'delete'>('edit');
  
  // 드래그 앤 드롭 상태
  const [draggedEventId, setDraggedEventId] = useState<string | null>(null);
  const [dragOverCellDate, setDragOverCellDate] = useState<string | null>(null);
  const [isDraggingOverCalendar, setIsDraggingOverCalendar] = useState(false);

  const { enqueueSnackbar } = useSnackbar();

  const handleRecurringConfirm = async (editSingleOnly: boolean) => {
    if (recurringDialogMode === 'edit' && pendingRecurringEdit) {
      // 편집 모드 저장하고 편집 폼으로 이동
      setRecurringEditMode(editSingleOnly);
      editEvent(pendingRecurringEdit);
      setIsRecurringDialogOpen(false);
      setPendingRecurringEdit(null);
    } else if (recurringDialogMode === 'delete' && pendingRecurringDelete) {
      // 반복 일정 삭제 처리
      try {
        await handleRecurringDelete(pendingRecurringDelete, editSingleOnly);
        enqueueSnackbar('일정이 삭제되었습니다', { variant: 'success' });
      } catch (error) {
        console.error(error);
        enqueueSnackbar('일정 삭제 실패', { variant: 'error' });
      }
      setIsRecurringDialogOpen(false);
      setPendingRecurringDelete(null);
    }
  };

  const isRecurringEvent = (event: Event): boolean => {
    return event.repeat.type !== 'none' && event.repeat.interval > 0;
  };

  const handleEditEvent = (event: Event) => {
    if (isRecurringEvent(event)) {
      // Show recurring edit dialog
      setPendingRecurringEdit(event);
      setRecurringDialogMode('edit');
      setIsRecurringDialogOpen(true);
    } else {
      // Regular event editing
      editEvent(event);
    }
  };

  const handleDeleteEvent = (event: Event) => {
    if (isRecurringEvent(event)) {
      // Show recurring delete dialog
      setPendingRecurringDelete(event);
      setRecurringDialogMode('delete');
      setIsRecurringDialogOpen(true);
    } else {
      // Regular event deletion
      deleteEvent(event.id);
    }
  };

  // 드래그 앤 드롭 핸들러
  const handleDragStart = (e: ReactDragEvent<HTMLElement>, eventId: string) => {
    setDraggedEventId(eventId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', eventId);
    
    // 드래그 중인 요소에 스타일 적용
    const target = e.currentTarget as HTMLElement;
    target.style.opacity = '0.5';
    target.setAttribute('data-dragging', 'true');
  };

  const handleDragEnd = (e: ReactDragEvent<HTMLElement>) => {
    setDraggedEventId(null);
    setDragOverCellDate(null);
    setIsDraggingOverCalendar(false);
    
    // 드래그 종료 시 스타일 복원
    const target = e.currentTarget as HTMLElement;
    target.style.opacity = '1';
    target.removeAttribute('data-dragging');
    
    // body 커서 스타일 복원
    document.body.style.cursor = '';
  };

  const handleDragOverCell = (e: ReactDragEvent<HTMLElement>, dateString: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverCellDate(dateString);
    setIsDraggingOverCalendar(true);
    
    // 셀에 droppable 속성 추가
    const target = e.currentTarget as HTMLElement;
    target.setAttribute('data-droppable', 'true');
    
    // body 커서 스타일 제거 (캘린더 내부)
    document.body.style.cursor = '';
  };

  const handleDragLeaveCell = (e: ReactDragEvent<HTMLElement>) => {
    const target = e.currentTarget as HTMLElement;
    target.removeAttribute('data-droppable');
  };

  const handleDragOverOutside = (e: ReactDragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOverCalendar(false);
    
    // 캘린더 외부일 때 not-allowed 커서 표시 (즉시 반영)
    document.body.style.cursor = 'not-allowed';
  };

  const handleDrop = (e: ReactDragEvent<HTMLElement>) => {
    e.preventDefault();
    const target = e.currentTarget as HTMLElement;
    target.removeAttribute('data-droppable');
    
    // TODO: 실제 드롭 처리 로직 (다음 스토리에서 구현)
  };

  const addOrUpdateEvent = async () => {
    if (!title || !date || !startTime || !endTime) {
      enqueueSnackbar('필수 정보를 모두 입력해주세요.', { variant: 'error' });
      return;
    }

    if (startTimeError || endTimeError) {
      enqueueSnackbar('시간 설정을 확인해주세요.', { variant: 'error' });
      return;
    }

    const eventData: Event | EventForm = {
      id: editingEvent ? editingEvent.id : undefined,
      title,
      date,
      startTime,
      endTime,
      description,
      location,
      category,
      repeat: editingEvent
        ? editingEvent.repeat // Keep original repeat settings for recurring event detection
        : {
            type: isRepeating ? repeatType : 'none',
            interval: repeatInterval,
            endDate: repeatEndDate || undefined,
          },
      notificationTime,
    };

    const overlapping = findOverlappingEvents(eventData, events);
    const hasOverlapEvent = overlapping.length > 0;

    // 수정
    if (editingEvent) {
      if (hasOverlapEvent) {
        setOverlappingEvents(overlapping);
        setIsOverlapDialogOpen(true);
        return;
      }

      if (
        editingEvent.repeat.type !== 'none' &&
        editingEvent.repeat.interval > 0 &&
        recurringEditMode !== null
      ) {
        await handleRecurringEdit(eventData as Event, recurringEditMode);
        setRecurringEditMode(null);
      } else {
        await saveEvent(eventData);
      }

      resetForm();
      return;
    }

    // 생성
    if (isRepeating) {
      // 반복 생성은 반복 일정을 고려하지 않는다.
      await createRepeatEvent(eventData);
      resetForm();
      return;
    }

    if (hasOverlapEvent) {
      setOverlappingEvents(overlapping);
      setIsOverlapDialogOpen(true);
      return;
    }

    await saveEvent(eventData);
    resetForm();
  };

  const renderWeekView = () => {
    const weekDates = getWeekDates(currentDate);
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
                {weekDates.map((date) => (
                  <TableCell
                    key={date.toISOString()}
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
                      .map((event) => {
                        const isNotified = notifiedEvents.includes(event.id);
                        const isRepeating = event.repeat.type !== 'none';

                        return (
                          <Box
                            key={event.id}
                            sx={{
                              ...eventBoxStyles.common,
                              ...(isNotified ? eventBoxStyles.notified : eventBoxStyles.normal),
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
                ))}
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Stack>
    );
  };

  const renderMonthView = () => {
    const weeks = getWeeksAtMonth(currentDate);

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
                        onDragOver={(e) => day && handleDragOverCell(e, dateString)}
                        onDragLeave={handleDragLeaveCell}
                        onDrop={handleDrop}
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
                                <Box
                                  key={event.id}
                                  draggable
                                  onDragStart={(e) => handleDragStart(e, event.id)}
                                  onDragEnd={handleDragEnd}
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
                                >
                                  <Stack direction="row" spacing={1} alignItems="center">
                                    {isNotified && <Notifications fontSize="small" />}
                                    {/* ! TEST CASE */}
                                    {isRepeating && (
                                      <Tooltip
                                        title={`${event.repeat.interval}${getRepeatTypeLabel(event.repeat.type)}마다 반복${
                                          event.repeat.endDate
                                            ? ` (종료: ${event.repeat.endDate})`
                                            : ''
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

  return (
    <Box sx={{ width: '100%', height: '100vh', margin: 'auto', p: 5 }}>
      <Stack direction="row" spacing={6} sx={{ height: '100%' }}>
        <Stack spacing={2} sx={{ width: '20%' }}>
          <Typography variant="h4">{editingEvent ? '일정 수정' : '일정 추가'}</Typography>

          <FormControl fullWidth>
            <FormLabel htmlFor="title">제목</FormLabel>
            <TextField
              id="title"
              size="small"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </FormControl>

          <FormControl fullWidth>
            <FormLabel htmlFor="date">날짜</FormLabel>
            <TextField
              id="date"
              size="small"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </FormControl>

          <Stack direction="row" spacing={2}>
            <FormControl fullWidth>
              <FormLabel htmlFor="start-time">시작 시간</FormLabel>
              <Tooltip title={startTimeError || ''} open={!!startTimeError} placement="top">
                <TextField
                  id="start-time"
                  size="small"
                  type="time"
                  value={startTime}
                  onChange={handleStartTimeChange}
                  onBlur={() => getTimeErrorMessage(startTime, endTime)}
                  error={!!startTimeError}
                />
              </Tooltip>
            </FormControl>
            <FormControl fullWidth>
              <FormLabel htmlFor="end-time">종료 시간</FormLabel>
              <Tooltip title={endTimeError || ''} open={!!endTimeError} placement="top">
                <TextField
                  id="end-time"
                  size="small"
                  type="time"
                  value={endTime}
                  onChange={handleEndTimeChange}
                  onBlur={() => getTimeErrorMessage(startTime, endTime)}
                  error={!!endTimeError}
                />
              </Tooltip>
            </FormControl>
          </Stack>

          <FormControl fullWidth>
            <FormLabel htmlFor="description">설명</FormLabel>
            <TextField
              id="description"
              size="small"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </FormControl>

          <FormControl fullWidth>
            <FormLabel htmlFor="location">위치</FormLabel>
            <TextField
              id="location"
              size="small"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </FormControl>

          <FormControl fullWidth>
            <FormLabel id="category-label">카테고리</FormLabel>
            <Select
              id="category"
              size="small"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              aria-labelledby="category-label"
              aria-label="카테고리"
            >
              {categories.map((cat) => (
                <MenuItem key={cat} value={cat} aria-label={`${cat}-option`}>
                  {cat}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {!editingEvent && (
            <FormControl>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={isRepeating}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setIsRepeating(checked);
                      if (checked) {
                        setRepeatType('daily');
                      } else {
                        setRepeatType('none');
                      }
                    }}
                  />
                }
                label="반복 일정"
              />
            </FormControl>
          )}

          {/* ! TEST CASE */}
          {isRepeating && !editingEvent && (
            <Stack spacing={2}>
              <FormControl fullWidth>
                <FormLabel>반복 유형</FormLabel>
                <Select
                  size="small"
                  value={repeatType}
                  aria-label="반복 유형"
                  onChange={(e) => setRepeatType(e.target.value as RepeatType)}
                >
                  <MenuItem value="daily" aria-label="daily-option">
                    매일
                  </MenuItem>
                  <MenuItem value="weekly" aria-label="weekly-option">
                    매주
                  </MenuItem>
                  <MenuItem value="monthly" aria-label="monthly-option">
                    매월
                  </MenuItem>
                  <MenuItem value="yearly" aria-label="yearly-option">
                    매년
                  </MenuItem>
                </Select>
              </FormControl>
              <Stack direction="row" spacing={2}>
                <FormControl fullWidth>
                  <FormLabel htmlFor="repeat-interval">반복 간격</FormLabel>
                  <TextField
                    id="repeat-interval"
                    size="small"
                    type="number"
                    value={repeatInterval}
                    onChange={(e) => setRepeatInterval(Number(e.target.value))}
                    slotProps={{ htmlInput: { min: 1 } }}
                  />
                </FormControl>
                <FormControl fullWidth>
                  <FormLabel htmlFor="repeat-end-date">반복 종료일</FormLabel>
                  <TextField
                    id="repeat-end-date"
                    size="small"
                    type="date"
                    value={repeatEndDate}
                    onChange={(e) => setRepeatEndDate(e.target.value)}
                  />
                </FormControl>
              </Stack>
            </Stack>
          )}

          <FormControl fullWidth>
            <FormLabel htmlFor="notification">알림 설정</FormLabel>
            <Select
              id="notification"
              size="small"
              value={notificationTime}
              onChange={(e) => setNotificationTime(Number(e.target.value))}
            >
              {notificationOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Button
            data-testid="event-submit-button"
            onClick={addOrUpdateEvent}
            variant="contained"
            color="primary"
          >
            {editingEvent ? '일정 수정' : '일정 추가'}
          </Button>
        </Stack>

        <Stack flex={1} spacing={5}>
          <Typography variant="h4">일정 보기</Typography>

          <Stack direction="row" spacing={2} justifyContent="space-between" alignItems="center">
            <IconButton aria-label="Previous" onClick={() => navigate('prev')}>
              <ChevronLeft />
            </IconButton>
            <Select
              size="small"
              aria-label="뷰 타입 선택"
              value={view}
              onChange={(e) => setView(e.target.value as 'week' | 'month')}
            >
              <MenuItem value="week" aria-label="week-option">
                Week
              </MenuItem>
              <MenuItem value="month" aria-label="month-option">
                Month
              </MenuItem>
            </Select>
            <IconButton aria-label="Next" onClick={() => navigate('next')}>
              <ChevronRight />
            </IconButton>
          </Stack>

          {view === 'week' && renderWeekView()}
          {view === 'month' && renderMonthView()}
        </Stack>

        <Stack
          data-testid="event-list"
          spacing={2}
          sx={{ width: '30%', height: '100%', overflowY: 'auto' }}
          onDragOver={handleDragOverOutside}
        >
          <FormControl fullWidth>
            <FormLabel htmlFor="search">일정 검색</FormLabel>
            <TextField
              id="search"
              size="small"
              placeholder="검색어를 입력하세요"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </FormControl>

          {filteredEvents.length === 0 ? (
            <Typography>검색 결과가 없습니다.</Typography>
          ) : (
            filteredEvents.map((event) => (
              <Box key={event.id} sx={{ border: 1, borderRadius: 2, p: 3, width: '100%' }}>
                <Stack direction="row" justifyContent="space-between">
                  <Stack>
                    <Stack direction="row" spacing={1} alignItems="center">
                      {notifiedEvents.includes(event.id) && <Notifications color="error" />}
                      {event.repeat.type !== 'none' && (
                        <Tooltip
                          title={`${event.repeat.interval}${getRepeatTypeLabel(event.repeat.type)}마다 반복${
                            event.repeat.endDate ? ` (종료: ${event.repeat.endDate})` : ''
                          }`}
                        >
                          <Repeat fontSize="small" />
                        </Tooltip>
                      )}
                      <Typography
                        fontWeight={notifiedEvents.includes(event.id) ? 'bold' : 'normal'}
                        color={notifiedEvents.includes(event.id) ? 'error' : 'inherit'}
                      >
                        {event.title}
                      </Typography>
                    </Stack>
                    <Typography>{event.date}</Typography>
                    <Typography>
                      {event.startTime} - {event.endTime}
                    </Typography>
                    <Typography>{event.description}</Typography>
                    <Typography>{event.location}</Typography>
                    <Typography>카테고리: {event.category}</Typography>
                    {event.repeat.type !== 'none' && (
                      <Typography>
                        반복: {event.repeat.interval}
                        {event.repeat.type === 'daily' && '일'}
                        {event.repeat.type === 'weekly' && '주'}
                        {event.repeat.type === 'monthly' && '월'}
                        {event.repeat.type === 'yearly' && '년'}
                        마다
                        {event.repeat.endDate && ` (종료: ${event.repeat.endDate})`}
                      </Typography>
                    )}
                    <Typography>
                      알림:{' '}
                      {
                        notificationOptions.find(
                          (option) => option.value === event.notificationTime
                        )?.label
                      }
                    </Typography>
                  </Stack>
                  <Stack>
                    <IconButton aria-label="Edit event" onClick={() => handleEditEvent(event)}>
                      <Edit />
                    </IconButton>
                    <IconButton aria-label="Delete event" onClick={() => handleDeleteEvent(event)}>
                      <Delete />
                    </IconButton>
                  </Stack>
                </Stack>
              </Box>
            ))
          )}
        </Stack>
      </Stack>

      <Dialog open={isOverlapDialogOpen} onClose={() => setIsOverlapDialogOpen(false)}>
        <DialogTitle>일정 겹침 경고</DialogTitle>
        <DialogContent>
          <DialogContentText>다음 일정과 겹칩니다:</DialogContentText>
          {overlappingEvents.map((event) => (
            <Typography key={event.id} sx={{ ml: 1, mb: 1 }}>
              {event.title} ({event.date} {event.startTime}-{event.endTime})
            </Typography>
          ))}
          <DialogContentText>계속 진행하시겠습니까?</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsOverlapDialogOpen(false)}>취소</Button>
          <Button
            color="error"
            onClick={() => {
              setIsOverlapDialogOpen(false);
              saveEvent({
                id: editingEvent ? editingEvent.id : undefined,
                title,
                date,
                startTime,
                endTime,
                description,
                location,
                category,
                repeat: {
                  type: isRepeating ? repeatType : 'none',
                  interval: repeatInterval,
                  endDate: repeatEndDate || undefined,
                },
                notificationTime,
              });
            }}
          >
            계속 진행
          </Button>
        </DialogActions>
      </Dialog>

      <RecurringEventDialog
        open={isRecurringDialogOpen}
        onClose={() => {
          setIsRecurringDialogOpen(false);
          setPendingRecurringEdit(null);
          setPendingRecurringDelete(null);
        }}
        onConfirm={handleRecurringConfirm}
        event={recurringDialogMode === 'edit' ? pendingRecurringEdit : pendingRecurringDelete}
        mode={recurringDialogMode}
      />

      {notifications.length > 0 && (
        <Stack position="fixed" top={16} right={16} spacing={2} alignItems="flex-end">
          {notifications.map((notification, index) => (
            <Alert
              key={index}
              severity="info"
              sx={{ width: 'auto' }}
              action={
                <IconButton
                  size="small"
                  onClick={() => setNotifications((prev) => prev.filter((_, i) => i !== index))}
                >
                  <Close />
                </IconButton>
              }
            >
              <AlertTitle>{notification.message}</AlertTitle>
            </Alert>
          ))}
        </Stack>
      )}
    </Box>
  );
}

export default App;

```

```typescript
const styles = window.getComputedStyle(targetCell!);
expect(styles.backgroundColor).toBe('rgb(227, 242, 253)'); // #e3f2fd의 RGB 값
```

좋습니다! 검증 포인트 6은 통과했습니다. 이제 남은 것은 검증 포인트 4(배경색 변경)입니다. 문제는 React 상태 업데이트가 비동기이기 때문에 즉시 반영되지 않는 것입니다. DOM을 직접 조작하는 방식으로 수정하겠습니다.

```typescriptreact
import ChevronLeft from '@mui/icons-material/ChevronLeft';
import ChevronRight from '@mui/icons-material/ChevronRight';
import Close from '@mui/icons-material/Close';
import Delete from '@mui/icons-material/Delete';
import Edit from '@mui/icons-material/Edit';
import Notifications from '@mui/icons-material/Notifications';
import Repeat from '@mui/icons-material/Repeat';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormLabel,
  IconButton,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useSnackbar } from 'notistack';
import { DragEvent as ReactDragEvent, useState } from 'react';

import RecurringEventDialog from './components/RecurringEventDialog.tsx';
import { useCalendarView } from './hooks/useCalendarView.ts';
import { useEventForm } from './hooks/useEventForm.ts';
import { useEventOperations } from './hooks/useEventOperations.ts';
import { useNotifications } from './hooks/useNotifications.ts';
import { useRecurringEventOperations } from './hooks/useRecurringEventOperations.ts';
import { useSearch } from './hooks/useSearch.ts';
import { Event, EventForm, RepeatType } from './types.ts';
import {
  formatDate,
  formatMonth,
  formatWeek,
  getEventsForDay,
  getWeekDates,
  getWeeksAtMonth,
} from './utils/dateUtils.ts';
import { findOverlappingEvents } from './utils/eventOverlap.ts';
import { getTimeErrorMessage } from './utils/timeValidation.ts';

const categories = ['업무', '개인', '가족', '기타'];

const weekDays = ['일', '월', '화', '수', '목', '금', '토'];

const notificationOptions = [
  { value: 1, label: '1분 전' },
  { value: 10, label: '10분 전' },
  { value: 60, label: '1시간 전' },
  { value: 120, label: '2시간 전' },
  { value: 1440, label: '1일 전' },
];

// 스타일 상수
const eventBoxStyles = {
  notified: {
    backgroundColor: '#ffebee',
    fontWeight: 'bold',
    color: '#d32f2f',
  },
  normal: {
    backgroundColor: '#f5f5f5',
    fontWeight: 'normal',
    color: 'inherit',
  },
  common: {
    p: 0.5,
    my: 0.5,
    borderRadius: 1,
    minHeight: '18px',
    width: '100%',
    overflow: 'hidden',
  },
};

const getRepeatTypeLabel = (type: RepeatType): string => {
  switch (type) {
    case 'daily':
      return '일';
    case 'weekly':
      return '주';
    case 'monthly':
      return '월';
    case 'yearly':
      return '년';
    default:
      return '';
  }
};

function App() {
  const {
    title,
    setTitle,
    date,
    setDate,
    startTime,
    endTime,
    description,
    setDescription,
    location,
    setLocation,
    category,
    setCategory,
    isRepeating,
    setIsRepeating,
    repeatType,
    setRepeatType,
    repeatInterval,
    setRepeatInterval,
    repeatEndDate,
    setRepeatEndDate,
    notificationTime,
    setNotificationTime,
    startTimeError,
    endTimeError,
    editingEvent,
    setEditingEvent,
    handleStartTimeChange,
    handleEndTimeChange,
    resetForm,
    editEvent,
  } = useEventForm();

  const { events, saveEvent, deleteEvent, createRepeatEvent, fetchEvents } = useEventOperations(
    Boolean(editingEvent),
    () => setEditingEvent(null)
  );

  const { handleRecurringEdit, handleRecurringDelete } = useRecurringEventOperations(
    events,
    async () => {
      // After recurring edit, refresh events from server
      await fetchEvents();
    }
  );

  const { notifications, notifiedEvents, setNotifications } = useNotifications(events);
  const { view, setView, currentDate, holidays, navigate } = useCalendarView();
  const { searchTerm, filteredEvents, setSearchTerm } = useSearch(events, currentDate, view);

  const [isOverlapDialogOpen, setIsOverlapDialogOpen] = useState(false);
  const [overlappingEvents, setOverlappingEvents] = useState<Event[]>([]);
  const [isRecurringDialogOpen, setIsRecurringDialogOpen] = useState(false);
  const [pendingRecurringEdit, setPendingRecurringEdit] = useState<Event | null>(null);
  const [pendingRecurringDelete, setPendingRecurringDelete] = useState<Event | null>(null);
  const [recurringEditMode, setRecurringEditMode] = useState<boolean | null>(null); // true = single, false = all
  const [recurringDialogMode, setRecurringDialogMode] = useState<'edit' | 'delete'>('edit');
  
  // 드래그 앤 드롭 상태
  const [draggedEventId, setDraggedEventId] = useState<string | null>(null);
  const [dragOverCellDate, setDragOverCellDate] = useState<string | null>(null);
  const [isDraggingOverCalendar, setIsDraggingOverCalendar] = useState(false);

  const { enqueueSnackbar } = useSnackbar();

  const handleRecurringConfirm = async (editSingleOnly: boolean) => {
    if (recurringDialogMode === 'edit' && pendingRecurringEdit) {
      // 편집 모드 저장하고 편집 폼으로 이동
      setRecurringEditMode(editSingleOnly);
      editEvent(pendingRecurringEdit);
      setIsRecurringDialogOpen(false);
      setPendingRecurringEdit(null);
    } else if (recurringDialogMode === 'delete' && pendingRecurringDelete) {
      // 반복 일정 삭제 처리
      try {
        await handleRecurringDelete(pendingRecurringDelete, editSingleOnly);
        enqueueSnackbar('일정이 삭제되었습니다', { variant: 'success' });
      } catch (error) {
        console.error(error);
        enqueueSnackbar('일정 삭제 실패', { variant: 'error' });
      }
      setIsRecurringDialogOpen(false);
      setPendingRecurringDelete(null);
    }
  };

  const isRecurringEvent = (event: Event): boolean => {
    return event.repeat.type !== 'none' && event.repeat.interval > 0;
  };

  const handleEditEvent = (event: Event) => {
    if (isRecurringEvent(event)) {
      // Show recurring edit dialog
      setPendingRecurringEdit(event);
      setRecurringDialogMode('edit');
      setIsRecurringDialogOpen(true);
    } else {
      // Regular event editing
      editEvent(event);
    }
  };

  const handleDeleteEvent = (event: Event) => {
    if (isRecurringEvent(event)) {
      // Show recurring delete dialog
      setPendingRecurringDelete(event);
      setRecurringDialogMode('delete');
      setIsRecurringDialogOpen(true);
    } else {
      // Regular event deletion
      deleteEvent(event.id);
    }
  };

  // 드래그 앤 드롭 핸들러
  const handleDragStart = (e: ReactDragEvent<HTMLElement>, eventId: string) => {
    setDraggedEventId(eventId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', eventId);
    
    // 드래그 중인 요소에 스타일 적용
    const target = e.currentTarget as HTMLElement;
    target.style.opacity = '0.5';
    target.setAttribute('data-dragging', 'true');
  };

  const handleDragEnd = (e: ReactDragEvent<HTMLElement>) => {
    setDraggedEventId(null);
    setDragOverCellDate(null);
    setIsDraggingOverCalendar(false);
    
    // 드래그 종료 시 스타일 복원
    const target = e.currentTarget as HTMLElement;
    target.style.opacity = '1';
    target.removeAttribute('data-dragging');
    
    // body 커서 스타일 복원
    document.body.style.cursor = '';
  };

  const handleDragOverCell = (e: ReactDragEvent<HTMLElement>, dateString: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverCellDate(dateString);
    setIsDraggingOverCalendar(true);
    
    // 셀에 droppable 속성과 배경색 즉시 추가 (DOM 직접 조작)
    const target = e.currentTarget as HTMLElement;
    target.setAttribute('data-droppable', 'true');
    target.style.backgroundColor = '#e3f2fd';
    
    // body 커서 스타일 제거 (캘린더 내부)
    document.body.style.cursor = '';
  };

  const handleDragLeaveCell = (e: ReactDragEvent<HTMLElement>) => {
    const target = e.currentTarget as HTMLElement;
    target.removeAttribute('data-droppable');
  };

  const handleDragOverOutside = (e: ReactDragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOverCalendar(false);
    
    // 캘린더 외부일 때 not-allowed 커서 표시 (즉시 반영)
    document.body.style.cursor = 'not-allowed';
  };

  const handleDrop = (e: ReactDragEvent<HTMLElement>) => {
    e.preventDefault();
    const target = e.currentTarget as HTMLElement;
    target.removeAttribute('data-droppable');
    
    // TODO: 실제 드롭 처리 로직 (다음 스토리에서 구현)
  };

  const addOrUpdateEvent = async () => {
    if (!title || !date || !startTime || !endTime) {
      enqueueSnackbar('필수 정보를 모두 입력해주세요.', { variant: 'error' });
      return;
    }

    if (startTimeError || endTimeError) {
      enqueueSnackbar('시간 설정을 확인해주세요.', { variant: 'error' });
      return;
    }

    const eventData: Event | EventForm = {
      id: editingEvent ? editingEvent.id : undefined,
      title,
      date,
      startTime,
      endTime,
      description,
      location,
      category,
      repeat: editingEvent
        ? editingEvent.repeat // Keep original repeat settings for recurring event detection
        : {
            type: isRepeating ? repeatType : 'none',
            interval: repeatInterval,
            endDate: repeatEndDate || undefined,
          },
      notificationTime,
    };

    const overlapping = findOverlappingEvents(eventData, events);
    const hasOverlapEvent = overlapping.length > 0;

    // 수정
    if (editingEvent) {
      if (hasOverlapEvent) {
        setOverlappingEvents(overlapping);
        setIsOverlapDialogOpen(true);
        return;
      }

      if (
        editingEvent.repeat.type !== 'none' &&
        editingEvent.repeat.interval > 0 &&
        recurringEditMode !== null
      ) {
        await handleRecurringEdit(eventData as Event, recurringEditMode);
        setRecurringEditMode(null);
      } else {
        await saveEvent(eventData);
      }

      resetForm();
      return;
    }

    // 생성
    if (isRepeating) {
      // 반복 생성은 반복 일정을 고려하지 않는다.
      await createRepeatEvent(eventData);
      resetForm();
      return;
    }

    if (hasOverlapEvent) {
      setOverlappingEvents(overlapping);
      setIsOverlapDialogOpen(true);
      return;
    }

    await saveEvent(eventData);
    resetForm();
  };

  const renderWeekView = () => {
    const weekDates = getWeekDates(currentDate);
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
                {weekDates.map((date) => (
                  <TableCell
                    key={date.toISOString()}
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
                      .map((event) => {
                        const isNotified = notifiedEvents.includes(event.id);
                        const isRepeating = event.repeat.type !== 'none';

                        return (
                          <Box
                            key={event.id}
                            sx={{
                              ...eventBoxStyles.common,
                              ...(isNotified ? eventBoxStyles.notified : eventBoxStyles.normal),
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
                ))}
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Stack>
    );
  };

  const renderMonthView = () => {
    const weeks = getWeeksAtMonth(currentDate);

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
                        onDragOver={(e) => day && handleDragOverCell(e, dateString)}
                        onDragLeave={handleDragLeaveCell}
                        onDrop={handleDrop}
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
                                <Box
                                  key={event.id}
                                  draggable
                                  onDragStart={(e) => handleDragStart(e, event.id)}
                                  onDragEnd={handleDragEnd}
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
                                >
                                  <Stack direction="row" spacing={1} alignItems="center">
                                    {isNotified && <Notifications fontSize="small" />}
                                    {/* ! TEST CASE */}
                                    {isRepeating && (
                                      <Tooltip
                                        title={`${event.repeat.interval}${getRepeatTypeLabel(event.repeat.type)}마다 반복${
                                          event.repeat.endDate
                                            ? ` (종료: ${event.repeat.endDate})`
                                            : ''
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

  return (
    <Box sx={{ width: '100%', height: '100vh', margin: 'auto', p: 5 }}>
      <Stack direction="row" spacing={6} sx={{ height: '100%' }}>
        <Stack spacing={2} sx={{ width: '20%' }}>
          <Typography variant="h4">{editingEvent ? '일정 수정' : '일정 추가'}</Typography>

          <FormControl fullWidth>
            <FormLabel htmlFor="title">제목</FormLabel>
            <TextField
              id="title"
              size="small"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </FormControl>

          <FormControl fullWidth>
            <FormLabel htmlFor="date">날짜</FormLabel>
            <TextField
              id="date"
              size="small"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </FormControl>

          <Stack direction="row" spacing={2}>
            <FormControl fullWidth>
              <FormLabel htmlFor="start-time">시작 시간</FormLabel>
              <Tooltip title={startTimeError || ''} open={!!startTimeError} placement="top">
                <TextField
                  id="start-time"
                  size="small"
                  type="time"
                  value={startTime}
                  onChange={handleStartTimeChange}
                  onBlur={() => getTimeErrorMessage(startTime, endTime)}
                  error={!!startTimeError}
                />
              </Tooltip>
            </FormControl>
            <FormControl fullWidth>
              <FormLabel htmlFor="end-time">종료 시간</FormLabel>
              <Tooltip title={endTimeError || ''} open={!!endTimeError} placement="top">
                <TextField
                  id="end-time"
                  size="small"
                  type="time"
                  value={endTime}
                  onChange={handleEndTimeChange}
                  onBlur={() => getTimeErrorMessage(startTime, endTime)}
                  error={!!endTimeError}
                />
              </Tooltip>
            </FormControl>
          </Stack>

          <FormControl fullWidth>
            <FormLabel htmlFor="description">설명</FormLabel>
            <TextField
              id="description"
              size="small"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </FormControl>

          <FormControl fullWidth>
            <FormLabel htmlFor="location">위치</FormLabel>
            <TextField
              id="location"
              size="small"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </FormControl>

          <FormControl fullWidth>
            <FormLabel id="category-label">카테고리</FormLabel>
            <Select
              id="category"
              size="small"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              aria-labelledby="category-label"
              aria-label="카테고리"
            >
              {categories.map((cat) => (
                <MenuItem key={cat} value={cat} aria-label={`${cat}-option`}>
                  {cat}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {!editingEvent && (
            <FormControl>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={isRepeating}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setIsRepeating(checked);
                      if (checked) {
                        setRepeatType('daily');
                      } else {
                        setRepeatType('none');
                      }
                    }}
                  />
                }
                label="반복 일정"
              />
            </FormControl>
          )}

          {/* ! TEST CASE */}
          {isRepeating && !editingEvent && (
            <Stack spacing={2}>
              <FormControl fullWidth>
                <FormLabel>반복 유형</FormLabel>
                <Select
                  size="small"
                  value={repeatType}
                  aria-label="반복 유형"
                  onChange={(e) => setRepeatType(e.target.value as RepeatType)}
                >
                  <MenuItem value="daily" aria-label="daily-option">
                    매일
                  </MenuItem>
                  <MenuItem value="weekly" aria-label="weekly-option">
                    매주
                  </MenuItem>
                  <MenuItem value="monthly" aria-label="monthly-option">
                    매월
                  </MenuItem>
                  <MenuItem value="yearly" aria-label="yearly-option">
                    매년
                  </MenuItem>
                </Select>
              </FormControl>
              <Stack direction="row" spacing={2}>
                <FormControl fullWidth>
                  <FormLabel htmlFor="repeat-interval">반복 간격</FormLabel>
                  <TextField
                    id="repeat-interval"
                    size="small"
                    type="number"
                    value={repeatInterval}
                    onChange={(e) => setRepeatInterval(Number(e.target.value))}
                    slotProps={{ htmlInput: { min: 1 } }}
                  />
                </FormControl>
                <FormControl fullWidth>
                  <FormLabel htmlFor="repeat-end-date">반복 종료일</FormLabel>
                  <TextField
                    id="repeat-end-date"
                    size="small"
                    type="date"
                    value={repeatEndDate}
                    onChange={(e) => setRepeatEndDate(e.target.value)}
                  />
                </FormControl>
              </Stack>
            </Stack>
          )}

          <FormControl fullWidth>
            <FormLabel htmlFor="notification">알림 설정</FormLabel>
            <Select
              id="notification"
              size="small"
              value={notificationTime}
              onChange={(e) => setNotificationTime(Number(e.target.value))}
            >
              {notificationOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Button
            data-testid="event-submit-button"
            onClick={addOrUpdateEvent}
            variant="contained"
            color="primary"
          >
            {editingEvent ? '일정 수정' : '일정 추가'}
          </Button>
        </Stack>

        <Stack flex={1} spacing={5}>
          <Typography variant="h4">일정 보기</Typography>

          <Stack direction="row" spacing={2} justifyContent="space-between" alignItems="center">
            <IconButton aria-label="Previous" onClick={() => navigate('prev')}>
              <ChevronLeft />
            </IconButton>
            <Select
              size="small"
              aria-label="뷰 타입 선택"
              value={view}
              onChange={(e) => setView(e.target.value as 'week' | 'month')}
            >
              <MenuItem value="week" aria-label="week-option">
                Week
              </MenuItem>
              <MenuItem value="month" aria-label="month-option">
                Month
              </MenuItem>
            </Select>
            <IconButton aria-label="Next" onClick={() => navigate('next')}>
              <ChevronRight />
            </IconButton>
          </Stack>

          {view === 'week' && renderWeekView()}
          {view === 'month' && renderMonthView()}
        </Stack>

        <Stack
          data-testid="event-list"
          spacing={2}
          sx={{ width: '30%', height: '100%', overflowY: 'auto' }}
          onDragOver={handleDragOverOutside}
        >
          <FormControl fullWidth>
            <FormLabel htmlFor="search">일정 검색</FormLabel>
            <TextField
              id="search"
              size="small"
              placeholder="검색어를 입력하세요"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </FormControl>

          {filteredEvents.length === 0 ? (
            <Typography>검색 결과가 없습니다.</Typography>
          ) : (
            filteredEvents.map((event) => (
              <Box key={event.id} sx={{ border: 1, borderRadius: 2, p: 3, width: '100%' }}>
                <Stack direction="row" justifyContent="space-between">
                  <Stack>
                    <Stack direction="row" spacing={1} alignItems="center">
                      {notifiedEvents.includes(event.id) && <Notifications color="error" />}
                      {event.repeat.type !== 'none' && (
                        <Tooltip
                          title={`${event.repeat.interval}${getRepeatTypeLabel(event.repeat.type)}마다 반복${
                            event.repeat.endDate ? ` (종료: ${event.repeat.endDate})` : ''
                          }`}
                        >
                          <Repeat fontSize="small" />
                        </Tooltip>
                      )}
                      <Typography
                        fontWeight={notifiedEvents.includes(event.id) ? 'bold' : 'normal'}
                        color={notifiedEvents.includes(event.id) ? 'error' : 'inherit'}
                      >
                        {event.title}
                      </Typography>
                    </Stack>
                    <Typography>{event.date}</Typography>
                    <Typography>
                      {event.startTime} - {event.endTime}
                    </Typography>
                    <Typography>{event.description}</Typography>
                    <Typography>{event.location}</Typography>
                    <Typography>카테고리: {event.category}</Typography>
                    {event.repeat.type !== 'none' && (
                      <Typography>
                        반복: {event.repeat.interval}
                        {event.repeat.type === 'daily' && '일'}
                        {event.repeat.type === 'weekly' && '주'}
                        {event.repeat.type === 'monthly' && '월'}
                        {event.repeat.type === 'yearly' && '년'}
                        마다
                        {event.repeat.endDate && ` (종료: ${event.repeat.endDate})`}
                      </Typography>
                    )}
                    <Typography>
                      알림:{' '}
                      {
                        notificationOptions.find(
                          (option) => option.value === event.notificationTime
                        )?.label
                      }
                    </Typography>
                  </Stack>
                  <Stack>
                    <IconButton aria-label="Edit event" onClick={() => handleEditEvent(event)}>
                      <Edit />
                    </IconButton>
                    <IconButton aria-label="Delete event" onClick={() => handleDeleteEvent(event)}>
                      <Delete />
                    </IconButton>
                  </Stack>
                </Stack>
              </Box>
            ))
          )}
        </Stack>
      </Stack>

      <Dialog open={isOverlapDialogOpen} onClose={() => setIsOverlapDialogOpen(false)}>
        <DialogTitle>일정 겹침 경고</DialogTitle>
        <DialogContent>
          <DialogContentText>다음 일정과 겹칩니다:</DialogContentText>
          {overlappingEvents.map((event) => (
            <Typography key={event.id} sx={{ ml: 1, mb: 1 }}>
              {event.title} ({event.date} {event.startTime}-{event.endTime})
            </Typography>
          ))}
          <DialogContentText>계속 진행하시겠습니까?</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsOverlapDialogOpen(false)}>취소</Button>
          <Button
            color="error"
            onClick={() => {
              setIsOverlapDialogOpen(false);
              saveEvent({
                id: editingEvent ? editingEvent.id : undefined,
                title,
                date,
                startTime,
                endTime,
                description,
                location,
                category,
                repeat: {
                  type: isRepeating ? repeatType : 'none',
                  interval: repeatInterval,
                  endDate: repeatEndDate || undefined,
                },
                notificationTime,
              });
            }}
          >
            계속 진행
          </Button>
        </DialogActions>
      </Dialog>

      <RecurringEventDialog
        open={isRecurringDialogOpen}
        onClose={() => {
          setIsRecurringDialogOpen(false);
          setPendingRecurringEdit(null);
          setPendingRecurringDelete(null);
        }}
        onConfirm={handleRecurringConfirm}
        event={recurringDialogMode === 'edit' ? pendingRecurringEdit : pendingRecurringDelete}
        mode={recurringDialogMode}
      />

      {notifications.length > 0 && (
        <Stack position="fixed" top={16} right={16} spacing={2} alignItems="flex-end">
          {notifications.map((notification, index) => (
            <Alert
              key={index}
              severity="info"
              sx={{ width: 'auto' }}
              action={
                <IconButton
                  size="small"
                  onClick={() => setNotifications((prev) => prev.filter((_, i) => i !== index))}
                >
                  <Close />
                </IconButton>
              }
            >
              <AlertTitle>{notification.message}</AlertTitle>
            </Alert>
          ))}
        </Stack>
      )}
    </Box>
  );
}

export default App;

```

```typescriptreact
import ChevronLeft from '@mui/icons-material/ChevronLeft';
import ChevronRight from '@mui/icons-material/ChevronRight';
import Close from '@mui/icons-material/Close';
import Delete from '@mui/icons-material/Delete';
import Edit from '@mui/icons-material/Edit';
import Notifications from '@mui/icons-material/Notifications';
import Repeat from '@mui/icons-material/Repeat';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormLabel,
  IconButton,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useSnackbar } from 'notistack';
import { DragEvent as ReactDragEvent, useState } from 'react';

import RecurringEventDialog from './components/RecurringEventDialog.tsx';
import { useCalendarView } from './hooks/useCalendarView.ts';
import { useEventForm } from './hooks/useEventForm.ts';
import { useEventOperations } from './hooks/useEventOperations.ts';
import { useNotifications } from './hooks/useNotifications.ts';
import { useRecurringEventOperations } from './hooks/useRecurringEventOperations.ts';
import { useSearch } from './hooks/useSearch.ts';
import { Event, EventForm, RepeatType } from './types.ts';
import {
  formatDate,
  formatMonth,
  formatWeek,
  getEventsForDay,
  getWeekDates,
  getWeeksAtMonth,
} from './utils/dateUtils.ts';
import { findOverlappingEvents } from './utils/eventOverlap.ts';
import { getTimeErrorMessage } from './utils/timeValidation.ts';

const categories = ['업무', '개인', '가족', '기타'];

const weekDays = ['일', '월', '화', '수', '목', '금', '토'];

const notificationOptions = [
  { value: 1, label: '1분 전' },
  { value: 10, label: '10분 전' },
  { value: 60, label: '1시간 전' },
  { value: 120, label: '2시간 전' },
  { value: 1440, label: '1일 전' },
];

// 스타일 상수
const eventBoxStyles = {
  notified: {
    backgroundColor: '#ffebee',
    fontWeight: 'bold',
    color: '#d32f2f',
  },
  normal: {
    backgroundColor: '#f5f5f5',
    fontWeight: 'normal',
    color: 'inherit',
  },
  common: {
    p: 0.5,
    my: 0.5,
    borderRadius: 1,
    minHeight: '18px',
    width: '100%',
    overflow: 'hidden',
  },
};

const getRepeatTypeLabel = (type: RepeatType): string => {
  switch (type) {
    case 'daily':
      return '일';
    case 'weekly':
      return '주';
    case 'monthly':
      return '월';
    case 'yearly':
      return '년';
    default:
      return '';
  }
};

function App() {
  const {
    title,
    setTitle,
    date,
    setDate,
    startTime,
    endTime,
    description,
    setDescription,
    location,
    setLocation,
    category,
    setCategory,
    isRepeating,
    setIsRepeating,
    repeatType,
    setRepeatType,
    repeatInterval,
    setRepeatInterval,
    repeatEndDate,
    setRepeatEndDate,
    notificationTime,
    setNotificationTime,
    startTimeError,
    endTimeError,
    editingEvent,
    setEditingEvent,
    handleStartTimeChange,
    handleEndTimeChange,
    resetForm,
    editEvent,
  } = useEventForm();

  const { events, saveEvent, deleteEvent, createRepeatEvent, fetchEvents } = useEventOperations(
    Boolean(editingEvent),
    () => setEditingEvent(null)
  );

  const { handleRecurringEdit, handleRecurringDelete } = useRecurringEventOperations(
    events,
    async () => {
      // After recurring edit, refresh events from server
      await fetchEvents();
    }
  );

  const { notifications, notifiedEvents, setNotifications } = useNotifications(events);
  const { view, setView, currentDate, holidays, navigate } = useCalendarView();
  const { searchTerm, filteredEvents, setSearchTerm } = useSearch(events, currentDate, view);

  const [isOverlapDialogOpen, setIsOverlapDialogOpen] = useState(false);
  const [overlappingEvents, setOverlappingEvents] = useState<Event[]>([]);
  const [isRecurringDialogOpen, setIsRecurringDialogOpen] = useState(false);
  const [pendingRecurringEdit, setPendingRecurringEdit] = useState<Event | null>(null);
  const [pendingRecurringDelete, setPendingRecurringDelete] = useState<Event | null>(null);
  const [recurringEditMode, setRecurringEditMode] = useState<boolean | null>(null); // true = single, false = all
  const [recurringDialogMode, setRecurringDialogMode] = useState<'edit' | 'delete'>('edit');
  
  // 드래그 앤 드롭 상태
  const [draggedEventId, setDraggedEventId] = useState<string | null>(null);
  const [dragOverCellDate, setDragOverCellDate] = useState<string | null>(null);
  const [isDraggingOverCalendar, setIsDraggingOverCalendar] = useState(false);

  const { enqueueSnackbar } = useSnackbar();

  const handleRecurringConfirm = async (editSingleOnly: boolean) => {
    if (recurringDialogMode === 'edit' && pendingRecurringEdit) {
      // 편집 모드 저장하고 편집 폼으로 이동
      setRecurringEditMode(editSingleOnly);
      editEvent(pendingRecurringEdit);
      setIsRecurringDialogOpen(false);
      setPendingRecurringEdit(null);
    } else if (recurringDialogMode === 'delete' && pendingRecurringDelete) {
      // 반복 일정 삭제 처리
      try {
        await handleRecurringDelete(pendingRecurringDelete, editSingleOnly);
        enqueueSnackbar('일정이 삭제되었습니다', { variant: 'success' });
      } catch (error) {
        console.error(error);
        enqueueSnackbar('일정 삭제 실패', { variant: 'error' });
      }
      setIsRecurringDialogOpen(false);
      setPendingRecurringDelete(null);
    }
  };

  const isRecurringEvent = (event: Event): boolean => {
    return event.repeat.type !== 'none' && event.repeat.interval > 0;
  };

  const handleEditEvent = (event: Event) => {
    if (isRecurringEvent(event)) {
      // Show recurring edit dialog
      setPendingRecurringEdit(event);
      setRecurringDialogMode('edit');
      setIsRecurringDialogOpen(true);
    } else {
      // Regular event editing
      editEvent(event);
    }
  };

  const handleDeleteEvent = (event: Event) => {
    if (isRecurringEvent(event)) {
      // Show recurring delete dialog
      setPendingRecurringDelete(event);
      setRecurringDialogMode('delete');
      setIsRecurringDialogOpen(true);
    } else {
      // Regular event deletion
      deleteEvent(event.id);
    }
  };

  // 드래그 앤 드롭 핸들러
  const handleDragStart = (e: ReactDragEvent<HTMLElement>, eventId: string) => {
    setDraggedEventId(eventId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', eventId);
    
    // 드래그 중인 요소에 스타일 적용
    const target = e.currentTarget as HTMLElement;
    target.style.opacity = '0.5';
    target.setAttribute('data-dragging', 'true');
  };

  const handleDragEnd = (e: ReactDragEvent<HTMLElement>) => {
    setDraggedEventId(null);
    setDragOverCellDate(null);
    setIsDraggingOverCalendar(false);
    
    // 드래그 종료 시 스타일 복원
    const target = e.currentTarget as HTMLElement;
    target.style.opacity = '1';
    target.removeAttribute('data-dragging');
    
    // body 커서 스타일 복원
    document.body.style.cursor = '';
  };

  const handleDragOverCell = (e: ReactDragEvent<HTMLElement>, dateString: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverCellDate(dateString);
    setIsDraggingOverCalendar(true);
    
    // 셀에 droppable 속성과 배경색 즉시 추가 (DOM 직접 조작)
    const target = e.currentTarget as HTMLElement;
    target.setAttribute('data-droppable', 'true');
    target.style.backgroundColor = '#e3f2fd';
    
    // body 커서 스타일 제거 (캘린더 내부)
    document.body.style.cursor = '';
  };

  const handleDragLeaveCell = (e: ReactDragEvent<HTMLElement>) => {
    const target = e.currentTarget as HTMLElement;
    target.removeAttribute('data-droppable');
    target.style.backgroundColor = '';
  };

  const handleDragOverOutside = (e: ReactDragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOverCalendar(false);
    
    // 캘린더 외부일 때 not-allowed 커서 표시 (즉시 반영)
    document.body.style.cursor = 'not-allowed';
  };

  const handleDrop = (e: ReactDragEvent<HTMLElement>) => {
    e.preventDefault();
    const target = e.currentTarget as HTMLElement;
    target.removeAttribute('data-droppable');
    
    // TODO: 실제 드롭 처리 로직 (다음 스토리에서 구현)
  };

  const addOrUpdateEvent = async () => {
    if (!title || !date || !startTime || !endTime) {
      enqueueSnackbar('필수 정보를 모두 입력해주세요.', { variant: 'error' });
      return;
    }

    if (startTimeError || endTimeError) {
      enqueueSnackbar('시간 설정을 확인해주세요.', { variant: 'error' });
      return;
    }

    const eventData: Event | EventForm = {
      id: editingEvent ? editingEvent.id : undefined,
      title,
      date,
      startTime,
      endTime,
      description,
      location,
      category,
      repeat: editingEvent
        ? editingEvent.repeat // Keep original repeat settings for recurring event detection
        : {
            type: isRepeating ? repeatType : 'none',
            interval: repeatInterval,
            endDate: repeatEndDate || undefined,
          },
      notificationTime,
    };

    const overlapping = findOverlappingEvents(eventData, events);
    const hasOverlapEvent = overlapping.length > 0;

    // 수정
    if (editingEvent) {
      if (hasOverlapEvent) {
        setOverlappingEvents(overlapping);
        setIsOverlapDialogOpen(true);
        return;
      }

      if (
        editingEvent.repeat.type !== 'none' &&
        editingEvent.repeat.interval > 0 &&
        recurringEditMode !== null
      ) {
        await handleRecurringEdit(eventData as Event, recurringEditMode);
        setRecurringEditMode(null);
      } else {
        await saveEvent(eventData);
      }

      resetForm();
      return;
    }

    // 생성
    if (isRepeating) {
      // 반복 생성은 반복 일정을 고려하지 않는다.
      await createRepeatEvent(eventData);
      resetForm();
      return;
    }

    if (hasOverlapEvent) {
      setOverlappingEvents(overlapping);
      setIsOverlapDialogOpen(true);
      return;
    }

    await saveEvent(eventData);
    resetForm();
  };

  const renderWeekView = () => {
    const weekDates = getWeekDates(currentDate);
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
                {weekDates.map((date) => (
                  <TableCell
                    key={date.toISOString()}
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
                      .map((event) => {
                        const isNotified = notifiedEvents.includes(event.id);
                        const isRepeating = event.repeat.type !== 'none';

                        return (
                          <Box
                            key={event.id}
                            sx={{
                              ...eventBoxStyles.common,
                              ...(isNotified ? eventBoxStyles.notified : eventBoxStyles.normal),
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
                ))}
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Stack>
    );
  };

  const renderMonthView = () => {
    const weeks = getWeeksAtMonth(currentDate);

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
                        onDragOver={(e) => day && handleDragOverCell(e, dateString)}
                        onDragLeave={handleDragLeaveCell}
                        onDrop={handleDrop}
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
                                <Box
                                  key={event.id}
                                  draggable
                                  onDragStart={(e) => handleDragStart(e, event.id)}
                                  onDragEnd={handleDragEnd}
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
                                >
                                  <Stack direction="row" spacing={1} alignItems="center">
                                    {isNotified && <Notifications fontSize="small" />}
                                    {/* ! TEST CASE */}
                                    {isRepeating && (
                                      <Tooltip
                                        title={`${event.repeat.interval}${getRepeatTypeLabel(event.repeat.type)}마다 반복${
                                          event.repeat.endDate
                                            ? ` (종료: ${event.repeat.endDate})`
                                            : ''
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

  return (
    <Box sx={{ width: '100%', height: '100vh', margin: 'auto', p: 5 }}>
      <Stack direction="row" spacing={6} sx={{ height: '100%' }}>
        <Stack spacing={2} sx={{ width: '20%' }}>
          <Typography variant="h4">{editingEvent ? '일정 수정' : '일정 추가'}</Typography>

          <FormControl fullWidth>
            <FormLabel htmlFor="title">제목</FormLabel>
            <TextField
              id="title"
              size="small"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </FormControl>

          <FormControl fullWidth>
            <FormLabel htmlFor="date">날짜</FormLabel>
            <TextField
              id="date"
              size="small"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </FormControl>

          <Stack direction="row" spacing={2}>
            <FormControl fullWidth>
              <FormLabel htmlFor="start-time">시작 시간</FormLabel>
              <Tooltip title={startTimeError || ''} open={!!startTimeError} placement="top">
                <TextField
                  id="start-time"
                  size="small"
                  type="time"
                  value={startTime}
                  onChange={handleStartTimeChange}
                  onBlur={() => getTimeErrorMessage(startTime, endTime)}
                  error={!!startTimeError}
                />
              </Tooltip>
            </FormControl>
            <FormControl fullWidth>
              <FormLabel htmlFor="end-time">종료 시간</FormLabel>
              <Tooltip title={endTimeError || ''} open={!!endTimeError} placement="top">
                <TextField
                  id="end-time"
                  size="small"
                  type="time"
                  value={endTime}
                  onChange={handleEndTimeChange}
                  onBlur={() => getTimeErrorMessage(startTime, endTime)}
                  error={!!endTimeError}
                />
              </Tooltip>
            </FormControl>
          </Stack>

          <FormControl fullWidth>
            <FormLabel htmlFor="description">설명</FormLabel>
            <TextField
              id="description"
              size="small"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </FormControl>

          <FormControl fullWidth>
            <FormLabel htmlFor="location">위치</FormLabel>
            <TextField
              id="location"
              size="small"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </FormControl>

          <FormControl fullWidth>
            <FormLabel id="category-label">카테고리</FormLabel>
            <Select
              id="category"
              size="small"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              aria-labelledby="category-label"
              aria-label="카테고리"
            >
              {categories.map((cat) => (
                <MenuItem key={cat} value={cat} aria-label={`${cat}-option`}>
                  {cat}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {!editingEvent && (
            <FormControl>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={isRepeating}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setIsRepeating(checked);
                      if (checked) {
                        setRepeatType('daily');
                      } else {
                        setRepeatType('none');
                      }
                    }}
                  />
                }
                label="반복 일정"
              />
            </FormControl>
          )}

          {/* ! TEST CASE */}
          {isRepeating && !editingEvent && (
            <Stack spacing={2}>
              <FormControl fullWidth>
                <FormLabel>반복 유형</FormLabel>
                <Select
                  size="small"
                  value={repeatType}
                  aria-label="반복 유형"
                  onChange={(e) => setRepeatType(e.target.value as RepeatType)}
                >
                  <MenuItem value="daily" aria-label="daily-option">
                    매일
                  </MenuItem>
                  <MenuItem value="weekly" aria-label="weekly-option">
                    매주
                  </MenuItem>
                  <MenuItem value="monthly" aria-label="monthly-option">
                    매월
                  </MenuItem>
                  <MenuItem value="yearly" aria-label="yearly-option">
                    매년
                  </MenuItem>
                </Select>
              </FormControl>
              <Stack direction="row" spacing={2}>
                <FormControl fullWidth>
                  <FormLabel htmlFor="repeat-interval">반복 간격</FormLabel>
                  <TextField
                    id="repeat-interval"
                    size="small"
                    type="number"
                    value={repeatInterval}
                    onChange={(e) => setRepeatInterval(Number(e.target.value))}
                    slotProps={{ htmlInput: { min: 1 } }}
                  />
                </FormControl>
                <FormControl fullWidth>
                  <FormLabel htmlFor="repeat-end-date">반복 종료일</FormLabel>
                  <TextField
                    id="repeat-end-date"
                    size="small"
                    type="date"
                    value={repeatEndDate}
                    onChange={(e) => setRepeatEndDate(e.target.value)}
                  />
                </FormControl>
              </Stack>
            </Stack>
          )}

          <FormControl fullWidth>
            <FormLabel htmlFor="notification">알림 설정</FormLabel>
            <Select
              id="notification"
              size="small"
              value={notificationTime}
              onChange={(e) => setNotificationTime(Number(e.target.value))}
            >
              {notificationOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Button
            data-testid="event-submit-button"
            onClick={addOrUpdateEvent}
            variant="contained"
            color="primary"
          >
            {editingEvent ? '일정 수정' : '일정 추가'}
          </Button>
        </Stack>

        <Stack flex={1} spacing={5}>
          <Typography variant="h4">일정 보기</Typography>

          <Stack direction="row" spacing={2} justifyContent="space-between" alignItems="center">
            <IconButton aria-label="Previous" onClick={() => navigate('prev')}>
              <ChevronLeft />
            </IconButton>
            <Select
              size="small"
              aria-label="뷰 타입 선택"
              value={view}
              onChange={(e) => setView(e.target.value as 'week' | 'month')}
            >
              <MenuItem value="week" aria-label="week-option">
                Week
              </MenuItem>
              <MenuItem value="month" aria-label="month-option">
                Month
              </MenuItem>
            </Select>
            <IconButton aria-label="Next" onClick={() => navigate('next')}>
              <ChevronRight />
            </IconButton>
          </Stack>

          {view === 'week' && renderWeekView()}
          {view === 'month' && renderMonthView()}
        </Stack>

        <Stack
          data-testid="event-list"
          spacing={2}
          sx={{ width: '30%', height: '100%', overflowY: 'auto' }}
          onDragOver={handleDragOverOutside}
        >
          <FormControl fullWidth>
            <FormLabel htmlFor="search">일정 검색</FormLabel>
            <TextField
              id="search"
              size="small"
              placeholder="검색어를 입력하세요"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </FormControl>

          {filteredEvents.length === 0 ? (
            <Typography>검색 결과가 없습니다.</Typography>
          ) : (
            filteredEvents.map((event) => (
              <Box key={event.id} sx={{ border: 1, borderRadius: 2, p: 3, width: '100%' }}>
                <Stack direction="row" justifyContent="space-between">
                  <Stack>
                    <Stack direction="row" spacing={1} alignItems="center">
                      {notifiedEvents.includes(event.id) && <Notifications color="error" />}
                      {event.repeat.type !== 'none' && (
                        <Tooltip
                          title={`${event.repeat.interval}${getRepeatTypeLabel(event.repeat.type)}마다 반복${
                            event.repeat.endDate ? ` (종료: ${event.repeat.endDate})` : ''
                          }`}
                        >
                          <Repeat fontSize="small" />
                        </Tooltip>
                      )}
                      <Typography
                        fontWeight={notifiedEvents.includes(event.id) ? 'bold' : 'normal'}
                        color={notifiedEvents.includes(event.id) ? 'error' : 'inherit'}
                      >
                        {event.title}
                      </Typography>
                    </Stack>
                    <Typography>{event.date}</Typography>
                    <Typography>
                      {event.startTime} - {event.endTime}
                    </Typography>
                    <Typography>{event.description}</Typography>
                    <Typography>{event.location}</Typography>
                    <Typography>카테고리: {event.category}</Typography>
                    {event.repeat.type !== 'none' && (
                      <Typography>
                        반복: {event.repeat.interval}
                        {event.repeat.type === 'daily' && '일'}
                        {event.repeat.type === 'weekly' && '주'}
                        {event.repeat.type === 'monthly' && '월'}
                        {event.repeat.type === 'yearly' && '년'}
                        마다
                        {event.repeat.endDate && ` (종료: ${event.repeat.endDate})`}
                      </Typography>
                    )}
                    <Typography>
                      알림:{' '}
                      {
                        notificationOptions.find(
                          (option) => option.value === event.notificationTime
                        )?.label
                      }
                    </Typography>
                  </Stack>
                  <Stack>
                    <IconButton aria-label="Edit event" onClick={() => handleEditEvent(event)}>
                      <Edit />
                    </IconButton>
                    <IconButton aria-label="Delete event" onClick={() => handleDeleteEvent(event)}>
                      <Delete />
                    </IconButton>
                  </Stack>
                </Stack>
              </Box>
            ))
          )}
        </Stack>
      </Stack>

      <Dialog open={isOverlapDialogOpen} onClose={() => setIsOverlapDialogOpen(false)}>
        <DialogTitle>일정 겹침 경고</DialogTitle>
        <DialogContent>
          <DialogContentText>다음 일정과 겹칩니다:</DialogContentText>
          {overlappingEvents.map((event) => (
            <Typography key={event.id} sx={{ ml: 1, mb: 1 }}>
              {event.title} ({event.date} {event.startTime}-{event.endTime})
            </Typography>
          ))}
          <DialogContentText>계속 진행하시겠습니까?</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsOverlapDialogOpen(false)}>취소</Button>
          <Button
            color="error"
            onClick={() => {
              setIsOverlapDialogOpen(false);
              saveEvent({
                id: editingEvent ? editingEvent.id : undefined,
                title,
                date,
                startTime,
                endTime,
                description,
                location,
                category,
                repeat: {
                  type: isRepeating ? repeatType : 'none',
                  interval: repeatInterval,
                  endDate: repeatEndDate || undefined,
                },
                notificationTime,
              });
            }}
          >
            계속 진행
          </Button>
        </DialogActions>
      </Dialog>

      <RecurringEventDialog
        open={isRecurringDialogOpen}
        onClose={() => {
          setIsRecurringDialogOpen(false);
          setPendingRecurringEdit(null);
          setPendingRecurringDelete(null);
        }}
        onConfirm={handleRecurringConfirm}
        event={recurringDialogMode === 'edit' ? pendingRecurringEdit : pendingRecurringDelete}
        mode={recurringDialogMode}
      />

      {notifications.length > 0 && (
        <Stack position="fixed" top={16} right={16} spacing={2} alignItems="flex-end">
          {notifications.map((notification, index) => (
            <Alert
              key={index}
              severity="info"
              sx={{ width: 'auto' }}
              action={
                <IconButton
                  size="small"
                  onClick={() => setNotifications((prev) => prev.filter((_, i) => i !== index))}
                >
                  <Close />
                </IconButton>
              }
            >
              <AlertTitle>{notification.message}</AlertTitle>
            </Alert>
          ))}
        </Stack>
      )}
    </Box>
  );
}

export default App;

```

```typescriptreact
import ChevronLeft from '@mui/icons-material/ChevronLeft';
import ChevronRight from '@mui/icons-material/ChevronRight';
import Close from '@mui/icons-material/Close';
import Delete from '@mui/icons-material/Delete';
import Edit from '@mui/icons-material/Edit';
import Notifications from '@mui/icons-material/Notifications';
import Repeat from '@mui/icons-material/Repeat';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormLabel,
  IconButton,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useSnackbar } from 'notistack';
import { DragEvent as ReactDragEvent, useState } from 'react';

import RecurringEventDialog from './components/RecurringEventDialog.tsx';
import { useCalendarView } from './hooks/useCalendarView.ts';
import { useEventForm } from './hooks/useEventForm.ts';
import { useEventOperations } from './hooks/useEventOperations.ts';
import { useNotifications } from './hooks/useNotifications.ts';
import { useRecurringEventOperations } from './hooks/useRecurringEventOperations.ts';
import { useSearch } from './hooks/useSearch.ts';
import { Event, EventForm, RepeatType } from './types.ts';
import {
  formatDate,
  formatMonth,
  formatWeek,
  getEventsForDay,
  getWeekDates,
  getWeeksAtMonth,
} from './utils/dateUtils.ts';
import { findOverlappingEvents } from './utils/eventOverlap.ts';
import { getTimeErrorMessage } from './utils/timeValidation.ts';

const categories = ['업무', '개인', '가족', '기타'];

const weekDays = ['일', '월', '화', '수', '목', '금', '토'];

const notificationOptions = [
  { value: 1, label: '1분 전' },
  { value: 10, label: '10분 전' },
  { value: 60, label: '1시간 전' },
  { value: 120, label: '2시간 전' },
  { value: 1440, label: '1일 전' },
];

// 스타일 상수
const eventBoxStyles = {
  notified: {
    backgroundColor: '#ffebee',
    fontWeight: 'bold',
    color: '#d32f2f',
  },
  normal: {
    backgroundColor: '#f5f5f5',
    fontWeight: 'normal',
    color: 'inherit',
  },
  common: {
    p: 0.5,
    my: 0.5,
    borderRadius: 1,
    minHeight: '18px',
    width: '100%',
    overflow: 'hidden',
  },
};

const getRepeatTypeLabel = (type: RepeatType): string => {
  switch (type) {
    case 'daily':
      return '일';
    case 'weekly':
      return '주';
    case 'monthly':
      return '월';
    case 'yearly':
      return '년';
    default:
      return '';
  }
};

function App() {
  const {
    title,
    setTitle,
    date,
    setDate,
    startTime,
    endTime,
    description,
    setDescription,
    location,
    setLocation,
    category,
    setCategory,
    isRepeating,
    setIsRepeating,
    repeatType,
    setRepeatType,
    repeatInterval,
    setRepeatInterval,
    repeatEndDate,
    setRepeatEndDate,
    notificationTime,
    setNotificationTime,
    startTimeError,
    endTimeError,
    editingEvent,
    setEditingEvent,
    handleStartTimeChange,
    handleEndTimeChange,
    resetForm,
    editEvent,
  } = useEventForm();

  const { events, saveEvent, deleteEvent, createRepeatEvent, fetchEvents } = useEventOperations(
    Boolean(editingEvent),
    () => setEditingEvent(null)
  );

  const { handleRecurringEdit, handleRecurringDelete } = useRecurringEventOperations(
    events,
    async () => {
      // After recurring edit, refresh events from server
      await fetchEvents();
    }
  );

  const { notifications, notifiedEvents, setNotifications } = useNotifications(events);
  const { view, setView, currentDate, holidays, navigate } = useCalendarView();
  const { searchTerm, filteredEvents, setSearchTerm } = useSearch(events, currentDate, view);

  const [isOverlapDialogOpen, setIsOverlapDialogOpen] = useState(false);
  const [overlappingEvents, setOverlappingEvents] = useState<Event[]>([]);
  const [isRecurringDialogOpen, setIsRecurringDialogOpen] = useState(false);
  const [pendingRecurringEdit, setPendingRecurringEdit] = useState<Event | null>(null);
  const [pendingRecurringDelete, setPendingRecurringDelete] = useState<Event | null>(null);
  const [recurringEditMode, setRecurringEditMode] = useState<boolean | null>(null); // true = single, false = all
  const [recurringDialogMode, setRecurringDialogMode] = useState<'edit' | 'delete'>('edit');
  
  // 드래그 앤 드롭 상태
  const [draggedEventId, setDraggedEventId] = useState<string | null>(null);
  const [dragOverCellDate, setDragOverCellDate] = useState<string | null>(null);
  const [isDraggingOverCalendar, setIsDraggingOverCalendar] = useState(false);

  const { enqueueSnackbar } = useSnackbar();

  const handleRecurringConfirm = async (editSingleOnly: boolean) => {
    if (recurringDialogMode === 'edit' && pendingRecurringEdit) {
      // 편집 모드 저장하고 편집 폼으로 이동
      setRecurringEditMode(editSingleOnly);
      editEvent(pendingRecurringEdit);
      setIsRecurringDialogOpen(false);
      setPendingRecurringEdit(null);
    } else if (recurringDialogMode === 'delete' && pendingRecurringDelete) {
      // 반복 일정 삭제 처리
      try {
        await handleRecurringDelete(pendingRecurringDelete, editSingleOnly);
        enqueueSnackbar('일정이 삭제되었습니다', { variant: 'success' });
      } catch (error) {
        console.error(error);
        enqueueSnackbar('일정 삭제 실패', { variant: 'error' });
      }
      setIsRecurringDialogOpen(false);
      setPendingRecurringDelete(null);
    }
  };

  const isRecurringEvent = (event: Event): boolean => {
    return event.repeat.type !== 'none' && event.repeat.interval > 0;
  };

  const handleEditEvent = (event: Event) => {
    if (isRecurringEvent(event)) {
      // Show recurring edit dialog
      setPendingRecurringEdit(event);
      setRecurringDialogMode('edit');
      setIsRecurringDialogOpen(true);
    } else {
      // Regular event editing
      editEvent(event);
    }
  };

  const handleDeleteEvent = (event: Event) => {
    if (isRecurringEvent(event)) {
      // Show recurring delete dialog
      setPendingRecurringDelete(event);
      setRecurringDialogMode('delete');
      setIsRecurringDialogOpen(true);
    } else {
      // Regular event deletion
      deleteEvent(event.id);
    }
  };

  // 드래그 앤 드롭 핸들러
  const handleDragStart = (e: ReactDragEvent<HTMLElement>, eventId: string) => {
    setDraggedEventId(eventId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', eventId);
    
    // 드래그 중인 요소에 스타일 적용
    const target = e.currentTarget as HTMLElement;
    target.style.opacity = '0.5';
    target.setAttribute('data-dragging', 'true');
  };

  const handleDragEnd = (e: ReactDragEvent<HTMLElement>) => {
    setDraggedEventId(null);
    setDragOverCellDate(null);
    setIsDraggingOverCalendar(false);
    
    // 드래그 종료 시 스타일 복원
    const target = e.currentTarget as HTMLElement;
    target.style.opacity = '1';
    target.removeAttribute('data-dragging');
    
    // body 커서 스타일 복원
    document.body.style.cursor = '';
  };

  const handleDragOverCell = (e: ReactDragEvent<HTMLElement>, dateString: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverCellDate(dateString);
    setIsDraggingOverCalendar(true);
    
    // 셀에 droppable 속성과 배경색 즉시 추가 (DOM 직접 조작)
    const target = e.currentTarget as HTMLElement;
    target.setAttribute('data-droppable', 'true');
    target.style.backgroundColor = '#e3f2fd';
    
    // body 커서 스타일 제거 (캘린더 내부)
    document.body.style.cursor = '';
  };

  const handleDragLeaveCell = (e: ReactDragEvent<HTMLElement>) => {
    const target = e.currentTarget as HTMLElement;
    target.removeAttribute('data-droppable');
    target.style.backgroundColor = '';
  };

  const handleDragOverOutside = (e: ReactDragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOverCalendar(false);
    
    // 캘린더 외부일 때 not-allowed 커서 표시 (즉시 반영)
    document.body.style.cursor = 'not-allowed';
  };

  const handleDrop = (e: ReactDragEvent<HTMLElement>) => {
    e.preventDefault();
    const target = e.currentTarget as HTMLElement;
    target.removeAttribute('data-droppable');
    target.style.backgroundColor = '';
    
    // TODO: 실제 드롭 처리 로직 (다음 스토리에서 구현)
  };

  const addOrUpdateEvent = async () => {
    if (!title || !date || !startTime || !endTime) {
      enqueueSnackbar('필수 정보를 모두 입력해주세요.', { variant: 'error' });
      return;
    }

    if (startTimeError || endTimeError) {
      enqueueSnackbar('시간 설정을 확인해주세요.', { variant: 'error' });
      return;
    }

    const eventData: Event | EventForm = {
      id: editingEvent ? editingEvent.id : undefined,
      title,
      date,
      startTime,
      endTime,
      description,
      location,
      category,
      repeat: editingEvent
        ? editingEvent.repeat // Keep original repeat settings for recurring event detection
        : {
            type: isRepeating ? repeatType : 'none',
            interval: repeatInterval,
            endDate: repeatEndDate || undefined,
          },
      notificationTime,
    };

    const overlapping = findOverlappingEvents(eventData, events);
    const hasOverlapEvent = overlapping.length > 0;

    // 수정
    if (editingEvent) {
      if (hasOverlapEvent) {
        setOverlappingEvents(overlapping);
        setIsOverlapDialogOpen(true);
        return;
      }

      if (
        editingEvent.repeat.type !== 'none' &&
        editingEvent.repeat.interval > 0 &&
        recurringEditMode !== null
      ) {
        await handleRecurringEdit(eventData as Event, recurringEditMode);
        setRecurringEditMode(null);
      } else {
        await saveEvent(eventData);
      }

      resetForm();
      return;
    }

    // 생성
    if (isRepeating) {
      // 반복 생성은 반복 일정을 고려하지 않는다.
      await createRepeatEvent(eventData);
      resetForm();
      return;
    }

    if (hasOverlapEvent) {
      setOverlappingEvents(overlapping);
      setIsOverlapDialogOpen(true);
      return;
    }

    await saveEvent(eventData);
    resetForm();
  };

  const renderWeekView = () => {
    const weekDates = getWeekDates(currentDate);
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
                {weekDates.map((date) => (
                  <TableCell
                    key={date.toISOString()}
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
                      .map((event) => {
                        const isNotified = notifiedEvents.includes(event.id);
                        const isRepeating = event.repeat.type !== 'none';

                        return (
                          <Box
                            key={event.id}
                            sx={{
                              ...eventBoxStyles.common,
                              ...(isNotified ? eventBoxStyles.notified : eventBoxStyles.normal),
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
                ))}
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Stack>
    );
  };

  const renderMonthView = () => {
    const weeks = getWeeksAtMonth(currentDate);

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
                        onDragOver={(e) => day && handleDragOverCell(e, dateString)}
                        onDragLeave={handleDragLeaveCell}
                        onDrop={handleDrop}
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
                                <Box
                                  key={event.id}
                                  draggable
                                  onDragStart={(e) => handleDragStart(e, event.id)}
                                  onDragEnd={handleDragEnd}
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
                                >
                                  <Stack direction="row" spacing={1} alignItems="center">
                                    {isNotified && <Notifications fontSize="small" />}
                                    {/* ! TEST CASE */}
                                    {isRepeating && (
                                      <Tooltip
                                        title={`${event.repeat.interval}${getRepeatTypeLabel(event.repeat.type)}마다 반복${
                                          event.repeat.endDate
                                            ? ` (종료: ${event.repeat.endDate})`
                                            : ''
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

  return (
    <Box sx={{ width: '100%', height: '100vh', margin: 'auto', p: 5 }}>
      <Stack direction="row" spacing={6} sx={{ height: '100%' }}>
        <Stack spacing={2} sx={{ width: '20%' }}>
          <Typography variant="h4">{editingEvent ? '일정 수정' : '일정 추가'}</Typography>

          <FormControl fullWidth>
            <FormLabel htmlFor="title">제목</FormLabel>
            <TextField
              id="title"
              size="small"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </FormControl>

          <FormControl fullWidth>
            <FormLabel htmlFor="date">날짜</FormLabel>
            <TextField
              id="date"
              size="small"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </FormControl>

          <Stack direction="row" spacing={2}>
            <FormControl fullWidth>
              <FormLabel htmlFor="start-time">시작 시간</FormLabel>
              <Tooltip title={startTimeError || ''} open={!!startTimeError} placement="top">
                <TextField
                  id="start-time"
                  size="small"
                  type="time"
                  value={startTime}
                  onChange={handleStartTimeChange}
                  onBlur={() => getTimeErrorMessage(startTime, endTime)}
                  error={!!startTimeError}
                />
              </Tooltip>
            </FormControl>
            <FormControl fullWidth>
              <FormLabel htmlFor="end-time">종료 시간</FormLabel>
              <Tooltip title={endTimeError || ''} open={!!endTimeError} placement="top">
                <TextField
                  id="end-time"
                  size="small"
                  type="time"
                  value={endTime}
                  onChange={handleEndTimeChange}
                  onBlur={() => getTimeErrorMessage(startTime, endTime)}
                  error={!!endTimeError}
                />
              </Tooltip>
            </FormControl>
          </Stack>

          <FormControl fullWidth>
            <FormLabel htmlFor="description">설명</FormLabel>
            <TextField
              id="description"
              size="small"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </FormControl>

          <FormControl fullWidth>
            <FormLabel htmlFor="location">위치</FormLabel>
            <TextField
              id="location"
              size="small"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </FormControl>

          <FormControl fullWidth>
            <FormLabel id="category-label">카테고리</FormLabel>
            <Select
              id="category"
              size="small"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              aria-labelledby="category-label"
              aria-label="카테고리"
            >
              {categories.map((cat) => (
                <MenuItem key={cat} value={cat} aria-label={`${cat}-option`}>
                  {cat}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {!editingEvent && (
            <FormControl>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={isRepeating}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setIsRepeating(checked);
                      if (checked) {
                        setRepeatType('daily');
                      } else {
                        setRepeatType('none');
                      }
                    }}
                  />
                }
                label="반복 일정"
              />
            </FormControl>
          )}

          {/* ! TEST CASE */}
          {isRepeating && !editingEvent && (
            <Stack spacing={2}>
              <FormControl fullWidth>
                <FormLabel>반복 유형</FormLabel>
                <Select
                  size="small"
                  value={repeatType}
                  aria-label="반복 유형"
                  onChange={(e) => setRepeatType(e.target.value as RepeatType)}
                >
                  <MenuItem value="daily" aria-label="daily-option">
                    매일
                  </MenuItem>
                  <MenuItem value="weekly" aria-label="weekly-option">
                    매주
                  </MenuItem>
                  <MenuItem value="monthly" aria-label="monthly-option">
                    매월
                  </MenuItem>
                  <MenuItem value="yearly" aria-label="yearly-option">
                    매년
                  </MenuItem>
                </Select>
              </FormControl>
              <Stack direction="row" spacing={2}>
                <FormControl fullWidth>
                  <FormLabel htmlFor="repeat-interval">반복 간격</FormLabel>
                  <TextField
                    id="repeat-interval"
                    size="small"
                    type="number"
                    value={repeatInterval}
                    onChange={(e) => setRepeatInterval(Number(e.target.value))}
                    slotProps={{ htmlInput: { min: 1 } }}
                  />
                </FormControl>
                <FormControl fullWidth>
                  <FormLabel htmlFor="repeat-end-date">반복 종료일</FormLabel>
                  <TextField
                    id="repeat-end-date"
                    size="small"
                    type="date"
                    value={repeatEndDate}
                    onChange={(e) => setRepeatEndDate(e.target.value)}
                  />
                </FormControl>
              </Stack>
            </Stack>
          )}

          <FormControl fullWidth>
            <FormLabel htmlFor="notification">알림 설정</FormLabel>
            <Select
              id="notification"
              size="small"
              value={notificationTime}
              onChange={(e) => setNotificationTime(Number(e.target.value))}
            >
              {notificationOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Button
            data-testid="event-submit-button"
            onClick={addOrUpdateEvent}
            variant="contained"
            color="primary"
          >
            {editingEvent ? '일정 수정' : '일정 추가'}
          </Button>
        </Stack>

        <Stack flex={1} spacing={5}>
          <Typography variant="h4">일정 보기</Typography>

          <Stack direction="row" spacing={2} justifyContent="space-between" alignItems="center">
            <IconButton aria-label="Previous" onClick={() => navigate('prev')}>
              <ChevronLeft />
            </IconButton>
            <Select
              size="small"
              aria-label="뷰 타입 선택"
              value={view}
              onChange={(e) => setView(e.target.value as 'week' | 'month')}
            >
              <MenuItem value="week" aria-label="week-option">
                Week
              </MenuItem>
              <MenuItem value="month" aria-label="month-option">
                Month
              </MenuItem>
            </Select>
            <IconButton aria-label="Next" onClick={() => navigate('next')}>
              <ChevronRight />
            </IconButton>
          </Stack>

          {view === 'week' && renderWeekView()}
          {view === 'month' && renderMonthView()}
        </Stack>

        <Stack
          data-testid="event-list"
          spacing={2}
          sx={{ width: '30%', height: '100%', overflowY: 'auto' }}
          onDragOver={handleDragOverOutside}
        >
          <FormControl fullWidth>
            <FormLabel htmlFor="search">일정 검색</FormLabel>
            <TextField
              id="search"
              size="small"
              placeholder="검색어를 입력하세요"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </FormControl>

          {filteredEvents.length === 0 ? (
            <Typography>검색 결과가 없습니다.</Typography>
          ) : (
            filteredEvents.map((event) => (
              <Box key={event.id} sx={{ border: 1, borderRadius: 2, p: 3, width: '100%' }}>
                <Stack direction="row" justifyContent="space-between">
                  <Stack>
                    <Stack direction="row" spacing={1} alignItems="center">
                      {notifiedEvents.includes(event.id) && <Notifications color="error" />}
                      {event.repeat.type !== 'none' && (
                        <Tooltip
                          title={`${event.repeat.interval}${getRepeatTypeLabel(event.repeat.type)}마다 반복${
                            event.repeat.endDate ? ` (종료: ${event.repeat.endDate})` : ''
                          }`}
                        >
                          <Repeat fontSize="small" />
                        </Tooltip>
                      )}
                      <Typography
                        fontWeight={notifiedEvents.includes(event.id) ? 'bold' : 'normal'}
                        color={notifiedEvents.includes(event.id) ? 'error' : 'inherit'}
                      >
                        {event.title}
                      </Typography>
                    </Stack>
                    <Typography>{event.date}</Typography>
                    <Typography>
                      {event.startTime} - {event.endTime}
                    </Typography>
                    <Typography>{event.description}</Typography>
                    <Typography>{event.location}</Typography>
                    <Typography>카테고리: {event.category}</Typography>
                    {event.repeat.type !== 'none' && (
                      <Typography>
                        반복: {event.repeat.interval}
                        {event.repeat.type === 'daily' && '일'}
                        {event.repeat.type === 'weekly' && '주'}
                        {event.repeat.type === 'monthly' && '월'}
                        {event.repeat.type === 'yearly' && '년'}
                        마다
                        {event.repeat.endDate && ` (종료: ${event.repeat.endDate})`}
                      </Typography>
                    )}
                    <Typography>
                      알림:{' '}
                      {
                        notificationOptions.find(
                          (option) => option.value === event.notificationTime
                        )?.label
                      }
                    </Typography>
                  </Stack>
                  <Stack>
                    <IconButton aria-label="Edit event" onClick={() => handleEditEvent(event)}>
                      <Edit />
                    </IconButton>
                    <IconButton aria-label="Delete event" onClick={() => handleDeleteEvent(event)}>
                      <Delete />
                    </IconButton>
                  </Stack>
                </Stack>
              </Box>
            ))
          )}
        </Stack>
      </Stack>

      <Dialog open={isOverlapDialogOpen} onClose={() => setIsOverlapDialogOpen(false)}>
        <DialogTitle>일정 겹침 경고</DialogTitle>
        <DialogContent>
          <DialogContentText>다음 일정과 겹칩니다:</DialogContentText>
          {overlappingEvents.map((event) => (
            <Typography key={event.id} sx={{ ml: 1, mb: 1 }}>
              {event.title} ({event.date} {event.startTime}-{event.endTime})
            </Typography>
          ))}
          <DialogContentText>계속 진행하시겠습니까?</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsOverlapDialogOpen(false)}>취소</Button>
          <Button
            color="error"
            onClick={() => {
              setIsOverlapDialogOpen(false);
              saveEvent({
                id: editingEvent ? editingEvent.id : undefined,
                title,
                date,
                startTime,
                endTime,
                description,
                location,
                category,
                repeat: {
                  type: isRepeating ? repeatType : 'none',
                  interval: repeatInterval,
                  endDate: repeatEndDate || undefined,
                },
                notificationTime,
              });
            }}
          >
            계속 진행
          </Button>
        </DialogActions>
      </Dialog>

      <RecurringEventDialog
        open={isRecurringDialogOpen}
        onClose={() => {
          setIsRecurringDialogOpen(false);
          setPendingRecurringEdit(null);
          setPendingRecurringDelete(null);
        }}
        onConfirm={handleRecurringConfirm}
        event={recurringDialogMode === 'edit' ? pendingRecurringEdit : pendingRecurringDelete}
        mode={recurringDialogMode}
      />

      {notifications.length > 0 && (
        <Stack position="fixed" top={16} right={16} spacing={2} alignItems="flex-end">
          {notifications.map((notification, index) => (
            <Alert
              key={index}
              severity="info"
              sx={{ width: 'auto' }}
              action={
                <IconButton
                  size="small"
                  onClick={() => setNotifications((prev) => prev.filter((_, i) => i !== index))}
                >
                  <Close />
                </IconButton>
              }
            >
              <AlertTitle>{notification.message}</AlertTitle>
            </Alert>
          ))}
        </Stack>
      )}
    </Box>
  );
}

export default App;

```

완벽합니다! 🎉 모든 테스트가 통과했습니다! 이제 기존 테스트들도 여전히 통과하는지 확인하겠습니다.

새로 작성한 드래그 앤 드롭 테스트가 모두 통과하는지 다시 한 번 확인하겠습니다.

