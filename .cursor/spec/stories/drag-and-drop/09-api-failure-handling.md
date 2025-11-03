---
epic: drag-and-drop
test_suite: API 실패 처리
---

# Story 9: API 실패 처리

## 개요

드롭 후 API 요청이 실패했을 때 오류 메시지를 표시하고 일정을 원래 위치로 복원하는 기능을 검증합니다.

## Epic 연결

- **Epic**: 드래그 앤 드롭(D&D) 일정 이동 기능
- **Epic 파일**: `.cursor/spec/epics/drag-and-drop.md`
- **검증 포인트**: Epic의 "예상 동작" 섹션 7번(API 실패 처리)에서 추출
- **우선순위**: 낮음 (에지 케이스와 오류 처리)

## 테스트 구조 및 범위

- **테스트 스위트 (Describe Block):** 'API 실패 처리'
  - **테스트 케이스 1:** 'API 요청이 실패하면 오류 스낵바가 표시된다'
  - **테스트 케이스 2:** 'API 실패 시 일정이 원래 위치로 복원된다'
  - **테스트 케이스 3:** 'API 실패 시 UI가 원래 상태로 롤백된다'
  - **테스트 케이스 4:** '500 에러 발생 시 적절한 오류 메시지가 표시된다'
  - **테스트 케이스 5:** '네트워크 에러 발생 시 적절한 오류 메시지가 표시된다'
  - **테스트 케이스 6:** 'API 실패 후에도 다시 드래그할 수 있다'

## 검증 포인트 (Given-When-Then)

### 검증 포인트 1: API 실패 시 복원

```
Given: 2025-11-01의 "팀 회의" 일정을 2025-11-03로 드롭
And: PUT /api/events/event-123 요청이 500 에러를 반환
When: API 요청 실패
Then: "일정 이동 실패" 오류 스낵바가 표시됨
And: 일정이 원래 위치(2025-11-01)로 복원됨
```

## 테스트 데이터

| 시나리오      | 일정 데이터                       | API 응답      | 예상 스낵바 메시지 | 예상 결과                  |
| ------------- | --------------------------------- | ------------- | ------------------ | -------------------------- |
| 500 서버 에러 | date: "2025-11-01" → "2025-11-03" | 500 에러      | "일정 이동 실패"   | 원래 위치(2025-11-01) 복원 |
| 404 Not Found | date: "2025-11-01" → "2025-11-03" | 404 에러      | "일정 이동 실패"   | 원래 위치 복원             |
| 네트워크 에러 | date: "2025-11-01" → "2025-11-03" | 네트워크 에러 | "일정 이동 실패"   | 원래 위치 복원             |
| 타임아웃      | date: "2025-11-01" → "2025-11-03" | 타임아웃      | "일정 이동 실패"   | 원래 위치 복원             |

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

### 에러 처리

```typescript
try {
  await saveEvent(updatedEvent);
  // 성공 스낵바 표시
} catch (error) {
  // 실패 스낵바 표시
  // 원래 위치로 복원 (별도 API 호출 없이 로컬 상태만 롤백)
}
```

## 구현 참고사항

### useDragAndDrop 훅

`handleDrop` 함수에 에러 처리 추가:

```typescript
const handleDrop = async (targetDate: string) => {
  if (!draggedEvent || sourceDate === targetDate) return;

  const originalEvent = { ...draggedEvent }; // 원본 저장
  const updatedEvent = {
    ...draggedEvent,
    date: targetDate,
  };

  try {
    await saveEvent(updatedEvent);
    onSuccess?.('일정이 이동되었습니다');
  } catch (error) {
    onError?.('일정 이동 실패');
    // 원래 상태로 롤백 (saveEvent가 자동으로 처리)
  } finally {
    handleDragEnd();
  }
};
```

### 스낵바 메시지

- 실패: "일정 이동 실패"
- 성공: "일정이 이동되었습니다"

## 예상 작업 시간

1시간

## 의존성

- Story 1, 2 완료 필요
- 기존 에러 처리 로직 활용
