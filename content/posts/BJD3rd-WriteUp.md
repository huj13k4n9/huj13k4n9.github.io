---
title: BJD3rd-WriteUp
date: 2020-05-23 14:15:56
categories:
  - CTF
---

# Crypto

## bbcrypto

```python
# -*- coding:utf-8 -*-
import A,SALT
from itertools import *

def encrypt(m, a, si):
    c=""
    for i in range(len(m)):
        c+=hex(((ord(m[i])) * a + ord(next(si))) % 128)[2:].zfill(2)
    return c
if __name__ == "__main__":
    m = 'flag{********************************}'
    a = A
    salt = SALT
    assert(len(salt)==3)
    assert(salt.isalpha())
    si = cycle(salt.lower())
    print("明文内容为：")
    print(m)
    print("加密后的密文为：")
    c=encrypt(m, a, si)
    print(c)
    #加密后的密文为：
    #177401504b0125272c122743171e2c250a602e3a7c206e014a012703273a3c0160173a73753d
```

<!-- more -->

很容易找到6组明文和密文的对应关系：

- `f(102)`->`0x17`
- `l(108)`->`0x74`
- `a(97)`->`0x01`
- `g(103)`->`0x50`
- `{(123)`->`0x4b`
- `}(125)`->`0x3d`

由`assert`语句可以得到`salt`的长度为3且全为小写字母，且参与加密的是`salt`的循环迭代器，所以很容易在已知的明文-密文对中找到使用`salt`的同一位加密的一组或多组数据，比如这里的`f`和`g`、`l`、`{`和`}`。

于是可以小范围的爆破一下`encrypt`函数中的`a`：

```python
import string
lower = string.printable[10:36]
for i in range(1001):
    for each in lower:
        if hex((102*i+ord(each)) % 128) == '0x17' and hex((103*i+ord(each)) % 128) == '0x50':
            print(i, each)
        if hex((108*i+ord(each)) % 128) == '0x74' and hex((123*i+ord(each)) % 128) == '0x4b' and hex((125*i+ord(each)) % 128) == '0x3d':
            print(i, each)
        if hex((97*i+ord(each)) % 128) == '0x1':
            print(i, each)
```

把循环中的三个条件逐一的执行，很容易找到一个同时符合三个条件要求的最小`a`值`57`，和三个条件中对应的字母：`a,h,h`。

然后就是愉快的逆向求解了，由于带余除法的商无法得知，所以还是使用小范围爆破的方式，读取正常的字符拼在一起就可以拿到flag了：

```python
# -*- coding:utf-8 -*-
from itertools import *
import re

if __name__ == "__main__":
    a = 57
    salt = "ahh"
    assert(len(salt) == 3)
    assert(salt.isalpha())
    si = cycle(salt.lower())
    ss = [ord(next(si)) for i in range(38)]
    ii = [int('0x'+each, 16) for each in re.findall('.{2}', '177401504b0125272c122743171e2c250a602e3a7c206e014a012703273a3c0160173a73753d')]

    for j in range(len(ss)):
        print()
        for i in range(101):
            if (ii[j]+i*128-ss[j]) % 57 == 0:
                print(i, chr((ii[j]+i*128-ss[j]) // 57), end=' ')
```

flag：`flag{ad7d973ffdd285b476a1a727b3a8fbc4}`

## easyLCG

```python
from Crypto.Util.number import*
from secret import flag


class LCG:
    def __init__(self):
        self.a = getRandomNBitInteger(32)
        self.b = getRandomNBitInteger(32)
        self.m = getPrime(32)
        self.seed = getRandomNBitInteger(32)

    def next(self):
        self.seed = (self.a*self.seed+self.b) % self.m
        return self.seed >> 16

    def output(self):
        print("a = {}\nb = {}\nm = {}".format(self.a, self.b, self.m))
        print("state1 = {}".format(self.next()))
        print("state2 = {}".format(self.next()))


class DH:
    def __init__(self):
        self.lcg = LCG()
        self.lcg.output()
        self.g = getRandomNBitInteger(128)
        self.m = getPrime(256)
        self.A, self.a = self.gen_AB()
        self.B, self.b = self.gen_AB()
        self.key = pow(self.A, self.b, self.m)

    def gen_AB(self):
        x = ''
        for _ in range(64):
            x += '1' if self.lcg.next() % 2 else '0'
        return pow(self.g, int(x, 2), self.m), int(x, 2)


DH = DH()
flag = bytes_to_long(flag)
print("g = {}\nA = {}\nB = {}\nM = {}".format(DH.g, DH.A, DH.B, DH.m))
print("Cipher = {}".format(flag ^ DH.key))

'''
a = 3844066521
b = 3316005024
m = 2249804527
state1 = 16269
state2 = 4249
g = 183096451267674849541594370111199688704
A = 102248652770540219619953045171664636108622486775480799200725530949685509093530
B = 74913924633988481450801262607456437193056607965094613549273335198280176291445
M = 102752586316294557951738800745394456033378966059875498971396396583576430992701
Cipher = 13040004482819935755130996285494678592830702618071750116744173145400949521388647864913527703
'''
```

