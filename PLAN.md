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
- [ ] T04: 설명·우선순위·마감일·검색·필터·지연 표시.
  확인: 필터 중 수정·삭제, 어제 마감 TODO의 지연 표시.
## 3장: API
- [ ] T05: API-SPEC.md 작성, FastAPI /api/health 구현.
  확인: curl로 200과 status=ok.
- [ ] T06: 메모리 기반 /api/tasks GET과 POST.
  확인: /docs에서 등록 후 조회. 입력 위반은 422.
- [ ] T07: PATCH·DELETE와 필터 구현.
  확인: 미전달 필드 유지, 없는 ID 404, 삭제 204.
- [ ] T08: 프런트엔드 저장 처리를 API 호출로 교체.
  확인: 화면과 curl 목록이 같음. API 중지 시 오류 표시.
## 4장: DB
- [ ] T09: MariaDB 전용 사용자·DB와 .env 준비. 접속 확인.
- [ ] T10: backend/database.py, models.py, init_db.py 생성.
  확인: python -m backend.init_db 실행 후 tasks 테이블 확인.
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