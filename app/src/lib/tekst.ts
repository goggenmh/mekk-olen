/** «1 timeføring» / «3 timeføringar» – rett bøying etter talet. */
export const tal = (n: number, eintal: string, fleirtal: string) => `${n} ${n === 1 ? eintal : fleirtal}`;

/** «ola nordmann» → «Ola Nordmann» (berre første bokstav i kvart ord blir endra). */
export const storeOrd = (s: string) => s.replace(/(^|[\s-])(\p{Ll})/gu, (_, f: string, b: string) => f + b.toUpperCase());
/** «ny sykkel» → «Ny sykkel». */
export const storFyrste = (s: string) => s.replace(/^(\s*)(\p{Ll})/u, (_, f: string, b: string) => f + b.toUpperCase());
