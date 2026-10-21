/*
 * 동화 그림을 SVG로 그립니다. 배경은 도형으로 그리고, 동물과 소품은 이모지로 올려요.
 * 아기는 몸을 그림으로 그리고 얼굴 자리에 고른 사진을 동그랗게 넣어요.
 * 좌표는 가로 400 × 세로 300 기준이고, 장면 명세는 stories.js 머리말에 정리돼 있어요.
 */
(function (root) {
  'use strict';
  const FT = (root.FT = root.FT || {});

  let counter = 0;
  const r1 = (v) => Math.round(v * 10) / 10;

  function attr(s) {
    return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  }

  function vgrad(id, top, bottom, y1, y2) {
    return `<linearGradient id="${id}" x1="0" y1="${y1}" x2="0" y2="${y2}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient>`;
  }

  function skyRect(id, top, bottom) {
    return `<defs>${vgrad(id, top, bottom, 0, 300)}</defs><rect width="400" height="300" fill="url(#${id})"/>`;
  }

  // 움직임은 안쪽 <g>에만 걸어요. 바깥 transform과 CSS 애니메이션이 서로 덮어쓰지 않게요.
  function place(x, y, inner, anim, delay) {
    const cls = anim && anim !== 'none' ? ` class="${anim}"` : '';
    const style = cls && delay ? ` style="animation-delay:${delay}s"` : '';
    return `<g transform="translate(${x} ${y})"><g${cls}${style}>${inner}</g></g>`;
  }

  function emoji(e, size) {
    return `<text font-size="${size}" text-anchor="middle" dominant-baseline="central">${e}</text>`;
  }

  function sun(x, y, r) {
    return `<circle cx="${x}" cy="${y}" r="${r + 9}" fill="#FFE89A" opacity=".55"/><circle cx="${x}" cy="${y}" r="${r}" fill="#FFD45C"/>`;
  }

  // 초승달: 노란 원 위에 하늘색 원을 겹쳐 오려 내요 (cut은 하늘과 같은 채움)
  function moon(x, y, r, cut) {
    return `<circle cx="${x}" cy="${y}" r="${r}" fill="#FFE9A8"/><circle cx="${r1(x + r * 0.45)}" cy="${r1(y - r * 0.3)}" r="${r1(r * 0.86)}" fill="${cut}"/>`;
  }

  function cloud(x, y, s, color, anim, delay) {
    const shape =
      `<g transform="scale(${s})" fill="${color || '#fff'}">` +
      '<circle cx="-26" cy="6" r="18"/><circle cx="0" cy="-6" r="24"/><circle cx="26" cy="4" r="18"/><rect x="-44" y="4" width="88" height="20" rx="10"/></g>';
    return place(x, y, shape, anim, delay);
  }

  function stars(count, seed, maxY) {
    let s = seed;
    const rand = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
    let out = '';
    for (let i = 0; i < count; i++) {
      const x = r1(rand() * 400);
      const y = r1(rand() * maxY);
      const r = r1(0.6 + rand() * 1.5);
      const tw = i % 4 === 0 ? ` class="twinkle" style="animation-delay:${r1(rand() * 3)}s"` : '';
      out += `<circle cx="${x}" cy="${y}" r="${r}" fill="#FFF8D6"${tw}/>`;
    }
    return out;
  }

  function tree(x, y, s, c) {
    return (
      `<g transform="translate(${x} ${y}) scale(${s})">` +
      `<rect x="-6" y="0" width="12" height="48" rx="4" fill="${c.trunk}"/>` +
      `<circle cx="0" cy="-12" r="30" fill="${c.leafA}"/><circle cx="-20" cy="4" r="20" fill="${c.leafB}"/><circle cx="20" cy="2" r="22" fill="${c.leafB}"/></g>`
    );
  }

  function rainbow(cx, cy, r) {
    const colors = ['#FF8A8A', '#FFC27A', '#FFE680', '#9EE39A', '#8AC9FF', '#A99BFF'];
    return (
      '<g fill="none" stroke-width="10" opacity=".85">' +
      colors.map((c, i) => {
        const rr = r - i * 10;
        return `<path d="M${cx - rr} ${cy} A${rr} ${rr} 0 0 1 ${cx + rr} ${cy}" stroke="${c}"/>`;
      }).join('') +
      '</g>'
    );
  }

  function planet(x, y, r) {
    const ra = r1(r * 1.75);
    const rb = r1(r * 0.36);
    const sw = r1(r * 0.14);
    return (
      `<g transform="translate(${x} ${y}) rotate(-14)">` +
      `<ellipse rx="${ra}" ry="${rb}" fill="none" stroke="#FFD7A8" stroke-width="${sw}" opacity=".9"/>` +
      `<circle r="${r}" fill="#FF9E6D"/>` +
      `<ellipse cy="${r1(-r * 0.35)}" rx="${r1(r * 0.92)}" ry="${r1(r * 0.12)}" fill="#FFC09A" opacity=".7"/>` +
      `<ellipse cy="${r1(r * 0.3)}" rx="${r1(r * 0.9)}" ry="${r1(r * 0.1)}" fill="#E97F55" opacity=".6"/>` +
      `<path d="M${-ra} 0 A${ra} ${rb} 0 0 0 ${ra} 0" fill="none" stroke="#FFD7A8" stroke-width="${sw}"/>` +
      '</g>'
    );
  }

  // ---- 배경 ----

  const BG = {
    home(o, id) {
      const night = o.t === 'night';
      const c = night
        ? { wall: '#383670', dot: '#423F80', floor: '#29274F', edge: '#211F42', rug: '#594A92', curtain: '#7C67B6', frame: '#E6E0FF', s1: '#18214F', s2: '#373C8A' }
        : { wall: '#FFE8D1', dot: '#FFDCBC', floor: '#F2C79A', edge: '#E3B07E', rug: '#FFB5C3', curtain: '#FF90A7', frame: '#FFF8EE', s1: '#8ED2FF', s2: '#E2F5FF' };
      let dots = '';
      for (let row = 0, y = 20; y < 226; row++, y += 34) {
        for (let x = row % 2 ? 34 : 17; x < 400; x += 34) dots += `<circle cx="${x}" cy="${y}" r="3"/>`;
      }
      const win = `url(#${id}w)`;
      const view = night
        ? moon(318, 80, 16, win) + '<circle cx="268" cy="64" r="1.6" fill="#FFF8D6" class="twinkle"/><circle cx="284" cy="114" r="1.3" fill="#FFF8D6"/><circle cx="340" cy="124" r="1.6" fill="#FFF8D6" class="twinkle"/>'
        : sun(320, 78, 14) + cloud(278, 116, 0.42);
      return (
        `<defs>${vgrad(id + 'w', c.s1, c.s2, 46, 142)}<clipPath id="${id}c"><rect x="246" y="46" width="108" height="96" rx="6"/></clipPath></defs>` +
        `<rect width="400" height="300" fill="${c.wall}"/><g fill="${c.dot}">${dots}</g>` +
        `<rect x="238" y="38" width="124" height="112" rx="12" fill="${c.frame}"/>` +
        `<g clip-path="url(#${id}c)"><rect x="246" y="46" width="108" height="96" fill="${win}"/>${view}</g>` +
        `<rect x="298" y="46" width="4" height="96" fill="${c.frame}"/><rect x="246" y="92" width="108" height="4" fill="${c.frame}"/>` +
        `<path d="M228 33 H254 Q244 96 252 160 Q238 167 226 160 Z" fill="${c.curtain}"/>` +
        `<path d="M372 33 H346 Q356 96 348 160 Q362 167 374 160 Z" fill="${c.curtain}"/>` +
        `<rect x="222" y="28" width="156" height="7" rx="3.5" fill="${c.edge}"/>` +
        `<rect y="232" width="400" height="68" fill="${c.floor}"/><rect y="232" width="400" height="5" fill="${c.edge}"/>` +
        `<ellipse cx="200" cy="270" rx="150" ry="20" fill="${c.rug}"/>` +
        `<g opacity="${night ? 0.7 : 1}"><rect x="30" y="204" width="28" height="28" rx="5" fill="#7FC8F8"/><rect x="60" y="204" width="28" height="28" rx="5" fill="#FFD45C"/><rect x="45" y="176" width="28" height="28" rx="5" fill="#FF8FA6"/></g>`
      );
    },

    forest(o, id) {
      const night = o.t === 'night';
      const c = night
        ? { s1: '#202862', s2: '#58498C', far: '#2D5752', mid: '#25483F', near: '#1D3B33', leafA: '#1F4E3D', leafB: '#193F31', trunk: '#4B3A3A', path: '#4D4864' }
        : { s1: '#A9DFFF', s2: '#EEFAFF', far: '#B4E2A6', mid: '#8DCF80', near: '#6BBE60', leafA: '#5CB65C', leafB: '#4AA24D', trunk: '#9A6B45', path: '#F2DDB0' };
      let out = skyRect(id + 's', c.s1, c.s2);
      out += night ? moon(334, 58, 18, `url(#${id}s)`) + stars(26, 3, 140) : sun(334, 56, 20) + cloud(90, 62, 0.8) + cloud(244, 40, 0.6);
      out += `<path d="M0 168 Q60 122 130 150 T260 140 T400 148 V300 H0Z" fill="${c.far}"/>`;
      out += tree(36, 150, 0.8, c) + tree(104, 162, 0.65, c) + tree(306, 152, 0.75, c) + tree(370, 164, 0.62, c);
      if (o.bigTree) {
        out +=
          `<rect x="72" y="112" width="36" height="150" rx="10" fill="${c.trunk}"/>` +
          `<circle cx="90" cy="92" r="64" fill="${c.leafA}"/><circle cx="40" cy="126" r="40" fill="${c.leafB}"/><circle cx="142" cy="120" r="44" fill="${c.leafB}"/>`;
      }
      out += `<path d="M0 214 Q100 176 200 204 T400 198 V300 H0Z" fill="${c.mid}"/>`;
      out += `<path d="M0 248 Q200 228 400 250 V300 H0Z" fill="${c.near}"/>`;
      if (o.path) out += `<path d="M150 300 C175 270 228 250 212 212 L228 212 C258 250 232 276 262 300Z" fill="${c.path}"/>`;
      if (o.stream) {
        out +=
          '<path d="M0 260 Q100 246 200 260 T400 256 V284 Q300 272 200 286 T0 282Z" fill="#7FD3F7"/>' +
          '<g fill="#C3CBD6"><ellipse cx="150" cy="268" rx="17" ry="7"/><ellipse cx="206" cy="273" rx="16" ry="6"/><ellipse cx="262" cy="266" rx="17" ry="7"/></g>';
      }
      if (night) {
        out += '<g fill="#FFF3A0">' + [[60, 200], [150, 186], [250, 210], [330, 194], [390, 226], [20, 236]].map(([x, y], i) =>
          `<circle cx="${x}" cy="${y}" r="2.4" class="twinkle" style="animation-delay:${i * 0.4}s"/>`).join('') + '</g>';
      } else {
        out += [[40, 262, '#FF9BB3'], [92, 272, '#FFE07A'], [300, 274, '#FFFFFF'], [356, 262, '#FF9BB3'], [210, 290, '#FFE07A']].map(([x, y, f]) =>
          `<circle cx="${x}" cy="${y}" r="4" fill="${f}"/><circle cx="${x}" cy="${y}" r="1.6" fill="#F4A940"/>`).join('');
      }
      return out;
    },

    sea(o, id) {
      const night = o.t === 'night';
      let out = skyRect(id + 's', night ? '#1C4F8C' : '#86DDF4', night ? '#0E2552' : '#2A78BF');
      out += '<g fill="#fff" opacity=".13"><path d="M50 0 H100 L160 300 H110Z"/><path d="M190 0 H220 L250 300 H215Z"/><path d="M300 0 H360 L330 300 H290Z"/></g>';
      out += '<path d="M0 252 Q100 238 200 250 T400 246 V300 H0Z" fill="#F4D7A3"/>';
      out += '<g fill="#8E9CB8"><ellipse cx="370" cy="256" rx="30" ry="14"/><ellipse cx="44" cy="262" rx="22" ry="10"/></g>';
      out += '<g stroke="#38C08A" stroke-width="9" stroke-linecap="round" fill="none">' +
        place(0, 0, '<path d="M24 300 Q12 270 26 246 T20 196"/><path d="M46 300 Q58 272 46 250 T52 216"/>', 'sway') +
        place(0, 0, '<path d="M352 300 Q340 272 354 250 T348 206"/>', 'sway', 1.2) + '</g>';
      out += '<g fill="#FF8B94"><circle cx="316" cy="250" r="9"/><circle cx="330" cy="238" r="11"/><circle cx="346" cy="250" r="8"/><circle cx="324" cy="226" r="7"/></g>';
      out += '<g fill="#FFB347"><circle cx="96" cy="258" r="6"/><circle cx="106" cy="248" r="7"/><circle cx="116" cy="258" r="6"/></g>';
      out += '<g fill="none" stroke="#fff" stroke-width="2" opacity=".7">' +
        [[70, 150, 6], [82, 128, 4], [76, 108, 3], [360, 120, 5], [350, 100, 3.5], [210, 40, 4]].map(([x, y, r], i) =>
          place(x, y, `<circle r="${r}"/>`, 'float', i * 0.5)).join('') + '</g>';
      return out;
    },

    beach(o, id) {
      let out = skyRect(id + 's', '#9BDBFF', '#EAF8FF');
      out += sun(326, 58, 20) + cloud(90, 60, 0.7) + cloud(220, 44, 0.5);
      out += '<rect y="168" width="400" height="132" fill="#4DB2E8"/><rect y="168" width="400" height="6" fill="#7FCBF2"/>';
      out += '<g fill="none" stroke="#E8F7FF" stroke-width="3" stroke-linecap="round" opacity=".7">' +
        [192, 226, 260, 292].map((y, i) => `<path d="M${i % 2 ? -20 : 0} ${y} q20 -7 40 0${' t40 0'.repeat(10)}"/>`).join('') + '</g>';
      return out;
    },

    sky(o, id) {
      const night = o.t === 'night';
      let out = skyRect(id + 's', night ? '#1F2363' : '#FFD3E4', night ? '#5A4EA6' : '#CFE6FF');
      out += night ? moon(70, 58, 18, `url(#${id}s)`) + stars(30, 5, 200) : sun(70, 58, 18);
      if (o.rainbow) out += rainbow(200, 292, 178);
      out += cloud(306, 74, 0.7, night ? '#DAD6F6' : '#FFFFFF', 'float') + cloud(112, 116, 0.5, night ? '#DAD6F6' : '#FFFFFF', 'float', 1.5);
      const floor = night ? '#D9D5F5' : '#FFFFFF';
      let puffs = '';
      for (let x = -10, i = 0; x <= 420; x += 46, i++) puffs += `<circle cx="${x}" cy="${i % 2 ? 262 : 254}" r="${i % 2 ? 30 : 36}"/>`;
      out += `<g fill="${floor}">${puffs}<rect y="262" width="400" height="38"/></g>`;
      return out;
    },

    space(o, id) {
      let out = skyRect(id + 's', '#0B1235', '#2C1D5F');
      out += `<defs><radialGradient id="${id}n1"><stop offset="0" stop-color="#FF7EB6" stop-opacity=".42"/><stop offset="1" stop-color="#FF7EB6" stop-opacity="0"/></radialGradient>` +
        `<radialGradient id="${id}n2"><stop offset="0" stop-color="#6FA8FF" stop-opacity=".38"/><stop offset="1" stop-color="#6FA8FF" stop-opacity="0"/></radialGradient></defs>`;
      out += `<circle cx="90" cy="90" r="120" fill="url(#${id}n1)"/><circle cx="330" cy="200" r="140" fill="url(#${id}n2)"/>`;
      out += stars(64, 11, 300);
      if (o.planet === 'big') out += planet(270, 130, 62);
      else if (o.planet) out += planet(322, 86, 30);
      if (o.ground === 'moon') {
        out += '<path d="M0 236 Q100 216 200 232 T400 228 V300 H0Z" fill="#CFCCE8"/>' +
          '<g fill="#B4B0D6"><ellipse cx="70" cy="262" rx="22" ry="7"/><ellipse cx="250" cy="276" rx="30" ry="8"/><ellipse cx="350" cy="252" rx="16" ry="5"/></g>';
      }
      return out;
    },

    portrait(o, id) {
      let rays = '';
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        const b = a + 0.12;
        rays += `<path d="M200 146 L${r1(200 + Math.cos(a) * 420)} ${r1(146 + Math.sin(a) * 420)} L${r1(200 + Math.cos(b) * 420)} ${r1(146 + Math.sin(b) * 420)}Z"/>`;
      }
      return (
        `<defs><radialGradient id="${id}p" cx="50%" cy="48%" r="70%"><stop offset="0" stop-color="#FFF6DA"/><stop offset="1" stop-color="#FFC4D3"/></radialGradient></defs>` +
        `<rect width="400" height="300" fill="url(#${id}p)"/><g fill="#fff" opacity=".28">${rays}</g>`
      );
    }
  };

  // ---- 인물 ----

  function photoFace(r, ctx, id) {
    if (ctx.photo) {
      return `<clipPath id="${id}"><circle r="${r}"/></clipPath>` +
        `<image href="${attr(ctx.photo)}" x="${-r}" y="${-r}" width="${2 * r}" height="${2 * r}" clip-path="url(#${id})" preserveAspectRatio="xMidYMid slice"/>`;
    }
    // 사진이 없을 때 쓰는 그림 얼굴
    return `<g transform="scale(${r1(r / 28)})"><circle r="28" fill="#FFE7CF"/>` +
      '<path d="M-6 -27 Q0 -37 6 -27" stroke="#3A2E4A" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
      '<circle cx="-9" cy="-3" r="3.2" fill="#3A2E4A"/><circle cx="9" cy="-3" r="3.2" fill="#3A2E4A"/>' +
      '<circle cx="-16" cy="7" r="4.5" fill="#FF9DB0" opacity=".6"/><circle cx="16" cy="7" r="4.5" fill="#FF9DB0" opacity=".6"/>' +
      '<path d="M-8 9 Q0 17 8 9" stroke="#3A2E4A" stroke-width="2.6" fill="none" stroke-linecap="round"/></g>';
  }

  function baby(art, ctx, id) {
    const [x, y, s = 1, pose] = art.baby;
    const o = ctx.outfit;
    const up = pose === 'up';
    const arms = up ? ['M-17 40 Q-32 32 -31 16', 'M17 40 Q32 32 31 16'] : ['M-17 40 Q-31 48 -29 62', 'M17 40 Q31 48 29 62'];
    const hand = up ? [31, 14] : [29, 63];
    let extra = '';
    if (art.hat) extra += `<g transform="translate(0 -40)">${emoji(art.hat, 30)}</g>`;
    if (art.hold) extra += `<g transform="translate(${hand[0] + 6} ${hand[1] - 8})">${emoji(art.hold, 24)}</g>`;
    return (
      `<g transform="translate(${x} ${y}) scale(${s})">` +
      '<ellipse cx="0" cy="92" rx="24" ry="5" fill="#000" opacity=".12"/>' +
      '<g class="bob">' +
      `<ellipse cx="-10" cy="85" rx="9" ry="6" fill="${o.dark}"/><ellipse cx="10" cy="85" rx="9" ry="6" fill="${o.dark}"/>` +
      `<path d="M-19 34 C-24 60 -22 80 -10 82 H10 C22 80 24 60 19 34 C10 27 -10 27 -19 34Z" fill="${o.main}"/>` +
      `<g stroke="${o.main}" stroke-width="11" stroke-linecap="round" fill="none"><path d="${arms[0]}"/><path d="${arms[1]}"/></g>` +
      `<circle cx="${-hand[0]}" cy="${hand[1]}" r="6" fill="${o.light}"/><circle cx="${hand[0]}" cy="${hand[1]}" r="6" fill="${o.light}"/>` +
      `<path d="M-11 33 Q0 41 11 33" stroke="${o.light}" stroke-width="4" fill="none" stroke-linecap="round"/>` +
      `<rect x="-8" y="52" width="16" height="12" rx="5" fill="${o.light}"/>` +
      '<circle r="31" fill="#fff"/>' + photoFace(28, ctx, id + 'face') +
      `<circle r="31" fill="none" stroke="${o.dark}" stroke-width="1.5" opacity=".45"/>` +
      extra +
      '</g></g>'
    );
  }

  function friend(spec, ctx) {
    const [x, y, size = 56] = spec;
    return `<g transform="translate(${x} ${y})"><ellipse cy="${r1(size * 0.48)}" rx="${r1(size * 0.34)}" ry="4" fill="#000" opacity=".12"/>` +
      `<g class="bob2">${emoji(ctx.friend, size)}</g></g>`;
  }

  function portraitFace(spec, ctx, id) {
    const [x, y, r] = spec;
    return `<g transform="translate(${x} ${y})">` +
      `<circle r="${r + 14}" fill="none" stroke="#FFB020" stroke-width="3" stroke-dasharray="2 9" stroke-linecap="round"/>` +
      `<circle r="${r + 6}" fill="#fff"/>${photoFace(r, ctx, id + 'photo')}</g>`;
  }

  function props(list, offset) {
    return (list || []).map(([e, x, y, size, anim], i) => place(x, y, emoji(e, size), anim, r1((i + offset) * 0.45))).join('');
  }

  function extras(art, id) {
    let out = '';
    if (art.clouds) out += art.clouds.map(([x, y, s, color, anim], i) => cloud(x, y, s, color, anim, i * 0.6)).join('');
    if (art.comet) {
      const [x1, y1, x2, y2] = art.comet;
      out += `<defs><linearGradient id="${id}k" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#FFF6C8" stop-opacity="0"/><stop offset="1" stop-color="#FFF6C8"/></linearGradient></defs>` +
        `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="url(#${id}k)" stroke-width="6" stroke-linecap="round"/>` +
        place(x2, y2, emoji('⭐', 30), 'twinkle');
    }
    if (art.boat) {
      const [x, y] = art.boat;
      out += `<g transform="translate(${x} ${y})"><path d="M-82 0 Q0 64 82 0Z" fill="#FFB38A"/><path d="M-82 0 H82" stroke="#FF8F66" stroke-width="6" stroke-linecap="round"/>` +
        '<g stroke="#FF8F66" stroke-width="3" fill="none"><path d="M-42 5 Q-30 26 -12 34"/><path d="M0 6 V40"/><path d="M42 5 Q30 26 12 34"/></g></g>';
    }
    return out;
  }

  function bubble(spec) {
    const [x, y, r] = spec;
    return `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" fill-opacity=".12" stroke="#fff" stroke-opacity=".8" stroke-width="3"/>` +
      `<path d="M${x - r * 0.62} ${y - r * 0.38} A${r * 0.72} ${r * 0.72} 0 0 1 ${x - r * 0.1} ${y - r * 0.72}" stroke="#fff" stroke-width="5" stroke-linecap="round" fill="none" opacity=".75"/>`;
  }

  /**
   * 장면 하나를 SVG 문자열로 그려요.
   * @param {object} art  stories.js의 장면 명세
   * @param {{photo: string|null, outfit: object, friend: string}} ctx
   */
  FT.renderScene = function (art, ctx) {
    const id = 'ft' + ++counter;
    const draw = BG[art.bg] || BG.home;
    return (
      '<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">' +
      draw(art.o || {}, id) +
      extras(art, id) +
      props(art.props, 0) +
      (art.friend ? friend(art.friend, ctx) : '') +
      (art.baby ? baby(art, ctx, id) : '') +
      (art.face ? portraitFace(art.face, ctx, id) : '') +
      (art.bubble ? bubble(art.bubble) : '') +
      props(art.front, 3) +
      '</svg>'
    );
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
