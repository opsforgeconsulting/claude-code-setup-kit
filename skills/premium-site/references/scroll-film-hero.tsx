"use client";
/*
  Scroll-scrubbed film hero. Template: rename, restyle with the project's tokens, replace the copy.

  How it works: a tall wrapper holds a sticky full-screen stage. Scroll progress through the
  wrapper is the playhead. A requestAnimationFrame loop eases video.currentTime toward that
  playhead, which is what makes the scrub feel smooth instead of steppy.

  Files it expects (see encode-film.sh):
    /media/film.mp4      1280x720, keyframe every 8 frames
    /media/film-sm.mp4   854x480 for phones
    /media/k1.jpg ...    keyframe stills, first to last
*/
import Link from "next/link";
import { motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useEffect, useRef, useState } from "react";

// Text beats: each shows while scroll progress is inside [from, to).
const BEATS = [
  { from: 0.0, to: 0.2, kicker: "Where we start", title: "First line.", sub: "One supporting sentence." },
  { from: 0.27, to: 0.45, kicker: "What we pass", title: "Second line.", sub: "One supporting sentence." },
  { from: 0.45, to: 0.62, kicker: "Almost there", title: "Third line.", sub: "One supporting sentence." },
];
// Progress at which the landing lockup (logo + calls to action) takes over.
const FINAL_AT = 0.74;
// The film finishes a beat before the page releases, so the landing frame holds still.
const FILM_END = 0.92;
const KEYFRAMES = ["/media/k1.jpg", "/media/k2.jpg", "/media/k3.jpg"];

export function ScrollFilmHero() {
  const reduce = useReducedMotion();
  const wrap = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const target = useRef(0);
  const [p, setP] = useState(0);
  const [ready, setReady] = useState(false);
  const [src, setSrc] = useState<string | null>(null);
  const { scrollYProgress } = useScroll({ target: wrap, offset: ["start start", "end end"] });
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    target.current = v;
    setP(v);
  });
  const shade = useTransform(scrollYProgress, [0, 0.6, 0.8, 1], [0.25, 0.12, 0.3, 0.32]);

  // Choose the file after mount so server and client render the same markup.
  useEffect(() => {
    if (reduce) return;
    setSrc(window.matchMedia("(max-width: 767px)").matches ? "/media/film-sm.mp4" : "/media/film.mp4");
  }, [reduce]);

  // Scrub loop.
  useEffect(() => {
    if (reduce || !src) return;
    const v = video.current;
    if (!v) return;
    let raf = 0;
    // Some browsers refuse to seek a video that has never played.
    const prime = () => {
      v.play().then(() => v.pause()).catch(() => {});
    };
    if (v.readyState >= 1) prime();
    else v.addEventListener("loadedmetadata", prime, { once: true });
    const tick = () => {
      if (v.duration && !Number.isNaN(v.duration)) {
        const want = Math.min(0.999, target.current / FILM_END) * v.duration;
        const diff = want - v.currentTime;
        if (Math.abs(diff) > 0.012) v.currentTime = v.currentTime + diff * 0.15;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduce, src]);

  const final = reduce || p >= FINAL_AT;

  return (
    <div ref={wrap} className={reduce ? "relative h-[100svh] bg-black" : "relative h-[420vh] bg-black"}>
      <div className="sticky top-0 h-[100svh] min-h-[620px] overflow-hidden text-white">
        {reduce ? (
          // Reduced motion: rest on the landing frame.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={KEYFRAMES[KEYFRAMES.length - 1]} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <>
            {/* Stills cross-fade by scroll position until the video can seek. */}
            {KEYFRAMES.map((k, i) => {
              const pos = Math.min(1, p / FILM_END) * (KEYFRAMES.length - 1);
              // eslint-disable-next-line @next/next/no-img-element
              return <img key={k} src={k} alt="" className="absolute inset-0 h-full w-full object-cover" style={{ opacity: Math.max(0, 1 - Math.abs(pos - i)) }} />;
            })}
            {src ? (
              <video
                ref={video}
                src={src}
                muted
                playsInline
                preload="auto"
                onLoadedData={() => setReady(true)}
                className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${ready ? "opacity-100" : "opacity-0"}`}
              />
            ) : null}
          </>
        )}
        {/* Shade so text stays readable over footage. Swap the colors for the project's base tone. */}
        <motion.div aria-hidden style={{ opacity: reduce ? 0.5 : shade }} className="absolute inset-0 bg-black" />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/60" />

        <div className="relative mx-auto flex h-full max-w-7xl flex-col justify-end px-4 pb-16 pt-28 sm:px-6 lg:px-8">
          {!reduce &&
            BEATS.map((b) => {
              const on = p >= b.from && p < b.to;
              return (
                <div
                  key={b.title}
                  aria-hidden={!on}
                  className={`absolute inset-x-4 bottom-28 transition-all duration-700 sm:inset-x-6 lg:inset-x-8 ${on ? "translate-y-0 opacity-100 blur-0" : "pointer-events-none translate-y-6 opacity-0 blur-sm"}`}
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-white/80">{b.kicker}</p>
                  <p className="mt-3 text-5xl font-bold leading-none drop-shadow-[0_6px_30px_rgba(0,0,0,0.7)] sm:text-8xl">{b.title}</p>
                  <p className="mt-4 max-w-md text-lg text-white/85 sm:text-xl">{b.sub}</p>
                </div>
              );
            })}

          {/* Landing: logo, one line, one primary action, one secondary. */}
          <div className={`transition-all duration-1000 ease-out ${final ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-10 opacity-0"}`}>
            <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
              <h1 className="text-5xl font-bold tracking-tight sm:text-7xl">Client name</h1>
              <p className="mt-4 max-w-xl text-lg text-white/85">The one-line promise, in their words.</p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Link href="/contact" className="rounded-xl bg-white px-6 py-3 text-sm font-semibold text-black transition hover:-translate-y-0.5">
                  Primary action
                </Link>
                <Link href="/#more" className="rounded-xl border border-white/20 bg-white/5 px-6 py-3 text-sm font-medium backdrop-blur-sm transition hover:-translate-y-0.5 hover:bg-white/10">
                  Secondary action
                </Link>
              </div>
            </div>
          </div>

          {!reduce ? (
            <p className={`absolute bottom-6 left-1/2 -translate-x-1/2 text-xs font-semibold uppercase tracking-[0.3em] text-white/75 transition-opacity duration-500 ${p > 0.03 ? "opacity-0" : "opacity-100"}`}>
              Scroll
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
