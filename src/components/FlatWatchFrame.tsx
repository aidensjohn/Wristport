import type { ReactNode } from 'react';
import type { HeroWatchModel, WatchStrapType } from '../types';

interface FlatWatchFrameProps {
  model: HeroWatchModel;
  strap?: WatchStrapType;
  children?: ReactNode;
  preview?: boolean;
}

const MINUTE_ANGLES_60 = Array.from({ length: 60 }, (_, i) => i * 6);
const HOUR_ANGLES_12 = Array.from({ length: 12 }, (_, i) => i * 30);
const GEAR_NOTCHES_36 = Array.from({ length: 36 }, (_, i) => i * 10);

export function WatchStrapGraphic({
  strap = 'sports',
  position,
}: {
  strap?: WatchStrapType;
  position: 'top' | 'bottom';
}) {
  const isTop = position === 'top';
  const y = isTop ? 10 : 202;
  const h = 28;

  if (strap === 'leather') {
    return (
      <g>
        {/* Rich Saddle Brown Leather Base */}
        <rect
          x="92"
          y={y}
          width="56"
          height={h}
          rx="6"
          fill="#784728"
          stroke="#522F16"
          strokeWidth="1.5"
        />
        {/* Subtle center grain highlight */}
        <rect
          x="104"
          y={y}
          width="32"
          height={h}
          fill="#8A5330"
          opacity="0.45"
        />
        {/* Contrast Saddle Edge Stitching */}
        <line
          x1="96.5"
          y1={y + 1}
          x2="96.5"
          y2={y + h - 1}
          stroke="#F3DCBA"
          strokeWidth="1.3"
          strokeDasharray="2.5 2.5"
        />
        <line
          x1="143.5"
          y1={y + 1}
          x2="143.5"
          y2={y + h - 1}
          stroke="#F3DCBA"
          strokeWidth="1.3"
          strokeDasharray="2.5 2.5"
        />
        {/* Leather Keeper Loop on bottom */}
        {!isTop && (
          <rect
            x="90.5"
            y="216"
            width="59"
            height="7.5"
            rx="2"
            fill="#5A3219"
            stroke="#3B1E0C"
            strokeWidth="1"
          />
        )}
      </g>
    );
  }

  if (strap === 'nylon') {
    return (
      <g>
        {/* Heavy Woven Ballistic Nylon Base (Tactical Olive / Army Slate) */}
        <rect
          x="92"
          y={y}
          width="56"
          height={h}
          rx="5"
          fill="#3B4739"
          stroke="#273126"
          strokeWidth="1.5"
        />
        {/* Cross-weave texture lines */}
        {Array.from({ length: 4 }, (_, idx) => {
          const lineY = y + 5 + idx * 6;
          return (
            <line
              key={`nylon-${position}-${lineY}`}
              x1="93"
              y1={lineY}
              x2="147"
              y2={lineY}
              stroke="rgba(255,255,255,0.15)"
              strokeWidth="1"
              strokeDasharray="2.5 2"
            />
          );
        })}
        {/* Iconic High-Vis Tactical NATO Center Stripe */}
        <rect
          x="116.5"
          y={y}
          width="7"
          height={h}
          fill="#D97706"
          opacity="0.92"
        />
        <rect
          x="118.5"
          y={y}
          width="3"
          height={h}
          fill="#FBBF24"
          opacity="0.9"
        />
        {/* Stainless Steel NATO Keeper Loop on bottom */}
        {!isTop && (
          <g>
            <rect
              x="90"
              y="218"
              width="60"
              height="6.5"
              rx="2.5"
              fill="#94A3B8"
              stroke="#475569"
              strokeWidth="1"
            />
            <rect
              x="93"
              y="219.5"
              width="54"
              height="3.5"
              rx="1.5"
              fill="#CBD5E1"
            />
          </g>
        )}
      </g>
    );
  }

  if (strap === 'milanese') {
    return (
      <g>
        {/* Stainless Steel Link / Mesh Base */}
        <rect
          x="92"
          y={y}
          width="56"
          height={h}
          rx="5"
          fill="#B0B9C6"
          stroke="#687383"
          strokeWidth="1.5"
        />
        {/* Horizontal interlocking metallic link dividers */}
        {Array.from({ length: 4 }, (_, idx) => {
          const lineY = y + 5.5 + idx * 5.5;
          return (
            <line
              key={`steel-${position}-${lineY}`}
              x1="93"
              y1={lineY}
              x2="147"
              y2={lineY}
              stroke="#596372"
              strokeWidth="1.3"
            />
          );
        })}
        {/* Polished center highlight reflection column */}
        <rect
          x="108"
          y={y}
          width="24"
          height={h}
          fill="#E2E8F0"
          opacity="0.45"
        />
        {/* Fine vertical mesh links */}
        <line x1="105" y1={y} x2="105" y2={y + h} stroke="#7B8898" strokeWidth="0.8" strokeDasharray="2 3" />
        <line x1="135" y1={y} x2="135" y2={y + h} stroke="#7B8898" strokeWidth="0.8" strokeDasharray="2 3" />
      </g>
    );
  }

  // Default: 'sports' (Ventilated Matte Silicone Sports Band)
  return (
    <g>
      {/* Matte Dark Silicone Base */}
      <rect
        x="92"
        y={y}
        width="56"
        height={h}
        rx="6"
        fill="#1E232E"
        stroke="#12161E"
        strokeWidth="1.5"
      />
      {/* Recessed center aerodynamic channel */}
      <rect
        x="114"
        y={y}
        width="12"
        height={h}
        fill="#141720"
      />
      {/* Breathable circular sports pinholes */}
      <circle cx="120" cy={y + 8} r="2.3" fill="#0A0C10" />
      <circle cx="120" cy={y + 19} r="2.3" fill="#0A0C10" />
      {/* Dual embossed edge grip rails */}
      <line x1="95.5" y1={y} x2="95.5" y2={y + h} stroke="#2B3240" strokeWidth="1" />
      <line x1="144.5" y1={y} x2="144.5" y2={y + h} stroke="#2B3240" strokeWidth="1" />
    </g>
  );
}

