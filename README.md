# ScoreSori · 국악 합주 연습기

악보(총보·파트보) PDF를 브라우저에서 읽어 가야금·대금·해금 등 선율 악기와 장구·꽹과리 등 타악기를 녹음한 소리로 재생하는 연습 도구입니다. 국악관현악단 늘봄 단원 연습용으로 만들었습니다. 악보 파일은 브라우저 안에서만 처리되고 서버로 올라가지 않습니다.

## 할 수 있는 것
- Finale · Sibelius · MuseScore 2 · Encore에서 저장한 벡터 PDF 읽기 (스캔·사진 PDF는 안 됨)
- 총보 하나 또는 파트보 여러 개 올리기, 줄마다 선율 / 타악 / 끄기, 악기 소리·옥타브·음량
- 음높이·리듬·붙임줄·꾸밈음·트레몰로(굴림)·셈여림·템포·도돌이표(1·2번 괄호, D.S., 코다) 해석
- 녹음 음원: 가야금, 거문고, 대금, 소금, 피리, 태평소, 해금, 아쟁 / 장구, 꽹과리, 징
- 긴 음 농현·요성, 카운트인, 메트로놈, 쉬는 마디 박 짚기, 속도 조절, 구간 반복
- MP3(128kbps)·WAV 저장, 인식 결과 JSON 저장

## 폴더
| 경로 | 내용 |
|---|---|
| `src/index.template.html` | 화면과 앱 코드 (빌드 때 아래 모듈이 끼워짐) |
| `src/score-parser.js` | PDF 악보 해석기 (pdf.js 연산자 목록 → 마디·음표) |
| `src/outline-glyphs.js`, `src/outline-templates.js` | MuseScore 2 외곽선 글꼴 기호 인식 |
| `src/audio-engine.js` | 연주 계획(템포·반복)과 타악 소리 합성 |
| `src/melody-engine.js` | 선율 악기 소리 (녹음 음원 + 합성음) |
| `src/samples.json` | 장구·꽹과리·징 녹음 (16bit PCM, base64) |
| `banks/*.mp3`, `banks/*.json` | 선율 악기 녹음과 음 목록 [종류, 음높이(midi), 시작초, 길이초] |
| `tools/` | 녹음에서 음을 잘라 뱅크를 만드는 스크립트, 외곽선 견본 생성기 |
| `test/` | 회귀·성능 테스트 (Node, 샘플 PDF 필요) |

## 빌드
```
python3 build.py
```
- `dist/index.html` : 한 파일 배포판 (이 파일 하나만 올리면 됨, 약 9MB)
- `dist/split/` : 가벼운 배포판 (`index.html` + `banks/` 폴더를 함께 올림, 처음 약 2MB)

## 테스트
```
npm install
node test/stat.mjs ../src/score-parser.js 악보.pdf ...
```
