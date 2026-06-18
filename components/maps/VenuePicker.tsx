"use client";

/**
 * components/maps/VenuePicker.tsx
 *
 * Lets an organiser set the event's map location. Used on the create/edit
 * event forms, below the existing "Venue" text input (which it does NOT
 * replace — it only captures coordinates).
 *
 * Flow (free + Nominatim-policy-compliant):
 *   1. Organiser types the venue name in the form's Venue field.
 *   2. Clicks "Find on map" → ONE Nominatim geocode request (not per
 *      keystroke — per-keystroke autocomplete violates Nominatim's free
 *      usage policy). Map centres and drops a draggable pin.
 *   3. Organiser can drag the pin (or click the map) to fine-tune the spot.
 *   4. "Clear" removes the location.
 *
 * Coordinates flow back to the form via onCoordsChange. The venue text is
 * owned by the form, not here.
 *
 * SSR-safe (Leaflet dynamic-imported inside effects). Custom SVG pin avoids
 * the broken default-marker-image issue.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import "leaflet/dist/leaflet.css";

interface VenuePickerProps {
  /** Current venue text from the form (used as the geocode query). */
  venue:        string;
  latitude:     number | null;
  longitude:    number | null;
  onCoordsChange: (coords: { latitude: number | null; longitude: number | null }) => void;
  accent?:      string;
}

// Sensible default view when no location is set yet (Nairobi, Kenya).
const DEFAULT_CENTER: [number, number] = [-1.2921, 36.8219];
const DEFAULT_ZOOM = 6;

function pinSvg(accent: string): string {
  return `
    <svg width="30" height="42" viewBox="0 0 30 42" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 3px 4px rgba(0,0,0,0.4))">
      <path d="M15 0C6.7 0 0 6.7 0 15c0 10.5 15 27 15 27s15-16.5 15-27C30 6.7 23.3 0 15 0z" fill="${accent}"/>
      <circle cx="15" cy="15" r="5.5" fill="#fff"/>
    </svg>`;
}

export function VenuePicker({
  venue, latitude, longitude, onCoordsChange, accent = "#6C5CE7",
}: VenuePickerProps) {
  const elRef     = useRef<HTMLDivElement>(null);
  const mapRef    = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const LRef      = useRef<any>(null);
  const iconRef   = useRef<any>(null);

  const [searching, setSearching] = useState(false);
  const [error,     setError]     = useState("");
  // Latest callback in a ref so the once-only init effect always calls fresh state setters.
  const onCoordsRef = useRef(onCoordsChange);
  onCoordsRef.current = onCoordsChange;

  // Place or move the draggable marker, and report coords upward.
  const placeMarker = useCallback((lat: number, lng: number, report = true) => {
    const L = LRef.current;
    const map = mapRef.current;
    if (!L || !map) return;

    if (!markerRef.current) {
      markerRef.current = L.marker([lat, lng], {
        icon: iconRef.current,
        draggable: true,
        keyboard: false,
      }).addTo(map);
      markerRef.current.on("dragend", () => {
        const p = markerRef.current.getLatLng();
        onCoordsRef.current({ latitude: +p.lat.toFixed(6), longitude: +p.lng.toFixed(6) });
      });
    } else {
      markerRef.current.setLatLng([lat, lng]);
    }
    if (report) onCoordsRef.current({ latitude: +lat.toFixed(6), longitude: +lng.toFixed(6) });
  }, []);

  // ── Init map once ────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const Lmod: any = await import("leaflet");
      const L = Lmod.default ?? Lmod;
      if (cancelled || !elRef.current || mapRef.current) return;
      LRef.current = L;
      iconRef.current = L.divIcon({ className: "", html: pinSvg(accent), iconSize: [30, 42], iconAnchor: [15, 42] });

      const hasCoords = latitude != null && longitude != null;
      const map = L.map(elRef.current, {
        center: hasCoords ? [latitude!, longitude!] : DEFAULT_CENTER,
        zoom:   hasCoords ? 15 : DEFAULT_ZOOM,
        scrollWheelZoom: false,
        zoomControl: true,
      });
      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      // Click the map to place/move the pin.
      map.on("click", (e: any) => placeMarker(e.latlng.lat, e.latlng.lng));

      if (hasCoords) placeMarker(latitude!, longitude!, false);

      setTimeout(() => { if (!cancelled && mapRef.current) mapRef.current.invalidateSize(); }, 200);
    })();

    return () => {
      cancelled = true;
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; markerRef.current = null; }
    };
    // Init once. Coord prop changes after mount are driven by user interaction
    // here, so we deliberately don't re-init on lat/lng change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Geocode the current venue text (one request, on demand) ───────────
  const handleFind = async () => {
    const q = venue.trim();
    if (!q) { setError("Type a venue name above first, then search."); return; }
    setError("");
    setSearching(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`;
      const res = await fetch(url, { headers: { "Accept-Language": "en" } });
      if (!res.ok) throw new Error(`status ${res.status}`);
      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) {
        setError("Couldn't find that venue. Try a fuller name, or drop the pin manually on the map.");
        return;
      }
      const lat = parseFloat(data[0].lat);
      const lng = parseFloat(data[0].lon);
      mapRef.current?.setView([lat, lng], 16);
      placeMarker(lat, lng);
    } catch {
      setError("Map search is unavailable right now. You can still drop the pin manually.");
    } finally {
      setSearching(false);
    }
  };

  const handleClear = () => {
    if (markerRef.current && mapRef.current) {
      mapRef.current.removeLayer(markerRef.current);
      markerRef.current = null;
    }
    mapRef.current?.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
    setError("");
    onCoordsChange({ latitude: null, longitude: null });
  };

  const hasCoords = latitude != null && longitude != null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <button
          type="button"
          onClick={handleFind}
          disabled={searching}
          className="text-[12px] font-semibold px-3 py-1.5 rounded-lg bg-brand-500/15 text-brand-300 border border-brand-500/25 hover:bg-brand-500/25 transition-colors disabled:opacity-50"
        >
          {searching ? "Searching…" : "Find on map"}
        </button>
        {hasCoords && (
          <button
            type="button"
            onClick={handleClear}
            className="text-[12px] font-medium px-3 py-1.5 rounded-lg text-white/55 hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            Clear location
          </button>
        )}
        <span className="text-[11px] text-white/40 ml-auto hidden sm:block">
          {hasCoords ? "Drag the pin to fine-tune" : "Optional: pin the exact spot"}
        </span>
      </div>

      <div
        ref={elRef}
        style={{ height: 220, width: "100%", borderRadius: 12, overflow: "hidden", position: "relative", zIndex: 0, background: "#0f0f16", border: "1px solid rgba(255,255,255,0.08)" }}
      />

      {error && <p className="text-[11px] text-amber-400 mt-2">{error}</p>}
      {hasCoords && (
        <p className="text-[11px] text-white/40 mt-2 font-mono">
          📍 {latitude!.toFixed(5)}, {longitude!.toFixed(5)}
        </p>
      )}
    </div>
  );
}
