"use client";

import { useEffect, useState } from "react";

interface ToastProps {
  message: string | null;
  onDone: () => void;
}

export function Toast({ message, onDone }: ToastProps) {
  const [visible, setVisible] = useState(false);
  const [text, setText] = useState("");

  useEffect(() => {
    if (!message) return;
    setText(message);
    setVisible(true);
    const hide = setTimeout(() => setVisible(false), 2600);
    const clear = setTimeout(onDone, 3200);
    return () => {
      clearTimeout(hide);
      clearTimeout(clear);
    };
  }, [message, onDone]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed bottom-8 left-1/2 z-80 rounded-full border border-veil/12 bg-[rgba(18,18,18,0.94)] px-5 py-3 text-[13.5px] text-soft backdrop-blur-[10px] transition-[opacity,transform] duration-500 ease-ohq"
      style={{
        opacity: visible ? 1 : 0,
        transform: `translate(-50%, ${visible ? "0" : "26px"})`,
      }}
    >
      {text}
    </div>
  );
}
