#!/usr/bin/env python3
"""타악 녹음 한 타를 잘라 src/samples.json(또는 지정한 json)에 넣는다.

사용법:
  python3 tools/extract_perc.py <samples.json> <이름> <녹음.wav|mp3> [최대 길이(초)] [몇 번째 타(0부터)]
예:
  python3 tools/extract_perc.py src/samples.json 바라 바라.wav 3.5

- 32kHz 모노로 바꾼 뒤, 소리가 시작되기 5ms 앞에서 자르고
- 소리가 봉우리보다 52dB 작아지는 곳(또는 최대 길이)까지 남기고 끝 20%를 서서히 줄이고
- 봉우리를 1.0으로 맞춰 16bit PCM base64로 저장한다. 같은 이름이 있으면 바꾼다.
"""
import sys, json, base64, subprocess, numpy as np

SR = 32000

def load(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-ac', '1', '-ar', str(SR), '-f', 's16le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, '<i2').astype(np.float64) / 32768

def cut(x, max_sec=3.0, which=0):
    hop = 640  # 20ms (북처럼 낮은 소리도 한 주기 이상 들어가게)
    fr = np.array([np.sqrt(np.mean(x[i:i + hop] ** 2)) for i in range(0, len(x) - hop, hop)])
    db = 20 * np.log10(fr + 1e-9); peak = db.max()
    ons = []
    for i in range(2, len(db)):
        if db[i] - db[i - 2] > 12 and db[i] > peak - (30 if not ons else 15) and (not ons or i - ons[-1] > 10):   # 다음 타는 봉우리 가까이 커질 때만
            ons.append(i)
    if not ons:   # 심벌 롤처럼 천천히 커지는 소리: 봉우리보다 40dB 작은 곳을 시작으로
        q = [i for i in range(len(db)) if db[i] > peak - 40]
        if not q: raise SystemExit('소리 시작을 찾지 못했습니다')
        ons = [q[0]]
    o = ons[min(which, len(ons) - 1)]
    # 시작 직전 조용한 곳으로 조금 당긴다
    while o > 0 and db[o - 1] > db[o] - 30 and db[o - 1] > peak - 45: o -= 1
    s = max(0, o * hop - int(0.005 * SR))
    nxt = ons[ons.index(ons[min(which, len(ons) - 1)]) + 1] * hop if which + 1 < len(ons) else len(x)
    pk = db[o:o + 5].max(); k = o
    while k < len(db) and db[k] > pk - 52: k += 1
    e = min(k * hop, nxt - int(0.01 * SR), s + int(max_sec * SR), len(x))
    y = x[s:e].copy()
    a = int(np.argmax(np.abs(y) > 0.05 * np.abs(y).max()))  # 첫 소리 4ms 앞부터
    y = y[max(0, a - int(0.004 * SR)):]
    f = max(1, int(len(y) * 0.2)); y[-f:] *= np.linspace(1, 0, f) ** 2
    y[:32] *= np.linspace(0, 1, 32)
    y /= np.abs(y).max()
    return y

if __name__ == '__main__':
    js, name, src = sys.argv[1:4]
    mx = float(sys.argv[4]) if len(sys.argv) > 4 else 3.0
    which = int(sys.argv[5]) if len(sys.argv) > 5 else 0
    y = cut(load(src), mx, which)
    d = json.load(open(js))
    d[name] = [base64.b64encode((np.clip(y, -1, 1) * 32767).astype('<i2').tobytes()).decode()]
    json.dump(d, open(js, 'w'), ensure_ascii=False, separators=(',', ':'))
    print(f'{name}: {len(y) / SR:.2f}초 저장')
