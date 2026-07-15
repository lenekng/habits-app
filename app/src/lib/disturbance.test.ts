import { describe, expect, it } from 'vitest';
import { disturbanceReasons } from './disturbance';

describe('disturbanceReasons', () => {
  it('Vortags-Verhalten (Alkohol) stört die Messung am Morgen danach', () => {
    expect(disturbanceReasons({ alkohol: 2 }, {})).toEqual(['Alkohol am Vortag']);
    expect(disturbanceReasons({}, { alkohol: 1 })).toEqual([]);
    expect(disturbanceReasons({ alkohol: 3 }, {})).toEqual([]);
  });

  it('Schlafqualität zählt am selben Tag — sie beschreibt die Nacht vor der Messung', () => {
    expect(disturbanceReasons({}, { schlaf: 2 })).toEqual(['schlecht geschlafen']);
    expect(disturbanceReasons({ schlaf: 1 }, {})).toEqual([]);
    expect(disturbanceReasons({}, { schlaf: 3 })).toEqual([]);
  });

  it('Schlafdauer: nur die unterste Stufe gilt als Störung', () => {
    expect(disturbanceReasons({}, { schlafdauer: 1 })).toEqual(['zu wenig geschlafen']);
    expect(disturbanceReasons({}, { schlafdauer: 2 })).toEqual([]);
    expect(disturbanceReasons({ schlafdauer: 1 }, {})).toEqual([]);
  });

  it('mehrere Gründe werden kombiniert', () => {
    expect(disturbanceReasons({ alkohol: 1, urlaub: true }, { schlaf: 1, schlafdauer: 1 })).toEqual([
      'Alkohol am Vortag',
      'schlecht geschlafen',
      'zu wenig geschlafen',
      'Urlaub'
    ]);
  });
});
