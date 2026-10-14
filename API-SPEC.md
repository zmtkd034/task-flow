# Task Flow API 명세

PRD의 요구사항(F01~F13)을 API로 옮긴 계약이다. 구현 순서는 PLAN을 따른다.

| 엔드포인트 | 구현 작업 |
|---|---|
| `GET /api/health` | T05 |
| `GET /api/tasks`, `POST /api/tasks` | T06 |
| `PATCH /api/tasks/{id}`, `DELETE /api/tasks/{id}`, 목록 필터 | T07 |
| `POST /api/auth/signup` | T17 |
| `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me` | T18 |
| 할 일 API의 로그인 필수·사용자별 분리(`401`) | T19 |

## 공통

- 기본 주소(개발): `http://127.0.0.1:8000`
- 모든 경로는 `/api`로 시작한다. 배포 단계(T14)에서 Nginx가 `/api`를 App 서버로 전달한다.
- 요청·응답 본문은 JSON(`Content-Type: application/json`, UTF-8)이다.
- 인증: `/api/health`와 `/api/auth/signup`·`/api/auth/login`·`/api/auth/logout`을 뺀 모든 API는 로그인이 필요하다(T19부터 할 일 API에 적용). 로그인 상태는 세션 쿠키로 유지한다(아래 "인증" 참고).
- 할 일은 로그인한 사용자 본인의 것만 조회·수정·삭제한다.
- 입력값 검증은 서버에서도 한다. 프런트엔드 검증만 믿지 않는다.
- 저장 위치: T06~T08은 서버 메모리(재시작 시 사라짐), T11부터 MariaDB(재시작 후 유지). 응답 형식은 같다.

## 데이터: Task

| 필드 | 타입 | 규칙 | 기본값 |
|---|---|---|---|
| `id` | integer | 서버가 발급하는 고유 번호. 수정·삭제는 이 값으로만 한다. | 서버 발급 |
| `title` | string | 앞뒤 공백을 제거한 뒤 1~100자 | 필수 |
| `description` | string | 0~2000자 | `""` |
| `status` | string | `TODO`, `DOING`, `DONE` 중 하나 | `TODO` |
| `priority` | string | `HIGH`, `NORMAL`, `LOW` 중 하나 | `NORMAL` |
| `due_date` | string \| null | `YYYY-MM-DD` 형식의 실제 날짜, 미지정은 `null` | `null` |
| `created_at` | string | 서버가 기록하는 생성 시각(ISO 8601, UTC) | 서버 기록 |

예시:

```json
{
  "id": 1,
  "title": "보고서 작성",
  "description": "",
  "status": "TODO",
  "priority": "NORMAL",
  "due_date": "2026-10-20",
  "created_at": "2026-10-13T06:30:00Z"
}
```

- `id`와 `created_at`은 요청으로 보내도 받지 않는다(422).
- 정의되지 않은 필드를 보내면 422로 거절한다.
- 할 일의 주인(`user_id`)은 서버가 로그인한 사용자로 정한다. 응답에는 넣지 않으며, 요청으로 보내면 정의되지 않은 필드로 보고 422로 거절한다.
- 지연 여부는 사용자 PC의 로컬 날짜를 기준으로 프런트엔드가 계산한다. API는 지연 필드를 주지 않는다.

## 오류 응답

| 상태 코드 | 상황 |
|---|---|
| `401 Unauthorized` | 로그인하지 않았거나 세션이 만료·로그아웃됨(`{"detail": "Not authenticated"}`), 또는 로그인 실패(`{"detail": "Invalid username or password"}`) |
| `404 Not Found` | 해당 `id`의 할 일이 없음. 다른 사용자의 할 일도 같은 `404`로 응답한다(있는지 알려 주지 않는다). |
| `409 Conflict` | 회원가입 시 이미 있는 아이디(`{"detail": "Username already exists"}`) |
| `422 Unprocessable Entity` | 입력 규칙 위반(빈 제목, 101자 제목, 2001자 설명, 잘못된 상태·우선순위·날짜, 정의되지 않은 필드 등) |
| `503 Service Unavailable` | DB에 연결할 수 없음(T11부터). 본문 `{"detail": "Database unavailable"}`, 접속 정보 등 내부 오류 내용은 보여 주지 않는다. |

