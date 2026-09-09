# 아키텍처 & 실행 가이드

할 일 관리 앱(4계층 목표관리)의 구조와 로컬 실행 방법. 상위 요구사항은 [`PRD.md`](PRD.md),
설계 근거·결정 이력은 [`PLAN.md`](PLAN.md) 참고.

## 한눈에 보기

Next.js 16 App Router **단일 앱**. UI와 API가 한 프로젝트에 있고 별도 백엔드 서버가 없다.
데이터는 MongoDB(Mongoose). 단일 사용자, 인증 없음 (PRD P0 범위).

```
브라우저 (client component + TanStack Query)
   │  fetch /api/**
   ▼
Route Handler (app/api/**/route.ts)  ── 얇게: zod 검증 → 서비스 호출 → 직렬화
   ▼
서비스 계층 (lib/services/**)  ── 모든 DB 쓰기 + 진행률 재계산이 여기 집중
   ▼
Mongoose 모델 (lib/models/**)  →  MongoDB
```

## 계층별 책임

### `lib/models/` — 데이터 모델
- 4개 컬렉션: `dailytasks`, `weeklyplans`, `monthlygoals`, `yearlygoals`
- `base.ts`가 공통 필드(`title`, `description`, `period_start`, `period_end`) + `timestamps` +
  `toJSON` 변환(`_id`→`id` string, `__v`/`_id` 제거, `parent_id` 문자열화)를 제공
- `DailyTask`: `status`(todo/doing/done), `completed_at`, `order`, `due_date`, `parent_id`→WeeklyPlan
- `WeeklyPlan`/`MonthlyGoal`/`YearlyGoal`: `progress`(0~100, denormalized), `parent_id` 체인
- 인덱스: 모든 컬렉션 `{period_start, period_end}` + `{parent_id}`; `dailytasks` 추가 `{parent_id, status, order}`
- HMR 가드: `mongoose.models.X || mongoose.model('X', schema)`

> **주의:** `_id`→`id` 리네임은 `toJSON` 런타임 변환이라 TypeScript는 모른다.
> hydrated 문서를 응답 타입으로 캐스팅할 땐 `doc.toJSON() as unknown as XJSON` (2단계).

### `lib/validation/` — zod 스키마
- 엔티티별 `createX` / `updateX`(`.partial()`) / `xQuery`
- `period_end >= period_start`는 `.refine()` (update는 두 값이 다 있을 때만)
- 날짜는 ISO 문자열 수용 → `z.coerce.date()`
- `z.infer` 파생 타입이 클라이언트 도메인 타입의 단일 원천

### `lib/services/` — 비즈니스 로직
- `shared.ts`: `makeService(model, entityType)` 제네릭 CRUD, `buildListFilter`(기간 overlap +
  `parent_id` + `unassigned` + `status`), `CHILD_MODEL`/`PARENT_TYPE` 맵
- 엔티티별 서비스가 제네릭을 감쌈. `dailyTaskService`는 `completed_at` 조정(‘done’ 진입 시 스탬프, 이탈 시 null)
- **라우트에서 모델 직접 접근 금지** — 모든 쓰기는 서비스 경유
- `remove()`: 하드 삭제 전 자식 `parent_id=null` 강등 → 삭제 → 이전 부모 체인 재계산,
  전부 하나의 트랜잭션(`withOptionalTransaction`)

### `lib/services/progressService.ts` — 진행률 캐스케이드 (핵심)
- `recalculate(entityType, entityId)`: 대상 progress 재계산 후 `parent_id`를 따라 상위로
  최대 3단계(Weekly→Monthly→Yearly) 재계산
- **증분 아님** — 매 재계산이 DB 현재 상태를 재조회(`countDocuments` / 하위 progress 평균).
  동시 변경 race 방지
- 계산식 (모두 `Math.round`):
  - `WeeklyPlan.progress` = done 하위 DailyTask 수 / 전체 하위 수 × 100, 하위 0개 → 0
  - `MonthlyGoal.progress` = 하위 WeeklyPlan.progress 평균, 하위 0개 → 0
  - `YearlyGoal.progress` = 하위 MonthlyGoal.progress 평균, 하위 0개 → 0
