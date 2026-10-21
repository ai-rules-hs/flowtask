/*
 * 한국어 조사를 이름의 받침에 맞춰 붙입니다.
 * 조사 표기는 "받침 있을 때/없을 때" 순서예요: 이/가, 은/는, 을/를, 과/와, 아/야, 이야/야, 으로/로
 */
(function (root) {
  'use strict';
  const FT = (root.FT = root.FT || {});

  const HANGUL_FIRST = 0xac00;
  const HANGUL_LAST = 0xd7a3;
  const RIEUL = 8; // 종성 'ㄹ'의 순번

  // 마지막 글자의 종성 순번(0이면 받침 없음). 한글이 아니면 받침 없음으로 봐요.
  function lastJong(word) {
    const s = String(word || '').trim();
    if (!s) return 0;
    const code = s.charCodeAt(s.length - 1);
    if (code < HANGUL_FIRST || code > HANGUL_LAST) return 0;
    return (code - HANGUL_FIRST) % 28;
  }

  function hasBatchim(word) {
    return lastJong(word) !== 0;
  }

  function josa(word, pair) {
    const [withJong, withoutJong] = pair.split('/');
    const jong = lastJong(word);
    if (withJong === '으로') return word + (jong !== 0 && jong !== RIEUL ? '으로' : '로');
    return word + (jong !== 0 ? withJong : withoutJong);
  }

  // 문장 속 이름: 받침이 있으면 '이'를 붙여요 (민준 → 민준이, 지우 → 지우)
  function nameForm(name) {
    return hasBatchim(name) ? name + '이' : name;
  }

  // 부르는 말: 민준아, 지우야
  function callForm(name) {
    return name + (hasBatchim(name) ? '아' : '야');
  }

  FT.josa = josa;
  FT.hasBatchim = hasBatchim;
  FT.nameForm = nameForm;
  FT.callForm = callForm;
})(typeof globalThis !== 'undefined' ? globalThis : this);
