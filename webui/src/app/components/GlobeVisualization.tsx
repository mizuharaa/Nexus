import React, { useEffect, useRef, useCallback, useState } from "react";

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
  { name: "Mexico City", lat: 19.43, lon: -99.13 },
  { name: "Cairo", lat: 30.04, lon: 31.24 },
  { name: "Moscow", lat: 55.76, lon: 37.62 },
  { name: "Shanghai", lat: 31.23, lon: 121.47 },
  { name: "Buenos Aires", lat: -34.6, lon: -58.38 },
  { name: "Cape Town", lat: -33.93, lon: 18.42 },
  { name: "Helsinki", lat: 60.17, lon: 24.94 },
  { name: "Bangkok", lat: 13.76, lon: 100.5 },
  { name: "Lima", lat: -12.05, lon: -77.04 },
  { name: "Taipei", lat: 25.03, lon: 121.57 },
];

const arcs = [
  [0, 2], [0, 4], [1, 2], [2, 3], [4, 5], [5, 6],
  [1, 7], [2, 8], [4, 9], [8, 10], [1, 11], [3, 12],
  [8, 13], [2, 14], [10, 15], [0, 16], [2, 17], [10, 18], [5, 19],
  [20, 7], [21, 8], [22, 3], [23, 4], [24, 7], [25, 15],
  [26, 12], [27, 5], [28, 7], [29, 23], [1, 20], [21, 13],
  [0, 11], [3, 22], [9, 29], [6, 25],
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
  return { x: p.x * cos - p.z * sin, y: p.y, z: p.x * sin + p.z * cos };
}

function rotateX(p: { x: number; y: number; z: number }, angle: number) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return { x: p.x, y: p.y * cos - p.z * sin, z: p.y * sin + p.z * cos };
}

function project(p: { x: number; y: number; z: number }, cx: number, cy: number, fov: number) {
  const scale = fov / (fov + p.z);
  return { x: cx + p.x * scale, y: cy + p.y * scale, z: p.z, scale };
}