export function WatchStrapPreviewSvg({ strap }: { strap: WatchStrapType }) {
  return (
    <svg viewBox="0 0 80 80" className="h-12 w-12 shrink-0" aria-hidden="true">
      {/* Background container */}
      <rect x="4" y="4" width="72" height="72" rx="14" fill="rgba(255,255,255,0.03)" />
      {/* Strap body */}
      {strap === 'leather' && (
        <g>
          <rect x="22" y="8" width="36" height="64" rx="6" fill="#784728" stroke="#522F16" strokeWidth="1.5" />
          <rect x="30" y="8" width="20" height="64" fill="#8A5330" opacity="0.45" />
          <line x1="26" y1="10" x2="26" y2="70" stroke="#F3DCBA" strokeWidth="1.2" strokeDasharray="2.5 2.5" />
          <line x1="54" y1="10" x2="54" y2="70" stroke="#F3DCBA" strokeWidth="1.2" strokeDasharray="2.5 2.5" />
          <rect x="20" y="44" width="40" height="8" rx="2" fill="#5A3219" stroke="#3B1E0C" strokeWidth="1" />
        </g>
      )}
      {strap === 'nylon' && (
        <g>
          <rect x="22" y="8" width="36" height="64" rx="5" fill="#3B4739" stroke="#273126" strokeWidth="1.5" />
          {Array.from({ length: 7 }, (_, i) => (
            <line
              key={`pre-nyl-${i}`}
              x1="23"
              y1={14 + i * 8}
              x2="57"
              y2={14 + i * 8}
              stroke="rgba(255,255,255,0.18)"
              strokeWidth="1"
              strokeDasharray="2.5 2"
            />
          ))}
          <rect x="37" y="8" width="6" height="64" fill="#D97706" />
          <rect x="19" y="46" width="42" height="7" rx="2.5" fill="#94A3B8" stroke="#475569" strokeWidth="1" />
        </g>
      )}
      {strap === 'milanese' && (
        <g>
          <rect x="22" y="8" width="36" height="64" rx="5" fill="#B0B9C6" stroke="#687383" strokeWidth="1.5" />
          {Array.from({ length: 8 }, (_, i) => (
            <line
              key={`pre-mil-${i}`}
              x1="23"
              y1={13 + i * 7}
              x2="57"
              y2={13 + i * 7}
              stroke="#596372"
              strokeWidth="1.2"
            />
          ))}
          <rect x="32" y="8" width="16" height="64" fill="#E2E8F0" opacity="0.45" />
        </g>
      )}
      {strap === 'sports' && (
        <g>
          <rect x="22" y="8" width="36" height="64" rx="6" fill="#1E232E" stroke="#12161E" strokeWidth="1.5" />
          <rect x="35" y="8" width="10" height="64" fill="#141720" />
          <circle cx="40" cy="20" r="2.5" fill="#0A0C10" />
          <circle cx="40" cy="32" r="2.5" fill="#0A0C10" />
          <circle cx="40" cy="48" r="2.5" fill="#0A0C10" />
          <circle cx="40" cy="60" r="2.5" fill="#0A0C10" />
        </g>
      )}
    </svg>
  );
}

