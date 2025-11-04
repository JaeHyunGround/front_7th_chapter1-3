---
epic: date-click-to-create
test_suite: 드래그 앤 드롭과의 충돌 방지
---

# Story: 드래그 앤 드롭과의 충돌 방지

## 개요

드래그 앤 드롭 중에는 날짜 셀 클릭이 동작하지 않도록 하여 드래그 앤 드롭 기능과 충돌하지 않는 기능을 검증합니다.

## Epic 연결

- **Epic**: 날짜 클릭으로 일정 생성 기능
- **Epic 파일**: `.cursor/spec/epics/date-click-to-create.md`
- **검증 포인트**: Epic의 "예상 동작" 섹션 6번에서 추출

## 테스트 구조 및 범위

이 Story가 작성될 테스트 코드의 논리적 계층 구조를 명시합니다.

- **테스트 스위트 (Describe Block):** '드래그 앤 드롭과의 충돌 방지'
  - **테스트 케이스 1:** 'should not fill date field when dragging event over empty cell'
  - **테스트 케이스 2:** 'should not fill date field when dropping event on empty cell'
  - **테스트 케이스 3:** 'should distinguish between drag and click by mouse movement'

## 검증 포인트 (Given-When-Then)

Epic에서 가져온 모든 검증 포인트를 명시합니다.

### 검증 포인트 1: 드래그 중 날짜 셀 클릭 무시

\`\`\`
Given: 이벤트를 드래그 중
When: 비어있는 날짜 셀을 클릭 (실제로는 드롭)
Then: 드래그 앤 드롭 동작이 우선 처리됨
Then: 날짜 자동 채우기 동작이 실행되지 않음
\`\`\`

### 검증 포인트 2: 드래그 시작 후 클릭 이벤트 무시

\`\`\`
Given: 이벤트 드래그가 시작됨 (mousedown 이벤트 발생)
When: 비어있는 날짜 셀에서 마우스 업 (mouseup 이벤트 발생)
Then: 드래그 앤 드롭 동작이 처리됨
Then: 날짜 자동 채우기 동작이 실행되지 않음
\`\`\`

### 검증 포인트 3: 드래그 없이 클릭만 한 경우

\`\`\`
Given: 이벤트를 클릭만 함 (드래그 없음)
When: 비어있는 날짜 셀을 클릭
Then: 날짜 자동 채우기 동작이 정상적으로 실행됨
\`\`\`

## 테스트 데이터

테스트에서 사용할 구체적인 데이터를 명시합니다. 기준 날짜는 2025-10-01입니다.

| 상태             | 동작                  | 예상 결과                             | 비고             |
| ---------------- | --------------------- | ------------------------------------- | ---------------- |
| 이벤트 드래그 중 | 빈 셀에 드롭          | 드래그 앤 드롭 처리, 날짜 채우기 무시 | 드래그 우선      |
| 이벤트 드래그 중 | 빈 셀 클릭 시뮬레이션 | 날짜 채우기 무시                      | 드래그 상태 확인 |
| 드래그 없음      | 빈 셀 클릭            | 날짜 필드에 날짜 채워짐               | 정상 동작        |
| mousedown 발생   | mouseup (이동 없음)   | 날짜 필드에 날짜 채워짐               | 클릭으로 판단    |

## 기술 참고사항

### 관련 타입

\`\`\`typescript
interface EventForm {
date: string; // YYYY-MM-DD 형식
// ... 기타 필드
}
\`\`\`

### 드래그 상태 확인

- **드래그 상태**: 드래그가 시작되었는지 확인하는 상태 변수 필요
- **클릭 이벤트 핸들러**: `onClick` 이벤트 핸들러에서 드래그 상태 확인
- **드래그 시작**: `mousedown` 이벤트에서 드래그 상태 설정
- **드래그 종료**: `mouseup` 이벤트에서 드래그 상태 해제

### 드래그와 클릭 구분

**방법 1: 드래그 상태 확인**
\`\`\`typescript
const [isDragging, setIsDragging] = useState(false);

const handleDateCellClick = (dateString: string, day: number | null) => {
// 드래그 중이면 무시
if (isDragging) {
return;
}

// 편집 모드가 아니고, 유효한 날짜인 경우에만 처리
if (!editingEvent && day !== null && dateString) {
setDate(dateString);
}
};
\`\`\`

**방법 2: mousedown과 mouseup 시간 차이**
\`\`\`typescript
let mouseDownTime = 0;
let mouseDownPosition = { x: 0, y: 0 };

const handleMouseDown = (e: MouseEvent) => {
mouseDownTime = Date.now();
mouseDownPosition = { x: e.clientX, y: e.clientY };
};

const handleMouseUp = (e: MouseEvent) => {
const timeDiff = Date.now() - mouseDownTime;
const distance = Math.sqrt(
Math.pow(e.clientX - mouseDownPosition.x, 2) +
Math.pow(e.clientY - mouseDownPosition.y, 2)
);

// 시간이 짧고 이동 거리가 작으면 클릭으로 판단
if (timeDiff < 200 && distance < 5) {
// 클릭 처리
}
};
\`\`\`

### 관련 파일

- `src/App.tsx`: `renderMonthView()`, `renderWeekView()` 함수
- `src/hooks/useEventForm.ts`: `date`, `setDate` 상태 관리
- 드래그 앤 드롭 관련 상태 관리 (기존 구현 참고)
