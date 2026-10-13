# Task Flow PLAN
## 작업 원칙
한 번에 아래 작업 하나만 구현한다. 실제 확인 전에는 완료로 표시하지 않는다.
상태는 [ ] 미완료, [x] 확인 완료로 관리하고 확인 결과를 각 항목 아래 기록한다.
## 2장: 브라우저 앱
- [x] T01: frontend/index.html, styles.css, app.js 생성. 제목 입력·등록·목록만 구현한다.
  확인: 두 항목 등록, 빈 제목 거절. 이 단계에서 새로고침하면 사라져도 정상이다.
  - 변경 파일: frontend/index.html, frontend/styles.css, frontend/app.js (신규)
  - 실행 명령: python3 -m http.server 5500 --bind 127.0.0.1 --directory frontend
  - 확인 결과(2026-10-13, Headless Chromium 자동 확인): 두 항목 등록, 앞뒤 공백 제거, 빈 제목·공백 제목·101자 거절과 오류 문구 표시, 100자 등록, `<img ...>` 입력이 실행되지 않고 글자로 표시, 새로고침 시 목록 사라짐, JS 오류 없음.
  - 추가 요청: 입력 폼과 목록 사이에 '할 일 목록' 제목 추가. 빈 상태·등록 후 모두 표시되고 순서(입력 → 제목 → 목록) 확인.
  - 사용자 브라우저 확인(2026-10-13): 정상 동작.
  - 남은 오류: 없음. 각 항목은 id·title·status(TODO)·created_at을 가지며 화면에는 제목만 표시한다.
- [x] T02: localStorage(task-flow-v1) 저장·복원.
  확인: 새로고침 후 유지. 손상된 저장값을 자동 덮어쓰지 않는다.
  - 변경 파일: frontend/app.js(저장·복원), frontend/index.html(저장소 경고 영역), frontend/styles.css(경고 스타일)
  - 실행 명령: python3 -m http.server 5500 --bind 127.0.0.1 --directory frontend
  - 확인 결과(2026-10-13, Headless Chromium 자동 확인 39개 통과): 등록 시 task-flow-v1에 저장, 새로고침 후 순서·id 유지, 빈 제목·101자 거절과 HTML 글자 표시 유지. 깨진 JSON·배열 아님·항목 형식 오류·잘못된 상태값 4가지 모두 경고 표시, 등록해도 원래 저장값 그대로 유지. 저장 실패 시 화면에 추가하지 않고 안내 표시.
  - 남은 오류: 없음. 손상된 값이 있으면 이번 세션의 새 항목은 저장되지 않으며, 복구는 사용자가 직접 개발자 도구에서 값을 확인·삭제해야 한다.
- [x] T03: 상태 변경, 수정, 삭제 확인.
  확인: 삭제 취소 시 유지. 다른 항목이 수정되지 않는다.
  - 변경 파일: frontend/app.js(상태 변경·제목 수정·삭제), frontend/styles.css(항목 행·수정 폼 스타일)
  - 실행 명령: python3 -m http.server 5500 --bind 127.0.0.1 --directory frontend
  - 확인 결과(2026-10-13, Headless Chromium 자동 확인 31개 통과): 상태 TODO/DOING/DONE 변경·저장·새로고침 유지, 완료 항목 취소선. 제목 수정 시 공백 제거, 빈 제목·101자 거절, 취소 시 원래 값 유지, HTML 글자 표시. 삭제 확인 창에서 취소 시 유지, 확인 시 해당 항목만 삭제. 같은 제목 3개에서 상태·수정·삭제가 id 기준으로 해당 항목에만 적용. 저장 실패 시 화면 되돌림·안내, 손상된 저장값은 계속 보호. 375px 화면 가로 스크롤 없음.
  - 남은 오류: 없음. 설명 수정은 PLAN에 따라 T04에서 설명 필드와 함께 추가한다.
