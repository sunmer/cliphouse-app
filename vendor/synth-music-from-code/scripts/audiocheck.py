#!/usr/bin/env python3
"""Rule checks on rendered audio: loudness, true peak (8x oversampled), clipping, length, clean tail.
Usage: python3 audiocheck.py out/*.wav   (reads the .json sidecar render.js writes next to each wav)
Needs: pip install numpy scipy soundfile pyloudnorm --break-system-packages"""
import sys, json, os, numpy as np, soundfile as sf, pyloudnorm as pyln
from scipy.signal import resample_poly
bad = False
for fn in [a for a in sys.argv[1:] if a.endswith('.wav')]:
    meta = json.load(open(fn[:-4] + '.json')) if os.path.exists(fn[:-4] + '.json') else {}
    x, sr = sf.read(fn, always_2d=True)
    L = pyln.Meter(sr).integrated_loudness(x)
    tp = 20 * np.log10(np.max(np.abs(resample_poly(x, 8, 1, axis=0))))
    sp = 20 * np.log10(np.max(np.abs(x))); dur = len(x) / sr
    rise = 0.0
    if 'final' in meta:   # after the final hit the 50 ms energy may only fall (no new events)
        hop = int(0.05 * sr); a = int((meta['final'] + 0.06) * sr); m = x.mean(1)
        e = np.array([20 * np.log10(np.sqrt(np.mean(m[i:i + hop] ** 2)) + 1e-9) for i in range(a, len(m) - hop, hop)])
        rise = float(np.max(np.diff(e))) if len(e) > 1 else 0.0
    ok = abs(L + 14) <= 0.2 and tp <= -1.0 and sp < 0 and dur <= meta.get('maxLen', 15) + 1e-6 and rise < 3.0
    bad |= not ok
    print(f"{os.path.basename(fn):24} {'pass' if ok else 'FAIL'}  LUFS {L:6.2f}  true peak {tp:5.2f} dBTP  sample peak {sp:5.2f}  {dur:.3f} s  tail rise {rise:.1f} dB")
sys.exit(1 if bad else 0)
