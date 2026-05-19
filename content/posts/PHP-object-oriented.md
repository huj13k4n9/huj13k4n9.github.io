---
title: PHP面向对象的关键字
date: 2019-10-23 00:47:01
categories:
  - Web
---

> 面向过程就是分析出解决问题所需要的步骤，然后用函数把这些步骤一步一步实现，使用的时候一个一个依次调用就可以了；面向对象是把构成问题事务分解成各个对象，建立对象的目的不是为了完成一个步骤，而是为了描叙某个事物在整个解决问题的步骤中的行为。
> 面向对象是相对于面向过程来讲的，面向对象方法，把相关的数据和方法组织为一个整体来看待，从更高的层次来进行系统建模，更贴近事物的自然运行模式。

PHP为面向对象编程提供了很多的关键字和魔术方法，当然其中一些关键字和魔术方法在其他的面向对象编程语言中也存在，如Java。下面对这些关键字和魔术方法做一个总结。

<!-- more -->

# PHP中的关键字

## 特殊对象引用`$this`、`$that`、`self`、`parent`

1. `$this`
   用于在类的实例化对象内部访问这个对象的**非静态**成员。
2. `$that`
   用于`__clone()`魔术方法中，`$that`为被克隆的原对象，`$this`为克隆出来的那个对象。
3. `self`
   用于在类的实例化对象内部访问这个类的**静态**成员。
4. `parent`
   用于在某个类的子类对象中访问其**父类**的成员（通常是静态成员，但有时候可能是实例成员）。

## `private`、`protected`、`public`

这三个关键字是用于PHP的访问类型控制的，我们可以使用这些关键字来对类中的属性与方法进行访问权限的设置，并且可以对类进行封装。

`private`关键字表示**私有**，使用`private`的属性和方法对**同一个类内里面的所有成员**都没有访问的限制，但是在这个类**外部的任何位置**都不能够**访问和操作**。

`protected`关键字表示**受保护**，使用`protected`的属性和方法在**该类本身以及这个类的子类和父类**中没有访问限制，但是在这个类以及它的子类和父类的外部代码中依然不具有对`protected`属性和方法的访问权限。

`public`关键字表示**公共**，也就是说使用`public`的属性和方法在程序的任何位置都可以被访问和操作。在PHP中，如果没有为成员指定访问控制关键字，那么默认这个成员为`public`。

```php
class MyClass
{
    public $public = 'Public';
    protected $protected = 'Protected';
    private $private = 'Private';

    function printHello()
    {
        echo $this->public;
        echo $this->protected;
        echo $this->private;
    }
}

$obj = new MyClass();
echo $obj->public; // 这行能被正常执行
echo $obj->protected; // 这行会产生一个致命错误
echo $obj->private; // 这行也会产生一个致命错误
$obj->printHello(); // 输出 Public、Protected 和 Private

class MyClass2 extends MyClass
{
    // 可以对 public 和 protected 进行重定义，但 private 而不能
    protected $protected = 'Protected2';

    function printHello()
    {
        echo $this->public;
        echo $this->protected;
        echo $this->private;
    }
}

$obj2 = new MyClass2();
echo $obj2->public; // 这行能被正常执行
echo $obj2->private; // 未定义 private
echo $obj2->protected; // 这行会产生一个致命错误
$obj2->printHello(); // 输出 Public、Protected2 和 未定义 private 的错误
```

> 避免踩坑：在验证PHP的访问控制机制时，需要在PHP配置文件php.ini中把显示错误打开，并把错误报告设置为所有错误（包括NOTICE），或是在PHP脚本文件头添加一行`error_reporting(E_ALL);`，否则从子类访问私有变量时可能没有任何提示：

```bash
error_reporting=E_ALL
display_errors = On
```

## `final`

`final`关键字用在类和类中方法之前，表示这个类或这个方法为最终版本，**不能被修改**。使用`final`关键字的类**不能够被继承**，使用`final`关键字的方法**不能够在子类中被覆盖**。

与Java不同，在PHP中一般不使用`final`关键字定义常量。在外部结构中一般使用`define()`函数，而在类的内部则使用`const`关键字。

```php
<?php
    final class example1{
        function __construct(){
            echo "hello";
        }
    }

    class example2 extends example1{
        function __construct(){
            echo "hi";
        }
    }

    $c1=new example2();
?>

// 输出错误：Fatal error: Class example2 may not inherit from final class (example1)

<?php
    class example1{
        final function __construct(){
            echo "hello";
        }
    }

    class example2 extends example1{
        function __construct(){
            echo "hi";
        }
    }

    $c1=new example2();
?>

// 输出错误：Fatal error: Cannot override final method example1::__construct()
```

## `static`

