---
title: GKCTF WriteUp
date: 2020-05-24 16:54:40
categories:
  - CTF
---



# Web

## CheckIN

又是一道bypass disable_functions的题目

<!-- more -->

首先给出源代码：

```php
<title>Check_In</title>
<?php 
highlight_file(__FILE__);
class ClassName
{
        public $code = null;
        public $decode = null;
        function __construct()
        {
                $this->code = @$this->x()['Ginkgo'];
                $this->decode = @base64_decode( $this->code );
                @Eval($this->decode);
        }

        public function x()
        {
                return $_REQUEST;
        }
}
new ClassName();
```

也就是只要输入base64加密的代码就能执行，执行`phpinfo()`发现版本为7.3，而且得到了一堆不能用的函数，能执行系统命令的都被ban了。

执行`var_dump(scandir('/'));`得到根目录有`flag`和`readflag`，`flag`文件读不到，`readflag`读出来是一个可执行文件，功能就是`cat /flag`。

也就是说，只要想办法执行这个文件就可以拿到flag。

然后就是写一句话代码执行，一开始用了蚁剑自带的bypass_disable_functions插件，但是好像在`/var/www/html`下面没有写权限所以都执行失败了。。。

后来发现了可以在`/tmp`上面上传文件然后包含，但是一开始没有找到能用的PoC。。。看WP找到一个pwn的PoC：<https://github.com/mm0r1/exploits/blob/master/php7-gc-bypass/exploit.php>

就RCE了，直接拿到flag：

