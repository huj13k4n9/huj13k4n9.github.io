---
title: 基于VMI的Linux虚拟机系统调用解析
date: 2022-03-03 20:29:21
categories:
  - Summary
---

VMI（Virtual Machine Introspection，虚拟机自省），是一种从虚拟机外部对虚拟机内部状态进行监控的技术。基于VMI获取的内存数据并结合通过KVM对VCPU相关信息的获取，实现将该类低级语义转换为系统调用层面的高级语义信息，从而可以一定程度的分析出系统的行为。

有关基于KVM的VMI开发环境部署可参考[这篇文章](/2021/12/14/Virtual-Machine-Introspection/)。本文主要记录有关修改KVM源码实现系统调用陷入、对内存数据进行语义转换相关的原理与流程。

<!-- more -->

# Kernel Side-获取系统调用的寄存器信息

在KVM侧主要实现的是设置VCPU的陷入以及一些VCPU基本信息的获取，如VM的VCPU数量、VM相关的一些句柄等等。除去设置陷入需要对VCPU的状态进行修改，其他的接口通过ioctl的方式来提供给用户态。

## Intel x86 VMX架构简介

Intel 为了实现CPU的硬件虚拟化，在原来x86 CPU的基础上增加了VMX（Virtual Machine Extensions）架构。在VMX架构中有两类软件，这也是现今虚拟化的基本模式，分别是虚拟机监控器（VMM，就是KVM、Xen这类软件）和虚拟机（VM）。VMM对于整个系统的硬件资源具有完全的掌控权，然后再将机器的实体硬件进行抽象和模拟，最终提供给运行于其上的虚拟机。除了给虚拟机提供虚拟的硬件资源之外，VMM还负责保证不同虚拟机实例之间的互相隔离与独立，并且确保每个虚拟机在资源使用、调度等方面都是公平的。

