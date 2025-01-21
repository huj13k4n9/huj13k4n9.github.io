---
title: PHP中对数组的操作
date: 2019-10-19 16:38:39
categories:
  - Web
---

# 数组的声明

PHP中有两种数组：索引数组和关联数组。索引数组的索引是从0开始递增的数字，由程序自动生成；关联数组使用字符串作为索引值，由用户自行输入。

## 初始化时直接赋值

```php
//索引数组
$example[0] = "a";
$example[1] = "b";
$example[2] = "c";

//关联数组
$example_1["a"] = "1";
$example_1["b"] = "2";
$example_1["c"] = "3";
```

若要按默认索引顺序声明索引数组，可以不用填入索引值，程序自动按声明顺序为键值建立索引：

```php
$example[] = "a";   //索引为0
$example[] = "b";   //索引为1
$example[] = "c";   //索引为2
```

<!-- more -->

## 通过<code style="font-size:20px">array()</code>函数创建

```php
//索引数组
$example = array("a", "b", "c");

//关联数组
$example_1 = array("a" => "1", "b" => "2", "c" => "3");
```

多维数组的创建使用`array()`函数嵌套完成：

```php
$example = array(
    "array1" => array("a", "b", "c"),
    "array2" => array("d", "e", "f"),
    "array3" => array("g", "h", "i")
)
```


# 数组的遍历

## 使用<code style="font-size:20px">for</code>循环遍历

```php
<?php

    $example = array("a", "b", "c");

    for($i = 0; $i < count($example); $i++){
        echo $example[$i]."<br>";
    }

?>
```

打印结果：

```php
a
b
c
```

## 使用<code style="font-size:20px">foreach</code>语句遍历

`foreach`针对两种数组，有两种用法：

```php
<?php

//索引数组
$example = array("a", "b", "c");
/**
 *  将数组 $example 中的元素逐个取出赋给变量$value
 */
foreach($example as $value){
    echo $value."<br>";
}

//关联数组
$example_1 = array("a" => "1", "b" => "2", "c" => "3");
/**
 *  将数组 $example 中的键值对逐个取出，键赋给变量 $key ,值赋给变量 $value
 */
foreach($example as $key => $value){
    echo $key." => ".$value."<br>";
}

?>
```

打印结果：

```php
a
b
c
0 => a
1 => b
2 => c
```

## 联合使用<code style="font-size:20px">list()</code>、<code style="font-size:20px">each()</code>和<code style="font-size:20px">while</code>循环遍历

1. `list()`是PHP的一种语言结构，它不是一个真正的函数，用于同时给一组变量赋值，使用赋值运算符`=`将一个数组里的数据赋给一组变量。
    **注意：`list()`只能用于数字索引的数组，并假定索引从0开始。**

    ```php
    <?php
        $lamp = array("Linux", "Apache", "MySQL", "PHP");

        list($system, $server, $database, $language) = $lamp;

        echo "This server uses ".$system." system, ".$server." server, ".$database." database and ".$language.".<br>";
    ?>
    ```

    打印结果：

    ```
    This server uses Linux system, Apache server, MySQL database and PHP.
    ```

