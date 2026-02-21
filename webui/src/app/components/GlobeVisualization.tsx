import { useEffect, useRef } from "react";

// City locations in lat/lon → converted to 3D sphere coords
const cities = [
  { name: "San Francisco", lat: 37.77, lon: -122.42 },
  { name: "New York", lat: 40.71, lon: -74.01 },
  { name: "London", lat: 51.51, lon: -0.13 },
  { name: "Berlin", lat: 52.52, lon: 13.41 },
  { name: "Tokyo", lat: 35.68, lon: 139.69 },
  { name: "Singapore", lat: 1.35, lon: 103.82 },
  { name: "Sydney", lat: -33.87, lon: 151.21 },
  { name: "Sao Paulo", lat: -23.55, lon: -46.63 },
  { name: "Dubai", lat: 25.2, lon: 55.27 },
  { name: "Seoul", lat: 37.57, lon: 126.98 },
  { name: "Mumbai", lat: 19.08, lon: 72.88 },
  { name: "Toronto", lat: 43.65, lon: -79.38 },
  { name: "Stockholm", lat: 59.33, lon: 18.07 },
  { name: "Tel Aviv", lat: 32.08, lon: 34.78 },
  { name: "Lagos", lat: 6.52, lon: 3.38 },
  { name: "Nairobi", lat: -1.29, lon: 36.82 },
  { name: "Austin", lat: 30.27, lon: -97.74 },
  { name: "Paris", lat: 48.86, lon: 2.35 },
  { name: "Bangalore", lat: 12.97, lon: 77.59 },
  { name: "Jakarta", lat: -6.21, lon: 106.85 },
];

// Arc connections between cities
const arcs = [
  [0, 2], [0, 4], [1, 2], [2, 3], [4, 5], [5, 6],
  [1, 7], [2, 8], [4, 9], [8, 10], [1, 11], [3, 12],
  [8, 13], [2, 14], [10, 15], [0, 16], [2, 17], [10, 18], [5, 19],
];

function latLonToXYZ(lat: number, lon: number, radius: number) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return {
    x: -radius * Math.sin(phi) * Math.cos(theta),
    y: radius * Math.cos(phi),
    z: radius * Math.sin(phi) * Math.sin(theta),
  };
}

function rotateY(p: { x: number; y: number; z: number }, angle: number) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    x: p.x * cos - p.z * sin,
    y: p.y,
    z: p.x * sin + p.z * cos,
  };
}

function rotateX(p: { x: number; y: number; z: number }, angle: number) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    x: p.x,
    y: p.y * cos - p.z * sin,
    z: p.y * sin + p.z * cos,
  };
}

function project(p: { x: number; y: number; z: number }, cx: number, cy: number, fov: number) {
  const scale = fov / (fov + p.z);
  return { x: cx + p.x * scale, y: cy + p.y * scale, z: p.z, scale };
}

