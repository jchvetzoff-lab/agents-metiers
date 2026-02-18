/**
 * Tests for utility functions
 * Run with: npm test -- utils.test.ts
 */

import { toLabel, getDisplayName } from '../utils';

describe('toLabel', () => {
  it('should return strings as-is', () => {
    expect(toLabel('test')).toBe('test');
    expect(toLabel('')).toBe('');
  });

  it('should extract nom from objects', () => {
    expect(toLabel({ nom: 'Compétence' })).toBe('Compétence');
    expect(toLabel({ nom: 'Formation', niveau: 'Bac+3' })).toBe('Compétence');
  });

  it('should extract name from objects', () => {
    expect(toLabel({ name: 'Skill' })).toBe('Skill');
  });

  it('should extract label from objects', () => {
    expect(toLabel({ label: 'Label' })).toBe('Label');
  });

  it('should handle null and undefined', () => {
    expect(toLabel(null)).toBe('');
    expect(toLabel(undefined)).toBe('');
  });

  it('should handle complex objects', () => {
    const result = toLabel({
      nom: 'Test',
      niveau: 'advanced',
      category: 'technique'
    });
    expect(result).toBe('Test');
  });

  it('should handle objects without nom/name/label', () => {
    const result = toLabel({ niveau: 'advanced', category: 'technique' });
    expect(result).toContain('advanced');
    expect(result).toContain('technique');
  });
});

describe('getDisplayName', () => {
  it('should return strings as-is', () => {
    expect(getDisplayName('test')).toBe('test');
  });

  it('should prefer gendered names', () => {
    const item = {
      nom: 'Développeur',
      nom_feminin: 'Développeuse',
      nom_masculin: 'Développeur',
      nom_epicene: 'Dev'
    };
    
    expect(getDisplayName(item, 'feminin')).toBe('Développeuse');
    expect(getDisplayName(item, 'masculin')).toBe('Développeur');
    expect(getDisplayName(item, 'epicene')).toBe('Dev');
  });

  it('should fallback to nom if gendered name not available', () => {
    const item = {
      nom: 'Métier',
      nom_masculin: 'Métier masculin'
    };
    
    // Should fallback to nom when nom_feminin not available
    expect(getDisplayName(item, 'feminin')).toBe('Métier');
  });
});