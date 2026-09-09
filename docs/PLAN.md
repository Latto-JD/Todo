# 할 일 관리 앱 — 프로젝트 계획

- **상태:** approved & implemented (2026-09-09)
- **구현:** ralph 세션 완료 — 8개 스토리(US-001..US-008) 전부 passes. 아키텍처·실행법: docs/CLAUDE.md
- **작성일:** 2026-09-09 (개정 1: Next.js 단일 앱으로 전환)
- **기반 문서:** `docs/PRD.md`
- **모드:** plan (direct)

---

## 0. 확정 및 가정한 결정 사항

| 항목 | 결정 | 근거 / 대안 |
|---|---|---|
| 영속성 | **MongoDB** (사용자 지정) | Mongoose ODM. 대안: Postgres |
| 앱 구조 | **Next.js 15 (App Router) 단일 앱** (사용자 지정) | UI + API Route Handlers 한 프로젝트. 별도 백엔드 서버 없음. 대안: Vite SPA + Express |
| 언어 | **TypeScript** | |
| API 계층 | **Next.js Route Handlers** (`app/api/**/route.ts`) | 서버 로직은 `lib/services`에, route는 얇게 |
| 드래그 앤 드롭 | **@dnd-kit/core + @dnd-kit/sortable** | 접근성/성능, React 19 호환. 대안: react-beautiful-dnd(유지보수 중단) |
| 서버 상태 관리 | **TanStack Query v5** (클라이언트 컴포넌트) | 낙관적 업데이트 + 무효화로 진행률 실시간 반영 |
| 라우팅 | **Next.js App Router 파일 기반** | 별도 router 라이브러리 불필요 |
| 사용자 범위 | **단일 사용자, 인증 없음** | PRD P0에 인증 요구 없음. P1 '팀 공유'는 §8 backlog |
| v1 범위 | **P0만** | PRD의 P1은 §8 backlog |
| DB 호스팅 | **MongoDB Atlas 무료 티어 (M0)** | replica set 기본 제공 → 트랜잭션 사용 가능. 로컬 대안: `mongod --replSet` |
| 배포 대상 | **Vercel** (기본 가정) | Next.js 네이티브. 로컬 실행만 해도 무방 |
| 테스트 | Vitest(단위/서비스) + `next-test-api-route-handler`(route 통합) + Playwright(e2e 스모크) | |

프로젝트 루트: `D:\demo\Claude-demo\OMC-test` (git 리포지토리 아님 → `git init` 필요). Next.js 앱을 **루트에 생성**하고 기존 `docs/`는 유지.

---

## 1. 요구사항 요약 (Requirements Summary)

일일 할 일 → 주간 계획 → 월간 목표 → 1년 목표를 부모-자식으로 연결하고, 하위 할 일의 상태 변경이 상위 진행률에 **동기적으로** 자동 반영되는 목표 관리 웹앱.

**핵심 흐름:** 4계층 엔티티 CRUD → 칸반 보드에서 Todo/Doing/Done 드래그 → 상태 변경 즉시 주간→월간→연간 진행률 재계산 → 대시보드에서 확인.

**P0 기능 (구현 대상):**
1. 4개 엔티티(DailyTask / WeeklyPlan / MonthlyGoal / YearlyGoal) CRUD
2. 상태 관리: Todo/Doing/Done 자유 전이, Done 진입 시 `completed_at` 기록·이탈 시 초기화
3. 칸반 보드 3컬럼 + 컬럼 간 드래그(상태 변경) + 컬럼 내 드래그(`order` 저장)
4. 기간 구조: 공통 필드(id, title, description, period_start, period_end, status/progress), 기간 단위 조회
5. 구조 연결: `parent_id` 체인, 미연결 항목은 "미분류" 별도 조회
6. 진행률 자동 반영: 주간=Done 비율, 월간=하위 주간 평균, 연간=하위 월간 평균, 하위 변경 시 상위까지 동기 재계산

