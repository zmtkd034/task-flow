# Task Flow API 명세

PRD의 요구사항(F01~F09)을 API로 옮긴 계약이다. 구현 순서는 PLAN을 따른다.

| 엔드포인트 | 구현 작업 |
|---|---|
| `GET /api/health` | T05 |
| `GET /api/tasks`, `POST /api/tasks` | T06 |
| `PATCH /api/tasks/{id}`, `DELETE /api/tasks/{id}`, 목록 필터 | T07 |

## 공통

- 기본 주소(개발): `http://127.0.0.1:8000`
- 모든 경로는 `/api`로 시작한다. 배포 단계(T14)에서 Nginx가 `/api`를 App 서버로 전달한다.
- 요청·응답 본문은 JSON(`Content-Type: application/json`, UTF-8)이다.
- 인증은 없다(로그인 없는 단일 사용자 학습용 앱).
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
- 지연 여부는 사용자 PC의 로컬 날짜를 기준으로 프런트엔드가 계산한다. API는 지연 필드를 주지 않는다.

## 오류 응답

| 상태 코드 | 상황 |
|---|---|
| `404 Not Found` | 해당 `id`의 할 일이 없음 |
| `422 Unprocessable Entity` | 입력 규칙 위반(빈 제목, 101자 제목, 2001자 설명, 잘못된 상태·우선순위·날짜, 정의되지 않은 필드 등) |

본문은 FastAPI 기본 형식을 따른다.

```json
{ "detail": "Task not found" }
```

422의 `detail`은 위반 항목 목록이다.

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

## 참고

- CORS: 개발 단계에서 화면(`127.0.0.1:5500`)과 API(`127.0.0.1:8000`)의 주소가 달라 T08부터 CORS를 허용한다. 허용 주소는 `http://127.0.0.1:5500`, `http://localhost:5500`만이고, 메서드는 GET·POST·PATCH·DELETE, 헤더는 `Content-Type`만 허용한다. 배포 단계(T14)에서는 Nginx가 같은 주소로 `/api`를 전달한다.
- 자동 문서: 서버 실행 중 `http://127.0.0.1:8000/docs`
