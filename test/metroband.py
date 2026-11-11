# 메트로놈 클릭이 음악 위로 얼마나 드러나는지: 메트로놈 끔/켬 두 wav의 차이(=클릭)와 음악을 클릭 대역에서 박 자리마다 견줌
# python3 test/metroband.py 끔.wav 켬.wav
import sys, wave, numpy as np
def rd(f):
    w = wave.open(f); sr = w.getframerate(); ch = w.getnchannels(); x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(float) / 32768
    return (x.reshape(-1, 2).mean(1) if ch == 2 else x), sr
off, sr = rd(sys.argv[1]); on, _ = rd(sys.argv[2]); n = min(len(off), len(on)); off, on = off[:n], on[:n]; ck = on - off
W = int(0.01 * sr); e = np.array([np.abs(ck[i:i + W]).mean() for i in range(0, n - W, W)])
ons = [i * W for i in range(len(e)) if e[i] > 0.01 and (i == 0 or e[i - 1] <= 0.01)]
N = int(0.04 * sr); f = np.fft.rfftfreq(N, 1 / sr); win = np.hanning(N)
best = []
for i in ons:
    C = np.abs(np.fft.rfft(ck[i:i + N] * win)) ** 2; M = np.abs(np.fft.rfft(off[i:i + N] * win)) ** 2
    pk = f[np.argmax(C)]; band = (f > pk * 0.7) & (f < pk * 1.4)
    best.append((pk, 10 * np.log10(C[band].sum() / (M[band].sum() + 1e-12))))
pk = np.median([b[0] for b in best]); snr = np.median([b[1] for b in best])
print(f"박 {len(ons)}곳 · 클릭 주파수 약 {pk:.0f}Hz · 그 대역에서 클릭이 음악보다 {snr:+.1f}dB (중앙값; 클수록 또렷)")
