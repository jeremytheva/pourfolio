import { describe, expect, it } from 'vitest';
import { calculateFinalRating } from '../ratingCalculator';

const sampleAttributes = {
  appearance: { score: 7, weight: 1.5 },
  aroma: { score: 6, weight: 3 },
  mouthfeel: { score: 5, weight: 3 },
  flavour: { score: 6, weight: 4.5 },
  follow: { score: 5, weight: 2.5 },
  design: { score: 4, weight: 0 }
};

describe('calculateFinalRating', () => {
  it('combines weighted base score with selected bonus attributes', () => {
    const result = calculateFinalRating(sampleAttributes, [
      { id: 'memorable', name: 'Memorable', weight: 0.2 }
    ]);

    expect(result.baseRating).toBeCloseTo(3.54, 2);
    expect(result.bonusPoints).toBeCloseTo(0.2, 2);
    expect(result.finalRating).toBeCloseTo(3.74, 2);
  });

  it('clamps manual bonus overrides to the allowed range', () => {
    const result = calculateFinalRating(sampleAttributes, [], 0.75);

    expect(result.bonusPoints).toBe(0.5);
    expect(result.finalRating).toBeCloseTo(4.04, 2);
  });

  it('omits bonus contributions when hideBonus is true', () => {
    const result = calculateFinalRating(
      sampleAttributes,
      [{ id: 'greatValue', name: 'Great Value', weight: 0.3 }],
      null,
      true
    );

    expect(result.bonusPoints).toBe(0);
    expect(result.finalRating).toBe(result.baseRating);
  });
});