export default function GlobeVisualization() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rotYRef = useRef(0);
  const rotXRef = useRef(-0.2);
  const autoSpeedRef = useRef(0.002);
  const animRef = useRef<number>(0);
  const dragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const velocityRef = useRef({ x: 0, y: 0 });
  const [hoveredCity, setHoveredCity] = useState<string | null>(null);
  const hoveredRef = useRef<string | null>(null);
  const cityScreensRef = useRef<{ x: number; y: number; z: number; scale: number; name: string; onFront: boolean }[]>([]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    dragging.current = true;
    lastMouse.current = { x: e.clientX, y: e.clientY };
    velocityRef.current = { x: 0, y: 0 };
    autoSpeedRef.current = 0;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (dragging.current) {
      const dx = e.clientX - lastMouse.current.x;
      const dy = e.clientY - lastMouse.current.y;
      rotYRef.current += dx * 0.005;
      rotXRef.current = Math.max(-1.2, Math.min(1.2, rotXRef.current + dy * 0.005));
      velocityRef.current = { x: dx * 0.005, y: dy * 0.005 };
      lastMouse.current = { x: e.clientX, y: e.clientY };
    } else {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      let found: string | null = null;
      for (const cs of cityScreensRef.current) {
        if (!cs.onFront) continue;
        const dist = Math.hypot(cs.x - mx, cs.y - my);
        if (dist < 14) { found = cs.name; break; }
      }
      if (found !== hoveredRef.current) {
        hoveredRef.current = found;
        setHoveredCity(found);
      }
    }
  }, []);

  const handlePointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

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
      const radius = Math.min(w, h) * 0.38;
      const fov = 600;

      ctx.clearRect(0, 0, w, h);

      if (!dragging.current) {
        autoSpeedRef.current += (0.002 - autoSpeedRef.current) * 0.02;
        velocityRef.current.x *= 0.96;
        velocityRef.current.y *= 0.96;
        rotYRef.current += autoSpeedRef.current + velocityRef.current.x;
        rotXRef.current += velocityRef.current.y;
        rotXRef.current = Math.max(-1.2, Math.min(1.2, rotXRef.current));
      }

      const rotY_val = rotYRef.current;
      const rotX_val = rotXRef.current;

      const rp = (p: { x: number; y: number; z: number }) => {
        const r1 = rotateY(p, rotY_val);
        const r2 = rotateX(r1, rotX_val);
        return project(r2, cx, cy, fov);
      };

      // Longitude lines
      for (let i = 0; i < 24; i++) {
        const lon = (i / 24) * 360 - 180;
        ctx.beginPath();
        for (let j = 0; j <= 60; j++) {
          const lat = (j / 60) * 180 - 90;
          const p = rp(latLonToXYZ(lat, lon, radius));
          j === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
        }
        ctx.strokeStyle = "rgba(123, 92, 255, 0.07)";
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }

      // Latitude lines
      for (let i = 1; i < 12; i++) {
        const lat = (i / 12) * 180 - 90;
        ctx.beginPath();
        for (let j = 0; j <= 80; j++) {
          const lon = (j / 80) * 360 - 180;
          const p = rp(latLonToXYZ(lat, lon, radius));
          j === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
        }
        ctx.strokeStyle = "rgba(123, 92, 255, 0.05)";
        ctx.lineWidth = 0.4;
        ctx.stroke();
      }

      // Equator
      ctx.beginPath();
      for (let j = 0; j <= 80; j++) {
        const lon = (j / 80) * 360 - 180;
        const p = rp(latLonToXYZ(0, lon, radius));
        j === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
      }
      ctx.strokeStyle = "rgba(123, 92, 255, 0.12)";
      ctx.lineWidth = 0.7;
      ctx.stroke();

      // City positions
      const cityScreens = cities.map((city) => {
        const p = rp(latLonToXYZ(city.lat, city.lon, radius));
        return { ...p, name: city.name, onFront: p.z < 0 };
      });
      cityScreensRef.current = cityScreens;

      // Arc connections
      const time = Date.now() / 3000;
      arcs.forEach(([a, b]) => {
        const ca = cities[a], cb = cities[b];
        const sa = cityScreens[a], sb = cityScreens[b];
        if (!sa.onFront && !sb.onFront) return;

        const steps = 32;
        ctx.beginPath();
        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          const lat = ca.lat + (cb.lat - ca.lat) * t;
          const lon = ca.lon + (cb.lon - ca.lon) * t;
          const arcHeight = 1 + Math.sin(t * Math.PI) * 0.12;
          const p = rp(latLonToXYZ(lat, lon, radius * arcHeight));
          i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
        }
        const alpha = (sa.onFront && sb.onFront) ? 0.15 : 0.04;
        ctx.strokeStyle = `rgba(167, 139, 250, ${alpha})`;
        ctx.lineWidth = 0.7;
        ctx.stroke();

        // Traveling dot
        const dotT = ((time + a * 0.17) % 1);
        const dlat = ca.lat + (cb.lat - ca.lat) * dotT;
        const dlon = ca.lon + (cb.lon - ca.lon) * dotT;
        const dh = 1 + Math.sin(dotT * Math.PI) * 0.12;
        const dp = rp(latLonToXYZ(dlat, dlon, radius * dh));
        if (dp.z < 0) {
          ctx.beginPath();
          ctx.arc(dp.x, dp.y, 1.5, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(192, 132, 252, 0.65)";
          ctx.fill();
        }

        // Second dot going opposite direction
        const dotT2 = ((time * 0.8 + b * 0.23 + 0.5) % 1);
        const dlat2 = ca.lat + (cb.lat - ca.lat) * dotT2;
        const dlon2 = ca.lon + (cb.lon - ca.lon) * dotT2;
        const dh2 = 1 + Math.sin(dotT2 * Math.PI) * 0.12;
        const dp2 = rp(latLonToXYZ(dlat2, dlon2, radius * dh2));
        if (dp2.z < 0) {
          ctx.beginPath();
          ctx.arc(dp2.x, dp2.y, 1, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(139, 92, 246, 0.5)";
          ctx.fill();
        }
      });

      // City dots (back hemisphere first, then front)
      const sortedCities = [...cityScreens].sort((a, b) => b.z - a.z);
      const hovered = hoveredRef.current;

      sortedCities.forEach((city) => {
        const depthAlpha = city.onFront
          ? Math.max(0.3, 1 - (city.z + radius) / (2 * radius))
          : 0.06;

        const isHovered = city.name === hovered && city.onFront;
        const dotRadius = isHovered ? 4 : city.onFront ? 2.5 : 1.2;

        if (city.onFront) {
          // Outer glow
          const grad = ctx.createRadialGradient(city.x, city.y, 0, city.x, city.y, isHovered ? 18 : 9);
          grad.addColorStop(0, `rgba(139, 92, 246, ${isHovered ? 0.45 : depthAlpha * 0.3})`);
          grad.addColorStop(1, "rgba(139, 92, 246, 0)");
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(city.x, city.y, isHovered ? 18 : 9, 0, Math.PI * 2);
          ctx.fill();
        }

        // Core dot
        ctx.beginPath();
        ctx.arc(city.x, city.y, dotRadius * city.scale, 0, Math.PI * 2);
        ctx.fillStyle = city.onFront
          ? `rgba(167, 139, 250, ${isHovered ? 1 : depthAlpha})`
          : `rgba(100, 80, 180, ${depthAlpha})`;
        ctx.fill();

        if (city.onFront) {
          ctx.beginPath();
          ctx.arc(city.x, city.y, (isHovered ? 1.8 : 1) * city.scale, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(220, 200, 255, ${isHovered ? 1 : depthAlpha})`;
          ctx.fill();
        }

        // Orbiting ring for hovered
        if (isHovered) {
          ctx.beginPath();
          ctx.arc(city.x, city.y, 8, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(167, 139, 250, 0.5)";
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      });

      // Hover label
      if (hovered) {
        const cs = cityScreens.find((c) => c.name === hovered && c.onFront);
        if (cs) {
          const label = cs.name;
          ctx.font = "600 11px 'Space Grotesk', 'Inter', sans-serif";
          const tw = ctx.measureText(label).width;
          const px = cs.x - tw / 2 - 8;
          const py = cs.y - 22;
          ctx.fillStyle = "rgba(10, 10, 18, 0.88)";
          ctx.beginPath();
          const r = 5, bw = tw + 16, bh = 22;
          ctx.moveTo(px + r, py);
          ctx.lineTo(px + bw - r, py);
          ctx.quadraticCurveTo(px + bw, py, px + bw, py + r);
          ctx.lineTo(px + bw, py + bh - r);
          ctx.quadraticCurveTo(px + bw, py + bh, px + bw - r, py + bh);
          ctx.lineTo(px + r, py + bh);
          ctx.quadraticCurveTo(px, py + bh, px, py + bh - r);
          ctx.lineTo(px, py + r);
          ctx.quadraticCurveTo(px, py, px + r, py);
          ctx.fill();

          ctx.strokeStyle = "rgba(139, 92, 246, 0.3)";
          ctx.lineWidth = 0.5;
          ctx.stroke();

          ctx.fillStyle = "rgba(200, 180, 255, 0.9)";
          ctx.fillText(label, px + 8, py + 15);
        }
      }

      // Atmosphere ring
      const atmGrad = ctx.createRadialGradient(cx, cy, radius * 0.88, cx, cy, radius * 1.18);
      atmGrad.addColorStop(0, "rgba(123, 92, 255, 0)");
      atmGrad.addColorStop(0.4, "rgba(123, 92, 255, 0.035)");
      atmGrad.addColorStop(0.7, "rgba(167, 139, 250, 0.02)");
      atmGrad.addColorStop(1, "rgba(123, 92, 255, 0)");
      ctx.fillStyle = atmGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 1.18, 0, Math.PI * 2);
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
    <div className="nexus-globe-visual" style={{ cursor: dragging.current ? "grabbing" : "grab" }}>
      <canvas
        ref={canvasRef}
        className="nexus-globe-canvas"
        style={{ width: "100%", height: "100%", touchAction: "none" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      />
      {hoveredCity && (
        <div className="nexus-globe-hint">Drag to spin</div>
      )}
    </div>
  );
}