**P1 (범위 외 — §8 backlog):** 반복 할 일, 알림, 태그/카테고리, 캘린더 뷰, 추이 통계, 검색/필터, 다크 모드, 팀 공유.

---

## 2. 아키텍처 설계

### 2.1 앱 레이아웃 (Next.js App Router)

```
app/
  layout.tsx                  루트 레이아웃 + <QueryClientProvider> (client 경계)
  page.tsx                    → /dashboard 리다이렉트 또는 홈
  board/page.tsx              칸반 보드 뷰 (client component)
  hierarchy/page.tsx          연간→월간→주간 트리 네비게이션
  dashboard/page.tsx          주간/월간/연간 진행률 카드
  api/
    health/route.ts
    daily-tasks/route.ts          GET(목록) POST
    daily-tasks/[id]/route.ts     GET PATCH DELETE
    daily-tasks/[id]/move/route.ts PATCH (status+order)
    weekly-plans/route.ts , weekly-plans/[id]/route.ts
    monthly-goals/route.ts , monthly-goals/[id]/route.ts
    yearly-goals/route.ts , yearly-goals/[id]/route.ts
    board/route.ts                GET ?parent_id=
    dashboard/weekly/[id]/route.ts , dashboard/monthly/[id]/route.ts , dashboard/yearly/[id]/route.ts
components/
  KanbanColumn.tsx  TaskCard.tsx  EntityForm.tsx  ConfirmDeleteModal.tsx  ProgressBar.tsx
  QueryProvider.tsx
lib/
  db.ts                       Mongoose 연결 (전역 캐시 — dev HMR 대비)
  models/                     Mongoose 스키마 4개
  services/                   비즈니스 로직 (엔티티별 + progressService)
  validation/                 zod 스키마 (요청 + 공유 도메인 타입 원천)
  api-client.ts               fetch 래퍼 (클라이언트 컴포넌트용)
  queries/                    TanStack Query 훅 (useTasks, useBoard, useDashboard, mutations)
  date.ts                     주차 계산 유틸 + 단위 테스트 대상
tests/ , e2e/
```

**핵심: Route Handler는 얇게.** 검증(zod) → `lib/services` 호출 → 응답 직렬화만. 모든 DB 쓰기와 진행률 재계산은 서비스 계층에 집중.

**Mongoose 연결:** `lib/db.ts`는 `global` 캐시 패턴으로 Next dev HMR·서버리스 환경에서 커넥션 폭증 방지. 모든 route handler는 `runtime = 'nodejs'` (Edge 아님 — Mongoose 필요).

### 2.2 데이터 모델 (MongoDB / Mongoose)

4개 컬렉션 분리. 공통 필드 공유.

**공통 필드 (모든 엔티티)**
```
_id           ObjectId
title         string   (required, 1~200자)
description   string   (optional, ~2000자)
period_start  Date     (required)
period_end    Date     (required, >= period_start)
createdAt     Date     (auto)
updatedAt     Date     (auto)
```

**DailyTask** (`dailytasks`)
```
due_date      Date | null
status        enum('todo','doing','done')  default 'todo'
completed_at  Date | null   (status='done' 진입 시 Date.now, 이탈 시 null)
order         number   (같은 status 컬럼 내 정렬, 기본 = 생성 시 max+1)
parent_id     ObjectId | null → WeeklyPlan   (null = 미분류)
```

**WeeklyPlan** (`weeklyplans`) — `progress` 0~100 denormalized, `parent_id → MonthlyGoal`
**MonthlyGoal** (`monthlygoals`) — `progress` 0~100 denormalized, `parent_id → YearlyGoal`
**YearlyGoal** (`yearlygoals`) — `progress` 0~100 denormalized, parent 없음

**인덱스**
- 모든 컬렉션: `{ period_start: 1, period_end: 1 }`, `{ parent_id: 1 }`
- `dailytasks`: `{ parent_id: 1, status: 1, order: 1 }`

