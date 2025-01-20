---
title: PHP中类的魔术方法总结
date: 2019-10-23 13:21:20
categories:
  - Web
---

PHP中对对象设计了15个非常有用的魔术方法，分别是`__construct()`， `__destruct()`， `__call()`， `__callStatic()`， `__get()`， `__set()`， `__isset()`， `__unset()`， `__sleep()`， `__wakeup()`， `__toString()`， `__invoke()`， `__set_state()`， `__clone()` 和 `__debugInfo()`。这些魔术方法有助于对象在不同的情况下自动的实现一些行为，如初始化对象自动赋值、对象被销毁时发出提示信息等等。下面对这些魔术方法的功能进行简要总结。

<!-- more -->

### `__construct()` 和 `__destruct()`

`__construct()`方法是类的构造函数，它在类被实例化为对象时执行。通常用于把一些成员属性初始化为指定值。
`__destruct()`方法是类的析构函数，它在对象被销毁时执行，通常为对象失去引用时以及程序运行结束时。**析构函数没有参数。**

```php
<?php
  class Person{
    var $sex;
    var $name;
    var $age;

    function __construct($name = "Nobody", $sex = "Unknown", $age = 1)
    {
      $this->name = $name;
      $this->sex = $sex;
      $this->age = $age;
    }

    function __destruct(){
      echo "I'm ".$this->name.", Bye!<br>";
    }
  }

  $zhangsan = new Person("Zhangsan", "Male", 25);
  var_dump($zhangsan);
  $zhangsan = null;

?>

// 输出：object(Person)#1 (3) { ["sex"]=> string(4) "Male" ["name"]=> string(8) "Zhangsan" ["age"]=> int(25) }
// // 输出：I'm Zhangsan, Bye!
```

### `__call()` 和 `__callStatic()`

这两个方法在当尝试在对象中调用一个不存在的方法时执行。其中，`__callStatic()`方法是在静态上下文中访问不存在的静态方法时进行调用。
两个函数都有两项参数：第一个参数是那个不存在的方法名，第二个参数则是一个装有方法中所有参数的数组。

```php
<?php
  class Person{
    var $sex;
    var $name;
    var $age;

    function __construct($name = "Nobody", $sex = "Unknown", $age = 1)
    {
      $this->name = $name;
      $this->sex = $sex;
      $this->age = $age;
    }

    function __call($fun_name, $args){
      echo 'I cannot do "'.$fun_name.'" with "';
      print_r($args);
      echo '" !<br>';
    }

    // __callStatic()方法必须是公共的和静态的
    public static function __callStatic($fun_name, $args){          
      echo 'I cannot do this static thing "'.$fun_name.'" with "';
      print_r($args);
      echo '" !<br>';
    }
  }

  $zhangsan = new Person("Zhangsan", "Male", 25);
  $zhangsan->gay("lisi");
  Person::gay("lisi");
?>

// 输出：
// I cannot do "gay" with "Array ( [0] => lisi ) " !
// I cannot do this static thing "gay" with "Array ( [0] => lisi ) " !
```

### `__get()` 和 `__set()`

在Java中，为了保证封装对象，保证对象中成员的安全性，常常会将成员变量和部分成员方法设为`private`不可访问的或是`protected`受保护的，然后对每个不可访问变量建立对应的`getter()`和`setter()`方法来间接的对这些不可访问变量进行访问和修改，这样就可以防止那些不安全的修改与访问，也可以自定义不同变量的返回值，以保护一些不想被外部访问的变量。

在PHP中，当然也可以这么做，但是当不可访问成员变量变得很多的时候，对每个变量设立`getter()`和`setter()`方法就会显得很麻烦，也会显得对象十分臃肿。所以PHP中使用`__get()`和`__set()`魔术方法，来简化这个步骤，让所有对对象中不可访问变量的访问都只通过这两个方法来完成，同时也让外部可以像访问`public`变量一样方便的去访问这些不可访问变量，但是又不会被非法修改。

