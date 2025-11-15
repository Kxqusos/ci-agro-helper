"use client";
import { useEffect, useRef } from "react";

export default function Background() {
  const mapWrapperRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef({ x: 0, y: 0 });
  const targetRef = useRef({ x: 0, y: 0 });
  const animRef = useRef<number>();

  useEffect(() => {
    const strength = 50;
    const smooth = 0.08;

    const handleMouseMove = (e: MouseEvent) => {
      const nx = (e.clientX / window.innerWidth - 0.5) * 2;
      const ny = (e.clientY / window.innerHeight - 0.5) * 2;
      targetRef.current.x = nx * strength;
      targetRef.current.y = ny * strength;
    };

    const animate = () => {
      offsetRef.current.x += (targetRef.current.x - offsetRef.current.x) * smooth;
      offsetRef.current.y += (targetRef.current.y - offsetRef.current.y) * smooth;

      if (mapWrapperRef.current) {
        mapWrapperRef.current.style.transform = `translate(${offsetRef.current.x}px, ${offsetRef.current.y}px)`;
      }

      animRef.current = requestAnimationFrame(animate);
    };

    window.addEventListener("mousemove", handleMouseMove);
    animate();

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  return (
<div
  className="overflow-hidden h-screen w-screen fixed top-0 left-0 bg-[#00242F] light:bg-[#f0f8ff] z-10 pointer-events-none"
>
  <div
    ref={mapWrapperRef}
    className="map-bg absolute top-[-25%] left-[-25%] h-[150%] w-[150%] bg-[url('/backround.png')] bg-cover bg-center bg-no-repeat"
  />
</div>

  );
}