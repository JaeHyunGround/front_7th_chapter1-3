---
epic: drag-and-drop
test_suite: 주간 뷰 드래그 앤 드롭
---

# Story 5: 주간 뷰 드래그 앤 드롭

## 개요

주간 뷰에서 월간 뷰와 동일하게 드래그 앤 드롭 기능이 동작하는지 검증합니다.

## Epic 연결

- **Epic**: 드래그 앤 드롭(D&D) 일정 이동 기능
- **Epic 파일**: `.cursor/spec/epics/drag-and-drop.md`
- **검증 포인트**: Epic의 "예상 동작" 섹션 8번(주간 뷰 드래그 앤 드롭)에서 추출
- **우선순위**: 중간 (일반적인 케이스)

## 테스트 구조 및 범위

이 Story가 작성될 테스트 코드의 논리적 계층 구조를 명시합니다.

- **테스트 스위트 (Describe Block):** '주간 뷰 드래그 앤 드롭'
  - **테스트 케이스 1:** '주간 뷰에서 일정을 드래그할 수 있다'
  - **테스트 케이스 2:** '주간 뷰에서 일정을 다른 날짜로 드롭할 수 있다'
  - **테스트 케이스 3:** '주간 뷰에서 드롭 시 날짜가 정확히 변경된다'
  - **테스트 케이스 4:** '주간 뷰에서 드롭 시 API가 정상적으로 호출된다'
  - **테스트 케이스 5:** '주간 뷰에서 드래그 중 시각적 피드백이 표시된다'
  - **테스트 케이스 6:** '주간 뷰와 월간 뷰를 전환해도 드래그 상태가 유지된다'

## 검증 포인트 (Given-When-Then)

### 검증 포인트 1: 주간 뷰 드래그 앤 드롭

```
Given: 주간 뷰로 전환됨
And: 2025-10-01(수요일)에 "팀 회의" 일정이 존재
When: "팀 회의"를 2025-10-03(금요일) 셀로 드래그 앤 드롭
Then: 일정의 날짜가 2025-10-03로 변경됨
And: API 요청이 정상적으로 전송됨
```

## 테스트 데이터

| 시나리오              | 뷰 타입 | 일정 데이터                                                      | 시작 날짜  | 드롭 날짜  | 예상 결과                          | 비고                |
| --------------------- | ------- | ---------------------------------------------------------------- | ---------- | ---------- | ---------------------------------- | ------------------- |
| 주간 뷰 기본 드롭     | 주간    | title: "팀 회의", date: "2025-10-01", startTime: "10:00"         | 2025-10-01 | 2025-10-03 | date: "2025-10-03", API 호출       | 수요일 → 금요일     |
| 주간 뷰 당일 드롭     | 주간    | title: "회의", date: "2025-10-01"                                | 2025-10-01 | 2025-10-01 | API 호출 없음                      | 동일 날짜           |
| 주간 뷰 다음 주       | 주간    | title: "프로젝트 리뷰", date: "2025-10-01"                       | 2025-10-01 | 2025-10-08 | date: "2025-10-08", API 호출       | 다음 주 수요일      |
| 주간 뷰 시각적 피드백 | 주간    | title: "팀 회의", date: "2025-10-01"                             | 드래그 중  | N/A        | opacity: 0.5, 드롭 영역 하이라이트 | 드래그 중 상태      |
| 주간 뷰 반복 일정     | 주간    | title: "매주 회의", date: "2025-10-01", repeat: {type: "weekly"} | 2025-10-01 | 2025-10-03 | RecurringEventDialog 표시          | 반복 일정 처리      |
| 주간 뷰 겹침 감지     | 주간    | 2개 일정, 동일 시간대                                            | 2025-10-01 | 2025-10-03 | 겹침 경고 다이얼로그 표시          | 겹침 처리           |
| 뷰 전환 후 드래그     | 주간    | title: "팀 회의", date: "2025-10-01"                             | 2025-10-01 | 2025-10-03 | date: "2025-10-03", API 호출       | 월간 → 주간 전환 후 |

## 기술 참고사항

### 관련 타입

```typescript
type ViewType = 'week' | 'month';

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

### 주간 뷰 날짜 셀 구조

주간 뷰의 날짜 셀도 월간 뷰와 동일한 구조를 가져야 합니다:

- `onDragOver` 핸들러 추가
- `onDrop` 핸들러 추가
- 드래그 상태에 따른 스타일 적용

### 뷰 타입 상태

현재 뷰 타입을 관리하는 상태:

```typescript
const [view, setView] = useState<'week' | 'month'>('month');
```

## 구현 참고사항

### 주간 뷰 렌더링 로직

주간 뷰 렌더링 시 월간 뷰와 동일한 드래그 앤 드롭 핸들러를 적용합니다:

```typescript
// 월간 뷰와 주간 뷰에서 공통으로 사용하는 일정 박스 렌더링
const renderEventBox = (event: Event) => (
  <Box
    key={event.id}
    draggable
    onDragStart={() => handleDragStart(event)}
    onDragEnd={handleDragEnd}
    sx={{
      opacity: dragState.draggedEvent?.id === event.id ? 0.5 : 1,
      cursor: 'grab',
      // ... 기타 스타일
    }}
  >
    {/* 일정 내용 */}
  </Box>
);

// 월간 뷰와 주간 뷰에서 공통으로 사용하는 날짜 셀 렌더링
const renderDateCell = (dateString: string) => (
  <TableCell
    onDragOver={(e) => {
      e.preventDefault();
      handleDragOver(dateString);
    }}
    onDrop={() => handleDrop(dateString)}
    sx={{
      backgroundColor: dragState.targetDate === dateString ? '#e3f2fd' : 'transparent',
      // ... 기타 스타일
    }}
  >
    {/* 셀 내용 */}
  </TableCell>
);
```

### useDragAndDrop 훅 뷰 독립성

`useDragAndDrop` 훅은 뷰 타입에 독립적으로 동작해야 합니다:

- 날짜 문자열(YYYY-MM-DD)만 사용하여 뷰와 무관하게 동작
- 월간/주간 뷰 모두에서 동일한 훅 인스턴스 사용

### App.tsx 통합 포인트

- 주간 뷰 렌더링 함수에 드래그 앤 드롭 핸들러 추가
- 월간 뷰와 주간 뷰에서 동일한 `useDragAndDrop` 훅 사용
- 뷰 전환 시에도 드래그 상태가 초기화되지 않도록 주의

## 예상 작업 시간

1-2시간

## 의존성

- Story 1 (드래그 시작 및 시각적 피드백) 완료 필요
- Story 2 (일반 일정 드롭) 완료 필요
- Story 3 (반복 일정 드롭) 완료 필요
- Story 4 (일정 겹침 감지) 완료 필요
- 주간 뷰 UI가 이미 구현되어 있어야 함