**직렬화:** `toJSON`에서 `_id`→`id`(string), `__v` 제거. zod 스키마로 응답 타입 = 클라이언트 도메인 타입 단일 원천.

### 2.3 진행률 재계산 — 핵심 설계 결정

**방식: denormalized 저장 + 서비스 계층 동기 캐스케이드**

`progressService.recalculate(entityType, entityId)`:
1. 대상 엔티티 progress 재계산 후 저장
2. `parent_id`를 따라 상위로 반복 (Weekly → Monthly → Yearly, 최대 3단계)
3. 모든 쓰기를 하나의 MongoDB 트랜잭션(`session.withTransaction`)으로 묶음 — Atlas M0가 replica set이므로 사용 가능

계산식:
- `WeeklyPlan.progress` = round(하위 DailyTask 중 done 개수 / 전체 하위 개수 × 100), 하위 0개면 0
- `MonthlyGoal.progress` = round(하위 WeeklyPlan.progress 평균), 하위 0개면 0
- `YearlyGoal.progress` = round(하위 MonthlyGoal.progress 평균), 하위 0개면 0

**트리거 지점 (서비스 계층):** DailyTask create / update(status·parent_id 변경 시) / delete, WeeklyPlan·MonthlyGoal의 create / update(parent_id) / delete, `move` 엔드포인트. parent 재지정 시 **이전 parent와 새 parent 양쪽** 재계산.

**증분 아님:** 매 재계산은 DB 현재 상태를 재조회해 계산 → 동시 변경 race 방지.

**대안(기각):** 읽기 시 aggregation 계산 — 매 조회마다 트리 순회, "progress를 필드로 저장"하는 PRD 명세와 불일치.

### 2.4 API 계약 (Next.js Route Handlers, 베이스 `/api`)

각 엔티티(`daily-tasks`, `weekly-plans`, `monthly-goals`, `yearly-goals`):
```
GET    /api/{entity}?from=<ISO>&to=<ISO>&parent_id=<id>&unassigned=true
POST   /api/{entity}
GET    /api/{entity}/[id]
PATCH  /api/{entity}/[id]
DELETE /api/{entity}/[id]
```
추가:
```
GET    /api/board?parent_id=<weeklyPlanId>   → { todo:[...], doing:[...], done:[...] }  order 오름차순
PATCH  /api/daily-tasks/[id]/move            → body { status, order } 원자 갱신 + 진행률 재계산
GET    /api/dashboard/weekly/[id]            → weekly + 하위 task 요약 + progress
GET    /api/dashboard/monthly/[id]           → monthly + 하위 weekly progress 목록
GET    /api/dashboard/yearly/[id]            → yearly + 하위 monthly progress 목록
```
- 검증: **zod**, 실패 시 `400 { error: { code:'VALIDATION', message, details } }`
- 에러 포맷: `{ error: { code, message, details? } }`, 404/500 중앙 헬퍼 (`lib/api-error.ts`)
- 삭제: 하드 삭제. 하위가 있는 상위 삭제 시 하위 `parent_id=null`(미분류 강등) 후 양쪽 진행률 재계산 → 고아 방지
- 모든 route handler: `export const runtime = 'nodejs'`, `export const dynamic = 'force-dynamic'`

### 2.5 프론트엔드 동작

- **클라이언트 컴포넌트 + TanStack Query** 중심 (실시간 낙관적 업데이트 필요). 서버 컴포넌트는 초기 셸/레이아웃만.
- `components/QueryProvider.tsx`가 `layout.tsx`를 감쌈.
- **드래그:** `DndContext` + 컬럼별 `SortableContext`. `onDragEnd`에서 (a) 다른 컬럼 → `move` mutation(status+order), (b) 같은 컬럼 → order 일괄 PATCH. 낙관적 업데이트 후 `board`·`dashboard` 쿼리 무효화로 진행률 갱신.
- **CRUD:** `EntityForm`(엔티티별 필드 분기), 삭제는 `ConfirmDeleteModal` 필수.

