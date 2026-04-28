/**
 * QR code generation utilities
 * Server-side: uses `qrcode` npm package
 * Client-side: uses canvas directly
 */

/**
 * Generate a QR code as a data URL (PNG) — works server + client side
 * Encoded data: TICKETFORGE|ID:{ticketId}|EVENT:{name}|ATTENDEE:{name}|DATE:{date}
 */
export async function generateQRDataURL(ticketId: string, eventName: string, attendeeName: string, eventDate: string): Promise<string> {
  const data = `TICKETFORGE|ID:${ticketId}|EVENT:${eventName}|ATTENDEE:${attendeeName}|DATE:${eventDate}`;

  try {
    const QRCode = await import("qrcode");
    return await QRCode.default.toDataURL(data, {
      width: 200,
      margin: 1,
      color: {
        dark: "#1a1a2e",
        light: "#ffffff",
      },
      errorCorrectionLevel: "M",
    });
  } catch {
    // Fallback: return a placeholder if qrcode isn't available
    return generateFallbackQR(data);
  }
}

/**
 * Draw QR code onto a canvas element (client-side only)
 */
export function drawQROnCanvas(
  canvas: HTMLCanvasElement,
  ticketId: string,
  eventName: string,
  attendeeName: string,
  eventDate: string,
  size = 100
): void {
  const data = `TICKETFORGE|ID:${ticketId}|EVENT:${eventName}|ATTENDEE:${attendeeName}|DATE:${eventDate}`;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Try to use the qrcode library if available
  import("qrcode").then(QRCode => {
    QRCode.default.toCanvas(canvas, data, {
      width: size,
      margin: 1,
      color: { dark: "#1a1a2e", light: "#ffffff" },
      errorCorrectionLevel: "M",
    });
  }).catch(() => {
    // Draw a placeholder grid pattern
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = "#1a1a2e";
    const cellSize = size / 21;
    // Draw simple finder pattern corners
    const drawFinder = (x: number, y: number) => {
      ctx.fillRect(x * cellSize, y * cellSize, cellSize * 7, cellSize * 7);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect((x + 1) * cellSize, (y + 1) * cellSize, cellSize * 5, cellSize * 5);
      ctx.fillStyle = "#1a1a2e";
      ctx.fillRect((x + 2) * cellSize, (y + 2) * cellSize, cellSize * 3, cellSize * 3);
    };
    drawFinder(0, 0);
    drawFinder(14, 0);
    drawFinder(0, 14);
    // Add some random data cells for visual effect
    for (let r = 0; r < 21; r++) {
      for (let c = 0; c < 21; c++) {
        if (Math.random() > 0.6) {
          ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize);
        }
      }
    }
  });
}

/** Simple SVG-based fallback QR placeholder */
function generateFallbackQR(data: string): string {
  const cells: boolean[][] = Array.from({ length: 21 }, (_, r) =>
    Array.from({ length: 21 }, (_, c) => {
      // Hash the data to get consistent cells
      const hash = [...data].reduce((h, ch, i) => h ^ (ch.charCodeAt(0) * (r + 1) * (c + 1) * (i + 1)), 0);
      return Math.abs(hash) % 2 === 0;
    })
  );
  const cellSize = 10;
  const size = 21 * cellSize;
  const rects = cells.flatMap((row, r) =>
    row.map((dark, c) =>
      dark ? `<rect x="${c * cellSize}" y="${r * cellSize}" width="${cellSize}" height="${cellSize}" fill="#1a1a2e"/>` : ""
    )
  ).join("");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" fill="white"/>${rects}</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

/**
 * Build the QR string for a ticket (standardized format)
 */
export function buildQRString(ticketId: string, eventName: string, attendeeName: string, eventDate: string): string {
  return `TICKETFORGE|ID:${ticketId}|EVENT:${eventName}|ATTENDEE:${attendeeName}|DATE:${eventDate}`;
}

/**
 * Parse a scanned QR string back to its parts
 */
export function parseQRString(qrData: string): {
  ticketId: string | null;
  eventName: string | null;
  attendeeName: string | null;
  date: string | null;
  isValid: boolean;
} {
  const parts: Record<string, string> = {};
  qrData.split("|").forEach(segment => {
    const [key, ...rest] = segment.split(":");
    if (key && rest.length) parts[key.trim()] = rest.join(":").trim();
  });

  const ticketId = parts["ID"] || null;
  return {
    ticketId,
    eventName: parts["EVENT"] || null,
    attendeeName: parts["ATTENDEE"] || null,
    date: parts["DATE"] || null,
    isValid: !!ticketId && qrData.startsWith("TICKETFORGE"),
  };
}
