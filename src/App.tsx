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
  FormControl,
  FormControlLabel,
  FormLabel,
  IconButton,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useSnackbar } from 'notistack';
import { DragEvent as ReactDragEvent, useState } from 'react';

import MonthView from './components/CalenderView/MonthView.tsx';
import WeekView from './components/CalenderView/WeekView.tsx';
import OverlappingConfirmDialog from './components/Dialog/OverlappingConfirmDialog.tsx';
import RecurringEventDialog from './components/Dialog/RecurringEventDialog.tsx';
import { useCalendarView } from './hooks/useCalendarView.ts';
import { useEventForm } from './hooks/useEventForm.ts';
import { useEventOperations } from './hooks/useEventOperations.ts';
import { useNotifications } from './hooks/useNotifications.ts';
import { useRecurringEventOperations } from './hooks/useRecurringEventOperations.ts';
import { useSearch } from './hooks/useSearch.ts';
import { Event, EventForm, RepeatType } from './types.ts';
import { getEventsForDay, getWeekDates, getWeeksAtMonth } from './utils/dateUtils.ts';
import { findOverlappingEvents } from './utils/eventOverlap.ts';
import { getTimeErrorMessage } from './utils/timeValidation.ts';

const categories = ['업무', '개인', '가족', '기타'];