---

## 3. 구현 단계 (Implementation Steps)

### M1 — 프로젝트 스캐폴딩
- `git init`, `.gitignore` (`.next`, `node_modules`, `.env*`, `.omc/` 운영 아티팩트)
- `npx create-next-app@latest . --typescript --app --eslint --src-dir=false --import-alias "@/*"` (루트 생성, `docs/` 보존 확인)
- 의존성: `mongoose zod @tanstack/react-query @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities`
- 개발 의존성: `vitest @vitejs/plugin-react next-test-api-route-handler @playwright/test @testing-library/react @testing-library/jest-dom`
- `.env.local.example` — `MONGODB_URI=`
- `lib/db.ts` — global 캐시 Mongoose 연결
- `app/api/health/route.ts` — `{ ok: true, db: 'connected' }`
- `components/QueryProvider.tsx` + `layout.tsx` 통합
- npm 스크립트: `dev`, `build`, `start`, `test`, `test:e2e`, `lint`, `seed`
- **완료 기준:** `npm run dev` → `http://localhost:3000/api/health` 가 `{ ok:true, db:'connected' }` 200 반환; `npm run build` 무오류

### M2 — 데이터 계층
- `lib/models/` — 4개 Mongoose 스키마 + 인덱스 (§2.2), 공통 옵션(timestamps, toJSON 변환)
- `lib/validation/` — 엔티티별 zod 스키마(create/update/query) + 파생 TS 타입
- `lib/db.ts` 재사용, 연결 실패 시 명확한 에러
- 시드 스크립트 `scripts/seed.ts` (tsx 실행) — 샘플 1년/2월/4주/12할일
- **완료 기준:** `npm run seed` 후 `mongosh`로 4개 컬렉션 문서 + `getIndexes()` 검증

### M3 — CRUD Route Handlers + 서비스
- `lib/services/` — 엔티티별 서비스 (list/get/create/update/delete), 라우터는 얇게
- `app/api/{entity}/route.ts`, `app/api/{entity}/[id]/route.ts` — zod 검증 → 서비스 호출
- 기간 조회(`from`/`to` overlap 쿼리), `unassigned=true`, `parent_id` 필터
- `lib/api-error.ts` 중앙 에러 → JSON 응답 매핑
- DailyTask status='done' 전이 시 `completed_at` set / 이탈 시 null
- **완료 기준:** `next-test-api-route-handler`로 4개 엔티티 × (create/read/list/update/delete) + 기간 필터 + 미분류 필터 통합 테스트 통과

### M4 — 진행률 재계산 서비스 (§2.3)
- `lib/services/progressService.ts` — `recalculate(type, id)` 캐스케이드 + `withTransaction` 래퍼
- CRUD 서비스의 트리거 지점에 연결 (create / update-status / update-parent / delete)
- `app/api/daily-tasks/[id]/move/route.ts` — status+order 원자 갱신 후 재계산
- parent 재지정 시 old/new 양쪽; 상위 삭제 시 하위 강등 + 재계산
- **완료 기준:** §6 테스트 매트릭스 P1~P9 통과

### M5 — 프론트엔드 기반
- `lib/api-client.ts`, `lib/queries/` — TanStack Query 훅 + 에러 토스트
- `app/hierarchy/page.tsx` — 연간→월간→주간 탐색
- `components/EntityForm.tsx`(엔티티별 필드), `ConfirmDeleteModal.tsx`, `ProgressBar.tsx`
- **완료 기준:** hierarchy 화면에서 4개 엔티티 생성/수정/삭제(확인 모달) UI 동작, 목록이 서버와 일치

