---
epic: drag-and-drop
test_suite: 일정 겹침 감지
---

# Story 4: 일정 겹침 감지

## 개요

드롭한 날짜에 동일한 시간대의 다른 일정이 있을 때 일정 겹침 경고 다이얼로그를 표시하고, 사용자 선택에 따라 처리하는 기능을 검증합니다.

## Epic 연결

- **Epic**: 드래그 앤 드롭(D&D) 일정 이동 기능
- **Epic 파일**: `.cursor/spec/epics/drag-and-drop.md`
- **검증 포인트**: Epic의 "예상 동작" 섹션 5번(일정 겹침 감지)에서 추출
- **우선순위**: 중간 (일반적인 케이스)

## 테스트 구조 및 범위

이 Story가 작성될 테스트 코드의 논리적 계층 구조를 명시합니다.

- **테스트 스위트 (Describe Block):** '일정 겹침 감지'
  - **테스트 케이스 1:** '겹치는 시간대의 일정이 있으면 경고 다이얼로그가 표시된다'
  - **테스트 케이스 2:** '다이얼로그에 겹치는 일정 정보가 표시된다'
  - **테스트 케이스 3:** '겹침 다이얼로그에서 "취소"를 선택하면 일정이 원래 날짜에 유지된다'
  - **테스트 케이스 4:** '겹침 다이얼로그에서 "취소"를 선택하면 API가 호출되지 않는다'
  - **테스트 케이스 5:** '겹침 다이얼로그에서 "계속 진행"을 선택하면 API가 호출된다'
  - **테스트 케이스 6:** '겹침 다이얼로그에서 "계속 진행"을 선택하면 일정이 새 날짜로 이동된다'
  - **테스트 케이스 7:** '겹치지 않는 경우 다이얼로그 없이 바로 이동된다'

## 검증 포인트 (Given-When-Then)

### 검증 포인트 1: 겹침 감지 및 다이얼로그 표시

```
Given: 2025-10-03 10:00-11:00에 "기존 회의" 일정이 존재
And: 2025-10-01 10:00-11:00에 "새 회의" 일정이 존재
When: "새 회의"를 2025-10-03로 드래그 앤 드롭
Then: 일정 겹침 경고 다이얼로그가 표시됨
And: 다이얼로그에 "기존 회의 (2025-10-03 10:00-11:00)" 정보가 표시됨
```

### 검증 포인트 2: 취소 선택

```
Given: 일정 겹침 경고 다이얼로그가 열린 상태
When: "취소" 버튼 클릭
Then: 다이얼로그가 닫힘
And: API 요청이 전송되지 않음
And: 일정이 원래 날짜(2025-10-01)에 유지됨
```

### 검증 포인트 3: 계속 진행 선택

```
Given: 일정 겹침 경고 다이얼로그가 열린 상태
When: "계속 진행" 버튼 클릭
Then: API 요청이 전송됨
And: 일정이 새 날짜(2025-10-03)로 이동됨
```

## 테스트 데이터

