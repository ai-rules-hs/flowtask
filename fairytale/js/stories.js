/*
 * 동화 재료와 조합기.
 *
 * 한 권은 11쪽이에요: 표지 → 시작 → 친구 등장 → 출발 → 놀이 2개 → 문제 → 해결 → 선물 → 집으로 → 마지막 인사.
 * 쪽마다 후보 장면 중 하나를 seed로 골라서, 같은 seed면 언제나 같은 이야기가 나와요.
 *
 * 문장 속 자리표시자 (조사는 {name:이/가}처럼 "받침 있을 때/없을 때" 순서로 붙여요)
 *   name   아기 이름. 받침이 있으면 '이'를 붙인 형태 (민준이, 지우)
 *   call   부르는 말 (민준아, 지우야)
 *   from   이야기를 들려주는 사람 (엄마 아빠, 할머니 …)
 *   f      친구 이름 (보리, 콩이 …)
 *   fw     친구 종류 (아기 토끼 …)
 *   fmove  친구가 움직이는 모양 (깡충깡충 …)
 *   flook  친구 생김새 (귀가 쫑긋한 …)
 *   outfit 옷 색깔 (노란색 …)
 *
 * 그림(art)은 art.js가 그려요. 좌표는 가로 400 × 세로 300 기준입니다.
 *   bg      배경 이름, o는 배경 옵션 (t: 'day' | 'night' 등)
 *   baby    [x, 얼굴 중심 y, 크기, 자세('up'이면 만세)]
 *   friend  [x, y, 글자 크기]  → 고른 동물 친구
 *   props   [[이모지, x, y, 크기, 움직임]]  → 아기 뒤에 그려요. 움직임은 이모지에 맞춰 art.js가 고르고, 여기 값은 그 목록에 없을 때 써요
 *   front   props와 같고 아기 앞에 그려요
 *   hat / hold  아기 머리 위 / 손에 드는 이모지
 */
