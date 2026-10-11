(() => {
  const fit = () => {
    for (const el of document.querySelectorAll('[data-fit-max]')) {
      const max = Number(el.dataset.fitMax);
      const min = Number(el.dataset.fitMin || Math.round(max * 0.45));
      el.style.fontSize = `${max}px`;
      const width = el.clientWidth;
      const height = el.clientHeight;
      if (width < 2 || height < 2) continue;
      for (let size = max; size >= min; size -= 2) {
        el.style.fontSize = `${size}px`;
        if (el.scrollWidth <= width + 1 && el.scrollHeight <= height + 1) break;
      }
    }
  };
  window.cliphouseFitText = fit;
  document.fonts?.ready.then(fit);
  fit();
})();
