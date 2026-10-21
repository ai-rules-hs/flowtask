/*
 * 고른 사진에서 아기 얼굴 부분을 동그랗게 잘라 냅니다.
 * 손가락으로 끌어서 옮기고, 두 손가락이나 막대로 크기를 맞춰요. 모든 처리는 기기 안에서만 해요.
 */
(function (root) {
  'use strict';
  const FT = (root.FT = root.FT || {});

  const WORK_MAX = 1600; // 큰 사진은 이 크기로 줄여서 다뤄요
  const OUT_SIZE = 480; // 저장하는 얼굴 사진 한 변(px)
  const HOLE = 0.78; // 캔버스 너비 대비 동그라미 지름
  const MAX_ZOOM = 4;

  function loadImage(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('사진을 열 수 없어요'));
      };
      img.src = url;
    });
  }

  class Cropper {
    constructor(canvas, zoomInput) {
      this.canvas = canvas;
      this.zoomInput = zoomInput;
      this.ctx = canvas.getContext('2d');
      this.src = null;
      this.zoom = 1;
      this.ox = 0; // 사진 중심이 캔버스 중심에서 벗어난 거리(캔버스 px)
      this.oy = 0;
      this.pointers = new Map();
      this.pinch = null;

      canvas.addEventListener('pointerdown', (e) => this.down(e));
      canvas.addEventListener('pointermove', (e) => this.move(e));
      canvas.addEventListener('pointerup', (e) => this.up(e));
      canvas.addEventListener('pointercancel', (e) => this.up(e));
      canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        this.setZoom(this.zoom * (e.deltaY < 0 ? 1.08 : 1 / 1.08));
      }, { passive: false });
      zoomInput.addEventListener('input', () => this.setZoom(parseFloat(zoomInput.value)));
    }

    async load(file) {
      const img = await loadImage(file);
      const k = Math.min(1, WORK_MAX / Math.max(img.naturalWidth, img.naturalHeight));
      const work = document.createElement('canvas');
      work.width = Math.max(1, Math.round(img.naturalWidth * k));
      work.height = Math.max(1, Math.round(img.naturalHeight * k));
      work.getContext('2d').drawImage(img, 0, 0, work.width, work.height);
      this.src = work;
      this.zoom = 1;
      this.ox = 0;
      this.oy = 0;
      this.zoomInput.value = '1';
    }

    // 캔버스가 화면에 보인 뒤에 불러서 실제 크기에 맞춰요.
    layout() {
      const old = this.canvas.width;
      const css = this.canvas.getBoundingClientRect().width || 280;
      const size = Math.round(css * Math.min(window.devicePixelRatio || 1, 3));
      this.canvas.width = this.canvas.height = size;
      if (old) {
        this.ox *= size / old;
        this.oy *= size / old;
      }
      this.draw();
    }

    get hole() {
      return this.canvas.width * HOLE;
    }

    // 사진 1px이 캔버스에서 차지하는 크기. zoom 1이면 짧은 변이 동그라미에 꼭 맞아요.
    get scale() {
      return (this.hole / Math.min(this.src.width, this.src.height)) * this.zoom;
    }

    clamp() {
      const s = this.scale;
      const mx = Math.max(0, (this.src.width * s - this.hole) / 2);
      const my = Math.max(0, (this.src.height * s - this.hole) / 2);
      this.ox = Math.max(-mx, Math.min(mx, this.ox));
      this.oy = Math.max(-my, Math.min(my, this.oy));
    }

    setZoom(z) {
      if (!this.src) return;
      this.zoom = Math.max(1, Math.min(MAX_ZOOM, z || 1));
      this.zoomInput.value = String(this.zoom);
      this.clamp();
      this.draw();
    }

    down(e) {
      if (!this.src) return;
      if (this.canvas.setPointerCapture) this.canvas.setPointerCapture(e.pointerId);
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this.pointers.size === 2) {
        const [a, b] = [...this.pointers.values()];
        this.pinch = { dist: Math.hypot(a.x - b.x, a.y - b.y) || 1, zoom: this.zoom };
      }
    }

    move(e) {
      const p = this.pointers.get(e.pointerId);
      if (!p) return;
      const dx = e.clientX - p.x;
      const dy = e.clientY - p.y;
      p.x = e.clientX;
      p.y = e.clientY;
      if (this.pinch && this.pointers.size === 2) {
        const [a, b] = [...this.pointers.values()];
        this.setZoom(this.pinch.zoom * (Math.hypot(a.x - b.x, a.y - b.y) / this.pinch.dist));
      } else if (this.pointers.size === 1) {
        const ratio = this.canvas.width / (this.canvas.getBoundingClientRect().width || 1);
        this.ox += dx * ratio;
        this.oy += dy * ratio;
        this.clamp();
        this.draw();
      }
    }

    up(e) {
      this.pointers.delete(e.pointerId);
      if (this.pointers.size < 2) this.pinch = null;
    }

    draw() {
      const { ctx } = this;
      const W = this.canvas.width;
      ctx.clearRect(0, 0, W, W);
      if (!this.src) return;
      const s = this.scale;
      const c = W / 2;
      const r = this.hole / 2;
      ctx.drawImage(this.src, c + this.ox - (this.src.width * s) / 2, c + this.oy - (this.src.height * s) / 2, this.src.width * s, this.src.height * s);
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, W, W);
      ctx.arc(c, c, r, 0, Math.PI * 2, true);
      ctx.fillStyle = 'rgba(20, 19, 44, 0.62)';
      ctx.fill('evenodd');
      ctx.beginPath();
      ctx.arc(c, c, r, 0, Math.PI * 2);
      ctx.lineWidth = Math.max(2, W / 120);
      ctx.strokeStyle = '#FFFFFF';
      ctx.setLineDash([W / 40, W / 60]);
      ctx.stroke();
      ctx.restore();
    }

    // 동그라미 안쪽을 정사각형 JPEG로 내보내요 (동그랗게 오리는 건 그림에서 해요).
    result() {
      const out = document.createElement('canvas');
      out.width = out.height = OUT_SIZE;
      const W = this.canvas.width;
      const s = this.scale;
      const x0 = W / 2 - this.hole / 2;
      const f = OUT_SIZE / this.hole;
      const g = out.getContext('2d');
      g.fillStyle = '#FFFFFF';
      g.fillRect(0, 0, OUT_SIZE, OUT_SIZE);
      g.imageSmoothingQuality = 'high';
      g.drawImage(
        this.src,
        (W / 2 + this.ox - (this.src.width * s) / 2 - x0) * f,
        (W / 2 + this.oy - (this.src.height * s) / 2 - x0) * f,
        this.src.width * s * f,
        this.src.height * s * f
      );
      return out.toDataURL('image/jpeg', 0.86);
    }
  }

  FT.Cropper = Cropper;
})(typeof globalThis !== 'undefined' ? globalThis : this);
