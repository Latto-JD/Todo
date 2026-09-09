# 할 일 관리 앱 PRD

## 1. Why - 목적
- 일일 할 일 → 주간 계획 → 월간 계획 → 1년 목표를 하나의 구조로 연결하여 목표 실행력 강화
- 하위 실행(할 일)이 상위 목표(주/월/년) 진행률에 자동 반영되어 목표 달성도를 실시간으로 가시화
- 드래그 앤 드롭 기반 상태 변경으로 할 일 관리 마찰 최소화

## 2. Who - 타깃 사용자
- 목표 지향적 자기관리를 하는 개인 사용자
- OKR/GTD 방식의 계획 수립에 익숙한 직장인, 학생, 프리랜서
- 일/주/월/년 단위 계획을 연동해서 관리하고 싶은 사용자

## 3. User Flow
1. 1년 목표 생성
2. 월간 목표 생성 → 1년 목표에 연결
3. 주간 계획 생성 → 월간 목표에 연결
4. 할 일 생성 → 주간 계획에 연결
5. 보드 뷰에서 할 일 상태(Todo/Doing/Done) 확인
6. 드래그 앤 드롭으로 할 일 상태 변경
7. 상태 변경 즉시 주간 진행률 재계산 → 월간 → 연간 순으로 반영
8. 주간/월간/연간 대시보드에서 진행률 확인
9. 할 일/계획/목표 수정 및 삭제

## 4. 기능 요구 사항

### P0 - 핵심 기능
- **할 일 CRUD**
  - 생성: 제목, 설명, 마감일, 상위 주간 계획 연결(id)
  - 수정: 제목/설명/마감일/상태/상위 연결 변경
  - 삭제: 확인 모달 후 하드 삭제, 삭제 시 상위 진행률 재계산
- **상태 관리**
  - 상태값: Todo / Doing / Done 3단계
  - 상태는 자유 전이(임의 방향 이동 가능)
  - Done 진입 시 완료 시각(completed_at) 기록, Done 이탈 시 초기화
- **드래그 앤 드롭 상태 변경**
  - 칸반 보드 뷰: Todo / Doing / Done 3개 컬럼
  - 컬럼 간 드래그 시 상태 필드 즉시 업데이트
  - 같은 컬럼 내 드래그 시 정렬 순서(order) 저장
- **기간 구조**
  - 엔티티: DailyTask(할 일) / WeeklyPlan(주간 계획) / MonthlyGoal(월간 목표) / YearlyGoal(1년 목표)
  - 공통 필드: id, title, description, period_start, period_end, status/progress
  - 각 엔티티는 기간(주차/월/연도) 단위로 조회 가능
- **구조 연결**
  - DailyTask.parent_id → WeeklyPlan.id
  - WeeklyPlan.parent_id → MonthlyGoal.id
  - MonthlyGoal.parent_id → YearlyGoal.id
  - 상위 미연결 항목은 "미분류"로 별도 조회
- **주간/월간 진행률 자동 반영**
  - WeeklyPlan.progress = (Done 상태 하위 DailyTask 수 ÷ 전체 하위 DailyTask 수) × 100
  - MonthlyGoal.progress = 하위 WeeklyPlan.progress 평균
  - YearlyGoal.progress = 하위 MonthlyGoal.progress 평균
  - 하위 항목 상태 변경 시 상위 항목까지 실시간(동기) 재계산

### P1 - 추가 기능
- 반복 할 일(매일/매주 자동 생성)
- 마감일 알림/리마인더
- 태그 및 카테고리 분류
- 캘린더 뷰(일/주/월)
- 기간별 완료율 추이 통계 대시보드
- 검색 및 필터(상태/기간/태그별)
- 다크 모드
- 팀 단위 공유 및 협업