const notificationOptions = [
  { value: 1, label: '1분 전' },
  { value: 10, label: '10분 전' },
  { value: 60, label: '1시간 전' },
  { value: 120, label: '2시간 전' },
  { value: 1440, label: '1일 전' },
];

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
  const [pendingDropTargetDate, setPendingDropTargetDate] = useState<string | null>(null);
  const [pendingOverlapDropEvent, setPendingOverlapDropEvent] = useState<Event | null>(null);

  const { enqueueSnackbar } = useSnackbar();

  const handleRecurringConfirm = async (editSingleOnly: boolean) => {
    if (recurringDialogMode === 'edit' && pendingRecurringEdit) {
      // 로컬 변수에 날짜 정보 저장 (상태 초기화 전)
      const targetDate = pendingDropTargetDate;

      const eventToEdit = targetDate
        ? { ...pendingRecurringEdit, date: targetDate }
        : pendingRecurringEdit;

      // 다이얼로그 먼저 닫기
      setIsRecurringDialogOpen(false);
      setPendingRecurringEdit(null);
      setPendingDropTargetDate(null);

      // 드래그 앤 드롭인 경우 바로 API 호출
      if (targetDate) {
        try {
          let response;
          if (editSingleOnly) {
            // 단일 수정: PUT /api/events/:id
            response = await fetch(`/api/events/${eventToEdit.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(eventToEdit),
            });
          } else {
            // 전체 수정: 같은 repeat.id를 가진 모든 이벤트 찾아서 날짜 변경
            const repeatId = pendingRecurringEdit.repeat.id;
            if (!repeatId) {
              throw new Error('Repeat ID not found');
            }

            // 같은 repeat.id를 가진 모든 이벤트 찾기
            const seriesEvents = events.filter((e) => e.repeat.id === repeatId);

            // 날짜 오프셋 계산 (일 단위)
            const originalDate = new Date(pendingRecurringEdit.date);
            const newDate = new Date(targetDate);
            const dayOffset = Math.round(
              (newDate.getTime() - originalDate.getTime()) / (1000 * 60 * 60 * 24)
            );

            // 모든 반복 일정의 날짜를 오프셋만큼 이동
            const updatedEvents = seriesEvents.map((event) => {
              const eventDate = new Date(event.date);
              eventDate.setDate(eventDate.getDate() + dayOffset);
              return {
                ...event,
                date: eventDate.toISOString().split('T')[0],
              };
            });

            // PUT /api/events-list로 여러 이벤트 한 번에 업데이트
            response = await fetch('/api/events-list', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ events: updatedEvents }),
            });
          }

          if (!response.ok) {
            throw new Error('Failed to update event');
          }

          await fetchEvents();
          enqueueSnackbar('일정이 이동되었습니다', { variant: 'success' });
        } catch (error) {
          console.error('Error moving event:', error);
          enqueueSnackbar('일정 이동 실패', { variant: 'error' });
        }
      } else {
        // 편집 버튼에서 온 경우: 편집 모드 저장 후 편집 폼 열기
        setRecurringEditMode(editSingleOnly);
        editEvent(eventToEdit);
      }
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

    // 캘린더 외부일 때 not-allowed 커서 표시 (즉시 반영)
    document.body.style.cursor = 'not-allowed';
  };

  const handleDrop = async (e: ReactDragEvent<HTMLElement>, targetDateString: string) => {
    e.preventDefault();
    const target = e.currentTarget as HTMLElement;
    target.removeAttribute('data-droppable');
    target.style.backgroundColor = '';

    // dataTransfer에서 이벤트 ID 가져오기 (상태와 함께 사용)
    const eventId = draggedEventId || e.dataTransfer.getData('text/plain');
    if (!eventId) return;

    // 드래그된 이벤트 찾기
    const draggedEvent = events.find((event) => event.id === eventId);
    if (!draggedEvent) return;

    // 동일 날짜에 드롭하면 아무것도 안함
    if (draggedEvent.date === targetDateString) {
      // 드래그 상태 초기화 (동일 날짜 드롭도 상태 초기화 필요)
      setDraggedEventId(null);
      setDragOverCellDate(null);

      // 드래그 중인 요소의 스타일 복원
      const draggedElement = document.querySelector('[data-dragging="true"]') as HTMLElement;
      if (draggedElement) {
        draggedElement.style.opacity = '1';
        draggedElement.removeAttribute('data-dragging');
      }
      return;
    }

    // 반복 일정인 경우 다이얼로그 표시
    if (isRecurringEvent(draggedEvent)) {
      setPendingRecurringEdit(draggedEvent);
      setPendingDropTargetDate(targetDateString);
      setRecurringDialogMode('edit');
      setIsRecurringDialogOpen(true);

      // 드래그 상태 초기화
      setDraggedEventId(null);
      setDragOverCellDate(null);

      // 드래그 중인 요소의 스타일 복원
      const draggedElement = document.querySelector('[data-dragging="true"]') as HTMLElement;
      if (draggedElement) {
        draggedElement.style.opacity = '1';
        draggedElement.removeAttribute('data-dragging');
      }
      return;
    }

    // 날짜만 변경하고 시간은 유지
    const updatedEvent: Event = {
      ...draggedEvent,
      date: targetDateString,
    };

    // 겹침 감지: 드롭 대상 날짜/시간대에 겹치는 일정이 있는지 확인
    const overlapping = findOverlappingEvents(updatedEvent, events);
    if (overlapping.length > 0) {
      setOverlappingEvents(overlapping);
      setPendingOverlapDropEvent(updatedEvent);
      setIsOverlapDialogOpen(true);

      // 드래그 상태 초기화 및 스타일 복원
      setDraggedEventId(null);
      setDragOverCellDate(null);
      const draggedElement = document.querySelector('[data-dragging="true"]') as HTMLElement;
      if (draggedElement) {
        draggedElement.style.opacity = '1';
        draggedElement.removeAttribute('data-dragging');
      }
      return;
    }

    try {
      // 겹침이 없으면 바로 업데이트
      const response = await fetch(`/api/events/${draggedEvent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedEvent),
      });

      if (!response.ok) {
        throw new Error('Failed to update event');
      }

      await fetchEvents();
      enqueueSnackbar('일정이 이동되었습니다', { variant: 'success' });

      setDraggedEventId(null);
      setDragOverCellDate(null);
      const draggedElement = document.querySelector('[data-dragging="true"]') as HTMLElement;
      if (draggedElement) {
        draggedElement.style.opacity = '1';
        draggedElement.removeAttribute('data-dragging');
      }
    } catch (error) {
      console.error('Error moving event:', error);
      enqueueSnackbar('일정 이동 실패', { variant: 'error' });
    }
  };

  const handleDateCellClick = (dateString: string, day: number | null) => {
    // 편집 모드가 아니고, 드래그 중이 아니고, 유효한 날짜인 경우에만 처리
    if (!editingEvent && !draggedEventId && day !== null && dateString) {
      setDate(dateString);
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
      <WeekView
        currentDate={currentDate}
        weekDates={weekDates}
        holidays={holidays}
        handleDateCellClick={handleDateCellClick}
        handleDragOverCell={handleDragOverCell}
        handleDragLeaveCell={handleDragLeaveCell}
        handleDrop={handleDrop}
        handleDragStart={handleDragStart}
        handleDragEnd={handleDragEnd}
        getRepeatTypeLabel={getRepeatTypeLabel}
        filteredEvents={filteredEvents}
        dragOverCellDate={dragOverCellDate}
        notifiedEvents={notifiedEvents}
      />
    );
  };

  const renderMonthView = () => {
    const weeks = getWeeksAtMonth(currentDate);

    return (
      <MonthView
        currentDate={currentDate}
        weeks={weeks}
        holidays={holidays}
        handleDragLeaveCell={handleDragLeaveCell}
        handleDragOverCell={handleDragOverCell}
        handleDrop={handleDrop}
        handleDateCellClick={handleDateCellClick}
        handleDragStart={handleDragStart}
        handleDragEnd={handleDragEnd}
        getEventsForDay={getEventsForDay}
        getRepeatTypeLabel={getRepeatTypeLabel}
        dragOverCellDate={dragOverCellDate}
        filteredEvents={filteredEvents}
        notifiedEvents={notifiedEvents}
      />
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

      <OverlappingConfirmDialog
        isOverlapDialogOpen={isOverlapDialogOpen}
        setIsOverlapDialogOpen={setIsOverlapDialogOpen}
        setPendingOverlapDropEvent={setPendingOverlapDropEvent}
        overlappingEvents={overlappingEvents}
        handleConfirmClick={async () => {
          setIsOverlapDialogOpen(false);
          if (pendingOverlapDropEvent) {
            try {
              const response = await fetch(`/api/events/${pendingOverlapDropEvent.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(pendingOverlapDropEvent),
              });
              if (!response.ok) {
                throw new Error('Failed to update event');
              }
              await fetchEvents();
              enqueueSnackbar('일정이 이동되었습니다', { variant: 'success' });
            } catch (error) {
              console.error('Error moving event:', error);
              enqueueSnackbar('일정 이동 실패', { variant: 'error' });
            } finally {
              setPendingOverlapDropEvent(null);
            }
          } else {
            // 폼 편집 시 겹침 확인으로 열린 경우 기존 동작 유지
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
          }
        }}
      />
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
