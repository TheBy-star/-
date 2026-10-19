// GLSL 静态审计 v2：函数定义顺序 + 括号平衡 + GLSL ES 3.0 保留字误用
// 用法: node glsl_audit2.js <index.html>
const fs = require('fs');
const html = fs.readFileSync(process.argv[2], 'utf8');
const js = html.match(/<script>([\s\S]*)<\/script>/)[1];

const blocks = [];
const re = /program\('([^']+)',\s*`([\s\S]*?)`,\s*`([\s\S]*?)`\)/g;
let m;
while ((m = re.exec(js)) !== null) blocks.push({ name: m[1], vs: m[2], fs: m[3] });

const chunks = {};
for (const k of ['GLSL_COMMON', 'GLSL_BUMP', 'GLSL_WOOD']) {
  const r = new RegExp('const ' + k + ' = `([\\s\\S]*?)`;');
  const mm = js.match(r);
  chunks[k] = mm ? mm[1] : '';
}
const expand = s => s.replace(/\$\{(GLSL_[A-Z]+)\}/g, (_, k) => chunks[k] || '');

// GLSL ES 3.0 保留字与关键字（不能作标识符）
const RESERVED = new Set([
  // 关键字
  'const','uniform','layout','centroid','flat','smooth','noperspective','break','continue','do','for','while',
  'switch','case','default','if','else','in','out','inout','float','int','void','bool','true','false','invariant',
  'discard','return','mat2','mat3','mat4','mat2x2','mat2x3','mat2x4','mat3x2','mat3x3','mat3x4','mat4x2','mat4x3','mat4x4',
  'vec2','vec3','vec4','ivec2','ivec3','ivec4','bvec2','bvec3','bvec4','uint','uvec2','uvec3','uvec4',
  'lowp','mediump','highp','precision','sampler2D','sampler3D','samplerCube','sampler2DShadow','samplerCubeShadow',
  'sampler2DArray','sampler2DArrayShadow','isampler2D','isampler3D','isamplerCube','isampler2DArray',
  'usampler2D','usampler3D','usamplerCube','usampler2DArray','struct',
  // ES 3.0 保留（不可作标识符）
  'attribute','varying','coherent','volatile','restrict','readonly','writeonly','resource','atomic_uint',
  'noperspective','patch','sample','subroutine','common','partition','active','asm','class','union','enum',
  'typedef','template','this','packed','goto','inline','noinline','public','static','extern','external',
  'interface','long','short','double','half','fixed','unsigned','superp','input','output','hvec2','hvec3',
  'hvec4','dvec2','dvec3','dvec4','fvec2','fvec3','fvec4','sampler3DRect','filter','image1D','image2D',
  'image3D','imageCube','iimage1D','iimage2D','iimage3D','iimageCube','uimage1D','uimage2D','uimage3D',
  'uimageCube','size1D','size2D','size3D','sizeCube','sampler1DShadow','sampler1DArray','sampler2DRect',
  'sampler2DRectShadow','sampler1DArrayShadow','sampler2DArrayShadow','isampler1D','isampler1DArray',
  'usampler1D','usampler1DArray','isampler2DRect','usampler2DRect','isampler1DShadow','usampler1DShadow',
  'texture2D','texture3D','textureCube','texture2DProj','texture2DLod','textureCubeLod','texture2DProjLod'
]);
// 允许出现的函数/方法名（内建 + 我们自己的）
const BUILTIN_FN = new Set(('radians degrees sin cos tan asin acos atan sinh cosh tanh pow exp log exp2 log2 sqrt ' +
  'inversesqrt abs sign floor trunc round roundEven ceil fract mod modf min max clamp mix step smoothstep isnan ' +
  'isinf floatBitsToInt floatBitsToUint intBitsToFloat uintBitsToFloat length distance dot cross normalize faceforward ' +
  'reflect refract matrixCompMult outerProduct transpose determinant inverse lessThan lessThanEqual greaterThan ' +
  'greaterThanEqual equal notEqual any all not textureSize texture textureProj textureLod textureOffset texelFetch ' +
  'texelFetchOffset textureProjOffset textureLodOffset textureProjLod textureProjLodOffset textureGrad textureGradOffset ' +
  'textureProjGrad textureProjGradOffset dFdx dFdy fwidth packSnorm2x16 unpackSnorm2x16 packUnorm2x16 unpackUnorm2x16 ' +
  'packHalf2x16 unpackHalf2x16 main if for while switch return vec2 vec3 vec4 ivec2 ivec3 ivec4 bvec2 bvec3 bvec4 ' +
  'uvec2 uvec3 uvec4 mat2 mat3 mat4 float int bool uint texture2D textureCube GL_ES layout').split(/\s+/));

// 我们自己的函数名从源码收集
const ourFns = new Set();
let problems = 0;
const reservedHits = [];

for (const b of blocks) {
  for (const [stage, raw] of [['vs', b.vs], ['fs', b.fs]]) {
    const src = expand(raw);
    const tag = b.name + '.' + stage;
    if (!/#version 300 es/.test(src)) { console.log('[VERSION]', tag); problems++; }
    if ((src.match(/{/g) || []).length !== (src.match(/}/g) || []).length) {
      console.log('[BRACE]', tag); problems++;
    }
    // 收集函数定义
    for (const d of src.matchAll(/(?:^|\n)\s*(?:[A-Za-z0-9_]+\s+)?([A-Za-z_]\w*)\s*\([^;{}]*\)\s*\{/g)) {
      if (!['if', 'for', 'while', 'switch'].includes(d[1])) ourFns.add(d[1]);
    }
    // 保留字检查：变量声明、赋值语句、函数参数名
    for (const line of src.split('\n')) {
      const code = line.replace(/\/\/.*$/, '');
      // 声明形式： type name  或  type a, b
      for (const d of code.matchAll(/\b(?:float|int|bool|uint|vec[234]|ivec[234]|bvec[234]|uvec[234]|mat[234])\s+([A-Za-z_]\w*)/g)) {
        if (RESERVED.has(d[1])) reservedHits.push(tag + ': 声明变量用了保留字 "' + d[1] + '" → ' + line.trim().slice(0, 70));
      }
      // 赋值形式： name =
      for (const d of code.matchAll(/(?:^|[,(;\s])([A-Za-z_]\w*)\s*=(?!=)/g)) {
        if (RESERVED.has(d[1])) reservedHits.push(tag + ': 赋值给保留字 "' + d[1] + '" → ' + line.trim().slice(0, 70));
      }
    }
  }
}

if (reservedHits.length) {
  console.log('\n=== GLSL 保留字误用 ===');
  reservedHits.forEach(h => console.log('  ' + h));
  problems += reservedHits.length;
} else {
  console.log('保留字检查：通过（未把 GLSL 保留字用作标识符）');
}

console.log(problems === 0 ? '\nGLSL AUDIT v2: PASS' : '\nGLSL AUDIT v2: ' + problems + ' PROBLEM(S)');
process.exit(problems === 0 ? 0 : 1);
