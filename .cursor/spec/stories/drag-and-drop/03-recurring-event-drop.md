---
epic: drag-and-drop
test_suite: 반복 일정 드롭
---

# Story 3: 반복 일정 드롭

## 개요

반복 일정을 드래그 앤 드롭할 때 RecurringEventDialog를 표시하고, 단일/전체 수정을 선택하여 처리하는 기능을 검증합니다.

## Epic 연결

- **Epic**: 드래그 앤 드롭(D&D) 일정 이동 기능
- **Epic 파일**: `.cursor/spec/epics/drag-and-drop.md`
- **검증 포인트**: Epic의 "예상 동작" 섹션 4번(반복 일정 드롭)에서 추출
- **우선순위**: 중간 (일반적인 케이스)

## 테스트 구조 및 범위

이 Story가 작성될 테스트 코드의 논리적 계층 구조를 명시합니다.

- **테스트 스위트 (Describe Block):** '반복 일정 드롭'
  - **테스트 케이스 1:** '반복 일정을 드롭하면 RecurringEventDialog가 열린다'
  - **테스트 케이스 2:** 'RecurringEventDialog가 mode="edit"로 열린다'
  - **테스트 케이스 3:** '다이얼로그에 "이 일정만 수정"과 "모든 일정 수정" 버튼이 표시된다'
  - **테스트 케이스 4:** '"이 일정만 수정"을 선택하면 handleRecurringEdit(event, true)가 호출된다'
  - **테스트 케이스 5:** '"모든 일정 수정"을 선택하면 handleRecurringEdit(event, false)가 호출된다'
  - **테스트 케이스 6:** '단일 수정 시 해당 일정만 날짜가 변경된다'
  - **테스트 케이스 7:** '전체 수정 시 모든 반복 일정의 날짜가 변경된다'

## 검증 포인트 (Given-When-Then)

### 검증 포인트 1: RecurringEventDialog 표시

```
Given: 2025-11-01의 "매주 회의" 반복 일정 (repeat.type: "weekly", repeat.interval: 1)
When: 해당 일정을 2025-11-08 날짜 셀에 드롭
Then: RecurringEventDialog가 mode="edit"로 열림
And: "이 일정만 수정" 버튼과 "모든 일정 수정" 버튼이 표시됨
```

### 검증 포인트 2: 단일 수정

```
Given: RecurringEventDialog에서 "이 일정만 수정" 선택
When: 확인 버튼 클릭
Then: handleRecurringEdit(event, true)가 호출됨
And: 단일 일정만 날짜가 변경됨
```

### 검증 포인트 3: 전체 수정

```
Given: RecurringEventDialog에서 "모든 일정 수정" 선택
When: 확인 버튼 클릭
Then: handleRecurringEdit(event, false)가 호출됨
And: 모든 반복 일정의 날짜가 변경됨
```

## 테스트 데이터

| 시나리오              | 일정 데이터                                                                                         | 드롭 날짜  | 선택 옵션      | 예상 동작                          | 비고      |
| --------------------- | --------------------------------------------------------------------------------------------------- | ---------- | -------------- | ---------------------------------- | --------- |
| 주간 반복 일정 - 단일 | id: "event-rec-1", title: "매주 회의", date: "2025-10-01", repeat: {type: "weekly", interval: 1}    | 2025-10-08 | 이 일정만 수정 | event-rec-1만 2025-10-08로 변경    | 단일 수정 |
| 주간 반복 일정 - 전체 | id: "event-rec-1", title: "매주 회의", date: "2025-10-01", repeat: {type: "weekly", interval: 1}    | 2025-10-08 | 모든 일정 수정 | 모든 반복 일정의 날짜가 7일씩 이동 | 전체 수정 |
| 월간 반복 일정        | id: "event-rec-2", title: "월간 보고", date: "2025-10-01", repeat: {type: "monthly", interval: 1}   | 2025-10-10 | 이 일정만 수정 | event-rec-2만 2025-10-10로 변경    | 월간 반복 |
| 매일 반복 일정        | id: "event-rec-3", title: "일일 스탠드업", date: "2025-10-01", repeat: {type: "daily", interval: 1} | 2025-10-02 | 모든 일정 수정 | 모든 반복 일정의 날짜가 1일씩 이동 | 매일 반복 |
| 연간 반복 일정        | id: "event-rec-4", title: "연례 행사", date: "2025-10-01", repeat: {type: "yearly", interval: 1}    | 2025-10-15 | 이 일정만 수정 | event-rec-4만 2025-10-15로 변경    | 연간 반복 |

## 기술 참고사항

### 관련 타입

```typescript
interface RepeatInfo {
  type: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  endDate?: string;
}

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
  notificationTime: number;
}
```

### 반복 일정 판단

기존 함수 활용:

```typescript
const isRecurringEvent = (repeat: RepeatInfo) => {
  return repeat.type !== 'none' && repeat.interval > 0;
};
```

### RecurringEventDialog Props

```typescript
interface RecurringEventDialogProps {
  open: boolean;
  mode: 'edit' | 'delete';
  onClose: () => void;
  onConfirm: (isSingleEdit: boolean) => void;
}
```

## 구현 참고사항

### useDragAndDrop 훅 수정

`handleDrop` 함수에서 반복 일정 판단 로직 추가:

```typescript
const handleDrop = async (targetDate: string) => {
  if (!draggedEvent || sourceDate === targetDate) return;

  // 반복 일정인지 확인
  if (isRecurringEvent(draggedEvent.repeat)) {
    // RecurringEventDialog를 열기 위한 콜백 호출
    onRecurringEvent?.(draggedEvent, targetDate);
    return;
  }

  // 일반 일정 처리
  // ...
};
```

### App.tsx 통합 포인트

- `useDragAndDrop` 훅에 `onRecurringEvent` 콜백 전달
- 콜백에서 `setPendingRecurringEdit`, `setRecurringDialogMode`, `setIsRecurringDialogOpen` 호출
- `handleRecurringEdit` 함수를 활용하여 단일/전체 수정 처리
- 타겟 날짜 정보를 상태로 관리하여 다이얼로그 확인 시 사용

### handleRecurringEdit 연동

기존 `handleRecurringEdit` 함수를 활용하되, 날짜 변경 로직 추가:

```typescript
const handleRecurringEditWithDrag = async (
  event: Event,
  isSingleEdit: boolean,
  targetDate: string
) => {
  const updatedEvent = {
    ...event,
    date: targetDate,
  };

  await handleRecurringEdit(updatedEvent, isSingleEdit);
  setIsRecurringDialogOpen(false);
};
```

## 예상 작업 시간

1-2시간

## 의존성

- Story 1 (드래그 시작 및 시각적 피드백) 완료 필요
- Story 2 (일반 일정 드롭) 완료 필요
- 기존 `isRecurringEvent` 함수 활용
- 기존 `handleRecurringEdit` 함수 활용
- 기존 `RecurringEventDialog` 컴포넌트 활용
