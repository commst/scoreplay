# 합주연습기 인수인계 메모

새 대화에서 이어 작업할 때 먼저 읽는 문서입니다. 무엇을 왜 고쳤는지는 CHANGELOG.md, 사용법·구성·빌드는 README.md에 있습니다. 이 문서는 **작업 규칙, 작업 환경, 샘플 목록, 검사 순서, 남은 과제**만 모았습니다. (마지막 갱신: 2026-11-05, CHANGELOG 103번까지)

## 1. 작업 규칙 (사용자 요청)

- 고칠 때마다 **GitHub main에 바로 올리고**(https://github.com/commst/scoreplay), 답은 **짧게 + 실행 링크** https://commst.github.io/scoreplay/
- **독립실행 html 파일은 만들지 않는다.** html·zip을 따로 보내지 않는다(단원은 링크로만 씀)
- 고칠 때마다 함께 갱신:
  1. CHANGELOG.md — 날짜 + 일련번호 `## 2026-MM-DD (번호) · 제목`, 원인·고친 방법·확인 결과
  2. README.md — 사용법·구성·도구·빌드가 바뀌면
  3. **앱 안 '업데이트 이력'** — src/index.template.html의 `<template id="histTpl">`. 날짜별 `<section class="hday">`, `<h4>기능 업데이트 <small>n</small>`의 `<details><summary>제목</summary><p>설명</p></details>`, 버그는 `<details class="hbug">` 안에. 개수(small)도 맞출 것
  4. **프로젝트 문서 동기화** — Projects 도구 project_write로 `claude/CHANGELOG.md`, `claude/README.md`에 local_path로 올림
- 목표는 **무결점 프로그램**: 고칠 때 기존 기능을 깨지 않는다. 해석기를 고치면 반드시 기존 샘플 전체 회귀 비교
- **MusicXML 내보내기가 매우 중요**: 사용자는 내보낸 MusicXML을 피날레·뮤즈스코어에서 열어 새 악보를 편집하는 일이 많다. 읽어 들인 PDF와 최대한 같아야 함
- 디자인: A안(가운데 악보, 아래 연주 막대, 왼쪽 탭 설정). 다크 테마 안 씀(시스템 어두운 모드에서 글씨는 보여야 함)
- 커밋 메시지 끝: `Co-Authored-By: Claude …` 줄(세션 안내에 따름)

## 2. 작업 환경

- 저장소 클론: `/home/claude/scoreplay` (없으면 add_repo commst/scoreplay 후 clone). `npm install`(pdfjs-dist 4.10.38) 후 test/의 .mjs가 돈다
- 소스: `src/index.template.html`(앱 화면·MusicXML 내보내기 buildMusicXml·재생 흐름), `src/score-parser.js`(PDF 해석기), `src/audio-engine.js`(소리), `src/musicxml.js`(MusicXML 읽기), `src/outline-*.js`
- 빌드: `python3 build.py` → `index.html` + `version.json`(판 번호 = 한국 시각) + `dist/`
- 이전 세션은 `/home/claude/web`(melody.html = index.template.html, score-parser.js, build_melody.py → deploy-hapju/index.html)에서 고친 뒤 저장소 src로 복사했다. 새 세션은 저장소 src에서 바로 고쳐도 됨
- 뮤즈스코어 4.4.4 AppImage: `/home/claude/mscore/squashfs-root/AppRun` (없으면 다시 받아 압축 풀기; test/msall.sh가 사용)
- **작업 공간이 새로 만들어지면**(샘플·도구가 모두 사라짐): 저장소 다시 받기 → `npm install` → `mkdir -p /home/claude/web && ln -sfn /home/claude/scoreplay/node_modules /home/claude/web/node_modules` → `mkdir -p /home/claude/web/deploy-hapju && ln -sf /home/claude/scoreplay/index.html /home/claude/web/deploy-hapju/index.html`(fuzz2·pwxml 기본 경로). Playwright는 `NODE_PATH=/opt/npm-tools/node_modules`. MusicXML XSD는 `https://raw.githubusercontent.com/w3c/musicxml/v4.0/schema/{musicxml,xml,xlink}.xsd` → `/home/claude/work/xsd/`. 뮤즈스코어는 `https://github.com/musescore/MuseScore/releases/download/v4.4.4/MuseScore-Studio-4.4.4.243461245-x86_64.AppImage` 받아 `--appimage-extract`
- 샘플은 사용자에게 **zip으로** 받는다(PDF를 그대로 첨부하면 대화에 펼쳐져 토큰을 많이 씀). 맥에서 만든 zip은 파일 이름이 `#Uc18c` 꼴로 풀리므로 `#U(4자리)`를 글자로 바꿔 이름 붙임
- 한글 파일 이름은 Playwright setInputFiles로 올라가지 않음 → 시험 도구는 `/tmp/pick-<접두어>.pdf`로 복사해 올림(이미 반영)
- 시험 스크립트 대부분은 `/home/claude/samples`(샘플 PDF), `/home/claude/web/node_modules/pdfjs-dist`(앱 시험 때 CDN 대신 쓰는 pdf.js) 경로를 씀. 환경이 새로 만들어졌으면 경로를 맞추거나 SAMPLES 환경변수 사용

## 3. 샘플 악보

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

해석기(score-parser.js)를 고쳤으면 (이전 파일은 `/home/claude/prev/`에 outline-*.js와 함께 복사해 두어야 import가 됨):
1. 고치기 전 파일을 복사해 둔다(예: `/home/claude/score-parser.prev.js`)
2. `node --max-old-space-size=6000 test/regr.mjs <이전 파일 절대경로> <샘플들>` — 85곡 이상은 메모리 부족(137)이 나므로 40여 개씩 나눠서. `files diff 0`이 기본, 차이가 나면 `PREV=… node test/bdiff.mjs <접두어>`로 마디별 확인 후 그림 대조(`test/vis.mjs`, pdftoppm으로 해당 마디 잘라 보기)
   - 성부(R/L) 나누기를 건드렸으면 regr는 모두 차이로 나오므로 `test/regrv.mjs`(성부 빼고 음만 비교, 경고 마디 수 변화)와 `test/alignv.mjs`(세로 맞춤까지) 사용. 바뀐 마디는 `test/crop.mjs <접두어> <줄> <마디>`로 잘라 그림과 대조
3. 새 악보: `test/inv.mjs`(요약), `test/lstat.mjs`(줄별 경고)
4. 세로 맞춤을 건드렸으면 `test/alignregr.mjs` (alt=0, lost 없음, broken=0)

앱·MusicXML:
5. 빌드 후 `node test/pwv2.cjs <html> desktop|tablet|phone`, `node test/fuzz2.cjs <씨앗> 50 [mobile]`, `node test/pwedit.cjs <html>`, 화면 관련이면 pwtabland·pwseek·pwspeed·pwpause·pwaxe·pwcontrast
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

- MusicXML: 마디를 넘는 이음줄(예: 달빛항해 해금 9→10), '2nd Time' 같은 글자, 숨긴 쉼표가 보이는 것
- MusicXML 원래 음 대비 차이(이전부터 있던 것, 잇단 맞춤 마디): 아침을 두드리는 소리 44, 달빛항해 19, 청산 15, 신맞이 12, 경기도립 9 등
- 뮤즈스코어 쪽 수가 크게 늘어나는 곡: 아름다운 인생 2(42→71쪽), 아침을 두드리는 소리(47→54), 신맞이(52→56) — 뮤즈스코어가 마디 폭을 쓰지 않음
- 세로 맞춤으로 못 고친 넘친 마디 약 1,100개(근거 줄 부족), 셋잇단·다섯잇단 섞인 복잡한 마디
- 아침을 두드리는 소리 다른 판 모듬북(640f819f) 229·231마디: 첫 화음의 점을 못 읽어 X 머리 음들이 마디를 넘음
- 경고 많은 타악 파트보: 판놀음 장구, 아름다운 인생 2 봉고·타악 총보, 축제 장구
- 스캔 PDF는 읽지 못함(신뱃놀이 파트 5개)
- **선율 파트보 ↔ 총보 마디별 자동 대조 도구는 아직 없음**(103번에서 계획만). 판이 다를 수 있으니 마디 순서 맞춤(정렬) 후 대부분 일치하는 짝만 믿을 것
- 남은 '쉼표 숨김' 경고 대부분은 악보 그대로: 5/4박 마디에 온음표 하나(프론티어 34-1 대아쟁 21~24마디 — 마디 전체로 볼지는 미정), 성부가 마디 중간에 갈라짐(소나기 대금 141마디 등 — MusicXML에서 숨긴 쉼표 대신 forward를 쓸지 검토)
- 파트보 제목이 첫 글자만 나오는 것: 프론티어 34-1 해금 파트보 제목이 '해'(줄 이름은 ONE 표로 채우지만 파트보 제목은 안 채움)
- 앱의 기준 줄(master)은 경고가 가장 적은 줄 → 경고 수가 바뀌면 기준 줄이 바뀔 수 있음(103번에서 월광 8·16마디 MusicXML 박자가 바뀐 원인)
