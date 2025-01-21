---
title: 浅析动态链接中GOT与PLT的工作方式
date: 2022-08-12 23:06:25
categories:
  - Bin
---

# 前言

动态链接是一种高效且节省空间的程序间共享代码方式。若程序使用静态链接方式，则程序所有代码都将集成到同一个二进制文件中，其优点在于无依赖关系，可以在不同运行环境的OS下运行。但是缺点也十分明显，由于二进制文件中包含全部代码，所以所占空间较大；如果多次运行同一个程序，则OS可能会对某个库函数进行多次重复 的加载，占用了不必要的内存；若某个公用的库函数产生了更新，则需要重新编译所有使用了该库的程序，工作量较大。

静态链接的一个典型的例子就是Golang，其默认所有程序都是使用静态链接的方式，包含有所有使用到的Golang库函数，因此使用Golang编写的程序因为具有优秀的可移植性和开箱即用受到较多好评。但较为直观的也能看见上面所说的缺点：Linux x86_64下，一个Golang编写的HelloWorld二进制文件占用空间为1.7MB。

而为了解决静态链接存在的重复加载、重复编译等问题，引入了动态链接的方式。使用动态链接的程序不包含库函数的代码，库函数通过动态链接库（.so）的形式独立存在。当程序开始运行并产生外部函数调用时，动态链接器将承担加载动态链接库和重定位函数地址、变量地址的工作，在运行时确定外部函数地址和变量的值，也叫惰性加载。动态链接能够减少程序的启动时间（程序占用空间变小），且动态链接器也不会产生较多额外的性能开销，因此动态链接还是如今比较广泛应用的一种链接方式。

<!-- more -->

为了支撑动态链接这一工作过程，在ELF文件中有4个Section与之相关：

- `.got`：全局偏移表（Global Offset Table），用于存储外部符号的绝对地址，由链接器进行填充。
- `.plt`：过程链接表（Procedure Linkage Table），存有从`.got.plt`中查找外部函数地址的代码，若是第一次调用该函数，则会触发链接器解析函数地址并填充在`.got.plt`相应的位置；若函数地址已经存储在`.got.plt`中则直接跳转到对应地址继续执行。
- `.got.plt`：GOT中专用于PLT存储外部函数地址的部分，是属于GOT的一部分。
- `.plt.got`：不知道干啥用的，可能只是为了名字的对称……

下面将对基于GOT和PLT来进行外部符号地址重定向的工作方式进行分析。为了便于演示过程，编写了两个C文件，一个编译为共享的动态链接库，另一个是可执行程序。代码和编译命令如下：

```c
// main.c
// gcc -g -m32 -no-pie -L. main.c lib.so -o main
#include <stdio.h>

static int a;
extern int b;
extern void external();

void internal() {
    printf("[*] INT\n");
}

int main(void) {
    printf("a = %d, b = %d\n", a, b);
    internal();
    external();
    return 0;
}

// lib.c
// gcc -g -m32 -shared -fPIC lib.c -o lib.so
#include <stdio.h>
int b = 0xdeadbeef;
void external() {
    printf("[*] EXT\n");
}
```

这份代码展示了符号引用的四个场景：

- 模块内部函数调用，即`internal()`函数；
- 模块内部的变量访问，即全局变量`a`；
- 模块外部的函数调用，即`external()`函数；
- 模块外部的变量访问，即外部变量`b`。

模块内部的调用和取值只需直接从ELF对应地址中读取数据或调用函数即可，此处重点关注后面的两种情况。

需要注意的是，编译后的动态链接库文件所在目录必须包含在环境变量`LD_LIBRARY_PATH`中，否则主程序运行时会提示无法找到动态链接库文件：

```bash
$ LD_LIBRARY_PATH=$LD_LIBRARY_PATH:/path/to/your/lib
$ export LD_LIBRARY_PATH
```

# 位置无关代码

从网上搜索使用GCC编译动态链接库文件的命令时，大部分命令中都包含有`-fPIC`这个参数，其中PIC指的就是位置无关代码（Position-independent Code）。位置无关代码使得为共享库文件支持了地址空间随机化（ASLR）特性。其中所有对地址的引用都是通过相对地址偏移量来实现的，使得无论这个ELF文件被OS加载到何处，都能够通过相对地址正确找到对应的地址数据。相反的，若代码不是位置无关的，则其中每一条指令的地址都是固定的，运行时也将被载入虚拟地址空间的对应地址段内。

