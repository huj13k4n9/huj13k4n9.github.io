---
title: CNSS Recruit 2019 WriteUp
date: 2019-09-23 14:20:13
categories:
  - CTF
tags:
  - Web
  - Misc
---

# Web部分

## True_check_in

题目链接：[http://144.202.82.121:23333/](http://144.202.82.121:23333/)

![](https://hujiekang.top/images/uploads/big/d106316ae35d230014255ef741563c84.jpg)

<!-- more -->

看到题肯定就先按要求来咯。先算了一下 `2` 的 `33` 次方等于多少：

![](https://hujiekang.top/images/uploads/big/8c5672923d765d225a2d463ac1a6c9a5.jpg)

填入结果发现问题：输入框限制了字符串长度，导致了不能够将结果 `8589934592` 直接输入提交。

![](https://hujiekang.top/images/uploads/big/2282a7630689a0cb9d427a860fdc0b19.jpg)

尝试传入错误结果，返回 wrong。

![](https://hujiekang.top/images/uploads/big/ad9cb0ac90dba9794a13c207351f6551.jpg)

于是尝试使用 BurpSuite 进行抓包，截获请求头：

![](https://hujiekang.top/images/uploads/big/7dcaed2dd2dcded1b071bd643a6a5ab6.jpg)

发现用户输入的结果是通过 `answer` 的值使用 `POST` 方法传至服务器的，遂通过 BurpSuite 直接修改 `answer` 的值为 `8589934592`，然后提交请求，得到 flag：

![](https://hujiekang.top/images/uploads/big/f2ca1bda8c4e4b2213a3d2dfbb6d4e32.jpg)

---

## check_in

题目链接：[http://47.107.115.177:2333/](http://47.107.115.177:2333/)

![](https://hujiekang.top/images/uploads/big/f55fc3b77d9702e0ec1f6ec26650033a.jpg)

打开页面，发现只有这么一句话，查看源代码没发现什么猫腻，因为源代码也只有这一句话...
再打开审查元素界面看看请求头和响应头，发现了一个陌生的面孔 `ETag` ：

![](https://hujiekang.top/images/uploads/big/24fdf56d09398a9eb76bf90f1578891e.jpg)

以下是 Wikipedia 对`ETag`的解释：

> `ETag` 是 `HTTP` 协议提供的若干机制中的一种 Web 缓存验证机制，并且允许客户端进行缓存协商。这就使得缓存变得更加高效，而且节省带宽。如果资源的内容没有发生改变，Web 服务器就不需要发送一个完整的响应。<br> 
> `ETag` 是一个不透明的标识符，由 Web 服务器根据 URL 上的资源的特定版本而指定。如果那个 URL 上的资源内容改变，一个新的不一样的 `ETag` 就会被分配。用这种方法使用 `ETag` 即类似于指纹，并且他们能够被快速地被比较，以确定两个版本的资源是否相同。<br>
> 如果 `ETag` 值匹配，这就意味着资源没有改变，服务器便会发送回一个极短的响应，包含 `HTTP “304 未修改”` 的状态。 `304` 状态告诉客户端，它的缓存版本是最新的，并应该使用它。

定睛一看，上面的 `HTTP` 状态码就是 `304`。那么更多的页面信息会不会在缓存里面呢？

打开浏览器缓存目录，找到了该页面的 5 个缓存文件：

![](https://hujiekang.top/images/uploads/big/94c4c749c94b605d12d4273ef4d86728.jpg)

逐个打开，在 `data_1` 文件中的某一堆乱码和空白里面找到了这样一行注释：

![](https://hujiekang.top/images/uploads/big/14b939dd16acbf114eba17f834ac3048.jpg)

访问 `http://47.107.115.177:2333/secret/f1ag_is_h4re.php` ，页面和源代码还是只有一句话...
打开审查元素界面，在该页面的 Cookie 里面发现了一些有趣的东西：

![](https://hujiekang.top/images/uploads/big/3ee7f713bda2697caba91831278e83ab.jpg)

这一串字符像是一段经过编码了的字符。尝试使用 `base64` 解码试试：

![](https://hujiekang.top/images/uploads/big/f6536cad18bb24734016f9a25c318355.jpg)

直接拿到 flag：`cnss{welcome_to_web_W0rld!}`

---

## warm_up

题目链接：[http://47.107.115.177:7779/](http://47.107.115.177:7779/)

打开网页，提示找不到网页，审查元素中返回响应代码 404：

![](https://hujiekang.top/images/uploads/big/a4eaabdee73c3d6c95365524ce6ad61d.jpg)

发现题目介绍页有这样一段文字：

> 使用 `cnss` 浏览器，在 `IP` 为 `233.233.233.233` 处从 `www.notcnss.com` 访问就能得到你想要的 :)

这段话中，`cnss` 浏览器、`IP` 以及这个域名显然都是不存在的或是无法访问的。那么为了满足这些要求，很容易想到可以通过修改 `HTTP` 请求头来实现。

这三个条件分别对应请求头中的三个字段：

- `cnss` 浏览器：`User-Agent`
- 从 `www.notcnss.com` 访问：`Referer`，该项表示浏览器是从哪个网页来到这个网页的。
- `IP` 为 `233.233.233.233`：查阅资料知，可以利用 `Client-Ip` 或 `X-Forwarded-For` 两个字段来伪装 `IP` 地址。第一个字段很容易知道代表的就是客户端的 `IP`；第二个字段 `X-Forwarded-For（XFF）`是用来识别通过 `HTTP` 代理或负载均衡方式连接到 Web 服务器的客户端**最原始的 `IP` 地址**的 `HTTP` 请求头字段。

于是使用 Burpsuite 抓包修改请求头如下：

![](https://hujiekang.top/images/uploads/big/463b0c9c8d3a06216d63eb219915ba73.jpg)

单击 Forward 提交修改后的请求，得到 flag：`cnss{my_co0l_cool_cnss_browser}`

---

## Gay' Profile

题目链接：[http://test.evi0sdev.xyz:38001/](http://test.evi0sdev.xyz:38001/)

首先题目给了一个 hint：flag 在网站的 `./flag` 目录中。
打开网页，界面如下：

![](https://hujiekang.top/images/uploads/big/ec66cb681520f4a84195f9049b8ebe2c.jpg)

点击 `profile` 链接就会显示 "I'm a GAY" ，除此之外没有别的信息。
查看主页的源码，发现了一条注释指向 `./source` 目录。

![](https://hujiekang.top/images/uploads/big/061447809314f7bea43785d16f6dd717.jpg)

尝试访问 `http://test.evi0sdev.xyz:38001/source` ，发现程序源码：

![](https://hujiekang.top/images/uploads/big/0e509dbec7f38a3b28c980b65ca40e9f.jpg)

整个程序是基于 Python 里的 Flask Web 应用框架实现的。Flask 是一个轻量级的可定制框架，由于使用 Python 编写，相比其他同类型框架更灵活、轻便，也更容易上手。

阅读代码发现，`./source` 目录里面应该是源文件，而 `./file` 目录则是存放 `"I'm a GAY"` 信息的地方。

当程序位于 `./file` 目录时，接收一个名为 `name` 的参数，若目录中存在名为 `name` 的文件则读取之并返回文件内容，否则返回读取错误的错误信息。当程序位于 `./source` 目录时，直接读取源文件内容并返回，所以访问 `./source` 时会返回源代码。

综合分析，我们能够传进去的参数只有 `name` 。但是发现在按照路径读取文件的时候，没有机制来判断文件是否仍在该目录中而没有恶意访问其他目录，也就是说理论上可以通过传入参数来实现访问其他目录的文件。

尝试令参数 `name=../flag` ，这样和代表根目录的字符串 `./` 拼接可得 `./../flag` 。由于程序此时是在 `./file` 目录中的，所以最终代表的文件路径是 `./file/../flag` 。 `../` 代表上一级目录，所以路径的意思就是进入 `./file` 目录的上级目录即根目录，再从根目录访问 `./flag` 目录，从而达到目的。

传入参数，果然成功访问到了 `./flag` 目录，成功得到了 flag：

![](https://hujiekang.top/images/uploads/big/c21b3cc0b33a82031e8039fa224e46e9.jpg)

---

## Gay' Profile Plus

题目链接：[http://test.evi0sdev.xyz:38002/](http://test.evi0sdev.xyz:38002/)

![](https://hujiekang.top/images/uploads/big/ec66cb681520f4a84195f9049b8ebe2c.jpg)

题目首先给出一个 hint：Linux 里的 `proc` 文件系统。

题如其名，这个题目就是[第三题](#0x03-Gay’-Profile)的升级版。页面文字内容基本一致，打开源码也有提示访问`./source` 目录的注释。唯一不同的是显示出来的源代码：

![](https://hujiekang.top/images/uploads/big/bca66c7b8494d0b906dcd766bd8766d2.jpg)

从源代码中可见：文件路径的合成不是第三题那样简单的字符串合并，而是使用了 Python 里面 `os` 库里的 `os.path.join()` 函数。除此之外，添加了对路径的判断：

```Python
if os.path.abspath(filename).startswith(os.getcwd()) and filename != './profile':
    return 'No No No', 422
```

`os.path.abspath()` 函数用于获取文件的绝对路径，而 `os.getcwd()` 用于获取当前的工作目录，在此处为 `./` 。这个条件语句的意思即为：如果传入路径的绝对路径以此时的工作目录作为开头且文件名不为 `./profile` ，则返回错误信息。

显然如果直接像第三题一样传入`../flag`，由于仍在工作目录，此时显然无法通过条件。那么，如果路径不在工作目录的话，就可以不用在意文件名而直接跳过这个条件了。

先看看 Python 官方文档中对 `os.path.join()` 函数的说明：

> Join one or more path components intelligently. The return value is the concatenation of _path_ and any members of _\*paths_ with exactly one directory separator ( `os.sep` ) following each non-empty part except the last, meaning that the result will only end in a separator if the last part is empty. **If a component is an absolute path, all previous components are thrown away and joining continues from the absolute path component.**
> On Windows, the drive letter is not reset when an absolute path component (e.g., `r'\foo'`) is encountered. **If a component contains a drive letter, all previous components are thrown away and the drive letter is reset.** Note that since there is a current directory for each drive, `os.path.join("c:", "foo")` represents a path relative to the current directory on drive `C:` (`c:foo`) , not `c:\foo`.

从中可以发现这个函数的一个特点：如果有一个参数是绝对路径，那么它之前**所有**的参数都会被忽略，在 Windows 上，如果绝对路径包含驱动器号，还会重置驱动器号。也就是说，如果令`./`后面的参数是个绝对路径的话，那么是不是就可以跳出工作目录了呢？

此时需要文件的绝对路径，而此时我们只知道 flag 的路径为`./flag`，并不知道整个网页的文件夹位于哪个位置。此时还有 hint 没有用，不妨试一下 hint。于是查询有关 `proc` 文件系统的资料：

> Linux 内核提供了一种通过 `/proc` 文件系统，在运行时访问内核内部数据结构、改变内核设置的机制。proc 文件系统是一个伪文件系统，它只存在内存当中，而不占用外存空间。它以文件系统的方式为访问系统内核数据的操作提供接口。
> 可以通过`/proc/$pid/`来获取指定进程的信息，例如内存映射、CPU 绑定信息等。但是这个方法还需要获取进程 `pid`，在 `fork`、`daemon` 等情况下 `pid` 还可能发生变化。为了更方便的获取本进程的信息，linux 提供了 **`/proc/self/目录`**，这个目录比较独特，不同的进程访问该目录时获得的信息是不同的，**内容等价于`/proc/本进程 pid/`**。进程可以通过访问`/proc/self/目录`来获取自己的系统信息，而不用每次都获取 `pid`。

查询资料发现，在`/proc/self`下还有许多子目录，其中有一个名为 `cwd` 的子目录，表示到当前工作目录的符号链接。也就是说我们也可以通过这种方式间接的访问到工作目录。

于是构造参数 `name=/proc/self/cwd/flag` 即可访问 `./flag` 目录，成功得到 flag：

![](https://hujiekang.top/images/uploads/big/56a772c03f8463bf55fe98be45017651.jpg)

PS：[有关 proc 文件系统的资料](https://www.iteye.com/blog/luckyclouds-675711)

## Love_Reading

题目链接：[http://47.107.115.177:9331](http://47.107.115.177:9331)

![](https://hujiekang.top/images/uploads/big/2b5cfb16f5bcff68bc94331b6342e53f.png)

> hint1:swp文件
> hint2:PHP伪协议

首先看到`robot`字眼，习惯性去查看`robots.txt`：

![](https://hujiekang.top/images/uploads/big/b8362cefb1638c3c635bd8c9c35573ac.png)

显示了一个文件名`s4cret.php`，尝试打开，但是没有任何输出。于是从hint入手，下面是关于`swp`文件的介绍：

> Vim中的`swp`即`swap`文件，在编辑文件时产生，它是隐藏文件，如果原文件名是`data`，那么`swp`文件名就是`.data.swp`。如果文件正常退出，则此文件自动删除。以下两种情况不会删除`swp`文件：
> - Vim非正常退出,这种情况下,除非手动删除`swp`文件（也可以在Vim提示时删除），否则它会一直存在。
> - 多个程序同时编辑一个文件。

于是尝试访问文件`.s4cret.php.swp`，返回`404`。再次尝试访问主页文件`.index.php.swp`，发现这个文件存在，并且浏览器自动把它下载了下来。

使用Vim打开这个文件，发现是一堆乱码：

![](https://hujiekang.top/images/uploads/big/ac58283e9a74b7a7e8b4486ecd825cab.png)

经过搜索发现，下面这条命令可以通过swp文件得到源文件：

```bash
vim -r .index.php.swp
```

运行后得到主页文件源码：

```php
Evil robot take my love. I only know that he uses linux.
<?php
if(!(isset($_GET['key']) && isset($_GET['f']))){
        die();
}
else{
        $path = $_GET['key'];
        $data = file_get_contents($path);
        if($data != "zhi ma kai men!"){
                die("no no nope");
        }
        $f = $_GET['f'];
        include($f);
}
?>
```

显然对`key`参数要使用`php://input`伪协议通过POST传入`zhi ma kai men!`这个字符串，然后通过`f`参数使用`php://filter`伪协议去读取`s4cret.php`。
构造参数`key=php://input&f=php://filter/read=convert.base64-encode/resource=s4cret.php`使用BurpSuite传入字符串，即可拿到经过`base64`加密的`s4cret.php`文件内容。

![](https://hujiekang.top/images/uploads/big/52073f010380e13b9e593aead82b1e11.png)

解密得到flag：

![](https://hujiekang.top/images/uploads/big/3f517442fcb670d3922170067b206fe8.png)

---

# Misc部分

## 留图不留种

打开链接，得到一个图片文件`sesedetu.jpg`：

![](https://hujiekang.top/images/uploads/big/21c0a5fdea8635278c0134161861cd0c.jpg)

使用binwalk进行分析，命令如下：

```bash
binwalk -e sesedetu.jpg
```

得到分析之后的文件夹`_sesedetu.jpg.extracted`，含有一个zip文件，解压后获得一个txt文件，打开拿到flag：

![](https://hujiekang.top/images/uploads/big/11886cdce90b34e6f06af8a3d61cfb98.jpg)

## Hello World!

这是一组题目，题目的要求都是使用C语言输出字符串`Hi, CNSS!`即可拿到flag。

### Hello World 1

![](https://hujiekang.top/images/uploads/big/7c57c6916f31975595567b775ffef78b.jpg)

第一个是送分题，把Visual Studio控制台项目自动生成的代码搬过来就行了，直接拿到flag：`cnss{hi_cnss}`

### Hello World 2

![](https://hujiekang.top/images/uploads/medium/e8da79e734766a779207a918261b4af8.jpg)

此题要求不包含引号`"'`，于是令字符串为一`char`型数组，以`ascii`码的形式将字符存入，最后使用`puts`函数输出字符串，即可拿到flag：`cnss{hi_cnss_without_quotes}`

代码如下：

```c
#include <stdio.h>
int main(void){
    char text[10];
    text[0]=72;
    text[1]=105;
    text[3]=44;
    text[4]=32;
    text[5]=67;
    text[6]=78;
    text[7]=text[8]=83;
    text[9]=0;
    puts(text);
    return 0;
}
```

### Hello World 3

![](https://hujiekang.top/images/uploads/medium/53f75256f3c812e252865b4db598b8c3.jpg)

第三题要求不包含`;`，故将打印函数放于一个空的if条件中，即可拿到flag：`cnss{h1_Cn5s_wiThout_semic010ns}`

代码如下：

```c
#include <stdio.h>
void main(void){
  if(puts("Hi, CNSS!"))
  {
  }
}
```