![](https://hujiekang.top/images/uploads/big/9d0eb9841e3d66998909c36db230e151.png)

**更新：** 后面再次尝试，发现只是插件不行，利用`LD_PRELOAD`环境变量劫持同样可以RCE：（更多请看我[之前的文章](/2020/04/22/Ha1cyonCTF-WriteUp/#realezphp)）

![](https://hujiekang.top/images/uploads/big/0d99cd64bf23d22e04ec1189447b228c.png)

## cve版签到

> hint: cve-2020-7066

打开页面，在响应头中找到信息：

> Hint: Flag in localhost
>
> Tips: Host must be end with '123'

结合CVE-2020-7066的详情：

> In PHP versions 7.2.x below 7.2.29, 7.3.x below 7.3.16 and 7.4.x below 7.4.4, while using get_headers() with user-supplied URL, if the URL contains zero (\0) character, the URL will be silently truncated at it. This may cause some software to make incorrect assumptions about the target of the get_headers() and possibly send some information to a wrong server.

大概意思就是`get_headers()`函数在使用的时候会出现`\0`字符截断。

页面中有一个链接`?url=http://www.ctfhub.com`，可以把前面改成一个回环地址来绕过`ctfhub.com`的限制：`?url=http://127.0.0.123%00.ctfhub.com`

> （也通过这个题目学到了本地回环地址不止127.0.0.1…… 
>
> 127.0.0.1 ~ 127.255.255.254（去掉0和255）的范围都是本地回环地址。 ——百度百科

访问`?url=http://127.0.0.123%00.ctfhub.com`直接可以拿到flag：

![](https://hujiekang.top/images/uploads/big/a7daea8cb32ba87111648ddb474e34c4.png)

## 老八小超市儿

> 一日三餐没烦恼，今天到超市买个老八小汉堡儿。既实惠，还管饱，你看这超市整滴行不行。

打开是一个叫ShopXO的电商网站，搜索了一下发现是个电商网站的模板，所有功能也都可以用，就是没啥有价值的信息。。。

然后看了一下官方文档，看到了管理界面地址和默认管理员账户密码：

> 后台管理默认账号 admin
> 后台管理默认密码 shopxo
> 管理后台地址： http://www.xxx.com/index.php?s=/admin/index/index
>
> 1.5后台管理地址将优化为默认 admin.php 入口，管理后台地址： http://www.xxx.com/admin.php，可自行修改入口地址文件名称，位于系统根目录和public目录下的admin.php文件

访问admin.php，输入默认账户密码，成功进入管理界面：

![](https://hujiekang.top/images/uploads/big/232690379e86bd312de345343fd3a6f6.png)

然后在网站管理 > 主题管理下面找到一个文件上传点，在官网的[应用商店](https://store.shopxo.net/theme.html)里面提供了两个免费的主题，随便下一个，静态文件里面丢一个一句话木马传上去就getshell了：（参考<http://www.nctry.com/1660.html>）

![](https://hujiekang.top/images/uploads/big/16665f5c80777fc7b5fa54f257038b71.png)

根目录发现flag文件和flag.hint，flag文件中告知真flag在`/root`目录，hint内容如下：

> Mon May 25 01:58:01 2020
> Get The RooT,The Date Is Useful!

然而当前shell的用户不是root，所以就访问不到`/root`目录，但是根目录下还有一个`auto.sh`：

![](https://hujiekang.top/images/uploads/big/8336794ba7552209ff6725889dbff613.png)

顺藤摸瓜摸到这个Python文件，发现权限是766，也就是可修改：

![](https://hujiekang.top/images/uploads/big/e2c810737f3e8e8852335394511c35b0.png)

所以目前已知的就是这个脚本每隔一分钟会执行一次这个Python脚本重写一次时间，然后可以修改脚本内容。

那么可不可以通过这个文件来获取flag呢？终端执行`ps -ef`输出发现`auto.sh`是以root身份执行的，所以应该可以通过脚本来读取flag。修改代码：

```python
# step 1: 输出root目录
import os
f=open("/tmp/dir", "w")
for root,dirs,files in os.walk(r'/root'):
	for file in files:
		f.write(os.path.join(root,file)+"\n")
f.close()

# step 2: 读取flag
ff=open('/root/flag', 'r')
f=open("/tmp/flag", "w")
f.write(ff.read())
f.close()
ff.close()
```

后面看别的师傅的WP发现了一个更简单的方法。。。直接`os.system('chmod -R 777 /root')`然后就可以直接`cat`了：

![](https://hujiekang.top/images/uploads/big/1052084b6c27d6a1d29ada18ee9c160c.png)

flag：`flag{78e8bd48-d5a9-4b2f-a3a1-4cbda7169ff5}`

# Crypto

## 小学生的密码学

> $e(x)=11x+6(mod26)$
>
> 密文：welcylk（flag为base64形式）

普通的仿射密码，把字母表对应到0到25数字，然后计算后再一一对照就可以拿到明文：sorcery，base64编码后得到`flag{c29yY2VyeQ==}`

```python
>>> i = "abcdefghijklmnopqrstuvwxyz"
>>> for a in range(len(i)):
...     print(i[a], i[(11*a+6)%26])
...
a g
b r
c c
d n
e y
f j
g u
h f
i q
j b
k m
l x
m i
n t
o e
p p
q a
r l
s w
t h
u s
v d
w o
x z
y k
z v
```

## 汉字的秘密

>王壮 夫工 王中 王夫 由由井 井人 夫中 夫夫 井王 土土 夫由
>
>土夫 井中 士夫 王工 王人 土由 由口夫

此为当铺密码，每个汉字出头的个数即为对应的数字，于是可以得到每组汉字对应的数字：

```
69 74 62 67 118 83 72 77 86 55 71 57 82 57 64 63 51 107
```

很容易找到规律：

```python
a = [69, 74, 62, 67, 118, 83, 72, 77, 86, 55, 71, 57, 82, 57, 64, 63, 51, 107]
i = 1
for each in a:
	print(chr(each+i).lower(), end="")
    i+=1
```

拿到flag：`flag{you_are_good}`

## babycrypto

```python
# n:0xb119849bc4523e49c6c038a509a74cda628d4ca0e4d0f28e677d57f3c3c7d0d876ef07d7581fe05a060546fedd7d061d3bc70d679b6c5dd9bc66c5bdad8f2ef898b1e785496c4989daf716a1c89d5c174da494eee7061bcb6d52cafa337fc2a7bba42c918bbd3104dff62ecc9d3704a455a6ce282de0d8129e26c840734ffd302bec5f0a66e0e6d00b5c50fa57c546cff9d7e6a978db77997082b4cb927df9847dfffef55138cb946c62c9f09b968033745b5b6868338c64819a8e92a827265f9abd409359a9471d8c3a2631b80e5b462ba42336717700998ff38536c2436e24ac19228cd2d7a909ead1a8494ff6c3a7151e888e115b68cc6a7a8c6cf8a6c005L
# e:65537
# enc:1422566584480199878714663051468143513667934216213366733442059106529451931078271460363335887054199577950679102659270179475911101747625120544429262334214483688332111552004535828182425152965223599160129610990036911146029170033592055768983427904835395850414634659565092191460875900237711597421272312032796440948509724492027247376113218678183443222364531669985128032971256792532015051829041230203814090194611041172775368357197854451201260927117792277559690205342515437625417792867692280849139537687763919269337822899746924269847694138899165820004160319118749298031065800530869562704671435709578921901495688124042302500361
# p>>128<<128:0xe4e4b390c1d201dae2c00a4669c0865cc5767bc444f5d310f3cfc75872d96feb89e556972c99ae20753e3314240a52df5dccd076a47c6b5d11b531b92d901b2b512aeb0b263bbfd624fe3d52e5e238beeb581ebe012b2f176a4ffd1e0d2aa8c4d3a2656573b727d4d3136513a931428b00000000000000000000000000000000L
```

首先确定是RSA，然后发现`p`由于被移位导致丢失了128位的数据，百度之后发现可以使用**Coppersmith定理攻击**来得到完整的`p`，可以利用基于Python的一个数学处理库`sage`来实现。

以下是计算`p`的Python程序，可以直接丢到这个[在线sage解密网站](http://sagecell.sagemath.org/)上面进行求解：

```python
n=0xb119849bc4523e49c6c038a509a74cda628d4ca0e4d0f28e677d57f3c3c7d0d876ef07d7581fe05a060546fedd7d061d3bc70d679b6c5dd9bc66c5bdad8f2ef898b1e785496c4989daf716a1c89d5c174da494eee7061bcb6d52cafa337fc2a7bba42c918bbd3104dff62ecc9d3704a455a6ce282de0d8129e26c840734ffd302bec5f0a66e0e6d00b5c50fa57c546cff9d7e6a978db77997082b4cb927df9847dfffef55138cb946c62c9f09b968033745b5b6868338c64819a8e92a827265f9abd409359a9471d8c3a2631b80e5b462ba42336717700998ff38536c2436e24ac19228cd2d7a909ead1a8494ff6c3a7151e888e115b68cc6a7a8c6cf8a6c005
p=0xe4e4b390c1d201dae2c00a4669c0865cc5767bc444f5d310f3cfc75872d96feb89e556972c99ae20753e3314240a52df5dccd076a47c6b5d11b531b92d901b2b512aeb0b263bbfd624fe3d52e5e238beeb581ebe012b2f176a4ffd1e0d2aa8c4d3a2656573b727d4d3136513a931428b00000000000000000000000000000000
p_fake = p+0x10000000000000000000000000
pbits = 1024
kbits = pbits-576
pbar = p_fake & (2^pbits-2^kbits)
PR.<x> = PolynomialRing(Zmod(n))
f = x + pbar
x0 = f.small_roots(X=2^kbits, beta=0.4)[0]  # find root < 2^kbits with factor >= n^0.4
print(x0 + pbar)

# result: 160734387026849747944319274262095716650717626398118440194223452208652532694713113062084219512359968722796763029072117463281356654614167941930993838521563406258263299846297499190884495560744873319814150988520868951045961906000066805136724505347218275230562125457122462589771119429631727404626489634314291445667
```

得到了`p`就可以求解出`q`，然后再得到`n`的欧拉函数值，再使用扩展的欧几里得算法求解得到`d`，通过计算$m=c^d(modn)$来求到明文：

```python
from Crypto.Util.number import *

n = 0xb119849bc4523e49c6c038a509a74cda628d4ca0e4d0f28e677d57f3c3c7d0d876ef07d7581fe05a060546fedd7d061d3bc70d679b6c5dd9bc66c5bdad8f2ef898b1e785496c4989daf716a1c89d5c174da494eee7061bcb6d52cafa337fc2a7bba42c918bbd3104dff62ecc9d3704a455a6ce282de0d8129e26c840734ffd302bec5f0a66e0e6d00b5c50fa57c546cff9d7e6a978db77997082b4cb927df9847dfffef55138cb946c62c9f09b968033745b5b6868338c64819a8e92a827265f9abd409359a9471d8c3a2631b80e5b462ba42336717700998ff38536c2436e24ac19228cd2d7a909ead1a8494ff6c3a7151e888e115b68cc6a7a8c6cf8a6c005
p = 160734387026849747944319274262095716650717626398118440194223452208652532694713113062084219512359968722796763029072117463281356654614167941930993838521563406258263299846297499190884495560744873319814150988520868951045961906000066805136724505347218275230562125457122462589771119429631727404626489634314291445667
e = 65537
cipher = 1422566584480199878714663051468143513667934216213366733442059106529451931078271460363335887054199577950679102659270179475911101747625120544429262334214483688332111552004535828182425152965223599160129610990036911146029170033592055768983427904835395850414634659565092191460875900237711597421272312032796440948509724492027247376113218678183443222364531669985128032971256792532015051829041230203814090194611041172775368357197854451201260927117792277559690205342515437625417792867692280849139537687763919269337822899746924269847694138899165820004160319118749298031065800530869562704671435709578921901495688124042302500361
q = n // p
phi_n = (p - 1) * (q - 1)

def gcd(a, b):
    if a < b:
        a, b = b, a
    while b != 0:
        temp = a % b
        a = b
        b = temp
    return a

def egcd(a, b):
    if a == 0:
        return (b, 0, 1)
    else:
        g, y, x = egcd(b % a, a)
        return (g, x - (b // a) * y, y)

def modinv(a, m):
    g, x, y = egcd(a, m)
    if g != 1:
        raise Exception('modular inverse does not exist')
    else:
        return x % m

d = modinv(e, phi_n)
print(long_to_bytes(pow(cipher, d, n))
```

flag：`flag{3d0914a1-1e97-4822-a745-c7e20c5179b9}`

# Misc

## Pokémon

> 比赛累了吧,怀旧一把，我在103号道路等你
>
> [点击下载附件](/downloads/cf02194ee2308e71856417983bbf64e3.zip)

题目附件是《口袋妖怪：绿宝石》的GBA ROM，使用GBA模拟器打开，走完前面剧情，可以自由活动之后去103号道路，看到地上草丛摆成的flag：`flag{PokEmon_14_CutE}`

![](https://hujiekang.top/images/uploads/big/49605e43264b0f36f48023cf85c9405d.png)

## code obfuscation

附件是一张图片：

![](https://hujiekang.top/images/uploads/big/e50953ce7a939147006c6c6030cf9f94.png)

用PS消除间隔并矫正形状得到二维码：

![](https://hujiekang.top/images/uploads/big/66aca3c6a9623b2c2b208b4b432f6dfc.png)

扫描结果为`base(gkctf)`，此时没有更多信息了，于是尝试再次提取原图片的信息。

使用Stegslove，发现图片中有另一个数据块，很明显能够发现RAR的文件头`52 61 72 21`：

![](https://hujiekang.top/images/uploads/big/c93325fe8925e760f6124c1ccbd9aad1.png)

于是把这块数据提取出来，得到一个有密码的RAR压缩包。此时利用之前的二维码扫描结果，于是想到basexx编码，尝试把字符串`gkctf`进行base16、base32、base64、base58编码，最后base58`CfjxaPF`成功解压，拿到一张图片和一段代码：

```javascript
eval(function(p,a,c,k,e,d){e=function(c){return(c<a?"":e(parseInt(c/a)))+((c=c%a)>35?String.fromCharCode(c+29):c.toString(36))};if(!''.replace(/^/,String)){while(c--)d[e(c)]=k[c]||e(c);k=[function(e){return d[e]}];e=function(){return'\\w+'};c=1;};while(c--)if(k[c])p=p.replace(new RegExp('\\b'+e(c)+'\\b','g'),k[c]);return p;}('15 n 14 a b c d e f g h i j k l m n o p q r s t u v w x y z 10 11 17="n"12 15 n 14 A B C D E F G H I J K L M N O P Q R S T U V W X Y Z 10 11 17="n"12 13=0 15 n 14 a b c d e f g h i j 10 11 16="n"13=$((13+1))12 1g("1f=\' \';1e=\'"\';16=\'#\';1j=\'(\';1i=\')\';1h=\'.\';1a=\';\';19=\'<\';18=\'>\';1d=\'1c\';1b=\'{\';1k=\'}\';1t=\'0\';1u=\'1\';1s=\'2\';1r=\'3\';1n=\'4\';1m=\'5\';1l=\'6\';1q=\'7\';1p=\'8\';1o=\'9\';")',62,93,'||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||do|eval|done|num|in|for|Bn|An|Ce|Cc|Cb|Cn|_|Cl|Bm|Bk|alert|By|Bt|Bs|Cp|Dg|Df|De|Dj|Di|Dh|Dd|Dc|Da|Db'.split('|'),0,{}))
```

![](https://hujiekang.top/images/uploads/big/9319cb0569f5bc7da5a0d5657e00524f.png)

上面的代码进行了JS混淆，解混淆后格式化结果如下：

```
for n in a b c d e f g h i j k l m n o p q r s t u v w x y z do eval An = "n"
    done
for n in A B C D E F G H I J K L M N O P Q R S T U V W X Y Z do eval An = "n"
    done
    num = 0
for n in a b c d e f g h i j do eval Bn = "n"
    num =
    $((num + 1)) done 
    alert("Bk=' ';Bm='"';Bn='#';Bs='(';Bt=')';By='.';Cb=';';Cc='<';Ce='>';Cl='_';Cn='{';Cp='}';Da='0';Db='1';Dc='2';Dd='3';De='4';Df='5';Dg='6';Dh='7';Di='8';Dj='9';")
```

很容易理解这段代码：B、C、D开头的变量都有对应的映射关系，而A开头的变量则有着`An = "n"`的对应关系，将其代入图片中，可以得到一段C的代码（图片可以直接用OCR扫描，然后替换部分字符后丢进Console去跑就行了）：

```c
#include <stdio.h>
int main(){
print("w3lc0me_4o_9kct5");
return 0;
```

flag：`flag{w3lc0me_4o_9kct5}`

## Harley Quinn

> hint:电话音&九宫格、FreeFileCamouflage

附件是一段音频和一张图片：[点击下载](/downloads/f4798fdb420ca8a9b1dfdffa43b2ccfe.zip)

音频的最后有一段电话拨号的声音，截取下来，用Au放慢速度自己用手机对着听或者直接用`dtmf2num.exe`分析都可以顺利拿到对应的信息：`#222833344477773338866#`

![](https://hujiekang.top/images/uploads/big/92638b7b58c8010453041ee0a864cd31.png)

此时看第二个hint，搜索发现是个图片隐写软件：

> 你经常把文件存到U盘上，却总是担心U盘丢失或是被别人看到，那么就来试试File Camouflage吧。它能把你的重要文档以AES加密算法存放到JPG格式的图片中。

此时之前的图片也有用了，把图片丢进去解密，一开始直接输入`#222833344477773338866#`提示密码错误，比赛结束前10分钟突然想到是[手机键盘密码](http://dyf.ink/crypto/classical/others/#_24)：

<img src="https://hujiekang.top/images/uploads/big/c41159cb8521607c6045dda4041248bd.jpg" style="zoom:50%;" />

拿到密码为`ctfisfun`，解开图片中的文档：

![](https://hujiekang.top/images/uploads/big/f2e343f897f3acc2670997622c069ece.png)

拿到flag：`flag{Pudd1n!!_y0u_F1nd_m3!}`

## Sail a boat down the river

附件是一个视频和一个压缩包：[点击下载](/downloads/aef3857763de1570d51d9568cfd33bf5.zip)

> hint1: 闪烁的光芒
>
> hint2: 是一行不是一列
>
> hint3: 加密方式很常见

首先打开视频，是一段监控录像，在最后几秒有一帧出现了一个二维码：

![](https://hujiekang.top/images/uploads/big/f7e4e752981d5d7017c797f0936190a1.png)

扫描得到一个百度网盘的链接，但是不知道提取码，只能再回去翻看视频找找线索。

借助hint1，找了几遍后发现了“闪烁的光芒”，就是视频中间那个摄像头：

![](https://hujiekang.top/images/uploads/big/029a120e0f3ed31e7d49b90efa7a4f2e.png)

发现灯亮的时长有两种：1帧和3帧，于是想到了摩斯电码，得到下面的文本：

```
-.-- .-- ---.. --.  ==>  yw8g
```

输入提取码，成功得到文件`shudu.txt`：

```
0 8 1 7 4 0 0 0 0   5 8 1 7 4 2 6 9 3
3 0 2 0 6 8 0 0 0   3 7 2 9 6 8 5 1 4
4 0 6 5 0 0 8 2 0   4 9 6 5 1 3 8 2 7
0 3 0 0 0 0 0 5 6   9 3 8 4 2 1 7 5 6
7 0 4 3 0 9 2 0 1   7 6 4 3 5 9 2 8 1
1 2 0 0 0 0 0 4 0   1 2 5 8 7 6 3 4 9
0 5 9 0 0 4 1 0 8   2 5 9 6 3 4 1 7 8
0 0 0 1 8 0 9 0 2   6 4 7 1 8 5 9 3 2
0 0 0 0 9 7 4 6 0   8 1 3 2 9 7 4 6 5

密文:
efb851bdc71d72b9ff668bddd30fd6bd
密钥:
第一列（注：后面由hint改成第一行）九宫格从左到右从上到下
```

然后做了一下数独，做完了就懵逼了。。。把第一行三个九宫格的所有组合对着DES、AES、3DES、Rabbit、RC4都试了一遍，就是不行。。。等一波WP

**更新：** 后面问了出题人，原来密钥只用读取填入的数字。。。从左到右从上到下密钥就是52693795149137

然后又试了一下上面的算法，在AES这里解出了结果：

![](https://hujiekang.top/images/uploads/big/741e1af908b77e1c215c3f20685ed88c.png)

压缩包密码`GG0kc.tf`，解压出来得到一个`.ovex`文件，用五线谱打谱软件Overture打开即可拿到flag：`flag{gkctf_is_fun}`

![](https://hujiekang.top/images/uploads/big/6b5d1a2fcf4ea992c84433ddc1a9ad17.png)

