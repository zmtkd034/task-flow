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
- [x] T11: API 메모리 저장을 DB로 교체.
  확인: 등록한 행을 SQL로 조회. API 재시작 후 데이터 유지.
  - 변경 파일: backend/main.py(메모리 저장소 제거, 요청마다 DB 세션으로 GET·POST·PATCH·DELETE·필터 처리, DB 연결 실패 503), API-SPEC.md(503 추가)
  - 실행 명령: .venv 활성화 후 python -m backend.init_db (테이블 확인) → python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
  - 확인 결과(2026-10-13): API로 등록한 "DB 저장 확인"(id 1)을 SQL SELECT로 조회(제목·설명·HIGH·2026-10-20·UTC created_at 일치). API 서버를 완전히 중지(연결 000)한 뒤 다시 실행해도 같은 목록 유지, 이후 등록은 id 2로 이어짐. T06 검증 규칙(정상 8건 201, 위반 18건 422, 422 미저장, 검색어 %·_ 글자 취급), T07 API 테스트(54개), T08 화면 연동 브라우저 테스트 모두 DB에서 통과(API 계약 유지). 잘못된 DB 포트로 띄운 임시 API는 /api/tasks에 503 {"detail":"Database unavailable"}, 로그에 비밀번호 미노출.
  - 남은 오류: 없음. 메모리 단계 데이터는 PRD에 따라 이전하지 않았다(사용자가 등록한 "집 가기" 1건은 다시 등록 필요). 화면은 503을 "서버 오류가 발생했습니다(503)"로 표시한다.
## 5장: 서버 분리
- [x] T12: DB 서버 구성 후 App 서버에서 SELECT 1 확인.
  - 구성 방식: A안(한 컴퓨터에서 역할 분리). DB=MariaDB(127.0.0.1:3306), App=FastAPI(T13), Web=Nginx(T14).
  - 변경 파일: 없음(PLAN 기록만). DB 서버 설정이 이미 요건을 만족해 변경하지 않았다.
  - DB 서버 상태: MariaDB 11.8.6, bind-address=127.0.0.1(/etc/mysql/mariadb.conf.d/50-server.cnf), port 3306, skip_networking=0, 서비스 active·enabled(부팅 시 자동 시작), utf8mb4. 앱 계정 task_flow_app@localhost는 task_flow.*에만 권한.
  - 실행 명령: .venv에서 backend.database의 engine으로 SELECT 1 실행(.env 설정 사용)
  - 확인 결과(2026-10-13): SELECT 1 → 1(18 ms), 접속 계정 task_flow_app@localhost, DB task_flow, TCP 연결, tasks 테이블 확인. 외부 인터페이스 주소(eth0 172.24.119.18:3306) 접속 거절, 127.0.0.1:3306만 접속 가능. 실행 중인 API도 DB 목록을 응답.
  - 남은 오류: 없음. 권장(선택): DB 비밀번호 12자 이상으로 변경, 운영용으로는 앱 계정 권한을 SELECT·INSERT·UPDATE·DELETE로 줄이고 테이블 생성은 별도 계정으로 실행.
- [x] T13: App 서버 코드·가상환경·환경변수·systemd 구성.
  확인: App에서 /api/health 응답.
  - 변경 파일: deploy/task-flow-api.service(신규, systemd 서비스), deploy/install-app.sh(신규, 설치·갱신 스크립트)
  - 구성: 실행 계정 taskflow(시스템 계정, 로그인 불가), 코드 /opt/task-flow/app(backend·requirements.txt, root 소유·읽기 전용), 가상환경 /opt/task-flow/venv, 환경 변수 /etc/task-flow/task-flow.env(root:taskflow 640, EnvironmentFile로 전달), 서비스 task-flow-api(127.0.0.1:8001, Restart=on-failure, 부팅 시 자동 시작, ProtectSystem=strict·ProtectHome·NoNewPrivileges).
  - 실행 명령: (사용자) sudo bash deploy/install-app.sh
  - 사전 확인: 별도 폴더·.env 파일 없음·환경 변수만(env -i) 조건에서 health 200·DB 목록 응답, 환경 변수 누락 시 변수 이름을 알려 주는 오류로 시작 중단.
  - 확인 결과(2026-10-13): 스크립트 출력 active (running), health {"status":"ok"}. systemctl show: active/running, enabled, User=taskflow, NRestarts=0. 프로세스 소유자 taskflow. 127.0.0.1:8001만 수신(외부 주소 172.24.119.18:8001 거절). /api/tasks가 DB 목록 응답. 일반 계정은 env 파일 읽기 불가, /opt/task-flow/app에 .env 없음, 배포 코드와 backend/ 동일, 서비스 로그에 비밀번호 미노출. 개발 서버(8000)는 영향 없음.
  - 남은 오류: 없음. 코드 변경 후에는 sudo bash deploy/install-app.sh를 다시 실행해야 App 서버에 반영된다. 자동 재시작(Restart=on-failure)은 설정만 확인했고 강제 종료 시험은 하지 않았다(root 권한 필요).
