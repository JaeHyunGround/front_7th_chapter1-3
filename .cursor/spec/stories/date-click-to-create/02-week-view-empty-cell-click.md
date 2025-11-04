---
epic: date-click-to-create
test_suite: 주 뷰에서 비어있는 날짜 셀 클릭
---

# Story: 주 뷰에서 비어있는 날짜 셀 클릭

## 개요

주 뷰에서 이벤트가 없는 날짜 셀을 클릭했을 때 해당 날짜가 폼의 날짜 필드에 자동으로 채워지는 기능을 검증합니다.

## Epic 연결

- **Epic**: 날짜 클릭으로 일정 생성 기능
- **Epic 파일**: `.cursor/spec/epics/date-click-to-create.md`
- **검증 포인트**: Epic의 "예상 동작" 섹션 2번에서 추출

## 테스트 구조 및 범위

이 Story가 작성될 테스트 코드의 논리적 계층 구조를 명시합니다.

- **테스트 스위트 (Describe Block):** '주 뷰에서 비어있는 날짜 셀 클릭'
  - **테스트 케이스 1:** 'should fill date field when clicking empty cell in week view'
  - **테스트 케이스 2:** 'should fill date field with correct format (YYYY-MM-DD)'
  - **테스트 케이스 3:** 'should fill date field when clicking weekend date'

## 검증 포인트 (Given-When-Then)

Epic에서 가져온 모든 검증 포인트를 명시합니다.

### 검증 포인트 1: 주 뷰의 일반 날짜 셀 클릭

\`\`\`
Given: 주 뷰에서 2025-10-15 날짜 셀 (이벤트 없음)
When: 해당 셀을 클릭
Then: 폼의 날짜 필드에 "2025-10-15"가 자동으로 채워짐
\`\`\`

### 검증 포인트 2: 주말 날짜 셀 클릭

\`\`\`
Given: 주 뷰에서 주말 날짜 셀 (2025-10-18, 토요일, 이벤트 없음)
When: 해당 셀을 클릭
Then: 폼의 날짜 필드에 "2025-10-18"가 자동으로 채워짐
\`\`\`

### 검증 포인트 3: 일요일 날짜 셀 클릭

\`\`\`
Given: 주 뷰에서 일요일 날짜 셀 (2025-10-19, 일요일, 이벤트 없음)
When: 해당 셀을 클릭
Then: 폼의 날짜 필드에 "2025-10-19"가 자동으로 채워짐
\`\`\`

## 테스트 데이터

테스트에서 사용할 구체적인 데이터를 명시합니다. 기준 날짜는 2025-10-01입니다.

| 입력값              | 예상 결과                       | 비고           |
| ------------------- | ------------------------------- | -------------- |
| 2025-10-15 (수요일) | 날짜 필드에 "2025-10-15" 채워짐 | 주중 날짜      |
| 2025-10-18 (토요일) | 날짜 필드에 "2025-10-18" 채워짐 | 주말 날짜      |
| 2025-10-19 (일요일) | 날짜 필드에 "2025-10-19" 채워짐 | 주말 날짜      |
| 2025-10-13 (월요일) | 날짜 필드에 "2025-10-13" 채워짐 | 주의 첫 날     |
| 2025-10-20 (일요일) | 날짜 필드에 "2025-10-20" 채워짐 | 주의 마지막 날 |

## 기술 참고사항

### 관련 타입

\`\`\`typescript
interface EventForm {
date: string; // YYYY-MM-DD 형식
// ... 기타 필드
}
\`\`\`

### 날짜 형식 규칙

- **입력 형식**: `YYYY-MM-DD` (예: `2025-10-15`)
- **포맷 함수**: `formatDate(date: Date): string`
- **주 뷰**: `formatDate(date)` - `date`는 Date 객체

### 클릭 이벤트 핸들러

\`\`\`typescript
const handleDateCellClick = (dateString: string) => {
// 편집 모드가 아니고, 유효한 날짜인 경우에만 처리
if (!editingEvent && dateString) {
setDate(dateString);
}
};
\`\`\`

### 관련 파일

- `src/App.tsx`: `renderWeekView()` 함수
- `src/hooks/useEventForm.ts`: `date`, `setDate` 상태 관리
- `src/utils/dateUtils.ts`: `formatDate()` 함수
