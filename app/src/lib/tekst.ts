/** «1 timeføring» / «3 timeføringar» – rett bøying etter talet. */
export const tal = (n: number, eintal: string, fleirtal: string) => `${n} ${n === 1 ? eintal : fleirtal}`;