- [x] T04: 설명·우선순위·마감일·검색·필터·지연 표시.
  확인: 필터 중 수정·삭제, 어제 마감 TODO의 지연 표시.
  - 변경 파일: frontend/index.html(등록 폼 옵션·필터), frontend/app.js(새 필드·검증·필터·지연), frontend/styles.css(배지·필터·수정 폼)
  - 실행 명령: python3 -m http.server 5500 --bind 127.0.0.1 --directory frontend
  - 확인 결과(2026-10-13, Headless Chromium 자동 확인 49개 통과, T02·T03 회귀 통과): 기본값(설명 "", NORMAL, 마감 null) 저장, 설명 2000자 허용·2001자 거절, 없는 날짜 거절, 제목·설명 HTML 글자 표시. 어제 마감 TODO·DOING 지연 표시, DONE·오늘·내일·미지정은 표시 안 함, 완료로 바꾸면 사라짐. 제목 검색(대소문자 무시)·상태·우선순위 AND 적용, 결과 없음 안내. HIGH 필터 중 같은 제목 항목의 수정·상태 변경·삭제(취소/확인)가 id 기준으로 해당 항목에만 적용. T02·T03 형식 저장값은 경고 없이 기본값을 채워 불러오고, 새 필드 형식이 틀리면 손상으로 보고 덮어쓰지 않음. 375px 화면 가로 스크롤 없음.
  - 남은 오류: 없음. 지연 표시는 화면을 다시 그릴 때 계산하므로 페이지를 연 채 자정이 지나면 새로고침 또는 다른 조작 후 갱신된다.
## 3장: API
- [x] T05: API-SPEC.md 작성, FastAPI /api/health 구현.
  확인: curl로 200과 status=ok.
  - 변경 파일: API-SPEC.md, backend/__init__.py, backend/main.py (신규), requirements.txt·.gitignore(사용자가 가상환경 준비 중 생성)
  - 준비: python3 -m venv .venv, pip install fastapi uvicorn (fastapi 0.143.0, uvicorn 0.54.0), pip freeze > requirements.txt
  - 실행 명령: .venv 활성화 후 python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
  - 확인 결과(2026-10-13): curl -i http://127.0.0.1:8000/api/health → 200 OK, {"status":"ok"}. /docs 200, OpenAPI 경로는 /api/health만 존재. /api/tasks는 아직 404(T06에서 구현).
  - 남은 오류: 없음. API-SPEC.md의 id는 서버 발급 정수로 정했다(프런트엔드 localStorage 단계의 문자열 id와 다르며, PRD에 따라 데이터는 이전하지 않는다).
- [x] T06: 메모리 기반 /api/tasks GET과 POST.
  확인: /docs에서 등록 후 조회. 입력 위반은 422.
  - 변경 파일: backend/schemas.py(신규, 입력 검증), backend/main.py(메모리 저장소, GET·POST /api/tasks)
  - 실행 명령: .venv 활성화 후 python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
  - 확인 결과(2026-10-13): /docs(Swagger UI)에서 POST 201로 등록 후 GET 200으로 같은 항목 조회, 빈 제목 422. curl로 정상 7건 201(기본값 description ""·TODO·NORMAL·null, 제목 공백 제거, 100자·설명 2000자·2028-02-29 허용), 위반 20건 422(빈·공백·누락·null·숫자 제목, 101자, 설명 2001자·null, 잘못된 상태·소문자 상태·우선순위, 2026-02-30·슬래시·시간 포함·숫자 날짜, id·created_at·정의 안 된 필드 전송, 깨진 JSON, 배열 본문), 422 요청은 저장되지 않음. API 재시작 후 목록 []·id 1부터 다시 발급(메모리 단계 정상).
  - 사용자 확인(2026-10-13): /docs에서 POST 201 등록 후 GET 200 조회 정상.
  - 남은 오류: 없음. 목록 필터(q·status·priority)는 T07에서 구현한다.