这题就是要把线性同余方法的种子给出来，然后就可以获得每一次调用产生的随机数从而得到DH算法的密钥。

采取爆破的方法：

```python
for i in range(int('0b10000000000000000000000000000000',2), int('0b11111111111111111111111111111111',2)+1):
    s1 = (a*i+b) % m
    if s1 >> 16 == 16269 and ((a*s1+b)%m) >> 16 == 4249:
        print(i)

# result
# 2964210017
# 3136881456
# 4175448000
```

跑出来三个结果，经测试，`seed=2964210017`。

然后使用给定的数据去创建DH对象，然后输出密钥为`30943130190156271464690588434539494624611105500290245660738510426575525164522`，最后和密文异或一下再转成字符串就可以拿到flag。

flag：`flag{4dfe14e0c6c21ffcf5a3b4f0ed1911f6}`

# Misc

## Questionnaire

> 叮~ 您有一份调查问卷~ 请查收~ <https://forms.gle/Vmzt99LazrtXsRLM9>

打开网页是份Google表单，第一次没看要求全填的中文就提交了，后面给了提示要求填英文或拼音，才发现填对了就自动显示一部分flag。

一开始用Google识图+问别人做的剩最后一个题目，怀柔区的长城试了半天慕田峪一点反应没有。。。

然后查看网络，发现填写完答案后没有产生额外的请求，所以答案肯定在前端。查看源代码，拿到了答案和对应的部分flag：

