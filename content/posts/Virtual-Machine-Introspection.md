---
title: 虚拟机自省环境搭建
date: 2021-12-14 23:13:22
categories: 
  - Summary
---

虚拟机自省（Virtual Machine Introspection，简称VMI），是一种从外部（即Hypervisor）对虚拟机内部状态进行监控的技术。从Hypervisor层面，通过虚拟机的陷入，可以直接读取到虚拟机陷入瞬间的内存数据。

部署基于KVM的VMI开发环境主要分为三个部分，分别为KVM、QEMU、LibVMI。前两个是Linux下部署虚拟化的必备组件，LibVMI则是基于各种Hypervisor所实现的VMI库，官网地址[https://libvmi.com](https://libvmi.com/)。

<!-- more -->

# KVM

## 编译内核

下面的步骤，编译了一个带有KVM的4.9.0版本内核。

首先从[kernel.org - kvm/kvm.git](https://git.kernel.org/pub/scm/virt/kvm/kvm.git)上下载KVM的源码，可以直接`git clone`，也可以下载Tarball。下载好源码之后，可以先使用`make kernelversion`来查看一下源码对应的Kernel版本，然后开始配置内核config。

- 使用`make olddefconfig`将现有系统的config直接复制过来，调整部分冲突的配置项，其余的维持现状（这里还有一种选择是直接从默认的config里来创建：`make x86_64_defconfig`，但是这样编译出来的内核因为一些驱动相关的选项可能没有打开，安装启动之后可能只能进BusyBox的Shell，是没办法进去系统的）

- 使用`make menuconfig`进入命令行可视化界面继续调整部分配置项，这里列出KVM相关的配置项如下：

  ```shell
  CONFIG_HAVE_KVM=y
  CONFIG_HAVE_KVM_IRQCHIP=y
  CONFIG_HAVE_KVM_EVENTFD=y
  CONFIG_KVM_APIC_ARCHITECTURE=y
  CONFIG_KVM_MMIO=y
  CONFIG_KVM_ASYNC_PF=y
  CONFIG_HAVE_KVM_MSI=y
  CONFIG_VIRTUALIZATION=y
  CONFIG_KVM=m
  CONFIG_KVM_INTEL=m
  CONFIG_KVM_AMD=m
  CONFIG_KVM_MMU_AUDIT=y
  ```

之后就可以开始准备编译内核。首先更新系统，安装编译的依赖程序：

```shell
# Ubuntu
sudo apt-get update
sudo apt-get upgrade
sudo apt-get install libncurses5-dev libssl-dev build-essential openssl pkg-config libc6-dev bison flex libelf-dev zlibc minizip libidn11-dev libidn11 bc fakeroot bison ncurses-dev
# CentOS
sudo yum update
sudo yum groupinstall "Development Tools"
sudo yum install ncurses-devel hmaccalc zlib-devel binutils-devel elfutils-libelf-devel openssl-devel
```

使用以下命令编译带有KVM的新内核。需要注意的是，视内核版本，必须使用能够兼容该版本内核的GCC和发行版版本来编译和安装，否则会出现编译失败的情况。

```shell
make -j$(nproc)
make modules_install
sudo make install
sudo update-grub
```

整个过程花费时间较长（30min以上），若输出中没有任何Error信息，也没有异常终止，说明内核已经成功安装了。

## GRUB默认启动项设置

重启后在GRUB菜单中应该能够找到带有新内核的启动选项。若确认新安装的内核能够正常启动，则可以考虑将其设置为默认启动内核：

- Ubuntu 18.04：执行命令`cat /boot/grub/grub.cfg| grep menuentry`，查找GRUB的所有启动项，输出如下：

  ```shell
  menuentry 'Ubuntu' ...
  submenu 'Advanced options for Ubuntu' ...
          menuentry 'Ubuntu, with Linux 5.4.0-84-generic' ...
          menuentry 'Ubuntu, with Linux 5.4.0-84-generic (recovery mode)' ...
  menuentry 'Memory test (memtest86+)' ...
  menuentry 'Memory test (memtest86+, serial console 115200)' ...
  ```

  然后修改`/etc/default/grub`文件中的`GRUB_DEFAULT`值为启动项对应的字符串即可（子菜单用项`>`符号来指定）。例如上述启动项中第二项的子菜单中的第二项对应的值就是`Advanced options for Ubuntu>Ubuntu, with Linux 5.4.0-84-generic (recovery mode)`。

  设置完毕之后，`sudo update-grub`更新GRUB配置文件，重启即可生效。

- CentOS 7：CentOS7中采用的是GRUB2，有特定的命令来进行操作，因此直接修改文件的方式可能不生效。
  - 同样借助上述方法获取启动项的名称和索引值（文件位于`/boot/grub2/grub.cfg`）
  - 使用`grub2-editenv list`查看上次启动进入的启动项
  - 使用`grub2-set-default 'Boot Option Name'`来设置下次默认的启动项
  - 使用`grub2-editenv list`再次查看上次启动进入的启动项，是否更改
  - 若已经更改为想要启动的项，则使用`grub2-mkconfig -o /boot/grub2/grub.cfg`重新生成GRUB配置
  - 重启后生效

## 一些坑

1. GCC7编译4.9.0内核时报错提示 ``undefined reference to `____ilog2_NaN'``，这个问题需要打补丁，见<https://git.kernel.org/pub/scm/linux/kernel/git/torvalds/linux.git/diff/?id=474c90156c8dcc2fa815e6716cc9394d7930cb9c>，将补丁内容保存为patch.diff，然后`patch -i patch.diff`应用修改。提示输入操作文件时，先后输入`./include/linux/log2.h`，`./tools/include/linux/log2.h`即可。

2. 编译报错`No rule to make target ‘debian/canonical-certs.pem‘, needed by ‘certs/x509_certificate_list‘`，这里是缺少一个对模块进行签名的Key，有一个解决办法是自己使用OpenSSL生成一个，但是最好的办法还是直接生成：

   - 注释掉这两行：`CONFIG_MODULE_SIG_KEY="certs/signing_key.pem"`、`CONFIG_SYSTEM_TRUSTED_KEYS=""`

   - 使用`make`编译的时候会有提示，一路回车确定即可，输出如下：

     ```shell
     *
     * Certificates for signature checking
     *
     File name or PKCS#11 URI of module signing key (MODULE_SIG_KEY) [certs/signing_key.pem] (NEW)
     Provide system-wide ring of trusted keys (SYSTEM_TRUSTED_KEYRING) [Y/?] y
       Additional X.509 keys for default system keyring (SYSTEM_TRUSTED_KEYS) [] (NEW)
       Reserve area for inserting a certificate without recompiling (SYSTEM_EXTRA_CERTIFICATE) [Y/n/?] y
         Number of bytes to reserve for the extra certificate (SYSTEM_EXTRA_CERTIFICATE_SIZE) [4096] 4096
       Provide a keyring to which extra trustable keys may be added (SECONDARY_TRUSTED_KEYRING) [Y/n/?] y
     #
     # configuration written to .config
     #
     ```

# QEMU

前往<https://download.qemu.org/>下载指定版本的QEMU（此处以2.12.0为例）。因为LibVMI只针对少数几个版本的QEMU进行了VMI Patch，所以需要下载能够Patch的版本，后续才能正常进行。已经Patch的版本列表可以看LibVMI的仓库：[libvmi/tools/qemu-kvm-patch at master · libvmi/libvmi (github.com)](https://github.com/libvmi/libvmi/tree/master/tools/qemu-kvm-patch)

```shell
# 安装编译依赖包
sudo apt-get install libpixman-1-dev pkg-config zlib1g-dev libglib2.0-dev dh-autoreconf libspice-server-dev
# 下载Patch文件
wget https://github.com/libvmi/libvmi/raw/master/tools/qemu-kvm-patch/kvm-qemu-v2.12-libvmi.patch
# 对源代码进行Patch
cd qemu-2.12.0/
patch -p1 < ../kvm-qemu-v2.12-libvmi.patch
# 编译代码并安装
./configure
make -j$(nproc)
sudo make install
```

安装完成后，QEMU相关的程序都被放在`/usr/local/bin`目录下。可以使用下面的命令查看QEMU的版本：

```shell
$ /usr/local/bin/qemu-system-x86_64 --version
QEMU emulator version 2.12.0
Copyright (c) 2003-2017 Fabrice Bellard and the QEMU Project developers
```

# LibVMI

可以从Github上面获得源码：[libvmi/libvmi](https://github.com/libvmi/libvmi)

LibVMI的前身是XenAccess，可以为Xen上运行的虚拟机系统Hypervisor层面的监控，也就是VMI。而如果要在KVM上使用LibVMI，官方给出了两个方案：

1. 传统方案，通过给QEMU打补丁来实现额外的内存访问接口；
2. KVMi方案，此方案为较新的方案，使用一个名为`kvmi`的KVM子系统提供的API来实现VMI，项目地址为[KVM-VMI/kvm-vmi](https://github.com/KVM-VMI/kvm-vmi)。

这里采用第一种方案（第二种以后有空再试）。由于是Legacy，导致现在官方对其维护积极性也不高，有一些Bug需要自行发现并修复。这里有两个已发现的Bug：

- https://github.com/libvmi/libvmi/issues/1002，由于编译路径少写了一个`/`导致读取不到Glib-2.0的库路径，最终`make`编译失败。Issue下面给了一个补丁，patch一下即可：https://src.fedoraproject.org/rpms/libvmi/c/3d132c9990c0377fcf1b7c7faea159d4d5e9722a
- 运行示例程序`vmi-module-list`的时候报`invalid pointer`错误，Backtrace第一行是`kvm_get_vcpureg`，这个是师兄发现的一个Bug，是寄存器结构体的free问题导致的。https://github.com/libvmi/libvmi/pull/1004

对相关文件进行patch之后就可以开始编译了：

```shell
mkdir build && cd build
# ENABLE_KVM_LEGACY ENABLE_KVM两项必须要打开
cmake .. -D ENABLE_KVM=ON -DENABLE_XEN=OFF -DENABLE_KVM_LEGACY=ON
make -j$(nproc)
sudo make install
```

所有相关的可执行文件默认都放在`/usr/local/bin`目录下，可以通过在虚拟机里面编译执行`tools/xxx-offset-finder`程序来获得对应系统的关键结构体偏移量，并将其写入libvmi的配置文件中`/etc/libvmi.conf`（Linux系统还需要拷贝System.map文件到宿主机供LibVMI读取）。一切就绪后，可以运行`vmi-process-list`和`vmi-module-list`看看是否能够正确输出。

```shell
$ sudo /usr/local/bin/vmi-process-list --domid 1
Process listing for VM centos7-64 (id=1)
[    0] swapper/0 (struct addr:ffffffffa6c18480)
[    1] systemd (struct addr:ffff8ad6f8448000)
[    2] kthreadd (struct addr:ffff8ad6f8449080)
[    3] kworker/0:0 (struct addr:ffff8ad6f844a100)
[    4] kworker/0:0H (struct addr:ffff8ad6f844b180)
[    5] kworker/u2:0 (struct addr:ffff8ad6f844c200)
[    6] ksoftirqd/0 (struct addr:ffff8ad6f844d280)
[    7] migration/0 (struct addr:ffff8ad6f844e300)
[    8] rcu_bh (struct addr:ffff8ad6f8480000)
[    9] rcu_sched (struct addr:ffff8ad6f8481080)
[   10] lru-add-drain (struct addr:ffff8ad6f8482100)
[   11] watchdog/0 (struct addr:ffff8ad6f8483180)
[   13] kdevtmpfs (struct addr:ffff8ad6f8485280)
[   14] netns (struct addr:ffff8ad6f8486300)
[   15] khungtaskd (struct addr:ffff8ad6f8484200)
......
```

# Reference

>  - [Simplifying virtual machine introspection using LibVMI.](https://www.semanticscholar.org/paper/Simplifying-virtual-machine-introspection-using-Payne/3b634a20241f8b43be9dbf63c286bdf86249426c)
>  - <https://blog.csdn.net/qq_22418329/article/details/111299788>
>  - <https://www.tecmint.com/compile-linux-kernel-on-centos-7/>
>  - <https://wiki.centos.org/HowTos/Custom_Kernel>