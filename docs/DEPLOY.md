# Vercel 배포 가이드

이 앱은 Next.js 16 App Router 단일 프로젝트라 Vercel에 추가 설정 없이 배포됩니다.
빌드 명령·출력 디렉터리·서버리스 함수 라우팅은 Vercel이 Next.js 프리셋으로 자동 감지합니다.

- API Route Handler는 모두 `runtime = 'nodejs'` + `dynamic = 'force-dynamic'` → Vercel Serverless Function으로 배포
- 페이지(`/`, `/board`, `/dashboard`, `/hierarchy`)는 정적 셸 + 클라이언트에서 API 호출
- Mongoose 연결은 `lib/db.ts`의 `global` 캐시 패턴 → 서버리스 콜드/웜 스타트에서 커넥션 재사용
- 진행률 트랜잭션은 replica set(Atlas 기본)에서 동작, 미지원 시 순차 쓰기로 자동 폴백

## 1. MongoDB Atlas 준비

Vercel 서버리스는 **고정 출구 IP가 없으므로** Atlas에서 전체 대역을 허용해야 합니다.

1. Atlas → 해당 프로젝트 → **Network Access** → **Add IP Address**
2. **Allow Access from Anywhere** (`0.0.0.0/0`) 추가 → Confirm
   - 더 좁히려면 [Vercel Secure Compute](https://vercel.com/docs/security/secure-compute) 또는 전용 IP(유료)로 고정 IP를 받아 해당 IP만 허용
3. **Database Access**에 배포용 사용자와 비밀번호가 있는지 확인
4. 연결 문자열: `mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/todoapp?retryWrites=true&w=majority`
   - 경로에 DB 이름(`todoapp`)을 반드시 포함
   - 비밀번호에 특수문자가 있으면 URL 인코딩

## 2. Vercel 프로젝트 생성 (Git 연동)

1. [vercel.com/new](https://vercel.com/new) → **Import Git Repository** → `Latto-JD/Todo` 선택
2. Framework Preset: **Next.js** (자동), Root Directory: `./`, Build/Output 설정은 그대로
3. **Environment Variables**에 추가 (Production·Preview·Development 모두 체크):

   | Name | Value | 이유 |
   |---|---|---|
   | `MONGODB_URI` | `mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/todoapp?retryWrites=true&w=majority` | 런타임 DB 연결 |
   | `MONGOMS_DISABLE_POSTINSTALL` | `1` | 빌드 시 `mongodb-memory-server`(테스트 전용 devDependency)가 ~150MB MongoDB 바이너리를 내려받는 postinstall을 건너뜀 |

4. **Deploy** 클릭

빌드 시 `MONGODB_URI`가 없어도 빌드는 성공합니다(모든 API 라우트가 동적이라 빌드 중 DB에 접근하지 않음).
런타임에는 반드시 필요합니다.

## 3. 배포 확인

```
https://<프로젝트>.vercel.app/api/health   → { "ok": true, "db": "connected" }
https://<프로젝트>.vercel.app/hierarchy
https://<프로젝트>.vercel.app/board
https://<프로젝트>.vercel.app/dashboard
```

`/api/health`가 `{ ok: false, db: "disconnected" }`(503)면:
- Atlas Network Access에 `0.0.0.0/0`이 반영됐는지 (반영에 1~2분)
- `MONGODB_URI`의 사용자/비밀번호/DB 경로
- Vercel 함수 로그: 프로젝트 → Deployments → 최신 배포 → Functions → `/api/health`

## 4. 샘플 데이터

`npm run seed`는 로컬에서 `.env.local`의 URI로 실행됩니다. 배포된 Atlas에 샘플을 넣으려면
로컬 `.env.local`의 `MONGODB_URI`를 배포용과 동일하게 두고 `npm run seed`를 실행하세요.

## 5. 이후 배포

`main` 브랜치에 push하면 Vercel이 자동 배포합니다. PR/브랜치는 Preview 배포가 생성됩니다.

## 참고: Vercel CLI로 배포하려면

```bash
npm i -g vercel
vercel login
vercel link           # 기존 프로젝트에 연결하거나 새로 생성
vercel env add MONGODB_URI production
vercel --prod
```
