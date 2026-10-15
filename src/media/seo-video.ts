import {attachViewportVideo} from './viewport-video';

for (const video of document.querySelectorAll<HTMLVideoElement>('video[data-video-src]')) {
  // Wide screens get the 16:9 cut when the page provides one.
  if (video.dataset.videoSrcWide && matchMedia('(min-width: 900px)').matches) {
    video.dataset.videoSrc = video.dataset.videoSrcWide;
    if (video.dataset.posterWide) video.poster = video.dataset.posterWide;
  }
  const button = video.parentElement?.querySelector<HTMLButtonElement>('[data-video-play]');
  const playback = attachViewportVideo(video, video.dataset.videoSrc!, {
    onState({ready, needsPlay}) {
      if (button) {
        button.hidden = !needsPlay;
        video.controls = !needsPlay;
      } else video.style.opacity = ready ? '1' : '0';
    },
  });
  button?.addEventListener('click', () => playback.play());
}
