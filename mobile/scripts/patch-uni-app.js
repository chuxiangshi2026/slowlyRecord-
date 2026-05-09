#!/usr/bin/env node
/**
 * 自动修复 uni-app 与 Vue 3.4+ 的兼容性问题
 * 为缺失的 injectHook 和 isInSSRComponentSetup 注入 polyfill
 */

const fs = require('fs');
const path = require('path');

const NODE_MODULES = path.join(__dirname, '..', 'node_modules');

// 需要 patch 的包
const PACKAGES = [
  '@dcloudio/uni-app',
  '@dcloudio/uni-h5',
  '@dcloudio/uni-mp-weixin',
  '@dcloudio/uni-app-plus',
  '@dcloudio/uni-components',
];

// ESM 格式的 polyfill
const ESM_POLYFILL = `
// --- Vue 3.4+ polyfill start ---
let isInSSRComponentSetup = false;
function injectHook(type, hook, target = getCurrentInstance(), prepend = false) {
  if (!target) return;
  const hooks = target[type] || (target[type] = []);
  if (prepend) hooks.unshift(hook); else hooks.push(hook);
  return hook;
}
function logError(err, type, contextVNode, throwInDev = true) {
  console.error(\`[Vue \${type}]: \${err.message || err}\`, contextVNode);
}
const onBeforeActivate = (fn) => injectHook("ba", fn);
const onBeforeDeactivate = (fn) => injectHook("bd", fn);
// --- Vue 3.4+ polyfill end ---
`;

// CJS 格式的 polyfill
const CJS_POLYFILL = `
// --- Vue 3.4+ polyfill start ---
if (!vue.isInSSRComponentSetup) {
  vue.isInSSRComponentSetup = false;
}
if (!vue.injectHook) {
  vue.injectHook = function(type, hook, target, prepend) {
    if (!target) target = vue.getCurrentInstance();
    if (!target) return;
    var hooks = target[type] || (target[type] = []);
    if (prepend) hooks.unshift(hook); else hooks.push(hook);
    return hook;
  };
}
if (!vue.logError) {
  vue.logError = function(err, type, contextVNode, throwInDev) {
    console.error('[Vue ' + type + ']: ' + (err.message || err), contextVNode);
  };
}
// --- Vue 3.4+ polyfill end ---
`;

function patchFile(filePath) {
  if (!fs.existsSync(filePath)) return false;
  
  let content = fs.readFileSync(filePath, 'utf-8');
  let modified = false;
  
  // 检查是否已经 patch 过
  if (content.includes('Vue 3.4+ polyfill')) return false;
  
  // 检查是否需要 patch
  if (!content.includes('injectHook') && !content.includes('isInSSRComponentSetup') && !content.includes('logError')) {
    return false;
  }
  
  // ESM 格式
  if (filePath.endsWith('.es.js') || filePath.endsWith('.mjs')) {
    // 移除从 vue 的导入
    content = content.replace(
      /import\s*\{([^}]*)\}\s*from\s*['"]vue['"];?/g,
      (match, importsStr) => {
        const imports = importsStr.split(',').map(s => s.trim()).filter(s => s && s !== 'injectHook' && s !== 'isInSSRComponentSetup' && s !== 'logError' && s !== 'onBeforeActivate' && s !== 'onBeforeDeactivate');
        if (imports.length === 0) return '';
        return `import { ${imports.join(', ')} } from "vue";`;
      }
    );
    
    // 在文件开头添加 polyfill
    if (content.includes('// --- Vue 3.4+ polyfill')) {
      // 已经处理过
    } else {
      content = ESM_POLYFILL + '\n' + content;
      modified = true;
    }
  }
  
  // CJS 格式
  if (filePath.endsWith('.cjs.js') || filePath.endsWith('.cjs')) {
    if (!content.includes('// --- Vue 3.4+ polyfill')) {
      const lines = content.split('\n');
      const vueRequireIndex = lines.findIndex(line => line.includes("require('vue')") || line.includes('require("vue")'));
      if (vueRequireIndex >= 0) {
        lines.splice(vueRequireIndex + 1, 0, CJS_POLYFILL);
        content = lines.join('\n');
        modified = true;
      }
    }
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log('✓ Patched:', filePath.replace(NODE_MODULES, ''));
    return true;
  }
  
  return false;
}

function patchPackage(pkgName) {
  const pkgPath = path.join(NODE_MODULES, pkgName);
  if (!fs.existsSync(pkgPath)) {
    console.log('✗ Not found:', pkgName);
    return;
  }
  
  const distPath = path.join(pkgPath, 'dist');
  if (!fs.existsSync(distPath)) return;
  
  const files = fs.readdirSync(distPath);
  let patched = 0;
  
  for (const file of files) {
    if (file.endsWith('.js') || file.endsWith('.mjs')) {
      const filePath = path.join(distPath, file);
      if (patchFile(filePath)) {
        patched++;
      }
    }
  }
  
  if (patched === 0) {
    console.log('○ No patch needed:', pkgName);
  }
}

console.log('Patching uni-app for Vue 3.4+ compatibility...\n');

for (const pkg of PACKAGES) {
  patchPackage(pkg);
}

console.log('\nDone! You can now run: npm run build:mp-weixin');