- [x] T14: Web 서버 Nginx와 정적 파일·/api 프록시 구성.
  확인: Web 주소로 등록, DB 저장, App 재시작 후 유지.
  - 변경 파일: deploy/nginx-task-flow.conf(신규, 80번 포트·정적 파일·/api/ → 127.0.0.1:8001 프록시·보안 헤더·요청 64k 제한), deploy/install-web.sh(신규, Nginx 설치·화면 복사·사이트 활성화·nginx -t 후 적용). 화면 코드는 T08의 같은 주소(/api) 호출 그대로라 변경 없음.
  - 구성: Nginx 1.28.3, 화면 /var/www/task-flow(root 소유), 사이트 /etc/nginx/sites-available/task-flow.conf 활성화, 기본 안내 페이지 사이트 비활성화(파일은 sites-available에 남김), 부팅 시 자동 시작.
  - 실행 명령: (사용자) sudo bash deploy/install-web.sh → 브라우저 http://localhost 에서 등록 → sudo systemctl restart task-flow-api → 새로고침
  - 사전 확인: 같은 설정을 일반 계정 Nginx(127.0.0.1:8088)로 실행해 nginx -t 통과, 화면·JS·CSS 형식, /api 전달, /docs·/openapi.json·/.env·/backend 404, 보안 헤더, 64k 초과 413, 브라우저 등록·상태 변경 DB 반영·CSP 차단 없음 확인(시험 항목 삭제).
  - 확인 결과(2026-10-13): 16:31:35 브라우저(http://localhost)에서 "집 가기" 등록 → Nginx 접근 로그 POST /api/tasks 201, App 로그 201, DB SELECT로 id 4 행 확인. 16:31:50 App 재시작(PID 33993 → 35313, journal Stopped/Started). 16:32:07 새로고침 GET /api/tasks 200, 목록에 "집 가기" 유지. 배포된 화면·Nginx 설정이 저장소 파일과 동일, nginx active·enabled.
  - 남은 오류: 첫 실행 때 스크립트 마지막 확인이 Nginx reload 완료 전에 실행되어 health가 기본 사이트의 404로 표시됐다(실제 설정은 2초 뒤 정상 적용). 응답이 올 때까지 기다린 뒤 확인하도록 install-web.sh를 수정했다. HTTPS는 PRD 범위 밖이라 구성하지 않았다.
## 6장: 다중 사용자(PRD F10~F13, 2026-10-14 PRD 변경)
기존 할 일 API 계약은 로그인 필요 조건만 추가하고 요청·응답 형식은 유지한다. 기존 데이터와 테이블은 삭제하지 않는다.
- [x] T15: API-SPEC.md에 회원가입·로그인·로그아웃·현재 사용자 API와 할 일 API의 401 응답을 정의한다.
  확인: F10~F13의 규칙(아이디·비밀번호 길이, 중복 409, 로그인 실패 401, 다른 사용자 항목 404)이 명세에 모두 있다.
  - 변경 파일: API-SPEC.md(엔드포인트 표·공통 인증·User 데이터·인증(세션 쿠키)·오류 401/409·auth 4개 API·할 일 API 로그인 적용 추가)
  - 정한 내용: POST /api/auth/signup(201, 가입만 하고 로그인 안 함, 위반 422, 중복 409), POST /api/auth/login(200 + 쿠키 task_flow_session, 틀린 아이디·비밀번호 같은 401), POST /api/auth/logout(항상 204), GET /api/auth/me(200 또는 401). 쿠키 HttpOnly·SameSite=Lax·Path=/api·7일, DB에는 세션 값의 해시만 저장. 할 일 API는 로그인 확인을 입력 검증보다 먼저 하고(401), 다른 사용자·주인 없는 항목은 404, Task 응답 형식은 그대로(user_id 미포함).
  - 실행 명령: 없음(문서 작업). grep으로 명세 항목 확인.
  - 확인 결과(2026-10-14): F10 아이디 ^[a-z0-9]{4,20}$·비밀번호 8~64자·409, F11 같은 401 메시지·세션 유지, F12 로그아웃 후 401, F13 비로그인 401·다른 사용자 404·주인 없는 행 비표시가 명세에 모두 있음. 예시 비밀번호는 가짜 값. 코드는 바꾸지 않았다.
  - 남은 오류: 없음. Secure 쿠키는 HTTP 배포라 쓰지 않는다(HTTPS는 PRD 범위 밖). 로그인 시도 횟수 제한은 PRD에 없어 정의하지 않았다.
- [ ] T16: users·sessions 테이블 추가, tasks에 user_id(NULL 허용) 열 추가.
  확인: init_db 재실행 시 기존 tasks 행이 그대로 남는다. 열 추가는 ALTER TABLE ADD COLUMN으로 하며 DROP·TRUNCATE를 하지 않는다.
- [ ] T17: 회원가입 API. 비밀번호는 표준 라이브러리 hashlib.scrypt와 사용자별 salt로 해시해 저장한다(새 패키지 없음).
  확인: 정상 201, 규칙 위반 422, 중복 아이디 409. DB에 비밀번호 원문이 없다.
- [ ] T18: 로그인·로그아웃·현재 사용자 API. 로그인 상태는 DB 세션과 HttpOnly·SameSite=Lax 쿠키로 유지한다.
  확인: 로그인 성공 시 쿠키 발급, 틀린 아이디·비밀번호 모두 같은 401 메시지, 로그아웃 후 같은 쿠키로 401, API 재시작 후에도 로그인 유지.
- [ ] T19: 할 일 API에 로그인 필수와 사용자별 분리를 적용한다.
  확인: 비로그인 401. 사용자 A·B가 각자 등록하면 서로의 목록에 보이지 않고, 다른 사용자 id로 PATCH·DELETE 시 404이며 데이터가 바뀌지 않는다. 소유자 없는 기존 행은 누구에게도 보이지 않는다. T07 검증 규칙 회귀 통과.
- [ ] T20: 화면에 회원가입·로그인·로그아웃을 추가한다.
  확인: 비로그인 시 로그인 화면, 로그인 후 내 할 일만 표시, 로그아웃 후 할 일 화면 접근 불가, 아이디 HTML 글자 표시, 기존 할 일 기능(T08) 회귀 통과.
- [ ] T21: 배포본(App·Web)에 반영한다.
  확인: http://localhost 에서 두 사용자로 등록·분리 확인, App 재시작 후 데이터·로그인 유지, 로그에 비밀번호 미노출.
## 추가 작업
- [x] 개발 서버 통합: 화면(5500)과 API(8000)를 개발 서버 하나(8000)로 합친다(사용자 요청, 2026-10-13).
  - 변경 파일: backend/main.py(프로젝트에 frontend/가 있으면 / 로 화면 제공, CORS 제거), frontend/app.js(API_BASE를 같은 주소로 고정), API-SPEC.md(CORS 설명을 같은 주소 제공으로 변경), PLAN.md(실행 기준)
  - 실행 명령: 가상환경에서 python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload → http://127.0.0.1:8000
  - 확인 결과(2026-10-13): 8000에서 /·index.html·app.js·styles.css(올바른 형식)·/api/health·/api/tasks·/docs 200, 없는 API·파일 404. 다른 주소(5500)의 CORS 사전 요청은 허용되지 않음(405). 브라우저로 8000 사용 시 API를 같은 주소로만 호출, 등록·상태 변경·수정·삭제 취소/확인·검색 정상, 기존 DB 데이터 불변, JS 오류 없음. 배포 조건(frontend/ 없는 별도 폴더)에서는 / 404·/api/health 200으로 API만 제공. 배포 App(8001)·Web(localhost) 정상 응답 유지. 5500 서버 종료.
  - 배포본 반영(2026-10-14): 사용자가 sudo bash deploy/install-app.sh, sudo bash deploy/install-web.sh 실행. 확인 결과: /opt/task-flow/app/backend·/var/www/task-flow가 저장소 backend/·frontend/와 차이 없음, task-flow-api·nginx active(App 10:43 재시작), 8001 /api/health {"status":"ok"}·/ 404(API만 제공), localhost /·app.js·styles.css·/api/health·/api/tasks 200·없는 API 404, 배포 app.js가 같은 주소 호출(API_BASE ""). 브라우저 조작은 확인하지 않았다.
  - 남은 오류: 없음. 반영 후 /api/tasks는 빈 목록이었다(스크립트는 DB를 변경하지 않으며 반영 전 건수 기록은 없음).
## 실행 기준
개발 서버(화면+API, 통합 후): 가상환경에서 python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload → http://127.0.0.1:8000
배포(Web·App·DB): http://localhost (sudo bash deploy/install-app.sh, sudo bash deploy/install-web.sh로 반영)
(작업 당시 기록) T01~T04: python3 -m http.server 5500 --bind 127.0.0.1 --directory frontend / T05~T11: 위 uvicorn 명령(API만)
실제 존재하는 파일을 확인한 뒤 명령을 실행한다.
## 기록
각 작업에 변경 파일, 실행 명령, 실제 확인 결과, 남은 오류를 기록한다.
정상 동작을 확인한 작업 단위로 Git 커밋한다.