---
epic: drag-and-drop
test_suite: 일반 일정 드롭
---

# Story 2: 일반 일정 드롭

## 개요

반복되지 않는 일반 일정을 다른 날짜로 드래그 앤 드롭하여 날짜를 변경하는 기능을 검증합니다.

## Epic 연결

- **Epic**: 드래그 앤 드롭(D&D) 일정 이동 기능
- **Epic 파일**: `.cursor/spec/epics/drag-and-drop.md`
- **검증 포인트**: Epic의 "예상 동작" 섹션 3번(일반 일정 드롭)에서 추출
- **우선순위**: 높음 (필수 동작)

## 테스트 구조 및 범위

이 Story가 작성될 테스트 코드의 논리적 계층 구조를 명시합니다.

- **테스트 스위트 (Describe Block):** '일반 일정 드롭'
  - **테스트 케이스 1:** '일정을 다른 날짜로 드롭하면 날짜가 변경된다'
  - **테스트 케이스 2:** '일정을 다른 날짜로 드롭해도 시작 시간과 종료 시간은 유지된다'
  - **테스트 케이스 3:** '일정을 다른 날짜로 드롭하면 PUT API가 호출된다'
  - **테스트 케이스 4:** '일정을 다른 날짜로 드롭하면 성공 스낵바가 표시된다'
  - **테스트 케이스 5:** '일정을 동일한 날짜에 드롭하면 API가 호출되지 않는다'
  - **테스트 케이스 6:** '드롭 완료 후 드래그 상태가 초기화된다'

## 검증 포인트 (Given-When-Then)

### 검증 포인트 1: 날짜 변경 및 API 호출

```
Given: 2025-11-01 10:00-11:00의 "팀 회의" 일정 (id: "1" 이라고 가정)
When: 해당 일정을 2025-11-03 날짜 셀에 드롭
Then: PUT /api/events/1 요청이 전송됨
And: 요청 본문의 date가 "2025-11-03"로 변경됨
And: startTime과 endTime은 "10:00", "11:00"으로 유지됨
And: "일정이 이동되었습니다" 스낵바가 표시됨
```

### 검증 포인트 2: 동일 날짜 드롭

```
Given: 2025-11-01의 "팀 회의" 일정을 드래그 중
When: 동일한 날짜(2025-11-01)에 드롭
Then: API 요청이 전송되지 않음
And: 아무 변화 없음
```

## 테스트 데이터

| 시나리오         | 일정 데이터                                                                         | 드롭 날짜  | 예상 API 요청                                        | 비고                 |
| ---------------- | ----------------------------------------------------------------------------------- | ---------- | ---------------------------------------------------- | -------------------- |
| 다른 날짜로 이동 | id: "1", title: "팀 회의", date: "2025-11-01", startTime: "10:00", endTime: "11:00" | 2025-11-03 | PUT /api/events/1, body: {date: "2025-11-03", ...}   | 성공 스낵바 표시     |
| 동일 날짜 드롭   | id: "1", title: "팀 회의", date: "2025-11-01"                                       | 2025-11-01 | 없음                                                 | 아무 동작 없음       |
| 시간 유지 확인   | startTime: "14:30", endTime: "16:00", date: "2025-11-01"                            | 2025-11-06 | PUT 요청의 startTime="14:30", endTime="16:00"        | 시간은 변경되지 않음 |
| 전체 필드 유지   | description: "회의 설명", location: "회의실", category: "업무"                      | 2025-11-03 | PUT 요청에 모든 필드가 동일하게 포함됨 (날짜만 변경) | 날짜 외 필드 유지    |

## 기술 참고사항

### 관련 타입

```typescript
interface Event {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD 형식
  startTime: string; // HH:mm 형식
  endTime: string; // HH:mm 형식
  description: string;
  location: string;
  category: string;
  repeat: RepeatInfo;
  notificationTime: number;
}

interface EventForm {
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

### API 스펙

**엔드포인트**: `PUT /api/events/{eventId}`

**요청 본문**:

```json
{
  "id": "1",
  "title": "팀 회의",
  "date": "2025-11-03",
  "startTime": "10:00",
  "endTime": "11:00",
  "description": "회의 설명",
  "location": "회의실",
  "category": "업무",
  "repeat": {
    "type": "none",
    "interval": 0,
    "endDate": ""
  },
  "notificationTime": 10
}
```

**응답**: 200 OK, 수정된 Event 객체 반환

### 스낵바 메시지

- 성공: "일정이 이동되었습니다"

## 구현 참고사항

### useDragAndDrop 훅

이 Story는 `useDragAndDrop` 훅의 다음 함수를 구현합니다:

- `handleDrop(targetDate: string)`: 드롭 처리 및 API 호출

#### handleDrop 구현 로직

1. 드래그 중인 이벤트와 타겟 날짜 확인
2. 동일한 날짜인지 검증 (같으면 early return)
3. 일정 객체 복사 후 날짜만 변경
4. `saveEvent` 함수 호출하여 API 요청
5. 성공 시 스낵바 표시
6. `handleDragEnd()` 호출하여 상태 초기화

### App.tsx 통합 포인트

- 날짜 셀에 `onDrop` 핸들러 추가
- `saveEvent` 함수를 `useDragAndDrop` 훅에 전달
- 스낵바 컴포넌트 연동

## 예상 작업 시간

1-2시간

## 의존성

- Story 1 (드래그 시작 및 시각적 피드백) 완료 필요
- 기존 `saveEvent` 함수 활용