但是传统的操作系统内核都是运行在CPU的Ring 0特权级别（定义参见[Protection ring - Wikipedia](https://zh.wikipedia.org/wiki/分级保护域)），而为了完全掌控虚拟机的硬件，虚拟机的系统内核显然不能直接运行在Ring 0，所以为此Intel引入了一种新的CPU操作VMX operation（具体介绍在Intel SDM Volume 3, Chapter 23），来支撑虚拟机的运行。VMX Operation包含两类CPU操作：

- VMX root operation：VMM运行在该种操作模式下，CPU行为和VMX operation之外的行为相似；
- VMX non-root operation：VM运行在该种操作模式下，CPU的一些指令操作受限。

两种操作模式下，均有独立的Ring 0-Ring 3的特权级别，VMX operation和CPU特权级别是正交的，且两种操作模式可以相互转换，称为VMX转换（VMX transition）。VMX root转换为VMX non-root称为VM Entry，VMX non-root转换为VMX root称为VM Exit。

通过VM Entry，可以令一个虚拟机进入到运行状态，而当虚拟机在执行某些特殊指令的时候也会产生VM Exit退出到VMM，从而交由VMM处理。为了支撑这样一种模式的正常运行，Intel也设计了一系列指令，并且对每个虚拟机都提供了一个对应的控制数据结构，称为VMCS（Virtual Machine Control Structure），用于存储虚拟机的相关信息。指令的详细描述，可见Intel SDM Volume 1 Chapter 5.22。

## 令虚拟机陷入KVM

为了在VMM的层面上监控系统调用的信息，很容易想到就是让虚拟机在每当产生系统调用的时候就产生VM Exit，陷入到VMM，再对其CPU、寄存器等信息进行获取，以便后续处理。根据发起系统调用的方式不同分为以下三类，但是其基本原理都是产生一个系统中断，从而陷入到VMM中（KVM只能捕获系统中断）：

### 基于中断的系统调用

对于一些老版本的OS，系统调用通过用户中断的方式来进行实现（如Linux为`int 0x80`，Windows为`int 0x2e`），所以可以通过修改中断描述符表（IDT），将所有用户中断描述符全部删除，只保留系统中断描述符，之后每当发起用户中断时，都会因为查询IDT地址越界产生一个\#GP异常（General Protection Fault），引起系统中断。

### 基于快速系统调用指令的系统调用

为了提高系统调用的效率，x86 CPU还支持快速系统调用指令。对于32位的系统内核而言，采用的是SYSENTER/SYSEXIT的指令对；而对64位内核而言则采用SYSCALL/SYSRET指令对来进行系统调用。两者在陷入的实现上也有所差别，但都是操作与系统调用相关的MSR寄存器实现：

- SYSENTER/SYSEXIT：在进行系统调用的时候，需要把内核系统调用函数的位置装载到特殊的某些MSR寄存器中，如`IA32_SYSENTER_CS `，用于存储目标函数的CS段地址，还有`IA32_SYSENTER_ESP `、`IA32_SYSENTER_EIP`等也是同理。此时如果将`IA32_SYSENTER_CS`的值置空，那么最终装载进CS寄存器的最终也是空值，从而引发\#GP异常（General Protection Fault），引起系统中断。
- SYSCALL/SYSRET：这个指令对使用到了一个MSR寄存器`IA32_EFER`（Extended Feature Enable Register，详细介绍在Intel SDM Volume 3, Chapter 2.2.1），该寄存器的第0位用于指示SYSCALL是否被启用，若该位为0则每次SYSCALL都将产生一个#UD异常（Invalid Opcode Exception）。

# User Side-使用LibVMI解析内存数据

## 找到发起系统调用的进程信息

在获取监测程序获取到有效的系统调用事件之后，需要将系统调用和发起系统调用的进程对应起来，这是对系统调用信息进行语义转换过程里最基本的一环。基本原理就是匹配当前系统中所有进程的页目录地址与系统调用事件的页目录地址，若匹配则可确定当前发起进程。

通过LibVMI可以读取到虚拟机内核符号`init_task`的地址，即Linux系统中0号进程所对应的`task_struct`结构体地址。`task_struct`的成员`tasks`是一个双向链表，将所有进程的`task_struct`连接在一起。通过遍历该链表，将所有进程的页目录地址（对应`task_struct.mm->pgd`成员值）与系统调用事件中用于存储当前系统所在分页页目录物理地址的CR3寄存器内容相比较，由于每个进程都有其自身的页目录地址值，所以当两者一致时，则可以确定发起进程即为该进程。

需要注意的是，`task_struct`中存储的PGD地址是虚拟地址，而CR3寄存器中存储的是物理地址，这里首先需要借助LibVMI中的地址转换函数将虚拟地址转换为物理地址；其次Linux系统默认是开启了内核页表隔离的，[其实现中](https://gruss.cc/files/kaiser.pdf)通过CR3寄存器的第13位来区分页目录是属于内核空间还是用户空间，所以实际比较的时候还需处理CR3寄存器值中该位的数据。

## 解析系统调用的类型和参数

从Intel SDM手册以及Linux内核源码中，可以找到系统调用的传参和方式，通过一组特定的寄存器来传参。

- [arch/x86/kernel/entry_32.S register set to pass parameters](https://elixir.bootlin.com/linux/v3.14/source/arch/x86/kernel/entry_32.S#L186)
- [arch/x86/kernel/entry_64.S register set to pass parameters](https://elixir.bootlin.com/linux/v3.14/source/arch/x86/kernel/entry_64.S#L570)
- [Anatomy of a system call, part 1 LWN.net](https://lwn.net/Articles/604287/)
- [Anatomy of a system call, part 2 LWN.net](https://lwn.net/Articles/604515/)
- Intel SDM Volume 2, Chapter 4 Instruction Set Reference, SYSENTER、SYSCALL、SYSEXIT、SYSRET 

# Reference

> - [1]李永波. 基于KVM的虚拟机自省系统设计与实现[D].西安电子科技大学,2015. 
> - [Linux内核深入理解系统调用（1）：初始化-入口-处理-退出](https://blog.csdn.net/Rong_Toa/article/details/115252360)
> - [简析syscall,sysret和sysenter,sysexit的具体过程](https://bbs.pediy.com/thread-226254.htm)
> - [Linux syscall过程分析（万字长文）](https://cloud.tencent.com/developer/article/1492374)
> - [Exceptions - OSDev Wiki](https://wiki.osdev.org/Exceptions)
> - [SYSENTER - OSDev Wiki](https://wiki.osdev.org/SYSENTER#AMD:_SYSCALL.2FSYSRET)
