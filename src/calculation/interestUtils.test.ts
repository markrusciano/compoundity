import InterestUtils from './interestUtils';

it('calculates componding interest for a year', () => {
    const result = InterestUtils.compoundContinuously(1000, .05, 12);
    expect(result).toBeCloseTo(1051.27);
});

it('calculates componding interest for a month', () => {
    const result = InterestUtils.compoundContinuously(1000, .05, 1);
    expect(result).toBeCloseTo(1004.18);
});

it('calculates componding interest for six months', () => {
    const result = InterestUtils.compoundContinuously(1000, .05, 6);
    expect(result).toBeCloseTo(1025.32);
});