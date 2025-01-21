---
title: L3HCTF 2021 WriteUp
date: 2021-11-15 13:38:03
categories:
  - CTF
---



比赛感受：笑死，根本不会做

借用比赛群里发的一个表情包，Golang逆向属实给整麻了属于是

<img src="https://pic.hujiekang.top/uploads/big/7dc703e6830772bb61bf1e694ee658bd.jpg" style="zoom:50%;" />

<!-- more -->

不过题目质量还可以，就做出来两个半题目，剩下的都是赛后复现

# Web

## EasyPHP

从拿到Flag的内容来看，这道题貌似是要考察一个CVE：CVE-2021-42574，但其实这道题从很平常的代码逻辑角度去看也能做出来

打开网页直接有源码，按照代码高亮的一些规律很容易看出猫腻，如下图：

![](https://pic.hujiekang.top/uploads/big/9f65baf3e57c7e1e29ac3b55a5ec005d.png)

这里的猫腻在于普通的注释应该都是黄色的才对，而这里`+!!`直接被高亮成了运算符的绿色，`L3HCTF`也是呈现了不同的颜色，所以这里肯定有问题

把代码复制到VScode里面一眼就能看出来，存在不可见的Unicode控制字符：

![](https://pic.hujiekang.top/uploads/big/93b7713668fdaf2c9ebc0052838781bf.png)

所以这样去看，就会发现和网页中显示的代码逻辑不太一样了，`if`判断的条件变成了下面这样子（避免显示问题，控制字符用“字符x”代替）：

```php
if (
    "admin" == $_GET[username] &
    字符1 + !! 字符2 &
	"字符1CTF字符2l3hctf" == $_GET[字符1L3H字符2password]
)
```

这里的`&`变成单个出现，也就是按位与。所以需要做到三个条件均为1，最终才是1。第一个和第三个条件是由我们控制的，很简单；第二个条件尝试后发现是恒等于1的，所以只需要将Unicode控制字符做一下URLEncode再带入进去提交即可。[URL-encode Unicode - Online Unicode Tools](https://onlineunicodetools.com/url-encode-unicode)

最终Payload：`username=admin&%e2%80%ae%e2%81%a6L3H%e2%81%a9%e2%81%a6password=%e2%80%ae%e2%81%a6CTF%e2%81%a9%e2%81%a6l3hctf`

Flag: `flag{Y0U_F0UND_CVE-2021-42574!}`

参考链接：[Trojan Source Attacks](https://trojansource.codes/)，是和Flag一起出的，还有相关的研究论文可以参考

# Misc

## a-sol

> We captured traffic in the IDC management network. [Attachment](https://o.hujiekang.top/downloads/f371aea737484ec4a4821907a935c2c0.zip)

这题是一个流量分析题，是一个叫做IPMI的管理接口相关，好像是一套用来远程管理服务器的协议，文档可以在Intel官网找到：[IPMI Specification, V2.0, Rev. 1.1: Document (intel.com)](https://www.intel.com/content/www/us/en/products/docs/servers/ipmi/ipmi-second-gen-interface-spec-v2-rev1-1.html)。用Wireshark查看协议细节，发现大部分协议包都是加密的，所以需要通过分析握手包来获取到解密的方法。

![](https://pic.hujiekang.top/uploads/big/dc4cf2dc3742fef2920f0291bed23d91.png)

如上图，握手包一共有6个，分别是RMCP+ Open Session Request、RMCP+ Open Session Response以及4个RAKP Message，对应到文档中的第13.17-13.24节

在RMCP+ Open Session Request、RMCP+ Open Session Response的两个包中确定了整个过程中使用的完整性、保密性、认证算法，两个消息的这三个Payload格式是一致的，每个8字节共24字节位于数据的最末端。

- Byte1 - Payload Type，00h代表是认证算法，01代表是完整性算法，02代表是加密算法
- Byte2:3 - 保留
- Byte4 - Payload Length，这里固定为08h
- Byte5 - 低6位代表算法类型，高2位保留
- Byte6:8 - 保留

然后通过文档得知，RMCP+ Open Session Response即为最终确定的算法类型，于是直接看Response的数据包：

```
0000   00 00 04 00   -- MsgTag:0, StatusCode:0(NoError), PrivLevel:AdministratorLevel
0004   a4 a3 a2 a0   -- RemoteConsoleSessID:0xA0A2A3A4
0008   df b7 42 7d   -- ManagedSystemSessID:0x7D42B7DF
000C   00 00 00 08   -- AuthenticationPayload
0010   01 00 00 00      -- AlgorithmType: 01
0014   01 00 00 08   -- IntegirtyPayload
0018   01 00 00 00      -- AlgorithmType: 01
001C   02 00 00 08   -- ConfidentialityPayload
0020   01 00 00 00      -- AlgorithmType: 01
```

获取到算法的类型，查对应表可以得到算法类型（文档第13.28节）

- 认证算法：RAKP-HMAC-SHA1
- 完整性算法：HMAC-SHA1-96
- 加密算法：AES-CBC-128

所以目的就是获取到加密所用到的密钥。接着看AES算法的使用细节（文档第13.29.2节），发现生成AES的密钥需要K2，而K2需要从SIK中获取：

> AES-128 uses a 128-bit Cipher Key. The Cipher Key is the first 128-bits of key "K2", K2 is generated from the Session Integrity Key (SIK) that was created during session activation.

然后在第13.31节找到了SIK的生成方式：

$$SIK=HMAC_{K_G}(R_M|R_C|Role_M|ULength_M|<UName_M>)$$

- Kg - 160-bit长的密钥，文档中有关于KG的描述：***Note that K[UID] is used in place of Kg if ‘one-key’ logins are being used.*** 而K[UID]也有相关描述：***K[UID] is the user-specific key that is associated with the given username and role.***
- Rm - Remote Console Random Number，出现于RAKP Message 1的Byte9:24
- Rc - Managed System Random Number，出现于RAKP Message 2的Byte9:24
- Rolem - Requested Privilege Level (Role)，出现于RAKP Message 1的Byte25
- ULengthm - User Name Length byte，出现于RAKP Message 1的Byte28
- UNamem - User Name bytes，从RAKP Message 1的Byte29开始，长度不超过16Bytes

根据文档的描述，基本可以确定K[UID]就是每个登录用户对应的密码了。然后在一篇文章中找到默认Kg的值为null（真实性未知），所以基于这个条件，这里的Kg能够确定和K[UID]等价。

拿到了SIK之后，需要获得K2，算法如下：（文档第13.32节）

$$K_2 = HMAC_{SIK}(const\space2),\quad const\space2=0x02020202020202020202020202020202$$

知道了这些就可以获取AES的密钥了。但是现在还有个未知值K[UID]，也就是密码。然后有看到一篇文章使用的密码是admin，于是就试了一下，发现可以成功解密。（等一波官方WP，这里的密码值获取方法存疑）

然后提取出数据包中对应的值，把包含Serial Over LAN数据包的整个会话数据包单独导出，写了一个Golang的代码直接跑（gopacket真滴好用）

```go
package main

import (
	"bytes"
	"crypto/aes"
	"crypto/cipher"
	"crypto/hmac"
	"crypto/sha1"
	"encoding/binary"
	"encoding/hex"
	"fmt"
	"github.com/google/gopacket"
	"github.com/google/gopacket/pcap"
	"os"
)

func main() {
	output, _ := os.OpenFile(`result.txt`, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0755)
	defer output.Close()

	Rm := "\x6a\x3a\x75\x27\x5c\x5f\xe6\x0d\xce\x8a\x68\x0d\x2b\x54\xfc\x78"
	Rc := "\xea\x9b\xa3\xe5\x7d\xd9\x90\xcd\x70\x9c\xfa\xe8\x94\xff\x7a\xc2"
	Rolem := "\x14"
	ULengthm := "\x05"
	UNamem := "\x61\x64\x6d\x69\x6e"
	KG := "\x61\x64\x6d\x69\x6e\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00"

	hSIK := hmac.New(sha1.New, []byte(KG))
	hSIK.Write([]byte(Rm+Rc+Rolem+ULengthm+UNamem))

    // 生成SIK
	SIK := hSIK.Sum(nil)

    // 生成K2
	hKey := hmac.New(sha1.New, SIK)
	hKey.Write([]byte{02,02,02,02,02,02,02,02,02,02,02,02,02,02,02,02,02,02,02,02})
	aesKey := hKey.Sum(nil)[:16]  // 取前128Bit
	aesCipher, _ := aes.NewCipher(aesKey)

	handle, err := pcap.OpenOffline(`x.pcapng`)
	if err != nil {
		return
	}
	defer handle.Close()

	// 打开流量包进行读取
    packetSource := gopacket.NewPacketSource(handle, handle.LinkType())
	for packet := range packetSource.Packets() {
		// 读取应用层Payload
        p := packet.ApplicationLayer().Payload()
		if p[1] == 0xc0 {
			fmt.Fprintln(output, "\nMsg Type: IPMI Message")
		} else if p[1] == 0xc1 {
			fmt.Fprintln(output,"\nMsg Type: Serial Over LAN")
		}

        // 获取加密Payload
		msgLen := BytesToInt(p[10:12])
		fmt.Fprintf(output,"Msg Length: %d\n", msgLen)
		payload := p[12:(12+msgLen)]

        // 解密Payload
		en := cipher.NewCBCDecrypter(aesCipher, payload[:16])
		result := make([]byte, msgLen-16)
		en.CryptBlocks(result, payload[16:])

		// 截去Padding，打印明文部分
        paddingLen := result[len(result) - 1]
		fmt.Fprintln(output, hex.Dump(result[:(len(result)-1-int(paddingLen))]))
	}
}

func BytesToInt(bys []byte) int {
	bytebuff := bytes.NewBuffer(bys)
	var data uint16
	binary.Read(bytebuff, binary.LittleEndian, &data)
	return int(data)
}
```

截取部分输出如下：

```
Msg Type: Serial Over LAN
Msg Length: 32
00000000  00 03 68 00                                       |..h.|

Msg Type: Serial Over LAN
Msg Length: 144
00000000  04 00 00 00 20 20 20 20  20 20 20 20 20 20 20 20  |....            |
00000010  20 20 20 20 20 20 20 20  20 20 20 20 20 20 20 20  |                |
00000020  20 20 20 20 20 20 20 20  20 56 65 72 73 69 6f 6e  |         Version|
00000030  20 32 2e 31 37 2e 31 32  34 39 2e 20 43 6f 70 79  | 2.17.1249. Copy|
00000040  72 69 67 68 74 20 28 43  29 20 32 30 31 37 20 41  |right (C) 2017 A|
00000050  6d 65 72 69 63 61 6e 20  4d 65 67 61 74 72 65 6e  |merican Megatren|
00000060  64 73 2c 20 49 6e 63 2e  20 20 20 20 20 20 20 20  |ds, Inc.        |
00000070  20 20 20 20                                       |    |

Msg Type: Serial Over LAN
Msg Length: 32
00000000  00 04 70 00                                       |..p.|

Msg Type: Serial Over LAN
Msg Length: 144
00000000  05 00 00 00 20 20 20 20  20 42 49 4f 53 20 44 61  |....     BIOS Da|
00000010  74 65 3a 20 30 31 2f 30  33 2f 32 30 31 37 20 31  |te: 01/03/2017 1|
00000020  38 3a 32 32 3a 32 34 20  56 65 72 3a 20 53 31 50  |8:22:24 Ver: S1P|
00000030  5f 33 41 30 34 20 20 20  20 20 20 20 20 20 20 20  |_3A04           |
00000040  20 20 20 20 20 20 20 20  20 20 20 20 20 20 20 20  |                |
00000050  20 20 20 20 20 20 20 20  20 50 72 65 73 73 20 3c  |         Press <|
00000060  44 45 4c 3e 20 6f 72 20  3c 46 32 3e 20 74 6f 20  |DEL> or <F2> to |
00000070  65 6e 74 65                                       |ente|
```

可以很清晰的看到整个BIOS启动到输入密码的过程，Flag就藏在密码里面，第一次输入了123456显示密码错误，第二次输入了Flag成功登录。过滤掉不可见字符，如下：

```sh
Debian GNU/Linux 10 l3hsecsrv002 ttyS1

l3hsecsrv002 login: root
Password: 123456
Login incorrect
l3hsecsrv002 login: naivekun
Password: L3HCTF{BAdCrYpt0GrAph1cPRact1ce138295}

Last login: Fri Nov 12 20:23:42 CST 2021 on ttyS1
Linux l3hsecsrv002 4.19.0-16-amd64 #1 SMP Debian 4.19.181-1 (2021-03-19) x86_64

The programs included with the Debian GNU/Linux system are free software;
the exact distribution terms for each program are described in the
......
```

参考链接：<https://github.com/beingj/hash/blob/master/RMCP%2B%20Packet%20decrypt%20and%20authcode.org>

