"use client";

import { useEffect, useRef } from "react";
import { subscribeSignal } from "@/lib/signal";

/* Triângulo de tela cheia sem buffer: o vértice sai do gl_VertexID. */
const VERT = `#version 300 es
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

/**
 * O campo de fósforo. Duas ondas lentas somadas formam a linha de base do
 * aparelho; a amplitude e o brilho sobem enquanto há cobrança pendente, cada
 * batida do polling acende um pulso, e a liquidação varre a tela uma vez.
 * O grão é o piso de ruído do instrumento — é ele que dá ao vidro dos painéis
 * alguma coisa para refratar.
 */
const FRAG = `#version 300 es
precision highp float;

uniform vec2  u_res;
uniform float u_time;
uniform float u_pending;
uniform float u_pulse;
uniform float u_settle;

out vec4 outColor;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float band(vec2 p, float phase, float freq, float speed, float amp, float base, float sharp) {
  float y = base + sin(p.x * freq + u_time * speed + phase) * amp
                 + sin(p.x * freq * 0.43 - u_time * speed * 0.7 + phase) * amp * 0.45;
  float d = abs(p.y - y);
  return exp(-d * d * sharp);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  vec2 p = (gl_FragCoord.xy - 0.5 * u_res) / u_res.y;

  float live = u_pending;

  /* chassi: quase preto, com queda de luz nas bordas */
  float vig = 1.0 - 0.55 * dot(p * vec2(0.62, 1.0), p * vec2(0.62, 1.0));
  vec3 col = vec3(0.026, 0.034, 0.042) * vig;
  col += vec3(0.0, 0.05, 0.03) * pow(1.0 - uv.y, 3.0) * 0.12;

  vec3 phosphor = vec3(0.0, 0.86, 0.36);

  /* linha de base do aparelho: traço fino com bloom curto — o texto do painel
     precisa continuar legível por cima, então isto é piso de ruído, não fundo */
  float amp = 0.035 + 0.055 * live;
  float core = band(p, 0.0, 2.9, 0.20, amp, -0.30, 900.0);
  float halo = band(p, 0.0, 2.9, 0.20, amp, -0.30, 70.0);
  col += phosphor * (core * (0.20 + 0.40 * live) + halo * (0.022 + 0.05 * live));

  /* segunda leitura, mais funda e defasada: profundidade sem virar wallpaper */
  float core2 = band(p, 2.1, 1.6, -0.11, amp * 0.8, 0.36, 700.0);
  float halo2 = band(p, 2.1, 1.6, -0.11, amp * 0.8, 0.36, 55.0);
  col += phosphor * (core2 * (0.10 + 0.22 * live) + halo2 * (0.012 + 0.03 * live));

  /* pulso do polling: o aparelho pisca quando a resposta chega */
  col += phosphor * u_pulse * (core + core2) * 0.7;
  col += phosphor * u_pulse * 0.008;

  /* varredura de liquidação: uma vez, na diagonal, 1.1s */
  if (u_settle < 1.1) {
    float k = u_settle / 1.1;
    float front = -1.3 + k * 3.0;
    float axis = p.x * 0.78 + p.y * 0.62;
    float edge = exp(-pow((axis - front) * 3.4, 2.0));
    col += vec3(0.0, 1.0, 0.44) * edge * (1.0 - k) * 0.5;
    col += vec3(0.0, 1.0, 0.44) * exp(-pow((axis - front) * 26.0, 2.0)) * (1.0 - k) * 0.55;
  }

  /* piso de ruído */
  float g = hash(gl_FragCoord.xy + floor(u_time * 20.0));
  col += (g - 0.5) * 0.02;

  outColor = vec4(col, 1.0);
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
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: "low-power",
    });
    // sem WebGL2 o fundo do chassi já está pintado no <html>: a tela continua
    // legível, só perde o campo
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
    const uTime = gl.getUniformLocation(program, "u_time");
    const uPending = gl.getUniformLocation(program, "u_pending");
    const uPulse = gl.getUniformLocation(program, "u_pulse");
    const uSettle = gl.getUniformLocation(program, "u_settle");

    let width = 0;
    let height = 0;
    const resize = () => {
      // O campo é difuso de propósito: desenhar a 0.6× do CSS e deixar o canvas
      // esticar é indistinguível a olho e corta ~64% do trabalho de fragment —
      // o que importa em máquina sem GPU, onde a tela toda em software rouba a
      // thread principal e trava a navegação.
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
    const state = { pending: 0, ease: 0, pulse: 0, settledAt: -1e6 };

    const unsubscribe = subscribeSignal({
      onPending: (count) => {
        state.pending = count;
      },
      onPoll: () => {
        state.pulse = 1;
      },
      onSettled: () => {
        state.settledAt = performance.now() / 1000;
        state.pulse = 1;
      },
    });

    let raf = 0;
    let lastDraw = 0;
    const start = performance.now();

    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      if (document.hidden) return;

      const seconds = (now - start) / 1000;
      const settle = performance.now() / 1000 - state.settledAt;
      const target = state.pending > 0 ? 1 : 0;
      const busy = state.ease > 0.01 || state.pulse > 0.01 || settle < 1.4;

      // 30fps quando há atividade, 15fps em repouso. O campo é lento por
      // desenho, então 60fps só queimaria bateria — e em renderização por
      // software (headless/SwiftShader) chega a sufocar o resto da página
      const interval = busy ? 33 : 66;
      if (now - lastDraw < interval) return;
      const step = Math.min((now - lastDraw) / 1000, 0.1);
      lastDraw = now;

      if (reduced.matches) {
        gl.uniform1f(uTime, 0);
        gl.uniform1f(uPending, target);
        gl.uniform1f(uPulse, 0);
        gl.uniform1f(uSettle, settle < 1.1 ? 0.55 : 1e6);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        return;
      }

      state.ease += (target - state.ease) * Math.min(step * 2.4, 1);
      state.pulse = Math.max(0, state.pulse - step * 1.6);

      gl.uniform1f(uTime, seconds);
      gl.uniform1f(uPending, state.ease);
      gl.uniform1f(uPulse, state.pulse);
      gl.uniform1f(uSettle, settle);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      unsubscribe();
      gl.deleteProgram(program);
      gl.deleteShader(vert);
      gl.deleteShader(frag);
      // não descartar o contexto aqui: em StrictMode o efeito remonta e
      // getContext devolveria o mesmo contexto já perdido
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
