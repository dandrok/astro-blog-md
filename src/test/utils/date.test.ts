import { describe, it, expect } from 'vitest';

describe('Date Formatting', () => {
  it('formats date correctly', () => {
    const testDate = new Date('2024-01-15');
    const formatted = testDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

    expect(formatted).toBe('Jan 15, 2024');
  });

  describe('handles different months', () => {
    const testCases = [
      { date: new Date('2024-12-25'), expected: 'Dec 25, 2024' },
      { date: new Date('2024-07-04'), expected: 'Jul 4, 2024' },
      { date: new Date('2024-03-01'), expected: 'Mar 1, 2024' },
    ];

    test.each(testCases)('date $date should be formatted as $expected', ({ date, expected }) => {
      const formatted = date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
      expect(formatted).toBe(expected);
    });
  });
});
