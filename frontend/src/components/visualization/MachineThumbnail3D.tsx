import { useId } from "react";

interface MachineThumbnail3DProps {
  name: string;
  type: string;
  className?: string;
}

type MachineKind = "mill" | "robot" | "laser" | "press" | "lathe" | "conveyor" | "coolant" | "camera" | "gantry" | "oven" | "fan" | "generic";

function machineKind(name: string, type: string): MachineKind {
  const machine = `${name} ${type}`.toLowerCase();
  if (/robot|roboarm|weldbot|welder/.test(machine)) return "robot";
  if (/laser/.test(machine)) return "laser";
  if (/press|hydraulic|stamping/.test(machine)) return "press";
  if (/lathe/.test(machine)) return "lathe";
  if (/pack|conveyor/.test(machine)) return "conveyor";
  if (/coolant|chiller/.test(machine)) return "coolant";
  if (/camera|vision|inspect/.test(machine)) return "camera";
  if (/pick.and.place|smt/.test(machine)) return "gantry";
  if (/reflow|oven/.test(machine)) return "oven";
  if (/air.handler|cleanfan|ffu/.test(machine)) return "fan";
  if (/mill|cnc/.test(machine)) return "mill";
  return "generic";
}

export function MachineThumbnail3D({ name, type, className = "" }: MachineThumbnail3DProps) {
  const kind = machineKind(name, type);
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const steel = `url(#${id}-steel)`;
  const glass = `url(#${id}-glass)`;

  return (
    <svg viewBox="0 0 80 80" className={className} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`${id}-steel`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="var(--color-panel)" />
          <stop offset="1" stopColor="var(--color-line-strong)" />
        </linearGradient>
        <linearGradient id={`${id}-glass`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="var(--color-accent-line)" />
          <stop offset="1" stopColor="var(--color-accent-ink)" />
        </linearGradient>
      </defs>
      <ellipse cx="40" cy="69" rx="28" ry="5" fill="var(--color-line-strong)" opacity="0.55" />

      {kind === "mill" && (
        <>
          <path d="M12 24 21 18h47l-8 6z" fill="var(--color-sunken)" stroke="var(--color-line-strong)" />
          <path d="M60 24 68 18v42l-8 5z" fill="var(--color-subtle)" />
          <rect x="12" y="24" width="48" height="41" rx="2" fill={steel} stroke="var(--color-line-strong)" />
          <rect x="19" y="30" width="27" height="25" rx="1" fill={glass} stroke="var(--color-accent-ink)" />
          <path d="M32 30v12m-5 9 5-6 5 6M20 48h25" fill="none" stroke="var(--color-panel)" strokeWidth="2" opacity="0.78" />
          <rect x="49" y="30" width="7" height="19" rx="1" fill="var(--color-sunken)" stroke="var(--color-subtle)" />
          <circle cx="52.5" cy="35" r="1.3" fill="var(--color-accent)" />
          <path d="M18 64v3m35-3v3" stroke="var(--color-subtle)" strokeWidth="4" />
        </>
      )}

      {kind === "robot" && (
        <>
          <path d="M23 57 32 52h24l-8 5z" fill="var(--color-sunken)" stroke="var(--color-line-strong)" />
          <path d="M48 57 56 52v12l-8 4z" fill="var(--color-subtle)" />
          <path d="M23 57h25v11H23z" fill={steel} stroke="var(--color-line-strong)" />
          <path d="M36 54 27 42 41 29 51 37 60 23" fill="none" stroke="var(--color-subtle)" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M36 53 27 41 41 28 51 36 60 22" fill="none" stroke={steel} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="27" cy="41" r="5" fill="var(--color-accent-line)" stroke="var(--color-accent-ink)" strokeWidth="2" />
          <circle cx="41" cy="28" r="5" fill="var(--color-accent-line)" stroke="var(--color-accent-ink)" strokeWidth="2" />
          <circle cx="51" cy="36" r="4" fill="var(--color-accent-line)" stroke="var(--color-accent-ink)" strokeWidth="2" />
          <path d="M60 22 66 18m-5 6 7 2" stroke="var(--color-accent-ink)" strokeWidth="2.5" strokeLinecap="round" />
        </>
      )}

      {kind === "laser" && (
        <>
          <path d="M10 38 23 26h45L56 38z" fill="var(--color-sunken)" stroke="var(--color-line-strong)" />
          <path d="M56 38 68 26v32l-12 8z" fill="var(--color-subtle)" />
          <path d="M10 38h46v28H10z" fill={steel} stroke="var(--color-line-strong)" />
          <path d="M17 36 27 28h31l-9 8z" fill={glass} stroke="var(--color-accent-ink)" />
          <path d="M23 31h24m-5-4-5 10" stroke="var(--color-panel)" strokeWidth="1.5" opacity="0.7" />
          <rect x="17" y="44" width="18" height="11" rx="1" fill="var(--color-sunken)" stroke="var(--color-line-strong)" />
          <circle cx="49" cy="47" r="2" fill="var(--color-accent)" />
          <path d="M17 61h32" stroke="var(--color-subtle)" strokeWidth="2" />
        </>
      )}

      {kind === "press" && (
        <>
          <path d="M18 57h44v8H18z" fill={steel} stroke="var(--color-subtle)" />
          <path d="M62 57 69 52v8l-7 5z" fill="var(--color-subtle)" />
          <path d="M24 23h8v34h-8zm25 0h8v34h-8z" fill={steel} stroke="var(--color-line-strong)" />
          <path d="M18 20 25 15h44l-7 5z" fill="var(--color-sunken)" stroke="var(--color-line-strong)" />
          <path d="M62 20 69 15v13l-7 5z" fill="var(--color-subtle)" />
          <path d="M18 20h44v13H18z" fill={steel} stroke="var(--color-line-strong)" />
          <path d="M36 33h9v12h-9z" fill="var(--color-subtle)" />
          <path d="M31 45h19v6H31z" fill={glass} stroke="var(--color-accent-ink)" />
          <circle cx="55" cy="26" r="2" fill="var(--color-accent)" />
        </>
      )}

      {kind === "lathe" && (
        <>
          <path d="M12 42 22 34h46L58 42z" fill="var(--color-sunken)" stroke="var(--color-line-strong)" />
          <path d="M58 42 68 34v25l-10 7z" fill="var(--color-subtle)" />
          <path d="M12 42h46v24H12z" fill={steel} stroke="var(--color-line-strong)" />
          <path d="M19 39V27h16v12" fill={steel} stroke="var(--color-line-strong)" />
          <circle cx="27" cy="33" r="5" fill="var(--color-accent-ink)" stroke="var(--color-panel)" strokeWidth="2" />
          <path d="M34 38h21m-20 4h20" stroke="var(--color-subtle)" strokeWidth="2.5" />
          <path d="M49 34h8v10h-8z" fill={glass} stroke="var(--color-accent-ink)" />
          <path d="M20 56h30" stroke="var(--color-subtle)" strokeWidth="2" />
        </>
      )}

      {kind === "conveyor" && (
        <>
          <path d="M10 43 21 36h48l-11 7z" fill={glass} stroke="var(--color-accent-ink)" />
          <path d="M10 43h48v8H10z" fill={steel} stroke="var(--color-subtle)" />
          <path d="M58 43 69 36v8l-11 7z" fill="var(--color-subtle)" />
          <path d="M18 51v14m33-14v14m11-18v14" stroke="var(--color-subtle)" strokeWidth="3" />
          <path d="M34 34 40 29h14l-6 5z" fill="var(--color-sunken)" stroke="var(--color-line-strong)" />
          <path d="M34 34h14v9H34z" fill={steel} stroke="var(--color-line-strong)" />
          <path d="M48 34 54 29v9l-6 5z" fill="var(--color-subtle)" />
          <circle cx="20" cy="48" r="2" fill="var(--color-accent-ink)" />
          <circle cx="50" cy="48" r="2" fill="var(--color-accent-ink)" />
        </>
      )}

      {kind === "coolant" && (
        <>
          <path d="M20 23 29 17h39l-9 6z" fill="var(--color-sunken)" stroke="var(--color-line-strong)" />
          <path d="M59 23 68 17v45l-9 5z" fill="var(--color-subtle)" />
          <path d="M20 23h39v44H20z" fill={steel} stroke="var(--color-line-strong)" />
          <path d="M26 29h27v24H26z" fill="var(--color-sunken)" stroke="var(--color-subtle)" />
          <path d="M29 34h21m-21 4h21m-21 4h21m-21 4h21" stroke="var(--color-subtle)" strokeWidth="2" />
          <circle cx="49" cy="60" r="2" fill="var(--color-accent)" />
          <path d="M25 66v3m29-3v3" stroke="var(--color-subtle)" strokeWidth="3" />
        </>
      )}

      {kind === "camera" && (
        <>
          <path d="M29 61h23l6 6H23z" fill={steel} stroke="var(--color-line-strong)" />
          <path d="M39 39h5v23h-5z" fill="var(--color-subtle)" />
          <path d="M30 20 38 16h20l-7 4z" fill="var(--color-sunken)" stroke="var(--color-line-strong)" />
          <path d="M51 20 58 16v25l-7 5z" fill="var(--color-subtle)" />
          <path d="M30 20h21v26H30z" fill={steel} stroke="var(--color-line-strong)" />
          <circle cx="40" cy="33" r="8" fill={glass} stroke="var(--color-accent-ink)" strokeWidth="2" />
          <circle cx="40" cy="33" r="3" fill="var(--color-accent-ink)" />
          <circle cx="41" cy="31" r="1" fill="var(--color-panel)" />
        </>
      )}

      {kind === "gantry" && (
        <>
          <path d="M11 51 22 44h47l-10 7z" fill="var(--color-sunken)" stroke="var(--color-line-strong)" />
          <path d="M11 51h48v12H11z" fill={steel} stroke="var(--color-line-strong)" />
          <path d="M59 51 69 44v12l-10 7z" fill="var(--color-subtle)" />
          <path d="M21 24v26m37-26v26M20 25h39" fill="none" stroke="var(--color-subtle)" strokeWidth="6" />
          <path d="M21 23h37m-15 2v17" fill="none" stroke={steel} strokeWidth="4" />
          <path d="M39 34h8v12h-8z" fill={glass} stroke="var(--color-accent-ink)" />
          <path d="M43 46v5" stroke="var(--color-accent-ink)" strokeWidth="2" />
          <circle cx="26" cy="55" r="2" fill="var(--color-accent)" />
          <circle cx="34" cy="55" r="2" fill="var(--color-accent)" />
        </>
      )}

      {kind === "oven" && (
        <>
          <path d="M11 28 20 22h48l-9 6z" fill="var(--color-sunken)" stroke="var(--color-line-strong)" />
          <path d="M59 28 68 22v40l-9 5z" fill="var(--color-subtle)" />
          <path d="M11 28h48v39H11z" fill={steel} stroke="var(--color-line-strong)" />
          <path d="M17 35h33v18H17z" fill="var(--color-subtle)" stroke="var(--color-accent-ink)" />
          <path d="M20 39h27m-27 5h27m-27 5h27" stroke="var(--color-accent-line)" strokeWidth="1.5" />
          <circle cx="54" cy="37" r="2" fill="var(--color-accent)" />
          <path d="M18 59h34" stroke="var(--color-subtle)" strokeWidth="2" />
          <path d="M15 67v2m39-2v2" stroke="var(--color-subtle)" strokeWidth="3" />
        </>
      )}

      {kind === "fan" && (
        <>
          <path d="M16 24 25 18h43l-9 6z" fill="var(--color-sunken)" stroke="var(--color-line-strong)" />
          <path d="M59 24 68 18v43l-9 6z" fill="var(--color-subtle)" />
          <path d="M16 24h43v43H16z" fill={steel} stroke="var(--color-line-strong)" />
          <circle cx="37" cy="45" r="15" fill="var(--color-sunken)" stroke="var(--color-subtle)" strokeWidth="2" />
          <path d="M37 43c4-2 8-8 5-10-3-1-7 4-7 8m4 4c2 4 8 8 10 5 1-3-4-7-8-7m-6 3c-4 2-8 8-5 10 3 1 7-4 7-8m-4-4c-2-4-8-8-10-5-1 3 4 7 8 7" fill="var(--color-accent-line)" stroke="var(--color-accent-ink)" strokeWidth="1" />
          <circle cx="37" cy="45" r="3" fill="var(--color-accent-ink)" />
        </>
      )}

      {kind === "generic" && (
        <>
          <path d="M16 28 26 21h42l-9 7z" fill="var(--color-sunken)" stroke="var(--color-line-strong)" />
          <path d="M59 28 68 21v39l-9 6z" fill="var(--color-subtle)" />
          <path d="M16 28h43v38H16z" fill={steel} stroke="var(--color-line-strong)" />
          <path d="M23 34h25v19H23z" fill={glass} stroke="var(--color-accent-ink)" />
          <circle cx="53" cy="37" r="2" fill="var(--color-accent)" />
          <path d="M23 60h30" stroke="var(--color-subtle)" strokeWidth="2" />
        </>
      )}
    </svg>
  );
}
