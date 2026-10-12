import sys, numpy as np, soundfile as sf, pyloudnorm as pyln
from scipy.signal import resample_poly, welch
def tp(x):
    up = resample_poly(x, 4, 1, axis=0)
    return 20*np.log10(np.max(np.abs(up))+1e-12)
def bands(x, sr):
    m = x.mean(axis=1)
    f, p = welch(m, sr, nperseg=8192)
    edges=[20,60,120,250,500,1000,2000,4000,8000,16000,22000]
    tot = p.sum()
    out=[]
    for a,b in zip(edges[:-1],edges[1:]):
        s=p[(f>=a)&(f<b)].sum()
        out.append(f"{a}-{b}:{10*np.log10(s/tot+1e-12):6.1f}")
    return " ".join(out)
for fn in sys.argv[1:]:
    x, sr = sf.read(fn, always_2d=True)
    meter = pyln.Meter(sr)
    L = meter.integrated_loudness(x)
    peak = 20*np.log10(np.max(np.abs(x)))
    side = (x[:,0]-x[:,1])/2; mid=(x[:,0]+x[:,1])/2
    corr = np.corrcoef(x[:,0],x[:,1])[0,1] if x.shape[1]>1 else 1
    # short-term loudness per bar region
    st=[]
    hop=int(sr*1.0)
    for i in range(0, len(x)-int(3*sr)+1, hop):
        st.append(meter.integrated_loudness(x[i:i+int(3*sr)]) if True else 0)
    print(f"{fn}: sr={sr} ch={x.shape[1]} dur={len(x)/sr:.3f}s LUFS={L:.2f} sample_peak={peak:.2f} TP={tp(x):.2f} corr={corr:.2f} S/M={20*np.log10(np.std(side)/np.std(mid)+1e-9):.1f}dB")
    print("   bands(dB rel):", bands(x,sr))
    print("   ST(3s) per 1s:", " ".join(f"{v:.1f}" for v in st))
    # tail: last time with energy above -60 dBFS
    env = np.max(np.abs(x),axis=1)
    idx = np.where(env>10**(-60/20))[0]
    print(f"   last sample above -60dB at {idx[-1]/sr:.3f}s; first above at {idx[0]/sr:.3f}s")