### M6 — 칸반 보드 + 드래그 앤 드롭
- `app/board/page.tsx` — 주간 계획 선택기 + `GET /api/board`
- `DndContext` + 컬럼별 `SortableContext`, `TaskCard` 드래그 핸들
- `onDragEnd`: 컬럼 간 → `move` mutation, 컬럼 내 → order 일괄 갱신
- 낙관적 업데이트 + 롤백, 완료 후 `board`/`dashboard` 무효화
- 빈 컬럼 드롭, 드래그 중 시각 피드백
- **완료 기준:** e2e 스모크 — 카드를 Done으로 드래그 시 (a) 즉시 이동, (b) 주간 진행률 바 증가, (c) 새로고침 후 유지

### M7 — 대시보드
- `app/dashboard/page.tsx` — 주간/월간/연간 진행률 카드 + 하위 progress 목록
- 기간 선택(현재 주/월/연 기본), 미분류 섹션
- **완료 기준:** 보드에서 상태 변경 → 대시보드 3계층 progress가 §2.3 계산식과 일치

### M8 — 통합·검증·문서
- e2e 스모크(Playwright): PRD User Flow 1~9 전체 경로
- `docs/CLAUDE.md`(빈 파일) — 아키텍처·실행법 작성
- `README.md` — 설치, `.env.local`(MongoDB Atlas URI), 스크립트
- `docs/PLAN.md`(빈 파일) — 이 계획 요약/링크
- **완료 기준:** §5 인수 기준 1~24 통과, `npm test` + `npm run test:e2e` 그린

---

## 4. 마일스톤 의존성

```
M1 → M2 → M3 → M4 ┐
              M5 ─┼→ M6 → M7 → M8
M1 ─────────→ M5 ┘
```
- M5는 M2(타입) 이후 목업으로 선행 가능, M3와 부분 병렬
- M4는 M3 완료 필수, M6는 M4 + M5 필수

---

## 5. 인수 기준 (Acceptance Criteria — testable)

**엔티티 CRUD**
1. 4개 엔티티 각각 `POST` 생성 시 201 + `id` 반환, 필수 필드 누락 시 400
2. `period_end < period_start` 요청은 400
3. `PATCH`로 title/description/period 변경 시 변경 필드만 갱신, `updatedAt` 증가
4. `DELETE` 시 204, 이후 `GET /[id]`는 404
5. DailyTask 삭제 시 상위 WeeklyPlan.progress 재계산됨(criteria 12 참조)

**상태 관리**
6. DailyTask status를 todo→doing→done→todo 임의 순서로 전이 가능(제약 없음)
7. status를 'done'으로 변경 시 응답 `completed_at`이 non-null ISO 날짜
8. status를 'done'에서 다른 값으로 변경 시 `completed_at`이 null

**칸반 보드 / DnD**
9. `GET /api/board?parent_id=X`는 `todo/doing/done` 배열, 각 배열 `order` 오름차순
10. 카드를 다른 컬럼으로 드롭 → task `status`가 대상 컬럼 값으로 DB 반영(새로고침 후 유지)
11. 같은 컬럼 내 순서 변경 → 관련 task `order` 갱신, 새로고침 후 순서 유지

**진행률 자동 반영**
12. WeeklyPlan에 하위 DailyTask 4개(done 1개) → WeeklyPlan.progress == 25
13. 하위 DailyTask 0개인 WeeklyPlan.progress == 0
14. MonthlyGoal 하위 WeeklyPlan progress [50, 100] → MonthlyGoal.progress == 75
15. YearlyGoal 하위 MonthlyGoal progress [0, 50, 100] → YearlyGoal.progress == 50
16. DailyTask 하나를 done 전환 시 단일 API 사이클 내 Weekly·Monthly·Yearly progress 모두 갱신(재조회 시 확정값)
17. DailyTask `parent_id`를 WeeklyPlan A→B로 변경 시 A와 B의 progress 모두 재계산
18. `move` 엔드포인트로 done 전환 시에도 16과 동일하게 상위 progress 갱신

