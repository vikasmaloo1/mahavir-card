/**
 * Dedicated, cross-browser printable document generator.
 * Uses an isolated hidden iframe to bypass modal overflow, fixed backdrops,
 * and Tailwind styling conflicts that cause blank pages in browser print dialogs.
 */

export function printInvoiceDocument(
  elementId: string,
  options: {
    pageSize: "A5" | "A4";
    letterPadMode?: boolean;
  }
): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  const sourceEl = document.getElementById(elementId);
  if (!sourceEl) {
    window.print();
    return;
  }

  const isA5 = options.pageSize === "A5";
  const widthMm = isA5 ? "148mm" : "210mm";
  const heightMm = isA5 ? "210mm" : "297mm";
  const sizeRule = isA5 ? "148mm 210mm" : "210mm 297mm";

  // Remove existing print iframe if present
  const existingFrame = document.getElementById("invoice-print-frame");
  if (existingFrame) {
    existingFrame.remove();
  }

  const iframe = document.createElement("iframe");
  iframe.id = "invoice-print-frame";
  iframe.setAttribute(
    "style",
    `position:fixed;left:-9999px;top:-9999px;width:${widthMm};height:${heightMm};border:0;visibility:visible;`
  );
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentWindow?.document;
  if (!iframeDoc) {
    window.print();
    return;
  }

  // Collect existing styles and font links
  const styleTags = Array.from(document.querySelectorAll("style, link[rel='stylesheet']"))
    .map((node) => node.outerHTML)
    .join("\n");

  const printCss = `
    @page {
      size: ${sizeRule};
      margin: 0mm;
    }
    *, *::before, *::after {
      box-sizing: border-box !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      width: ${widthMm} !important;
      height: auto !important;
      min-height: ${heightMm} !important;
      overflow: visible !important;
      background: #ffffff !important;
    }
    .invoice-container {
      margin: 0 auto !important;
      border: none !important;
      box-shadow: none !important;
      width: ${widthMm} !important;
      height: ${heightMm} !important;
      min-height: ${heightMm} !important;
      max-height: ${heightMm} !important;
      overflow: hidden !important;
      page-break-after: avoid !important;
      page-break-inside: avoid !important;
      break-after: avoid !important;
      display: flex !important;
      flex-direction: column !important;
      justify-content: space-between !important;
    }
    .print\\:hidden, .no-print {
      display: none !important;
    }
    .print\\:border-none {
      border: none !important;
    }
    .print\\:text-transparent {
      color: transparent !important;
    }
    .print\\:opacity-0 {
      opacity: 0 !important;
    }
    @media print {
      @page {
        size: ${sizeRule};
        margin: 0mm;
      }
      html, body {
        height: ${heightMm} !important;
        overflow: hidden !important;
      }
      .no-print, .print\\:hidden {
        display: none !important;
      }
      .print\\:border-none {
        border: none !important;
      }
      .print\\:text-transparent {
        color: transparent !important;
      }
      .print\\:opacity-0 {
        opacity: 0 !important;
      }
    }
  `;

  iframeDoc.open();
  iframeDoc.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Tax Invoice</title>
  ${styleTags}
  <style>
    ${printCss}
  </style>
</head>
<body>
  ${sourceEl.innerHTML}
</body>
</html>`);
  iframeDoc.close();

  const triggerPrint = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (err) {
      console.error("Iframe print error, falling back to window.print", err);
      window.print();
    } finally {
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 3000);
    }
  };

  // Wait for images to load or timeout at 400ms
  const images = Array.from(iframeDoc.images);
  if (images.length === 0) {
    setTimeout(triggerPrint, 250);
  } else {
    let completed = 0;
    let printed = false;
    const onDone = () => {
      if (printed) return;
      completed++;
      if (completed >= images.length) {
        printed = true;
        setTimeout(triggerPrint, 150);
      }
    };
    images.forEach((img) => {
      if (img.complete) {
        onDone();
      } else {
        img.onload = onDone;
        img.onerror = onDone;
      }
    });
    // Maximum fallback safety timeout
    setTimeout(() => {
      if (!printed) {
        printed = true;
        triggerPrint();
      }
    }, 600);
  }
}
