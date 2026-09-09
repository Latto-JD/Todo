# 할 일 관리 앱 (4계층 목표관리)

일일 할 일 → 주간 계획 → 월간 목표 → 1년 목표를 부모-자식으로 연결하고,
하위 할 일의 상태 변경이 상위 진행률에 **동기적으로** 자동 반영되는 목표 관리 웹앱.

- 4계층 엔티티(DailyTask / WeeklyPlan / MonthlyGoal / YearlyGoal) CRUD
- 칸반 보드에서 Todo / Doing / Done 드래그 앤 드롭
- 상태 변경 즉시 주간 → 월간 → 연간 진행률 재계산 (denormalized, 서비스 계층 캐스케이드)
- 주간 / 월간 / 연간 대시보드

기획·설계 문서: [`docs/PRD.md`](docs/PRD.md), [`docs/PLAN.md`](docs/PLAN.md), 아키텍처: [`docs/CLAUDE.md`](docs/CLAUDE.md)

## 기술 스택

| 영역 | 선택 |
|---|---|
| 프레임워크 | Next.js 16 (App Router), React 19, TypeScript |
| DB | MongoDB (Mongoose 9) — Atlas M0 또는 로컬 replica set |
| API | Next.js Route Handlers (`app/api/**`), 서버 로직은 `lib/services` |
| 검증 | zod 4 (`lib/validation`) — 요청 검증 + 도메인 타입 원천 |
| 드래그 앤 드롭 | @dnd-kit/core + @dnd-kit/sortable |
| 서버 상태 | TanStack Query v5 (낙관적 업데이트 + 무효화) |
| 스타일 | Tailwind CSS v4 |
| 테스트 | Vitest + next-test-api-route-handler + mongodb-memory-server(replica set) + Playwright |

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수

`.env.local` 파일을 만들고 MongoDB 연결 문자열을 넣습니다 (`.env.local.example` 참고):

```
MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/todoapp
```

> 진행률 재계산은 MongoDB 트랜잭션을 사용합니다. 트랜잭션은 **replica set**(Atlas는 기본 제공,
> 로컬은 `mongod --replSet rs0` + `rs.initiate()`)에서 동작하며, 미지원 환경에서는 순차 쓰기로
> 자동 폴백합니다.

### 3. 샘플 데이터 시드 (선택)

```bash
npm run seed
```

1 YearlyGoal → 2 MonthlyGoal → 4 WeeklyPlan → 12 DailyTask를 삽입합니다.

### 4. 개발 서버

```bash
npm run dev
```

- http://localhost:3000 — 홈
- `/hierarchy` — 연간→월간→주간 트리 탐색 + CRUD
- `/board` — 칸반 보드 (주간 계획 선택 후 드래그)
- `/dashboard` — 주간/월간/연간 진행률
- `/api/health` — `{ ok: true, db: "connected" }`

## npm 스크립트

| 스크립트 | 설명 |
|---|---|
| `npm run dev` | 개발 서버 (`.env.local` 자동 로드) |
| `npm run build` | 프로덕션 빌드 |
| `npm run start` | 프로덕션 서버 |
| `npm run lint` | ESLint |
| `npm test` | Vitest — 서비스/진행률/route 통합 테스트 (in-memory MongoDB replica set, 실제 DB 미접촉) |
| `npm run test:watch` | Vitest watch 모드 |
| `npm run test:e2e` | Playwright e2e (`npm run dev`를 띄우므로 `.env.local`의 실제 DB 사용, 스펙이 자체 픽스처 생성·정리) |
| `npm run seed` | 샘플 데이터 삽입 (`.env.local`의 실제 DB) |

## 프로젝트 구조

```
app/
  page.tsx                     홈
  hierarchy/                   연간→월간→주간 트리 + CRUD
  board/                       칸반 보드 + DnD
  dashboard/                   진행률 대시보드
  api/
    health/                    DB 연결 확인
    daily-tasks/  weekly-plans/  monthly-goals/  yearly-goals/
                                 GET(목록) POST / GET PATCH DELETE([id])
    daily-tasks/[id]/move/     PATCH — status + order 원자 갱신 + 진행률 재계산
    board/                     GET ?parent_id= → { todo, doing, done }
    dashboard/{weekly,monthly,yearly}/[id]/   계층별 진행률 요약
components/                     KanbanColumn, TaskCard, EntityForm, ConfirmDeleteModal, ProgressBar, Toast ...
lib/
  db.ts                        Mongoose 연결 (global 캐시)
  models/                      Mongoose 스키마 4개 + 공통 base
  validation/                  zod 스키마 (create/update/query) + 파생 타입
  services/                    비즈니스 로직 (엔티티별 + progressService 캐스케이드)
  api-error.ts                 중앙 에러 → JSON 매핑, handleRoute 래퍼
  api-client.ts                클라이언트 fetch 래퍼
  queries/                     TanStack Query 훅
scripts/seed.ts                샘플 데이터
tests/                         Vitest (services, progress matrix, api routes)
e2e/                           Playwright
```

## 배포

Next.js 네이티브인 [Vercel](https://vercel.com) 권장. `MONGODB_URI` 환경 변수를 설정하세요.
