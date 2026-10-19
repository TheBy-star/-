// WebGL2 模拟执行：在 Node 里跑一遍场景脚本，捕获初始化阶段的 API 误用
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const file = process.argv[2];
const html = fs.readFileSync(file, 'utf8');
let js = html.match(/<script>([\s\S]*)<\/script>/)[1];
// 追加两帧渲染测试，验证整条绘制管线
js += "\n;try{ renderFrame(16.7); renderFrame(33.4); console.log('[FRAME] 首帧与次帧渲染通过'); }catch(e){ console.log('[FRAME] 渲染异常: ' + (e && e.stack ? e.stack.split('\\n').slice(0,10).join('\\n') : e)); }";

const GL_CONST = {
  ACTIVE_UNIFORMS: 35718, ARRAY_BUFFER: 34962, BLEND: 3042, CLAMP_TO_EDGE: 33071,
  COLOR_ATTACHMENT0: 36064, COLOR_BUFFER_BIT: 16384, COMPARE_REF_TO_TEXTURE: 34894,
  COMPILE_STATUS: 35713, CULL_FACE: 2884, DEPTH_ATTACHMENT: 36096, DEPTH_BUFFER_BIT: 256,
  DEPTH_COMPONENT: 6402, DEPTH_COMPONENT24: 33190, DEPTH_TEST: 2929, ELEMENT_ARRAY_BUFFER: 34963,
  FLOAT: 5126, FRAGMENT_SHADER: 35632, FRAMEBUFFER: 36160, FRAMEBUFFER_COMPLETE: 36053,
  HALF_FLOAT: 5131, LEQUAL: 515, LESS: 513, LINEAR: 9729, LINK_STATUS: 35714,
  MAX_TEXTURE_SIZE: 3379, MAX_VARYING_VECTORS: 36348, NONE: 0, ONE: 1, POINTS: 0,
  POLYGON_OFFSET_FILL: 32823, RENDERBUFFER: 36161, RENDERER: 7937, RGBA: 6408,
  RGBA16F: 34842, RGBA8: 32856, STATIC_DRAW: 35044, TEXTURE_2D: 3553,
  TEXTURE_COMPARE_FUNC: 34893, TEXTURE_COMPARE_MODE: 34892, TEXTURE_MAG_FILTER: 10240,
  TEXTURE_MIN_FILTER: 10241, TEXTURE_WRAP_S: 10242, TEXTURE_WRAP_T: 10243, TEXTURE0: 33984,
  TRIANGLES: 4, UNSIGNED_BYTE: 5121, UNSIGNED_INT: 5125, VENDOR: 7936, VERSION: 7938,
  VERTEX_SHADER: 35633
};

const calls = [];
const gl = new Proxy({}, {
  get(t, prop) {
    if (prop in GL_CONST) return GL_CONST[prop];
    if (prop in t) return t[prop];
    return function (...args) {
      calls.push(prop);
      const name = String(prop);
      if (name === 'getParameter') return 16384;
      if (name === 'getExtension') return {};
      if (name === 'getShaderParameter' || name === 'getProgramParameter') return true;
      if (name === 'getShaderInfoLog' || name === 'getProgramInfoLog') return '';
      if (name === 'getActiveUniform') return { name: 'uX', type: 0 };
      if (name === 'getUniformLocation') return {};
      if (name === 'checkFramebufferStatus') return GL_CONST.FRAMEBUFFER_COMPLETE;
      if (name === 'createShader' || name === 'createProgram' || name === 'createBuffer' ||
          name === 'createTexture' || name === 'createFramebuffer' || name === 'createRenderbuffer' ||
          name === 'createVertexArray') return { id: name };
      if (name === 'getAttribLocation') return 0;
      return undefined;
    };
  }
});

function el(id) {
  return {
    id,
    style: {},
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    getContext: () => gl,
    addEventListener() {},
    setPointerCapture() {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 1600, height: 900 }),
    querySelector: () => el('inner'),
    appendChild() {},
    textContent: '',
    innerHTML: ''
  };
}

const documentMock = {
  getElementById: el,
  createElement: el,
  documentElement: el('html'),
  addEventListener() {},
  body: el('body'),
  fullscreenElement: null
};

const windowMock = {
  innerWidth: 1600, innerHeight: 900, devicePixelRatio: 1,
  addEventListener() {}, requestAnimationFrame() { return 1; },
  location: { search: '' }, document: documentMock,
  performance: { now: () => 0 }, console
};

const sandbox = {
  window: windowMock,
  document: documentMock,
  location: { search: '' },
  navigator: { userAgent: 'node-mock' },
  console,
  requestAnimationFrame: () => 1,
  setTimeout: () => 0,
  performance: { now: () => 0 },
  URLSearchParams,
  Float32Array, Uint32Array, Uint8Array, Math, JSON, Number, String, Boolean, Array, Object, Error,
  gl: undefined
};

let failed = null;
try {
  vm.createContext(sandbox);
  vm.runInContext(js, sandbox, { filename: 'scene.js', timeout: 20000 });
} catch (e) {
  failed = e;
}

const uniq = [...new Set(calls)].sort();
console.log('GL 调用总数:', calls.length, ' 不同方法:', uniq.length);
console.log('方法列表:', uniq.join(', '));

if (failed) {
  console.log('\n=== 执行失败 ===');
  console.log(failed && failed.stack ? failed.stack.split('\n').slice(0, 8).join('\n') : failed);
  process.exit(1);
} else {
  console.log('\n=== 初始化脚本执行通过（无 JS 异常）===');
  const need = ['framebufferTexture2D', 'renderbufferStorage', 'drawElementsInstanced', 'vertexAttribDivisor', 'checkFramebufferStatus'];
  const miss = need.filter(n => !uniq.includes(n));
  console.log('关键 API 是否都被调用:', miss.length ? ('缺少 ' + miss.join(',')) : '全部命中');
}