**구조 연결**
19. `parent_id`가 null인 항목은 `?unassigned=true`로만 조회, 부모 progress 계산에서 제외
20. 하위 있는 WeeklyPlan 삭제 시 하위 DailyTask `parent_id`가 null로 바뀌고 조회 가능(고아 없음)

**기간 조회**
21. `GET /api/{entity}?from=A&to=B`는 `period_start`/`period_end`가 [A,B]와 겹치는 문서만 반환

**품질 게이트**
22. `npm test` (서비스 단위 + route 통합 + `lib/date.ts` 단위) 전부 통과
23. `npm run test:e2e` (Playwright): PRD User Flow 1~9 통과
24. `npm run build` 무오류, `npm run lint` 경고/에러 0

---

## 6. 진행률 테스트 매트릭스 (M4)

| # | 초기 상태 | 액션 | 기대 결과 |
|---|---|---|---|
| P1 | Weekly W, 하위 task 0 | task 생성(todo) | W.progress 0 |
| P2 | W, task 4개 todo | 1개 done | W.progress 25 |
| P3 | W.progress 25 | done task를 todo로 | W.progress 0 |
| P4 | Monthly M ← W1(50), W2(100) | 재계산 트리거 | M.progress 75 |
| P5 | Yearly Y ← M1(0), M2(50), M3(100) | M2 재계산 트리거 | Y.progress 50 |
| P6 | task in W1 | parent를 W2로 변경 | W1, W2 + 상위 M, Y 모두 재계산 |
| P7 | W에 task 3개(done 1) | task 1개 삭제(todo) | W.progress 50 |
| P8 | M ← W1 | W1 삭제 | M.progress 재계산, W1 하위 task는 미분류 |
| P9 | 같은 W 하위 task 2개를 병렬 done | 동시 PATCH | 최종 W.progress 정확(트랜잭션/재조회 일관성) |

---

## 7. 리스크 및 완화 (Risks & Mitigations)

| 리스크 | 영향 | 완화 |
|---|---|---|
| Mongoose + Next.js 서버리스/HMR에서 커넥션 폭증 | dev 불안정, 배포 시 연결 한도 초과 | `lib/db.ts` global 캐시 패턴, route handler `runtime='nodejs'` 고정 |
| MongoDB 트랜잭션은 replica set 필요 | M4 차단 | Atlas M0(replica set 기본) 사용. 로컬은 `mongod --replSet rs0` + `rs.initiate()` 스크립트. 폴백: 트랜잭션 없이 순차 쓰기(단일 사용자 실용상 무방, P9만 약화) |
| 진행률 캐스케이드 트리거 누락 | 잘못된 progress 표시 | 트리거를 `lib/services` 한 곳에 집중, route handler에서 모델 직접 쓰기 금지. §6 매트릭스로 회귀 방지 |
| 동시 상태 변경 race | 간헐적 progress 오차 | 재계산을 DB 재조회 기반(증분 아님) + 트랜잭션 |
| @dnd-kit 낙관적 업데이트와 서버 order 불일치 | 새로고침 시 순서 튐 | mutation 성공 후 `board` 쿼리 무효화 → 서버 정렬이 소스 오브 트루스. 실패 시 스냅샷 롤백 |
| Next Route Handler 캐싱으로 stale 응답 | 목록이 갱신 안 됨 | 데이터 route에 `dynamic='force-dynamic'`, GET 응답 `no-store` |
| 상위 삭제 시 하위 고아화 | 데이터 정합성 | 삭제 서비스에서 하위 `parent_id=null` 강등 + 양쪽 재계산 (criteria 20) |
| period(주차) 계산 모호 (주 시작 요일 등) | 기간 조회 부정확 | `period_start`/`period_end`를 클라이언트가 명시 전달, 서버는 overlap 쿼리만. 주차 계산은 `lib/date.ts` 캡슐화 + 단위 테스트 |
| `create-next-app`이 루트 파일과 충돌 | 스캐폴딩 실패 | 사전에 `docs/` 외 루트 비어있음 확인, 실패 시 임시 디렉터리 생성 후 병합 |
| git 리포지토리 아님 | 커밋/이력 없음 | M1에서 `git init` |
| 빈 `docs/CLAUDE.md`, `docs/PLAN.md` | 컨텍스트 손실 | M8에서 작성 |

