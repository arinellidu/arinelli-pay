"use client";

import { useEffect, useRef } from "react";
import { subscribeSignal } from "@/lib/signal";

/* Triângulo de tela cheia sem buffer: o vértice sai do gl_VertexID. */
const VERT = `#version 300 es
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

/** A única intervenção WebGL do registro: a liquidação varre a tela uma vez. */
const FRAG = `#version 300 es
precision highp float;

uniform vec2  u_res;
uniform float u_settle;

out vec4 outColor;

void main() {
  if (u_settle >= 1.1) {
    outColor = vec4(0.0);
    return;
  }

  vec2 p = (gl_FragCoord.xy - 0.5 * u_res) / u_res.y;
  float k = clamp(u_settle / 1.1, 0.0, 1.0);
  float front = -1.3 + k * 3.0;
  float axis = p.x * 0.78 + p.y * 0.62;
  float halo = exp(-pow((axis - front) * 3.4, 2.0));
  float edge = exp(-pow((axis - front) * 26.0, 2.0));
  float decay = 1.0 - smoothstep(0.45, 1.1, u_settle);
  float alpha = clamp((halo * 0.24 + edge * 0.72) * decay, 0.0, 0.82);
  vec3 gold = mix(vec3(0.773, 0.643, 0.380), vec3(0.91, 0.79, 0.55), edge);
  outColor = vec4(gold * alpha, alpha);
}`;

function compile(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error("[signal-field] shader:", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export function SignalField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl2", {
      alpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: "low-power",
    });
    // Sem WebGL2 a tela continua completa; perde apenas o gesto de liquidação.
    if (!gl) return;

    const vert = compile(gl, gl.VERTEX_SHADER, VERT);
    const frag = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    const program = gl.createProgram();
    if (!vert || !frag || !program) return;
    gl.attachShader(program, vert);
    gl.attachShader(program, frag);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("[signal-field] link:", gl.getProgramInfoLog(program));
      return;
    }
    gl.useProgram(program);

    const uRes = gl.getUniformLocation(program, "u_res");
    const uSettle = gl.getUniformLocation(program, "u_settle");

    let width = 0;
    let height = 0;
    const resize = () => {
      // A varredura é difusa; 0.6× do CSS preserva a leitura e reduz fragmentos.
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5) * 0.6;
      const next = [
        Math.floor(window.innerWidth * dpr),
        Math.floor(window.innerHeight * dpr),
      ] as const;
      if (next[0] === width && next[1] === height) return;
      [width, height] = next;
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
      gl.uniform2f(uRes, width, height);
    };
    resize();
    window.addEventListener("resize", resize);

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let raf = 0;
    let settledAt = -1e6;

    const draw = (now: number) => {
      const settle = now / 1000 - settledAt;
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(uSettle, settle);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      raf = settle < 1.1 ? requestAnimationFrame(draw) : 0;
    };

    gl.uniform1f(uSettle, 1e6);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    const unsubscribe = subscribeSignal({
      onSettled: () => {
        if (reduced.matches || document.hidden) return;
        settledAt = performance.now() / 1000;
        if (!raf) raf = requestAnimationFrame(draw);
      },
    });

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      unsubscribe();
      gl.deleteProgram(program);
      gl.deleteShader(vert);
      gl.deleteShader(frag);
      // Não descartar o contexto: em StrictMode o efeito remonta.
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 h-full w-full"
    />
  );
}
