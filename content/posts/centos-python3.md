---
title: CentOS服务器上安装Python3.7并设置为默认Python
date: 2019-11-01 15:21:53
tags:
  - Linux
  - Python
categories:
  - Tutorials
---

最近由于课程设计要求要在服务器上配置`Flask`框架，但是我在配置的时候各种报错搞不来，搜了一番之后发现是默认Python版本是2.7导致的。然后我尝试去运行Python3，发现服务器上压根没有......于是......就有了这篇文章

<!-- more -->

<big style="font-weight:900">注：本文转载自[https://blog.csdn.net/weixin_41216356/article/details/99819899](https://blog.csdn.net/weixin_41216356/article/details/99819899)</big>

# 0x00 引言

Linux操作系统自带一个Python2.7，没有Python3，在开发的时候非常不便，因此需要安装一个Python3，并且将Python3设置系统默认Python，同时还不能影响那些Linux系统中需要用Python2的底层文件。

# 0x01 安装Python3

## 查看操作系统及Python基本信息

首先查看一下系统的版本以及Python信息，各系统查看信息的方法参考：[https://www.cnblogs.com/wzk-0000/p/7483262.html](https://www.cnblogs.com/wzk-0000/p/7483262.html)

```bash
cat /etc/redhat-release    # 查看内核版本
python -V                  # 查看python版本
which python               # 查看python路径
```

我这边的系统的内核为CentOS 7，默认Python的版本为2.7.5，路径为`/usr/bin/python`。

然后我们导航到该目录，查看Python相关文件的信息，可以看到Python和Python2指向的都是Python2.7。

```bash
[root@libra-server ~]# cd /usr/bin
 
[root@libra-server bin]# ll python*    # 查看以python开头的文件信息
lrwxrwxrwx. 1 root root    7 Oct 15  2017 python -> python2
lrwxrwxrwx. 1 root root    9 Oct 15  2017 python2 -> python2.7
-rwxr-xr-x. 1 root root 7136 Aug  4  2017 python2.7
```

## 安装依赖包（编译，安装程序等所需）

```bash
yum -y groupinstall "Development tools"
yum -y install zlib-devel bzip2-devel openssl-devel ncurses-devel sqlite-devel 
yum -y install readline-devel tk-devel gdbm-devel db4-devel libpcap-devel xz-devel
yum -y install libffi-devel
```

如果是RedHat/CentOS平台，用`yum install`；如果是Ubuntu/Debian平台，用`apt-get install`。

## 下载Python

到Python官方页面选择一个版本的Python：[Python Source Releases](https://www.python.org/downloads/source/)，选择`XZ compressed source tarball`，复制下载链接：

然后用`wget`命令下载到用户目录，（如果下载速度太慢可以用sohu的镜像源：[http://mirrors.sohu.com/](http://mirrors.sohu.com/)），也可以用本地主机下好后`scp`传到服务器上去。

```bash
[root@libra-server bin]# cd ~
[root@libra-server ~]# wget https://www.python.org/ftp/python/3.7.4/Python-3.7.4.tar.xz
```

## 编译并安装Python

首先对刚刚下载的压缩包进行解压。

```bash
[root@libra-server ~]# tar -xvJf Python-3.7.4.tar.xz
```

进入解压后的目录，可以看到Python的源码文件，其中`configure`用来配置，配置完成后会生成用来安装的`Makefile`。

```bash
[root@libra-server ~]# cd Python-3.7.4
[root@libra-server Python-3.7.4]# ll
total 1060
-rw-r--r--  1 501 501  10953 Jul  9 02:03 aclocal.m4
-rw-r--r--  1 501 501    631 Jul  9 02:03 CODE_OF_CONDUCT.rst
-rwxr-xr-x  1 501 501  44166 Jul  9 02:03 config.guess
-rwxr-xr-x  1 501 501  36251 Jul  9 02:03 config.sub
-rwxr-xr-x  1 501 501 503641 Jul  9 02:03 configure
-rw-r--r--  1 501 501 167840 Jul  9 02:03 configure.ac
drwxr-xr-x 18 501 501   4096 Jul  9 02:31 Doc
drwxr-xr-x  2 501 501   4096 Jul  9 02:03 Grammar
drwxr-xr-x  3 501 501   4096 Jul  9 02:03 Include
-rwxr-xr-x  1 501 501   7122 Jul  9 02:03 install-sh
drwxr-xr-x 33 501 501   4096 Jul  9 02:03 Lib
-rw-r--r--  1 501 501  12769 Jul  9 02:03 LICENSE
drwxr-xr-x  2 501 501   4096 Jul  9 02:03 m4
drwxr-xr-x  8 501 501   4096 Jul  9 02:03 Mac
-rw-r--r--  1 501 501  63658 Jul  9 02:03 Makefile.pre.in
drwxr-xr-x  2 501 501   4096 Jul  9 02:31 Misc
drwxr-xr-x 13 501 501   4096 Jul  9 02:03 Modules
drwxr-xr-x  4 501 501   4096 Jul  9 02:03 Objects
drwxr-xr-x  2 501 501   4096 Jul  9 02:03 Parser
drwxr-xr-x  6 501 501   4096 Jul  9 02:03 PC
drwxr-xr-x  2 501 501   4096 Jul  9 02:03 PCbuild
drwxr-xr-x  2 501 501   4096 Jul  9 02:03 Programs
-rw-r--r--  1 501 501  43204 Jul  9 02:03 pyconfig.h.in
drwxr-xr-x  3 501 501   4096 Jul  9 02:03 Python
-rw-r--r--  1 501 501  10113 Jul  9 02:03 README.rst
-rw-r--r--  1 501 501 103776 Jul  9 02:03 setup.py
drwxr-xr-x 23 501 501   4096 Jul  9 02:03 Tools
```

配置安装目录：

```bash
[root@libra-server Python-3.7.4]# ./configure prefix=/usr/local/python3 --enable-optimizations
```

> 注：有时候如果加上开启优化选项 `--enable-optimizations`，下面编译`make`时会报错`Fatal Python error: _PySys_BeginInit: can't initialize sys module`，可能和内核版本有关系，如果报错可以去掉该选项然后重新配置并编译。

编译并安装Python：

```bash
[root@libra-server Python-3.7.4]# make
[root@libra-server Python-3.7.4]# make install
```

然后`cd`到`/usr/local`，可以看到Python3已经安装好了：

```bash
[root@libra-server bin]# cd /usr/local/
[root@libra-server local]# ls
aegis  bin  etc  games  include  lib  lib64  libexec  python3  sbin  share  src
```

## 将Python3添加到系统命令

将`/python3/bin`中的Python3 软链到`/usr/bin/python`，使以后执行`python`命令时都会指向Python3。
如果在这一步报错，则需要把之前的Python重命名做一个备份：

```bash
[root@libra-server ~]# ln -s /usr/local/python3/bin/python3 /usr/bin/python
# mv /usr/bin/python /usr/bin/python.bak 备份原有Python
```

然后执行`python`，可以发现已经是3.7.4版本的了。

```bash
[root@libra-server ~]# python
Python 3.7.4 (default, Aug 21 2019, 15:07:15) 
[GCC 4.8.5 20150623 (Red Hat 4.8.5-36)] on linux
Type "help", "copyright", "credits" or "license" for more information.
>>>
```

## 将需要Python2的程序重定向到Python2
由于`yum`需要Python2，所以需要把`yum`文件重新指向Python2。

```bash
[root@libra-server ~]# vi /usr/bin/yum
```

然后将第一行的 **`#!/usr/bin/python`** 更改为 **`#!/usr/bin/python2`**，`yum`就可以执行了。

同理，**/usr/libexec/urlgrabber-ext-down** 这个文件也做一下相同的操作。

## 配置pip3

如下所示可以看到，pip3还没有添加进系统目录里，因此同样需要做一下软链。

```bash
[root@libra-server ~]# pip2 -V
pip 9.0.1 from /usr/lib/python2.7/site-packages (python 2.7)
[root@libra-server ~]# pip -V
pip 9.0.1 from /usr/lib/python2.7/site-packages (python 2.7)
[root@libra-server ~]# pip3 -V
-bash: pip3: command not found
```

将原来的pip备份，然后把pip3软链到pip，这样以后执行pip就是pip3，pip2就是pip2了：

```bash
[root@libra-server ~]# mv /usr/bin/pip /usr/bin/pip.bak
[root@libra-server ~]# ln -s /usr/local/python3/bin/pip3  /usr/bin/pip
[root@libra-server ~]# pip -V
pip 19.0.3 from /usr/local/python3/lib/python3.7/site-packages/pip (python 3.7)
```

# 0x02 总结

基本上就是这样了，步骤基本上可以分为：

1. 安装依赖库并备份原`/usr/bin`目录下的Python
2. 下载并编译安装Python3
3. 建立Python3和pip3的软链
4. 把需要Python2的系统文件改写，重新指向Python2

# 0x03 参考资料

1. [https://www.cnblogs.com/blogjun/articles/8063989.html](https://www.cnblogs.com/blogjun/articles/8063989.html)
2. [https://www.wangbin.io/blog/it/django2.2-python3.7.3.html](https://www.wangbin.io/blog/it/django2.2-python3.7.3.html)
3. [https://www.jianshu.com/p/e2fc97b452de](https://www.jianshu.com/p/e2fc97b452de)
4. [http://www.mamicode.com/info-detail-2566365.html](http://www.mamicode.com/info-detail-2566365.html)