---

## 8. 범위 외 — P1 Backlog

우선순위 제안(높음→낮음): 검색/필터 → 다크 모드 → 추이 통계 대시보드 → 태그/카테고리 → 캘린더 뷰 → 마감일 알림 → 반복 할 일 → 팀 공유/협업(인증·권한 모델 도입 필요, 대규모).

각 항목은 별도 계획 세션에서 상세화.

---

## 9. 검증 단계 (Verification Steps)

1. `npm install && npm run dev` — `http://localhost:3000/api/health` 200 `{ ok:true, db:'connected' }`
2. `npm run seed` — 샘플 삽입, `mongosh`로 4개 컬렉션·인덱스 확인
3. `npm test` — 서비스 단위 + route 통합(`next-test-api-route-handler`) + `lib/date.ts`; §6 매트릭스 P1~P9 포함
4. `npm run test:e2e` — Playwright, PRD User Flow 1~9:
   - 1년 목표 생성 → 월간 생성·연결 → 주간 생성·연결 → 할 일 생성·연결
   - 보드에서 할 일 Doing→Done 드래그 → 주간 진행률 바 즉시 증가
   - 대시보드에서 월간·연간 진행률 반영 확인
   - 할 일 수정(제목/마감일/상위 변경), 삭제(확인 모달) 후 진행률 재계산 확인
5. `npm run build` — 프로덕션 빌드 무오류
6. `npm run lint` — 0 경고
7. verifier 에이전트로 인수 기준 §5 (1~24) 전수 확인 + 증거 수집

---

## 10. 예상 산출물 트리

```
OMC-test/
  package.json  next.config.ts  tsconfig.json  .env.local.example  .gitignore  README.md
  playwright.config.ts  vitest.config.ts
  app/
    layout.tsx  page.tsx  globals.css
    board/page.tsx  hierarchy/page.tsx  dashboard/page.tsx
    api/
      health/route.ts
      daily-tasks/route.ts  daily-tasks/[id]/route.ts  daily-tasks/[id]/move/route.ts
      weekly-plans/route.ts  weekly-plans/[id]/route.ts
      monthly-goals/route.ts  monthly-goals/[id]/route.ts
      yearly-goals/route.ts  yearly-goals/[id]/route.ts
      board/route.ts
      dashboard/weekly/[id]/route.ts  dashboard/monthly/[id]/route.ts  dashboard/yearly/[id]/route.ts
  components/
    QueryProvider.tsx  KanbanColumn.tsx  TaskCard.tsx  EntityForm.tsx  ConfirmDeleteModal.tsx  ProgressBar.tsx
  lib/
    db.ts  api-client.ts  api-error.ts  date.ts
    models/  services/  validation/  queries/
  scripts/seed.ts
  tests/            (vitest: services, date, api routes)
  e2e/              (playwright specs)
  docs/
    PRD.md  CLAUDE.md(작성)  PLAN.md(작성)
```

---

## 다음 단계

이 계획은 **승인되어 구현 완료**되었습니다 (2026-09-09, ralph 세션). US-001..US-008 전 스토리가
`npm test` + `npx playwright test` + `npm run build` + `npm run lint` 그린 상태로 통과했습니다.
아키텍처와 실행법은 `docs/CLAUDE.md`, 인수 기준 대응은 §5를 참고하세요.

후속 작업은 §8 P1 backlog에서 별도 계획 세션으로 진행합니다.
