# 드래그 앤 드롭(D&D) 일정 이동 기능

## 요약 (Summary)

캘린더의 일정을 마우스로 드래그하여 다른 날짜로 이동할 수 있는 기능을 구현합니다. 드래그 시작, 드래그 중, 드롭 완료까지의 시각적 피드백을 제공하며, 드롭 시 자동으로 일정 수정 API를 호출합니다. 시간은 변경되지 않고 날짜만 변경됩니다. 반복 일정의 경우 단일 수정/전체 수정 선택 다이얼로그가 표시됩니다.

## 배경 (Background)

현재 일정 관리 시스템에서 일정의 날짜를 변경하려면 다음 과정을 거쳐야 합니다:

1. 일정 목록에서 수정 버튼 클릭
2. 폼에서 날짜 입력
3. 수정 버튼 클릭

이 과정은 번거롭고 직관적이지 않습니다. 드래그 앤 드롭 기능을 통해 사용자는 시각적으로 일정을 옮기는 것만으로 날짜를 간편하게 변경할 수 있어, 더 나은 사용자 경험을 제공할 수 있습니다.

## 목표 (Goals)

1. 캘린더 뷰(주간/월간)에서 일정 박스를 드래그하여 다른 날짜 셀로 이동 가능
2. 드래그 중 시각적 피드백 제공 (드래그 중인 일정 표시, 드롭 가능 영역 표시)
3. 드롭 시 자동으로 일정의 날짜 수정
4. 반복 일정의 경우 단일/전체 수정 선택 다이얼로그 표시
5. 일정 겹침 감지 및 경고 다이얼로그 표시
6. 드래그 앤 드롭 실패 시 원래 위치로 복원

## 목표가 아닌 것 (Non-Goals)

1. 시간 단위 드래그 (같은 날짜 내에서 시간만 변경하는 기능은 제외)
2. 여러 일정을 한 번에 드래그하는 다중 선택 기능
3. 드래그 앤 드롭 취소(Undo) 기능
4. 다른 뷰(주간 → 월간)로의 드래그

## 계획 (Plan)

### 예상 동작 (Expected Behaviors)

#### 1. 드래그 시작

**동작 명세**:

- 사용자가 캘린더 뷰의 일정 박스를 마우스로 클릭하고 드래그를 시작하면 드래그 모드가 활성화됩니다.
- 드래그 중인 일정은 시각적으로 강조 표시됩니다 (투명도 0.5 적용).
- 드래그 가능한 상태임을 나타내는 커서(`grab`)가 표시됩니다.

**검증 포인트**:

```
Given: 캘린더 월간 뷰에 2025-10-01의 "팀 회의" 일정이 존재
When: "팀 회의" 일정 박스에 마우스를 올림
Then: 커서가 'grab'으로 변경됨

Given: 캘린더 월간 뷰에 2025-10-01의 "팀 회의" 일정이 존재
When: "팀 회의" 일정 박스를 클릭하고 드래그 시작
Then: 일정 박스의 투명도가 0.5로 변경됨
And: 드래그 중임을 나타내는 data-dragging="true" 속성이 추가됨
```

#### 2. 드래그 중 피드백

**동작 명세**:

- 드래그 중에는 마우스 포인터 위치에 드래그 중인 일정의 복사본이 따라다닙니다.
- 드롭 가능한 날짜 셀 위로 마우스가 이동하면 해당 셀의 배경색이 변경됩니다 (예: #e3f2fd).
- 드롭 불가능한 영역(캘린더 외부, 과거 날짜 등)에서는 커서가 `not-allowed`로 변경됩니다.

**검증 포인트**:

```
Given: 2025-10-01의 "팀 회의" 일정을 드래그 중
When: 마우스를 2025-10-07 날짜 셀 위로 이동
Then: 2025-10-07 셀의 배경색이 #e3f2fd로 변경됨
And: data-droppable="true" 속성이 해당 셀에 추가됨

Given: 2025-10-01의 "팀 회의" 일정을 드래그 중
When: 마우스를 캘린더 외부 영역으로 이동
Then: 커서가 'not-allowed'로 변경됨
```

#### 3. 일반 일정 드롭

**동작 명세**:

- 사용자가 드래그 중인 일정을 다른 날짜 셀에 드롭하면, 해당 일정의 날짜가 드롭한 날짜로 자동 변경됩니다.
- 시작 시간과 종료 시간은 그대로 유지됩니다.
- 서버에 PUT 요청을 보내 일정을 수정합니다.
- 성공 시 "일정이 이동되었습니다" 스낵바 메시지를 표시합니다.

**검증 포인트**:

```
Given: 2025-10-01 10:00-11:00의 "팀 회의" 일정 (id: "event-123")
When: 해당 일정을 2025-10-07 날짜 셀에 드롭
Then: PUT /api/events/event-123 요청이 전송됨
And: 요청 본문의 date가 "2025-10-07"로 변경됨
And: startTime과 endTime은 "10:00", "11:00"으로 유지됨
And: "일정이 이동되었습니다" 스낵바가 표시됨

Given: 2025-10-01의 "팀 회의" 일정을 드래그 중
When: 동일한 날짜(2025-10-01)에 드롭
Then: API 요청이 전송되지 않음
And: 아무 변화 없음
```

#### 4. 반복 일정 드롭

**동작 명세**:

- 반복 일정(repeat.type !== 'none')을 드롭하면 RecurringEventDialog가 자동으로 표시됩니다.
- 다이얼로그에서 "이 일정만 수정" 또는 "모든 일정 수정"을 선택할 수 있습니다.
- 선택 후 해당 옵션에 맞게 일정이 수정됩니다.

**검증 포인트**:

```
Given: 2025-10-01의 "매주 회의" 반복 일정 (repeat.type: "weekly", repeat.interval: 1)
When: 해당 일정을 2025-10-12 날짜 셀에 드롭
Then: RecurringEventDialog가 mode="edit"로 열림
And: "이 일정만 수정" 버튼과 "모든 일정 수정" 버튼이 표시됨

Given: RecurringEventDialog에서 "이 일정만 수정" 선택
When: 확인 버튼 클릭
Then: handleRecurringEdit(event, true)가 호출됨
And: 단일 일정만 날짜가 변경됨

Given: RecurringEventDialog에서 "모든 일정 수정" 선택
When: 확인 버튼 클릭
Then: handleRecurringEdit(event, false)가 호출됨
And: 모든 반복 일정의 날짜가 변경됨
```

#### 5. 일정 겹침 감지

**동작 명세**:

- 드롭한 날짜에 동일한 시간대의 다른 일정이 있으면 일정 겹침 경고 다이얼로그가 표시됩니다.
- 사용자는 "취소" 또는 "계속 진행"을 선택할 수 있습니다.
- "취소" 선택 시 일정은 원래 위치로 유지됩니다.

**검증 포인트**:

```
Given: 2025-10-07 10:00-11:00에 "기존 회의" 일정이 존재
And: 2025-10-01 10:00-11:00에 "새 회의" 일정이 존재
When: "새 회의"를 2025-10-07로 드래그 앤 드롭
Then: 일정 겹침 경고 다이얼로그가 표시됨
And: 다이얼로그에 "기존 회의 (2025-10-07 10:00-11:00)" 정보가 표시됨

Given: 일정 겹침 경고 다이얼로그가 열린 상태
When: "취소" 버튼 클릭
Then: 다이얼로그가 닫힘
And: API 요청이 전송되지 않음
And: 일정이 원래 날짜(2025-10-01)에 유지됨

Given: 일정 겹침 경고 다이얼로그가 열린 상태
When: "계속 진행" 버튼 클릭
Then: API 요청이 전송됨
And: 일정이 새 날짜(2025-10-07)로 이동됨
```

#### 6. 드래그 취소

**동작 명세**:

- 드래그 중 ESC 키를 누르면 드래그가 취소되고 일정은 원래 위치로 돌아갑니다.
- 드롭 가능하지 않은 영역에 드롭하면 드래그가 취소됩니다.

**검증 포인트**:

```
Given: 2025-10-01의 "팀 회의" 일정을 드래그 중
When: ESC 키를 누름
Then: 드래그가 취소됨
And: 일정이 원래 위치(2025-10-01)에 유지됨
And: 시각적 피드백이 제거됨

Given: 2025-10-01의 "팀 회의" 일정을 드래그 중
When: 캘린더 외부 영역에 드롭
Then: 드래그가 취소됨
And: 일정이 원래 위치(2025-10-01)에 유지됨
```

#### 7. API 실패 처리

**동작 명세**:

- 드롭 후 API 요청이 실패하면 오류 메시지를 표시하고 일정을 원래 위치로 복원합니다.

**검증 포인트**:

```
Given: 2025-10-01의 "팀 회의" 일정을 2025-10-07로 드롭
And: PUT /api/events/event-123 요청이 500 에러를 반환
When: API 요청 실패
Then: "일정 이동 실패" 오류 스낵바가 표시됨
And: 일정이 원래 위치(2025-10-01)로 복원됨
```

#### 8. 주간 뷰 드래그 앤 드롭

**동작 명세**:

- 주간 뷰에서도 월간 뷰와 동일하게 드래그 앤 드롭이 동작합니다.
- 주간 뷰의 각 날짜 셀이 드롭 가능 영역으로 동작합니다.

**검증 포인트**:

```
Given: 주간 뷰로 전환됨
And: 2025-10-01(수요일)에 "팀 회의" 일정이 존재
When: "팀 회의"를 2025-10-07(금요일) 셀로 드래그 앤 드롭
Then: 일정의 날짜가 2025-10-07로 변경됨
And: API 요청이 정상적으로 전송됨
```

#### 9. 알림 아이콘이 있는 일정 드래그

**동작 명세**:

- 알림 아이콘(Notifications)이나 반복 아이콘(Repeat)이 표시된 일정도 동일하게 드래그할 수 있습니다.
- 드래그 중인 복사본에도 아이콘이 표시됩니다.

**검증 포인트**:

```
Given: 2025-10-01의 "팀 회의" 일정에 알림이 설정되어 있음 (notifiedEvents에 포함)
When: 해당 일정을 드래그
Then: 드래그 중인 복사본에도 Notifications 아이콘이 표시됨
And: 빨간색 스타일(#ffebee 배경, #d32f2f 텍스트)이 유지됨
```

#### 10. 다중 일정이 있는 셀에 드롭

**동작 명세**:

- 이미 여러 일정이 존재하는 날짜 셀에 드롭해도 정상적으로 동작합니다.
- 드롭된 일정은 해당 날짜의 일정 목록에 추가됩니다.

**검증 포인트**:

```
Given: 2025-10-07에 "회의 A", "회의 B" 2개의 일정이 이미 존재
When: 2025-10-01의 "회의 C"를 2025-10-07로 드롭
Then: 2025-10-07에 3개의 일정이 표시됨
And: "회의 C"의 날짜가 2025-10-07로 변경됨
```

### 기술 요구사항

#### 1. 데이터 타입

기존 타입을 활용하며, 추가적인 타입은 필요하지 않습니다.

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
```

#### 2. 드래그 앤 드롭 상태 관리

새로운 훅 `useDragAndDrop`을 생성하여 드래그 상태를 관리합니다.

```typescript
interface DragState {
  isDragging: boolean;
  draggedEvent: Event | null;
  sourceDate: string | null;
  targetDate: string | null;
}

// 훅 반환 타입
interface UseDragAndDropReturn {
  dragState: DragState;
  handleDragStart: (event: Event) => void;
  handleDragOver: (date: string) => void;
  handleDragEnd: () => void;
  handleDrop: (targetDate: string) => Promise<void>;
}
```

#### 3. HTML 드래그 앤 드롭 API 사용

- `draggable="true"` 속성을 일정 박스에 추가
- `onDragStart`, `onDragOver`, `onDragEnd`, `onDrop` 이벤트 핸들러 구현
- `event.dataTransfer`를 사용하여 드래그 데이터 전달

#### 4. 스타일 요구사항

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

**드래그 가능한 일정 박스 (hover)**:

```css
cursor: grab;
```

#### 5. 접근성 요구사항

- `aria-grabbed` 속성을 사용하여 드래그 상태 표시
- 키보드 접근성 고려 (향후 개선 항목)

### 제약사항 및 에지 케이스

| 상황                           | 예상 동작                            | 비고                     |
| ------------------------------ | ------------------------------------ | ------------------------ |
| 동일한 날짜에 드롭             | 아무 동작 없음                       | API 요청 전송 안 함      |
| 반복 일정 드롭                 | RecurringEventDialog 표시            | mode="edit"              |
| 겹치는 일정이 있는 날짜로 드롭 | 일정 겹침 경고 다이얼로그 표시       | 기존 겹침 감지 로직 활용 |
| API 요청 실패                  | 오류 메시지 표시 후 원래 위치로 복원 | 낙관적 업데이트 없음     |
| 캘린더 외부에 드롭             | 드래그 취소, 원래 위치 유지          |                          |
| ESC 키 누름                    | 드래그 취소                          |                          |
| 주간 뷰에서 드래그             | 월간 뷰와 동일하게 동작              |                          |
| 알림/반복 아이콘이 있는 일정   | 정상적으로 드래그 가능               | 시각적 스타일 유지       |

### 구현 우선순위

#### 1. 높음 (필수 동작)

1. **드래그 앤 드롭 훅 생성** (`src/hooks/useDragAndDrop.ts`)

   - 드래그 상태 관리
   - 드래그 시작/종료/드롭 핸들러 구현

2. **일반 일정 드래그 앤 드롭**

   - 일정 박스에 draggable 속성 추가
   - 날짜 셀에 드롭 이벤트 핸들러 추가
   - 드롭 시 날짜 변경 및 API 호출

3. **시각적 피드백**
   - 드래그 중 투명도 변경
   - 드롭 가능 영역 하이라이트

#### 2. 중간 (일반적인 케이스)

4. **반복 일정 처리**

   - 반복 일정 드롭 시 다이얼로그 표시
   - 단일/전체 수정 처리

5. **일정 겹침 처리**

   - 드롭 시 겹침 감지
   - 겹침 경고 다이얼로그 표시

6. **주간 뷰 지원**
   - 주간 뷰에서도 드래그 앤 드롭 동작

#### 3. 낮음 (에지 케이스와 오류 처리)

7. **드래그 취소 처리**

   - ESC 키로 드래그 취소
   - 캘린더 외부 드롭 시 취소

8. **API 실패 처리**

   - 실패 시 오류 메시지 표시
   - 원래 위치로 복원

9. **접근성 개선**
   - aria-grabbed 속성 추가
   - 스크린 리더 지원

---

## 구현 가이드

### 파일 구조

```
src/
├── hooks/
│   └── useDragAndDrop.ts (새로 생성)
├── App.tsx (수정: 드래그 앤 드롭 통합)
└── utils/
    └── dragAndDropUtils.ts (선택적: 유틸 함수)
```

### 주요 함수

#### useDragAndDrop.ts

```typescript
export const useDragAndDrop = (
  events: Event[],
  saveEvent: (event: Event | EventForm) => Promise<void>,
  onRecurringEvent?: (event: Event, targetDate: string) => void
) => {
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedEvent: null,
    sourceDate: null,
    targetDate: null,
  });

  const handleDragStart = (event: Event) => {
    // 구현
  };

  const handleDrop = async (targetDate: string) => {
    // 구현
  };

  // ... 기타 핸들러
};
```

### App.tsx 통합 예시

```tsx
// 드래그 앤 드롭 훅 사용
const { dragState, handleDragStart, handleDragOver, handleDrop, handleDragEnd } = useDragAndDrop(
  events,
  saveEvent,
  (event, targetDate) => {
    // 반복 일정 처리
    setPendingRecurringEdit(event);
    setRecurringDialogMode('edit');
    setIsRecurringDialogOpen(true);
  }
);

