// src/pages/Admin.jsx
import React, { useState } from "react";
import { addUploadedPuzzle, getUploadedPuzzles } from "../data/store";

// Minimal JSON textarea → object helper
function safeParse(json) {
  try {
    const obj = JSON.parse(json);
    return { ok: true, value: obj };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

export default function Admin() {
  const [uploaded, setUploaded] = useState(getUploadedPuzzles());
  const [status, setStatus] = useState("");

  // Optional: quick paste area for manual JSON (in addition to file upload)
  const [jsonText, setJsonText] = useState(
    '{\n  "title": "Untitled",\n  "size": 5,\n  "grid": [],\n  "clues": { "across": {}, "down": {} },\n  "author": ""\n}'
  );

  async function handleFileUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!data.title || !data.grid || !data.clues) {
        setStatus("❌ Invalid puzzle format (need title, grid, clues)");
        return;
      }

      addUploadedPuzzle({ ...data, uploadedAt: new Date().toISOString() });
      setUploaded(getUploadedPuzzles());
      setStatus("✅ Uploaded successfully");
    } catch (e) {
      console.error(e);
      setStatus("❌ Error parsing file");
    }
  }

  function handlePasteSave() {
    const parsed = safeParse(jsonText);
    if (!parsed.ok) {
      setStatus(`❌ JSON error: ${parsed.error}`);
      return;
    }
    const data = parsed.value;
    if (!data.title || !data.grid || !data.clues) {
      setStatus("❌ Invalid puzzle format (need title, grid, clues)");
      return;
    }
    addUploadedPuzzle({ ...data, uploadedAt: new Date().toISOString() });
    setUploaded(getUploadedPuzzles());
    setStatus("✅ Saved pasted JSON");
  }

  function handleClearAll() {
    if (!window.confirm("Clear all locally uploaded puzzles?")) return;
    localStorage.removeItem("uploadedPuzzles");
    setUploaded([]);
    setStatus("🧹 Cleared local uploads");
  }

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: 16 }}>
      <h1 style={{ marginTop: 0 }}>Admin (Local Uploads)</h1>

      {status && (
        <div
          style={{
            background: "#F8FAFF",
            border: "1px solid #DCE7FF",
            padding: 10,
            borderRadius: 8,
            marginBottom: 12,
          }}
        >
          {status}
        </div>
      )}

      {/* File upload */}
      <section
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 8,
          padding: 16,
          marginBottom: 16,
        }}
      >
        <h2 style={{ marginTop: 0 }}>Upload .json file</h2>
        <input type="file" accept=".json" onChange={handleFileUpload} />
      </section>

      {/* Paste JSON */}
      <section
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 8,
          padding: 16,
          marginBottom: 16,
        }}
      >
        <h2 style={{ marginTop: 0 }}>Or paste puzzle JSON</h2>
        <textarea
          value={jsonText}
          onChange={(e) => setJsonText(e.target.value)}
          rows={10}
          spellCheck={false}
          style={{
            width: "100%",
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            padding: 10,
            border: "1px solid #d1d5db",
            borderRadius: 6,
          }}
        />
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <button
            type="button"
            onClick={handlePasteSave}
            style={{
              padding: "8px 12px",
              borderRadius: 6,
              border: "1px solid #d1d5db",
              background: "#f9fafb",
            }}
          >
            Save pasted JSON
          </button>
          <button
            type="button"
            onClick={handleClearAll}
            style={{
              padding: "8px 12px",
              borderRadius: 6,
              border: "1px solid #d1d5db",
              background: "white",
            }}
          >
            Clear local uploads
          </button>
        </div>
      </section>

      {/* Uploaded list */}
      <section
        style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 16 }}
      >
        <h2 style={{ marginTop: 0 }}>Uploaded Puzzles</h2>
        {uploaded.length === 0 ? (
          <div>No local uploads yet.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid #eee" }}>
                <th style={{ padding: 8 }}>Title</th>
                <th style={{ padding: 8 }}>Uploaded</th>
                <th style={{ padding: 8 }}>Size</th>
              </tr>
            </thead>
            <tbody>
              {uploaded.map((p, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #f2f2f2" }}>
                  <td style={{ padding: 8 }}>{p.title || "—"}</td>
                  <td style={{ padding: 8 }}>
                    {p.uploadedAt ? p.uploadedAt.slice(0, 10) : "—"}
                  </td>
                  <td style={{ padding: 8 }}>{p.size ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
