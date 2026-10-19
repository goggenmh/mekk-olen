import type { Doc, Stadfesting } from '../types';

/** HMS-dokument må kvar tilsett stadfeste at dei har lese. */
export const krevStadfesting = (d: Doc) => d.kategori === 'HMS';

/** Kor mange HMS-dokument denne tilsette ikkje har stadfesta enno. */
export const ustadfesta = (docs: Doc[], stadfestingar: Stadfesting[], ansatt: string | undefined) =>
  docs.filter((d) => krevStadfesting(d) && !stadfestingar.some((s) => s.docId === d.id && s.ansatt === ansatt)).length;
