import type { CSSProperties } from 'react';

export function Avatar({ init, farge, size = 34, fontSize = 12 }: { init: string; farge: string; size?: number; fontSize?: number }) {
  const style: CSSProperties = {
    flex: 'none',
    width: size,
    height: size,
    borderRadius: '50%',
    background: farge,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize,
    color: '#fff',
  };
  return <div style={style}>{init}</div>;
}