2. `each()`函数用于对数组的逐个遍历。函数需要传入一个数组，返回当前元素的键和值（默认为第一个），然后将数组的指针移向下一个元素。
   `each()`返回键和值的方式是返回一个数组，键名为`0`、`1`、`key`、`value`。键`0`和`key`的值都是索引的值，键`1`和`value`的值都是相应索引对应的值。
    **注意：当返回完最后一个元素后，指针越过数组末端将返回`FALSE`。**

    ```php
    <?php
        $lamp = array("Linux", "Apache", "MySQL", "PHP");

        var_dump(each($lamp));
        echo "<br>";
        var_dump(each($lamp));
        echo "<br>";
        var_dump(each($lamp));
        echo "<br>";
        var_dump(each($lamp));
        echo "<br>";
        var_dump(each($lamp));
        echo "<br>";
    ?>
    ```

    打印结果：

    ```php
    array(4) { [1]=> string(5) "Linux" ["value"]=> string(5) "Linux" [0]=> int(0) ["key"]=> int(0) }
    array(4) { [1]=> string(6) "Apache" ["value"]=> string(6) "Apache" [0]=> int(1) ["key"]=> int(1) }
    array(4) { [1]=> string(5) "MySQL" ["value"]=> string(5) "MySQL" [0]=> int(2) ["key"]=> int(2) }
    array(4) { [1]=> string(3) "PHP" ["value"]=> string(3) "PHP" [0]=> int(3) ["key"]=> int(3) }
    bool(false)  //指针越过数组末端，返回FALSE
    ```

    <b style="color:#ff7473">"在高版本的PHP中（PHP7.2及以上），使用<code style="color:#6666ff">each()</code>函数会提示已过时的函数（<code style="color:#6666ff">Deprecated: The each() function is deprecated.</code>）。
    除此之外，在多次遍历数组时，<code style="color:#6666ff">each()</code>不会对数组指针重置至数组开头，所以若不手动重置指针，后续将无法遍历；而每次使用<code style="color:#6666ff">foreach</code>，都会自动重置数组指针。所以建议换用<code style="color:#6666ff">foreach</code>遍历数组。</b>

结合`each()`的遍历至数组末端返回`FALSE`、`list()`批量把数组内容赋给变量和`while`循环，就可以实现遍历数组了。

```php
<?php
    $lamp = array(
        "System" => "Linux",
        "Server" => "Apache",
        "Database" => "MySQL",
        "Language" => "PHP"
        );

    while(list($key, $value) = each($lamp)){
        echo "The ".$key." is ".$value.".<br>";
    }
?>
```

打印结果：

```
The System is Linux.
The Server is Apache.
The Database is MySQL.
The Language is PHP.
```

## 使用数组内部指针控制函数遍历

数组内部指针是数组内部的组织机制，指向数组中的某个元素，默认指向数组的第一个元素。使用以下函数可以操作数组的内部指针：

- `current()`（别名`pos()`） ：取得目前指针的值
- `key()` ：取得目前指针的索引值
- `next()` ：移动指针到下一个元素的位置
- `prev()` ：移动指针到上一个元素的位置
- `end()` ：移动指针到数组的最后一个元素位置
- `reset()` ：移动指针到数组的第一个元素位置

```php
<?php
    $lamp = array(
        "System" => "Linux",
        "Server" => "Apache",
        "Database" => "MySQL",
        "Language" => "PHP"
    );

    echo key($lamp)." => ".current($lamp)."<br>";
    next($lamp);
    next($lamp);
    echo key($lamp)." => ".current($lamp)."<br>";
    prev($lamp);
    echo key($lamp)." => ".current($lamp)."<br>";
    end($lamp);
    echo key($lamp)." => ".current($lamp)."<br>";
    reset($lamp);
    echo key($lamp)." => ".current($lamp)."<br>";
?>
```

打印结果：

```php
System => Linux
Database => MySQL
Server => Apache
Language => PHP
System => Linux
```

# 一些预定义数组

（有些预定义数组的含义还不是很理解，后面深入学习再更新）

