---
epic: drag-and-drop
test_suite: 알림 아이콘이 있는 일정 드래그
---

# Story 7: 알림 아이콘이 있는 일정 드래그

## 개요

알림 아이콘(Notifications)이나 반복 아이콘(Repeat)이 표시된 일정도 정상적으로 드래그할 수 있고, 시각적 스타일이 유지되는지 검증합니다.

## Epic 연결

- **Epic**: 드래그 앤 드롭(D&D) 일정 이동 기능
- **Epic 파일**: `.cursor/spec/epics/drag-and-drop.md`
- **검증 포인트**: Epic의 "예상 동작" 섹션 9번(알림 아이콘이 있는 일정 드래그)에서 추출
- **우선순위**: 중간 (일반적인 케이스)

## 테스트 구조 및 범위

이 Story가 작성될 테스트 코드의 논리적 계층 구조를 명시합니다.

- **테스트 스위트 (Describe Block):** '알림 아이콘이 있는 일정 드래그'
  - **테스트 케이스 1:** '알림이 설정된 일정을 드래그할 수 있다'
  - **테스트 케이스 2:** '드래그 중에도 알림 아이콘이 표시된다'
  - **테스트 케이스 3:** '드래그 중에도 빨간색 스타일이 유지된다'
  - **테스트 케이스 4:** '반복 아이콘이 있는 일정을 드래그할 수 있다'
  - **테스트 케이스 5:** '드래그 중에도 반복 아이콘이 표시된다'
  - **테스트 케이스 6:** '알림과 반복 아이콘이 모두 있는 일정을 드래그할 수 있다'
  - **테스트 케이스 7:** '드롭 후 알림 아이콘이 새 날짜에도 유지된다'

## 검증 포인트 (Given-When-Then)

### 검증 포인트 1: 알림 아이콘 유지

```
Given: 2025-11-01의 "팀 회의" 일정에 알림이 설정되어 있음 (notifiedEvents에 포함)
When: 해당 일정을 드래그
Then: 드래그 중인 복사본에도 Notifications 아이콘이 표시됨
And: 빨간색 스타일(#ffebee 배경, #d32f2f 텍스트)이 유지됨
```

## 테스트 데이터

| 시나리오                        | 일정 데이터                                                                            | 아이콘 상태               | 드롭 후 예상 상태                            | 비고                  |
| ------------------------------- | -------------------------------------------------------------------------------------- | ------------------------- | -------------------------------------------- | --------------------- |
| 알림만 있는 일정                | title: "팀 회의", notificationTime: 10, notifiedEvents 포함                            | Notifications 아이콘 표시 | 새 날짜에도 알림 유지, 아이콘 표시           | 알림 설정 유지        |
| 반복만 있는 일정                | title: "매주 회의", repeat: {type: "weekly", interval: 1}                              | Repeat 아이콘 표시        | 새 날짜에도 반복 유지, 아이콘 표시           | 반복 설정 유지        |
| 알림 + 반복 일정                | title: "중요 회의", notificationTime: 30, repeat: {type: "daily"}, notifiedEvents 포함 | 두 아이콘 모두 표시       | 새 날짜에도 알림과 반복 유지, 두 아이콘 표시 | 모든 설정 유지        |
| 알림 있는 일정 드래그 중 스타일 | notificationTime: 10, notifiedEvents 포함, 드래그 중                                   | 빨간색 배경 + 투명도 0.5  | 빨간색 스타일 유지하며 투명도만 적용         | 드래그 중 스타일 조합 |
| 반복 일정 드래그 후 다이얼로그  | repeat: {type: "weekly"}, Repeat 아이콘 표시                                           | Repeat 아이콘 표시        | RecurringEventDialog 표시, 아이콘 유지       | 반복 일정 처리 플로우 |
| 알림 설정 안 된 일반 일정       | title: "일반 회의", notificationTime: 0, notifiedEvents에 없음                         | 아이콘 없음               | 일반 스타일 유지                             | 아이콘 없는 경우      |

## 기술 참고사항

### 관련 타입

```typescript
interface Event {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  description: string;
  location: string;
  category: string;
  repeat: RepeatInfo;
  notificationTime: number; // 0: 알림 없음, 1-60: 분 단위
}

interface RepeatInfo {
  type: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  endDate?: string;
}
```

### 알림 상태 확인

```typescript
// notifiedEvents는 알림이 실제로 발송된 이벤트들의 Set
const isNotified = notifiedEvents.has(event.id);
```

### 반복 일정 확인

```typescript
const isRecurring = event.repeat.type !== 'none' && event.repeat.interval > 0;
```

### 스타일 요구사항

**알림이 설정된 일정**:

```css
background-color: #ffebee;
color: #d32f2f;
```

**드래그 중인 알림 일정**:

```css
background-color: #ffebee;
color: #d32f2f;
opacity: 0.5;
```

**아이콘 렌더링**:

- Notifications 아이콘: `notificationTime > 0` 일 때 표시
- Repeat 아이콘: `repeat.type !== 'none'` 일 때 표시

## 구현 참고사항

### 일정 박스 렌더링

일정 박스 렌더링 시 아이콘과 스타일을 함께 적용:

```typescript
const renderEventBox = (event: Event) => {
  const isNotified = notifiedEvents.has(event.id);
  const isRecurring = event.repeat.type !== 'none';
  const isDragging = dragState.draggedEvent?.id === event.id;

  return (
    <Box
      key={event.id}
      draggable
      onDragStart={() => handleDragStart(event)}
      onDragEnd={handleDragEnd}
      sx={{
        opacity: isDragging ? 0.5 : 1,
        cursor: 'grab',
        backgroundColor: isNotified ? '#ffebee' : 'white',
        color: isNotified ? '#d32f2f' : 'inherit',
        // ... 기타 스타일
      }}
    >
      <Box display="flex" alignItems="center" gap={1}>
        {event.title}
        {event.notificationTime > 0 && <Notifications fontSize="small" />}
        {isRecurring && <Repeat fontSize="small" />}
      </Box>
    </Box>
  );
};
```

### useDragAndDrop 훅

드래그 앤 드롭 로직은 아이콘 상태와 무관하게 동일하게 동작:

- `handleDragStart`: 이벤트 전체를 드래그 상태로 저장
- `handleDrop`: 이벤트의 모든 속성을 유지하고 날짜만 변경

### 드롭 후 상태 유지

드롭 시 `notificationTime`과 `repeat` 속성이 변경되지 않도록 보장:

```typescript
const handleDrop = async (targetDate: string) => {
  // ...
  const updatedEvent = {
    ...draggedEvent, // 모든 속성 유지
    date: targetDate, // 날짜만 변경
  };

  await saveEvent(updatedEvent);
};
```

## 예상 작업 시간

1시간

## 의존성

- Story 1 (드래그 시작 및 시각적 피드백) 완료 필요
- Story 2 (일반 일정 드롭) 완료 필요
- Story 3 (반복 일정 드롭) 완료 필요
- 알림 및 반복 아이콘 렌더링 로직이 이미 구현되어 있어야 함
- `notifiedEvents` 상태 관리 로직이 이미 구현되어 있어야 함
