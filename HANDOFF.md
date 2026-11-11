# ScoreWorks(옛 이름 합주연습기) 인수인계 메모

새 대화에서 이어 작업할 때 먼저 읽는 문서입니다. 무엇을 왜 고쳤는지는 CHANGELOG.md, 사용법·구성·빌드는 README.md에 있습니다. 이 문서는 **작업 규칙, 작업 환경, 샘플 목록, 검사 순서, 남은 과제**만 모았습니다. (마지막 갱신: 2026-11-11, CHANGELOG 140번까지)

## 1. 작업 규칙 (사용자 요청)

- **프로그램 이름은 ScoreWorks**(부제 '국악관현악 악보 분석 및 재생 도구', 11-11에 합주연습기에서 바꿈). 글꼴 Pretendard(본문)·Outfit(이름), 아이콘은 src/index.template.html의 `<symbol id="swMark">`(파비콘은 같은 그림의 data URI). 저장 키(hapju-*)·내보낸 파일 형식 이름(hapju-settings 등)은 예전 것과 맞도록 그대로 둠. **저장소는 11-11에 commst/scoreplay → commst/scoreworks로 이름을 바꿈**(실행 링크 https://commst.github.io/scoreworks/ — 옛 링크 commst.github.io/scoreplay는 GitHub이 넘겨주지 않아 404, 사용자가 넘겨주는 페이지는 두지 않기로 함)

- 고칠 때마다 **GitHub main에 바로 올리고**(https://github.com/commst/scoreworks), 답은 **짧게 + 실행 링크** https://commst.github.io/scoreworks/
- **독립실행 html 파일은 만들지 않는다.** html·zip을 따로 보내지 않는다(단원은 링크로만 씀)
- 고칠 때마다 함께 갱신:
  1. CHANGELOG.md — 날짜 + 일련번호 `## 2026-MM-DD (번호) · 제목`, 원인·고친 방법·확인 결과
  2. README.md — 사용법·구성·도구·빌드가 바뀌면
  3. **앱 안 '업데이트 이력'** — src/index.template.html의 `<template id="histTpl">`. 날짜별 `<section class="hday">`, `<h4>기능 업데이트 <small>n</small>`의 `<details><summary>제목</summary><p>설명</p></details>`, 버그는 `<details class="hbug">` 안에. 개수(small)도 맞출 것
  4. **프로젝트 문서 동기화** — Projects 도구 project_write로 `claude/CHANGELOG.md`, `claude/README.md`에 local_path로 올림
- 목표는 **무결점 프로그램**: 고칠 때 기존 기능을 깨지 않는다. 해석기를 고치면 반드시 기존 샘플 전체 회귀 비교
- **MusicXML 내보내기가 매우 중요**: 사용자는 내보낸 MusicXML을 피날레·뮤즈스코어에서 열어 새 악보를 편집하는 일이 많다. 읽어 들인 PDF와 최대한 같아야 함
- 디자인: A안(가운데 악보, 아래 연주 막대, 왼쪽 탭 설정). 다크 테마 안 씀(시스템 어두운 모드에서 글씨는 보여야 함)
- 오래 걸리는 작업은 **단계가 끝날 때마다 진행 상황을 알린다**. 사용량 한도로 끊기면 리셋 뒤 **묻지 말고 이어서** 한다(진행 메모를 남겨 둘 것)
- **문법은 ES2020까지만**(`??=`·`||=`·`&&=`, 클래스 private `#`·static 블록, 정규식 lookbehind 등 금지): 단원 기기 중 옛 브라우저가 있어 한 곳만 써도 앱 전체가 시작되지 않음(113번). build.py가 test/syntaxcheck.cjs로 검사해 넘으면 빌드를 멈춤
- 커밋 메시지 끝: `Co-Authored-By: Claude …` 줄(세션 안내에 따름)

## 2. 작업 환경

- 저장소 클론: `/home/claude/scoreplay` — 저장소 이름은 scoreworks지만 시험 도구들이 이 로컬 경로를 쓰므로 폴더 이름은 그대로(없으면 add_repo commst/scoreworks 후 `git clone https://github.com/commst/scoreworks /home/claude/scoreplay`). `npm install`(pdfjs-dist 4.10.38) 후 test/의 .mjs가 돈다
- 소스: `src/index.template.html`(앱 화면·MusicXML 내보내기 buildMusicXml·재생 흐름), `src/score-parser.js`(PDF 해석기), `src/audio-engine.js`(소리), `src/musicxml.js`(MusicXML 읽기), `src/outline-*.js`
- 빌드: `python3 build.py` → `index.html` + `version.json`(판 번호 = 한국 시각) + `dist/`
- 이전 세션은 `/home/claude/web`(melody.html = index.template.html, score-parser.js, build_melody.py → deploy-hapju/index.html)에서 고친 뒤 저장소 src로 복사했다. 새 세션은 저장소 src에서 바로 고쳐도 됨
- 뮤즈스코어 4.4.4 AppImage: `/home/claude/mscore/squashfs-root/AppRun` (없으면 다시 받아 압축 풀기; test/msall.sh가 사용)
- **샘플 악보는 비공개 저장소 commst/scoreplay_sample(밑줄)에 있음** — 새 대화(= 새 작업 공간)에서는 사용자에게 zip을 다시 받지 말고: add_repo commst/scoreplay_sample → `git clone --depth 1 https://github.com/commst/scoreplay_sample /home/claude/scoreplay_sample` → `mkdir -p /home/claude/samples && cp /home/claude/scoreplay_sample/pdf/*.pdf /home/claude/samples/`. 611개(약 300MB), manifest.json = md5 → 받은 zip·zip 안 경로. 새 악보를 받으면 ingest.py로 푼 뒤 그 저장소 pdf/와 manifest.json에도 더해 푸시(저작권 — 공개 저장소 scoreplay에는 PDF를 넣지 않음)
- **작업 공간이 새로 만들어지면**(샘플·도구가 모두 사라짐): 저장소 다시 받기 → `npm install` → `mkdir -p /home/claude/web && ln -sfn /home/claude/scoreplay/node_modules /home/claude/web/node_modules` → `mkdir -p /home/claude/web/deploy-hapju && ln -sf /home/claude/scoreplay/index.html /home/claude/web/deploy-hapju/index.html`(fuzz2·pwxml 기본 경로). Playwright는 `NODE_PATH=/opt/npm-tools/node_modules`. MusicXML XSD는 `https://raw.githubusercontent.com/w3c/musicxml/v4.0/schema/{musicxml,xml,xlink}.xsd` → `/home/claude/work/xsd/`. 뮤즈스코어는 `https://github.com/musescore/MuseScore/releases/download/v4.4.4/MuseScore-Studio-4.4.4.243461245-x86_64.AppImage` 받아 `--appimage-extract`
- **작업 공간 사양이 작음(메모리 7GB·코어 2개)**: regall.sh(8개 동시)는 메모리 부족 → `bash test/cmp/reg2.sh <이전 해석기 폴더> test/regrn.mjs`(2개씩, 약 10분). 회귀가 도는 동안 src/score-parser.js를 고치면 결과가 섞이므로 끝날 때까지 손대지 말 것(git stash도 금지)
- **시험 도구용 샘플 별칭**: 샘플을 받은 뒤 `bash test/samples-alias.sh`(옛 접두어 b3a31a97·44e95fb3 → 지금 샘플). 회귀 목록은 `ls /home/claude/samples | grep -v ALIAS`로. axe는 `/home/claude/work/axetmp`에 `npm i axe-core@4.10`
- 처음 돌릴 때 만들 폴더: `mkdir -p xmlout`(pwxml), `mkdir -p /home/claude/mscore/all`(msall.sh)
- 작업 공간에서 github.io·jsdelivr CDN에는 접속이 막혀 배포 페이지를 직접 열 수 없음 → 배포본과 같은 index.html을 Playwright로(pdf.js는 node_modules로 바꿔 끼움) 시험
- 샘플은 사용자에게 **zip으로** 받는다(PDF를 그대로 첨부하면 대화에 펼쳐져 토큰을 많이 씀). 맥에서 만든 zip은 파일 이름이 `#Uc18c` 꼴로 풀리므로 `#U(4자리)`를 글자로 바꿔 이름 붙임
- 한글 파일 이름은 Playwright setInputFiles로 올라가지 않음 → 시험 도구는 `/tmp/pick-<접두어>.pdf`로 복사해 올림(이미 반영)
- 시험 스크립트 대부분은 `/home/claude/samples`(샘플 PDF), `/home/claude/web/node_modules/pdfjs-dist`(앱 시험 때 CDN 대신 쓰는 pdf.js) 경로를 씀. 환경이 새로 만들어졌으면 경로를 맞추거나 SAMPLES 환경변수 사용

## 3. 샘플 악보

### 2026-11-10 다시 받은 zip 전체 (작업 공간이 새로 만들어져 다시 받음: 샘플 611개, 회귀에 쓰는 '읽히는' 악보 481개)
- **이 611개는 비공개 저장소 commst/scoreplay_sample의 pdf/에 올려 둠**(2026-11-10). 2절의 방법으로 받는다
- 받은 zip 36개를 `python3 test/cmp/ingest.py /mnt/user-data/uploads/*.zip`로 넣음. 34-2 프론티어는 34-1 zip 안에 함께 있음
- **소나기는 새 판으로 바뀜(사용자 지정, 옛 pdfFactory 판은 무시)**: zip 63 'Microsoft Print To PDF'로 인쇄한 Encore 악보 — 총보 61c75dd1(22줄 355마디), 대금 031413dc, 소금 b181d587, 피리·태평소 6e27980d, 해금 54ebac86, 가야금 c8df8196·2 1dc61f3a, 거문고 ee2a16f2, 신디1 00cc3dc7·2 8ed32fe5, 타악기 3b5a0517 / 아쟁 a4736a85는 아이폰 사진 PDF(못 읽음). 아래 11-05 목록의 소나기 md5는 더 이상 없음
- 아래 '이전 작업 공간의 샘플 (87개)' 중 이번 zip에 없는 것: 1fe03d65·26dd8f21·44e95fb3·52cfd0bf·59ee4663·9128e77f·9e386483·a05c32d0·b3a31a97·bfb7e6f7·d95ddafe 등 → pwv2는 `PRE=9203ad49`로 돌림(곡 제목 'Flower' 확인 1건만 실패하는 것은 정상), pwedit는 옛 샘플이 없어 못 돌림
- 회귀 목록 /tmp/readable = `ls /home/claude/samples/*.pdf > /tmp/readable`(611개, 읽히지 않는 것은 도구가 건너뜀 — 114번 회귀에서 해석된 파일 499개). 이전 해석기는 /home/claude/prev/에 outline-*.js와 함께. MusicXML XSD는 /home/claude/work/xsd/에 받아 둘 것(xsdcheck.py 경로)


### 2026-11-05 사용자 zip 전체 (샘플 613개, 읽을 수 있는 PDF 542개)
- 받은 zip: /mnt/user-data/uploads/*.zip (곡마다 하나, 이름 앞 번호 = 곡 번호). `python3 test/cmp/ingest.py <zip…>`로 풀어 넣고, zip 안 경로(폴더 = 곡·판) 목록은 manifest.json으로 다시 만든다(ingest.py와 같은 이름 풀기로 zip을 읽어 경로·md5를 적음)
- **대조 규칙(사용자 지정)**: 그룹 = zip 맨 위 폴더. 멋으로 사는 세상(ver0·1·2)·프린스오브제주(두 폴더)·프론티어(34-1·34-2)는 폴더마다 다른 판이라 폴더 안 총보↔파트보끼리. 신뱃놀이는 '신뱃놀이…' 파일끼리(그냥 '총보'와 악기 이름만 있는 파트보는 그림 PDF). 화랑은 관악·타악·현악 폴더 파트보를 총보.pdf와. 아침을 두드리는 소리 총보(5693b576)는 실내악(15-1) 폴더에 있으나 15번 파트보와 대조. 총보가 없는 곡(뱃노래·배띄워라·쑥대머리·길 위에서 만난 사람들·멋으로 사는 세상 ver1·신모듬 3악장(총보가 그림))은 파트보만으로 학습
- 판 차이로 대조 제외: Flowers of K(총보 3/2 66마디 ↔ 파트보 3/4 131마디, 뒤로 갈수록 구성이 다름)
- 그림 PDF(못 읽음, 지원 안 함): 신뱃놀이 타악·건반·'총보' 16개, 판놀음II 스코어 추출 18개, 프린스오브제주 선율 파트보 8개, Fly to the sky 파트보 9개, 아리랑(환상곡)-편집 4개, 신모듬 3악장 스코어·가야금 HJ편집, 미락흘 가야금 HJ편집, 월광 타악 스코어
- **열두 달이 다 좋아 파트보 10개는 그림이 아니라 글꼴 없이 선으로만 그린 PDF** — MuseScore 2.0처럼 모양 맞추기로 지원할 수 있음(과제)


### 2026-11-05 새 작업 공간에 받은 것 (103개, zip 5개: 34-1·34-2 프론티어, 37 월광, 42 달빛항해, 57 미락흘, 63 소나기)
아래 87개 목록과 겹치는 것은 총보 4개뿐(달빛항해 5a5e4c8e, Frontier 9203ad49, 월광 = 경기도립 위촉작품 2bc31eef, 미락흘 = 강원도립 신년음악회 5b2e1f54). 나머지 87개 옛 샘플은 이 작업 공간에 없음.
**선율 파트보가 총보와 함께 있어 마디별 대조에 쓸 수 있음.** 다만 사용자가 가진 악보를 모두 올려 **판이 총보와 다를 수 있음** — 마디 수가 다르면 다른 판으로 보고, 마디 순서를 맞춘 뒤 대부분 일치하는 짝 안에서 국소적으로 어긋난 곳만 오류 후보로 볼 것
- 소나기 (설장구 협주곡, pdfFactory): 총보 78767dd2(22줄 274마디), 타악 989bed97, 가야금1 4d14b65a·2 d01fdca8, 거문고 30ecf7c5, 대금 a20fb355, 소금 05c142e6, 피리 340c8186, 태평소 d5810074, 해금 cc07366e(277마디 — 판 다를 수 있음), 소아쟁 7d439097, 대아쟁 d1283340, 건반 cb301e6b·2 bc30801e
- 프론티어 34-1 (PScript5): 총보 363ca361(15줄 171마디, 옛 a33365d9와 다른 파일), 소금 f26de2e2, 대금 db1091d7, 피리태평소 fffcb9e2, 해금 7cce8f62, 대아쟁 f6400eaa, 가야금 738f131a·2 209a06bb, 거문고 e4b67b61, 건반 af049f24, 타악 1ea4bf1f
- 프론티어 34-2 우리앙상블 (Sibelius 20.6, 총보 9203ad49 170마디): 소금 71309168, 대금 52f7f3f4, 피리 f8a5cee4, 대피리 7a7b0010, 태평소 52dee6a8, 해금 348383a3, 소아쟁 f3f4b1c7, 대아쟁 c89e2641, 가야금 4cd2237f, 거문고 a159a572, 양금 33e41278, Piano b2ad8152, 장구 eeacfd93, 모듬북 5572839c, 꽹가리·징 e37dd8e0, Brass chime·징·잼베 30c7f710
- 달빛항해 (doPDF, 총보 5a5e4c8e 152마디 / 다른 판 Score 6a8c363c): 소금 f71ee972, 대금 4ff5d13d, 피리 4c11c62e, 태평소 a435527b, 해금 d74e426b, 대아쟁 6a124bec, 가야금 65547a57, 거문고 0e4db8dc, 양금 242e8d42, 장구 082ee014, 북 8d480304, 대고 73401d64, 징 2faa3aa8, 공 e731a6ea, OPEN SYMBAL f1a3f359, Bell cc62fc8e, 탬버린 29a4d840, 트라이앵글 7a10f13f
- 월광 (PScript5, 총보 2bc31eef 193마디): 소금 e8e04c44, 대금 047aeebe, 피리 a5d361b5, 대피리 ab608a97, 태평소 31d13b53, 해금 10ef889e, 소아쟁 5139dcdd, 대아쟁 04107df0, 양금 42e6719b, 가야금 2ab6053d, 거문고 2abfe33b, 신디 7d47f709, 장구 8dd5f49b, 쇠 d9ff8023, 징 a2cfc6ba, 모듬북 ab414a04, 심벌·윈드차임 9c5b4722, 대고·공 03d96428 / 타악 스코어 c6413c84는 그림 PDF(못 읽음)
- 미락흘 (Sibelius 22.10, 총보 5b2e1f54 264마디): 소금 985e95bb, 대금 ccb5bf3e, 피리 bd38a457, 저피리 20875ffb, 태평소 cef37825, 피리·태평소 합본 daad401a, 생황 340e1cd7, 해금 671dc786, 소아쟁 89ad9170, 대아쟁 b0bf3d18, 가야금 50f274a6·2 92f62e02, 거문고 6db43133, syn. 4cf0e820, Contrabass 1a5f86c1, 장구 22dd0425, 모듬북 16723f30, 꽹과리·젬베·triangle c0b6c20d, Cymbals·windbell·징·대북 004d79b5 / 가야금 part1 HJ편집 6e5c0683은 그림 PDF(못 읽음)

### 이전 작업 공간의 샘플 (87개)

- 위치: `/home/claude/samples/<md5 앞 8자>-<원래 파일 이름>.pdf` — **저장소에는 없음**(저작권). 작업 공간이 비워졌으면 사용자에게 다시 받거나, 대화 첨부(/mnt/user-data/attachments/…)에서 md5 앞 8자로 이름 붙여 복사
- 새 악보를 받으면 md5로 중복 확인(`md5sum`) 후 `<md5 8자>-이름.pdf`로 추가
- 아래 '줄·마디'는 첫 줄 기준

### 못 읽는 것 (5개) — 스캔 그림 PDF(ezPDF Maker)
신뱃놀이 타악 파트보 5개: 꽹과리·징(12419d72), 북1·북2(19605c57), 장구(5cd1e6e9), 북(91a3a115), 꽹과리(b79d82f4)

### 총보: 선율 + 타악 (33개)
| 곡 | 접두어 | 줄 | 마디 | 파트보 |
|---|---|---|---|---|
| 강원도립국악관현악단 신년음악회 (美!樂!扢!_miracle) | 5b2e1f54 | 21 | 264 | 타악만 |
| 경기도립국악단 위촉작품 (2002) | 2bc31eef | 20 | 193 | 없음 |
| 고구려의 혼 | dbe4d244 | 15 | 118 | 없음 |
| 관현악곡 아리랑 | 1fe03d65 | 14 | 179 | 없음 |
| 남도 아리랑 | e8f58449 | 16 | 194 | 타악만 |
| 남도 아리랑 (다른 판) | a9697ae6 | 16 | 204 | 없음 |
| 달빛항해 | 5a5e4c8e | 21 | 152 | 타악만 |
| 달빛항해 (다른 판, dalbit-Score) | 76ecdce9 | 16 | 152 | (장구·북 파트보가 이 판일 수도) |
| 밀양아리랑 (MuseScore 2.1) | 1e636b86 | 9 | 164 | 없음 |
| 바르도 (Sibelius) | 6268ef29 | 19 | 482 | 없음 |
| 방황 | 20983efb | 17 | 268 | 없음(타악 총보 있음) |
| 신맞이 (2021 수정) | dee46270 | 22 | 316 | 없음 |
| 신뱃놀이 | f69a7ce3 | 14 | 245 | 타악만(스캔이라 못 읽음) |
| 아름다운 나라 | 1aeefe07 | 17 | 118 | 없음 |
| 아름다운 인생 2 – Passion | ea34b050 | 20 | 250 | 타악만 |
| 아리랑 랩소디 (MuseScore 2.1) | 59e5089b | 11 | 116 | 없음 |
| 아리랑 환상곡 (MuseScore 2.1) | 5dce28a0 | 7 | 69 | 없음 |
| 아침을 두드리는 소리 | 5693b576 | 22 | 374 | 타악만 |
| 얼씨구야 | 52cfd0bf | 22 | 249 | 없음 |
| 연변목가 | b3a31a97 | 15 | 158 | 타악만 |
| 열두 달이 다 좋아 | 1c15f8d2 | 17 | 119 | 없음 |
| 축연무 | 59b91b36 | 15 | 89 | 없음(타악 총보 있음) |
| 타(TA) (Finale 2012) | c61daae9 | 19 | 330 | 없음 |
| 판놀음 | 65f37e53 | 20 | 109 | 타악만 |
| 홀로 아리랑 | dbd12037 | 16 | 89 | 없음 |
| 화랑의 기상 | 9e386483 | 21 | 266 | 없음 |
| 청산 (한컴 PDF, Petrucci) | 3c395456 | 21 | 319 | 없음 |
| 소금협주곡 「길」 | 7a797745 | 16 | 304 | 없음 |
| Flower of K | 44e95fb3 | 12 | 66 | 없음 |
| Fly to the sky | 40c156c7 | 20 | 54 | 없음 |
| Frontier (양방언, Sibelius) | 9203ad49 | 19 | 170 | 타악만 |
| Frontier (다른 판) | a33365d9 | 15 | 171 | 타악만 |
| Prince of CHEJU | b6e0ee9d | 15 | 101 | 타악만 |

### 타악 총보 (8개)
남도 아리랑 타악(91373a93) · 멋으로 사는 세상 타악(11637cb5) · 방황 타악(2feeab8e) · 신모듬 3악장 타악(8ab47907) · 아름다운 인생 2 타악(0a657772, 경고 많음 90/249) · 축연무 타악(20e36aa0) · 판놀음 타악(cb8b6436) · Prince of je-ju 타악(a32e0925)

### 파트보 (41개, 선율은 3개뿐)
- 강원도립 신년음악회: 장구 5ef31747, 모듬북 6144f89d, 꽹과리·젬베 fa08e11a
- 길 위에서 만난 사람들 (MuseScore 2.0.3, **총보 없음**): 소금 9192cc4a, 대아쟁 951ae4f2, 북 ab23dfc8, 꽹과리 ce44921e, 장구 f1fd9649
- 남도 아리랑: 북(고) 17113663, 장구 7e6fa5ea·fe1130fa, 쇠 4c4eb272, 모듬북 9900dce5
- 달빛항해: 장구 52e96694, 북 b52d816b
- 멋으로 사는 세상: 모듬북 e0c4a9d1, 스네어·하이햇 e53f406b
- 아름다운 인생 2: 모듬북 63191cce, 봉고 648e2702(경고 79/249)
- 아침을 두드리는 소리: 꽹과리 2c89fa52, 모듬북 ca8c1caa, 장구 11aad2cc, 다른 판 11c7127c·640f819f·7b668d7c
- 연변목가: 목탁 26dd8f21, 북 5b6313b5, 장고 d95ddafe
- 축제 (**총보 없음**): 꽹과리·징 2e6051aa, 모듬북 6423deca, 장구 a05c32d0(경고 63/127)
- FRONTIER: 꽹과리·징 9128e77f, 모듬북 bfb7e6f7, 장구 59ee4663
- Prince of Cheju: 모듬북 91b99175, 봉고 a0dbfb55, 장고 be9b5b83, 악기 미확인 818bf285·de220c62
- 신모듬 3악장: 소아쟁 468af318 (선율 총보 없음)
- 판놀음: 장구 5f54fd88(경고 84/109)

### 더 받으면 좋은 샘플 (사용자에게 안내함)
- **선율 악기 파트보**(가야금·대금·해금·피리·거문고·아쟁) — 특히 총보가 있는 곡(달빛항해·연변목가·남도 아리랑·아침을 두드리는 소리·청산·길)의 것: 총보 결과를 정답 삼아 마디마다 자동 대조 가능
- 길 위에서 만난 사람들·축제의 총보
- MuseScore 3·4, Dorico PDF (아직 시험 못 함)

## 4. 고친 뒤 검사 순서

해석기(score-parser.js)를 고쳤으면 (마디 수가 바뀌는 수정은 `test/regrn.mjs`(마디 번호로 맞댐), 일괄 실행은 `TOOL=test/regrn.mjs bash test/cmp/regall.sh <이전 해석기 폴더>` — 샘플 목록은 /tmp/readable. 이전 파일은 `/home/claude/prev/`에 outline-*.js와 함께 복사해 두어야 import가 됨):
1. 고치기 전 파일을 복사해 둔다(예: `/home/claude/score-parser.prev.js`)
2. `node --max-old-space-size=6000 test/regr.mjs <이전 파일 절대경로> <샘플들>` — 85곡 이상은 메모리 부족(137)이 나므로 40여 개씩 나눠서. `files diff 0`이 기본, 차이가 나면 `PREV=… node test/bdiff.mjs <접두어>`로 마디별 확인 후 그림 대조(`test/vis.mjs`, pdftoppm으로 해당 마디 잘라 보기)
   - 성부(R/L) 나누기를 건드렸으면 regr는 모두 차이로 나오므로 `test/regrv.mjs`(성부 빼고 음만 비교, 경고 마디 수 변화)와 `test/alignv.mjs`(세로 맞춤까지) 사용. 바뀐 마디는 `test/crop.mjs <접두어> <줄> <마디>`로 잘라 그림과 대조
3. 새 악보: `test/inv.mjs`(요약), `test/lstat.mjs`(줄별 경고)
4. 세로 맞춤을 건드렸으면 `test/alignregr.mjs` (alt=0, lost 없음, broken=0)

앱·MusicXML:
5. 빌드 후 **`node test/tdzcheck.cjs index.html`(선언 전 접근 후보)**, **`node test/pwboot.cjs index.html`(저장된 설정으로 시작되는지 — 113번)**, `node test/pwv2.cjs <html> desktop|tablet|phone`, `node test/fuzz2.cjs <씨앗> 50 [mobile]`, `node test/pwedit.cjs <html>`, 화면 관련이면 pwtabland·pwseek·pwspeed·pwpause·pwaxe·pwcontrast
6. MusicXML: `node test/pwxml.cjs <접두어…>`(앱에서 모든 줄 켜고 내보내기 → test/xmlout/), `python3 test/xsdcheck.py xmlout/*.musicxml`(전부 VALID), `python3 test/xmlcheck.py <접두어…>`(원래 음 대비 빠짐·더함), `python3 test/integrity.py …`(붙임줄·이음줄·잇단 짝 0 오류), `bash test/msall.sh <절대경로…>`(뮤즈스코어로 열기 rc=0, 쪽 수)
7. 이전 판과 견줄 때: `HTML=<이전 index.html> node test/pwxml.cjs …`

## 5. 구조 요점 (자세한 것은 CHANGELOG)

- 해석기: 쪽 → 오선·단(layout) → 줄(lines) → `analyzeLine(score, 줄)` = 마디 목록(bars: number, barLen(분수, 온음표=1), events{t,dur,voice R/L,midis,x,tie…}, warnings) + geo(마디의 쪽·오선·x) + marks
- 악보 글꼴 번호는 Maestro(맥) 번호로 맞춤: Petrucci·SMuFL·MScore·Anastasia·윈도 PUA·Latin-1(한컴 PDF) 변환은 extractPages 뒤 글자 후처리
- **세로 맞춤(alignToSystem)**: 총보에서 '박자보다 김/마디 길이를 넘음' 마디만, 같은 단의 경고 없는 줄들의 음 시각(분수)과 가로 자리로 다시 읽음. 앱은 줄을 처음 해석할 때 `alignRaw`로 적용(다른 줄 해석은 악보마다 `_rawCache`)
- MusicXML 내보내기(buildMusicXml): 4분음표 = 3360, 조표·음 이름, 성부 합치기, 빔·잇단·붙임줄·이음줄, 쪽·오선 크기(KS 0.8)·마디 폭, 파트 묶음·악기 소리, 셈여림·연주 지시 글자, 깨진 잇단 마디는 16분 칸으로 다시 만듦
- 음 고치기(✎): 원래 음(시각·길이·음높이)이 같을 때만 다시 입힘 → 인식이 바뀌면 '적용하지 못함'으로 알림
- 설정 저장 키는 파일 내용 지문(fp) — 제목이 바뀌어도 설정은 유지

## 6. 남은 과제·알려진 한계

### 128번(11-11) — 문제점 신고하기·다른 파일의 음 수정 (끝남)

- [문제점 신고하기]: FormSubmit(`REPORT_TO`, 사용자 계정 메일 — 공개 소스에 두는 것에 사용자 동의)로 전송, 실패하면 mailto. **사용자가 첫 제보 뒤 확인 메일의 [Activate Form]을 눌러야 도착함 — 눌렀는지 아직 확인 전.** 확인되면 FormSubmit이 주는 무작위 별칭 주소로 `REPORT_TO`를 바꿔 메일 주소를 소스에서 숨길 수 있음(사용자가 원하면)
- 음 수정 공유: 같은 파일은 122번부터 이미 됨. 다른 파일(판)로 받을 때도 원래 음이 같은 곳에 적용하도록 고침. 시험 test/pwreport.cjs, test/pwshare.cjs(음 수정 항목 추가)

**140번(11-11)**: 잔향 처음 값 보통(0.22)

**139번(11-11)**: 조표만 있는 칸은 마디 아님(keyOnly, 조표 없는 줄은 같은 단 다른 오선을 봄). 남은 것: 멋으로 사는 세상 ver2 총보(c062682c) Cymbals 줄 158마디에서 하나 어긋남

**138번(11-11)**: 메트로놈 클릭 4/5kHz '틱', 음악 크기 맞추기 뒤 따로 더함, 크기 선택(optMetroVol). 측정 test/metrolvl.mjs·metroband.py

**137번(11-11)**: 저장소 이름 scoreworks로 — 앱 안 주소(GH_REPO, APP_URL, 사용설명서 링크, 브라우저에서 실행), README·설명서·시험 도구(라우팅 주소)를 새 주소로

**136번(11-11)**: 이 기기에 설정이 없는 곡에 공유 설정이 있으면 #ghOffer 알림으로 물어 [확인]으로 적용(전에는 바로 적용)

**135번(11-11)**: 이름 ScoreWorks, 글꼴·아이콘·위 막대(가운데 이름, 3칸 grid: .tb-left/.tb-logo/.tb-right, 단추 .ll/.ls 긴·짧은 이름)·첫 화면 가운데 배치. 사용설명서 그림 전부 다시 찍음(tools/manual/mancap*.cjs — 글꼴은 /home/claude/work/fonts에 `npm i pretendard@1.3.9 @fontsource-variable/outfit`, PDF 만들 때 /home/claude/work/manual/fonts/에 PretendardVariable.woff2·outfit-latin-wght-normal.woff2 복사, mancap6은 `shot 79 가야금`, 새 mancap8 = 04b·15). 화면 그림 비교는 test/pwshot.cjs

**134번(11-11)**: 휴대폰이 메모리 때문에 페이지를 다시 열면 악보가 사라지던 것 → 올린 파일을 IndexedDB `hapju-session`에 기억(sessSave/sessBoot/sessClear, 같은 탭이면 저절로, 새 탭이면 #resumeBtn). 터치 기기 입력칸 16px(iOS 저절로 확대 막음), 악보 보기 캔버스 상한(svScale·SV_KEEP·freeCanvas). 시험 test/pwsession.cjs. **아이폰 실기기 확인 대기**

**133번(11-11)**: 서랍 탭 줄과 ✕를 sticky 머리 `.side-head`로 묶음(굴리면 ✕가 사라지던 것). 시험 test/pwsheetx.cjs

**132번(11-11)**: ♩=♪ 기본 방향 = 오른쪽이 새 박(앱 eqRight: eqFlip 없음/true = 오른쪽). 해석기 defaultTempoRows는 예전(왼쪽) 방식 값 그대로 두고 앱에서 propagateEq로 다시 계산. 시험 test/pweq.cjs

**131번(11-11)**: Sibelius Opus 글꼴의 X 머리(192)를 X 머리 음표로 읽음(프론티어 꽹과리 12마디 제보). 회귀 경고 7,920 → 7,795, 새 경고 0

**130번(11-11) 끝남**: 연주 칸 제목 '재생 설정', 빠르기 탭 '빠르기'·'rit. · accel.' 제목 왼쪽 정렬(`.ttl-row.ttl-left`). main에 올림. wip-130 브랜치는 남아 있음(지워도 됨)

**129번(11-11) 단추·제목 정리**: 단추 색(--b-bg 등)·같은 너비(.btn-grid)·제목 가운데(.ttl-row)·곡 제목 바꾸기(state.titleRead/state.title, 설정 songTitle). 시험 test/pwtitle.cjs. **사용설명서(manual.pdf)는 예전 단추 이름('사용법'·'화면 가득 보기')과 첫 화면 단추 줄 그림이 남아 있음 — 다음에 그림·글 갱신**

**127번 뒤 확인 대기**: 사용자가 태블릿에서 월광 설정을 올렸다고 했으나 저장소에는 달빛항해(Score).pdf 설정만 있었다(월광 파일 없음). 127번에서 안내 글에 파일 이름을 넣었으니, 사용자가 월광을 다시 저장해 보고 알려 주기로 함.

**전체 점검에서 남은 것**(사용자가 다시 요청하지는 않음): MusicXML 일괄 내보내기 검사, '쉼표 일부 숨김' 경고 약 8,000개 분류(타 c61daae9, 아름다운 인생 ea34b050, 화랑), 판놀음II 타악 e2e04847 12마디 주고받는 짧은 빔, 2도 떨어진 이웃 음을 화음으로 읽는 것(아름다운 인생 196, 연변목가 가야금 79~82), 월광 거문고 8마디 4분 셋잇단, 소나기 대금 162 쌍둥이 머리 점. 사용설명서 3장 그림이 예전 화면, 좁은 표에서 '기준' 선택 글자 잘림.

### 이전부터 남은 것

- MusicXML: 마디를 넘는 이음줄(예: 달빛항해 해금 9→10), '2nd Time' 같은 글자, 숨긴 쉼표가 보이는 것
- MusicXML 원래 음 대비 차이(이전부터 있던 것, 잇단 맞춤 마디): 아침을 두드리는 소리 44, 달빛항해 19, 청산 15, 신맞이 12, 경기도립 9 등
- 뮤즈스코어 쪽 수가 크게 늘어나는 곡: 아름다운 인생 2(42→71쪽), 아침을 두드리는 소리(47→54), 신맞이(52→56) — 뮤즈스코어가 마디 폭을 쓰지 않음
- 세로 맞춤으로 못 고친 넘친 마디 약 1,100개(근거 줄 부족), 셋잇단·다섯잇단 섞인 복잡한 마디
- 아침을 두드리는 소리 다른 판 모듬북(640f819f) 229·231마디: 첫 화음의 점을 못 읽어 X 머리 음들이 마디를 넘음
- 경고 많은 타악 파트보: 판놀음 장구, 아름다운 인생 2 봉고·타악 총보, 축제 장구
- 스캔 PDF는 읽지 못함(신뱃놀이 파트 5개)
- 총보↔파트보 대조 도구는 test/cmp/ (104번). 104번 뒤 남은 다른 마디: 리듬 2,121(경고 없는 것 707), 음높이만 1,500여(대부분 판 차이 ±12·조옮김)
- 남은 대조 과제: 빽빽한 총보(한 쪽 22줄)의 32분음표 빔(아침을 두드리는 소리 꽹과리·대고 — 파트보가 맞음), 달빛항해 Score 136마디 윗성부 셋잇단 괄호, 방황 가야금·화랑 25현 등 임시표·조표, 각 그룹의 '마디 길이 다름' 유형(rhythm.py) 나머지
- 남은 '쉼표 숨김' 경고 대부분은 악보 그대로: 5/4박 마디에 온음표 하나(프론티어 34-1 대아쟁 21~24마디 — 마디 전체로 볼지는 미정), 성부가 마디 중간에 갈라짐(소나기 대금 141마디 등 — MusicXML에서 숨긴 쉼표 대신 forward를 쓸지 검토)
- 파트보 제목이 첫 글자만 나오는 것: 프론티어 34-1 해금 파트보 제목이 '해'(줄 이름은 ONE 표로 채우지만 파트보 제목은 안 채움)
- 106번 뒤 남은 것: 배띄워라 대아쟁 4마디(아래 성부를 점2분 머리로 적고 8분음표가 이어짐 — 악보 표기 문제로 보임), 월광 총보 1~15마디는 마디선 없는 rubato라 단마다 한 마디, 열두 달 Score 현 8·9·12마디(괄호 못 찾음), 프린스오브제주 소금 39마디, 아침을 두드리는 소리 가야금 147~164마디(셋잇단 두 묶음만 적힌 4/4 마디: 숨은 쉼표 자리). MusicXML 대량 검사는 /tmp/xsel(75곡) + `node test/pwxml.cjs` 4개씩 나눠 돌림(합쳐 약 15분). 총보 없는 그룹(뱃노래·배띄워라·쑥대머리·길위에서·멋으로 ver1·신모듬 3악장)의 경고 유형: 쉼표 숨김, 박자보다 김, 마디 합침
- 107번 뒤: 사용자 제보 'rit를 한 마디에 넣었는데 동작하지 않음'은 예시·파트보에서 재현 안 됨(엔진·화면 모두 느려짐 확인) — 곡·마디·길이·끝 %·기기를 물어 둠
- 108번: MusicXML 저장 뒤 확인 창(xmlCheck/openXmlCheck)과 겹쳐 보기(svOverPanel, #svOver). 확인 창은 '치는 때'만 비교(음높이 비교는 옥타브·조옮김 설정 때문에 안 함). 겹쳐 보기 세로 자리는 MusicXML 음 이름 + 음자리표로 계산
- 109번: 확인 창·겹쳐 보기를 PDF 음표 머리(geo.heads, 해석기가 normal 마디에 넣음) 기준으로. xmlNoteXY가 음의 쪽 좌표 계산, 허용 가로 1.4칸·세로 0.3칸. 타악 줄(role perc)·옥타브·조옮김 줄은 가로만(pitchOk). 이벤트에 dia(적힌 온음 번호)를 실어 MusicXML 음 이름을 적힌 대로(C♭ 등). 남은 일: 확인 창에 뜬 마디(Frontier 대금·해금 15·19·47·51마디의 아랫성부 쉼표 자리 A♭ 등)는 실제 인식 오류 — 다음 해석기 개선 후보
- 110번: Sibelius의 작은 글자 셈여림(Opus Text) 읽기. 셈여림을 건드리면 `TOOL=test/regdyn.mjs bash test/cmp/regall.sh <이전 해석기 폴더>`
- **111·112번(11-10)**: 소나기 새 판(윈도 인쇄 Encore) 읽기, 아래 기둥 화음의 아랫음 성부 갈림 고침. 남은 것: 바르도 대금 23마디 첫 화음으로 들어오는 붙임줄, 판놀음II 태평소 41마디 붙임줄 온음표, 소나기 타악기 MusicXML이 뮤즈스코어에서 8 → 15쪽
- **이어 할 일(11-10 사용자 요청 '아랫성부 표기 누락·쉬는 마디·악상기호')**: ① 아랫성부 — **112번에서 고침(아래 내용은 기록)** — 한 기둥(아래로 향한) 화음의 아랫머리를 따로 성부 R로 갈라 읽는 문제. 예: Frontier 총보 9203ad49 대금(줄 1)·해금(줄 16) 15·19·47·51마디, Piano 윗줄 19마디: 아랫음 A♭을 쉼표 자리(0.625)에 놓고 셋잇단도 못 붙임 → MusicXML 성부1(위 기둥)=아랫음, 성부2=윗음으로 뒤바뀜. 해석기 makeNote 기둥 고르기·성부 나누기 쪽을 볼 것, 고친 뒤 regrn 전체 회귀. 확인 창(저장 뒤 확인)의 'PDF 머리에 맞는 음 없음/음 높이 다름' 마디가 이런 곳의 목록이 됨 ② 쉬는 마디 — MusicXML·뮤즈스코어에서는 정상, 사용자에게 곡·마디를 물어 볼 것 ③ 악상기호 — 셈여림은 110번에서 고침, 나머지(아티큘레이션·글자 지시)는 MusicXML에 들어감(Frontier: staccato 801·accent 768·slur 704·tenuto 97·words 64)
- **113번(11-10)**: '악보로 보기'를 저장해 두면 시작이 멈추던 것(`svOverData` 선언 전 접근) 고침. 시작할 때 실행되는 코드가 쓰는 전역 `let`/`const`는 반드시 그 앞에 선언할 것(선언 전 접근 = 앱 전체 멈춤). 화면을 고친 뒤에는 `node test/pwboot.cjs index.html`(저장된 설정 여러 가지로 시작)을 꼭 돌릴 것. 114번: 바르도 대금 23마디 붙임줄 임시표·판놀음II 태평소 41마디(반쪽씩 그린 붙임줄 채움을 여러 마디 쉼표로 읽음) 고침. 남은 것: 판놀음II 태평소 37마디(두 성부 같은 음 온음표를 비켜 적음 → 붙임줄 이음으로 읽어 2/1)
- 117번에서 찾은 해석기 문제: 연변목가 총보(52271c34) 가야금 윗줄 79~82·86~89마디 — 2도로 붙여 찍은 화음 머리를 따로 읽어 15/8마디(사용설명서 9장 그림의 예이므로 고치면 그림 설명도 바꿀 것)
- 사용설명서를 바꾸면: tools/manual/manual.html 고치고 `cp -r tools/manual/{manual.html,img} /home/claude/work/manual/` 뒤 `node tools/manual/mkpdf.cjs` → manual.pdf 복사. 장 번호를 바꾸면 차례·'n장' 참조도
- 116번 점검에서 남긴 것(이전부터): 바르도 총보 대금 300마디 1/32 길게 읽음 → 301마디 붙임줄 음이 MusicXML에서 빠짐, 바르도 해금 42마디 셋잇단 16분, pwrange2는 84번 전 화면용 옛 시험
- 앱의 기준 줄(master)은 경고가 가장 적은 줄 → 경고 수가 바뀌면 기준 줄이 바뀔 수 있음(103번에서 월광 8·16마디 MusicXML 박자가 바뀐 원인)
- **121번(11-10)**: 오선 사이 덧줄 음표의 주인 오선(ownerFix, 덧줄로 판단), 같은 음 되풀이 16분음표의 기둥 고르기, 겹친 위·아래 꼬리. 경고 유형 집계는 `node test/wtally.mjs <악보…>`(샘플 전체 약 10분, 결과 JSON 줄). 남은 것: 두 성부가 번갈아 치는 타악 줄의 애매한 토막 빔(e2e04847 12마디), '쉼표 일부 숨김' 경고 8천여 건 중 실제 오류 가려내기(경고 많은 곡: 타 c61daae9 430, 아름다운 인생 ea34b050, 화랑 등), 타(c61daae9) 3:18마디처럼 점4분음 셋(9/8)인 마디의 박자 판단
- **122번(11-11)**: 공유 설정(저장소 `settings/*.json`, 앱이 GitHub API로 main에 바로 커밋함 → **푸시 전에 반드시 `git fetch origin main` 후 rebase**), 마디 골라 넣기(pickMode), 뒤 구간 함께 옮기기(tempoShift), tempoDet. 시험 `node test/pwshare.cjs`. 실제 토큰으로 저장되는지는 사용자가 확인해야 함(아직 확인 전)
- **126번(11-11)**: 자유 박 마디(alignFreeBars — '마디선이 보이지 않아' 경고가 있는 단을 가로 자리로 맞춤), 표지 빈 오선(blankLeadPages). 고친 뒤 `node test/freechk.mjs <총보…>`로 out·nonmono·lenMismatch가 0인지 볼 것. 회귀 비교용 이전 해석기는 /home/claude/prev/

