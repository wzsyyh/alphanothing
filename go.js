// Go rules: captures, suicide, simple ko, dead-stone marking, Chinese area scoring.
export const KOMI = 7.5;

export class Game {
  constructor(size) {
    this.size = size;
    this.board = new Array(size * size).fill(0); // 0 empty, 1 black, 2 white
    this.turn = 1;
    this.prevKey = null; // board before the last move, for simple ko
    this.passes = 0;
    this.captures = { 1: 0, 2: 0 };
    this.last = null;
    this.moves = 0;
    this.over = false;
    this.phase = 'play'; // 'play' | 'scoring' (entered after two consecutive passes)
    this.dead = new Set();
    this.confirmed = { 1: false, 2: false };
  }

  neighbors(i) {
    const n = this.size, x = i % n, y = (i / n) | 0, out = [];
    if (x > 0) out.push(i - 1);
    if (x < n - 1) out.push(i + 1);
    if (y > 0) out.push(i - n);
    if (y < n - 1) out.push(i + n);
    return out;
  }

  group(i, b) {
    const color = b[i], stones = [i], seen = new Set([i]), libs = new Set();
    for (let k = 0; k < stones.length; k++) {
      for (const nb of this.neighbors(stones[k])) {
        if (b[nb] === 0) libs.add(nb);
        else if (b[nb] === color && !seen.has(nb)) { seen.add(nb); stones.push(nb); }
      }
    }
    return { stones, libs: libs.size };
  }

  // Each action returns an error string, or null on success.
  play(color, i) {
    if (this.over) return '对局已结束';
    if (this.phase !== 'play') return '数子阶段不能落子，可点“继续对局”';
    if (color !== this.turn) return '还没轮到你';
    if (!Number.isInteger(i) || i < 0 || i >= this.board.length) return '非法坐标';
    if (this.board[i]) return '这里已经有棋子了';
    const b = this.board.slice(), opp = 3 - color;
    b[i] = color;
    let captured = 0;
    for (const nb of this.neighbors(i)) {
      if (b[nb] !== opp) continue;
      const g = this.group(nb, b);
      if (g.libs === 0) { for (const s of g.stones) b[s] = 0; captured += g.stones.length; }
    }
    if (this.group(i, b).libs === 0) return '禁止自杀';
    if (b.join('') === this.prevKey) return '打劫：请先找劫材';
    this.prevKey = this.board.join('');
    this.board = b;
    this.captures[color] += captured;
    this.last = i;
    this.turn = opp;
    this.passes = 0;
    this.moves++;
    return null;
  }

  pass(color) {
    if (this.over) return '对局已结束';
    if (this.phase !== 'play') return '已经在数子阶段了';
    if (color !== this.turn) return '还没轮到你';
    this.prevKey = this.board.join('');
    this.passes++;
    this.last = null;
    this.turn = 3 - color;
    this.moves++;
    if (this.passes >= 2) {
      this.phase = 'scoring';
      this.dead = new Set();
      this.confirmed = { 1: false, 2: false };
    }
    return null;
  }

  // Toggle the whole chain at i between dead and alive; any change voids both confirmations.
  toggleDead(i) {
    if (this.phase !== 'scoring') return '还没进入数子阶段';
    if (!this.board[i]) return null;
    const on = !this.dead.has(i);
    for (const s of this.group(i, this.board).stones) on ? this.dead.add(s) : this.dead.delete(s);
    this.confirmed = { 1: false, 2: false };
    return null;
  }

  confirm(color) {
    if (this.phase !== 'scoring') return '还没进入数子阶段';
    this.confirmed[color] = true;
    return null;
  }

  // Back to play after a scoring disagreement; the player whose turn it is moves next.
  resume() {
    if (this.phase !== 'scoring') return '还没进入数子阶段';
    this.phase = 'play';
    this.passes = 0;
    this.dead = new Set();
    this.confirmed = { 1: false, 2: false };
    return null;
  }

  // Area score with dead stones removed. owner[i] is 1/2 for points counted
  // for black/white (stones or territory), 0 for neutral.
  score() {
    const b = this.board.map((c, i) => (this.dead.has(i) ? 0 : c));
    const owner = b.slice(), s = { 1: 0, 2: 0 }, seen = new Set();
    for (let i = 0; i < b.length; i++) {
      if (b[i]) { s[b[i]]++; continue; }
      if (seen.has(i)) continue;
      const region = [i], borders = new Set();
      seen.add(i);
      for (let k = 0; k < region.length; k++) {
        for (const nb of this.neighbors(region[k])) {
          if (b[nb]) borders.add(b[nb]);
          else if (!seen.has(nb)) { seen.add(nb); region.push(nb); }
        }
      }
      if (borders.size === 1) {
        const c = [...borders][0];
        s[c] += region.length;
        for (const r of region) owner[r] = c;
      }
    }
    return { black: s[1], white: s[2] + KOMI, owner };
  }

  snapshot() {
    return {
      board: this.board, turn: this.turn, last: this.last,
      captures: this.captures, moves: this.moves, passes: this.passes,
      phase: this.phase, dead: [...this.dead], confirmed: this.confirmed,
      score: this.phase === 'scoring' ? this.score() : null,
    };
  }
}