export function FlatWatchFrame({
  model,
  strap = 'sports',
  children,
  preview = false,
}: FlatWatchFrameProps) {
  const isMini = preview;

  if (model === 'minimal-glass') {
    if (isMini) {
      return (
        <svg viewBox="0 0 80 80" className="h-14 w-14 shrink-0" aria-hidden="true">
          <rect x="27" y="4" width="26" height="12" rx="4" fill="#3B4254" />
          <rect x="27" y="64" width="26" height="12" rx="4" fill="#3B4254" />
          <rect x="65" y="25" width="4" height="10" rx="2" fill="#94A3B8" />
          <rect x="65" y="45" width="4" height="10" rx="2" fill="#94A3B8" />
          <circle cx="40" cy="40" r="26" fill="#2A3142" stroke="#94A3B8" strokeWidth="2" />
          <circle cx="40" cy="40" r="21" fill="#07090F" />
          <text
            x="40"
            y="43"
            textAnchor="middle"
            fill="#F8FAFC"
            fontSize="10"
            fontWeight="700"
            fontFamily="sans-serif"
          >
            10:09
          </text>
        </svg>
      );
    }

    return (
      <div className="relative flex h-[240px] w-[240px] items-center justify-center">
        {/* Top strap container */}
        <div
          aria-hidden="true"
          className={`absolute top-3 h-10 w-14 rounded-t-2xl border-x border-t ${
            strap === 'leather'
              ? 'border-[#522F16] bg-[#784728]'
              : strap === 'nylon'
              ? 'border-[#273126] bg-[#3B4739]'
              : strap === 'milanese'
              ? 'border-[#687383] bg-[#B0B9C6]'
              : 'border-white/18 bg-[#1E232E]'
          }`}
        />
        {/* Bottom strap container */}
        <div
          aria-hidden="true"
          className={`absolute bottom-3 h-10 w-14 rounded-b-2xl border-x border-b ${
            strap === 'leather'
              ? 'border-[#522F16] bg-[#784728]'
              : strap === 'nylon'
              ? 'border-[#273126] bg-[#3B4739]'
              : strap === 'milanese'
              ? 'border-[#687383] bg-[#B0B9C6]'
              : 'border-white/18 bg-[#1E232E]'
          }`}
        />
        {/* Side pushers */}
        <div
          aria-hidden="true"
          className="absolute right-[33px] top-[82px] h-5 w-1.5 rounded-r-full border border-white/25 bg-white/20"
        />
        <div
          aria-hidden="true"
          className="absolute right-[33px] bottom-[82px] h-5 w-1.5 rounded-r-full border border-white/25 bg-white/20"
        />
        {/* Minimal glass case */}
        <div className="relative flex h-[162px] w-[162px] items-center justify-center rounded-full border border-white/35 bg-gradient-to-br from-white/22 via-white/[0.06] to-white/[0.02] p-3 backdrop-blur-sm shadow-[inset_0_1.5px_0_rgba(255,255,255,0.55),0_20px_50px_rgba(0,0,0,0.5)]">
          <div className="hero-watch-screen relative flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-full border border-white/18 bg-[#05070C] text-center">
            {children}
          </div>
        </div>
      </div>
    );
  }

  const svgContent = (
    <svg
      viewBox="0 0 240 240"
      className={
        isMini
          ? 'h-16 w-16 shrink-0'
          : 'pointer-events-none absolute inset-0 h-full w-full drop-shadow-[0_14px_26px_rgba(0,0,0,0.45)]'
      }
      aria-hidden="true"
    >
      {/* ==================== 1. GALAXY WATCH 1 (46mm) ==================== */}
      {model === 'galaxy-watch-1' && (
        <g>
          {/* Customizable Strap Top & Bottom */}
          <WatchStrapGraphic strap={strap} position="top" />
          <WatchStrapGraphic strap={strap} position="bottom" />

          {/* Brushed silver 22mm lugs top & bottom */}
          <path
            d="M72 48 L84 16 L95 16 L95 44 L145 44 L145 16 L156 16 L168 48 Z"
            fill="#DCE2EA"
            stroke="#94A0AE"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path
            d="M72 192 L84 224 L95 224 L95 196 L145 196 L145 224 L156 224 L168 192 Z"
            fill="#DCE2EA"
            stroke="#94A0AE"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />

          {/* Flat rectangular silver hardware pushers (2 o'clock & 4 o'clock) */}
          <g transform="rotate(-26 120 120)">
            <rect
              x="201"
              y="108"
              width="9"
              height="24"
              rx="3"
              fill="#CBD3DE"
              stroke="#64748B"
              strokeWidth="1.5"
            />
          </g>
          <g transform="rotate(26 120 120)">
            <rect
              x="201"
              y="108"
              width="9"
              height="24"
              rx="3"
              fill="#CBD3DE"
              stroke="#64748B"
              strokeWidth="1.5"
            />
          </g>

          {/* Outer stainless steel silver case body */}
          <circle
            cx="120"
            cy="120"
            r="84"
            fill="#E2E7EE"
            stroke="#94A0AE"
            strokeWidth="2"
          />
          <circle cx="120" cy="120" r="80.5" fill="#CBD3DD" />

          {/* Iconic thick flat matte-black notched rotating bezel */}
          <circle cx="120" cy="120" r="78" fill="#171A21" />
          <circle cx="120" cy="120" r="76" fill="none" stroke="#2D3340" strokeWidth="1" />

          {/* 60-minute white bezel tick marks + bold 5-minute blocks */}
          {MINUTE_ANGLES_60.map((deg) => {
            const isFive = deg % 30 === 0;
            return (
              <line
                key={`w1-${deg}`}
                x1="120"
                y1={isFive ? 44.5 : 46.5}
                x2="120"
                y2={isFive ? 51.5 : 49.5}
                stroke={isFive ? '#F1F5F9' : '#64748B'}
                strokeWidth={isFive ? '2.1' : '1'}
                strokeLinecap="round"
                transform={`rotate(${deg} 120 120)`}
              />
            );
          })}

          {/* Inner silver chamfer lip around AMOLED screen */}
          <circle cx="120" cy="120" r="67.5" fill="#0B0E14" stroke="#3B4252" strokeWidth="1.5" />
        </g>
      )}

      {/* ==================== 2. GALAXY WATCH 3 (45mm) ==================== */}
      {model === 'galaxy-watch-3' && (
        <g>
          {/* Customizable Strap Top & Bottom */}
          <WatchStrapGraphic strap={strap} position="top" />
          <WatchStrapGraphic strap={strap} position="bottom" />

          {/* Sleek curved Mystic Black lugs */}
          <path
            d="M74 50 L85 16 L96 16 L96 44 L144 44 L144 16 L155 16 L166 50 Z"
            fill="#2B303A"
            stroke="#15181E"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path
            d="M74 190 L85 224 L96 224 L96 196 L144 196 L144 224 L155 224 L166 190 Z"
            fill="#2B303A"
            stroke="#15181E"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />

          {/* Side pusher guard ridge + TWO distinctive round pushers */}
          <rect x="196" y="101" width="6" height="38" rx="3" fill="#323846" />
          <g transform="rotate(-24 120 120)">
            <rect
              x="199"
              y="113"
              width="12"
              height="14"
              rx="4"
              fill="#3D4454"
              stroke="#1A1D24"
              strokeWidth="1.5"
            />
            <rect x="206" y="111" width="5" height="18" rx="2.5" fill="#4B5366" />
          </g>
          <g transform="rotate(24 120 120)">
            <rect
              x="199"
              y="113"
              width="12"
              height="14"
              rx="4"
              fill="#3D4454"
              stroke="#1A1D24"
              strokeWidth="1.5"
            />
            <rect x="206" y="111" width="5" height="18" rx="2.5" fill="#4B5366" />
          </g>

          {/* Dark Mystic Black flat stainless case */}
          <circle
            cx="120"
            cy="120"
            r="82"
            fill="#2E3440"
            stroke="#161920"
            strokeWidth="2"
          />

          {/* Slim chamfered flat bezel ring */}
          <circle cx="120" cy="120" r="77" fill="#181B22" stroke="#3F4756" strokeWidth="1.5" />

          {/* Clean Watch 3 radial 12-tick markers + 12h triangle */}
          <polygon points="120,45.5 117,50 123,50" fill="#E2E8F0" />
          {HOUR_ANGLES_12.filter((d) => d !== 0).map((deg) => (
            <line
              key={`w3-${deg}`}
              x1="120"
              y1="46"
              x2="120"
              y2="50.5"
              stroke="#94A3B8"
              strokeWidth="1.6"
              strokeLinecap="round"
              transform={`rotate(${deg} 120 120)`}
            />
          ))}

          {/* Screen rim */}
          <circle cx="120" cy="120" r="67.5" fill="#07090E" stroke="#2D3340" strokeWidth="1.5" />
        </g>
      )}

      {/* ==================== 3. GEAR S3 CLASSIC ==================== */}
      {model === 'gear-s3-classic' && (
        <g>
          {/* Customizable Strap Top & Bottom */}
          <WatchStrapGraphic strap={strap} position="top" />
          <WatchStrapGraphic strap={strap} position="bottom" />

          {/* Bright polished stainless classic lugs */}
          <path
            d="M72 49 L85 16 L96 16 L96 44 L144 44 L144 16 L155 16 L168 49 Z"
            fill="#E5E9F0"
            stroke="#9AA4B2"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path
            d="M72 191 L85 224 L96 224 L96 196 L144 196 L144 224 L155 224 L168 191 Z"
            fill="#E5E9F0"
            stroke="#9AA4B2"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />

          {/* Two classic round watch crown pushers */}
          <g transform="rotate(-24 120 120)">
            <rect
              x="199"
              y="112"
              width="12"
              height="16"
              rx="5"
              fill="#D8DFE8"
              stroke="#8B95A5"
              strokeWidth="1.5"
            />
            <rect x="206" y="110" width="5" height="20" rx="2.5" fill="#EEF2F7" />
          </g>
          <g transform="rotate(24 120 120)">
            <rect
              x="199"
              y="112"
              width="12"
              height="16"
              rx="5"
              fill="#D8DFE8"
              stroke="#8B95A5"
              strokeWidth="1.5"
            />
            <rect x="206" y="110" width="5" height="20" rx="2.5" fill="#EEF2F7" />
          </g>

          {/* Stainless steel body + bright SILVER rotating bezel */}
          <circle
            cx="120"
            cy="120"
            r="83"
            fill="#ECEFF4"
            stroke="#9AA4B2"
            strokeWidth="2"
          />
          <circle
            cx="120"
            cy="120"
            r="79"
            fill="#D4DCE5"
            stroke="#AEB7C4"
            strokeWidth="1.5"
          />
          {/* Dark inner chapter ring inside the bright silver bezel */}
          <circle cx="120" cy="120" r="71.5" fill="#1C212B" />

          {/* Fine silver radial ticks on the inner dark ring */}
          {HOUR_ANGLES_12.map((deg) => (
            <line
              key={`s3c-${deg}`}
              x1="120"
              y1="49.5"
              x2="120"
              y2="52.5"
              stroke="#CBD5E1"
              strokeWidth="1.4"
              strokeLinecap="round"
              transform={`rotate(${deg} 120 120)`}
            />
          ))}

          {/* Screen lip */}
          <circle cx="120" cy="120" r="67.5" fill="#07090E" stroke="#64748B" strokeWidth="1" />
        </g>
      )}

      {/* ==================== 4. GEAR S3 FRONTIER ==================== */}
      {model === 'gear-s3-frontier' && (
        <g>
          {/* Customizable Strap Top & Bottom */}
          <WatchStrapGraphic strap={strap} position="top" />
          <WatchStrapGraphic strap={strap} position="bottom" />

          {/* Muscular flat-top dark Frontier lugs */}
          <path
            d="M68 52 L80 16 L96 16 L96 42 L144 42 L144 16 L160 16 L172 52 Z"
            fill="#282C34"
            stroke="#121418"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path
            d="M68 188 L80 224 L96 224 L96 198 L144 198 L144 224 L160 224 L172 188 Z"
            fill="#282C34"
            stroke="#121418"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />

          {/* Rugged textured rectangular Frontier pushers */}
          <g transform="rotate(-25 120 120)">
            <rect
              x="199"
              y="107"
              width="10"
              height="26"
              rx="2.5"
              fill="#333842"
              stroke="#121418"
              strokeWidth="1.5"
            />
            <line x1="205" y1="112" x2="205" y2="128" stroke="#525866" strokeWidth="1.5" />
          </g>
          <g transform="rotate(25 120 120)">
            <rect
              x="199"
              y="107"
              width="10"
              height="26"
              rx="2.5"
              fill="#333842"
              stroke="#121418"
              strokeWidth="1.5"
            />
            <line x1="205" y1="112" x2="205" y2="128" stroke="#525866" strokeWidth="1.5" />
          </g>

          {/* Dark matte Frontier steel case */}
          <circle
            cx="120"
            cy="120"
            r="84"
            fill="#262A32"
            stroke="#111318"
            strokeWidth="2"
          />

          {/* Distinctive serrated gear bezel notches */}
          {GEAR_NOTCHES_36.map((deg) => (
            <rect
              key={`notch-${deg}`}
              x="117.5"
              y="35"
              width="5"
              height="7"
              rx="1.2"
              fill="#1B1E24"
              stroke="#101216"
              strokeWidth="0.8"
              transform={`rotate(${deg} 120 120)`}
            />
          ))}

          {/* Rugged matte black rotating bezel */}
          <circle cx="120" cy="120" r="79" fill="#17191E" stroke="#303540" strokeWidth="1.5" />

          {/* Sharp bezel ticks + red 12 o'clock accent triangle */}
          <polygon points="120,44 116.5,50 123.5,50" fill="#EF4444" />
          {MINUTE_ANGLES_60.filter((d) => d !== 0).map((deg) => {
            const isFive = deg % 30 === 0;
            return (
              <line
                key={`s3f-${deg}`}
                x1="120"
                y1={isFive ? 44.5 : 46}
                x2="120"
                y2={isFive ? 51 : 49}
                stroke={isFive ? '#E2E8F0' : '#475569'}
                strokeWidth={isFive ? '2' : '1'}
                strokeLinecap="round"
                transform={`rotate(${deg} 120 120)`}
              />
            );
          })}

          {/* Inner Frontier bezel ring */}
          <circle cx="120" cy="120" r="67.5" fill="#07090E" stroke="#2D323D" strokeWidth="1.5" />
        </g>
      )}

      {/* Mini preview AMOLED screen graphic */}
      {isMini && (
        <g>
          <circle cx="120" cy="120" r="64" fill="#06080E" />
          <circle
            cx="120"
            cy="120"
            r="56"
            fill="none"
            stroke="rgba(168,192,255,0.22)"
            strokeWidth="1.5"
            strokeDasharray="3 4"
          />
          <text
            x="120"
            y="126"
            textAnchor="middle"
            fill="#F8FAFC"
            fontSize="24"
            fontWeight="700"
            fontFamily="sans-serif"
          >
            10:09
          </text>
          <text
            x="120"
            y="146"
            textAnchor="middle"
            fill="#94A3B8"
            fontSize="10"
            fontWeight="600"
            fontFamily="monospace"
          >
            TIZEN
          </text>
        </g>
      )}
    </svg>
  );

  if (isMini) {
    return svgContent;
  }

  return (
    <div className="relative flex h-[240px] w-[240px] items-center justify-center">
      {svgContent}
      {/* Centered Circular AMOLED Screen Aperture */}
      <div className="hero-watch-screen relative z-10 flex h-[134px] w-[134px] flex-col items-center justify-center overflow-hidden rounded-full bg-[#05070C] text-center shadow-[inset_0_2px_8px_rgba(0,0,0,0.85)]">
        {children}
      </div>
    </div>
  );
}
