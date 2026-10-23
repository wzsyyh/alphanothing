// Go rules: captures, suicide, simple ko, Chinese area scoring.
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

  // Returns an error string, or null on success.
  play(color, i) {
    if (this.over) return '对局已结束';
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
    if (color !== this.turn) return '还没轮到你';
    this.prevKey = this.board.join('');
    this.passes++;
    this.last = null;
    this.turn = 3 - color;
    this.moves++;
    return null;
  }

  // Assumes dead stones were captured before both players passed.
  score() {
    const s = { 1: 0, 2: 0 }, seen = new Set();
    for (let i = 0; i < this.board.length; i++) {
      if (this.board[i]) { s[this.board[i]]++; continue; }
      if (seen.has(i)) continue;
      const region = [i], borders = new Set();
      seen.add(i);
      for (let k = 0; k < region.length; k++) {
        for (const nb of this.neighbors(region[k])) {
          if (this.board[nb]) borders.add(this.board[nb]);
          else if (!seen.has(nb)) { seen.add(nb); region.push(nb); }
        }
      }
      if (borders.size === 1) s[[...borders][0]] += region.length;
    }
    return { black: s[1], white: s[2] + KOMI };
  }

  snapshot() {
    return {
      board: this.board, turn: this.turn, last: this.last,
      captures: this.captures, moves: this.moves, passes: this.passes,
    };
  }
}
