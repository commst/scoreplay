# 총보↔파트보 대조 도구

샘플 PDF는 저장소에 없으므로 경로는 작업 환경(/home/claude/…) 기준입니다.

1. `python3 ingest.py <zip…>` — 받은 zip을 풀어 `/home/claude/samples/<md5 8자>-이름.pdf`로 (맥 zip의 `#Uxxxx` 이름 풀기). 같은 내용은 건너뜀
2. zip 안 폴더 목록 `/home/claude/manifest.json`(경로·md5)을 만들고(HANDOFF 참고), `node test/dumpbars.mjs <출력폴더> <PDF…>`로 마디 서명(리듬은 적힌 조각, 붙임줄 ts, 음높이 ps, 경고)을 뽑는다. 앱처럼 2줄 이상이면 세로 맞춤까지. `PARSER=<다른 score-parser.js>`로 이전 판 서명
3. `python3 compare.py` (`DUMP=<서명 폴더>`) — 그룹(zip 맨 위 폴더)마다 총보와 파트보 줄을 짝짓기(리듬 일치율 + 0.3×음높이), difflib로 마디 정렬, 두 마디 합치기도 시도 → `pairs.json`
4. `tally.py`(다른 마디를 경고 쪽별로), `rhythm.py`(리듬 차이 유형), `pitch.py`(음높이 차이 간격 — ±12는 대개 판 차이), `show.py <파트> <줄> rhythm|pitch`
5. 그림 대조: `pair.sh <파트> <줄> <마디> <총보> <줄> <마디>` → /tmp/pair.png (test/crop.mjs 사용)
6. 해석기 회귀: `TOOL=test/regrn.mjs regall.sh <이전 해석기 폴더>` — 마디 번호로 맞대어 FILL/EMPTIED/OTHER/NEW/LOST, 경고 변화(_w = 새 경고)
