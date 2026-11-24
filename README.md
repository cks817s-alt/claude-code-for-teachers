# 선생님을 위한 클로드 코드

처음 쓰는 선생님도 따라 할 수 있는 클로드 코드(Claude Code) 단계별 안내 사이트입니다.

- 1단계 첫걸음: 설치와 계정 · 처음 열고 파일 고치기 · 기본 명령어 · 도구 설치
- 2단계 수업 도구 만들기: HTML 도구와 GitHub Pages · 단원 콘텐츠함 · Apps Script 웹앱 · Gemini 키 · AI 서술형 피드백
- 3단계 실시간 수업과 업무 자동화: Firebase 실시간 앱 · 학교 계정 로그인 · 답안 채점 · 데이터 분석 · hwpx 보고서 · 소개 영상 · 점검 · 드라이브 연결

## 고치는 법

- 내용은 `assets/data.js` 의 `CARDS` 만 고치면 됩니다. 단계 `id` 는 바꾸지 마세요(브라우저에 저장된 진행 기록의 열쇠).
- 화면은 `assets/app.js`, 모양은 `assets/style.css`.
- 진행 기록([다 했어요])과 글자 크기는 방문자의 브라우저(localStorage)에만 저장되고, 서버로 보내는 정보는 없습니다.
- 로컬에서 보기: 이 폴더에서 `python -m http.server` → http://localhost:8000
