"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useEvents } from "@/lib/hooks/useEvents";
import { useScans } from "@/lib/hooks/useScans";
import { parseQRString } from "@/lib/qr";

export default function ScannerPage() {
  const { events } = useEvents();
  const [evId, setEvId] = useState("");

  // Once events load, default to first event
  useEffect(() => {
    if (events.length > 0 && !evId) setEvId(events[0].id);
  }, [events, evId]);

  const { scans, refetch: refetchScans } = useScans(evId || null);
  const recentScans = scans.slice(0, 7);

  const [manualId,        setManualId]        = useState("");
  const [result,          setResult]          = useState<{ type: "idle"|"valid"|"invalid"|"dup"; icon: string; name: string; info: string }>({
    type: "idle", icon: "—", name: "Waiting for scan…", info: "Point camera at QR code or enter ticket ID below",
  });
  const [camActive,       setCamActive]       = useState(false);
  const [showPin,         setShowPin]         = useState(false);
  const [pinVal,          setPinVal]          = useState("");
  const [pinError,        setPinError]        = useState("");
  const [pinAttempts,     setPinAttempts]     = useState(0);
  const [pinLocked,       setPinLocked]       = useState(false);
  const [pendingOverride, setPendingOverride] = useState<string | null>(null);

  const videoRef    = useRef<HTMLVideoElement>(null);
  const streamRef   = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const event     = events.find(e => e.id === evId) ?? null;
  const checkedIn = recentScans.filter(s => s.result === "valid" || s.result === "override").length;
  const total     = event?.attendees?.length ?? 0;
  const rate      = total > 0 ? Math.round((checkedIn / total) * 100) : 0;

  const setResultState = (type: typeof result.type, icon: string, name: string, info: string) => {
    setResult({ type, icon, name, info });
    setTimeout(() => setResult({
      type: "idle", icon: "—", name: "Waiting for scan…", info: "Point camera at QR code or enter ticket ID below",
    }), 3500);
  };

  const verify = useCallback(async (ticketId: string, override = false) => {
    if (!evId) { setResultState("invalid", "✕", "No event selected", "Select an event before scanning"); return; }

    try {
      const res = await fetch("/api/scan", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ ticketId, eventId: evId, override }),
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok) {
        setResultState("invalid", "✕", "Error", data.error ?? "Scan failed");
        return;
      }

      if (data.result === "invalid") {
        setResultState("invalid", "✕", "Invalid ticket", `ID: ${ticketId} — not found`);
      } else if (data.result === "duplicate") {
        setResultState("dup", "⚠", data.attendee?.name ?? "Already checked in", "Tap Override PIN to force entry");
        setPendingOverride(ticketId);
      } else {
        const cap = data.attendee?.capacity ?? 1;
        const admitsLabel = cap > 1 ? ` · Admits ${cap} people` : "";
        setResultState("valid", "✓",
          data.attendee?.name ?? "Valid",
          `${data.attendee?.tier ?? ""} · Seat: ${data.attendee?.seat ?? "—"}${admitsLabel} · Welcome!`
        );
        setPendingOverride(null);
        refetchScans();
      }
    } catch {
      setResultState("invalid", "✕", "Network error", "Check connection and try again");
    }
  }, [evId, refetchScans]);

  const startCam = async () => {
    if (!navigator.mediaDevices) { alert("Camera not available. Use manual entry."); return; }
    if (!evId) { alert("Select an event first"); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.style.display = "block"; }
      setCamActive(true);
      intervalRef.current = setInterval(() => {
        if (!videoRef.current) return;
        const canvas = document.createElement("canvas");
        canvas.width  = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(videoRef.current, 0, 0);
        import("jsqr").then(({ default: jsQR }) => {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code?.data) {
            const parsed = parseQRString(code.data);
            verify(parsed.isValid ? parsed.ticketId! : code.data);
          }
        }).catch(() => {});
      }, 800);
    } catch { alert("Camera permission denied. Use manual entry."); }
  };

  const stopCam = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.style.display = "none";
    if (intervalRef.current) clearInterval(intervalRef.current);
    setCamActive(false);
  };

  const handleManual = () => {
    const id = manualId.trim();
    if (!id) return;
    verify(id);
    setManualId("");
  };

  const pinKey = (k: string) => {
    if (pinLocked) return;
    if (k === "cancel") { setShowPin(false); setPinVal(""); setPinError(""); return; }
    if (k === "del") { setPinVal(v => v.slice(0, -1)); return; }
    if (pinVal.length >= 4) return;

    const next = pinVal + k;
    setPinVal(next);

    if (next.length === 4) {
      setTimeout(async () => {
        try {
          const res = await fetch("/api/scan/verify-pin", {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ pin: next, eventId: evId }),
            credentials: "include",
          });
          const data = await res.json();

          if (data.valid) {
            setShowPin(false);
            setPinVal("");
            setPinError("");
            if (pendingOverride) {
              await verify(pendingOverride, true);
              setPendingOverride(null);
            }
          } else {
            const attempts = pinAttempts + 1;
            setPinAttempts(attempts);
            setPinError(attempts >= 3 ? "Too many attempts — wait 30 seconds" : "Incorrect PIN");
            if (attempts >= 3) {
              setPinLocked(true);
              setTimeout(() => { setPinLocked(false); setPinAttempts(0); setPinError(""); }, 30000);
            }
            setTimeout(() => setPinVal(""), 600);
          }
        } catch {
          setPinError("Network error — try again");
          setTimeout(() => setPinVal(""), 600);
        }
      }, 150);
    }
  };

  const resultColors: Record<string, string> = { valid: "#00b894", invalid: "#d63031", dup: "#e17055", idle: "transparent" };
  const resultBg:     Record<string, string> = { valid: "rgba(0,184,148,0.1)", invalid: "rgba(214,48,49,0.1)", dup: "rgba(225,112,85,0.12)", idle: "rgba(255,255,255,0.03)" };

  return (
    <div className="min-h-screen flex flex-col items-center py-8 gap-5" style={{ background: "#06060e" }}>
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-[9px] flex items-center justify-center" style={{ background: "#6C5CE7" }}>
            <svg viewBox="0 0 18 18" fill="none" style={{ width: 16, height: 16 }}>
              <rect x="1.5" y="4" width="15" height="10" rx="2.5" stroke="white" strokeWidth="1.5"/>
              <path d="M1.5 8h15" stroke="white" strokeWidth="1.5"/>
              <circle cx="13" cy="11.5" r="1.8" fill="white"/>
            </svg>
          </div>
          <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 700, color: "#fff" }}>Gate Scanner</h1>
          <button
            onClick={() => setShowPin(true)}
            style={{ fontSize: 10, padding: "4px 10px", borderRadius: 6, background: "rgba(225,112,85,0.15)", color: "#fab1a0", border: "1px solid rgba(225,112,85,0.2)", cursor: "pointer" }}
          >
            Override PIN
          </button>
        </div>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>Scan attendee QR codes for entry verification</p>

        <select
          value={evId}
          onChange={e => setEvId(e.target.value)}
          style={{ marginTop: 12, padding: "7px 14px", borderRadius: 10, fontSize: 12, background: "rgba(255,255,255,0.06)", color: "#fff", border: "1px solid rgba(255,255,255,0.12)", outline: "none" }}
        >
          {events.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>

        <div style={{ display: "flex", gap: 24, justifyContent: "center", marginTop: 14 }}>
          {[
            { label: "Checked in", val: checkedIn },
            { label: "Expected",   val: total },
            { label: "Rate",       val: `${rate}%` },
          ].map(({ label, val }) => (
            <div key={label} style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 24, fontWeight: 700, color: "#fff" }}>{val}</div>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Viewport */}
      <div style={{ width: 260, height: 260, borderRadius: 16, overflow: "hidden", position: "relative", background: "#0e0e1a", border: "1.5px solid rgba(108,92,231,0.35)" }}>
        {[
          { top: 8, left: 8, borderWidth: "2px 0 0 2px", borderRadius: "4px 0 0 0" },
          { bottom: 8, right: 8, borderWidth: "0 2px 2px 0", borderRadius: "0 0 4px 0" },
        ].map((s, i) => (
          <div key={i} style={{ position: "absolute", width: 22, height: 22, borderColor: "#8B7FF0", borderStyle: "solid", ...s as any }} />
        ))}
        <div style={{ position: "absolute", left: 8, right: 8, height: 1.5, background: "linear-gradient(90deg,transparent,#8B7FF0,transparent)", zIndex: 2, animation: "scan 2.2s ease-in-out infinite alternate" }} />
        <style>{`@keyframes scan{0%{top:8%}100%{top:88%}}`}</style>
        <video ref={videoRef} autoPlay playsInline muted style={{ width: "100%", height: "100%", objectFit: "cover", display: "none" }} />
        {!camActive && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 8, color: "rgba(255,255,255,0.3)", fontSize: 11, textAlign: "center", padding: 16 }}>
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <rect x="2"  y="2"  width="12" height="12" rx="2" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5"/>
              <rect x="22" y="2"  width="12" height="12" rx="2" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5"/>
              <rect x="2"  y="22" width="12" height="12" rx="2" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5"/>
              <rect x="5"  y="5"  width="5" height="5" fill="rgba(255,255,255,0.2)"/>
              <rect x="25" y="5"  width="5" height="5" fill="rgba(255,255,255,0.2)"/>
              <rect x="5"  y="25" width="5" height="5" fill="rgba(255,255,255,0.2)"/>
              <rect x="22" y="22" width="12" height="12" rx="2" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5"/>
              <rect x="25" y="25" width="5" height="5" fill="rgba(255,255,255,0.2)"/>
            </svg>
            <span>Start camera or enter ticket ID below</span>
          </div>
        )}
      </div>

      {/* Camera controls */}
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={startCam} style={{ padding: "8px 16px", borderRadius: 10, fontSize: 12, fontWeight: 500, background: "#6C5CE7", color: "#fff", border: "none", cursor: "pointer" }}>Start camera</button>
        <button onClick={stopCam}  style={{ padding: "8px 16px", borderRadius: 10, fontSize: 12, fontWeight: 500, background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.12)", cursor: "pointer" }}>Stop</button>
      </div>

      {/* Result */}
      <div style={{ width: 260, borderRadius: 14, padding: "1.25rem", textAlign: "center", transition: "all 0.35s", background: resultBg[result.type], border: `1.5px solid ${resultColors[result.type]}` }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>{result.icon}</div>
        <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 4 }}>{result.name}</div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>{result.info}</div>
      </div>

      {/* Manual entry */}
      <div style={{ display: "flex", gap: 8, width: "100%", maxWidth: 420 }}>
        <input
          value={manualId}
          onChange={e => setManualId(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleManual()}
          placeholder="Ticket ID — e.g. TF-ABCD-123456"
          style={{ flex: 1, padding: "8px 12px", borderRadius: 10, fontSize: 12, background: "rgba(255,255,255,0.05)", color: "#fff", border: "1px solid rgba(255,255,255,0.12)", outline: "none" }}
        />
        <button onClick={handleManual} style={{ padding: "8px 16px", borderRadius: 10, fontSize: 12, fontWeight: 500, background: "#6C5CE7", color: "#fff", border: "none", cursor: "pointer" }}>Verify</button>
      </div>

      {/* Scan log */}
      <div style={{ width: "100%", maxWidth: 420, background: "rgba(255,255,255,0.03)", borderRadius: 14, border: "1px solid rgba(255,255,255,0.07)", overflow: "hidden" }}>
        <div style={{ padding: "9px 14px", fontSize: 10, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid rgba(255,255,255,0.06)", fontFamily: "'Syne',sans-serif" }}>Recent scans</div>
        {recentScans.length === 0 ? (
          <div style={{ padding: "12px 14px", fontSize: 11, color: "rgba(255,255,255,0.2)" }}>No scans yet</div>
        ) : recentScans.map((s, i) => {
          const c = s.result === "valid" || s.result === "override" ? "#00b894" : s.result === "duplicate" ? "#e17055" : "#d63031";
          return (
            <div key={i} style={{ padding: "8px 14px", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: c, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.8)" }}>{s.attendeeName || s.ticketId}</div>
                <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", marginTop: 1 }}>{new Date(s.scannedAt).toLocaleTimeString()} · {s.attendeeTier || "—"}</div>
              </div>
              <span style={{ fontSize: 9, color: c, fontWeight: 600, textTransform: "capitalize" }}>{s.result}</span>
            </div>
          );
        })}
      </div>

      {/* PIN overlay */}
      {showPin && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(8px)" }}>
          <div style={{ background: "#0e0e1a", border: "1px solid rgba(108,92,231,0.3)", borderRadius: 20, padding: "2rem", width: 290, textAlign: "center" }}>
            <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 6 }}>Override PIN</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginBottom: "1.5rem" }}>Enter your 4-digit admin PIN</div>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", marginBottom: "1.5rem" }}>
              {[0, 1, 2, 3].map(i => (
                <div key={i} style={{ width: 13, height: 13, borderRadius: "50%", border: `1.5px solid ${i < pinVal.length ? "#8B7FF0" : "rgba(255,255,255,0.2)"}`, background: i < pinVal.length ? "#8B7FF0" : "transparent", transition: "all 0.15s" }} />
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 9, marginBottom: 8 }}>
              {["1","2","3","4","5","6","7","8","9","cancel","0","del"].map(k => (
                <button
                  key={k}
                  onClick={() => pinKey(k)}
                  disabled={pinLocked}
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, color: "#fff", fontSize: k === "cancel" || k === "del" ? 11 : 18, padding: 15, cursor: "pointer", transition: "all 0.15s", opacity: pinLocked ? 0.4 : 1 }}
                >
                  {k === "del" ? "⌫" : k}
                </button>
              ))}
            </div>
            {pinError && <div style={{ color: "#ff7675", fontSize: 11, marginTop: 8 }}>{pinError}</div>}
          </div>
        </div>
      )}
    </div>
  );
}