但是对于动态链接库而言，顾名思义其代码是动态被加载至内存中的，而如果是按确定的地址进行加载，在一个进程中线性的地址空间中，无法预知这个地址段会不会和其他的共享库的地址产生冲突。因此为了避免这个问题，动态链接库的代码都是位置无关的，这样使得OS可以控制各个共享库的加载位置，使得地址不会产生冲突。

类似的概念同样存在于可执行文件上，被称为位置无关可执行文件（Position-independent Executable，PIE）。上述编译指令中`-no-pie`参数的意义即为关闭PIE。当PIE关闭时，链接器会默认将其加载到OS虚拟地址空间的代码段（Text Segment）中，此时可执行文件将会有一个固定的地址前缀（如x86_32下为`0x08048000`，x86_64下为`0x0000000000400000`），这也正是代码段的起始地址（可以参考x86的ABI中对虚拟内存空间的布局）。使用GDB分别对开启PIE和未开启PIE的程序进行反编译，可以看见开启PIE的代码地址以及函数调用地址均为相对的偏移量，而未开启PIE的程序则全部为绝对地址：

![](https://pic.hujiekang.top/uploads/big/ba4c305c4cec120afe48bf03ac1a7bcb.png)

# 重定向表

对动态链接的可执行文件而言，其调用的外部函数可能在其运行时并未载入内存，因为地址的可变性，所以无法在可执行文件中存入一个确切的地址。对于这个问题的解决方案，是在ELF的某些段中为函数地址和变量值预留一个位置，当程序运行时，动态链接器会负责将正确的函数地址和变量数据填充到对应的位置。而为了让链接器知道有哪些外部变量/函数，以及需要填充数据到什么地方，就需要使用到重定位表。

在静态链接时，`.rel.text`表示代码段重定位段，`.rel.data`表示数据段重定位段；而在动态链接时则分别为`.rel.plt`和`.rel.dyn`。`.rel.plt`中的项是需要进行重定位的函数引用，引用的地址存储于`.got.plt`中；`.rel.dyn`中的项则是数据段中需要重定位的外部变量，对应的数据/地址存储于`.got`和数据段中。

使用`readelf`可以读取ELF文件的重定向表，可以看见`.rel.dyn`中包含引用自`lib.so`的外部变量`b`，`.rel.plt`中有Glibc中的库函数以及引用自`lib.so`的外部函数`external()`：

```bash
$ readelf -r main

Relocation section '.rel.dyn' at offset 0x320 contains 2 entries:
 Offset     Info    Type            Sym.Value  Sym. Name
0804bfec  00000206 R_386_GLOB_DAT    00000000   b
0804bff0  00000406 R_386_GLOB_DAT    00000000   __gmon_start__

Relocation section '.rel.plt' at offset 0x330 contains 4 entries:
 Offset     Info    Type            Sym.Value  Sym. Name
0804c000  00000107 R_386_JUMP_SLOT   00000000   printf@GLIBC_2.0
0804c004  00000307 R_386_JUMP_SLOT   00000000   puts@GLIBC_2.0
0804c008  00000507 R_386_JUMP_SLOT   00000000   __libc_start_main@GLIBC_2.0
0804c00c  00000607 R_386_JUMP_SLOT   00000000   external
```

对应的，查看这些地址偏移值所在的段，可以验证上面的叙述。下面是部分程序段的输出，可以确定外部变量的引用是存在`.got`中，外部函数引用存在`.got.plt`中。（更准确地说，类型为`R_386_GLOB_DAT`的外部变量将会被指向`.got`表中的位置，类型为`R_390_JMP_SLOT`的函数引用将会被指向`.got.plt`中。[参考链接](https://refspecs.linuxfoundation.org/ELF/zSeries/lzsabi0_zSeries/x2251.html)）

这两个段实际上也是属于数据段的一部分，在程序代码中为了保证位置无关性，相关的引用都必须是相对位置引用，对于这类绝对地址的调用则分离出来放在数据段，此时代码再通过计算当前PC与`.got.plt`和`.got`的偏移值来引用这些绝对地址。

```bash
$ readelf -S main
There are 35 section headers, starting at offset 0x39e4:

Section Headers:
  [Nr] Name              Type            Addr     Off    Size   ES Flg Lk Inf Al
  ......
  [12] .plt              PROGBITS        08049020 001020 000050 04  AX  0   0 16
  [13] .text             PROGBITS        08049070 001070 000205 00  AX  0   0 16
  ......
  [21] .got              PROGBITS        0804bfec 002fec 000008 04  WA  0   0  4
  [22] .got.plt          PROGBITS        0804bff4 002ff4 00001c 04  WA  0   0  4
  [23] .data             PROGBITS        0804c010 003010 000008 00  WA  0   0  4
  ......
```

# 程序分析

下面使用GDB对上面的可执行程序进行反编译和调试，来观察GOT和PLT的工作方式。

## 静态分析

再贴一下main函数代码：

```c
int main(void) {
    printf("a = %d, b = %d\n", a, b);
    internal();
    external();
    return 0;
}
```

反编译过后的main函数如下：

```assembly
Dump of assembler code for function main:
   0x080491b1 <+0>:     lea    ecx,[esp+0x4]
   0x080491b5 <+4>:     and    esp,0xfffffff0
   0x080491b8 <+7>:     push   DWORD PTR [ecx-0x4]
   0x080491bb <+10>:    push   ebp
   0x080491bc <+11>:    mov    ebp,esp
   0x080491be <+13>:    push   ebx
   0x080491bf <+14>:    push   ecx
   0x080491c0 <+15>:    call   0x80490c0 <__x86.get_pc_thunk.bx>
   0x080491c5 <+20>:    add    ebx,0x2e2f
   0x080491cb <+26>:    mov    eax,DWORD PTR [ebx-0x8]
   0x080491d1 <+32>:    mov    edx,DWORD PTR [eax]
   0x080491d3 <+34>:    mov    eax,DWORD PTR [ebx+0x28]
   0x080491d9 <+40>:    sub    esp,0x4
   0x080491dc <+43>:    push   edx
   0x080491dd <+44>:    push   eax
   0x080491de <+45>:    lea    eax,[ebx-0x1fe4]
   0x080491e4 <+51>:    push   eax
   0x080491e5 <+52>:    call   0x8049030 <printf@plt>
   0x080491ea <+57>:    add    esp,0x10
   0x080491ed <+60>:    call   0x8049186 <internal>
   0x080491f2 <+65>:    call   0x8049060 <external@plt>
   0x080491f7 <+70>:    mov    eax,0x0
   0x080491fc <+75>:    lea    esp,[ebp-0x8]
   0x080491ff <+78>:    pop    ecx
   0x08049200 <+79>:    pop    ebx
   0x08049201 <+80>:    pop    ebp
   0x08049202 <+81>:    lea    esp,[ecx-0x4]
   0x08049205 <+84>:    ret
End of assembler dump.
```

出现了4个call指令，其中`__x86.get_pc_thunk.bx`函数是用于获取当前PC的值并存储在对应寄存器里（这里是EBX，同理还有`__x86.get_pc_thunk.ax`等其他的函数，效果都是类似的）。由于在32位下不支持直接访问PC寄存器，所以采用这样的实现方式，64位则是直接取PC的值。

剩余三个函数则分别是C代码中调用的三个函数。其中`internal()`函数直接指向对应的代码（对应地址在`.text`段），其余两个外部函数直接标注出了这是指向PLT的地址。

接下来可以dump出`.plt`段的具体数据：

![](https://pic.hujiekang.top/uploads/big/81539b90056ec33203ce042f73cfa58d.png)

经过GDB的标注，可以发现PLT表可以通过每0x10个字节来进行划分。首先是第一部分，这段代码是PLT的公共代码，用于调用动态链接器来装填外部函数的地址。但是可以发现在程序尚未运行的时候，这两个地址（0x804bff8和0x804bffc，位于`.got.plt`）对应的值为0，是因为这两个值同样是由动态链接器进行填充。

剩余的每0x10个字节分别对应各个外部函数的处理代码。可以看见main函数中对外部函数的调用地址也位于对应函数PLT表项的起始位置。下面以`printf()`函数为例，读取对应的数据，可以发现对应的地址恰好是函数的处理代码中的第二条`push`指令：

```bash
pwndbg> x/wx 0x804c000
0x804c000 <printf@got.plt>:     0x08049036
```

也就是说，在默认状态下（也就是函数第一次调用时），第一条`jmp`指令的作用等效于继续向下执行。很容易发现不同函数中，`push`的值也不尽相同，这个值是由什么来确定的呢？可以在重定向表`.rel.plt`中找到答案。如下所示，可以看见每个重定位的函数表项所占用的空间都是8个字节，所以`push`的值也就相当于对应函数在重定位表中的偏移值，链接器也就可以通过这个偏移值来定位到要解析的函数信息。

```bash
Hex dump of section '.rel.plt':
  0x08048330 00c00408 07010000 04c00408 07030000 ................
  0x08048340 08c00408 07050000 0cc00408 07060000 ................

Relocation section '.rel.plt' at offset 0x330 contains 4 entries:
 Offset     Info    Type            Sym.Value  Sym. Name
0804c000  00000107 R_386_JUMP_SLOT   00000000   printf@GLIBC_2.0
0804c004  00000307 R_386_JUMP_SLOT   00000000   puts@GLIBC_2.0
0804c008  00000507 R_386_JUMP_SLOT   00000000   __libc_start_main@GLIBC_2.0
0804c00c  00000607 R_386_JUMP_SLOT   00000000   external
```

在push指令之后，所有的函数处理代码最终都会跳转到一个一样的地址，对应的也就是PLT的第一项公共代码，也就是交由链接器进行地址的解析和装填。

接下来查看GOT中的数据排布。查询ELF的节信息可以知道，`.got`段只包括前面的8个字节，后面的数据均属于`.got.plt`段：

```bash
0x804bfec:      0x00000000      0x00000000      0x0804befc      0x00000000
0x804bffc:      0x00000000      0x08049036      0x08049046      0x08049056
0x804c00c:      0x08049066
```

对应重定位表`.rel.dyn`中的两条数据，可以发现`.got`段的确是用于存储外部变量重定向的地址，在动态分析的过程中可以看的更为详细。`.got.plt`段中，前三项为公共项，后面的项则用于存储外部函数重定向的地址。这三个公共项分别为：

- GOT[0]：本ELF文件中`.dynamic`段的地址
- GOT[1]：本ELF文件中的`link_map`数据结构描述符地址
- GOT[2]：`_dl_runtime_resolve`函数地址，顾名思义是用于函数地址解析的

如前文所述，GOT[1]和GOT[2]在程序未运行时的值为0，在程序运行前，由链接器来负责填充。

基于上面的分析，可以画出这个可执行程序中的GOT和PLT布局图。

![](https://pic.hujiekang.top/uploads/big/f40d697634e54af5d5cdb3b01f9940cb.png)

## 动态分析

为了搞清楚GOT[1]和GOT[2]是在何时被填充的，可以使用GDB为对应地址添加Watchpoint观测其变化，再使用continue令程序继续运行，程序会停在Watchpoint对应地址产生变化的代码处。可以发现程序停在的代码都位于动态链接器的相关代码中：

```bash
pwndbg> watch -l *0x804bff8
Hardware watchpoint 1: -location *0x804bff8

pwndbg> watch -l *0x804bffc
Hardware watchpoint 2: -location *0x804bffc

pwndbg> continue
Continuing.

Hardware watchpoint 1: -location *0x804bff8

Old value = 0
New value = -134227504
0xf7fd849f in elf_machine_runtime_setup (profile=0, lazy=1, l=0xf7ffd9d0) at ../sysdeps/i386/dl-machine.h:73
......

pwndbg> continue
Continuing.

Hardware watchpoint 2: -location *0x804bffc

Old value = 0
New value = -134341312
_dl_relocate_object (l=<optimized out>, scope=0xf7ffdb98, reloc_mode=<optimized out>, consider_profiling=<optimized out>) at dl-reloc.c:274
......
```

此时再去查看`.got`段，可以发现GOT[1]和GOT[2]已经被填充了对应的地址。同理，可以发现在进入`main`函数之前，动态链接器已经将外部变量`b`的值放在了`.got`段中，对应的值也是在lib.so中所定义的`0xdeadbeef`。

```bash
pwndbg> continue
Continuing.

Hardware watchpoint 5: -location *0x804bfec

Old value = 0
New value = -134471672
elf_dynamic_do_Rel (skip_ifunc=<optimized out>, lazy=<optimized out>, nrelative=<optimized out>, relsize=<optimized out>, reladdr=<optimized out>, map=<optimized out>) at do-rel.h:124
```

接下来分析外部函数地址的解析（同样以`printf()`函数的解析为例）。在执行了call指令之后，程序跳转到PLT对应的条目中：

```bash
►  0x8049030  <printf@plt>         jmp    dword ptr [printf@got[plt]]   <0x804c000>
   0x8049036  <printf@plt+6>       push   0
   0x804903b  <printf@plt+11>      jmp    0x8049020                     <0x8049020>
```

接下来的情况和静态分析中的一致，`push`了函数的偏移值，然后跳转到PLT的公共代码：

```bash
►  0x8049020         push   dword ptr [_GLOBAL_OFFSET_TABLE_+4] <0x804bff8>
   0x8049026         jmp    dword ptr [0x804bffc]         <_dl_runtime_resolve>
```

整个过程相当于进行了一个下面这样的函数调用，来进行函数地址的重定位：

```c
_dl_runtime_resolve(link_map, reloc_offset)
```

继续添加Watchpoint，发现`.got.plt`中的函数地址在`_dl_runtime_resolve`函数中调用的`_dl_fixup`函数中被改变，最终获得`printf()`函数的地址为`0xf7e13f10`：

```bash
pwndbg> continue
Continuing.

Hardware watchpoint 2: -location *0x804c000

Old value = 134516790
New value = -136233200
0xf7fdba6c in _dl_fixup (l=<optimized out>, reloc_arg=<optimized out>) at dl-runtime.c:146

pwndbg> x/wx 0x804c000
0x804c000 <printf@got.plt>:     0xf7e13f10
```

继续运行，在`_dl_runtime_resolve`的结尾处，把ESP所指的地址修改为了`printf()`函数地址，再通过`ret`指令直接跳转至`printf()`函数运行。汇编代码如下：

```assembly
0xf7fe1d54 <_dl_runtime_resolve+20>    mov    dword ptr [esp], eax
0xf7fe1d57 <_dl_runtime_resolve+23>    mov    eax, dword ptr [esp + 4]
0xf7fe1d5b <_dl_runtime_resolve+27>    ret    0xc
```

此时的堆栈如下，所以在`ret`指令中需要清理在重定位中使用的堆栈数据，从而恢复到从main函数直接调用`printf()`的状态：

```assembly
00:0000│ esp 0xffffd49c —▸ 0xf7e13f10 (printf) ◂— call   0xf7f05189
01:0004│     0xffffd4a0 —▸ 0x804a010 ◂— 'a = %d, b = %d\n'
02:0008│     0xffffd4a4 —▸ 0xf7ffd9d0 ◂— 0x0
03:000c│     0xffffd4a8 ◂— 0x0
04:0010│     0xffffd4ac —▸ 0x80491ea (main+57) ◂— add    esp, 0x10
05:0014│     0xffffd4b0 —▸ 0x804a010 ◂— 'a = %d, b = %d\n'
06:0018│     0xffffd4b4 ◂— 0x0
07:001c│     0xffffd4b8 ◂— 0xdeadbeef
```

以上是第一次调用时的运作方式，将会调用动态链接器解析函数地址并直接跳转运行。此时`.got.plt`对应函数的位置已经填充了正确的函数地址，所以下一次再调用该函数时，`jmp dword ptr [printf@got[plt]]`这一行汇编代码将会直接跳转至对应函数执行，无需再次解析。

通过GOT和PLT这样的工作方式，可以很好的实现延迟绑定（惰性加载），这样提高了程序的启动速度，也不会在重定位时牺牲过多的开销。

# 相关攻击方式

// TODO

# 参考链接

- [Why is address 0x400000 chosen as a start of text segment in x86_64 ABI? - Stack Overflow](https://stackoverflow.com/questions/39689516/why-is-address-0x400000-chosen-as-a-start-of-text-segment-in-x86-64-abi)
- [i386 ABI Documents](https://gitlab.com/x86-psABIs/i386-ABI)
- [x86_64 ABI Documents](https://gitlab.com/x86-psABIs/x86-64-ABI)
- [深入了解GOT,PLT和动态链接 - 博客园](https://www.cnblogs.com/pannengzhi/p/2018-04-09-about-got-plt.html)
- [ELF在Linux下的动态链接实现 (blinkenshell.org)](http://nicephil.blinkenshell.org/my_book/ch07s05.html)
- [GOT and PLT for pwning. · System Overlord](https://systemoverlord.com/2017/03/19/got-and-plt-for-pwning.html)
- [聊聊Linux动态链接中的PLT和GOT（4）—— 穿针引线](https://blog.csdn.net/linyt/article/details/51893258)