- **`$_SERVER`**
  由Web服务器创建，包含头信息、路径、脚本位置、脚本名称、系统环境变量、请求方法、请求路径等信息。
  下图为使用`print_r()`函数产生的输出：

  ![](https://pic.hujiekang.top/uploads/big/44c469c45e4b3c56d09d8d72da8f615d.png)

- **`$_ENV`**
  $_ENV的内容是在PHP解析器运行时，从PHP所在服务器中的环境变量转变为全局变量得到的。
  下图为使用`print_r()`函数产生的输出：

  ![](https://pic.hujiekang.top/uploads/big/54ac006a5e9fdd510f2e4b84642171cb.png)

- **`$_GET`**
  这个数组存放着通过GET请求方法传入的变量及其对应的值。
  下图为传入参数后使用`print_r()`函数产生的输出：

  ![](https://pic.hujiekang.top/uploads/big/4b42ae328423e956d7064dcba2423631.png)

- **`$_POST`**
  这个数组存放着通过POST请求方法传入的变量及其对应的值。

  建立一个带有POST提交框和输出$_POST数组内容的页面：

  ```html
  <html>
    <head>
        <title>POST</title>
    </head>
    <body>
    <form method="post" action="index.php">
        <input type="text" name="lamp">
        <input type="submit">
    </form>
    <?php
        print_r($_POST);
    ?>
    </body>
  </html>
  ```

  页面效果：

  ![](https://pic.hujiekang.top/uploads/big/7c3db8a5b331e6fb8e3b3858162821f0.png)

  接下来在输入框中输入数据提交，显示如下：

  ![](https://pic.hujiekang.top/uploads/big/fb4a70065643c9c8d07e9305929ecc33.png)

- **`$_REQUEST`**
  此数组包含了`$_GET`、`$_POST`、`$_COOKIE`数组的全部内容，也就是说，在这里可以访问到使用GET方法和POST方法请求的数据。但是速度较慢，不推荐使用。

  打印效果如图所示：

  ![](https://pic.hujiekang.top/uploads/big/3ea34c7e46cba87669e326d8b0739210.png)

- **`$GLOBALS`**
  此数组包含了程序里所有的全局变量。

  ```php
  <?php
        $a = 1;
        $b = 2;
        $c = 3;
        print_r($GLOBALS);
  ?>
  ```

  打印结果：

  ![](https://pic.hujiekang.top/uploads/big/09a60271ef7986c785c02c743b19b076.png)

  注意：`$_GET`、`$_POST`、`$_FILES`、`$_COOKIE`这些超全局数组也属于全局变量，所以也包含在内。

- **`$_FILES`**
  这个数组存储了通过表单中的`file`输入域、以`POST`方法上传的文件信息。**（`$_POST`不能获取到`file`域的内容。）**

  下面创建了一个带有`file`域的表单、在下方可以打印出`$_POST`和`$_FILES`数组的内容。可以看到`$_POST`是一个空数组，而`$_FILES`则包含有文件名、文件临时文件的路径、文件大小等信息。
  <b style="color:#ff7473">注意：<code style="color:#ff7473">form</code>标签里面必须带有<code style="color:#ff7473">enctype="multipart/form-data"</code>属性，否则<code style="color:#ff7473">$_FILES</code>会显示为空。</b>

  ![](https://pic.hujiekang.top/uploads/big/28a3b9d816651c5323aec3bac6a38309.png)

- **`$_COOKIE`**
  这个数组存储了从客户端浏览器提取的`cookie`信息。

- **`$_SESSION`**
  这个数组存储了与客户端的会话控制信息。

# 处理数组的相关函数

## 键、值操作函数

1. `array_change_key_case()`
    把数组的键名改为全大写/全小写。

   第一个参数是要处理的数组，是必选参数；第二个参数是可选参数，用于设定转为大写(`CASE_UPPER`)还是小写(`CASE_LOWER`)（默认是小写）。

   ```php
   <?php
       $lamp = array(
           "System" => "Linux",
           "Server" => "Apache",
           "Database" => "MySQL",
           "Language" => "PHP"
       );

       print_r(array_change_key_case($lamp, CASE_UPPER))
   ?>
   ```

   打印结果：

   ```php
   Array ( [SYSTEM] => Linux [SERVER] => Apache [DATABASE] => MySQL [LANGUAGE] => PHP )
   ```

2. `array_key_first()`
    取出数组的第一个键。
    **（数组为空时返回`FALSE`）**

3. `array_key_last()`
   取出数组的最后一个键。
   **（数组为空时返回`FALSE`）**

4. `array_keys()`
   返回数组中的部分或全部键名。

   第一个参数是要处理的数组，后面的参数都是可选参数。第二个参数用于设置返回某个特定值对应的键名，默认是返回所有键名；第三个参数为`bool`值，用于设置是否进行严格匹配`===`，默认为`FALSE`。

   ```php
    <?php
        $lamp = array(
            "System" => "Linux",
            "Server" => "Apache",
            "Database" => "MySQL",
            "Language" => "PHP",
            "a" => 1
        );

        print_r(array_keys($lamp));
        echo "<br>";
        print_r(array_keys($lamp,"1"));
        echo "<br>";
        print_r(array_keys($lamp,"1",true));
    ?>
    ```

    打印结果：

    ```php
    Array ( [0] => System [1] => Server [2] => Database [3] => Language [4] => a )
    Array ( [0] => a )
    Array ( )
    ```

5. `array_values()`
   返回数组中所有的值并给其建立数字索引。

   这个函数不能通过特定键来返回对应的值，只能返回所有值。

   ```php
    <?php
        $lamp = array(
            "System" => "Linux",
            "Server" => "Apache",
            "Database" => "MySQL",
            "Language" => "PHP"
        );

        print_r(array_values($lamp))
    ?>
    ```

    打印结果：

    ```php
    Array ( [0] => Linux [1] => Apache [2] => MySQL [3] => PHP )
    ```

6. `in_array()`
   检查数组中是否存在某个值，若存在返回`TRUE`，否则返回`FALSE`。

   第一个参数是待搜索的值，第二个参数为要搜索的数组，第三个可选参数为是否进行严格匹配（默认为`FALSE`）。

   ```php
   <?php
        $lamp = array(
            "System" => "Linux",
            "Server" => "Apache",
            "Database" => "MySQL",
            "Language" => "PHP",
            "a" => 1
        );

        var_dump(in_array("1",$lamp,true));
   ?>
   ```

   打印结果为`bool(false)`。

7. `array_key_exists()`
   检查数组里是否有指定的键名或索引，返回对应的`bool`值。

   使用`isset()`也可以实现同样的功能，但两者有一个区别：再键对应的值为`null`时，`isset()`返回`false`，而`array_key_exists()`返回`true`。

   ```php
   <?php
        $lamp = array(
            "System" => "Linux",
            "Server" => "Apache",
            "Database" => "MySQL",
            "Language" => "PHP",
        );

        var_dump(array_key_exists("Language",$lamp));
   ?>
   ```
   打印结果为`bool(true)`。

8. `array_search()`
    在数组中搜索给定的值，如果成功则返回首个相应的键名。

    这个函数的参数和`in_array()`一样，只是返回值为对应的键名。

    ```php
    <?php
        $lamp = array(
            "System" => "Linux",
            "Server" => "Apache",
            "Database" => "MySQL",
            "Language" => "PHP",
            "a" => 1
        );

        var_dump(in_array("1",$lamp,true));
    ?>
    ```
    打印结果为`string(1) "a"`。

9.  `array_column()`
    返回数组中指定的一列。

    第一个参数为待处理数组，第二个参数为要返回列的键名，第三个参数是可选参数，为返回数组中索引列的键名（若不指定则为默认索引）。

    ```php
    <?php
        $records = array(
            array(
                'id' => 2135,
                'first_name' => 'John',
                'last_name' => 'Doe',
            ),
            array(
                'id' => 3245,
                'first_name' => 'Sally',
                'last_name' => 'Smith',
            ),
            array(
                'id' => 5342,
                'first_name' => 'Jane',
                'last_name' => 'Jones',
            ),
            array(
                'id' => 5623,
                'first_name' => 'Peter',
                'last_name' => 'Doe',
            )
        );

        print_r(array_column($records, 'first_name'));
        echo "<br>";
        print_r(array_column($records, 'first_name', 'id'));
    ?>
    ```

    打印结果：

    ```php
    Array ( [0] => John [1] => Sally [2] => Jane [3] => Peter )
    Array ( [2135] => John [3245] => Sally [5342] => Jane [5623] => Peter )
    ```

10. `array_flip()`
    将数组的键和值交换。

11. `array_reverse()`
    返回元素顺序翻转的数组。第二个可选参数`preserve_keys`为`bool`值，若设为`TRUE`，则保留原来键的值（仅索引数组，关联数组总是保留）；否则不保留。

12. `array_replace()`和`array_replace_recursive()`
    这两个函数都是使用后面数组元素相同键的值替换第一个参数数组中的值。如果一个键**存在于第一个数组同时也存在于第二个数组**，它的值将被第二个数组中的值**替换**；如果一个键**存在于第二个数组，但是不存在于第一个数组**，则会在第一个数组中**创建这个元素**；如果一个键**仅存在于第一个数组**，它将**保持不变**。如果传递了多个替换数组，它们将被按顺序依次处理，后面的数组将覆盖之前的值。

    两者的区别是：后者不是简单的替换，它将遍历数组并将相同的处理应用到数组的***内部值***。

    <b style="color:#ff7473">注意：两者的替换标准都是数组的键名。在处理索引数组时应注意索引值的对应。</b>

    ```php
    <?php
        $a1=array(
            "a"=>array(
                "a"=>array("red"),
                "b"=>array("green","blue"),
            ),
            "b"=>array(
                "green",
                "blue"
            )
        );
        $a2=array(
            "a"=>array(
                "a"=>"yellow",
                "b"=>array("black")
            ),
            "b"=>array("black")
        );

        $result=array_replace_recursive($a1,$a2);
        print_r($result);
        echo "<br>";
        $result=array_replace($a1,$a2);
        print_r($result);
    ?>
    ```

    打印结果：

    ```php
    //array_replace_recursive
    Array (
        [a] => Array (
            [a] => yellow      //Replaced
            [b] => Array (
                [0] => black   //Replaced
                [1] => blue
            )
        )
        [b] => Array (
            [0] => black       //Replaced
            [1] => blue
        )
    )
    //array_replace
    Array (
        [a] => Array (
            [a] => yellow      //Replaced
            [b] => Array (     //All items in "b" key are replaced
                [0] => black
            )
        )
        [b] => Array (
            [0] => black       //All items in "b" key are replaced
        )
    )
    ```

## 统计数组元素个数、唯一性

1. `count()`（别名`sizeof()`）
   返回数组元素个数。

2. `array_count_values()`
   统计数组中每个元素出现的次数，以数组形式返回。

   ```php
    <?php
        $a = array("a","a","a","b","b","c");
        print_r(array_count_values($a));
    ?>
    ```

    打印结果：

    ```php
    Array ( [a] => 3 [b] => 2 [c] => 1 )
    ```

3. `array_unique()` <a name="sort"></a>
   除去数组中重复的值（使用松散的比较`==`）。保留第一个遇到的键名和值。

   第二个可选参数，用于设置返回的数组中的排序方式。有以下四个值：

   - `SORT_REGULAR`：按照通常方法比较（不修改类型）
   - `SORT_NUMERIC`：按照数字形式比较
   - `SORT_STRING`：按照字符串形式比较
   - `SORT_LOCALE_STRING`：根据当前的本地化设置，按照字符串比较。



## 使用回调函数处理数组的函数

1. `array_filter()`
   用回调函数过滤数组中的单元。如果回调函数返回TRUE，则该值不会被过滤；若返回FALSE，则该值被过滤。
   第三个可选参数`flag`用于确定函数接受参数的形式（若不设定`flag`则接受值为唯一参数）：
   - ARRAY_FILTER_USE_KEY - 接受键名作为的唯一参数
   - ARRAY_FILTER_USE_BOTH - 同时接受键名和键值

    ```php
    <?php
        $arr = ['a' => 1, 'b' => 2, 'c' => 3, 'd' => 4];

        var_dump(array_filter($arr, function($k) {
            return $k == 'b';
        }, ARRAY_FILTER_USE_KEY));

        var_dump(array_filter($arr, function($v, $k) {
            return $k == 'b' || $v == 4;
        }, ARRAY_FILTER_USE_BOTH));
    ?>
    ```

    打印结果：

    ```php
    array(1) {
        ["b"] => int(2)
    }
    array(2) {
        ["b"] => int(2)
        ["d"] => int(4)
    }
    ```

2. `array_walk()`和`array_walk_recursive()`
    对数组中的每个成员应用回调函数。`array_walk_recursive()`递归地应用回调函数。第三个可选参数`userdata`将作为第三个参数传入回调函数。

    ```php
    <?php
        $arr = array(
            "a" => 32,
            "b" => 16,
            "c" => 8,
            "d" => array(
                "e" => 4,
                "f" => 2
            )
        );

        function divide_2(&$value){
            $value /= 2;
        }

        array_walk_recursive($arr, "divide_2");
        print_r($arr);
    ?>
    ```

    打印结果：

    ```php
    Array (
        [a] => 16
        [b] => 8
        [c] => 4
        [d] => Array (
            [e] => 2
            [f] => 1
        )
    )
    ```

3. `array_map()`
   功能和`array_walk()`类似，`array_map()`可以同时处理多个数组。（函数形参数量必须和数组数量相等）

   ```php
    <?php
        $arr1 = array(1,2,3,4,5);
        $arr2 = array(1,2,3,4,5);

        function cube_and_add($value1,$value2){
            return $value1*$value1*$value1+$value2;
        }

        print_r(array_map("cube_and_add", $arr1, $arr2));
    ?>
    ```

    打印结果：

    ```php
    Array (
        [0] => 2
        [1] => 10
        [2] => 30
        [3] => 68
        [4] => 130
    )
    ```

4. `array_reduce()`
   将回调函数应用到数组中的每一个值，最终简化为一个值。

   可选参数`initial`将在处理开始前使用，或者作为处理结束，数组为空时的最后一个结果。

   ```php
    <?php
        $arr1 = array(1,2,3,4,5);

        function square_and_add($carry,$item){
            $carry = $item*$item+$carry;
            return $carry;
        }

        print_r(array_reduce($arr1,"square_and_add", 10));
    ?>
    ```

    打印结果为65。

## 对数组进行排序的函数

1. 简单排序（索引数组）
   - `sort()` - 对键值升序排序
   - `rsort()` - 对键值降序排序
   **这种排序方式将会重建索引。**
   决定排序方式的可选参数见`array_unique()`的介绍。（下同）

2. 根据键名排序
   - `ksort()` - 对键名升序排序
   - `krsort()` - 对键名降序排序
   使用方式同`sort()`和`rsort()`，排序之后保留原来的键。

3. 根据元素的值排序
   - `asort()` - 对键名升序排序
   - `arsort()` - 对键名降序排序
   使用方式同`ksort()`和`krsort()`，排序之后保留原来的键。

4. 自然排序
   自然排序采用一种符合人类认知的排序方式而不是使用计算规则。更多有关自然排序的信息，可以查看[这个页面](https://github.com/sourcefrog/natsort)。自然排序保留数组原来的键。
   - `natsort()` - 区分大小写的自然排序
   - `natcasesort()` - 不区分大小写的自然排序

   ```php
   <?php
        $data = array(
            "file1.txt",
            "file11.txt",
            "File2.txt",
            "FILE12.txt",
            "file.txt"
        );

        natsort($data);
        print_r($data);
        echo "<br>";

        natcasesort($data);
        print_r($data);
   ?>
   ```

   打印结果：

   ```php
   Array (
       [3] => FILE12.txt
       [2] => File2.txt
       [4] => file.txt
       [0] => file1.txt
       [1] => file11.txt
    )
   Array (
       [4] => file.txt
       [0] => file1.txt
       [2] => File2.txt
       [1] => file11.txt
       [3] => FILE12.txt
    )
   ```

5. 自定义回调函数排序
   - `usort()` - 对键值的自定义排序（重建索引）
   - `uasort()` - 对键值的自定义排序
   - `uksort()` - 对键名的自定义排序

   回调函数的两个参数为数组的两个相邻元素。在第一个参数小于，等于或大于第二个参数时，该比较函数必须相应地返回一个小于，等于或大于0的整数。

   ```php
   <?php
        $data = array(
            "aaaaa",
            "aaaaaaaaaaaaaaaaaaaa",
            "aa",
            "aaaaa",
            "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            "aaaaaaaaaaaa",
            "aaaaaaaaaaaaaaaa"
        );

        function sort_by_length($value1, $value2){
            if(strlen($value1) == strlen($value2)){
                return 0;
            } else{
                return strlen($value1) > strlen($value2) ? 1 : -1;
            }
        }

        usort($data, "sort_by_length");
        print_r($data);
   ?>
   ```

   打印结果：

   ```php
   Array (
       [0] => aa
       [1] => aaaaa
       [2] => aaaaa
       [3] => aaaaaaaaaaaa
       [4] => aaaaaaaaaaaaaaaa
       [5] => aaaaaaaaaaaaaaaaaaaa
       [6] => aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
    )
   ```

6. 多维数组排序
   多维数组排序使用`array_multisort()`函数。
   最后一个参数放置需要进行排序的函数，前面的参数为排序依据的数据列，按照排序优先级排列。
   对于索引数组将会重建索引、关联数组将保留键。

   ```php
   <?php
        $data = array(
            "System" => array("id" => 1, "soft" => "Linux", "rating" => 3),
            "Server" => array("id" => 2, "soft" => "Apache", "rating" => 1),
            "Database" => array("id" => 3, "soft" => "MySQL", "rating" => 4),
            "Language" => array("id" => 4, "soft" => "PHP", "rating" => 2)
        );

        foreach($data as $key => $value){
            $category[] = $key;
            $rating[] = $value['rating'];
        }

        array_multisort($category, $rating, $data);
        print_r($data);
   ?>
   ```

   打印结果：

   ```php
   Array (
        [Database] => Array ( [id] => 3 [soft] => MySQL [rating] => 4 )
        [Language] => Array ( [id] => 4 [soft] => PHP [rating] => 2 )
        [Server] => Array ( [id] => 2 [soft] => Apache [rating] => 1 )
        [System] => Array ( [id] => 1 [soft] => Linux [rating] => 3 )
    )
   ```

## 拆分、合并、分解数组以及数组间的运算

1. `array_slice()`
   从数组中取出一段。

   ```php
   array_slice(array $array, int $offset[, int $length = NULL[, bool $preserve_keys = false]]): array
   ```

   最后一个可选参数`preserve_keys`为`bool`值，若设为`TRUE`，则保留原来键的值（仅索引数组，关联数组总是保留）；否则不保留。

2. `array_splice()`
   去掉数组中的某一部分并用其它值取代。

   ```php
   array_splice(array &$input, int $offset[, int $length = count($input)[, mixed $replacement = array()]] ): array
   ```

3. `array_combine()`
   创建一个数组，用一个数组的值作为其键名，另一个数组的值作为其值。
   **两个数组的元素个数一定要一样，否则会报错。**

   ```php
   array_combine(array $keys, array $values): array
   ```

4. `array_merge()`
   合并一个或多个数组。

   ```php
   array_merge(array $array1[, array $...] ): array
   ```
   如果输入的数组中**有相同的字符串键名**，则该键名**后面的值将覆盖前一个值**。然而，如果数组**包含数字键名**，后面的值将不会覆盖原来的值，而是**附加到后面**。

   如果**只给了一个数组**并且该数组是**数字索引**的，则键名会**以连续方式重新索引**。

5. `array_intersect()`
   返回多个数组的交集，键名保持不变。

   ```php
   array_intersect(array $array1, array $array2[, array $...] ): array
   ```

6. `array_diff()`
   返回多个数组的差集，键名保持不变。

   ```php
   array_diff(array $array1, array $array2[, array $...] ): array
   ```

## 数组与数据结构
使用数组可以模拟数据结构里的栈和队列。

1. 栈
    使用`array_push()`函数可以将元素压入数组的末尾，即入栈；
    使用`array_pop()`函数可以将数组末尾的元素弹出，即出栈。

2. 队列
    使用`array_push()`函数可以将元素压入数组的末尾，即入队；
    使用`array_shift()`函数可以将数组头部的元素弹出，即出队。

## 其他函数

1. `array_rand()`
   随机取出一个或多个元素，可选参数`num`用于设定取出元素的个数。

2. `shuffle()`
   打乱一个数组的元素顺序。

3. `array_sum()`
   对数组的所有元素求和。

4. `array_product()`
   对数组的所有元素求乘积。

5. `range()`
   类似于Python里的range()函数，产生按照指定范围、指定步进的数组。范围的左右都是闭区间。

更多信息，可查看[PHP Manual](https://www.php.net/manual/zh/book.array.php)中对数组的介绍。