| 시나리오              | 기존 일정                                                   | 드래그 일정                                               | 드롭 날짜  | 겹침 여부 | 사용자 선택 | 예상 결과                              | 비고               |
| --------------------- | ----------------------------------------------------------- | --------------------------------------------------------- | ---------- | --------- | ----------- | -------------------------------------- | ------------------ |
| 완전 겹침             | title: "기존 회의", date: "2025-10-03", time: "10:00-11:00" | title: "새 회의", date: "2025-10-01", time: "10:00-11:00" | 2025-10-03 | O         | 취소        | 일정 유지 (2025-10-01)                 | 정확히 동일한 시간 |
| 완전 겹침             | title: "기존 회의", date: "2025-10-03", time: "10:00-11:00" | title: "새 회의", date: "2025-10-01", time: "10:00-11:00" | 2025-10-03 | O         | 계속 진행   | 일정 이동 (2025-10-03)                 | 강제 이동          |
| 부분 겹침 (시작 시간) | title: "기존 회의", date: "2025-10-03", time: "10:00-11:00" | title: "새 회의", date: "2025-10-01", time: "10:30-11:30" | 2025-10-03 | O         | 취소        | 일정 유지 (2025-10-01)                 | 30분 겹침          |
| 부분 겹침 (종료 시간) | title: "기존 회의", date: "2025-10-03", time: "10:00-11:00" | title: "새 회의", date: "2025-10-01", time: "09:30-10:30" | 2025-10-03 | O         | 계속 진행   | 일정 이동 (2025-10-03)                 | 30분 겹침          |
| 겹침 없음 (이전 시간) | title: "기존 회의", date: "2025-10-03", time: "10:00-11:00" | title: "새 회의", date: "2025-10-01", time: "09:00-10:00" | 2025-10-03 | X         | N/A         | 다이얼로그 없이 바로 이동 (2025-10-03) | 직전 시간          |
| 겹침 없음 (이후 시간) | title: "기존 회의", date: "2025-10-03", time: "10:00-11:00" | title: "새 회의", date: "2025-10-01", time: "11:00-12:00" | 2025-10-03 | X         | N/A         | 다이얼로그 없이 바로 이동 (2025-10-03) | 직후 시간          |
| 완전 포함             | title: "기존 회의", date: "2025-10-03", time: "10:00-12:00" | title: "새 회의", date: "2025-10-01", time: "10:30-11:30" | 2025-10-03 | O         | 취소        | 일정 유지 (2025-10-01)                 | 새 일정이 내부     |
| 다중 겹침             | 2개 일정: "회의 A" (10:00-11:00), "회의 B" (11:00-12:00)    | title: "새 회의", date: "2025-10-01", time: "10:30-11:30" | 2025-10-03 | O         | 계속 진행   | 일정 이동 (2025-10-03)                 | 2개 일정과 겹침    |

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
  notificationTime: number;
}
```

### 겹침 감지 로직

기존 함수 활용:

```typescript
const findOverlappingEvents = (newEvent: Event | EventForm, events: Event[]): Event[] => {
  // 동일한 날짜에서 시간대가 겹치는 일정들을 찾음
  return events.filter((event) => {
    if (event.id === newEvent.id) return false; // 자기 자신 제외
    if (event.date !== newEvent.date) return false;

    const newStart = parseDateTime(newEvent.date, newEvent.startTime);
    const newEnd = parseDateTime(newEvent.date, newEvent.endTime);
    const existingStart = parseDateTime(event.date, event.startTime);
    const existingEnd = parseDateTime(event.date, event.endTime);

    // 시간대 겹침 체크
    return newStart < existingEnd && newEnd > existingStart;
  });
};
```

### 겹침 다이얼로그

기존 상태 활용:

- `isOverlapDialogOpen`: 다이얼로그 열림 상태
- `overlappingEvents`: 겹치는 일정 목록

## 구현 참고사항

### useDragAndDrop 훅 수정

`handleDrop` 함수에서 겹침 감지 로직 추가:

```typescript
const handleDrop = async (targetDate: string) => {
  if (!draggedEvent || sourceDate === targetDate) return;

  // 날짜 변경된 임시 이벤트 생성
  const updatedEvent = {
    ...draggedEvent,
    date: targetDate,
  };

  // 겹침 감지
  const overlapping = findOverlappingEvents(updatedEvent, events);

  if (overlapping.length > 0) {
    // 겹침 다이얼로그 표시
    onOverlapDetected?.(updatedEvent, overlapping);
    return;
  }

  // 겹침 없으면 바로 저장
  await saveEvent(updatedEvent);
};
```

### App.tsx 통합 포인트

- `useDragAndDrop` 훅에 `onOverlapDetected` 콜백 전달
- 콜백에서 `setOverlappingEvents`, `setIsOverlapDialogOpen` 호출
- 겹침 다이얼로그의 "계속 진행" 버튼에서 드롭 처리 완료
- 겹침 다이얼로그의 "취소" 버튼에서 드래그 상태 초기화

### 겹침 다이얼로그 처리 흐름

1. 사용자가 일정을 드롭
2. `findOverlappingEvents`로 겹침 감지
3. 겹침 있으면 → 다이얼로그 표시, 임시 이벤트 저장
4. "취소" 클릭 → 다이얼로그 닫기, 드래그 상태 초기화
5. "계속 진행" 클릭 → API 호출, 일정 저장, 다이얼로그 닫기

## 예상 작업 시간

1-2시간

## 의존성

- Story 1 (드래그 시작 및 시각적 피드백) 완료 필요
- Story 2 (일반 일정 드롭) 완료 필요
- 기존 `findOverlappingEvents` 함수 활용
- 기존 겹침 다이얼로그 UI 활용