- [x] T07: PATCH·DELETE와 필터 구현.
  확인: 미전달 필드 유지, 없는 ID 404, 삭제 204.
  - 변경 파일: backend/schemas.py(TaskUpdate: 부분 수정 검증), backend/main.py(PATCH·DELETE /api/tasks/{id}, GET 필터 q·status·priority)
  - 실행 명령: .venv 활성화 후 python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
  - 확인 결과(2026-10-13, HTTP 요청 자동 확인 54개 통과 + curl): status만 PATCH 시 나머지 필드 유지, 여러 필드 동시 수정, due_date null로 마감일 삭제, {}는 변경 없음, 다른 항목·순서·id·created_at 불변. title·description·status·priority null, 빈·101자 제목, 2001자 설명, 잘못된 값·날짜, id·created_at·정의 안 된 필드, 유효+무효 혼합은 422이며 일부만 적용되지 않음. 없는 id PATCH·DELETE 404, 숫자 아닌 id 422. DELETE 204(본문 없음), 해당 항목만 삭제, 재삭제 404, 삭제된 id 재사용 안 함. 필터 q(대소문자 무시·공백 제거, 제목만)·status·priority AND, 결과 없음 200 [], 잘못된 status·priority 422.
  - 사용자 확인(2026-10-13): /docs에서 PATCH 200(상태만 변경), DELETE 204, 같은 id 재삭제 404 정상.
  - 남은 오류: 없음.
- [x] T08: 프런트엔드 저장 처리를 API 호출로 교체.
  확인: 화면과 curl 목록이 같음. API 중지 시 오류 표시.
  - 변경 파일: frontend/app.js(localStorage 제거, fetch로 GET·POST·PATCH·DELETE), frontend/index.html(API 오류 배너·다시 불러오기·불러오는 중 안내), frontend/styles.css(배너·비활성 스타일), backend/main.py(CORS: 127.0.0.1:5500·localhost:5500만 허용), API-SPEC.md(CORS 설명)
  - 실행 명령: 화면 python3 -m http.server 5500 --bind 127.0.0.1 --directory frontend / API .venv 활성화 후 python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
  - 확인 결과(2026-10-13, Headless Chromium + curl 자동 확인 43개 통과, T07 API 회귀 통과): 화면에서 등록·상태 변경·수정(마감일 지움 null)·삭제 후 curl 목록과 id·순서·제목 일치, curl로 등록한 항목이 새로고침 후 화면에 표시. 삭제 취소 시 API에 남음, 필터 중 수정·삭제가 id 기준 해당 항목에만 적용, 어제 마감 TODO 지연 표시, HTML 제목 글자 표시. 서버 422 시 안내·입력값 유지, 요청 중 재제출해도 1건만 등록, 다른 곳에서 삭제된 항목 조작 시 404 안내 후 목록 다시 불러옴. API를 실제로 중지하고 확인: 새로 연 화면은 "목록을 불러오지 못했습니다" 배너와 다시 불러오기 버튼(빈 목록 안내 대신), 등록 실패 안내·입력값 유지. 열린 화면에서는 상태 변경 실패 시 선택값 원래대로, 수정 실패 시 입력값 유지, 삭제 실패 시 항목 유지. API 재시작 후 다시 불러오기로 복구(메모리 단계라 목록 비어 있음). 허용하지 않은 Origin의 CORS 사전 요청은 400.
  - 남은 오류: 없음. 검색·필터는 받아 온 목록으로 화면에서 계산한다(API 필터는 T07에서 구현되어 있음). localStorage(task-flow-v1)의 예전 값은 읽거나 지우지 않고 그대로 둔다(PRD: 단계 간 자동 이전 없음).
