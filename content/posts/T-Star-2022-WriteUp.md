---
title: T-Star CTF 2022 WriteUp
date: 2022-04-24 22:58:45
categories:
  - CTF
---

赛后复盘发现感觉自己脑洞还是不够大。。。里面的Web题虽然难度不大但还是学到了一些零零碎碎的知识点

# 关卡1

给了一个URL，打开后显示需要输入手机号获取验证码，随便打了一个发现发送验证码的接口有Debug信息直接把验证码返回了：

![](https://images.hujiekang.top/blogimage-80f36f37a424db182cae21a5f6747292-5da388ed.png)

<!-- more -->

输入验证码后进入网站，就一个十分简陋的网站，有四个直播间页面，都在放TSRC的宣传视频hhh，然后扫接口在点赞的地方找到了一个XXE（赛后复盘的时候站已经关了，放一张当时的截图）

![](https://images.hujiekang.top/blogimage-69bc53abc16689c5db1c556f66178b77-b6a317e0.png)

总之当时就是发现可以本地读取文件但是没有回显，而且像上图加载进XML的数据还是会被带进后端查询直播的用户，如图中`/sys/kernel/fscaps`的值是1，带进去能够找到用户ID为1的用户所以返回500，如果没找到就返回`No such streamer`的消息。又试了几回发现没法加载远程DTD文件，于是当时就放着没管了

赛后看wp学到了一个没见过的操作就是基于XML报错的XXE，<https://j7ur8.github.io/WebBook/PHP/报错XXE.html>，感觉原理就是把远程加载的东西直接写进了ENTITY里面，但是因为变量解析的原因需要嵌套包含两三层，最终的结果就是把要读取的文件读到了exp字符串里面，然后尝试去包含带有错误字符串的文件产生报错，在报错信息里也就会输出文件的内容。

```xml-dtd
<?xml version="1.0" ?>
<!DOCTYPE message [
    <!ENTITY % condition '
        <!ENTITY &#x25; file SYSTEM "file:///etc/passwd">
        <!ENTITY &#x25; eval "<!ENTITY &#x26;#x25; error SYSTEM &#x27;file:///nonexistent/&#x25;file;&#x27;>">
        &#x25;eval;	 <!-- 把报错的ENTITY通过引用加载进来 -->
        &#x25;error; <!-- 引用会产生报错的ENTITY error, 然后error会去加载里面的file引用实体内容，从而产生一个错误的URI -->
'>
    %condition;
]>
<message>any text</message>
```

通过这种方法，结合`proc`就能够读到后端的代码`/proc/self/cwd/app.py`，然后发现模块`config`，读取`config.py`拿到flag。

# 关卡2

大概是个社工题吧，社工第一题网站里的直播ID：nightbaron042，但因为腾讯总部在深圳所以蒙了个深圳，就过了hhh

# 关卡3

附件是一个流量包，是一个TCP的流量，追踪了一下数据流很容易发现是ADB Shell的流量，里面对一个名为`ctf.misc.step`的apk包进行了备份：

![](https://images.hujiekang.top/blogimage-6fbf7f6609cb45248cc1926580e5db0d-ca0bbaf8.png)

搜索了一番发现利用<https://github.com/nelenkov/android-backup-extractor>工具可以解密Android Backup文件，于是将二进制数据dump下来，用16进制编辑器敲掉多余的数据后尝试解密，发现要密码：

![](https://images.hujiekang.top/blogimage-c4cc5006f41223a2b126b9b1012720aa-0815c676.png)

于是又去流量包里追踪了其他的流，发现后面开了一下ADB Shell，有`cat pass`的操作，获得密码：

![](https://images.hujiekang.top/blogimage-8813378cf59e515076b8829a87ab5eff-63975dad.png)

解压备份数据后得到以下文件：

![](https://images.hujiekang.top/blogimage-7d45e09951234ff8cf6530ccae903c29-fd324a82.png)

OpenSSL用私钥解一下key.en可以得到压缩包的密码，得到一个txt，排版后发现是个二维码

```
1111111010010101010110111111110000010100011000111101000001101110100110100101000010111011011101010000110001000101110110111010110100100101101011101100000100100111011001010000011111111010101010101010111111100000000001111001000000000000110011010000110101010011011110001110110101101011000011110000110100101110010010111111000100001101000011010000100000100100101101001011010010101111010011110100111101001110000011110100101101001011010010001110011101101111011001110000001001010101001100011001001001001110111111111111011101101001010111001101110111001001110111000001111100011001000010100110110011111011010100111110010001100100011110011001100000000001001010101101010111001111111010110001101000101001010000011100111110010001000100101110101010011111111110111101011101000000010000000000111010111011110001010110111001110100000101110011101101110011101111111
```

![](https://images.hujiekang.top/blogimage-ce582b92a615968a85e923f4a4ee7c8a-47bfcaaf.png)

得到`033yia8rqea1921ca61/systemlockdown`，拼合一下下载附件的IP地址，得到一个二进制文件，有README：

```c++
// 门禁用的是Windows 10，x86系统……经过一番分析，你成功拿到了门禁系统源码，可喜的是，门禁认证系统已经写死，即使是管理员也无法更新。
// 但，就在破解源码的过程中，管理员也觉察到门禁源码泄露，提前关闭了门禁系统，你输入的密码将无法认证。
// 时间一分一秒过去，不能再犹豫了，需要立即输入密码，解锁门禁。

// PS: MSVC 2015以后的版本编译，Debug，不开启任何优化，请以提供的附加材料为准（Binary与下列源码表现一致，输入的答案通过与否请以该Binary的输出为准）。
// flag：如果你认为输入12345可以解锁门禁，则请提交答案：md5(12345)

#include <iostream>

struct door_key {
	unsigned char passed : 1;
	unsigned char checksum1 : 2;
	unsigned char checksum2 : 2;
	unsigned char checksum3 : 3;
};

//The system doesn't allow ANYBODY to log in now.
#define SYSTEM_SHUTDOWN 1

void check(char* password, door_key* d) {
	if (SYSTEM_SHUTDOWN) {
		return;
	}

	if (memcmp(password, "888888", 6) == 0) {
		d->passed = 1;
		d->checksum1 = 88;
		d->checksum2 = 88;
		d->checksum3 = 88;
	}
}

void call_the_police() {
	abort();
}

int main()
{
	door_key* checker1 = 0;

	struct {
		char password[6];
		char key_data;
	} management = { 0 };

	char ch = 0;
	char last_ch = 0;
	int i = 0;

	if (SYSTEM_SHUTDOWN) {
		std::cout << "Notify from the administrator: NOBODY is allowed to login now!!!" << std::endl;
		std::cout << "YOUR LOGIN REQUEST WILL NOT BE HANDLED AND WE WILL CALL THE POLICE INSTANTNLY IF YOU DIDN'T PASS THE CHECK." << std::endl;
	}
retry:
	std::cout << "Please enter your 6-digit password, type '[6 digit number] then Enter' to confirm (For example: 123456): " << std::endl;
	for (i = 0; i <= 6; i++) {
		ch = std::cin.get();

		if (ch == '\n')
			break;
		if (!isdigit(ch) && ch != '\n')
			call_the_police();

		// Developer A:
		//  Add an easy check, our strong 6-digit password is 888888 !
		//  Pre-check if every digit is the same.
		if (ch != '\n' && last_ch && ch != last_ch)
			call_the_police();

		last_ch = ch;
		management.password[i] = ch;
	};

	checker1 = (door_key *)&(management.key_data);

	check(management.password, checker1);

	if ((checker1->passed && (checker1->checksum1 == checker1->checksum2) && checker1->checksum3 > 0)) {
		std::cout << "Congurations! You have entered the correct password.";
	}
	else
		call_the_police();
}
```

由最后的判断条件可知，需要保证最后一个字节`key_data`的第一位是1，2-3位和4-5位相等以及最后三位大于0。然后发现在循环中，程序是假设用户一定会输入6位数字的，所以只做了换行符的匹配，因此将第7位改为换行符以外的值也可以过循环，也就是溢出。

遍历了一下0-9字符，发现只有5符合上面的条件，因此最后的结果就是5555555的md5值`992e63080ee1e47b99f42b8d64ede953`。

```
0 0b110000
1 0b110001
2 0b110010
3 0b110011
4 0b110100
5 0b110101
6 0b110110
7 0b110111
8 0b111000
9 0b111001
```

![](https://images.hujiekang.top/blogimage-2195e62a99bfe390c8ca9ea71f3a7034-fbf907b6.png)

# 关卡4

压缩包解压下来是一个残缺的二维码和另一个压缩包，二维码补全之后得到一个URL，下载后又得到一个加密的压缩包call_me.zip

![](https://images.hujiekang.top/blogimage-70d4d20764889509e2e5f24ed6943539-742a01e7.png)

在最开始解压出来的那个压缩包是没有密码的，解压下来是一段音频，用Audition打开一眼就看出是摩斯电码：

![](https://images.hujiekang.top/blogimage-0034fcf7a6e18d028008f888250fe647-bf995e68.png)

解码得到一个手机号`19910386797`，也正是call_me.zip的密码，解压拿到下一关的网站地址<https://darknet.hacker5t2ohub.com/>，也就是这题的flag。

# 关卡5

这题目也是差一点点就出来了。。。感觉思路还是不够严谨，通过这道题大概最大的收获就是不要有事没事就去想着破解JWT（捂脸）

题目是一个商城，初始有一些货币，但是买的东西都没什么卵用，猜测那个付费咨询有点东西：

![](https://images.hujiekang.top/blogimage-50f792f721393827210f9ad282853178-98a30730.png)

摸了一下其他的接口，感觉没什么可控的变量，最后摸到了购买的接口，比赛的时候我一直在试可能是不是`int32`溢出，发现就算溢出了也只是报错不会继续执行，于是当时就放弃了，就像下面这样子：

![](https://images.hujiekang.top/blogimage-4c3b2939f2dd77fb9efb04c91ddf5564-3ef29a32.png)

在官方的wp里给出了购买的数量是一个`int8`类型的值，而且溢出的也直接是购买数量，而是购买的总金额，总金额是一个`int16`，于是溢出就只需要大于32767即可。通过测试最大可购买数量，发现做了限制，最多只能买34个，否则提示库存不足，于是发现购买33个或34个付费咨询，最终的金额为33000或34000，最终金额成功溢出为负值，就购买成功了。（比赛的时候但凡做个购买数量的遍历也不至于做不出来）

![](https://images.hujiekang.top/blogimage-d1199884c46c01625b81ea415fa0fcd5-91f4ffa3.png)

站内信获得消息

> 商品【付费咨询】购买成功，信息如下： 前往微信公众号“腾讯安全应急响应中心”(tsrc_team)，回复"T-Star666"获取信息

![](https://images.hujiekang.top/blogimage-27155987a463d739a7f041084a869474-ff025cd3.jpg)

打开URL需要输入一个密钥，于是登上去这个邮箱找到三条邮件，拿到经过了Hash加密的三段密钥

> Key Hashes Part 1: https://pastebin.com/QZ7QBmmd
> Key Hashes Part 2:  https://pastebin.com/TUNVRVvk
> Key Hashes Part 3:  https://pastebin.com/rTqtad96

其实不用全部都解出来，通过Hashcat自带的字典以及CMD5网站可以解出一部分：

![](https://images.hujiekang.top/blogimage-610bef88b65e92f36680f393957f7418-7393b1f6.png)

把这些零零碎碎的单词丢去搜一下很容易搜到原文：

![](https://images.hujiekang.top/blogimage-11c7700e5b8986503a55ed7bb04741b4-1260e796.png)

最后把最后一部分的Hash解一些出来，能够得到文段的结尾部分，把这一段英文完整的截取下来就是下面这一段：

> Security is too often merely an illusion, an illusion sometimes made even worse when gullibility, naivete, or ignorance come into play. The world's most respected scientist of the twentieth century, Albert Einstein, is quoted as saying, "Only two things are infinite, the universe and human stupidity, and I'm not sure about the former." In the end, social engineering attacks can succeed when people are stupid or, more commonly, simply ignorant about good security practices. With the same attitude as our security-conscious homeowner, many information technology (IT) professionals hold to the misconception that they've made their companies largely immune to attack because they've deployed standard security products - firewalls, intrusion detection systems, or stronger authentication devices such as time-based tokens or biometric smart cards. Anyone who thinks that security products alone offer true security is settling for. the illusion of security. It's a case of living in a world of fantasy: They will inevitably, later if not sooner, suffer a security incident.

复制进网站，得到flag：

![](https://images.hujiekang.top/blogimage-e2b7e3eda755286381f316443856e3b4-238d98b4.png)

# 关卡6

附件是一个Word文档，在Word文档里显示隐藏文字可以读到一截flag，以及拿到一张图片。书签的内容是一个Base32编码，解码后得到`175.178.148.197`

![](https://images.hujiekang.top/blogimage-25a8c10166fb890460c66672305c3baa-37990eb4.png)

主要还是对工具用的不熟啊，比赛的时候以为Outguess工具不需要密码，看见输出里没有信息以为这个图片只是放在那好看的。。。输入密码123456，成功解密：

![](https://images.hujiekang.top/blogimage-e1d1539bf8dc286561acccdf89461e11-b2be221e.png)

三个部分拼起来就是`175.178.148.197/062ycz7s9458b772e91/webs`

然后又是个Web题，好像是个简单的SSRF，复现的时候站已经关掉了就没复现