// 일정 박스에 드래그 핸들러 추가
<Box
  key={event.id}
  draggable
  onDragStart={() => handleDragStart(event)}
  onDragEnd={handleDragEnd}
  sx={{
    opacity: dragState.draggedEvent?.id === event.id ? 0.5 : 1,
    cursor: 'grab',
    // ... 기존 스타일
  }}
>
  {/* 일정 내용 */}
</Box>

// 날짜 셀에 드롭 핸들러 추가
<TableCell
  onDragOver={(e) => {
    e.preventDefault();
    handleDragOver(dateString);
  }}
  onDrop={() => handleDrop(dateString)}
  sx={{
    backgroundColor: dragState.targetDate === dateString ? '#e3f2fd' : 'transparent',
    // ... 기존 스타일
  }}
>
  {/* 셀 내용 */}
</TableCell>
```

---

## 테스트 케이스 요약

### 단위 테스트 (useDragAndDrop.spec.ts)

1. ✅ 드래그 시작 시 상태가 올바르게 설정되는지 확인
2. ✅ 드래그 종료 시 상태가 초기화되는지 확인
3. ✅ 동일한 날짜에 드롭 시 API 호출이 발생하지 않는지 확인
4. ✅ 다른 날짜에 드롭 시 올바른 날짜로 변경되는지 확인
5. ✅ 반복 일정 드롭 시 콜백이 호출되는지 확인

### 통합 테스트 (dragAndDropWorkflow.spec.tsx)

1. ✅ 일반 일정을 다른 날짜로 드래그 앤 드롭하여 이동
2. ✅ 반복 일정 드롭 시 다이얼로그가 표시되고 수정 완료
3. ✅ 겹치는 일정이 있을 때 경고 다이얼로그 표시
4. ✅ 주간 뷰에서 드래그 앤 드롭 동작
5. ✅ API 실패 시 원래 위치로 복원

### E2E 테스트

1. ✅ 사용자가 일정을 드래그하여 다른 날짜로 이동하는 전체 플로우
2. ✅ 반복 일정 드래그 앤 드롭 플로우 (단일/전체 수정)
3. ✅ 겹침 경고를 무시하고 강제로 이동하는 플로우

---

## 참고사항

- 기존 `isRecurringEvent` 함수를 활용하여 반복 일정 여부 판단
- 기존 `findOverlappingEvents` 함수를 활용하여 겹침 감지
- 기존 `handleRecurringEdit` 함수를 활용하여 반복 일정 수정
- 기존 일정 겹침 다이얼로그(`isOverlapDialogOpen`)를 재사용

---

## 작업 완료 체크리스트

- [ ] `useDragAndDrop` 훅 구현 완료
- [ ] App.tsx에 드래그 앤 드롭 통합 완료
- [ ] 월간 뷰 드래그 앤 드롭 동작 확인
- [ ] 주간 뷰 드래그 앤 드롭 동작 확인
- [ ] 반복 일정 드래그 앤 드롭 동작 확인
- [ ] 일정 겹침 경고 동작 확인
- [ ] 단위 테스트 작성 완료
- [ ] 통합 테스트 작성 완료
- [ ] E2E 테스트 작성 완료
- [ ] 접근성 검증 완료
