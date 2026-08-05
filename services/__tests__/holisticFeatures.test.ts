import { transformPoint, buildPayload } from '../holisticFeatures';

describe('transformPoint', () => {
  it('espelha o eixo x e preserva y/z', () => {
    expect(transformPoint({ x: 0.25, y: 0.7, z: 0.5 })).toEqual({
      x: 0.75,
      y: 0.7,
      z: 0.5,
    });
  });

  it('preserva visibility dos pontos de pose', () => {
    // Sem isso o overlay lê visibility=0 e o filtro (< 0.3) apaga o tronco
    // inteiro, mesmo com o modelo reportando confiança alta.
    const out = transformPoint({ x: 0.4, y: 0.6, z: 0, visibility: 0.99 });
    expect(out.visibility).toBe(0.99);
  });

  it('não inventa visibility para pontos que não têm (mão/rosto)', () => {
    expect(transformPoint({ x: 0.4, y: 0.6, z: 0 })).not.toHaveProperty('visibility');
  });
});

describe('buildPayload', () => {
  const hand = Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.5, z: 0 }));

  it('retorna null quando não há mãos', () => {
    expect(buildPayload({ hands: [] } as any, 'holistic_v1')).toBeNull();
  });

  it('hands_v1 envia apenas o array de mãos', () => {
    const payload = buildPayload({ hands: [hand] } as any, 'hands_v1');
    expect(Array.isArray(payload)).toBe(true);
  });

  it('holistic_v1 inclui pose e face quando presentes', () => {
    const payload = buildPayload(
      {
        hands: [hand],
        pose: [{ x: 0.1, y: 0.2, z: 0, visibility: 0.9 }],
        face: [{ x: 0.3, y: 0.4, z: 0 }],
      } as any,
      'holistic_v1',
    ) as { hands: unknown[]; pose?: unknown[]; face?: unknown[] };

    expect(payload.pose).toHaveLength(1);
    expect(payload.face).toHaveLength(1);
    expect((payload.pose as any)[0].visibility).toBe(0.9);
  });
});
