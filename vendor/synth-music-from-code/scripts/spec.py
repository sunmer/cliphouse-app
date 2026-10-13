import sys, numpy as np, soundfile as sf, matplotlib
matplotlib.use('Agg'); import matplotlib.pyplot as plt
from scipy.signal import spectrogram
files=sys.argv[2:]; out=sys.argv[1]
fig,axes=plt.subplots(len(files),1,figsize=(14,3.2*len(files)))
if len(files)==1: axes=[axes]
for ax,fn in zip(axes,files):
    x,sr=sf.read(fn,always_2d=True); m=x.mean(1)
    f,t,S=spectrogram(m,sr,nperseg=2048,noverlap=1536)
    S=10*np.log10(S+1e-14)
    ax.pcolormesh(t,f,S,vmin=S.max()-90,vmax=S.max(),shading='auto',cmap='magma')
    ax.set_yscale('symlog',linthresh=200); ax.set_ylim(30,20000); ax.set_title(fn)
    ax2=ax.twinx(); env=np.convolve(np.abs(m),np.ones(int(sr*0.01))/int(sr*0.01),'same')
    ax2.plot(np.arange(len(m))/sr, env, color='cyan', lw=0.4, alpha=0.7); ax2.set_ylim(0,env.max()*3)
plt.tight_layout(); plt.savefig(out,dpi=70)