![](https://hujiekang.top/images/uploads/big/1b4209af38ffd9af0ce46851d2a65fea.png)

完整题目传送门：[/downloads/8036cabb971ec21a1a6f7ac152ef08ec.png](/downloads/8036cabb971ec21a1a6f7ac152ef08ec.png)

## /bin/cat 2

打开附件是张动图，缩小了看像是一张被压扁了的二维码，查看尺寸，发现宽度刚好是长度的两倍。所以应该就是横向双倍拉长了。很容易发现吃鸡腿的猫代表黑色像素，吃饼干的猫代表白色像素，提取gif中的一帧丢进PS，进行替换即可（还好出题人在图案之间留了线条，这样更方便填色，否则不知道要搞到什么时候。。。而且密密麻麻的眼睛容易看花，希望有更好的解决办法）

![](https://hujiekang.top/images/uploads/medium/e6f9ea481211b553972587baebdd632e.gif)

处理后的图片如下：

![](https://hujiekang.top/images/uploads/big/0a2c171c40521c0a91e3e148e52bb8e0.png)

扫一下得到文本`m1ao~miao~mi@o~Mia0~m!aO~m1a0~~~`，然后md5加密一下就得到flag了：

![](https://hujiekang.top/images/uploads/big/ed110ee3e2073000ba547681b80085a1.png)

**更新：在[别的师傅的WP](http://www.fzwjscj.xyz/index.php/archives/30/#bincat2)中找到了脚本替换的方法（未测试）**

```python
from PIL import Image
from pyzbar.pyzbar import decode
import hashlib

p1 = Image.open('11.png').convert('RGB')
p2 = Image.open('12.png').convert('RGB')
a,b = p1.size
dif = []
for y in range(b):
    for x in range(a):
        if p1.getpixel((x,y))!=p2.getpixel((x,y)):
            dif.append((x,y))
mark = dif[0]

p = Image.open('res.png').convert('RGB')
aa,bb = p.size
data = []
for y in range(0,bb,50):
    for x in range(0,aa,100):
        if p.getpixel((x+mark[0],y+mark[1])) == p1.getpixel(mark):
            data.append('1')
        else:
            data.append('0')

B = Image.new('L',(10,10),255)
W = Image.new('L',(10,10),0)
np = Image.new('L',(290,290),0)
for y in range(29):
    for x in range(29):
        if data[x+29*y] == '0':
            np.paste(B,(10*x,10*y))
        else:
            np.paste(W,(10*x,10*y))
np.save('r.png')
pp = Image.open('r.png')
barcodes = decode(pp)
for barcode in barcodes:
    barcodeData = barcode.data.decode("utf-8")
    print(hashlib.md5(barcodeData.encode()).hexdigest())
```

## babyweb

![](https://hujiekang.top/images/uploads/big/54ec0010e59358e55a9a497365114d9d.png)

访问网页得到[`flag.zip`](/downloads/11b7ee2bb01b35cdd56d5bba95068641.zip)，看了一下，真的有密码不是伪加密，然后寻找一番，在标题`Password_is_here`这里发现了一些零宽字符：

```html
<p class="container" id="ZipPass is here:">
Pass&#8203;&#8203;&#8203;&#8203;&rlm;&rlm;&zwj;&#8203;&#8203;&#8203;&#8203;&rlm;&#8203;&zwnj;&#8203;&#8203;&#8203;&#8203;&rlm;&zwj;&rlm;&#8203;&#8203;&#8203;&#8203;&rlm;&zwj;&zwnj;&#8203;&#8203;&#8203;&#8203;&rlm;&lrm;&rlm;&#8203;&#8203;&#8203;&#8203;&rlm;&zwnj;&#8203;&#8203;&#8203;&#8203;&#8203;&rlm;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&rlm;&lrm;&zwnj;&#8203;&#8203;&#8203;&#8203;&rlm;&#8203;&rlm;&#8203;&#8203;&#8203;&#8203;&lrm;&rlm;&rlm;&#8203;&#8203;&#8203;&#8203;&rlm;&#8203;&rlm;&#8203;&#8203;&#8203;&#8203;&lrm;&rlm;&zwj;&#8203;&#8203;&#8203;&#8203;&rlm;&zwj;&rlm;&#8203;&#8203;&#8203;&#8203;&lrm;&rlm;&zwj;&#8203;&#8203;&#8203;&#8203;&lrm;&rlm;&rlm;&#8203;&#8203;&#8203;&#8203;&rlm;&lrm;&zwnj;&#8203;&#8203;&#8203;&#8203;&rlm;&#8203;&zwnj;&#8203;&#8203;&#8203;&#8203;&rlm;&zwj;&rlm;&#8203;&#8203;&#8203;&#8203;&rlm;&lrm;&#8203;&#8203;&#8203;&#8203;&#8203;&rlm;&zwnj;&#8203;&#8203;&#8203;&#8203;&#8203;&rlm;&zwj;&#8203;&#8203;&#8203;&#8203;&#8203;&rlm;&lrm;&lrm;&#8203;&#8203;&#8203;&#8203;&rlm;&zwnj;&#8203;&#8203;&#8203;&#8203;&#8203;&rlm;&lrm;&#8203;&#8203;&#8203;&#8203;&#8203;&rlm;&zwnj;&#8203;&#8203;&#8203;&#8203;&#8203;&lrm;&rlm;&lrm;&#8203;&#8203;&#8203;&#8203;&rlm;&zwnj;&lrm;&#8203;&#8203;&#8203;&#8203;&rlm;&#8203;&zwnj;word_is_here
</p>
```

这个肯定是密码了，但是想不出来出来用的什么编码。。。

看了WP之后发现又有在线加解密网站。。。看样子的确要整理一个各种奇怪编码的list了。。。网站传送门：<https://offdev.net/demos/zwsp-steg-js>（感谢Y1ng师傅提供的js脚本：[点击查看](/downloads/4d128327a3183e60ad70c040b1da331e.js)，使用方法如下）

```javascript
const stego = require('unicode_steganography.js').unicodeSteganographer;
stego.setUseChars('\u200b\u200c\u200d\u200e\u200f');
console.log(stego.decodeText('xxxxxx'));
```

解出来密码`zerowidthcharactersinvisible`，然后解压出一个打不开的图片，winHex打开看一下发现疑似倒序png，尾部发现反序的PNG头部`89 50 4E 47 0D 0A 1A 0A`，于是尝试把字节顺序倒回来：

```python
>>> open('flag.png', 'wb').write(open('f14g.png', 'rb').read()[::-1])
48554
```

拿到图片：

![](https://hujiekang.top/images/uploads/big/81f9d89f2b44dd2ce1711c7b30af131a.png)

一共四组图案，从左到右分别是[`Arthur Minimoys Alphabet`](https://www.dcode.fr/arthur-invisibles-cipher)、`Galactic Alphabet`、`跳舞的小人`、`Unown Alphabet`，对应关系贴在下面了：

![](https://hujiekang.top/images/uploads/big/2e5b3520293c136f9d0312dcf73c0d6e.gif)

![](https://hujiekang.top/images/uploads/big/38d6d0313da338cef7a31d977a36b708.png)

![](https://hujiekang.top/images/uploads/big/82b86df7ccc61c2cacd47b1e95cfd24d.jpg)

![](https://hujiekang.top/images/uploads/big/628b50acd92691003d1347491660e0a2.png)

解出flag：`BJD{UVWHZAITQAU}`

## testyournc

题目要求用nc连接指定地址，连接后弹出来个像是shell的东西：

![](https://hujiekang.top/images/uploads/big/5321ad6418e94091f76d72e5674e8f84.png)

默认目录下只有这两个文件，然后这个flag只会显示一个老鼠的emoji就卡住了。试了一下`cd`发现没有权限，但是`ls`是可以遍历目录的。尝试`ls /`，发现可疑文件`start.sh`、`run.sh`、`f1a9.py`和`f1a9.bak`：

![](https://hujiekang.top/images/uploads/big/b62d05a6fcbbcbef8552943e8c348aae.png)

然后`cat`一下，发现除了f1a9.py没有权限，其他的都可以显示。这样就差不多可以搞清楚整个程序逻辑了：

```shell
$ cat /run.sh
#!/bin/bash
cd /home/ctf
stdbuf -i 2 -o 0 -e 0 /usr/bin/timeout 15 /usr/bin/python -c "import os; [os.system(raw_input('$ ')) for i in range(10)]"

$ cat /start.sh
#!/bin/sh
# Add your startup script

# generate flag
python /f1a9.py
chown root:ctf /home/ctf/flag
chmod 640 /home/ctf/flag /home/ctf/readme

# start ctf-xinetd
/etc/init.d/xinetd start;
trap : TERM INT;
sleep infinity & wait\
```

首先可以发现这个shell使用Python整出来的，不但限制次数还限制了访问间隔，若两次访问之间超过15秒就自动掉线。。。

然后看`f1a9.bak`：

```python
#!/usr/bin/python
#coding=utf-8

from random import randint
from uuid import uuid4

flag = [hex(i)[2:-1] for i in uuid4().fields]

f=open('/home/ctf/flag','w')
f.write('🐀')
f.seek(1024*1024*1024)
f.write('flag{')
offset = 1024
for i in flag:
    f.seek(1024*1024*1024*randint(offset,offset+2048))
    offset += 2048
    f.write(i)
f.write('}')
f.seek(1024*1024*1024*randint(offset,offset+2048))
f.write('good job!')
f.close()
```

可以看见，程序使用`seek()`方法，把一个随机的uuid的6段离散的写在了。。。差不多一万多GB的空间里面

然后给了hint：

> hint1: /f1a9.bak 你看到了嘛? 
> hint2: 用`df`命令看看硬盘总共多大，再看看flag多大
> hint3：系统命令不太好使？试试万能的Python

看了一下发现整个硬盘大小只有15MB。。。而flag文件有13602GB。。？

![](https://hujiekang.top/images/uploads/big/0169f62938c3a8265ecdf8e534ece25a.png)

emmmm其实挺想知道这文件是怎么写进去的。。。我在本地测试都没写成功。。。还蛮神奇的

然后接下来就是尝试python读文件，发现只要跟显示flag文件内容相关的任何指令都会卡死。。。。。没辙了