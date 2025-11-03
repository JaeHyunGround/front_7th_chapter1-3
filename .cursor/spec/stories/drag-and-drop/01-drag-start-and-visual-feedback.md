---
epic: drag-and-drop
test_suite: 드래그 시작 및 시각적 피드백
---

# Story 1: 드래그 시작 및 시각적 피드백

## 개요

일정 박스의 드래그 시작과 드래그 중 시각적 피드백을 검증합니다.

## Epic 연결

- **Epic**: 드래그 앤 드롭(D&D) 일정 이동 기능
- **Epic 파일**: `.cursor/spec/epics/drag-and-drop.md`
- **검증 포인트**: Epic의 "예상 동작" 섹션 1번(드래그 시작), 2번(드래그 중 피드백)에서 추출
- **우선순위**: 높음 (필수 동작)

## 테스트 구조 및 범위

이 Story가 작성될 테스트 코드의 논리적 계층 구조를 명시합니다.

- **테스트 스위트 (Describe Block):** '드래그 시작 및 시각적 피드백'
  - **테스트 케이스 1:** '일정 박스에 마우스를 올리면 grab 커서가 표시된다'
  - **테스트 케이스 2:** '일정 박스를 드래그하면 투명도가 0.5로 변경된다'
  - **테스트 케이스 3:** '일정 박스를 드래그하면 data-dragging 속성이 추가된다'
  - **테스트 케이스 4:** '드롭 가능한 날짜 셀 위로 마우스를 이동하면 배경색이 변경된다'
  - **테스트 케이스 5:** '드롭 가능한 날짜 셀에 data-droppable 속성이 추가된다'
  - **테스트 케이스 6:** '캘린더 외부 영역으로 마우스를 이동하면 not-allowed 커서가 표시된다'

## 검증 포인트 (Given-When-Then)

### 검증 포인트 1: 드래그 가능 커서 표시

```
Given: 캘린더 월간 뷰에 2025-11-01의 "팀 회의" 일정이 존재
When: "팀 회의" 일정 박스에 마우스를 올림
Then: 커서가 'grab'으로 변경됨
```

### 검증 포인트 2: 드래그 시작 - 투명도 변경

```
Given: 캘린더 월간 뷰에 2025-11-01의 "팀 회의" 일정이 존재
When: "팀 회의" 일정 박스를 클릭하고 드래그 시작
Then: 일정 박스의 투명도가 0.5로 변경됨
```

### 검증 포인트 3: 드래그 시작 - 속성 추가

```
Given: 캘린더 월간 뷰에 2025-11-01의 "팀 회의" 일정이 존재
When: "팀 회의" 일정 박스를 클릭하고 드래그 시작
Then: 드래그 중임을 나타내는 data-dragging="true" 속성이 추가됨
```

### 검증 포인트 4: 드롭 가능 영역 배경색 변경

```
Given: 2025-11-01의 "팀 회의" 일정을 드래그 중
When: 마우스를 2025-11-03 날짜 셀 위로 이동
Then: 2025-11-03 셀의 배경색이 #e3f2fd로 변경됨
```

### 검증 포인트 5: 드롭 가능 속성 추가

```
Given: 2025-11-01의 "팀 회의" 일정을 드래그 중
When: 마우스를 2025-11-03 날짜 셀 위로 이동
Then: data-droppable="true" 속성이 해당 셀에 추가됨
```

### 검증 포인트 6: 드롭 불가능 영역 커서 표시

```
Given: 2025-11-01의 "팀 회의" 일정을 드래그 중
When: 마우스를 캘린더 외부 영역으로 이동
Then: 커서가 'not-allowed'로 변경됨
```

## 테스트 데이터

| 시나리오             | 일정 데이터                          | 예상 결과                 | 비고                   |
| -------------------- | ------------------------------------ | ------------------------- | ---------------------- |
| 드래그 가능 커서     | title: "팀 회의", date: "2025-11-01" | cursor: grab              | hover 상태             |
| 드래그 시작 - 투명도 | title: "팀 회의", date: "2025-11-01" | opacity: 0.5              | dragStart 이벤트       |
| 드래그 시작 - 속성   | title: "팀 회의", date: "2025-11-01" | data-dragging="true"      | dragStart 이벤트       |
| 드롭 가능 영역 배경  | 드래그 중, target: "2025-11-03"      | background-color: #e3f2fd | dragOver 이벤트        |
| 드롭 가능 영역 속성  | 드래그 중, target: "2025-11-03"      | data-droppable="true"     | dragOver 이벤트        |
| 드롭 불가능 영역     | 드래그 중, target: 캘린더 외부       | cursor: not-allowed       | dragOver 이벤트 (외부) |

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
  date: string; // YYYY-MM-DD 형식
  startTime: string;
  endTime: string;
  description: string;
  location: string;
  category: string;
  repeat: RepeatInfo;
  notificationTime: number;
}
```

### 스타일 요구사항

**드래그 가능한 일정 박스 (hover)**:

```css
cursor: grab;
```

**드래그 중인 일정 박스**:

```css
opacity: 0.5;
cursor: grabbing;
```

**드롭 가능 영역 (날짜 셀)**:

```css
background-color: #e3f2fd;
border: 2px dashed #1976d2;
```

### HTML 드래그 앤 드롭 API

- 일정 박스에 `draggable="true"` 속성 추가
- `onDragStart` 이벤트 핸들러 구현
- `onDragOver` 이벤트 핸들러 구현
- `event.dataTransfer` 사용

### 접근성 요구사항

- `aria-grabbed="true"` 속성을 사용하여 드래그 상태 표시

## 구현 참고사항

### useDragAndDrop 훅

이 Story는 `useDragAndDrop` 훅의 기본 구조와 다음 함수들을 포함합니다:

- `handleDragStart(event: Event)`: 드래그 시작 시 상태 업데이트
- `handleDragOver(date: string)`: 드래그 중 타겟 날짜 업데이트
- `handleDragEnd()`: 드래그 종료 시 상태 초기화

### App.tsx 통합 포인트

- 일정 박스에 `draggable` 속성 추가
- 일정 박스에 `onDragStart`, `onDragEnd` 핸들러 추가
- 날짜 셀에 `onDragOver` 핸들러 추가
- `dragState`에 따른 조건부 스타일 적용

## 예상 작업 시간

1-2시간

## 의존성

없음 (첫 번째 Story)