(function (root) {
  'use strict';
  const FT = (root.FT = root.FT || {});

  const DEFAULT_NAME = '우리 아기';
  const DEFAULT_FROM = '엄마 아빠';

  const ANIMALS = [
    { id: 'rabbit', label: '토끼', emoji: '🐰', word: '아기 토끼', move: '깡충깡충', look: '귀가 쫑긋한' },
    { id: 'bear', label: '곰', emoji: '🐻', word: '아기 곰', move: '뒤뚱뒤뚱', look: '털이 복슬복슬한' },
    { id: 'puppy', label: '강아지', emoji: '🐶', word: '아기 강아지', move: '총총총', look: '꼬리를 살랑살랑 흔드는' },
    { id: 'kitty', label: '고양이', emoji: '🐱', word: '아기 고양이', move: '사뿐사뿐', look: '수염이 쫑긋한' },
    { id: 'dino', label: '공룡', emoji: '🦕', word: '아기 공룡', move: '쿵쿵', look: '목이 기다란' },
    { id: 'penguin', label: '펭귄', emoji: '🐧', word: '아기 펭귄', move: '뒤뚱뒤뚱', look: '배가 하얀' },
    { id: 'elephant', label: '코끼리', emoji: '🐘', word: '아기 코끼리', move: '쿵짝쿵짝', look: '코가 기다란' },
    { id: 'chick', label: '병아리', emoji: '🐥', word: '아기 병아리', move: '종종종', look: '털이 노란' }
  ];

  const OUTFITS = [
    { id: 'yellow', label: '노랑', word: '노란색', main: '#FFD45C', dark: '#E2A92B', light: '#FFF1BF' },
    { id: 'pink', label: '분홍', word: '분홍색', main: '#FF9DB8', dark: '#DD6E8E', light: '#FFD9E4' },
    { id: 'sky', label: '하늘', word: '하늘색', main: '#8CCBFF', dark: '#5799DA', light: '#D7EEFF' },
    { id: 'green', label: '연두', word: '연두색', main: '#A8DE7C', dark: '#72B649', light: '#E0F6CC' },
    { id: 'purple', label: '보라', word: '보라색', main: '#C4A8FF', dark: '#8F74DC', light: '#EBE1FF' },
    { id: 'red', label: '빨강', word: '빨간색', main: '#FF8A7A', dark: '#DC5D4C', light: '#FFD6CF' }
  ];

  const FRIEND_NAMES = ['보리', '콩이', '몽이', '솜이', '두부', '호두', '방울이', '꼬미', '뭉치', '구름이'];

  const COVER_SUB = '{from:이/가} {name}에게 들려주는 이야기';

  // ---- 집에서 일어나는 쪽 (모든 모험에 공통) ----

  const OPENINGS = [
    { time: 'night', t: '까만 밤하늘에 별님이 반짝반짝. {outfit} 잠옷을 입은 {name:은/는} 아직 잠이 오지 않았어요. "오늘 밤엔 왠지 신나는 일이 생길 것 같아!"' },
    { time: 'night', t: '"잘 자, {call}. 좋은 꿈 꾸렴." {from:이/가} 이불을 꼭 덮어 주었어요. 그런데 {name:은/는} 눈이 말똥말똥했어요.' },
    { time: 'night', t: '창밖에서 달님이 방긋 웃고 있는 밤이었어요. {name:은/는} 창가에 기대어 달님에게 속삭였어요. "달님, 나랑 같이 놀러 갈래?"' },
    { time: 'day', t: '햇살이 방 안 가득 쏟아지는 오후였어요. {outfit} 옷을 입은 {name:은/는} 이불 위를 데굴데굴 구르며 놀고 있었어요.' },
    { time: 'day', t: '옛날 옛날, 아니 바로 오늘! 세상에서 제일 사랑스러운 아기, {name:이/가} 있었어요. {name:은/는} 웃음소리가 아주아주 예뻤답니다.' },
    { time: 'day', t: '{name:이/가} 장난감 블록을 쌓고 있었어요. 하나, 둘, 셋… 와르르! "에이, 또 무너졌네." {name:은/는} 깔깔 웃었어요.' }
  ];

  const MEETS = [
    '그때 어디선가 {fmove}! 누군가 다가왔어요. {flook} {fw} {f:이/가} 고개를 쏙 내밀었어요. "안녕, {call}! 나랑 같이 놀러 갈래?"',
    '똑똑똑, 누군가 창문을 두드렸어요. 창밖에는 {flook} {fw} {f:이/가} 서 있었어요. "{call}, 너를 데리러 왔어!"',
    '침대 밑에서 무언가 꼼지락꼼지락 움직였어요. 살짝 들여다보니 {fw} {f:이/가} 수줍게 손을 흔들었어요. "나는 {f:이야/야}. 우리 친구 할래?"',
    '반짝! 방 한가운데에 작은 빛이 피어났어요. 빛 속에서 {fw} {f:이/가} {fmove} 다가왔어요. "{call}, 오늘은 특별한 날이야. 멋진 곳에 데려가 줄게!"'
  ];

  const BACKS = [
    { time: 'day', t: '어느새 하늘이 노을빛으로 물들었어요. "이제 집에 갈 시간이야." {f:이/가} {name:을/를} 집까지 바래다주었어요. "{call}, 오늘 정말 즐거웠어. 또 놀자!"' },
    { t: '{name:과/와} {f:은/는} 손을 꼭 잡고 집으로 돌아왔어요. 방 안은 따뜻하고 포근했어요. {f:이/가} 속삭였어요. "{call}, 오늘 너는 정말 멋졌어."' },
    { time: 'night', t: '하아암— {name:이/가} 커다랗게 하품을 했어요. 눈을 떠 보니 포근한 이불 속이었어요. 머리맡에서는 모험에서 받은 선물이 반짝이고 있었어요.' },
    { t: '"잘 가, {f:아/야}!" {f:은/는} 몇 번이고 뒤돌아보며 손을 흔들었어요. {name:은/는} 선물을 꼭 안고 이불 속으로 쏙 들어갔어요.' }
  ];

  const ENDINGS = [
    '{call}, {from:은/는} 너를 세상에서 제일 사랑해. 오늘 밤에도 좋은 꿈 꾸렴.',
    '어떤 모험을 떠나도 {from:은/는} 언제나 네 곁에 있을게. 사랑해, {call}.',
    '{name:이/가} 태어난 날, 세상은 조금 더 반짝반짝해졌어요. 고마워, {call}. 사랑해.',
    '{call}, 너는 용감하고 다정하고 웃음이 예쁜 아이야. {from:은/는} 네가 정말 자랑스러워.'
  ];

  const OPENING_ART = { bg: 'home', baby: [140, 170, 1], props: [['🧸', 330, 250, 34]] };
  const MEET_ART = {
    bg: 'home',
    baby: [130, 170, 1],
    friend: [270, 238, 60],
    props: [['✨', 310, 180, 28, 'twinkle'], ['✨', 228, 196, 20, 'twinkle']]
  };
  const BACK_ART = { bg: 'home', o: { t: 'night' }, baby: [150, 170, 1], friend: [262, 238, 52], props: [['💤', 196, 118, 26, 'float']] };
  const END_ART = {
    bg: 'portrait',
    face: [200, 146, 88],
    props: [['💛', 64, 72, 30, 'float'], ['⭐', 338, 62, 28, 'twinkle'], ['✨', 344, 236, 30, 'twinkle'], ['💛', 58, 238, 24, 'float']]
  };

  // ---- 모험 장소 ----

  const WORLDS = [
    {
      id: 'forest',
      label: '숲속',
      icon: '🌳',
      titles: ['{name}의 반짝반짝 숲속 모험', '{name:과/와} {f}의 초록 숲 소풍'],
      cover: {
        bg: 'forest', o: { path: true },
        baby: [165, 160, 1, 'up'], friend: [258, 222, 56],
        props: [['🦋', 92, 92, 30, 'float'], ['🍄', 60, 246, 36], ['🌼', 342, 252, 26]]
      },
      portals: [
        {
          t: '{f:이/가} 정원 구석의 작은 나무 문을 열었어요. 끼이익— 문 너머에는 초록빛 숲이 펼쳐져 있었어요. "우와!" {name:이/가} 눈을 동그랗게 떴어요.',
          art: { bg: 'forest', o: { path: true }, baby: [150, 160, 1], friend: [248, 222, 56], props: [['🦋', 300, 84, 28, 'float'], ['🌸', 70, 252, 26]] }
        },
        {
          t: '"하나, 둘, 셋!" 둘이 함께 주문을 외우자 방 안에 나무가 쑥쑥 자라났어요. 어느새 둘은 향긋한 풀 냄새가 나는 숲속에 서 있었어요.',
          art: { bg: 'forest', baby: [160, 160, 1, 'up'], friend: [258, 222, 54], props: [['✨', 110, 110, 26, 'twinkle'], ['✨', 300, 120, 22, 'twinkle'], ['🌱', 210, 252, 24]] }
        }
      ],
      trips: [
        {
          t: '알록달록 버섯 마을에 도착했어요. 무당벌레 아저씨가 버섯 우산을 빌려주었어요. "비가 오면 쓰렴!" {name:은/는} 버섯 우산을 쓰고 빙글빙글 돌았어요.',
          art: { bg: 'forest', baby: [205, 160, 1, 'up'], hat: '🍄', friend: [305, 222, 50], props: [['🍄', 70, 222, 64], ['🍄', 122, 244, 36], ['🐞', 340, 140, 28, 'float']] }
        },
        {
          t: '꽃밭에서 나비들이 춤을 추고 있었어요. 팔랑팔랑, 살랑살랑. {name:이/가} 두 팔을 흔들자 나비들이 {name}의 머리 위에 사뿐히 내려앉았어요.',
          art: {
            bg: 'forest', baby: [170, 160, 1, 'up'], friend: [282, 222, 50],
            props: [['🦋', 120, 100, 28, 'float'], ['🦋', 220, 90, 24, 'float'], ['🦋', 168, 70, 22, 'float']],
            front: [['🌸', 60, 262, 28], ['🌼', 110, 270, 24], ['🌸', 250, 272, 24], ['🌼', 350, 264, 28]]
          }
        },
        {
          t: '다람쥐가 도토리를 데굴데굴 굴리며 놀고 있었어요. "같이 할래?" {name:이/가} 도토리를 톡 굴리자 데굴데굴 데구르르! 다람쥐가 손뼉을 쳤어요.',
          art: { bg: 'forest', baby: [140, 160, 1], friend: [330, 224, 46], props: [['🐿️', 245, 226, 46]], front: [['🌰', 196, 254, 22], ['🌰', 214, 262, 18]] }
        },
        {
          t: '졸졸졸 시냇물이 흐르고 있었어요. 개구리가 퐁당퐁당 징검다리 건너는 법을 알려 주었어요. 하나, 둘, 폴짝! {name}도 폴짝 건넜어요.',
          art: { bg: 'forest', o: { stream: true }, baby: [170, 150, 1, 'up'], friend: [280, 214, 46], props: [['🐸', 80, 236, 40, 'float']] }
        },
        {
          t: '숲 한가운데에 아주아주 커다란 할아버지 나무가 있었어요. {name:이/가} 나무를 꼬옥 안아 주자, 나무가 껄껄 웃으며 달콤한 사과를 떨어뜨려 주었어요.',
          art: { bg: 'forest', o: { bigTree: true }, baby: [215, 160, 1, 'up'], hold: '🍎', friend: [312, 222, 50], props: [['🍎', 70, 118, 24], ['🍎', 118, 96, 22], ['🐦', 150, 52, 26, 'float']] }
        }
      ],
      troubles: [
        {
          t: '그런데 어디선가 훌쩍훌쩍 우는 소리가 들렸어요. 아기 부엉이가 길을 잃어버렸대요. "엄마가 어디 있는지 모르겠어…"',
          art: { bg: 'forest', o: { t: 'night' }, baby: [140, 160, 1], friend: [232, 222, 48], props: [['🦉', 322, 200, 50], ['💧', 342, 178, 16, 'float']] },
          fixes: [
            {
              t: '{name:이/가} 반딧불이들에게 부탁했어요. "길을 비춰 줄래?" 반짝반짝 반딧불이를 따라가니 엄마 부엉이가 기다리고 있었어요. "고마워!"',
              art: {
                bg: 'forest', o: { t: 'night' }, baby: [130, 160, 1, 'up'], friend: [216, 224, 44],
                props: [['🦉', 330, 150, 60, 'float'], ['🦉', 282, 196, 38, 'float'], ['✨', 200, 120, 22, 'twinkle'], ['✨', 250, 96, 18, 'twinkle'], ['✨', 300, 84, 20, 'twinkle']]
              }
            },
            {
              t: '{name:이/가} 큰 소리로 노래를 불렀어요. 랄랄라~ 노랫소리를 듣고 엄마 부엉이가 날아왔어요. 아기 부엉이는 엄마 품에 쏙 안겼어요.',
              art: {
                bg: 'forest', o: { t: 'night' }, baby: [130, 160, 1, 'up'], friend: [216, 224, 44],
                props: [['🦉', 320, 160, 58, 'float'], ['🦉', 286, 200, 36], ['🎵', 182, 100, 26, 'float'], ['🎶', 226, 80, 24, 'float']]
              }
            }
          ]
        },
        {
          t: '덤불 옆에 아기 고슴도치가 혼자 웅크리고 있었어요. "가시 때문에 아무도 나랑 안 놀아 줘…"',
          art: { bg: 'forest', baby: [140, 160, 1], friend: [232, 222, 48], props: [['🦔', 322, 236, 44], ['💧', 340, 210, 14, 'float']] },
          fixes: [
            {
              t: '{name:이/가} 고슴도치 옆에 살며시 앉았어요. "가시가 있어도 괜찮아. 우리 같이 놀자!" 고슴도치의 얼굴이 환하게 밝아졌어요.',
              art: { bg: 'forest', baby: [200, 160, 1], friend: [110, 222, 48], props: [['🦔', 286, 236, 44], ['💛', 246, 160, 24, 'float']] }
            },
            {
              t: '{name:과/와} {f:은/는} 고슴도치와 함께 숨바꼭질을 했어요. 꼭꼭 숨어라! 고슴도치는 동그랗게 몸을 말고 데굴데굴 웃었어요.',
              art: { bg: 'forest', baby: [150, 160, 1, 'up'], friend: [70, 222, 46], props: [['🦔', 300, 238, 40, 'float'], ['🌳', 350, 210, 52]] }
            }
          ]
        }
      ],
      gifts: [
        {
          t: '숲속 친구들이 모두 모여 손뼉을 쳤어요. 다람쥐는 꽃으로 만든 왕관을 {name}의 머리에 씌워 주었어요. "오늘의 숲속 대장은 바로 너야!"',
          art: {
            bg: 'forest', baby: [180, 160, 1, 'up'], hat: '👑', friend: [280, 222, 52],
            props: [['🐿️', 80, 228, 42], ['🦉', 340, 120, 40, 'float'], ['🌸', 120, 90, 22, 'float'], ['🌼', 250, 76, 22, 'float']]
          }
        },
        {
          t: '"이건 우리 숲의 보물이야." 부엉이가 반짝반짝 빛나는 도토리 하나를 선물로 주었어요. {name:은/는} 도토리를 주머니에 소중히 넣었어요.',
          art: { bg: 'forest', baby: [170, 160, 1], hold: '🌰', friend: [272, 222, 52], props: [['🦉', 330, 110, 42, 'float'], ['✨', 214, 196, 20, 'twinkle']] }
        }
      ]
    },
    {
      id: 'sea',
      label: '바다',
      icon: '🐠',
      titles: ['{name}의 퐁당퐁당 바닷속 여행', '{name:과/와} {f}의 파란 바다 모험'],
      cover: {
        bg: 'sea', baby: [160, 152, 1, 'up'], friend: [262, 214, 54],
        props: [['🐠', 70, 92, 36, 'float'], ['🐟', 330, 80, 28, 'float']], front: [['🐚', 334, 266, 28]]
      },
      portals: [
        {
          t: '{f:이/가} 커다란 비눗방울을 후— 불었어요. 둘은 비눗방울 안에 쏙 들어가 바닷속으로 퐁당! 동그란 방울 안에서도 숨을 쉴 수 있었어요.',
          art: { bg: 'sea', baby: [165, 140, 0.95], friend: [245, 196, 48], bubble: [205, 168, 96], props: [['🐟', 60, 90, 26, 'float']] }
        },
        {
          t: '둘은 조개껍데기 배를 타고 바다로 나갔어요. 출렁출렁 파도를 넘자 고래 한 마리가 "바닷속 구경시켜 줄게!" 하고 물을 뿜었어요.',
          art: { bg: 'beach', baby: [150, 132, 0.85], friend: [222, 188, 44], boat: [185, 214], props: [['🐳', 322, 196, 66, 'float']] }
        }
      ],
      trips: [
        {
          t: '알록달록 산호 정원에 물고기들이 살고 있었어요. 노란 물고기, 파란 물고기, 줄무늬 물고기! {name:이/가} 손을 흔들자 물고기들이 빙글빙글 헤엄쳤어요.',
          art: {
            bg: 'sea', baby: [150, 152, 1, 'up'], friend: [252, 214, 50],
            props: [['🐠', 70, 90, 34, 'float'], ['🐟', 240, 80, 28, 'float'], ['🐡', 320, 120, 32, 'float'], ['🐠', 110, 50, 24, 'float']]
          }
        },
        {
          t: '돌고래가 다가와 등을 내밀었어요. "꼭 잡아!" {name:은/는} 돌고래 등에 타고 쌩— 바닷속을 달렸어요. 신난다!',
          art: { bg: 'sea', baby: [196, 86, 0.8, 'up'], friend: [330, 228, 44], front: [['🐬', 210, 186, 104, 'float']] }
        },
        {
          t: '문어 아줌마가 여덟 개의 팔을 활짝 벌렸어요. "반가워, 꼭 안아 줄게!" 꼬옥, 꼬옥, 꼬옥… 여덟 번이나 안아 주었어요. 간질간질!',
          art: { bg: 'sea', baby: [150, 152, 1, 'up'], friend: [64, 224, 44], props: [['🐙', 280, 180, 96, 'float']] }
        },
        {
          t: '느릿느릿 바다거북 할아버지를 만났어요. "천천히 가도 괜찮단다." {name:은/는} 거북 할아버지 등에 앉아 바닷속 이야기를 들었어요.',
          art: { bg: 'sea', baby: [212, 100, 0.8], friend: [334, 228, 44], front: [['🐢', 214, 196, 108]] }
        },
        {
          t: '모래밭에서 꽃게들이 옆으로 옆으로 춤을 추고 있었어요. 집게를 딱딱! {name}도 손가락으로 딱딱 소리를 내며 옆으로 걸어 보았어요.',
          art: { bg: 'sea', baby: [190, 152, 1, 'up'], friend: [276, 214, 46], front: [['🦀', 84, 254, 40, 'float'], ['🦀', 330, 260, 34, 'float']] }
        }
      ],
      troubles: [
        {
          t: '작은 물고기 한 마리가 울고 있었어요. "친구들이랑 숨바꼭질하다가 길을 잃었어…"',
          art: { bg: 'sea', baby: [140, 152, 1], friend: [228, 214, 46], props: [['🐟', 312, 160, 34, 'float'], ['💧', 330, 140, 14, 'float']] },
          fixes: [
            {
              t: '{name:이/가} 반짝이는 조개껍데기를 높이 들었어요. 반짝반짝 빛을 보고 친구 물고기들이 몰려왔어요. "여기 있었구나!"',
              art: {
                bg: 'sea', baby: [150, 152, 1, 'up'], hold: '🐚', friend: [64, 224, 42],
                props: [['🐟', 270, 110, 30, 'float'], ['🐠', 318, 150, 34, 'float'], ['🐡', 290, 196, 30, 'float'], ['✨', 196, 96, 22, 'twinkle']]
              }
            },
            {
              t: '{name:과/와} {f:은/는} 작은 물고기와 함께 산호 숲을 살펴보았어요. 바위 뒤에서 친구들이 "짠!" 하고 나타났어요.',
              art: { bg: 'sea', baby: [130, 152, 1, 'up'], friend: [212, 214, 44], props: [['🐟', 280, 150, 30, 'float'], ['🐠', 330, 120, 34, 'float'], ['🐡', 320, 190, 30, 'float']] }
            }
          ]
        },
        {
          t: '커다란 고래가 딸꾹딸꾹 딸꾹질을 하고 있었어요. 딸꾹! 할 때마다 바닷물이 출렁출렁했어요. "멈추질 않아…"',
          art: { bg: 'sea', baby: [104, 152, 1], friend: [184, 216, 42], props: [['🐳', 300, 140, 112, 'float'], ['💦', 268, 70, 24, 'float']] },
          fixes: [
            {
              t: '{name:이/가} 고래의 커다란 얼굴을 살살 쓰다듬었어요. "천천히 숨 쉬어 봐. 후— 하—" 그러자 딸꾹질이 뚝 멈췄어요!',
              art: { bg: 'sea', baby: [120, 152, 1, 'up'], friend: [60, 224, 40], props: [['🐳', 290, 150, 112, 'float'], ['💛', 196, 104, 24, 'float']] }
            },
            {
              t: '"까꿍!" {name:이/가} 깜짝 놀래 주자 고래의 딸꾹질이 뚝 멈췄어요. 고래는 고마워서 물을 높이 뿜었어요. 촤아아!',
              art: { bg: 'sea', baby: [110, 152, 1, 'up'], friend: [190, 216, 42], props: [['🐳', 300, 160, 104, 'float'], ['💦', 286, 70, 30, 'float'], ['💦', 322, 58, 24, 'float']] }
            }
          ]
        }
      ],
      gifts: [
        {
          t: '바닷속 친구들이 "고마워!" 하며 동그랗고 하얀 진주를 선물했어요. 진주 속에는 바다의 노랫소리가 담겨 있었어요.',
          art: { bg: 'sea', baby: [170, 152, 1], hold: '🐚', friend: [270, 214, 50], props: [['🐠', 70, 100, 30, 'float'], ['🐙', 330, 110, 40, 'float'], ['✨', 214, 186, 20, 'twinkle']] }
        },
        {
          t: '불가사리가 {name}의 손바닥 위에 살포시 올라앉았어요. "내가 너의 반짝이 별이 되어 줄게."',
          art: { bg: 'sea', baby: [170, 152, 1, 'up'], hold: '⭐', friend: [270, 214, 50], props: [['🐟', 80, 96, 28, 'float'], ['✨', 230, 110, 20, 'twinkle']] }
        }
      ]
    },
    {
      id: 'sky',
      label: '구름 나라',
      icon: '☁️',
      titles: ['{name}의 몽글몽글 구름 나라 여행', '{name:과/와} {f}의 무지개 하늘 산책'],
      cover: {
        bg: 'sky', o: { rainbow: true },
        baby: [160, 150, 1, 'up'], friend: [256, 212, 54],
        props: [['🎈', 86, 92, 44, 'float'], ['🎈', 330, 120, 36, 'float']]
      },
      portals: [
        {
          t: '{f:이/가} 알록달록 풍선을 한 다발 가져왔어요. 풍선을 꼭 잡자 몸이 둥실둥실 떠올랐어요. 지붕 위로, 나무 위로, 구름 위로!',
          art: {
            bg: 'sky', baby: [170, 128, 1, 'up'], friend: [264, 208, 48],
            props: [['🎈', 146, 52, 40, 'float'], ['🎈', 176, 40, 36, 'float'], ['🎈', 204, 56, 38, 'float']]
          }
        },
        {
          t: '창밖에 구름 계단이 생겨났어요. 한 칸, 두 칸, 폭신폭신. 계단 끝에는 하얀 구름 나라가 기다리고 있었어요.',
          art: {
            bg: 'sky', baby: [244, 104, 0.9, 'up'], friend: [320, 166, 44],
            clouds: [[70, 236, 0.7], [140, 200, 0.7], [210, 166, 0.7], [290, 186, 0.8]]
          }
        }
      ],
      trips: [
        {
          t: '구름 위에서 콩콩 뛰었더니 트램펄린처럼 통통 튀어 올랐어요. 콩! 통! 콩! 통! {name:이/가} 까르르 웃었어요.',
          art: { bg: 'sky', baby: [170, 104, 1, 'up'], friend: [272, 212, 50], props: [['✨', 110, 150, 22, 'twinkle'], ['✨', 234, 74, 20, 'twinkle']] }
        },
        {
          t: '일곱 빛깔 무지개 미끄럼틀이 있었어요. 빨주노초파남보— 슈우웅! {name:은/는} 무지개를 타고 신나게 미끄러져 내려왔어요.',
          art: { bg: 'sky', o: { rainbow: true }, baby: [96, 118, 0.85, 'up'], friend: [300, 212, 50] }
        },
        {
          t: '분홍색 구름을 한 입 앙! 먹어 보니 솜사탕처럼 달콤했어요. "음~ 맛있다!" {f}도 한 입, {name}도 한 입.',
          art: { bg: 'sky', baby: [150, 150, 1], friend: [252, 212, 50], clouds: [[308, 104, 1, '#FFB6D0', 'float'], [190, 58, 0.6, '#FFCFE0', 'float']] }
        },
        {
          t: '새들이 모여 노래를 부르고 있었어요. 짹짹, 삐리리~ {name:이/가} "아~" 하고 따라 부르자 새들이 날개로 손뼉을 쳤어요.',
          art: {
            bg: 'sky', baby: [166, 150, 1, 'up'], friend: [266, 212, 48],
            props: [['🐦', 82, 90, 32, 'float'], ['🐦', 124, 62, 26, 'float'], ['🐦', 306, 80, 30, 'float'], ['🎵', 204, 64, 24, 'float'], ['🎶', 254, 98, 22, 'float']]
          }
        },
        {
          t: '바람 아저씨가 후— 하고 불어 주자 {name:은/는} 연처럼 하늘을 훨훨 날았어요. "내가 날고 있어!"',
          art: { bg: 'sky', baby: [190, 104, 0.95, 'up'], friend: [304, 212, 46], props: [['🍃', 94, 82, 30, 'float'], ['🍃', 300, 130, 26, 'float'], ['🍃', 120, 150, 22, 'float']] }
        }
      ],
      troubles: [
        {
          t: '작은 구름이 훌쩍훌쩍 울고 있었어요. 구름이 울 때마다 아래 마을에 비가 주룩주룩 내렸어요. "아무도 나랑 안 놀아 줘…"',
          art: {
            bg: 'sky', baby: [130, 150, 1], friend: [220, 212, 46],
            clouds: [[300, 92, 0.9, '#B9C3DA']],
            props: [['💧', 280, 140, 16, 'float'], ['💧', 304, 152, 14, 'float'], ['💧', 326, 138, 16, 'float']]
          },
          fixes: [
            {
              t: '{name:이/가} 작은 구름을 꼭 안아 주었어요. "내가 친구 해 줄게!" 구름이 방긋 웃자 하늘에 무지개가 활짝 떴어요.',
              art: { bg: 'sky', o: { rainbow: true }, baby: [160, 150, 1, 'up'], friend: [262, 212, 48], clouds: [[300, 90, 0.8, '#FFFFFF', 'float']], props: [['💛', 232, 96, 22, 'float']] }
            },
            {
              t: '{name:과/와} {f:은/는} 작은 구름에게 재미있는 표정을 지어 보였어요. 메롱~ 까꿍! 구름이 깔깔 웃자 비가 그치고 해님이 나왔어요.',
              art: { bg: 'sky', baby: [150, 150, 1, 'up'], friend: [246, 212, 48], clouds: [[300, 96, 0.8, '#FFFFFF', 'float']], props: [['☀️', 90, 70, 44, 'twinkle']] }
            }
          ]
        },
        {
          t: '아기 새가 날개를 파닥파닥 움직였지만 날아오르지 못했어요. "나는 왜 못 날까?"',
          art: { bg: 'sky', baby: [140, 150, 1], friend: [230, 212, 46], props: [['🐦', 316, 230, 30], ['💧', 332, 210, 12, 'float']] },
          fixes: [
            {
              t: '{name:이/가} 아기 새 옆에서 두 팔을 펴고 함께 파닥파닥 흉내 냈어요. "할 수 있어!" 아기 새가 힘껏 날갯짓하자 포르르 날아올랐어요.',
              art: { bg: 'sky', baby: [150, 150, 1, 'up'], friend: [246, 212, 46], props: [['🐦', 310, 110, 32, 'float'], ['✨', 280, 140, 18, 'twinkle']] }
            },
            {
              t: '{name:은/는} 바람 아저씨에게 부탁했어요. "살살 불어 주세요." 산들바람을 타고 아기 새가 처음으로 하늘을 날았어요.',
              art: { bg: 'sky', baby: [140, 150, 1, 'up'], friend: [230, 212, 46], props: [['🐦', 300, 96, 30, 'float'], ['🍃', 250, 130, 24, 'float'], ['🍃', 340, 150, 20, 'float']] }
            }
          ]
        }
      ],
      gifts: [
        {
          t: '구름 나라 친구들이 일곱 빛깔 무지개 리본을 선물했어요. "슬플 때 이 리본을 보면 웃음이 날 거야."',
          art: { bg: 'sky', o: { rainbow: true }, baby: [170, 150, 1, 'up'], hold: '🎀', friend: [272, 212, 50] }
        },
        {
          t: '작은 구름이 "내가 베개가 되어 줄게." 하며 폭신폭신 구름 베개로 변신했어요. 세상에서 제일 포근한 베개였어요.',
          art: { bg: 'sky', o: { t: 'night' }, baby: [170, 150, 1], friend: [272, 212, 50], clouds: [[84, 218, 0.55, '#FFFFFF', 'float']], props: [['✨', 236, 96, 22, 'twinkle']] }
        }
      ]
    },
    {
      id: 'space',
      label: '우주',
      icon: '🚀',
      titles: ['{name}의 반짝반짝 별나라 여행', '{name:과/와} {f}의 우주 대모험'],
      cover: {
        bg: 'space', o: { planet: true, ground: 'moon' },
        baby: [160, 142, 1, 'up'], friend: [256, 204, 54],
        props: [['🚀', 72, 92, 44, 'float'], ['⭐', 330, 190, 24, 'twinkle']]
      },
      portals: [
        {
          t: '{f:이/가} 커다란 종이 상자에 날개를 붙였어요. "우주선 완성!" 다섯, 넷, 셋, 둘, 하나… 발사! 슈웅— 우주선이 별들 사이로 날아올랐어요.',
          art: { bg: 'space', o: { planet: true }, baby: [120, 150, 0.85, 'up'], friend: [300, 206, 44], props: [['🚀', 214, 120, 96, 'float']] }
        },
        {
          t: '달님이 은빛 사다리를 내려 주었어요. 영차, 영차! 사다리를 오르니 까만 우주에 별들이 반짝반짝 빛나고 있었어요.',
          art: { bg: 'space', o: { ground: 'moon' }, baby: [170, 142, 1, 'up'], friend: [266, 204, 48], props: [['🌙', 320, 70, 60, 'float']] }
        }
      ],
      trips: [
        {
          t: '달에 내려앉았어요. 한 걸음 걸었더니 몸이 붕— 떠올랐어요. 콩, 붕, 콩, 붕! {name:은/는} 달 위에서 깡충깡충 뛰어다녔어요.',
          art: { bg: 'space', o: { ground: 'moon' }, baby: [170, 100, 1, 'up'], friend: [272, 204, 48] }
        },
        {
          t: '반짝이는 별들이 여기저기 둥둥 떠 있었어요. {name:은/는} 바구니에 별을 하나, 둘, 셋 담았어요. 바구니가 반짝반짝 빛났어요.',
          art: {
            bg: 'space', baby: [160, 150, 1], hold: '🧺', friend: [262, 206, 48],
            props: [['⭐', 80, 80, 26, 'twinkle'], ['⭐', 140, 50, 20, 'twinkle'], ['⭐', 300, 90, 28, 'twinkle'], ['⭐', 350, 150, 20, 'twinkle']]
          }
        },
        {
          t: '고리가 달린 행성에 도착했어요. 행성의 고리는 커다란 미끄럼틀이었어요. 빙글빙글 슈우웅~ "한 번 더!"',
          art: { bg: 'space', o: { planet: 'big' }, baby: [120, 120, 0.9, 'up'], friend: [70, 216, 42] }
        },
        {
          t: '초록색 외계인 친구 뿌뿌를 만났어요. 뿌뿌는 인사할 때 손가락을 세 번 흔든대요. {name}도 손가락을 흔들며 "안녕, 뿌뿌!"',
          art: { bg: 'space', o: { ground: 'moon' }, baby: [160, 142, 1, 'up'], friend: [70, 214, 40], props: [['👽', 290, 200, 56, 'float']] }
        },
        {
          t: '슈욱— 별똥별이 지나갔어요. "소원을 빌어 봐!" {name:은/는} 두 눈을 꼭 감고 소원을 빌었어요. 무슨 소원이었을까요?',
          art: { bg: 'space', o: { ground: 'moon' }, baby: [150, 142, 1], friend: [250, 204, 48], comet: [80, 40, 300, 110] }
        }
      ],
      troubles: [
        {
          t: '작은 별 하나가 빛을 잃고 시무룩해 있었어요. "이제 반짝일 수가 없어…"',
          art: { bg: 'space', baby: [140, 150, 1], friend: [228, 206, 46], props: [['⭐', 312, 150, 36, 'dim']] },
          fixes: [
            {
              t: '{name:이/가} 작은 별을 두 손으로 감싸고 "넌 할 수 있어!" 하고 속삭였어요. 그러자 작은 별이 다시 반짝, 반짝 빛나기 시작했어요.',
              art: { bg: 'space', baby: [150, 150, 1, 'up'], friend: [246, 206, 46], props: [['🌟', 310, 110, 48, 'twinkle'], ['✨', 270, 80, 20, 'twinkle']] }
            },
            {
              t: '{name:과/와} {f:은/는} 작은 별에게 뽀뽀를 쪽! 해 주었어요. 작은 별이 부끄러워하며 누구보다 환하게 빛났어요.',
              art: { bg: 'space', baby: [150, 150, 1], friend: [246, 206, 46], props: [['🌟', 312, 120, 50, 'twinkle'], ['💛', 214, 96, 22, 'float']] }
            }
          ]
        },
        {
          t: '달토끼가 떡을 만들 방망이를 잃어버렸대요. "이게 없으면 떡을 만들 수 없어…" 달토끼의 귀가 축 늘어졌어요.',
          art: { bg: 'space', o: { ground: 'moon' }, baby: [140, 142, 1], friend: [222, 204, 44], props: [['🐇', 314, 214, 50], ['💧', 334, 190, 14, 'float']] },
          fixes: [
            {
              t: '{name:은/는} 반짝이는 별빛으로 달 구석구석을 비춰 보았어요. "찾았다!" 방망이는 커다란 구덩이 안에 숨어 있었어요.',
              art: { bg: 'space', o: { ground: 'moon' }, baby: [150, 142, 1, 'up'], hold: '⭐', friend: [64, 210, 40], props: [['🐇', 300, 212, 50, 'float'], ['✨', 250, 160, 20, 'twinkle']] }
            },
            {
              t: '{f:이/가} 커다란 별 막대를 찾아왔어요. "이걸로 해 봐!" 쿵덕쿵덕, 별 막대로 찧은 떡은 반짝반짝 빛이 났어요.',
              art: { bg: 'space', o: { ground: 'moon' }, baby: [140, 142, 1, 'up'], friend: [222, 204, 44], props: [['🐇', 312, 212, 50, 'float'], ['🍡', 276, 240, 28]] }
            }
          ]
        }
      ],
      gifts: [
        {
          t: '별들이 고마워하며 작은 별 하나를 선물했어요. "밤에 무서우면 나를 봐. 내가 반짝반짝 비춰 줄게."',
          art: { bg: 'space', baby: [170, 150, 1, 'up'], hold: '🌟', friend: [272, 206, 50], props: [['⭐', 80, 90, 24, 'twinkle'], ['⭐', 330, 70, 20, 'twinkle']] }
        },
        {
          t: '달님이 고맙다며 동글동글 달떡을 건네주었어요. 한 입 먹으니 입안 가득 달콤한 달빛 맛이 났어요.',
          art: { bg: 'space', o: { ground: 'moon' }, baby: [170, 142, 1], hold: '🍡', friend: [272, 204, 50], props: [['🌙', 320, 70, 54, 'float']] }
        }
      ]
    }
  ];

  // ---- 조합기 ----

  // 작고 빠른 seed 난수 (같은 seed → 같은 순서)
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function pick(rng, list) {
    return list[Math.floor(rng() * list.length)];
  }

  function pickSome(rng, list, count) {
    const copy = list.slice();
    for (let i = 0; i < count; i++) {
      const j = i + Math.floor(rng() * (copy.length - i));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy.slice(0, count);
  }

  function byId(list, id) {
    return list.find((item) => item.id === id) || null;
  }

  // '아무나'를 골라도 난수를 똑같이 한 번 쓰게 해서, 고른 값이 바뀌어도 나머지 쪽은 그대로 나오게 해요.
  function choose(rng, list, id) {
    const random = pick(rng, list);
    return byId(list, id) || random;
  }

  function clean(text, max) {
    return String(text || '').replace(/\s+/g, ' ').trim().slice(0, max);
  }

  function fill(template, vars) {
    return template.replace(/\{(\w+)(?::([^}]+))?\}/g, (_, key, pair) => {
      if (!(key in vars)) throw new Error('모르는 자리표시자: ' + key);
      return pair ? FT.josa(vars[key], pair) : vars[key];
    });
  }

  function withTime(art, time) {
    return Object.assign({}, art, { o: Object.assign({ t: time }, art.o) });
  }

  /**
   * @param {{name?: string, from?: string, animal?: string, world?: string, outfit?: string}} input
   *   animal, world가 없거나 'any'면 seed로 골라요.
   * @param {number} seed
   */
  function makeStory(input, seed) {
    const rng = mulberry32(seed);
    const animal = choose(rng, ANIMALS, input.animal);
    const world = choose(rng, WORLDS, input.world);
    const outfit = byId(OUTFITS, input.outfit) || OUTFITS[0];
    const friendName = pick(rng, FRIEND_NAMES);
    const name = clean(input.name, 10) || DEFAULT_NAME;
    const from = clean(input.from, 12) || DEFAULT_FROM;

    const vars = {
      name: FT.nameForm(name),
      call: FT.callForm(name),
      from,
      f: friendName,
      fw: animal.word,
      fmove: animal.move,
      flook: animal.look,
      outfit: outfit.word
    };

    const opening = pick(rng, OPENINGS);
    const meet = pick(rng, MEETS);
    const portal = pick(rng, world.portals);
    const trips = pickSome(rng, world.trips, 2);
    const trouble = pick(rng, world.troubles);
    const fix = pick(rng, trouble.fixes);
    const gift = pick(rng, world.gifts);
    const back = pick(rng, BACKS.filter((b) => !b.time || b.time === opening.time));
    const ending = pick(rng, ENDINGS);
    const title = fill(pick(rng, world.titles), vars);

    const page = (template, art) => ({ kind: 'story', text: fill(template, vars), art });

    return {
      title,
      pages: [
        { kind: 'cover', title, sub: fill(COVER_SUB, vars), art: world.cover },
        page(opening.t, withTime(OPENING_ART, opening.time)),
        page(meet, withTime(MEET_ART, opening.time)),
        page(portal.t, portal.art),
        page(trips[0].t, trips[0].art),
        page(trips[1].t, trips[1].art),
        page(trouble.t, trouble.art),
        page(fix.t, fix.art),
        page(gift.t, gift.art),
        page(back.t, BACK_ART),
        { kind: 'end', text: fill(ending, vars), art: END_ART }
      ],
      meta: { seed, animal: animal.id, emoji: animal.emoji, world: world.id, outfit: outfit.id, friend: friendName, name, from }
    };
  }

  FT.DEFAULT_NAME = DEFAULT_NAME;
  FT.DEFAULT_FROM = DEFAULT_FROM;
  FT.ANIMALS = ANIMALS;
  FT.WORLDS = WORLDS;
  FT.OUTFITS = OUTFITS;
  FT.outfitById = (id) => byId(OUTFITS, id) || OUTFITS[0];
  FT.makeStory = makeStory;
})(typeof globalThis !== 'undefined' ? globalThis : this);