## 4장: DB
- [x] T09: MariaDB 전용 사용자·DB와 .env 준비. 접속 확인.
  - 변경 파일: .env.example(신규, 가짜 값), .gitignore(.env 추가). .env는 사용자가 직접 작성(Git 제외, 권한 600).
  - 준비(사용자, sudo mariadb): CREATE DATABASE task_flow(utf8mb4, utf8mb4_unicode_ci), CREATE USER 'task_flow_app'@'localhost', GRANT ALL PRIVILEGES ON task_flow.* (이 DB에만 권한). MariaDB 11.8.6은 이미 설치·실행 중이었다.
  - 실행 명령: mariadb -h 127.0.0.1 -u task_flow_app -p task_flow -e "SELECT CURRENT_USER(), DATABASE();"
  - 확인 결과(2026-10-13): 사용자 접속 결과 task_flow_app@localhost / task_flow. .env 값(DB_HOST·DB_PORT·DB_NAME·DB_USER·DB_PASSWORD)으로 비밀번호를 출력하지 않고 접속 성공, 문자셋 utf8mb4. git check-ignore로 .env가 Git에서 제외됨을 확인.
  - 남은 오류: 없음. 현재 DB 비밀번호가 짧아 5장(서버 분리) 전에 12자 이상으로 바꾸는 것을 권장한다.
- [x] T10: backend/database.py, models.py, init_db.py 생성.
  확인: python -m backend.init_db 실행 후 tasks 테이블 확인.
  - 변경 파일: backend/database.py(.env 읽기·엔진·세션), backend/models.py(tasks 테이블), backend/init_db.py(없는 테이블만 생성), requirements.txt
  - 새 패키지: SQLAlchemy 2.1.4(테이블 정의·DB 사용), PyMySQL 1.2.3(MariaDB 드라이버, 순수 Python), python-dotenv 1.2.4(.env 읽기)
  - 실행 명령: .venv 활성화 후 python -m backend.init_db
  - 확인 결과(2026-10-13): 1회차 "'tasks' 테이블을 만들었습니다.", 2회차 "이미 있어 그대로 두었습니다."(DROP 없음). SHOW CREATE TABLE: id INT AUTO_INCREMENT PK, title VARCHAR(100) NOT NULL, description VARCHAR(2000) NOT NULL DEFAULT '', status·priority VARCHAR(10) 기본값 TODO·NORMAL과 CHECK 제약, due_date DATE NULL, created_at DATETIME NOT NULL, utf8mb4_unicode_ci. 트랜잭션 안에서 확인 후 ROLLBACK: 기본값·한글·이모지·제목 100자·설명 2000자·윤년 허용, 잘못된 status·priority, 빈·공백 제목(4025), 제목 101자·설명 2001자(1406), 없는 날짜(1292), NULL(1048) 거절. 확인 후 행 0개, AUTO_INCREMENT 1로 되돌림. .env 값 누락 시 변수 이름을 알려 주는 오류, 비밀번호 오류(1045) 시 로그에 비밀번호 미노출, engine URL 출력 시 비밀번호 *** 처리.
  - 남은 오류: 없음. API는 아직 메모리 저장이며 T11에서 DB로 교체한다.
- [ ] T11: API 메모리 저장을 DB로 교체.
  확인: 등록한 행을 SQL로 조회. API 재시작 후 데이터 유지.
## 5장: 서버 분리
- [ ] T12: DB 서버 구성 후 App 서버에서 SELECT 1 확인.
- [ ] T13: App 서버 코드·가상환경·환경변수·systemd 구성.
  확인: App에서 /api/health 응답.
- [ ] T14: Web 서버 Nginx와 정적 파일·/api 프록시 구성.
  확인: Web 주소로 등록, DB 저장, App 재시작 후 유지.
## 실행 기준
T01~T04: python3 -m http.server 5500 --bind 127.0.0.1 --directory frontend
T05~T11: 가상환경에서 python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
실제 존재하는 파일을 확인한 뒤 명령을 실행한다.
## 기록
각 작업에 변경 파일, 실행 명령, 실제 확인 결과, 남은 오류를 기록한다.
정상 동작을 확인한 작업 단위로 Git 커밋한다.