---
epic: date-click-to-create
test_suite: 이벤트가 있는 날짜 셀 클릭
---

# Story: 이벤트가 있는 날짜 셀 클릭

## 개요

이벤트가 있는 날짜 셀에서 이벤트 박스를 클릭했을 때는 날짜가 채워지지 않고, 셀의 빈 공간을 클릭했을 때는 날짜가 채워지는 기능을 검증합니다.

## Epic 연결

- **Epic**: 날짜 클릭으로 일정 생성 기능
- **Epic 파일**: `.cursor/spec/epics/date-click-to-create.md`
- **검증 포인트**: Epic의 "예상 동작" 섹션 5번에서 추출

## 테스트 구조 및 범위

이 Story가 작성될 테스트 코드의 논리적 계층 구조를 명시합니다.

- **테스트 스위트 (Describe Block):** '이벤트가 있는 날짜 셀 클릭'
  - **테스트 케이스 1:** 'should not change date field when clicking event box'
  - **테스트 케이스 2:** 'should fill date field when clicking empty space in cell with event'
  - **테스트 케이스 3:** 'should handle event box click with event bubbling prevention'

## 검증 포인트 (Given-When-Then)

Epic에서 가져온 모든 검증 포인트를 명시합니다.

### 검증 포인트 1: 이벤트 박스 클릭

\`\`\`
Given: 월 뷰에서 2025-10-15 날짜 셀 (이벤트 1개 존재)
When: 이벤트 박스를 클릭
Then: 폼의 날짜 필드가 변경되지 않음 (기존 동작 유지)
\`\`\`

### 검증 포인트 2: 셀의 빈 공간 클릭

\`\`\`
Given: 월 뷰에서 2025-10-15 날짜 셀 (이벤트 1개 존재, 셀에 빈 공간 있음)
When: 셀의 빈 공간을 클릭 (이벤트 박스가 아닌 영역)
Then: 폼의 날짜 필드에 "2025-10-15"가 자동으로 채워짐
\`\`\`

### 검증 포인트 3: 여러 이벤트가 있는 셀의 빈 공간 클릭

\`\`\`
Given: 월 뷰에서 2025-10-15 날짜 셀 (이벤트 2개 이상 존재, 셀에 빈 공간 있음)
When: 셀의 빈 공간을 클릭 (이벤트 박스가 아닌 영역)
Then: 폼의 날짜 필드에 "2025-10-15"가 자동으로 채워짐
\`\`\`

## 테스트 데이터

테스트에서 사용할 구체적인 데이터를 명시합니다. 기준 날짜는 2025-10-01입니다.

| 날짜 셀    | 이벤트 개수 | 클릭 영역   | 예상 결과                       | 비고             |
| ---------- | ----------- | ----------- | ------------------------------- | ---------------- |
| 2025-10-15 | 1개         | 이벤트 박스 | 날짜 필드 변경 없음             | 기존 동작 유지   |
| 2025-10-15 | 1개         | 빈 공간     | 날짜 필드에 "2025-10-15" 채워짐 | 빈 공간 클릭     |
| 2025-10-15 | 2개         | 이벤트 박스 | 날짜 필드 변경 없음             | 이벤트 박스 클릭 |
| 2025-10-15 | 2개         | 빈 공간     | 날짜 필드에 "2025-10-15" 채워짐 | 빈 공간 클릭     |

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

### 이벤트 버블링 처리

- **이벤트 박스 클릭**: 이벤트가 버블링되지 않도록 `stopPropagation()` 처리
- **빈 공간 클릭**: 셀의 빈 공간을 클릭한 경우에만 날짜 채우기 동작 수행
- **이벤트 타겟 확인**: `event.target`이 이벤트 박스인지 셀인지 확인

### 클릭 이벤트 핸들러

\`\`\`typescript

const handleDateCellClick = (dateString: string, day: number | null, event: MouseEvent) => {
// 이벤트 박스가 클릭된 경우 무시
if (event.target.closest('.event-box')) {
return;
}

// 편집 모드가 아니고, 유효한 날짜인 경우에만 처리
if (!editingEvent && day !== null && dateString) {
setDate(dateString);
}
};

\`\`\`

### 관련 파일

- `src/App.tsx`: `renderMonthView()` 함수, `TableCell` 컴포넌트
- `src/hooks/useEventForm.ts`: `date`, `setDate` 상태 관리
- `src/utils/dateUtils.ts`: `getEventsForDay()` 함수