`static`关键字可以用于类变量和类方法，表示该变量或者该方法为**静态的**。
静态的变量和方法**属于这个类**而不属于单个对象，所以不能通过`$this`来访问静态变量和方法。在对象的内部可以使用`self::变量名`或`self::方法名()`来访问静态变量，在对象的外部则使用`类名::变量名`或`类名::方法名()`来访问。

使用了`static`关键字的类成员有几个特点：
1. 静态方法**不能访问类中的非静态属性，只能访问静态属性。**
2. 对于使用`static`的类成员，并不是类中每一个对象都拥有的，而是该类的**所有对象共享**的，一个类只有一个。
3. **不需要实例化对象**就可以访问静态变量和静态方法。（举例：Java里的`Math`类）

```php
<?php
    class example1{
        static $objnum = 0;

        function __construct(){
            self::$objnum++;
        }

        static function getnum(){
            return self::$objnum;
        }
    }

    $e1 = new example1();
    $e2 = new example1();
    $e3 = new example1();
    $e4 = new example1();
    $e5 = new example1();

    echo example1::$objnum;
?>

// 打印结果：5
```

## `abstract`、`interface`

使用`abstract`关键字可以创建抽象类和抽象方法。抽象类和抽象方法是为了便于继承而引入的。抽象的方法没有方法体，而抽象的类不能够被实例化。
只要一个类中有抽象的方法，那么这个类就是抽象类，需要加`abstract`修饰。抽象类中可以有非抽象的成员，但其访问权限不能设为私有的（`private`），因为抽象类不能被实例化。抽象方法的声明如下：

```php
abstract function func();
```

可以把抽象的类理解为是一个半成品的类，它需要其他的类去继承它，并完成它的抽象方法。这为不同的子类提供了一个公共的接口，子类可以自由的用这些抽象方法实现自己的行为，但同时这也形成了子类中的一套规范，因为要继承为抽象类的子类，**子类必须实现抽象类的所有抽象方法**，否则还是一个抽象类，不能实例化对象。

但是我们现实生活中有这样的一个场景：作为一个守法的公民，不但要遵守宪法，还要遵守婚姻法、未成年人保护法等其他的法律，而且在不同的领域，也有它们自己的一套法律体系。
这种情况在PHP中，只使用继承肯定是办不到的，因为一个子类只允许拥有一个父类。那么如何使得一个类能够同时遵守多套规则呢？这就需要使用接口（`interface`）了。

下图中可以很清楚的看出接口和类的关系：

![](https://images.hujiekang.top/blogimage-f33dcd00d7c52422b6d7ad8c24f048a0-529f687d.png)

使用接口，可以指定某个类**必须实现哪些方法**，但**不需要定义这些方法的具体内容**。和抽象类一样，**实现接口必须实现接口的所有方法**。
接口中定义的**所有方法都必须是公有**，这是**接口的特性**。
一个接口中不能声明实例变量，**只能使用`const`声明常量**。接口中的常量和类常量的定义是相同的，可以被继承，但是不能够被覆盖。

定义接口就像定义一个标准的类一样，但其中定义所有的方法都是空的。

```php
interface test{
    const TEST = "I'm an interface.";
    function fun();
}
```

要让子类实现接口，使用`implements`关键字：

```php
class t1 implements test{
    function fun(){
        echo "I implemented this interface.";
    }
}
```

子类可以同时继承父类并实现多个接口：

```php
class t2 extends a implements b1, b2, b3{
    //......类的内容
}
```

除此之外接口也可以继承接口，作为接口的扩展：

```php
interface t2 extends t1{
    //......接口内容
}
```

## 其他关键字

1. `const`
   `const`关键字用于在**对象内部**创建常量。常量的名字通常使用**字母大写**。

   ```php
   //外部
   define("TEST", "This is a constant");

   //对象内部
   const TEST "This is a constant";
   ```

2. `instanceof`
   instanceof关键字用于判断一个对象是否为某个类的**实例**。

   ```php
   <?php
        class test{
            var $test1="I'm a instance of this class";
        }

        $t1 = new test();

        if($t1 instanceof test){
            echo $t1->test1;
        }
   ?>

   // 打印结果：I'm a instance of this class
   ```

3. `clone`
   用于克隆一个对象。

   ```php
   <?php
        class test{
            var $test1="I'm a instance of this class";
        }

        $t1 = new test();
        $t2 = clone $t1;
        var_dump($t1);
        echo "<br>";
        var_dump($t2);
   ?>

   // 输出：
   // object(test)#1 (1) { ["test1"]=> string(28) "I'm a instance of this class" }
   // object(test)#3 (1) { ["test1"]=> string(28) "I'm a instance of this class" }
   ```