export default function GlobeVisualization() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rotRef = useRef(0);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const updateSize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    updateSize();
    window.addEventListener("resize", updateSize);

    const animate = () => {
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      const cx = w / 2;
      const cy = h / 2;
      const radius = Math.min(w, h) * 0.36;
      const fov = 600;
      const tiltX = -0.2;

      ctx.clearRect(0, 0, w, h);
      rotRef.current += 0.003;
      const rotY = rotRef.current;

      // Helper: rotate and project a 3D point
      const rp = (p: { x: number; y: number; z: number }) => {
        const r1 = rotateY(p, rotY);
        const r2 = rotateX(r1, tiltX);
        return project(r2, cx, cy, fov);
      };

      // --- Draw longitude lines (meridians) ---
      const numLon = 24;
      for (let i = 0; i < numLon; i++) {
        const lon = (i / numLon) * 360 - 180;
        ctx.beginPath();
        let started = false;
        for (let j = 0; j <= 60; j++) {
          const lat = (j / 60) * 180 - 90;
          const p3d = latLonToXYZ(lat, lon, radius);
          const p = rp(p3d);
          const onFront = p.z < 0;
          const alpha = onFront ? 0.12 : 0.03;
          if (!started) {
            ctx.moveTo(p.x, p.y);
            started = true;
          } else {
            ctx.lineTo(p.x, p.y);
          }
          ctx.strokeStyle = `rgba(123, 92, 255, ${alpha})`;
        }
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }

      // --- Draw latitude lines (parallels) ---
      const numLat = 12;
      for (let i = 1; i < numLat; i++) {
        const lat = (i / numLat) * 180 - 90;
        ctx.beginPath();
        let started = false;
        for (let j = 0; j <= 80; j++) {
          const lon = (j / 80) * 360 - 180;
          const p3d = latLonToXYZ(lat, lon, radius);
          const p = rp(p3d);
          const onFront = p.z < 0;
          const alpha = onFront ? 0.1 : 0.025;
          if (!started) {
            ctx.moveTo(p.x, p.y);
            started = true;
          } else {
            ctx.lineTo(p.x, p.y);
          }
          ctx.strokeStyle = `rgba(123, 92, 255, ${alpha})`;
        }
        ctx.lineWidth = 0.4;
        ctx.stroke();
      }

      // --- Draw equator (slightly brighter) ---
      ctx.beginPath();
      for (let j = 0; j <= 80; j++) {
        const lon = (j / 80) * 360 - 180;
        const p3d = latLonToXYZ(0, lon, radius);
        const p = rp(p3d);
        if (j === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.strokeStyle = "rgba(123, 92, 255, 0.15)";
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // --- Compute city screen positions ---
      const cityScreens = cities.map((city) => {
        const p3d = latLonToXYZ(city.lat, city.lon, radius);
        const p = rp(p3d);
        return { ...p, name: city.name, onFront: p.z < 0 };
      });

      // --- Draw arc connections ---
      arcs.forEach(([a, b]) => {
        const ca = cities[a];
        const cb = cities[b];
        const sa = cityScreens[a];
        const sb = cityScreens[b];

        // Only draw if at least one end is on front
        if (!sa.onFront && !sb.onFront) return;

        const steps = 30;
        ctx.beginPath();
        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          // SLERP-like interpolation on sphere surface with height
          const lat = ca.lat + (cb.lat - ca.lat) * t;
          const lon = ca.lon + (cb.lon - ca.lon) * t;
          // Arc height peaks at middle
          const arcHeight = 1 + Math.sin(t * Math.PI) * 0.15;
          const p3d = latLonToXYZ(lat, lon, radius * arcHeight);
          const p = rp(p3d);
          if (i === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        }

        const alpha = (sa.onFront && sb.onFront) ? 0.18 : 0.06;
        ctx.strokeStyle = `rgba(193, 76, 255, ${alpha})`;
        ctx.lineWidth = 0.8;
        ctx.stroke();

        // Traveling dot on arc
        const time = Date.now() / 3000;
        const dotT = ((time + a * 0.3) % 1);
        const dlat = ca.lat + (cb.lat - ca.lat) * dotT;
        const dlon = ca.lon + (cb.lon - ca.lon) * dotT;
        const dh = 1 + Math.sin(dotT * Math.PI) * 0.15;
        const dp3d = latLonToXYZ(dlat, dlon, radius * dh);
        const dp = rp(dp3d);
        if (dp.z < 0) {
          ctx.beginPath();
          ctx.arc(dp.x, dp.y, 1.5, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(193, 76, 255, 0.7)";
          ctx.fill();
        }
      });

      // --- Draw city dots ---
      cityScreens.forEach((city) => {
        if (!city.onFront) return;

        const depthAlpha = Math.max(0.3, 1 - (city.z + radius) / (2 * radius));

        // Outer glow
        const grad = ctx.createRadialGradient(city.x, city.y, 0, city.x, city.y, 8);
        grad.addColorStop(0, `rgba(123, 92, 255, ${depthAlpha * 0.4})`);
        grad.addColorStop(1, "rgba(123, 92, 255, 0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(city.x, city.y, 8, 0, Math.PI * 2);
        ctx.fill();

        // Core dot
        ctx.beginPath();
        ctx.arc(city.x, city.y, 2.5 * city.scale, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(123, 92, 255, ${depthAlpha})`;
        ctx.fill();

        // Bright center
        ctx.beginPath();
        ctx.arc(city.x, city.y, 1 * city.scale, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200, 180, 255, ${depthAlpha})`;
        ctx.fill();
      });

      // --- Subtle atmosphere glow ring ---
      const atmGrad = ctx.createRadialGradient(cx, cy, radius * 0.9, cx, cy, radius * 1.15);
      atmGrad.addColorStop(0, "rgba(123, 92, 255, 0)");
      atmGrad.addColorStop(0.5, "rgba(123, 92, 255, 0.04)");
      atmGrad.addColorStop(1, "rgba(123, 92, 255, 0)");
      ctx.fillStyle = atmGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 1.15, 0, Math.PI * 2);
      ctx.fill();

      animRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", updateSize);
      cancelAnimationFrame(animRef.current);
    };
  }, []);

  return (
    <div className="nexus-globe-visual">
      <canvas
        ref={canvasRef}
        className="nexus-globe-canvas"
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}
