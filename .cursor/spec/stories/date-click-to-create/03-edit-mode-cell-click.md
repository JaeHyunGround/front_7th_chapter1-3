---
epic: date-click-to-create
test_suite: 편집 모드에서 날짜 셀 클릭
---

# Story: 편집 모드에서 날짜 셀 클릭

## 개요

일정을 편집 중일 때(`editingEvent`가 존재할 때) 날짜 셀을 클릭해도 폼의 날짜 필드가 변경되지 않는 기능을 검증합니다.

## Epic 연결

- **Epic**: 날짜 클릭으로 일정 생성 기능
- **Epic 파일**: `.cursor/spec/epics/date-click-to-create.md`
- **검증 포인트**: Epic의 "예상 동작" 섹션 4번에서 추출

## 테스트 구조 및 범위

이 Story가 작성될 테스트 코드의 논리적 계층 구조를 명시합니다.

- **테스트 스위트 (Describe Block):** '편집 모드에서 날짜 셀 클릭'
  - **테스트 케이스 1:** 'should not change date field when clicking cell in edit mode (month view)'
  - **테스트 케이스 2:** 'should not change date field when clicking cell in edit mode (week view)'
  - **테스트 케이스 3:** 'should maintain editing event date when clicking different date cell'

## 검증 포인트 (Given-When-Then)

Epic에서 가져온 모든 검증 포인트를 명시합니다.

### 검증 포인트 1: 편집 모드에서 월 뷰 날짜 셀 클릭

\`\`\`
Given: 일정 수정 모드 (editingEvent가 존재, 기존 날짜: 2025-10-10)
When: 비어있는 날짜 셀을 클릭 (예: 2025-10-15)
Then: 폼의 날짜 필드가 변경되지 않음
Then: 편집 중인 일정의 날짜가 유지됨 (2025-10-10)
\`\`\`

### 검증 포인트 2: 편집 모드에서 주 뷰 날짜 셀 클릭

\`\`\`
Given: 일정 수정 모드 (editingEvent가 존재, 기존 날짜: 2025-10-10)
When: 비어있는 날짜 셀을 클릭 (예: 2025-10-18)
Then: 폼의 날짜 필드가 변경되지 않음
Then: 편집 중인 일정의 날짜가 유지됨 (2025-10-10)
\`\`\`

### 검증 포인트 3: 편집 모드에서 여러 날짜 셀 클릭

\`\`\`
Given: 일정 수정 모드 (editingEvent가 존재, 기존 날짜: 2025-10-10)
When: 여러 비어있는 날짜 셀을 연속으로 클릭
Then: 폼의 날짜 필드가 변경되지 않음
Then: 편집 중인 일정의 날짜가 계속 유지됨 (2025-10-10)
\`\`\`

## 테스트 데이터

테스트에서 사용할 구체적인 데이터를 명시합니다. 기준 날짜는 2025-10-01입니다.

| 편집 중인 일정 날짜 | 클릭한 날짜 셀 | 예상 결과                   | 비고            |
| ------------------- | -------------- | --------------------------- | --------------- |
| 2025-10-10          | 2025-10-15     | 날짜 필드 유지 (2025-10-10) | 월 뷰           |
| 2025-10-10          | 2025-10-18     | 날짜 필드 유지 (2025-10-10) | 주 뷰           |
| 2025-10-10          | 2025-10-01     | 날짜 필드 유지 (2025-10-10) | 같은 주 다른 날 |
| 2025-10-05          | 2025-10-20     | 날짜 필드 유지 (2025-10-05) | 다른 주 날짜    |

## 기술 참고사항

### 관련 타입

\`\`\`typescript
interface EventForm {
date: string; // YYYY-MM-DD 형식
// ... 기타 필드
}

interface Event {
id: string;
date: string;
// ... 기타 필드
}
\`\`\`

### 편집 모드 확인

- **상태**: `editingEvent`가 존재하면 편집 모드
- **조건**: `if (!editingEvent && ...)` 조건으로 편집 모드 체크

### 클릭 이벤트 핸들러

**월 뷰**:
\`\`\`typescript
const handleDateCellClick = (dateString: string, day: number | null) => {
// 편집 모드가 아니고, 유효한 날짜인 경우에만 처리
if (!editingEvent && day !== null && dateString) {
setDate(dateString);
}
};
\`\`\`

**주 뷰**:
\`\`\`typescript
const handleDateCellClick = (dateString: string) => {
// 편집 모드가 아니고, 유효한 날짜인 경우에만 처리
if (!editingEvent && dateString) {
setDate(dateString);
}
};
\`\`\`

### 관련 파일

- `src/App.tsx`: `renderMonthView()`, `renderWeekView()` 함수
- `src/hooks/useEventForm.ts`: `editingEvent`, `date`, `setDate` 상태 관리