- `withOptionalTransaction`: `hello` 명령으로 replica set(`setName`)/mongos(`isdbgrid`) 감지,
  지원 시 `session.withTransaction`으로 캐스케이드 전체를 원자 처리. 미지원(standalone mongod,
  replSet 없는 memory-server)이면 세션 없이 순차 쓰기로 폴백
- 트리거: `lib/services/progressHook.ts`의 `onEntityMutated` seam — create/update/remove 후 호출.
  parent 재지정 시 이전·새 부모 양쪽 재계산

### `app/api/**` — Route Handlers
- 전부 `export const runtime = 'nodejs'` + `export const dynamic = 'force-dynamic'`
- `lib/api-error.ts`의 `handleRoute(fn)`로 감쌈: throw를 `{ error: { code, message, details? } }`로
  직렬화, 모든 응답에 `Cache-Control: no-store`
- 에러 코드: `VALIDATION`(400, zod 실패 + `details`), `NOT_FOUND`(404), `INTERNAL`(500)
- 엔티티 라우트: `GET ?from&to&parent_id&unassigned` / `POST` / `GET|PATCH|DELETE /[id]`
- `PATCH /api/daily-tasks/[id]/move` — `{ status, order }` 원자 갱신 + 캐스케이드
- `GET /api/board?parent_id=` — `{ todo, doing, done }`, 각 `order` 오름차순
- `GET /api/dashboard/{weekly,monthly,yearly}/[id]` — 계층 + denormalized progress + 하위 요약 (읽기 전용, 재계산 안 함)

### 프론트엔드
- `lib/api-client.ts`: `apiGet/apiPost/apiPatch/apiDelete`, `{ error }` 봉투를 `ApiClientError`로 변환
- `lib/queries/`: `keys`(쿼리 키 팩토리), `entities.ts`(제네릭 CRUD 훅), `board.ts`, `dashboard.ts`
- 뮤테이션은 성공 시 관련 쿼리 무효화 → 진행률이 서버 계산값으로 갱신 (2차 왕복 불필요, 캐스케이드가 동기)
- 드래그: `DndContext` + 컬럼별 `SortableContext`. 컬럼 간 → `move` 뮤테이션, 컬럼 내 → `order` 일괄.
  낙관적 업데이트 + 스냅샷 롤백
- 삭제는 항상 `ConfirmDeleteModal` 경유
- 토스트: `components/Toast.tsx` 모듈 레벨 버스(컨텍스트 없음), `<Toaster/>`는 `app/layout.tsx`에 1회 마운트

## 로컬 실행

```bash
npm install
# .env.local 에 MONGODB_URI 설정 (.env.local.example 참고)
npm run seed     # 선택 — 샘플 트리 삽입
npm run dev      # http://localhost:3000
```

`.env.local`은 `next dev`/`next build`가 자동 로드한다. `scripts/seed.ts`는 Node 24의
`process.loadEnvFile`로 로드한다 (tsx는 tsconfig path alias를 해석하지 않으므로 `scripts/`는 상대 경로 import 사용).

## 테스트

```bash
npm test          # Vitest: mongodb-memory-server(replica set) — 실제 Atlas 미접촉
npm run test:e2e  # Playwright: npm run dev 를 띄움 → .env.local 실제 DB, 스펙이 자체 픽스처 생성·삭제
```

- `tests/api/crud.test.ts` — 4 엔티티 × CRUD + 필터 (next-test-api-route-handler)
- `tests/progress/progressCascade.test.ts` — PLAN.md §6 매트릭스 P1~P9 + 인수기준 12~20
- `tests/helpers/mongo.ts` — `setupTestDb()`: `mongoose.disconnect()` → `global._mongoose` 리셋 →
  memory server URI 주입. replica set이므로 트랜잭션 경로가 실제로 테스트됨

## 알려진 편차 (PLAN.md 대비)

- **Next.js 16** (PLAN은 15) — `create-next-app@latest` 기준. App Router 의도 동일
- `lint` 스크립트 = `eslint` (Next 16에서 `next lint` 제거)
- `@types/node` ^24 (vitest 5 peer + 런타임 Node 24)
