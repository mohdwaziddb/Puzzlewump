import { createRng } from '@/engine/rng';
import { calculateStars } from '@/engine/ScoringEngine';
import { makeLevel } from '@/data/levels/makeLevel';
import { sanitizeSave, defaultSave, migrate } from '@/services/StorageService';
import * as GP from '@/services/GameProgressService';

describe('foundation', () => {
  it('rng deterministic', () => {
    expect(createRng(5).int(0, 1000)).toBe(createRng(5).int(0, 1000));
  });
  it('stars', () => {
    const l = makeLevel('memory', 1, 't', [{ gameType: 'memory-match', instructions: 'x', params: {} }]);
    expect(calculateStars(l, { mistakes: 0, hintsUsed: 0, timeSec: 1 })).toBe(3);
    expect(calculateStars(l, { mistakes: 1, hintsUsed: 0, timeSec: 1 })).toBe(2);
    expect(calculateStars(l, { mistakes: 5, hintsUsed: 0, timeSec: 1 })).toBe(1);
  });
  it('corrupt save recovers', () => {
    expect(sanitizeSave('garbage').coins).toBe(defaultSave().coins);
    const s = sanitizeSave({ coins: -5, levels: { a: 'x', b: { completed: true, stars: 9 } }, selectedCharacter: 'robo' });
    expect(s.coins).toBe(0);
    expect(s.levels.a).toBeUndefined();
    expect(s.levels.b.stars).toBe(3);
    expect(s.selectedCharacter).toBe('max'); // robo not unlocked
  });
  it('migrates unversioned saves', () => {
    expect(migrate({ coins: 5 }).version).toBe(1);
  });
  it('streak', () => {
    let s = GP.registerLogin(defaultSave(), '2026-01-01');
    s = GP.registerLogin(s, '2026-01-02');
    expect(s.daily.streak).toBe(2);
    s = GP.registerLogin(s, '2026-01-05');
    expect(s.daily.streak).toBe(1);
    expect(s.daily.bestStreak).toBe(2);
  });
  it('hints: token then coins then none', () => {
    let s = { ...defaultSave(), hints: 1, coins: 30 };
    let r = GP.spendHint(s)!; expect(r.paidWith).toBe('token'); s = r.save;
    r = GP.spendHint(s)!; expect(r.paidWith).toBe('coins'); s = r.save;
    expect(GP.spendHint(s)).toBeNull();
  });
});
