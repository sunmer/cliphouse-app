# Voxel trailer sandbox: the benchmark image plus Three.js, React Three Fiber, and @remotion/three, pinned to the repo lockfile versions.
FROM cliphouse-benchmark:1
USER root
WORKDIR /opt/benchmark
RUN npm install --no-save --ignore-scripts --no-audit --no-fund three@0.186.1 @types/three@0.186.0 @react-three/fiber@9.8.1 @remotion/three@4.0.534 \
  && chown -R node:node /opt/benchmark
USER node
