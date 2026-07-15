import {
  AYC_MARK_DATA_URI,
  AYUNIS_CORE_WORDMARK_DATA_URI,
  SIGNATURE_DATA_URI,
  SOURCE_SANS_3_WOFF2_DATA_URI,
} from './certificate-assets';

export interface CertificateTemplateInput {
  userName: string;
  dateLine: string;
}

/**
 * Layout metrics are taken from the official certificate template PDF
 * (A4 portrait, all measurements converted from PDF points to mm).
 * This HTML is rendered without sanitization because the template is
 * fully owned by us — the user name is the only untrusted value and is
 * HTML-escaped before interpolation.
 */
const CERTIFICATE_HTML = `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<style>
  @font-face {
    font-family: 'Source Sans 3';
    font-style: normal;
    font-weight: 200 700;
    src: url('${SOURCE_SANS_3_WOFF2_DATA_URI}') format('woff2');
  }
  @page {
    size: A4;
    margin: 0;
  }
  html,
  body {
    margin: 0;
    padding: 0;
    width: 210mm;
    height: 297mm;
  }
  .page {
    position: relative;
    width: 210mm;
    height: 297mm;
    font-family: 'Source Sans 3', sans-serif;
    color: #000;
    text-align: center;
  }
  .wordmark {
    position: absolute;
    top: 25.9mm;
    left: 25.9mm;
    width: 35.5mm;
  }
  .title {
    position: absolute;
    top: 44mm;
    left: 0;
    right: 0;
    font-size: 48pt;
    font-weight: 600;
  }
  .intro {
    position: absolute;
    top: 81mm;
    left: 0;
    right: 0;
    font-size: 15.3pt;
    font-weight: 400;
  }
  .name {
    position: absolute;
    top: 97.5mm;
    left: 0;
    right: 0;
    font-size: 22pt;
    font-weight: 600;
  }
  .body-text {
    position: absolute;
    top: 119.5mm;
    left: 25mm;
    right: 25mm;
    font-size: 15.3pt;
    font-weight: 400;
    line-height: 8.7mm;
  }
  .mark {
    position: absolute;
    top: 157.6mm;
    left: 78.2mm;
    width: 53.6mm;
  }
  .signature {
    position: absolute;
    top: 225.1mm;
    left: 83mm;
    width: 36.9mm;
  }
  .signatory {
    position: absolute;
    top: 250.5mm;
    left: 0;
    right: 0;
    font-size: 13.3pt;
    font-weight: 200;
  }
  .date-line {
    position: absolute;
    top: 258.1mm;
    left: 0;
    right: 0;
    font-size: 13.3pt;
    font-weight: 200;
  }
</style>
</head>
<body>
<div class="page">
  <img class="wordmark" src="${AYUNIS_CORE_WORDMARK_DATA_URI}" alt="">
  <div class="title">ZERTIFIKAT</div>
  <div class="intro">Hiermit wird best&auml;tigt, dass</div>
  <div class="name">{{userName}}</div>
  <div class="body-text">
    den <strong>Ayunis Core KI-F&uuml;hrerschein</strong> erfolgreich
    abgeschlossen und die abschlie&szlig;ende Pr&uuml;fung bestanden hat.
  </div>
  <img class="mark" src="${AYC_MARK_DATA_URI}" alt="">
  <img class="signature" src="${SIGNATURE_DATA_URI}" alt="">
  <div class="signatory">Moritz Weiss, Head of Customer Success</div>
  <div class="date-line">{{dateLine}}</div>
</div>
</body>
</html>`;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function buildCertificateHtml(input: CertificateTemplateInput): string {
  return CERTIFICATE_HTML.replace(
    '{{userName}}',
    escapeHtml(input.userName),
  ).replace('{{dateLine}}', escapeHtml(input.dateLine));
}