본문은 FastAPI 기본 형식을 따른다.

```json
{ "detail": "Task not found" }
```

422의 `detail`은 위반 항목 목록이다.

로그인이 필요한 API는 입력 검증보다 로그인 확인을 먼저 한다. 로그인하지 않았으면 본문이 틀려도 `401`이다.

## 데이터: User

| 필드 | 타입 | 규칙 |
|---|---|---|
| `id` | integer | 서버가 발급하는 고유 번호 |
| `username` | string | 영문 소문자·숫자 4~20자(`^[a-z0-9]{4,20}$`). 앞뒤 공백을 제거하거나 대문자를 소문자로 바꾸지 않는다(규칙에 맞지 않으면 422). 중복 불가. |
| `created_at` | string | 가입 시각(ISO 8601, UTC) |

```json
{ "id": 1, "username": "sunny01", "created_at": "2026-10-14T03:00:00Z" }
```

- 비밀번호(`password`)는 요청으로만 받는다. 8~64자이며 문자 종류 제한은 없고 앞뒤 공백도 그대로 비밀번호로 본다.
- 비밀번호는 응답·로그에 넣지 않는다. DB에는 원문 대신 사용자별 salt를 쓴 해시(`password_hash`)만 저장한다.

## 인증

- 로그인에 성공하면 서버가 세션을 만들고 쿠키 `task_flow_session`을 보낸다.
  - 속성: `HttpOnly`(JavaScript로 읽을 수 없음), `SameSite=Lax`, `Path=/api`, `Max-Age=604800`(7일).
  - `Secure`는 붙이지 않는다. 학습용 배포가 HTTP(`http://localhost`)이기 때문이다. HTTPS는 PRD 범위 밖이다.
- 세션 값은 추측할 수 없는 무작위 값이다. DB에는 세션 값의 해시와 사용자, 만료 시각만 저장한다.
- 세션은 DB에 저장하므로 API를 재시작해도 로그인이 유지된다. 7일이 지나거나 로그아웃하면 그 세션으로는 `401`이다.
- 화면은 같은 주소의 `/api`를 호출하므로 브라우저가 쿠키를 자동으로 보낸다. 다른 사이트에서 보낸 POST·PATCH·DELETE에는 `SameSite=Lax` 때문에 쿠키가 붙지 않는다.

## 엔드포인트

### `GET /api/health`

서버 동작 확인.

- 응답 `200 OK`

```json
{ "status": "ok" }
```

### `GET /api/tasks`

할 일 목록. 등록 순서(오래된 것부터)로 돌려준다.

쿼리 파라미터(모두 선택, 함께 주면 AND 조건):

| 이름 | 설명 |
|---|---|
| `q` | 제목 검색어. 앞뒤 공백 제거 후 대소문자 구분 없이 포함 여부로 찾는다. 빈 값은 조건 없음. |
| `status` | `TODO`, `DOING`, `DONE` 중 하나 |
| `priority` | `HIGH`, `NORMAL`, `LOW` 중 하나 |

- 응답 `200 OK`: Task 배열. 없으면 `[]`.
- 잘못된 `status`·`priority` 값은 `422`.

### `POST /api/tasks`

할 일 등록.

요청 본문(`title`만 필수):

```json
{
  "title": "보고서 작성",
  "description": "팀장님께 메일로 제출",
  "status": "TODO",
  "priority": "HIGH",
  "due_date": "2026-10-20"
}
```

- 응답 `201 Created`: 생성된 Task.
- 규칙 위반은 `422`.

### `PATCH /api/tasks/{id}`

