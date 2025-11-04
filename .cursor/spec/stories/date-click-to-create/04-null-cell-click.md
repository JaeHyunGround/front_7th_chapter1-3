---
epic: date-click-to-create
test_suite: 빈 셀 클릭 (null 날짜)
---

# Story: 빈 셀 클릭 (null 날짜)

## 개요

월 뷰에서 빈 셀(null 값)을 클릭했을 때 아무 동작도 하지 않는 기능을 검증합니다.

## Epic 연결

- **Epic**: 날짜 클릭으로 일정 생성 기능
- **Epic 파일**: `.cursor/spec/epics/date-click-to-create.md`
- **검증 포인트**: Epic의 "예상 동작" 섹션 3번에서 추출

## 테스트 구조 및 범위

이 Story가 작성될 테스트 코드의 논리적 계층 구조를 명시합니다.

- **테스트 스위트 (Describe Block):** '빈 셀 클릭 (null 날짜)'
  - **테스트 케이스 1:** 'should not change date field when clicking null cell'
  - **테스트 케이스 2:** 'should not trigger any action when clicking null cell'

## 검증 포인트 (Given-When-Then)

Epic에서 가져온 모든 검증 포인트를 명시합니다.

### 검증 포인트 1: 빈 셀 클릭 무시

\`\`\`
Given: 월 뷰에서 빈 셀 (day === null)
When: 해당 셀을 클릭
Then: 폼의 날짜 필드가 변경되지 않음
\`\`\`

### 검증 포인트 2: 빈 셀 클릭 시 기존 날짜 유지

\`\`\`
Given: 폼의 날짜 필드에 "2025-10-15"가 이미 채워져 있음
When: 빈 셀 (day === null)을 클릭
Then: 폼의 날짜 필드가 "2025-10-15"로 유지됨
\`\`\`

## 테스트 데이터

테스트에서 사용할 구체적인 데이터를 명시합니다. 기준 날짜는 2025-10-01입니다.

| 상태                          | 클릭한 셀 | 예상 결과                          | 비고           |
| ----------------------------- | --------- | ---------------------------------- | -------------- |
| 날짜 필드 비어있음            | null 셀   | 날짜 필드 변경 없음 (빈 상태 유지) | 빈 셀 클릭     |
| 날짜 필드에 "2025-10-15" 있음 | null 셀   | 날짜 필드 유지 ("2025-10-15")      | 기존 날짜 유지 |
| 날짜 필드에 "2025-10-20" 있음 | null 셀   | 날짜 필드 유지 ("2025-10-20")      | 기존 날짜 유지 |

## 기술 참고사항

### 관련 타입

\`\`\`typescript
interface EventForm {
date: string; // YYYY-MM-DD 형식
// ... 기타 필드
}
\`\`\`

### null 값 처리

- **조건**: `day === null`인 경우 아무 동작도 하지 않음
- **이전/다음 달 날짜와의 차이**: 이전/다음 달 날짜는 유효한 날짜이지만, null 셀은 완전히 빈 공간

### 클릭 이벤트 핸들러

\`\`\`typescript
const handleDateCellClick = (dateString: string, day: number | null) => {
// 편집 모드가 아니고, 유효한 날짜인 경우에만 처리
// day === null이면 조건문에서 false가 되어 처리되지 않음
if (!editingEvent && day !== null && dateString) {
setDate(dateString);
}
};
\`\`\`

### 관련 파일

- `src/App.tsx`: `renderMonthView()` 함수
- `src/hooks/useEventForm.ts`: `date`, `setDate` 상태 관리
