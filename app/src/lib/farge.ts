// Vel kvit eller mørk tekst ut frå bakgrunnsfargen, så initialar alltid er
// lesbare – også når ein tilsett har fått ein lys farge (t.d. grå).
const lum = (hex: string) => {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h.slice(0, 6);
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

export function tekstPaFarge(bakgrunn: string): string {
  if (!/^#[0-9a-f]{3,8}$/i.test(bakgrunn)) return '#fff';
  const l = lum(bakgrunn);
  const motKvit = 1.05 / (l + 0.05);
  const motMork = (l + 0.05) / (0.0147 + 0.05); // #14202a
  return motKvit >= 4.5 || motKvit >= motMork ? '#fff' : '#14202a';
}