할 일 일부 수정. 보낸 필드만 바꾸고 **보내지 않은 필드는 그대로 둔다.**

요청 본문 예(상태만 변경):

```json
{ "status": "DONE" }
```

- `due_date`에 `null`을 보내면 마감일을 지운다.
- `title`, `description`, `status`, `priority`에는 `null`을 보낼 수 없다(422).
- 빈 본문 `{}`은 아무것도 바꾸지 않고 현재 Task를 돌려준다.
- 응답 `200 OK`: 수정된 Task.
- 없는 `id`는 `404`, 규칙 위반은 `422`.

### `DELETE /api/tasks/{id}`

할 일 삭제. 삭제 전 확인은 프런트엔드가 한다.

- 응답 `204 No Content`(본문 없음).
- 없는 `id`는 `404`.

### `POST /api/auth/signup`

회원가입. 가입만 하고 로그인은 하지 않는다(쿠키를 보내지 않음).

```json
{ "username": "sunny01", "password": "example-pass-1" }
```

- 응답 `201 Created`: 생성된 User.
- 아이디·비밀번호 규칙 위반, 필드 누락, 정의되지 않은 필드는 `422`.
- 이미 있는 아이디는 `409`.

### `POST /api/auth/login`

로그인. 요청 본문은 회원가입과 같다.

- 응답 `200 OK`: 로그인한 User, 그리고 `Set-Cookie: task_flow_session=...`.
- 없는 아이디와 틀린 비밀번호는 둘 다 같은 `401` `{"detail": "Invalid username or password"}`이다. 규칙에 맞지 않는 아이디·비밀번호도 `422`가 아니라 같은 `401`로 응답한다.
- 필드 누락·문자열이 아닌 값·정의되지 않은 필드는 `422`.
- 이미 로그인한 쿠키가 있으면 그 세션은 지우고 새 세션을 만든다.

### `POST /api/auth/logout`

로그아웃. 현재 쿠키의 세션을 DB에서 지우고 쿠키를 만료시킨다.

- 응답 `204 No Content`. 로그인하지 않았거나 이미 로그아웃한 상태에서도 `204`이다.

### `GET /api/auth/me`

현재 로그인한 사용자 확인. 화면이 처음 열릴 때 로그인 화면을 보여 줄지 정하는 데 쓴다.

- 응답 `200 OK`: User.
- 로그인하지 않았으면 `401`.

### 할 일 API의 로그인 적용(T19)

- `GET`·`POST /api/tasks`, `PATCH`·`DELETE /api/tasks/{id}`는 로그인하지 않으면 `401`이다.
- `GET /api/tasks`는 로그인한 사용자의 할 일만 돌려준다. 필터도 그 안에서 적용한다.
- `POST /api/tasks`는 로그인한 사용자를 주인으로 저장한다.
- 다른 사용자의 `id`로 `PATCH`·`DELETE`하면 `404`이며 데이터는 바뀌지 않는다.
- 주인이 없는 기존 할 일(`user_id`가 비어 있음)은 누구에게도 보이지 않고, 수정·삭제 요청도 `404`이다.
- 요청·응답 형식(Task)은 T07과 같다.

## 참고

- 같은 주소 제공: 화면과 API는 항상 같은 주소에서 제공되므로 CORS를 허용하지 않는다. 개발 서버(`http://127.0.0.1:8000`)는 프로젝트의 `frontend/`를 `/`로 함께 제공하고, 배포에서는 Nginx가 화면을 제공하며 `/api/`만 App으로 전달한다. (T08~T14에서는 개발용 화면을 5500번에서 따로 띄워 CORS로 허용했으나 개발 서버 통합 후 제거했다.)
- 자동 문서: 서버 실행 중 `http://127.0.0.1:8000/docs`
- 비밀번호 변경·찾기, 회원 탈퇴는 PRD 제외 기능이라 정의하지 않는다. 로그인 시도 횟수 제한은 PRD에 없어 이번 범위에서 정의하지 않는다.