```php
<?php
  class Person{
    private $sex;
    private $name;
    private $age;

    function __construct($name = "Nobody", $sex = "Unknown", $age = 1)
    {
      $this->name = $name;
      $this->sex = $sex;
      $this->age = $age;
    }
    
    function __set($name, $value)
    {
        // 性别非“男”和“女”则不做修改，返回      
        if($name == "sex"){
            if($value != "Male" && $value != "Female"){
                return;
            }
        }
        // 年龄不属于正常返回则不做修改，返回
        if($name == "age"){
            if($value < 0 || $value > 120){
                return;
            }
        }
        // 不允许修改姓名
        if($name == "name"){
            return;
        }
        // 满足上述条件，给对应变量赋值
        $this->$name = $value;
    }

    function __get($name)
    {
        // 隐藏性别的值
        if($name == "sex"){
            return "Secret";
        }
        // 返回虚假的年龄
        if($name == "age"){
            return $this->age + 10;
        }
        return $this->$name;
    }
  }

    $zhangsan = new Person("Zhangsan", "Male", 25);
    
    // 一波赋值操作
    $zhangsan->name = "Lisi";
    $zhangsan->sex = "Female";
    $zhangsan->age = 130;
    //输出对象中的成员真实值
    var_dump($zhangsan);
    //输出实际返回值
    echo "Name: ".$zhangsan->name."<br>";
    echo "Sex: ".$zhangsan->sex."<br>";
    echo "Age: ".$zhangsan->age."<br>";
?>

//输出：
// object(Person)#1 (3) { ["sex":"Person":private]=> string(6) "Female" ["name":"Person":private]=> string(8) "Zhangsan" ["age":"Person":private]=> int(25) } Name: Zhangsan
// Name: Zhangsan      由于无法更改姓名，所以姓名不变
// Sex: Secret         设置了不返回性别，所以即使性别为Female，还是没有返回
// Age: 35             设置的年龄非法，返回原年龄加10后的年龄
```

**注意：因为PHP处理赋值运算的方式，`__set()`的返回值将被忽略。类似的, 在下面这样的链式赋值中，`__get()` 不会被调用：**

```php
 $a = $obj->b = 8; 
```

### `__isset()` 和 `__unset()`

和`__get()`、`__set()`一样，`__isset()`和`__unset()`方法也是用于保护不可访问变量不被外部非法修改与访问的。`__isset()`方法会在尝试对不可访问变量调用`isset()`方法或`empty()`方法时自动调用，而当对不可访问属性调用`unset()`时，`__unset()`会被调用。

可以重载这两个魔术方法，从而在外部想要释放某个变量或查看是否设置某个变量时，返回指定结果或按条件过滤掉一些非法调用，从而达到保护这些不可访问变量的目的。

```php
<?php
  class Person{
    private $sex;
    private $name;
    private $age;

    function __construct($name = "Nobody", $sex = "Unknown", $age = 1)
    {
      $this->name = $name;
      $this->sex = $sex;
      $this->age = $age;
    }
    
    function __isset($name)
    {
        if($name == "sex" || $name == "age"){
            return false;
        }
        return isset($name);
    }

    function __unset($name)
    {
        echo "You cannot unset this variable!<br>";
    }
  }

    $zhangsan = new Person("Zhangsan", "Male", 25);
    
    var_dump(isset($zhangsan->sex));
    unset($zhangsan->sex);
?>

// 输出：
// bool(false)
// You cannot unset this variable!
```

**注意：在除`isset()`外的其它语言结构中无法使用重载的属性，这意味着当对一个重载的属性使用`empty()`时，重载魔术方法将不会被调用。**
**为避开此限制，必须将重载属性赋值到本地变量再使用`empty()`。**

### `__sleep()` 和 `__wakeup()`

在介绍这两个魔术方法之前，先了解一下PHP中的序列化函数`serialize()`和反序列化函数`unserialize()`：
有时我们需要将一个对象或数组存储很长的一段时间，并需要保证它随时可用。我们可以将对象或数组中的值输出至文件，下次需要使用它时重新赋值。但是这样还需要格式化的输入与输出，对特定的对象也需要特定的函数来输出，这样就很麻烦。所以PHP提供了序列化函数和反序列化函数，序列化函数可以把对象输出为一段特殊的字符串，从而便于我们在不同的介质上传输或储存，而反序列化函数则可以把这个字符串直接还原为对应的对象。

> 避免踩坑：在验证PHP的访问控制机制时，需要在PHP配置文件php.ini中把显示错误打开，并把错误报告设置为所有错误（包括NOTICE），或是在PHP脚本文件头添加一行`error_reporting(E_ALL);`，否则从子类访问私有变量时可能没有任何提示

上面这段代码新建了一个`Test`对象`$t1`，将其序列化之后的字符串反序列化至另一个`Test`对象`$t2`。输出结果如下，可以看到两个对象的内容一模一样。

