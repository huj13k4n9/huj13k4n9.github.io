---
title: UCORE Lab 1
date: 2022-10-24 13:35:21
categories:
  - OS
---

# Ex.1

> Makefile 狗都不看

<!-- more -->

## 操作系统镜像文件ucore.img是如何一步一步生成的？

`make -n`可以输出具体执行的命令：

```bash
# Compile Kernel Sources
echo + cc kern/init/init.c
gcc -Ikern/init/ -fno-builtin -Wall -ggdb -m32 -gstabs -nostdinc  -fno-stack-protector -Ilibs/ -Ikern/debug/ -Ikern/driver/ -Ikern/trap/ -Ikern/mm/ -c kern/init/init.c -o obj/kern/init/init.o
echo + cc kern/libs/stdio.c
gcc -Ikern/libs/ -fno-builtin -Wall -ggdb -m32 -gstabs -nostdinc  -fno-stack-protector -Ilibs/ -Ikern/debug/ -Ikern/driver/ -Ikern/trap/ -Ikern/mm/ -c kern/libs/stdio.c -o obj/kern/libs/stdio.o
echo + cc kern/libs/readline.c
gcc -Ikern/libs/ -fno-builtin -Wall -ggdb -m32 -gstabs -nostdinc  -fno-stack-protector -Ilibs/ -Ikern/debug/ -Ikern/driver/ -Ikern/trap/ -Ikern/mm/ -c kern/libs/readline.c -o obj/kern/libs/readline.o
echo + cc kern/debug/panic.c
gcc -Ikern/debug/ -fno-builtin -Wall -ggdb -m32 -gstabs -nostdinc  -fno-stack-protector -Ilibs/ -Ikern/debug/ -Ikern/driver/ -Ikern/trap/ -Ikern/mm/ -c kern/debug/panic.c -o obj/kern/debug/panic.o
echo + cc kern/debug/kdebug.c
gcc -Ikern/debug/ -fno-builtin -Wall -ggdb -m32 -gstabs -nostdinc  -fno-stack-protector -Ilibs/ -Ikern/debug/ -Ikern/driver/ -Ikern/trap/ -Ikern/mm/ -c kern/debug/kdebug.c -o obj/kern/debug/kdebug.o
echo + cc kern/debug/kmonitor.c
gcc -Ikern/debug/ -fno-builtin -Wall -ggdb -m32 -gstabs -nostdinc  -fno-stack-protector -Ilibs/ -Ikern/debug/ -Ikern/driver/ -Ikern/trap/ -Ikern/mm/ -c kern/debug/kmonitor.c -o obj/kern/debug/kmonitor.o
echo + cc kern/driver/clock.c
gcc -Ikern/driver/ -fno-builtin -Wall -ggdb -m32 -gstabs -nostdinc  -fno-stack-protector -Ilibs/ -Ikern/debug/ -Ikern/driver/ -Ikern/trap/ -Ikern/mm/ -c kern/driver/clock.c -o obj/kern/driver/clock.o
echo + cc kern/driver/console.c
gcc -Ikern/driver/ -fno-builtin -Wall -ggdb -m32 -gstabs -nostdinc  -fno-stack-protector -Ilibs/ -Ikern/debug/ -Ikern/driver/ -Ikern/trap/ -Ikern/mm/ -c kern/driver/console.c -o obj/kern/driver/console.o
echo + cc kern/driver/picirq.c
gcc -Ikern/driver/ -fno-builtin -Wall -ggdb -m32 -gstabs -nostdinc  -fno-stack-protector -Ilibs/ -Ikern/debug/ -Ikern/driver/ -Ikern/trap/ -Ikern/mm/ -c kern/driver/picirq.c -o obj/kern/driver/picirq.o
echo + cc kern/driver/intr.c
gcc -Ikern/driver/ -fno-builtin -Wall -ggdb -m32 -gstabs -nostdinc  -fno-stack-protector -Ilibs/ -Ikern/debug/ -Ikern/driver/ -Ikern/trap/ -Ikern/mm/ -c kern/driver/intr.c -o obj/kern/driver/intr.o
echo + cc kern/trap/trap.c
gcc -Ikern/trap/ -fno-builtin -Wall -ggdb -m32 -gstabs -nostdinc  -fno-stack-protector -Ilibs/ -Ikern/debug/ -Ikern/driver/ -Ikern/trap/ -Ikern/mm/ -c kern/trap/trap.c -o obj/kern/trap/trap.o
echo + cc kern/trap/vectors.S
gcc -Ikern/trap/ -fno-builtin -Wall -ggdb -m32 -gstabs -nostdinc  -fno-stack-protector -Ilibs/ -Ikern/debug/ -Ikern/driver/ -Ikern/trap/ -Ikern/mm/ -c kern/trap/vectors.S -o obj/kern/trap/vectors.o
echo + cc kern/trap/trapentry.S
gcc -Ikern/trap/ -fno-builtin -Wall -ggdb -m32 -gstabs -nostdinc  -fno-stack-protector -Ilibs/ -Ikern/debug/ -Ikern/driver/ -Ikern/trap/ -Ikern/mm/ -c kern/trap/trapentry.S -o obj/kern/trap/trapentry.o
echo + cc kern/mm/pmm.c
gcc -Ikern/mm/ -fno-builtin -Wall -ggdb -m32 -gstabs -nostdinc  -fno-stack-protector -Ilibs/ -Ikern/debug/ -Ikern/driver/ -Ikern/trap/ -Ikern/mm/ -c kern/mm/pmm.c -o obj/kern/mm/pmm.o
# Compile Libs
echo + cc libs/string.c
gcc -Ilibs/ -fno-builtin -Wall -ggdb -m32 -gstabs -nostdinc  -fno-stack-protector -Ilibs/  -c libs/string.c -o obj/libs/string.o
echo + cc libs/printfmt.c
gcc -Ilibs/ -fno-builtin -Wall -ggdb -m32 -gstabs -nostdinc  -fno-stack-protector -Ilibs/  -c libs/printfmt.c -o obj/libs/printfmt.o
# Link Kernel Objects and Libs Objects to Kernel Binary File
mkdir -p bin/
echo + ld bin/kernel
ld -m    elf_i386 -nostdlib -T tools/kernel.ld -o bin/kernel  obj/kern/init/init.o obj/kern/libs/stdio.o obj/kern/libs/readline.o obj/kern/debug/panic.o obj/kern/debug/kdebug.o obj/kern/debug/kmonitor.o obj/kern/driver/clock.o obj/kern/driver/console.o obj/kern/driver/picirq.o obj/kern/driver/intr.o obj/kern/trap/trap.o obj/kern/trap/vectors.o obj/kern/trap/trapentry.o obj/kern/mm/pmm.o  obj/libs/string.o obj/libs/printfmt.o
# Generate Disassembly and Symbol Table
objdump -S bin/kernel > obj/kernel.asm
objdump -t bin/kernel | sed '1,/SYMBOL TABLE/d; s/ .* / /; /^$/d' > obj/kernel.sym
# Compile and Link Bootloader
echo + cc boot/bootasm.S
gcc -Iboot/ -fno-builtin -Wall -ggdb -m32 -gstabs -nostdinc  -fno-stack-protector -Ilibs/ -Os -nostdinc -c boot/bootasm.S -o obj/boot/bootasm.o
echo + cc boot/bootmain.c
gcc -Iboot/ -fno-builtin -Wall -ggdb -m32 -gstabs -nostdinc  -fno-stack-protector -Ilibs/ -Os -nostdinc -c boot/bootmain.c -o obj/boot/bootmain.o
echo + cc tools/sign.c
gcc -Itools/ -g -Wall -O2 -c tools/sign.c -o obj/sign/tools/sign.o
gcc -g -Wall -O2 obj/sign/tools/sign.o -o bin/sign
echo + ld bin/bootblock
ld -m    elf_i386 -nostdlib -N -e start -Ttext 0x7C00 obj/boot/bootasm.o obj/boot/bootmain.o -o obj/bootblock.o
# Generate Disassembly of Bootloader
objdump -S obj/bootblock.o > obj/bootblock.asm
# Remove all symbol and relocation information
objcopy -S -O binary obj/bootblock.o obj/bootblock.out
# Append 0x55AA(2 Bytes) on bootblock
bin/sign obj/bootblock.out bin/bootblock
# Create UCORE Image
dd if=/dev/zero of=bin/ucore.img count=10000
dd if=bin/bootblock of=bin/ucore.img conv=notrunc
dd if=bin/kernel of=bin/ucore.img seek=1 conv=notrunc
```

