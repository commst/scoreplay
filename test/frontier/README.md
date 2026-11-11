# 음원과 악기 밸런스 맞대기 (150번, 프론티어)

음원: 비공개 샘플 저장소 commst/scoreplay_sample `audio/frontier-voices-from-the-east.mp3` (양방언, 4:40) — 악보 9203ad49(FRONTIER - Full Score, Sibelius)

1. `ffmpeg -i <음원.mp3> -ar 32000 -ac 2 rec.wav` (작업 폴더에서)
2. 줄마다 크기 맞추기 없이 WAV: `node test/stems.mjs $PWD/index.html 9203ad49 <작업폴더>/st0` (앱의 `window.__rawLevel` 시험용 길, 잔향 없음·좌우 끔·사람처럼 끔, 약 8분) → st0/00.wav… + meta.json + all.wav
3. `python3 align.py st0/all.wav` (크로마 DTW → wp.npy), `python3 warp2.py` (6초 창 직선으로 매끈하게 + 10초마다 어택 상호상관으로 미세 지연 → synT.npy·good2.npy)
4. 악기(같은 악기 줄은 묶음)별: `python3 expo.py` (mel 스펙트럼을 음원 시각으로 옮김 → Gs.npy), `python3 expo2.py 0.6` (그 악기가 60% 넘게 차지하는 칸에서 음원/우리 크기, 대역별), `python3 joint.py Gs.npy` (모든 악기를 함께 로그 오차로 맞춤, 앞·뒤 반으로 나눠 안정성)
5. `python3 tau.py <wav…>` 소리 포락선의 번짐(잔향·지속) 비교

판단: 앞·뒤 반에서 방향이 같은 차이만 반영(150번). 음원은 다른 편곡·연주·마스터링이 섞여 있어 칸마다 차이가 큼(로그 차이 흩어짐 약 7.5dB) — 악기별 '평균 크기'만 믿을 만함
