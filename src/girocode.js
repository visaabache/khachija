// GiroCode (EPC QR code): German banking apps scan it and fill in the transfer (recipient, IBAN, amount, reference).
import qrcode from 'qrcode-generator';

export const cleanIban = (s) => String(s || '').replace(/\s+/g, '').toUpperCase();
export const formatIban = (s) => cleanIban(s).replace(/(.{4})(?=.)/g, '$1 ');

// A basic IBAN check (length, letters and the mod-97 checksum), so a typo in the admin is caught.
export function validIban(s) {
  const iban = cleanIban(s);
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban)) return false;
  const moved = (iban.slice(4) + iban.slice(0, 4)).replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
  let rest = 0;
  for (const d of moved) rest = (rest * 10 + Number(d)) % 97;
  return rest === 1;
}

// Inline SVG of the EPC QR code, or '' when the bank details are incomplete.
export function giroCodeSvg({ owner, iban, bic = '', cents, reference }) {
  if (!owner || !validIban(iban) || !(cents > 0)) return '';
  const payload = ['BCD', '002', '1', 'SCT', cleanIban(bic), String(owner).slice(0, 70), cleanIban(iban), `EUR${(cents / 100).toFixed(2)}`, '', '', String(reference).slice(0, 140), ''].join('\n');
  const q = qrcode(0, 'M');
  // The EPC standard says UTF-8 (character set "1"); the library writes one byte per character, so the
  // text is turned into its UTF-8 bytes first ("Müller" keeps its ü in the banking app).
  q.addData(String.fromCharCode(...new TextEncoder().encode(payload)));
  q.make();
  return q.createSvgTag({ cellSize: 4, margin: 2, scalable: true }).replace('<svg ', '<svg role="img" aria-label="GiroCode" class="girocode" ');
}
