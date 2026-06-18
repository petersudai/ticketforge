"use client";

/**
 * components/maps/EventMap.tsx
 *
 * Read-only map for the public event page. Shows a pin at the venue's
 * coordinates with a "Get directions" link.
 *
 * Free stack: Leaflet + OpenStreetMap tiles. No API key.
 *
 * SSR safety: Leaflet touches `window` at import time, so we dynamic-import
 * it INSIDE the effect (client-only). The CSS import at the top is a build-
 * time side effect and is SSR-safe.
 *
 * UX choices:
 *   • scrollWheelZoom is OFF so the map never hijacks page scrolling on a
 *     long event page (especially important on mobile). Users can still use
 *     the +/- buttons and pinch-zoom.
 *   • Custom SVG "pin" divIcon, brand/accent coloured. Avoids Leaflet's
 *     well-known broken default-marker-image problem under bundlers.
 */

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

interface EventMapProps {
  lat:        number;
  lng:        number;
  /** Venue label, used for the directions link text / aria. */
  venue?:     string;
  accent?:    string;
  /** Map height in px. */
  height?:    number;
  className?: string;
}

function pinSvg(accent: string): string {
  return `
    <svg width="30" height="42" viewBox="0 0 30 42" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 3px 4px rgba(0,0,0,0.4))">
      <path d="M15 0C6.7 0 0 6.7 0 15c0 10.5 15 27 15 27s15-16.5 15-27C30 6.7 23.3 0 15 0z" fill="${accent}"/>
      <circle cx="15" cy="15" r="5.5" fill="#fff"/>
    </svg>`;
}

export function EventMap({
  lat, lng, venue, accent = "#6C5CE7", height = 240, className = "",
}: EventMapProps) {
  const elRef  = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const Lmod: any = await import("leaflet");
      const L = Lmod.default ?? Lmod;
      if (cancelled || !elRef.current || mapRef.current) return;

      const map = L.map(elRef.current, {
        center: [lat, lng],
        zoom: 15,
        scrollWheelZoom: false,
        zoomControl: true,
        attributionControl: true,
      });
      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      const icon = L.divIcon({
        className: "",
        html: pinSvg(accent),
        iconSize:   [30, 42],
        iconAnchor: [15, 42],
      });
      L.marker([lat, lng], { icon, keyboard: false }).addTo(map);

      // Leaflet sometimes mis-measures the container if it mounts while the
      // parent is animating/hidden. A deferred invalidateSize fixes tile gaps.
      setTimeout(() => { if (!cancelled && mapRef.current) mapRef.current.invalidateSize(); }, 200);
    })();

    return () => {
      cancelled = true;
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, [lat, lng, accent]);

  // Universal maps link: opens Google Maps on Android/desktop, Apple Maps on iOS.
  const directionsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

  return (
    <div className={className}>
      <div
        ref={elRef}
        role="img"
        aria-label={venue ? `Map showing ${venue}` : "Event location map"}
        style={{ height, width: "100%", borderRadius: 14, overflow: "hidden", position: "relative", zIndex: 0, background: "#0f0f16" }}
      />
      <a
        href={directionsUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "inline-flex", alignItems: "center", gap: 6, marginTop: 10,
          fontSize: 13, color: accent, fontWeight: 600, textDecoration: "none",
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
        </svg>
        Get directions
      </a>
    </div>
  );
}
