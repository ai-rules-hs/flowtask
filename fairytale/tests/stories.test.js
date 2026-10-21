// 실행: node --test fairytale/tests
const test = require('node:test');
const assert = require('node:assert/strict');

require('../js/josa.js');
require('../js/stories.js');
require('../js/art.js');
const FT = globalThis.FT;

test('받침에 맞춰 조사를 붙인다', () => {
  assert.equal(FT.josa('지우', '이/가'), '지우가');
  assert.equal(FT.josa('민준', '이/가'), '민준이');
  assert.equal(FT.josa('하늘', '은/는'), '하늘은');
  assert.equal(FT.josa('보리', '을/를'), '보리를');
  assert.equal(FT.josa('곰', '과/와'), '곰과');
  assert.equal(FT.josa('달', '으로/로'), '달로');
  assert.equal(FT.josa('곰', '으로/로'), '곰으로');
  assert.equal(FT.josa('바다', '으로/로'), '바다로');
  assert.equal(FT.josa('Emma', '이/가'), 'Emma가');
});

test('이름 부르는 형태를 만든다', () => {
  assert.equal(FT.nameForm('민준'), '민준이');
  assert.equal(FT.nameForm('지우'), '지우');
  assert.equal(FT.callForm('민준'), '민준아');
  assert.equal(FT.callForm('지우'), '지우야');
});

test('같은 seed는 같은 이야기를 만든다', () => {
  const input = { name: '지우', animal: 'any', world: 'any', outfit: 'pink', from: '엄마' };
  assert.deepEqual(FT.makeStory(input, 42), FT.makeStory(input, 42));
});

test('아무나/아무 데나로 고른 이야기를 고른 값으로 다시 열어도 똑같다', () => {
  const random = FT.makeStory({ name: '지우', animal: 'any', world: 'any' }, 7);
  const fixed = FT.makeStory({ name: '지우', animal: random.meta.animal, world: random.meta.world }, 7);
  assert.deepEqual(fixed.pages.map((p) => p.text || p.title), random.pages.map((p) => p.text || p.title));
});

test('seed가 다르면 이야기가 다양하게 나온다', () => {
  const texts = new Set();
  for (let seed = 1; seed <= 200; seed++) {
    texts.add(FT.makeStory({ name: '지우', world: 'forest', animal: 'rabbit' }, seed).pages.map((p) => p.text).join('|'));
  }
  assert.ok(texts.size > 150, `서로 다른 이야기 ${texts.size}개`);
});

test('모든 장소·친구·이름 조합에서 빈칸 없이 11쪽이 나온다', () => {
  const names = ['지우', '민준', '', 'Emma'];
  for (const world of FT.WORLDS) {
    for (const animal of FT.ANIMALS) {
      for (const name of names) {
        for (let seed = 1; seed <= 40; seed++) {
          const story = FT.makeStory({ name, world: world.id, animal: animal.id, from: '할머니' }, seed);
          assert.equal(story.pages.length, 11);
          assert.equal(story.meta.world, world.id);
          for (const p of story.pages) {
            const text = p.kind === 'cover' ? p.title + p.sub : p.text;
            assert.ok(text.length > 5);
            assert.doesNotMatch(text, /[{}]|undefined|null/, text);
            assert.ok(FT.renderScene(p.art, { photo: null, outfit: FT.outfitById('sky'), friend: animal.emoji }).startsWith('<svg'));
          }
        }
      }
    }
  }
});

test('받침 있는 이름은 "민준이가", "민준아"로 들어간다', () => {
  const all = [];
  for (let seed = 1; seed <= 300; seed++) {
    all.push(...FT.makeStory({ name: '민준' }, seed).pages.map((p) => p.text || p.title));
  }
  const joined = all.join('\n');
  assert.match(joined, /민준이[가는를와]/);
  assert.match(joined, /민준아/);
  assert.doesNotMatch(joined, /민준[가는를와야]/);
  assert.doesNotMatch(joined, /민준이이/);
});

test('이름을 비우면 "우리 아기"로 쓴다', () => {
  const story = FT.makeStory({ name: '   ' }, 3);
  assert.match(story.title, /우리 아기/);
});

test('장면에 들어가는 모든 그림 배경이 그려진다', () => {
  const ctx = { photo: 'data:image/jpeg;base64,AAAA', outfit: FT.outfitById('yellow'), friend: '🐰' };
  for (const bg of ['home', 'forest', 'sea', 'beach', 'sky', 'space', 'portrait']) {
    const svg = FT.renderScene({ bg, o: { t: 'night', rainbow: true, planet: true, ground: 'moon', path: true, stream: true, bigTree: true }, baby: [100, 150, 1, 'up'], hat: '👑', hold: '⭐' }, ctx);
    assert.match(svg, /<image href="data:image\/jpeg;base64,AAAA"/);
    assert.ok(svg.endsWith('</svg>'));
  }
});

test('그림에 쓰인 움직임 이름은 모두 style.css에 정의돼 있다', () => {
  const css = require('node:fs').readFileSync(require('node:path').join(__dirname, '../css/style.css'), 'utf8');
  const ctx = { photo: null, outfit: FT.outfitById('yellow'), friend: '🐰' };
  const used = new Set();
  const collect = (svg) => { for (const m of svg.matchAll(/class="([^"]+)"/g)) used.add(m[1]); };
  for (const world of ['forest', 'sea', 'sky', 'space']) {
    for (let seed = 1; seed <= 60; seed++) {
      for (const p of FT.makeStory({ name: '지우', world }, seed).pages) collect(FT.renderScene(p.art, ctx));
    }
  }
  collect(FT.renderScene({ bg: 'beach', baby: [100, 150, 1, 'up'] }, ctx));
  for (const name of used) assert.match(css, new RegExp(`\\.art \\.${name}\\b`), `.art .${name} 규칙이 없어요`);
});

test('한 그림 안에서 id가 겹치지 않는다 (겹치면 사진이 동그랗게 잘리지 않아요)', () => {
  const ctx = { photo: 'data:image/jpeg;base64,AAAA', outfit: FT.outfitById('yellow'), friend: '🐰' };
  for (let seed = 1; seed <= 30; seed++) {
    for (const p of FT.makeStory({ name: '지우' }, seed).pages) {
      const ids = [...FT.renderScene(p.art, ctx).matchAll(/ id="([^"]+)"/g)].map((m) => m[1]);
      assert.equal(new Set(ids).size, ids.length, ids.join(','));
    }
  }
});
