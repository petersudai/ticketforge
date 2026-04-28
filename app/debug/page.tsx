"use client";

import { useEffect, useState } from "react";

export default function DebugPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const url  = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const info: any = {
      supabaseUrl:      url || "⚠️ MISSING",
      anonKeyPresent:   Boolean(anon),
      anonKeyPrefix:    anon ? anon.slice(0, 12) + "..." : "⚠️ MISSING",
      anonKeyIsEyJ:     anon?.startsWith("eyJ") ?? false,
      anonKeyLength:    anon?.length ?? 0,
      googleEnabled:    process.env.NEXT_PUBLIC_GOOGLE_ENABLED,
      appUrl:           process.env.NEXT_PUBLIC_APP_URL,
    };

    // Try to actually reach Supabase
    if (url && anon && anon.startsWith("eyJ")) {
      fetch(`${url}/auth/v1/health`, {
        headers: { apikey: anon },
      })
        .then(r => r.json())
        .then(data => {
          setResult({ ...info, supabaseReachable: true, supabaseHealth: data });
        })
        .catch(err => {
          setResult({ ...info, supabaseReachable: false, fetchError: err.message });
        })
        .finally(() => setLoading(false));
    } else {
      setResult({ ...info, supabaseReachable: false, reason: "URL or anon key missing or wrong format" });
      setLoading(false);
    }
  }, []);

  return (
    <div style={{ padding: 32, fontFamily: "monospace", background: "#0a0a0f", minHeight: "100vh", color: "#f0f0f8" }}>
      <h1 style={{ fontSize: 20, marginBottom: 16, color: "#a29cf4" }}>TicketForge — Auth Debug</h1>
      <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 24 }}>
        Only visible at /debug — remove this page before going to production.
      </p>

      {loading && <p style={{ color: "#fdcb6e" }}>Checking Supabase connection…</p>}

      {result && (
        <div>
          {Object.entries(result).map(([key, value]) => {
            const isOk = value === true || (typeof value === "string" && !value.startsWith("⚠️"));
            const isWarn = value === false || (typeof value === "string" && value.startsWith("⚠️"));
            return (
              <div key={key} style={{ display: "flex", gap: 16, marginBottom: 8, padding: "6px 10px", borderRadius: 6, background: isWarn ? "rgba(214,48,49,0.1)" : "rgba(255,255,255,0.04)" }}>
                <span style={{ color: "rgba(255,255,255,0.4)", minWidth: 200 }}>{key}:</span>
                <span style={{ color: isWarn ? "#ff7675" : "#55efc4", wordBreak: "break-all" }}>
                  {typeof value === "object" ? JSON.stringify(value, null, 2) : String(value)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ marginTop: 32, padding: "12px 16px", borderRadius: 8, background: "rgba(108,92,231,0.1)", border: "1px solid rgba(108,92,231,0.2)" }}>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 8 }}>What to check:</p>
        <ul style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", paddingLeft: 16, lineHeight: 2 }}>
          <li>anonKeyIsEyJ should be <strong style={{ color: "#55efc4" }}>true</strong> — if false, you have the wrong key in .env.local</li>
          <li>anonKeyLength should be <strong style={{ color: "#55efc4" }}>200+ characters</strong> — shorter means wrong key</li>
          <li>supabaseReachable should be <strong style={{ color: "#55efc4" }}>true</strong> — if false, CORS or network issue</li>
          <li>supabaseUrl should show your project URL, not the placeholder</li>
        </ul>
      </div>

      <div style={{ marginTop: 16 }}>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 8 }}>Fix for CORS / "Failed to fetch":</p>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", lineHeight: 1.8 }}>
          Supabase dashboard → Authentication → URL Configuration<br />
          Site URL: <strong style={{ color: "#fff" }}>http://localhost:3000</strong><br />
          Redirect URLs: add <strong style={{ color: "#fff" }}>http://localhost:3000/**</strong>
        </p>
      </div>
    </div>
  );
}
