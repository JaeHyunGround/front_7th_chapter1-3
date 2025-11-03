---
epic: drag-and-drop
test_suite: 드래그 취소
---

# Story 8: 드래그 취소

## 개요

드래그 중 ESC 키를 누르거나 캘린더 외부 영역에 드롭할 때 드래그가 취소되고 일정이 원래 위치로 돌아가는 기능을 검증합니다.

## Epic 연결

- **Epic**: 드래그 앤 드롭(D&D) 일정 이동 기능
- **Epic 파일**: `.cursor/spec/epics/drag-and-drop.md`
- **검증 포인트**: Epic의 "예상 동작" 섹션 6번(드래그 취소)에서 추출
- **우선순위**: 낮음 (에지 케이스와 오류 처리)

## 테스트 구조 및 범위

이 Story가 작성될 테스트 코드의 논리적 계층 구조를 명시합니다.

- **테스트 스위트 (Describe Block):** '드래그 취소'
  - **테스트 케이스 1:** 'ESC 키를 누르면 드래그가 취소된다'
  - **테스트 케이스 2:** 'ESC 키로 취소 시 일정이 원래 위치에 유지된다'
  - **테스트 케이스 3:** 'ESC 키로 취소 시 시각적 피드백이 제거된다'
  - **테스트 케이스 4:** '캘린더 외부 영역에 드롭하면 드래그가 취소된다'
  - **테스트 케이스 5:** '캘린더 외부 드롭 시 일정이 원래 위치에 유지된다'
  - **테스트 케이스 6:** '드래그 취소 시 API가 호출되지 않는다'
  - **테스트 케이스 7:** '드래그 취소 후 드래그 상태가 초기화된다'

## 검증 포인트 (Given-When-Then)

### 검증 포인트 1: ESC 키로 드래그 취소

```
Given: 2025-11-01의 "팀 회의" 일정을 드래그 중
When: ESC 키를 누름
Then: 드래그가 취소됨
And: 일정이 원래 위치(2025-11-01)에 유지됨
And: 시각적 피드백이 제거됨
```

### 검증 포인트 2: 캘린더 외부 드롭

```
Given: 2025-11-01의 "팀 회의" 일정을 드래그 중
When: 캘린더 외부 영역에 드롭
Then: 드래그가 취소됨
And: 일정이 원래 위치(2025-11-01)에 유지됨
```

## 테스트 데이터

| 시나리오                      | 일정 데이터                                                      | 취소 방법      | 드래그 상태 | 예상 결과                                      | 비고                |
| ----------------------------- | ---------------------------------------------------------------- | -------------- | ----------- | ---------------------------------------------- | ------------------- |
| ESC 키 취소                   | title: "팀 회의", date: "2025-10-01"                             | ESC 키         | 드래그 중   | date: "2025-10-01" 유지, API 호출 없음         | 키보드 취소         |
| 캘린더 외부 드롭              | title: "팀 회의", date: "2025-10-01"                             | 외부 영역 드롭 | 드래그 중   | date: "2025-10-01" 유지, API 호출 없음         | 마우스 취소         |
| ESC - 시각적 피드백 제거      | title: "팀 회의", date: "2025-10-01", opacity: 0.5               | ESC 키         | 드래그 중   | opacity: 1, data-dragging 속성 제거            | 스타일 복원         |
| ESC - 타겟 셀 하이라이트 제거 | 드래그 중, 타겟 셀 배경색 #e3f2fd                                | ESC 키         | 드래그 중   | 타겟 셀 배경색 원래대로 복원                   | 타겟 셀 스타일 복원 |
| 외부 드롭 - 상태 초기화       | title: "팀 회의", dragState.isDragging: true                     | 외부 영역 드롭 | 드래그 중   | dragState 초기화됨                             | 드래그 상태 초기화  |
| 월간 뷰 ESC 취소              | 월간 뷰, title: "팀 회의", date: "2025-10-01"                    | ESC 키         | 드래그 중   | 월간 뷰에서 원래 위치 유지                     | 월간 뷰 취소        |
| 주간 뷰 ESC 취소              | 주간 뷰, title: "팀 회의", date: "2025-10-01"                    | ESC 키         | 드래그 중   | 주간 뷰에서 원래 위치 유지                     | 주간 뷰 취소        |
| 반복 일정 ESC 취소            | title: "매주 회의", repeat: {type: "weekly"}, date: "2025-10-01" | ESC 키         | 드래그 중   | date: "2025-10-01" 유지, 다이얼로그 표시 안 됨 | 반복 일정 취소      |

## 기술 참고사항

### 관련 타입

```typescript
interface DragState {
  isDragging: boolean;
  draggedEvent: Event | null;
  sourceDate: string | null;
  targetDate: string | null;
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

### 키보드 이벤트

ESC 키 감지:

```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && dragState.isDragging) {
      handleDragCancel();
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [dragState.isDragging]);
```

### 캘린더 외부 영역 감지

드롭 이벤트에서 타겟이 유효한 날짜 셀인지 확인:

```typescript
const handleDrop = (e: DragEvent, targetDate?: string) => {
  if (!targetDate) {
    // 유효한 날짜 셀이 아닌 경우 취소
    handleDragCancel();
    return;
  }

  // 정상 드롭 처리
  // ...
};
```

## 구현 참고사항

### useDragAndDrop 훅

`handleDragCancel` 함수 추가:

```typescript
const handleDragCancel = () => {
  setDragState({
    isDragging: false,
    draggedEvent: null,
    sourceDate: null,
    targetDate: null,
  });
};
```

`handleDragEnd` 함수 수정:

```typescript
const handleDragEnd = () => {
  // 드래그 종료 시 자동으로 상태 초기화
  handleDragCancel();
};
```

### ESC 키 핸들러

App.tsx 또는 useDragAndDrop 훅에서 ESC 키 이벤트 리스너 추가:

```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && dragState.isDragging) {
      handleDragCancel();
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [dragState.isDragging]);
```

### 캘린더 외부 드롭 처리

날짜 셀이 아닌 영역에 드롭될 때 `onDrop` 핸들러가 호출되지 않도록 설정:

```typescript
// 날짜 셀에만 드롭 핸들러 추가
<TableCell
  onDragOver={(e) => {
    e.preventDefault(); // 드롭 가능하도록 설정
    handleDragOver(dateString);
  }}
  onDrop={() => handleDrop(dateString)}
>
  {/* 셀 내용 */}
</TableCell>

// 캘린더 외부에는 드롭 핸들러가 없으므로
// onDragEnd가 호출되어 자동으로 취소됨
```

### 시각적 피드백 제거

드래그 취소 시 모든 시각적 피드백 제거:

- 드래그 중인 일정의 투명도 복원 (opacity: 1)
- `data-dragging` 속성 제거
- 타겟 셀의 배경색 복원
- `data-droppable` 속성 제거

## 예상 작업 시간

1-2시간

## 의존성

- Story 1 (드래그 시작 및 시각적 피드백) 완료 필요
- Story 2 (일반 일정 드롭) 완료 필요
