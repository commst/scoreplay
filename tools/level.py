# 녹음 파일에서 음 구간을 찾을 '문턱(dB)' 추천값과 찾은 음 개수를 보여 준다
# 사용: python3 tools/level.py 녹음.wav [문턱dB]
import numpy as np, scipy.io.wavfile as w, sys
sr, x = w.read(sys.argv[1]); x = x.astype(np.float64) / 32768
if x.ndim > 1: x = x.mean(1)
h = sr // 100; n = len(x) // h
E = 20 * np.log10(np.sqrt((x[:n * h].reshape(n, h) ** 2).mean(1)) + 1e-9)
thr = float(sys.argv[2]) if len(sys.argv) > 2 else round(float(np.percentile(E, 98)) - 25, 1)
on = E > thr; regs = []; i = 0
while i < n:
    if on[i]:
        j = i
        while j < n and on[j:j + 40].any(): j += 1
        if (j - i) / 100 > 0.5: regs.append((i / 100, j / 100))
        i = j
    else: i += 1
print(f'문턱 {thr} dB → 음 {len(regs)}개')
for a, b in regs: print(f'  {a:7.2f}초 ~ {b:7.2f}초  ({b - a:.1f}초)')
