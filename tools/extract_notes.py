#!/usr/bin/env python3
"""한 파일에 한 음씩 녹음한 악기(피아노 등)를 녹음 뱅크로 만든다.

사용법:
  python3 tools/extract_notes.py <출력 이름(예: banks/piano)> [--damper] [--max 초] 파일1 파일2 ...
예:
  python3 tools/extract_notes.py banks/piano --damper C4.mp3 C#4.mp3 D4.mp3 ...

- 파일마다 소리 시작을 찾아 자르고, 음높이를 직접 재서(YIN) 뱅크에 적는다. 파일 이름은 쓰지 않는다
- --damper: 건반을 떼어 소리가 갑자기 줄어드는 곳(댐퍼) 앞에서 자른다. 그보다 긴 음은 앱이 울림을 이어 만든다
- 결과: <이름>.mp3(32kHz 모노 64kbps), <이름>.json([종류, 음높이, 시작, 길이] 목록), 확인용 <이름>.wav
"""
import sys, json, subprocess, numpy as np
SR = 32000
args = sys.argv[1:]
out = args.pop(0); damper = '--damper' in args; args = [a for a in args if a != '--damper']
mx = 4.0
if '--max' in args: i = args.index('--max'); mx = float(args[i + 1]); del args[i:i + 2]

def load(p):
    return np.frombuffer(subprocess.run(['ffmpeg', '-v', 'error', '-i', p, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout, '<f4').astype(np.float64)

def yin(seg):
    W = 2048; tmax = int(SR / 40)
    d = np.array([np.sum((seg[:W] - seg[t:t + W]) ** 2) for t in range(tmax)])
    c = d.copy(); c[1:] = d[1:] * np.arange(1, tmax) / np.maximum(np.cumsum(d[1:]), 1e-12)
    t = int(SR / 2000)
    while t < tmax - 1 and c[t] >= 0.15: t += 1
    while t + 1 < tmax - 1 and c[t + 1] < c[t]: t += 1
    a, b, cc = c[t - 1], c[t], c[t + 1]; p = t + 0.5 * (a - cc) / (a - 2 * b + cc + 1e-12)
    return 69 + 12 * np.log2(SR / p / 440)

clips = []
for f in args:
    x = load(f); h = 160   # 5ms
    E = 20 * np.log10(np.sqrt(np.array([np.mean(x[i:i + h] ** 2) for i in range(0, len(x) - h, h)])) + 1e-9)
    pk = E.max(); on = int(np.argmax(E > pk - 30))
    s = max(0, on * h - int(0.002 * SR))
    a = int(np.argmax(np.abs(x[s:]) > np.abs(x[s:s + SR]).max() * 0.05)); s = max(0, s + a - int(0.002 * SR))
    end = min(len(x), s + int(mx * SR))
    if damper:
        # 50ms 평균 크기가 0.1초 동안 6dB 넘게 줄어드는 첫 곳 = 건반을 뗀 곳
        g = 1600; L = [20 * np.log10(np.sqrt(np.mean(x[i:i + g] ** 2)) + 1e-9) for i in range(s, end - g, 320)]
        for k in range(int(0.15 * SR / 320), len(L) - 10):
            if L[k] - L[k + 10] > 6: end = s + k * 320 + int(0.03 * SR); break
    else:
        k = s
        while k < end - h and 20 * np.log10(np.sqrt(np.mean(x[k:k + h] ** 2)) + 1e-9) > pk - 55: k += h
        end = k
    y = x[s:end].copy()
    m = yin(x[s + int(0.12 * SR): s + int(0.12 * SR) + 6000])
    clips.append((m, y)); print(f'{f.split("/")[-1]}: 음높이 {m:.2f}, {len(y) / SR:.2f}초')

clips.sort(key=lambda c: c[0])
gap = int(0.12 * SR); pos = gap; meta = []; buf = [np.zeros(gap)]
for m, y in clips:
    y = y / (np.abs(y).max() or 1) * 0.89
    meta.append(['p', round(float(m), 3), round(pos / SR, 3), round(len(y) / SR, 3)])
    buf += [y, np.zeros(gap)]; pos += len(y) + gap
pcm = np.concatenate(buf)
raw = (np.clip(pcm, -1, 1) * 32767).astype('<i2').tobytes()
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 's16le', '-ar', str(SR), '-ac', '1', '-i', '-', '-c:a', 'libmp3lame', '-b:a', '64k', out + '.mp3'], input=raw, check=True)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 's16le', '-ar', str(SR), '-ac', '1', '-i', '-', out + '.wav'], input=raw, check=True)
json.dump(meta, open(out + '.json', 'w'))
print(out + '.mp3', len(meta), '음,', f'{pos / SR:.1f}초')