![](https://hujiekang.top/images/uploads/big/f5fdd47033076f1f85d994697643218f.png)

`__sleep()`、`__wakeup()`这两个方法分别在对象被序列化和反序列化时自动调用。`__sleep()`在对象被序列化为字符串之前调用，可以使用这个魔术方法来控制要序列化哪些变量；`__wakeup()`在对象被反序列化之后调用，用于对反序列化后的部分成员进行重新初始化。

注：`__wakeup()`方法可被绕过：如果存在`__wakeup()`方法，调用 `unserilize()` 方法前则先调用`__wakeup()`方法，但是序列化字符串中**表示对象属性个数的值大于真实的属性个数时**会跳过`__wakeup()`的执行。（[漏洞CVE-2016-7124](http://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2016-7124)）

```php
<?php
  class Person{
        private $name;
        public $sex;
        private $age;

        function __sleep()
        {
            return array("name", "sex");
        }

        function __wakeup(){
            $this->age=40;
        }

        function __construct($name="Somebody",$sex="Unknown",$age=1)
        {
            $this->name=$name;
            $this->sex=$sex;
            $this->age=$age;
        }
    }

    $p1=new Person("Zhangsan","Male",35);
    $s = serialize($p1);
    echo $s."<br>";
    $p2=unserialize($s);
    var_dump($p2);
?>
```

输出结果为：
<code>O:6:"Person":2:{s:12:"Personname";s:8:"Zhangsan";s:3:"sex";s:4:"Male";}</code><b style="color:#ff7473">没有`age`属性</b>
<code>object(Person)#2 (3) { ["name":"Person":private]=> string(8) "Zhangsan" ["sex"]=> string(4) "Male" ["age":"Person":private]=></code><code style="color:#ff7473">int(40)</code><code>}</code><b style="color:#ff7473">`age`属性被初始化为`40`</b>

> 避免踩坑：在含有外部不可访问变量的对象中，会对序列化字符串中添加一些不可见的控制字符，所以此时若直接对打印出来的字符串反序列化，会出现字符长度与字符不匹配的错误；如果修正字符长度之后再去反序列化，就会发现反序列化的对象和原对象可能会不一样。下面这段代码打印出`Person`对象`$p1`的序列化字符串：

```php
<?php
  class Person{
        private $name;
        public $sex;
        private $age;

        function __sleep()
        {
            return array("name", "sex");
        }

        function __wakeup(){
            $this->age=40;
        }

        function __construct($name="Somebody",$sex="Unknown",$age=1)
        {
            $this->name=$name;
            $this->sex=$sex;
            $this->age=$age;
        }
    }

    $p1=new Person("Zhangsan","Male",35);
    $s = serialize($p1);
    echo $s."<br>";
?>

// 输出：O:6:"Person":2:{s:12:"Personname";s:8:"Zhangsan";s:3:"sex";s:4:"Male";} 
```

<b style="color:#ff7473">可以看到<code style="color:#ff7473">Personname</code>的长度为<code style="color:#ff7473">10</code>，而字符串中的长度为<code style="color:#ff7473">12</code>。
接下来把这个字符串重新赋值给另一个变量后反序列化：</b>

```php
$s1 = 'O:6:"Person":2:{s:12:"Personname";s:8:"Zhangsan";s:3:"sex";s:4:"Male";}';
var_dump(unserialize($s1));
```

<b style="color:#ff7473">果然输出了字节数大小的错误，<code style="color:#ff7473">unserialize()</code>函数也返回了<code style="color:#ff7473">false</code>。</b>

![](https://hujiekang.top/images/uploads/big/793cc3f01fa16a7d777162e709897c38.png)

<b style="color:#ff7473">如果修改字符数为正确值再去反序列化，会发现对象已经发生了改变：</b>

```php
$s1 = 'O:6:"Person":2:{s:10:"Personname";s:8:"Zhangsan";s:3:"sex";s:4:"Male";}';
var_dump(unserialize($s1));

// 输出：object(Person)#2 (4) { ["name":"Person":private]=> NULL ["sex"]=> string(4) "Male" ["age":"Person":private]=> int(40) ["Personname"]=> string(8) "Zhangsan" }
```

<b style="color:#ff7473">可以看到，原本的<code style="color:#ff7473">name</code>成员变成了<code style="color:#ff7473">null</code>，但是多了一个名叫<code style="color:#ff7473">Personname</code>的不存在成员，这就说明由于缺少一些控制字符，PHP错误的识别了这个对象。</b>

<b style="color:#ff7473">为了避免这个问题，在传输序列化字符串的时候不能使用直接复制打印内容的方式，可以直接使用另一个变量赋值为这个字符串，也可以对这段字符串做一个base64编码，这样就可以自由的复制传输而不用担心字符串的完整性了。</b>

### `__toString()`

`__toString()`方法用于一个类**被当成字符串**时应怎样回应。此方法**必须**返回一个字符串。
在PHP 5.2.0之前，`__toString()`方法只有在直接使用于`echo`或·时才能生效。PHP 5.2.0之后，则可以在任何字符串环境生效（例如通过`printf()`，使用`%s`修饰符），但不能用于非字符串环境（如使用`%d`修饰符）。这些是官方文档中的说明，除此之外，使用`print_r()`函数也无法调用这个魔术方法。

> 不能在`__toString()`方法中抛出异常。这么做会导致致命错误。

```php
<?php
  class Test{
    var $text = "A string of this object";

    function __toString(){
      echo $this->text;
    }
  }

  $t1 = new Test();
  echo $t1;
?>

// 输出：A string of this object
```

### `__invoke()`

当尝试以调用函数的方式调用一个对象时，`__invoke()`方法会被自动调用。

```php
<?php
    class test{
        function __invoke($x)
        {
            return $x*$x;
        }
    }
  
    $t1 = new test();
    echo $t1(5)."<br>";
    var_dump(is_callable($t1));
?>

// 输出：
// 25
// bool(true)
```

### `__clone()`

这个魔术方法在使用`clone`关键字对对象进行复制后执行。可以使用`__clone()`方法对复制后的那个对象的某些值进行修改。
当对象被复制后，PHP会对对象的所有属性执行一个浅复制（shallow copy）。所有的**引用属性**仍然会是一个指向原来的变量的引用。

```php
<?php

  class test{
      var $test1 = 100;
      var $name = "a";

      function __clone(){
        $this->name = "A copy of other object";
      }
  }

  $t1 = new test();
  $t2 = clone $t1;
  var_dump($t1);
  echo "<br>";
  var_dump($t2);

?>

// 输出：
// object(test)#3 (2) { ["test1"]=> int(100) ["name"]=> string(1) "a" }
// object(test)#4 (2) { ["test1"]=> int(100) ["name"]=> string(22) "A copy of other object" }
```

### `__set_state()`

这个魔术方法在对对象调用`var_export()`函数时调用。本方法的唯一参数是一个数组，其中包含按 `array('property' => value, ...)` 格式排列的类属性。

```php
<?php
  class A
  {
      public $var1;
      public $var2;

      public static function __set_state($an_array) // As of PHP 5.1.0
      {
          $obj = new A;
          $obj->var1 = $an_array['var1'];
          $obj->var2 = $an_array['var2'];
          return $obj;
      }
  }

  $a = new A;
  $a->var1 = 5;
  $a->var2 = 'foo';

  eval('$b = ' . var_export($a, true) . ';'); // $b = A::__set_state(array(
                                              //    'var1' => 5,
                                              //    'var2' => 'foo',
                                              // ));
  var_dump($b);
?>

// 输出：
// object(A)#2 (2) {
//   ["var1"]=>
//   int(5)
//   ["var2"]=>
//   string(3) "foo"
// }
```

[var_export()](https://www.php.net/manual/zh/function.var-export.php)和[var_dump()](https://www.php.net/manual/zh/function.var-dump.php)类似，两者的区别在于：`var_export()`是静态方法、`var_export()`打印出的反映变量信息的字符串是可被PHP识别的。下面的代码展示了区别：

```php
<?php
  class Test{
    var $text = "test";
  }

  $t1 = new Test();
  var_dump($t1);
  echo "<br>";
  var_export($t1);
  echo "<br>";

  $t2 = array (1, 2, 3);
  var_dump($t2);
  echo "<br>";
  var_export ($t2);
  echo "<br>";
?>

// 输出：
// object(Test)#1 (1) { ["text"]=> string(4) "test" }
// Test::__set_state(array( 'text' => 'test', ))
// array(3) { [0]=> int(1) [1]=> int(2) [2]=> int(3) }
// array ( 0 => 1, 1 => 2, 2 => 3, )
```

### `__debugInfo()`

这个魔术方法在对对象调用`var_dump()`函数时调用。可以使用这个方法控制显示出的详细信息。（这个方法在PHP 5.6.0才出现）

```php
<?php
  class Test {
          private $num;
      
          public function __construct($val) {
              $this->num = $val;
          }
      
          public function __debugInfo() {
              return [
                  'Thisnum' => $this->num ** 2,
              ];
          }
      }
      
      var_dump(new Test(10));
?>

// 输出：object(Test)#1 (1) { ["Thisnum"]=> int(100) }
```

更详细的信息，可查看[PHP官方文档](https://www.php.net/manual/zh/language.oop5.magic.php)关于魔术方法的页面。