## 生成镜像的步骤

1. 编译内核代码，即`kern/`目录下的源文件
2. 编译公用库代码，即`libs/`目录下的源文件
3. 将内核源代码的目标文件与公用库目标文件链接在一起，形成Kernel二进制文件
4. 调用`objdump`生成Kernel的反汇编和符号表文件
5. 编译Bootloader代码
6. 链接Bootloader目标文件
7. 调用`objdump`生成Bootloader的反汇编
8. 调用`objcopy`去除Bootloader二进制文件中的符号和重定位信息
9. 调用`sign`程序，在Bootloader的末尾添加两个字节
10. 使用`dd`命令创建UCORE镜像

## GCC编译参数

（使用`gcc -v —help`查看详细的参数释义）

- `-I<dir>`：添加`include`搜索的路径

- `-fno-builtin`：不使用GCC的内建函数（Bulitin Functions），用于解决与定义函数与内建函数重名等问题。

    [Other Builtins (Using the GNU Compiler Collection (GCC))](https://gcc.gnu.org/onlinedocs/gcc/Other-Builtins.html)

- `-Wall`：显示绝大多数的Warning Message

- `-g`：向二进制文件中添加指定格式的调试信息
  
    - `-ggdb`：Generate debug information in default extended format.
    - `-gstabs`：Generate debug information in STABS format.
    
- `-m32`：生成32位i386架构的代码

- `-nostdinc`：不适用系统默认库函数，不搜索系统头文件的路径，仅搜索通过`-I`指定的路径

- `-fno-stack-protector`：关闭栈溢出保护（Canary）

- `-O<number>`：设定编译优化优化等级、

- `-Os`：优化空间占用，而不是执行速度

- `-Og`：优化调试的体验，而不是优化速度和空间

- `-c`：仅编译，不链接

- `-o`：指定输出文件名

## LD链接参数

- `-V`：查看支持的目标架构
- `-m`：指定输出的目标架构
- `-nostdlib`：不使用系统标准库，只使用于命令行指定的函数库目录
- `-T`：指定链接脚本
- `-N`：不将数据对齐至页边界，不将 text 节只读
- `-e`：设置起始（入口）地址
- `-Ttext <addr>`：设置.text段的地址。类似的还有`-Tbss`，`-Tdata`等

## 一个被系统认为是符合规范的硬盘主引导扇区的特征是什么？

计算机加电后，CPU从物理地址`0xFFFFFFF0`（由初始化的`CS:EIP`确定，此时`CS`和`IP`的值分别是`0xF000`和`0xFFF0`）开始执行。在`0xFFFFFFF0`这里只是存放了一条跳转指令，通过跳转指令跳到BIOS例行程序起始点。BIOS做完计算机硬件自检和初始化后，会选择一个启动设备（例如软盘、硬盘、光盘等），并且读取该设备的第一扇区(即主引导扇区或启动扇区)到内存一个特定的地址`**0x7c00**`处，然后CPU控制权会转移到那个地址继续执行。

根据tools/sign.c中的代码（如下）：

```c
buf[510] = 0x55;
buf[511] = 0xAA;
FILE *ofp = fopen(argv[2], "wb+");
size = fwrite(buf, 1, 512, ofp);
if (size != 512) {
    fprintf(stderr, "write '%s' error, size is %d.\n", argv[2], size);
    return -1;
}
```

传统磁盘的扇区大小通常为512Bytes，因此可知，一个被系统认为是符合规范的硬盘主引导扇区大小为512Bytes，且最后两个字节分别为`0x55`和`0xAA`。

Reference: [主引导记录 - 维基百科，自由的百科全书](https://zh.wikipedia.org/wiki/%E4%B8%BB%E5%BC%95%E5%AF%BC%E8%AE%B0%E5%BD%95)

# Ex.2

## QEMU启动调试UCORE命令

- `qemu-system-i386 -S -s -parallel stdio -hda bin/ucore.img -serial null`
  
    显示图形窗口，串行端口接入stdio，可以通过命令行Ctrl+C发送终止信号。
    
- `qemu-system-i386 -S -s -serial mon:stdio -hda bin/ucore.img -nographic`
  
    不显示图形窗口，将显示器的IO与stdio进行多路复用，此时的输出直接显示在QEMU所在的命令行窗口，Ctrl+C发送的终止信号将会被传递到虚拟机，需要通过Ctrl+A后再按C键终止运行。
    

注：只能使用`qemu-system-i386`，使用`qemu-system-x86_64`会出错

## GDB连接QEMU

```bash
# Import symbols from kernel binary
file bin/kernel
# Connect to QEMU
target remote :1234
# UCORE starts in real mode, so need to change the architecture
set architecture i8086
# Add breakpoint in the first instruction of UCORE
b *0x7c00
```

如果不打断点，因为QEMU的-S参数默认会停在第一条指令，此时会发现地址为`0xfff0`，为BIOS的第一条指令：

```bash
(gdb) file bin/kernel 
Reading symbols from bin/kernel...
(gdb) target remote :1234
Remote debugging using :1234
0x0000fff0 in ?? ()
```

打断点后使用`continue`继续执行，停在Bootblock的第一条指令处。使用`x/20i $pc`打印出当前PC寄存器所指地址的20条指令，与`boot/bootasm.S`对比完全一致。

根据编译时`objdump`生成的反汇编，得到boot_main函数的地址为`0x7d0c`：

```nasm
# Set up the stack pointer and call into C. The stack region is from 0--start(0x7c00)
movl $0x0, %ebp
7c40:	bd 00 00 00 00       	mov    $0x0,%ebp
movl $start, %esp
7c45:	bc 00 7c 00 00       	mov    $0x7c00,%esp
call bootmain
7c4a:	e8 bd 00 00 00       	call   7d0c <bootmain>
```

新增断点，将目标架构改为`i386`，显示的汇编也符合预期。

```nasm
(gdb) b *0x7d0c
Breakpoint 2 at 0x7d0c
(gdb) conti
Continuing.

Breakpoint 2, 0x00007d0c in ?? ()
(gdb) set arch i386
The target architecture is assumed to be i386
(gdb) x/20i $pc
=> 0x7d0c:	endbr32 
   0x7d10:	push   %ebp
   0x7d11:	xor    %ecx,%ecx
   0x7d13:	mov    $0x1000,%edx
   0x7d18:	mov    $0x10000,%eax
   0x7d1d:	mov    %esp,%ebp
   0x7d1f:	push   %esi
   0x7d20:	push   %ebx
   0x7d21:	call   0x7c72
   0x7d26:	cmpl   $0x464c457f,0x10000
   0x7d30:	jne    0x7d71
   0x7d32:	mov    0x1001c,%eax
   0x7d37:	movzwl 0x1002c,%esi
   0x7d3e:	lea    0x10000(%eax),%ebx
   0x7d44:	shl    $0x5,%esi
   0x7d47:	add    %ebx,%esi
   0x7d49:	cmp    %esi,%ebx
   0x7d4b:	jae    0x7d65
   0x7d4d:	mov    0x8(%ebx),%eax
   0x7d50:	mov    0x4(%ebx),%ecx
```

# Ex.3

## 为何开启A20，如何开启A20

A20地址线（即第21根地址线），其输出受A20 Gate的控制。当A20 Gate关闭时，其输出被屏蔽，恒为0；开启时则可以正常输出。

在实模式下，Segment:Offset寻址方式可寻址的最大地址为FFFF0H+FFFFH=10FFEFH，而如果不打开A20地址线，地址空间100000H-10FFEFH的高位会被截断，随即回卷至低位地址空间（即00000H-0FFEFH），相当于该部分地址空间无法访问到。

在保护模式下，32位地址可寻址最大为4G，若A20始终被屏蔽，相当于每个地址的第21位始终为0，使得1M的奇数倍对应的地址空间（100000H-1FFFFFH、300000H-3FFFFFH……）无法被访问到。

因此无论实模式还是保护模式，为了可以访问所有可用内存，都需要打开A20。

在boot/bootasm.S中，对A20的开启是通过操作8042控制器来实现的。

```nasm
seta20.1:
    inb $0x64, %al
    testb $0x2, %al
    jnz seta20.1

    movb $0xd1, %al
    outb %al, $0x64

seta20.2:
    inb $0x64, %al
    testb $0x2, %al
    jnz seta20.2

    movb $0xdf, %al
    outb %al, $0x60
```

`inb`指令用于从指定端口读取8位数据，`outb`指令用于向指定端口写入8位数据。

1. 读取8024的Status Register，检查输入缓冲区是否为空，若不为空死循环直到为空为止。
   
    > Input buffer status (0 = empty, 1 = full)
    (must be clear before attempting to write data to IO port 0x60 or IO port 0x64)
    > 
2. 向8024的Command Register写入数据`0xD1`，表示需要写一个字节到Controller Output Port。
   
    > 0xD1: Write next byte to Controller Output Port (see below)
    Note: Check if output buffer is empty first
    > 
3. 读取8024的Status Register，检查输入缓冲区是否为空，若不为空死循环直到为空为止。
4. 向Controller Output Port写入字节0xDF（`0b11011111`），第二位用于开启A20 Gate，置1。

## 如何初始化GDT表

调用LGDT指令`lgdt gdtdesc`加载GDT表的限长和基地址到GDTR中。GDT定义如下：

```nasm
gdt:
    SEG_NULLASM                                     # null seg
    SEG_ASM(STA_X|STA_R, 0x0, 0xffffffff)           # code seg for bootloader and kernel
    SEG_ASM(STA_W, 0x0, 0xffffffff)                 # data seg for bootloader and kernel

gdtdesc:
    .word 0x17                                      # sizeof(gdt) - 1
    .long gdt                                       # address gdt
```

32位下GDTR长为48Bit，64位下长80Bit。前16Bit用于存储GDT的`最大表长-1`，这里是0x17；后32Bit（64位下是64Bit）用于存储GDT表的基地址。GDTR加载完毕后，即可使用段选择子来指定段。

GDT中，第一项必须全为0，真正有用的表项从第二项开始。根据代码中的宏扩展，第二项和第三项可以扩展为如下：

- 2nd Entry (Code Segment)
  
    Hex: `FF FF 00 00 00 9A CF 00`
    
    Binary: `11111111 11111111 00000000 00000000 00000000 10011010 11001111 00000000`
    
    - Base: `0x00000000`
    - Limit: `0xFFFFF`
    - Access Byte: `A(0) RW(1) DC(0) E(1) S(4) DPL(0) P(1)`
        - Code Segment: Readable and Executable
    - Flags: `L(0) DB(1) G(1)`
        - Long Mode: Off
        - 32-Bit Protected Mode Segment
        - 4KB Granularity
- 3rd Entry (Data Segment)
  
    Hex: `FF FF 00 00 00 92 CF 00`
    
    Binary: `11111111 11111111 00000000 00000000 00000000 10010010 11001111 00000000`
    
    - Base: `0x00000000`
    - Limit: `0xFFFFF`
    - Access Byte: `A(0) RW(1) DC(0) E(0) S(4) DPL(0) P(1)`
        - Data Segment: Readable and Writable
    - Flags: `L(0) DB(1) G(1)`
        - Long Mode: Off
        - 32-Bit Protected Mode Segment
        - 4KB Granularity

## 如何使能和进入保护模式

```nasm
movl %cr0, %eax
orl $CR0_PE_ON, %eax
movl %eax, %cr0
```

将CR0寄存器中的第0位(Protected Mode Enable)使能，即开启CPU保护模式。

随后跳转至32位汇编代码：

```nasm
; PROT_MODE_CSEG = 0x8
ljmp $PROT_MODE_CSEG, $protcseg
```

在实模式下，逻辑地址空间中存储单元的地址由段值和段内偏移两部分组成；在保护模式下，虚拟地址空间(相当于逻辑地址空间)中存储单元的地址由段选择子和段内偏移两部分组成。与实模式相比，段选择子代替了段值。

| 3-15 | 2 | 0-1 |
| --- | --- | --- |
| Index | Table Indicator | Requested Privilege Level |
| GDT/LDT表项的索引值，从0开始 | 0表示读取的是GDT，1表示LDT | 0为最高特权级，3为最低特权级 |

因此将`PROT_MODE_CSEG`值转换为二进制，即`0000 0000 0000 1000`，对应0特权级GDT的第2项，也就是上面的内核代码段，基地址为0，偏移值为`protcseg`标记所在的偏移值。因此代码之后将继续跳转到`protcseg`标记处，以32位保护模式继续执行。

## Reference

- [关于A20 Gate - whowin的日志 - 网易博客](https://web.archive.org/web/20220829090216/http://hengch.blog.163.com/blog/static/107800672009013104623747/)
- ["8042" PS/2 Controller](https://wiki.osdev.org/%228042%22_PS/2_Controller)
- [LGDT/LIDT - Load Global/Interrupt Descriptor Table Register](https://www.felixcloutier.com/x86/lgdt:lidt)
- [Global Descriptor Table](https://wiki.osdev.org/Global_Descriptor_Table)
- [x86 Instruction Set Reference - JMP](https://c9x.me/x86/html/file_module_x86_id_147.html)

# Ex.4

## Bootloader如何读取硬盘扇区

读取单个扇区的代码：

```c
/* waitdisk - wait for disk ready */
static void
waitdisk(void) {
    while ((inb(0x1F7) & 0xC0) != 0x40)
        /* do nothing */;
}

/* readsect - read a single sector at @secno into @dst */
static void
readsect(void *dst, uint32_t secno) {
    // wait for disk to be ready
    waitdisk();

    outb(0x1F2, 1);                         // count = 1
    outb(0x1F3, secno & 0xFF);
    outb(0x1F4, (secno >> 8) & 0xFF);
    outb(0x1F5, (secno >> 16) & 0xFF);
    outb(0x1F6, ((secno >> 24) & 0xF) | 0xE0);
    outb(0x1F7, 0x20);                      // cmd 0x20 - read sectors

    // wait for disk to be ready
    waitdisk();

    // read a sector
    insl(0x1F0, dst, SECTSIZE / 4);
}
```

首先在读取数据之前，`waitdisk()`函数循环确认硬盘是否处于正常工作状态且已经准备好可以接受数据的读写。函数检查了硬盘状态寄存器的高两位：

- RDY：Bit is clear when drive is spun down, or after an error. Set otherwise.
- BSY：Indicates the drive is preparing to send/receive data (wait for it to clear). In case of 'hang' (it never clears), do a software reset.

当硬盘准备好之后，向硬盘请求读取数据，1F2端口指定读取的扇区数量（此处是1），1F3~1F5端口以及1F6的低4位用于存储LBA参数（扇区号）。1F6端口的高4位指定了两个Flags，其余两位始终设置为1：

- DRV：第4位，用于选择设备号，这里是0
- LBA：第6位，设置为1则为LBA寻址，否则为CHS寻址

向1F7端口写入数据表示发送命令。0x20表示读取数据`READ SECTORS`，0x30表示写入数据`WRITE SECTORS`。

命令发送完毕后继续等待硬盘准备好，随后使用`insl`指令读取收到的数据，存储在对应地址中。（`insl`指令的读取单位是DWORD，故`cnt`要除以4）

Reference: [ATA PIO Mode](https://wiki.osdev.org/ATA_PIO_Mode#Registers)、[Why can't find the insl instruction in x86 document](https://stackoverflow.com/questions/38410829/why-cant-find-the-insl-instruction-in-x86-document)

## Bootloader如何加载ELF格式的OS

```c
#define SECTSIZE        512
#define ELFHDR          ((struct elfhdr *)0x10000)      // scratch space
/* bootmain - the entry of bootloader */
void
bootmain(void) {
    // read the 1st page off disk
    readseg((uintptr_t)ELFHDR, SECTSIZE * 8, 0);

    // is this a valid ELF?
    if (ELFHDR->e_magic != ELF_MAGIC) {
        goto bad;
    }

    struct proghdr *ph, *eph;

    // load each program segment (ignores ph flags)
    ph = (struct proghdr *)((uintptr_t)ELFHDR + ELFHDR->e_phoff);
    eph = ph + ELFHDR->e_phnum;
    for (; ph < eph; ph ++) {
        readseg(ph->p_va & 0xFFFFFF, ph->p_memsz, ph->p_offset);
    }

    // call the entry point from the ELF header
    // note: does not return
    ((void (*)(void))(ELFHDR->e_entry & 0xFFFFFF))();

bad:
    outw(0x8A00, 0x8A00);
    outw(0x8A00, 0x8E00);

    /* do nothing */
    while (1);
}
```

1. 从第二个扇区开始读取一页大小的数据到0x10000处，包含了ELF文件头。
2. 判断Magic数是否正确，若不正确说明ELF文件无效。
3. 读取所有Program Header，将ELF文件指定Offset的数据`ph->p_offset`，大小为`ph->p_memsz`，将其加载到`ph->p_va`处，相当于将ELF文件所有的段都加载进对应的虚拟内存中。
4. 加载完成后，也就可以直接跳转到入口虚拟地址执行代码。

# Ex.5 - 实现调用堆栈跟踪函数

x86函数堆栈结构：

![](https://hujiekang.top/images/uploads/big/b53a1a56952dc06adb61baad23d9ff1d.png)

```c
void
print_stackframe(void) {
    uintptr_t current_ebp = read_ebp();
    uintptr_t current_eip = read_eip();
    for (int i = 0; i < STACKFRAME_DEPTH; i++) {
        cprintf("ebp:0x%08x eip:0x%08x args:0x%08x 0x%08x 0x%08x 0x%08x\n",
            current_ebp, current_eip,
            *(uintptr_t *)(current_ebp + 8),
            *(uintptr_t *)(current_ebp + 12),
            *(uintptr_t *)(current_ebp + 16),
            *(uintptr_t *)(current_ebp + 20));
        if (!print_debuginfo(current_eip - 1)) {
            break;
        }
        current_ebp = *(uintptr_t *)(current_ebp);
        current_eip = *(uintptr_t *)(current_ebp + 4);
    }
}
```

另修改函数`print_debuginfo()`返回值为`int`，使得在无法搜索到函数堆栈信息时直接跳出：

```c
int
print_debuginfo(uintptr_t eip) {
    struct eipdebuginfo info;
    if (debuginfo_eip(eip, &info) != 0) {
        cprintf("    <unknow>: -- 0x%08x --\n", eip);
        return 0;
    }
    else {
        char fnname[256];
        int j;
        for (j = 0; j < info.eip_fn_namelen; j ++) {
            fnname[j] = info.eip_fn_name[j];
        }
        fnname[j] = '\0';
        cprintf("    %s:%d: %s+%d\n", info.eip_file, info.eip_line,
                fnname, eip - info.eip_fn_addr);
        return 1;
    }
}
```

# Ex.6 - 完善IDT

IDT中的一个表项占8个字节。第16-31位表示中断程序所在的段选择子，0-15, 48-63位表示对应段的偏移值，据此可定位到中断处理程序的地址。

![](https://hujiekang.top/images/uploads/medium/4c78d0741ceeff01f5546c910932b1f1.png)

## 初始化中断描述符表

中断处理过程：

1. `int xxx`指令
2. 通过IDT找到对应的中断处理例程，位于kern/trap/vectors.S
3. 将中断号压栈，跳转到`__alltraps`，位于kern/trap/trapentry.S
4. `__alltraps`调用`trap`函数，位于kern/trap/trap.c
5. `trap`函数调用`trap_dispatch`函数，根据中断号来进行不同的处理

因此要做的就是将IDT每一项与kern/trap/vectors.S中对应的中断处理例程挂接，挂接完毕后通过lidt指令初始化IDTR。

```c
static struct gatedesc idt[256] = {{0}};

static struct pseudodesc idt_pd = {
    sizeof(idt) - 1, (uintptr_t)idt
};

void
idt_init(void) {
    extern uintptr_t __vectors[];
    int i;
    // sel means segment selector rather than GDT index
    for (i = 0; i < sizeof(idt)/sizeof(struct gatedesc); i++) {
        SETGATE(idt[i], 0, GD_KTEXT, __vectors[i], DPL_KERNEL);
    }
    // for T_SWITCH_TOU and T_SWITCH_TOK
    // T_SWITCH_TOU is already set from above
    SETGATE(idt[T_SWITCH_TOK], 0, GD_KTEXT, __vectors[T_SWITCH_TOK], DPL_USER);
    
    lidt(&idt_pd);
}
```

需要注意的是，`SETGATE`宏中传入`sel`参数为段选择子，而不是段在GDT中的索引。

## 完善处理时钟中断的部分

`kern_init`函数中调用了`clock_init`进行时钟中断初始化，同时对时钟中断次数变量`ticks`设置为0，此处直接使用即可。

```c
case IRQ_OFFSET + IRQ_TIMER:
		if (ticks == TICK_NUM) {
		    print_ticks();
		    ticks = 0;
		} else {
		    ticks++;
		}
		break;
```

# Chal.1 - 实现特权级的切换

实现特权级的切换通过INT与IRET指令来实现。根据实验说明中给出的代码，可以大致分析出整个特权级切换的过程。代码从0特权级开始，先翻转到3特权级，再翻转回0特权级，每次翻转的前后都会打印相关段选择子的值。

```c
static void
switch_test(void) {
    print_cur_status();          // print 当前 cs/ss/ds 等寄存器状态
    cprintf("+++ switch to  user  mode +++\n");
    switch_to_user();            // switch to user mode
    print_cur_status();
    cprintf("+++ switch to kernel mode +++\n");
    switch_to_kernel();         // switch to kernel mode
    print_cur_status();
}
```

## INT与IRET指令执行流分析

了解INT与IRET指令具体对栈帧进行了什么操作，能够更好的理解特权级翻转的代码。

### INT指令

查看INT的伪代码，首先跳过实模式和虚拟8086模式的处理，直接来到`PROTECTED-MODE`段。此段除去一些错误处理外，对调用门的类型进行了判断：

```bash
PROTECTED-MODE:
    ...... # 此处部分省略
    IF task gate (* Specified in the selected interrupt table descriptor *)
        THEN GOTO TASK-GATE;
        ELSE GOTO TRAP-OR-INTERRUPT-GATE; (* PE = 1, trap/interrupt gate *)
    FI;
END;
```

此处显然不是Task Gate，故进入`TRAP-OR-INTERRUPT-GATE`程序段处理。在`TRAP-OR-INTERRUPT-GATE`段中对DPL和CPL进行了判断：

- 如果DPL < CPL（低特权级请求向高特权级转换）则进入`INTER-PRIVILEGE-LEVEL-INTERRUPT`；
- 如果DPL = CPL（同级特权请求）则进入`INTRA-PRIVILEGE-LEVEL-INTERRUPT`；
- 如果DPL > CPL，则产生#GP异常（很好理解，所有中断处理例程的代码特权级都是0，如果CPL比0都小肯定说明出问题了，又或是根本不可能产生这种情况）。

```bash
TRAP-OR-INTERRUPT-GATE:
    # ...... 此处部分省略
    # non-conforming 是不符合的意思，但是根据下面的注释结果是符合条件？
    IF new code segment is non-conforming with DPL < CPL
        THEN
            IF VM = 0
                THEN
                    GOTO INTER-PRIVILEGE-LEVEL-INTERRUPT;
                    (* PE = 1, VM = 0, interrupt or trap gate, nonconforming code segment,
                    DPL < CPL *)
                ELSE (* VM = 1 *)
                    # ...... 此处部分省略
            FI;
        ELSE (* PE = 1, interrupt or trap gate, DPL ≥ CPL *)
            IF VM = 1
                # ...... 此处部分省略
            IF new code segment is conforming or new code-segment DPL = CPL
                THEN
                    GOTO INTRA-PRIVILEGE-LEVEL-INTERRUPT;
                ELSE (* PE = 1, interrupt or trap gate, nonconforming code segment, DPL > CPL *)
                    #GP(error_code(new code-segment selector,0,EXT));
            FI;
    FI;
END;
```

接下来在`INTER-PRIVILEGE-LEVEL-INTERRUPT`段中：

```bash
INTER-PRIVILEGE-LEVEL-INTERRUPT:
    (* PE = 1, interrupt or trap gate, non-conforming code segment, DPL < CPL *)
    IF (IA32_EFER.LMA = 0) (* Not IA-32e mode *)
        THEN
            # 从TSS中读取新特权级的栈段和ESP值
            IF current TSS is 32-bit
                THEN
                    TSSstackAddress := (new code-segment DPL « 3) + 4;
                    IF (TSSstackAddress + 5) > current TSS limit
                        THEN #TS(error_code(current TSS selector,0,EXT)); FI;
                        (* idt operand to error_code is 0 because selector is used *)
                    NewSS := 2 bytes loaded from (TSS base + TSSstackAddress + 4);
                    NewESP := 4 bytes loaded from (TSS base + TSSstackAddress);
                ELSE (* current TSS is 16-bit *)
                    # ...... 此处部分省略
            FI;
            # ...... 此处部分省略
        ELSE (* IA-32e mode *)
            # ...... 此处部分省略
    FI;
    # ...... 此处部分省略
    IF (IA32_EFER.LMA = 0) (* Not IA-32e mode *)
        THEN
            # 将ESP和SS赋值为新特权级的栈段数据
            IF instruction pointer from IDT gate is not within new code-segment limits
                THEN #GP(EXT); FI; (* Error code contains NULL selector *)
            ESP := NewESP;
            SS := NewSS; (* Segment descriptor information also loaded *)
        ELSE (* IA-32e mode *)
            # ...... 此处部分省略
    FI;
    IF IDT gate is 32-bit
        THEN
            CS:EIP := Gate(CS:EIP); (* Segment descriptor information also loaded *)
        ELSE
            IF IDT gate 16-bit
                # ...... 此处部分省略
            FI;
    FI;
    IF IDT gate is 32-bit
            THEN
                Push(far pointer to old stack);
                (* Old SS and ESP, 3 words padded to 4 *)
                Push(EFLAGS);
                Push(far pointer to return instruction);
                (* Old CS and EIP, 3 words padded to 4 *)
                Push(ErrorCode); (* If needed, 4 bytes *)
            ELSE
                IF IDT gate 16-bit
                    # ...... 此处部分省略
            FI;
    FI;
    # ...... 此处部分省略
    CPL := new code-segment DPL;
    CS(RPL) := CPL;
    # ...... 此处部分省略
    # 设置EFLAGS和控制寄存器的部分位
    IF IDT gate is interrupt gate
        THEN IF := 0 (* Interrupt flag set to 0, interrupts disabled *); FI;
    TF := 0;
    VM := 0;
    RF := 0;
    NT := 0;
END;
```

对于跨特权级的中断请求，CPU会从TSS中读取目标代码段的栈段数据，并复制给ESP和SS。随后修改CS和EIP到对应Gate的代码段位置，即跳转到中断处理例程继续执行。

接下来，CPU将原来的栈段信息压栈，也就是`Push(far pointer to old stack);`，将指向原有栈的远指针压入栈中，相当于压入了旧的SS和ESP；随后依次压入EFLAGS、CS、EIP、错误代码（如果有的话）；最后修改CS的特权级，并处理一些Flags，此次指令执行完毕。

而对于`INTRA-PRIVILEGE-LEVEL-INTERRUPT`段：

```bash
INTRA-PRIVILEGE-LEVEL-INTERRUPT:
    # ...... 此处部分省略
    IF IDT gate is 32-bit (* implies IA32_EFER.LMA = 0 *)
        THEN
            Push (EFLAGS);
            Push (far pointer to return instruction); (* 3 words padded to 4 *)
            CS:EIP := Gate(CS:EIP); (* Segment descriptor information also loaded *)
            Push (ErrorCode); (* If any *)
        ELSE
            IF IDT gate is 16-bit (* implies IA32_EFER.LMA = 0 *)
                # ...... 此处部分省略
            FI;
    FI;
    CS(RPL) := CPL;
    # ...... 此处部分省略
    IF IDT gate is interrupt gate
        THEN IF := 0; FI; (* Interrupt flag set to 0; interrupts disabled *)
    TF := 0;
    NT := 0;
    VM := 0;
    RF := 0;
END;
```

可以看见`INTRA-PRIVILEGE-LEVEL-INTERRUPT`中没有从TSS中读取目标栈段信息了（因为是同特权级调用），也对应的没有将原有的SS和ESP压栈，其余行为基本和`INTER-PRIVILEGE-LEVEL-INTERRUPT`一致。

### IRET指令

查看IRET的伪代码，同样跳过实模式和虚拟8086模式的处理，做了INT的逆操作，将原来的代码段寄存器和EFLAGS弹出，随后进入`PROTECTED-MODE-RETURN`，对CS的请求特权级和CPL进行比较。

```bash
PROTECTED-MODE:
    # ...... 此处部分省略
    IF OperandSize = 32
        THEN
            EIP := Pop();
            CS := Pop(); (* 32-bit pop, high-order 16 bits discarded *)
            tempEFLAGS := Pop();
        ELSE (* OperandSize = 16 *)
            EIP := Pop(); (* 16-bit pop; clear upper bits *)
            CS := Pop(); (* 16-bit pop *)
            tempEFLAGS := Pop(); (* 16-bit pop; clear upper bits *)
    FI;
    IF tempEFLAGS(VM) = 1 and CPL = 0
            THEN GOTO RETURN-TO-VIRTUAL-8086-MODE;
            ELSE GOTO PROTECTED-MODE-RETURN;
    FI;
    # ...... 此处部分省略
END;

PROTECTED-MODE-RETURN: (* PE = 1 *)
    IF CS(RPL) > CPL
            THEN GOTO RETURN-TO-OUTER-PRIVILEGE-LEVEL;
            ELSE GOTO RETURN-TO-SAME-PRIVILEGE-LEVEL; FI;
END;
```

- 若CS请求特权级大于CPL（如返回到用户态，CS请求特权级3，CPL为0），进入`RETURN-TO-OUTER-PRIVILEGE-LEVEL`；
- 若CS请求特权级等于CPL（如返回到内核态，CS请求特权级0，CPL为0），进入`RETURN-TO-SAME-PRIVILEGE-LEVEL`。

首先看`RETURN-TO-OUTER-PRIVILEGE-LEVEL`，由于涉及特权级切换，因此有栈段切换的操作，将栈中保存的原有特权级的栈段寄存器数据弹出。随后置位EFLAGS，指令执行结束。

```bash
RETURN-TO-OUTER-PRIVILEGE-LEVEL:
    IF OperandSize = 32
        THEN
            tempESP := Pop();
            tempSS := Pop(); (* 32-bit pop, high-order 16 bits discarded *)
    ELSE IF OperandSize = 16
        # ...... 此处部分省略
    FI;
    # ...... 此处部分省略
    # 还原EFLAGS
    EFLAGS (CF, PF, AF, ZF, SF, TF, DF, OF, NT) := tempEFLAGS;
    IF OperandSize = 32 or OperandSize = 64
        THEN EFLAGS(RF, AC, ID) := tempEFLAGS; FI;
    IF CPL ≤ IOPL
        THEN EFLAGS(IF) := tempEFLAGS; FI;
    IF CPL = 0
        THEN
            EFLAGS(IOPL) := tempEFLAGS;
            IF OperandSize = 32 or OperandSize = 64
                THEN EFLAGS(VIF, VIP) := tempEFLAGS; FI;
    FI;
    # ...... 此处部分省略
    CPL := CS(RPL);
    IF OperandSize = 64
        THEN
            RSP := tempRSP;
            SS := tempSS;
        ELSE
            ESP := tempESP;
            SS := tempSS;
    FI;
    # ...... 此处部分省略
END;
```

`RETURN-TO-SAME-PRIVILEGE-LEVEL`中则没有弹出栈段的操作，其余基本与上面一致。

```bash
RETURN-TO-SAME-PRIVILEGE-LEVEL: (* PE = 1, RPL = CPL *)
    # ...... 此处部分省略
    EFLAGS (CF, PF, AF, ZF, SF, TF, DF, OF, NT) := tempEFLAGS;
    IF OperandSize = 32 or OperandSize = 64
        THEN EFLAGS(RF, AC, ID) := tempEFLAGS; FI;
    IF CPL ≤ IOPL
        THEN EFLAGS(IF) := tempEFLAGS; FI;
    IF CPL = 0
        THEN
            EFLAGS(IOPL) := tempEFLAGS;
            IF OperandSize = 32 or OperandSize = 64
                THEN EFLAGS(VIF, VIP) := tempEFLAGS; FI;
    FI;
    # ...... 此处部分省略
END;
```

## 从Ring 0到Ring 3

使用`int n`指令调用进入中断时，程序在中断前就是Ring 0，调用的Interrupt Gate的DPL还是0，因此相当于处理中断时特权级别并未产生改变。此时有：CPL = 0，DPL = 0。因此在指令处理中，将会压入EFLAGS、CS、EIP到栈中，**不会将先前的栈段信息压栈**。

而在中断例程要返回的时候，此时程序将转入用户态执行，因此CS(RPL) = 3，但是CPL还是0（仍然在内核态处理中断过程中），所以指令会首先弹出EIP、CS、EFLAGS，然后**还会弹出ESP和SS，还原栈段寄存器**。

此时就出现了一个问题，在INT指令中并未压入先前栈段的信息，而返回时却要弹出栈段信息，所以栈帧的这部分信息需要使用某种手段来把栈段的信息给补足，否则IRET从不完整的栈帧信息中也无法恢复原有的栈。

先看看中断真正的处理代码（不包括保存现场的代码）前后的栈帧情况。可以看见，由INT指令和`__alltraps`处理例程将寄存器组压栈，在栈上内存空间组合成了一个`struct trapframe`结构体。

![](https://hujiekang.top/images/uploads/big/b77ac44296c5d94431e0358c51cb68a5.png)

可以看见，这个结构体的底部ESP和SS的值由于中断时并未压栈，此时指向原有栈的数据，分别为`lab1_switch_to_user`中保存的EBP，和`lab1_switch_to_user`的返回地址。显然这两个地址的数据是无法被修改的，若被修改函数则无法返回，所以若要保证IRET能够正确返回，需要一个另外的空间来存储这些信息。

于是可以新建一个临时的中断栈帧结构`k2u`，将现有中断栈帧的其他寄存器数据复制过来，再修改临时栈帧中各种段的特权级和ESP和SS的值：

```c
struct trapframe k2u;

// 部分代码省略
case T_SWITCH_TOU:
    if (tf->tf_cs != USER_CS) {
				// 复制中断栈帧的内容
        k2u = *tf;
				// 代码段和数据段特权级修改（FS和GS一直是3特权级故无需修改）
        k2u.tf_cs = USER_CS;
        k2u.tf_ds = k2u.tf_es = k2u.tf_ss = USER_DS;
        // 恢复栈帧到原有堆栈位置（即int指令执行前的状态）
				// 所以将ESP的值修改为指向lab1_switch_to_user中保存的EBP位置
        k2u.tf_esp = (uint32_t) tf + (sizeof(struct trapframe) - 8);
				// 修改IO特权级
        k2u.tf_eflags |= FL_IOPL_3;
				// 相当于强行修改trap_dispatch的参数为新的临时栈地址
        *((uint32_t *)tf - 1) = (uint32_t)&k2u;
    }
    break;
```

代码中最后一行，可以理解为一个Trick，因为在中断处理函数`trap`中多包了一层，即最终是`trap_dispatch`函数来处理中断：

```c
void
trap(struct trapframe *tf) {
    // dispatch based on what type of trap occurred
    trap_dispatch(tf);
}
```

对应到汇编就是将`tf`的地址作为参数又压了栈，再传递给`trap_dispatch`函数，其地址刚好就在`tf`的正上方，因此使用`*((uint32_t *)tf - 1)`来引用和修改这个值，在`trap`函数返回恢复ESP的时候，弹出的就是被修改后的ESP值。

随后在`__trapret`中恢复寄存器组，IRET也能够正常的恢复栈段。

## 从Ring 3到Ring 0

与上面相反，调用INT中断指令时产生了特权级的切换，因此CPU会从TSS中读取目标栈段的信息。而此时还没有内核栈和用户栈之分，所以在kern/pmm.c中建立了一个临时的内核栈，并初始化进了TSS中。

```c
/* temporary kernel stack */
uint8_t stack0[1024];

/* gdt_init - initialize the default GDT and TSS */
static void
gdt_init(void) {
    // Setup a TSS so that we can get the right stack when we trap from
    // user to the kernel. But not safe here, it's only a temporary value,
    // it will be set to KSTACKTOP in lab2.
    ts.ts_esp0 = (uint32_t)&stack0 + sizeof(stack0);
    ts.ts_ss0 = KERNEL_DS;

    // initialize the TSS filed of the gdt
    gdt[SEG_TSS] = SEG16(STS_T32A, (uint32_t)&ts, sizeof(ts), DPL_KERNEL);
    gdt[SEG_TSS].sd_s = 0;

    // reload all segment registers
    lgdt(&gdt_pd);

    // load the TSS
    ltr(GD_TSS);
}
```

因此在调用INT指令时，通过GDB可以发现在`stack0`的尾部压入了对应的数据：

![](https://hujiekang.top/images/uploads/big/48f8f559ad0a3c476ef7ecf71ac5737e.png)

而在IRET返回时，由于此时各段已被修改为0特权级，所以相当于同特权级返回，因此IRET不会再弹出栈段的寄存器数据。此时不再需要一个临时栈帧，直接修改当前栈帧的权限即可：

```c
case T_SWITCH_TOK:
	  if (tf->tf_cs != KERNEL_CS) {
	      tf->tf_cs = KERNEL_CS;
	      tf->tf_ds = tf->tf_es = tf->tf_ss = KERNEL_DS;
	      tf->tf_eflags &= ~FL_IOPL_3;
	  }
	  break;
```

在调用中断的代码中，由于中断返回时栈中仍有保存的栈段寄存器数据未被弹出，因此需要添加额外的一行汇编代码来恢复ESP寄存器的值（答案中是`mov %ebp, %esp`，但我认为直接弹出更符合中断处理中恢复现场的过程）：

```c
static void
lab1_switch_to_kernel(void) {
    asm volatile (
        "int %0\n\t"
        "pop %%esp" :: "i"(T_SWITCH_TOK)
    );
}
```

由于在中断处理时已经将SS修改为内核段，因此此处无需再弹出SS。弹出ESP之后，栈指针自动回到原有栈空间，此时返回相当于已经恢复了原有执行上下文。

## Reference

- [INT n/INTO/INT3/INT1 - Call to Interrupt Procedure](https://www.felixcloutier.com/x86/intn:into:int3:int1)
- [IRET/IRETD/IRETQ - Interrupt Return](https://www.felixcloutier.com/x86/iret:iretd:iretq)

- [uCore实验 - Lab1 | Kiprey's Blog](https://kiprey.github.io/2020/08/uCore-1/#3-%E9%80%9A%E8%BF%87%E4%B8%AD%E6%96%AD%E5%88%87%E6%8D%A2%E7%89%B9%E6%9D%83%E7%BA%A7)
- [RPL保存在选择子里，那么CPL是保存在哪里的？](https://bbs.pediy.com/thread-92921.htm)

# Chal.2 - 键盘实现特权级切换

用键盘实现用户模式内核模式切换。具体目标是：“键盘输入3时切换到用户模式，键盘输入0时切换到内核模式”。直接`goto`：

```c
		case IRQ_OFFSET + IRQ_KBD:
        c = cons_getc();
        cprintf("kbd [%03d] %c\n", c, c);
        if (c == '0') {
            goto u2k_loc;
        } else if (c == '3') {
            goto k2u_loc;
        }
        break;
    //LAB1 CHALLENGE 1 : YOUR CODE you should modify below codes.
    case T_SWITCH_TOU:
k2u_loc:
        if (tf->tf_cs != USER_CS) {
            k2u = *tf;
            k2u.tf_cs = USER_CS;
            k2u.tf_ds = k2u.tf_es = k2u.tf_ss = USER_DS;
            k2u.tf_esp = (uint32_t) tf + (sizeof(struct trapframe) - 8);
            k2u.tf_eflags |= FL_IOPL_3;

            *((uint32_t *)tf - 1) = (uint32_t)&k2u;
        }
        break;
    case T_SWITCH_TOK:
u2k_loc:
        if (tf->tf_cs != KERNEL_CS) {
            tf->tf_cs = KERNEL_CS;
            tf->tf_ds = tf->tf_es = tf->tf_ss = KERNEL_DS;
            tf->tf_eflags &= ~FL_IOPL_3;
        }
        break;
```
