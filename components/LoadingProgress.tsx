"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

export default function LoadingProgress({ loading }: { loading: boolean }) {
  const [progress, setProgress] = useState(30);
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const startedAt = Date.now();
    let hideTimer: number | undefined;
    const timer = window.setInterval(() => {
      if (!loading) {
        setProgress(100);
        setFading(true);
        window.clearInterval(timer);
        hideTimer = window.setTimeout(() => setVisible(false), 420);
        return;
      }
      setProgress(Math.min(94, 30 + Math.floor(((Date.now() - startedAt) / 5_000) * 64)));
    }, 50);
    return () => {
      window.clearInterval(timer);
      if (hideTimer) window.clearTimeout(hideTimer);
    };
  }, [loading]);

  if (!visible) return null;
  return (
    <div className={`loading-progress-screen${fading ? " is-fading-out" : ""}`} role="status" aria-label="Loading travel order records">
      <div className="loading-progress-content">
        <div className="loading-progress-brand">
          <Image className="loading-progress-image" src="/tor_logo.png" alt="Travel Order Records" width={490} height={180} priority draggable={false} />
          <span className="loading-progress-wording"><strong>DA <em>RECORDS</em></strong><small>CARAGA REGION</small></span>
        </div>
        <div className="loading-progress-value" role="progressbar" aria-label="Loading records" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><span>{progress}</span><small>%</small></div>
        <div className="loading-progress-track" aria-hidden="true"><span style={{ transform: `scaleX(${progress / 100})` }} /></div>
        <p className="loading-progress-caption"><span className="loading-progress-dot" />Preparing the public register</p>
      </div>
    </div>
  );
}