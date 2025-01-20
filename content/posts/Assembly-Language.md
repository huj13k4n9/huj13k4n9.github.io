---
title: 汇编语言学习笔记
date: 2020-02-20 15:46:37
categories:
  - Summary
---

在读[《汇编语言》](https://book.douban.com/subject/25726019/)这本书学习汇编语言的时候，在此对每一章的要点进行总结和记录，以便日后复习与查看。

练习环境：Windows 2000 Professional，与书中程序运行环境一致。

# 第一章 基础知识

汇编语言是一门**直接在硬件之上工作**的编程语言。由于早期人们使用机器语言（一串二进制数字）进行编程存在不易纠错、晦涩难懂的缺点，所以发明了汇编语言来帮助程序员更高效的编程。汇编语言经编译连接之后可以直接形成由机器指令构成的程序，可以直接被CPU执行。而不同型号的CPU拥有不同的指令集，所以汇编语句对应的机器码可能不尽相同。这本书的汇编语言是基于8086CPU的指令集来进行描述的。

汇编语言包括三个部分：
1. **汇编指令（核心部分）**：机器码的助记符，**有对应的机器码**
2. 伪指令：由编译器执行，**没有对应的机器码**，计算机本身并不执行
3. 其他符号：如`+`、`-`、`*`、`/`等，由编译器识别，**没有对应机器码**

汇编语言的指令和数据信息存放在**存储器（内存）**中。在内存中指令和数据并没有任何区别，本质上都是**二进制信息**。而决定一段二进制信息是指令还是数据，则由CPU工作时决定。存储器由若干个存储单元构成，单个存储单元的最小单位是**字节**（Byte，1Byte=8Bit）。

<!-- more -->

CPU想要进行数据的读写（包括存储器及一些外部器件），必须通过**总线**，与这些器件进行三类信息的交互（主线逻辑上也分为这三类）：
1. 地址信息：CPU首先通过**地址总线**将要读写的存储单元地址发出
2. 控制信息：随后CPU通过**控制总线**发送控制命令（内存读/写命令、存储芯片片选命令）
3. 数据信息：再通过**数据总线**将数据送入对应的存储单元/从对应的存储单元读出数据

一个CPU的地址总线有$N$根，那么可寻址的最多单元数为$2^N$，CPU能够寻址到的所有内存单元构成了这个CPU的**内存地址空间**；数据总线有$N$根，那么一次性可传输的数据位数为$N$；控制总线的宽度则决定了CPU对外部器件的控制能力。

CPU类型|地址总线宽度|数据总线宽度|寻址能力|一次可传送的数据量
:--:|:--:|:--:|:--:|:--:
8080|16|8|64KB|1B
8088|20|8|1MB|1B
8086|20|16|1MB|2B
80286|24|16|16MB|2B
80386|32|32|4GB|4B

在一台PC中，装有多个存储器芯片，这些存储器芯片从读写属性上分为**RAM**和**ROM**两类。RAM可读可写，但必须带点存储，掉电则内容丢失；ROM只可读不可写，掉电后数据不丢失。从功能上还可以分为三类：
1. RAM：这就是我们平常所说的内存，用于存放CPU使用的绝大部分程序和数据
2. 装有BIOS的ROM：主板和各接口卡均可以有，通过各自的BIOS可以实现基本的输入和输出
3. 各接口卡的RAM：比如显卡上的显存

CPU将上述的所有存储器都当作是内存来看待，所以逻辑上可以将上述的所有存储器映射为一个存储器，也就是CPU的内存地址空间。每个物理存储器在这个逻辑存储器中占有一个地址段，CPU向这个地址段读写数据，就是在向对应的存储器读写数据。所以，我们在基于一个硬件系统编程时，必须要知道这个系统的内存地址空间分配情况。

![](https://hujiekang.top/images/uploads/big/c2abc93b7ad23c99f9eeb4dbc9d3639b.png)

8086PC的内存地址空间分配情况：
- 00000H~9FFFFH：主存地址空间（RAM）
- A0000H~BFFFFH：显存地址空间
- C0000H~FFFFFH：各类ROM地址空间

# 第二章 寄存器

计算机组成原理中有提到：一个计算机系统除了I/O设备外，还有三大部件：**运算器、控制器、存储器**。其实这三大部件在CPU中也是存在的，它们在CPU中通过CPU内部的总线实现连接和信息传递。
- 运算器：进行信息处理和运算
- 控制器：控制各器件进行工作
- 存储器（寄存器）：存储信息

而对于汇编语言来说，CPU中主要的部件就是**寄存器**。因为程序员可以通过汇编指令来读写寄存器，从而实现对CPU的控制。
不同的CPU寄存器的个数和结构也不尽相同。8086CPU中有**14**个寄存器，分别为：`AX`、`BX`、`CX`、`DX`、`SI`、`DI`、`SP`、`BP`、`IP`、`CS`、`SS`、`DS`、`ES`、`PSW`。8086CPU中所有的寄存器都是**16位**（2B）的。

`AX`、`BX`、`CX`、`DX`这四个寄存器通常用来存放一般的数据，被称为**通用寄存器**。由于8086CPU上一代的CPU的寄存器都是8位（1B）的，为了保证兼容性，这四个通用寄存器也都可以分为两个8位的寄存器来使用，高位部分称为`xH`，低位部分称为`xL`（举例：`AX`高位为`AH`，低位为`AL`）。

8086CPU可以一次性处理一个字节（Byte）或一个字（Word，即**两个字节**）大小的数据。字型数据存储在寄存器里时，**高8位数据存储在寄存器的高位部分，低8位存储在寄存器的低8位部分。**

![](https://hujiekang.top/images/uploads/big/86e5797de96d6bff9f097a58e5d0684f.png)

几条汇编指令：

指令|语法|功能|高级语言描述
:--:|:--:|:--:|:--:
`mov`|`mov a, b`|将b数据放进a中|`a = b`
`add`|`add a, b`|将a和b相加，结果存储在a中|`a = a + b`
`sub`|`sub a, b`|将a和b相减，结果存储在a中|`a = a - b`

注意：上述指令的两个操作对象的**数据位数必须一致**；当最高位产生进位时，进位值**不能存储**，将会丢失（但这个进位值并未真正被丢弃）

CPU访问内存单元时要给出内存单元的地址。每个内存单元在CPU的内存地址空间中都有一个唯一的地址，这个地址称为这个单元的**物理地址**。
由于8086CPU的地址总线有20根，可以传送20位地址，而8086CPU又是16位的结构（运算器一次最多可以处理16位的数据），所以它给出内存单元物理地址的方法是：**将两个16位的地址合成为一个20位的物理地址**。

相关部件需要提供两个16位的地址：**段地址**和**偏移地址**，这两个地址通过地址加法器输出得到一个20位的物理地址，再通过地址总线传送到对应的存储器。
地址加法器的计算方法是：`物理地址 = 段地址 × 16 + 偏移地址`（也可以理解为`物理地址 = 段地址左移4位 + 偏移地址`）
举例：段地址`1230H`，偏移地址`00C8H`，合成的物理地址就是`1230H × 10H + 00C8H = 123C8H`。（也可表述为`1230H:00C8H`）

地址加法器将两个地址合成一个地址的方法，在计算机组成原理中叫做变址寻址，即**基准量固定、偏移量可变**的寻址方式。段地址相当于在内存地址空间划出了一个内存段，而通过变化偏移地址的大小，可以访问到这个段中的所有内存单元。内存段并不是固定被划分好的，而是根据需要可以进行自由的划分。需要注意，每个段的起始地址必为**16的倍数**；偏移地址的寻址能力位64KB，所以一个段最大为64KB。

段地址存放在**段寄存器**里面。8086CPU有4个段寄存器：`CS`、`SS`、`DS`、`ES`。

`CS`是代码段寄存器，`IP`是指令指针寄存器。通过这两个寄存器可以指示当前要读取的指令地址。换句话说，**任意时刻，CPU将`CS:IP`指向的内容当作指令执行**。
CPU读取、执行指令分如下几步：
1. `CS`、`IP`中的地址信息送入地址加法器，得到物理地址
2. 物理地址通过输入输出电路送上地址总线
3. `CS:IP`对应单元开始的指令通过数据总线传送至指令缓冲器
4. 读取一条指令后，IP中的值根据指令长度**自动增加**
5. 指令被送入执行控制器，指令被执行
6. 重复步骤1-5

![](https://hujiekang.top/images/uploads/big/ab9cbc5a7e6c9f46f929fe381d75a292.png)

修改`CS`、`IP`内容需要使用转移指令`jmp`。虽然mov传送指令可以将数据送入寄存器，但是mov指令并不能修改`CS`和`IP`的值。
- `jmp 段地址:偏移地址`：将`CS`修改为段地址，`IP`修改为偏移地址
- `jmp 寄存器/数字`：用寄存器/数字的值修改`IP`

```asm
例题：下面的指令执行后，CPU几次修改`IP`？

mov ax,bx
sub ax,ax
jmp ax

答案：4次。读取mov修改一次、读取sub修改一次、读取jmp修改一次、执行jmp指令修改一次。
```

## 实验1 查看CPU和内存，用机器指令和汇编指令编程

Debug是DOS、Windows都提供的实模式（8086模式）程序的调试工具。使用Debug可以查看CPU各种寄存器中的内容、内存的情况以及在机器码级跟踪程序的运行。
在Windows 2000下，Debug程序位于`C:/WINNT/system32`下，由于系统已经添加好了环境变量，所以可以直接在任意位置运行：

![](https://hujiekang.top/images/uploads/big/20761b889eb89c0eebe905b1fe7a7eb9.png)

Debug常见功能：
- **`r`命令：查看、改变CPU寄存器的内容。**直接输入`r`可查看寄存器内容并列出CS:IP对应的指令，`r 寄存器`可修改对应寄存器的内容，回车后输入要修改的值即可修改。
- **`d`命令：查看内存中的内容，包括单元的数据具体值和对应的字符。**`d 段地址:偏移地址`可查看以该地址开始的128个单元的内容，`d 段地址:偏移地址1 偏移地址2`可查看偏移地址1到偏移地址2的内存内容，`d 偏移地址`可查看`DS:偏移地址`开始的内存内容，单独输入`d`可查看上一次`d`命令后续的内存内容。
- **`e`命令：以内存单元为单位改写内存中的内容。**`e 地址 数据...`可以让从该地址开始的后续单元修改为对应的数值/字符，`e 地址`可以以提问的方式逐个修改内存单元，回车键结束。
- **`u`命令：查看内存中机器码对应的汇编指令。**
- **`t`命令：单步执行CS:IP指向的指令。**
- **`a`命令：以汇编指令的形式向内存写入机器指令。**
- **`g`命令：运行到内存指定位置的代码后暂停。**`g 地址/断点`运行到地址或断点处暂停。
- **`q`命令：退出Debug。**

### 实验任务

- (1) 使用Debug将下面的程序段写入内存，逐条执行，观察每条指令执行后CPU中相关寄存器内容的变化。

![](https://hujiekang.top/images/uploads/big/ec13f7cf2802f867c3a004fd2d3f4e80.png)

汇编指令|寄存器内容
:--:|:--:
`mov ax,4E20H`|AX=4E20H,IP=0003H
`add ax,1416H`|AX=6236H,IP=0006H
`mov bx,2000H`|BX=2000H,IP=0009H
`add ax,bx`|AX=8236H,BX=2000H,IP=000BH
`mov bx,ax`|AX=8236H,BX=8236H,IP=000DH
`add ax,bx`|AX=046CH,BX=8236H,IP=000FH
`mov ax,001AH`|AX=001AH,IP=0012H
`mov bx,0026H`|BX=0026H,IP=0015H
`add al,bl`|AX=0040H,BX=0026H,IP=0017H
`add ah,bl`|AX=2640H,BX=0026H,IP=0019H
`add bh,al`|AX=2640H,BX=4026H,IP=001BH
`mov ah,0`|AX=0040H,IP=001DH
`add al,bl`|AX=0066H,BX=4026H,IP=001FH
`add al,9CH`|AX=0002H,IP=0021H

<br>

- (2) 将下面三条指令写入从2000:0开始的内存单元中，利用这三条指令计算$\large{2^8}$。

```asm
mov  ax,1
add  ax,ax
jmp  2000:0003
```
执行结果如下：

![](https://hujiekang.top/images/uploads/big/d23a7bcaff0f895c703454833f506bef.png)

- (3) 查看内存中的内容：PC机主板上的ROM中写有一个生产日期，在内存`FFF00H~FFFFFH`的某几个单元中，请找到这个生产日期并试图改变它。

查看结果如下：

![](https://hujiekang.top/images/uploads/big/f10a75fe8eef2eeac3916aa5ac08b8a2.png)

可以看见主板的生产日期是2019年7月29日，位于`FFFF5H~FFFFCH`的位置。尝试去修改的操作是无效的，因为这段内存对应的存储器是ROM，**只可读不可写**。

- (4) 向内存从`B8100H`开始的单元中填写数据，如：

```asm
-e B810:0000 01 01 02 02 03 03 04 04
```
观察产生的现象。

![](https://hujiekang.top/images/uploads/big/ad30f46abc2dd231e825beea3767ca27.png)

可以看见窗口上的显示发生了变化，因为这一段内存对应的是显存。

# 第三章 寄存器(内存访问)

内存中存储字的方式和在寄存器中存储字的方式类似，也是**低位字节放在低地址单元中，高位字节放在高地址单元中**。存放字的两个连续单元称为字单元，其低地址单元称为字单元的起始地址。

`DS`寄存器用于存储要访问**数据的段地址**。修改`DS`可以使用`mov`指令，但是不能直接将数据送入段寄存器或是将段寄存器中的数据直接与其他数据进行处理，而需要通过先将数据送入通用寄存器或内存单元间接实现。
`[address]`用于表示`ds:address`单元中的数据。汇编程序中会把`[address]`单独出现时看作一个常数，所以单独出现的情况仅在Debug程序中才有效。
下面是一段示例代码：
```asm
mov bx,1000H  
mov ds,bx   ;给DS赋值
mov [0],al   ;将数据送入内存单元
```

注：在处理`[address]`中的数据时，若要传送的目标或数据的来源为8位寄存器，则传送**字节型数据**；若为16位寄存器，则传送以`[address]`为起始地址的**字型数据**。

栈是一种具有特殊访问方式的存储空间，其特点是后进先出。CPU中同样拥有栈机制。可以将一段内存空间作为栈来使用，所以字型数据的存储和内存中一致。
汇编语言中提供了`push`和`pop`两个指令来对栈做最基本的操作：入栈和出栈。`push`和`pop`操作的对象可以是寄存器、段寄存器和内存单元。
注：8086CPU的入栈和出栈操作都是以字为单位进行的，所以类似`push al`这样的命令会报错。

8086CPU使用段寄存器`SS`和寄存器`SP`来指明栈顶的位置和栈的空间范围。**任意时刻，SS:SP指向栈顶元素。**初始状态下，即栈空时，栈顶指针`SP`指向栈底（即栈空间的最高地址单元）的下一个单元。每次入栈时，栈顶指针先上移两位，再将数据送入对应的位置；每次出栈时，先将数据送出，再将指针下移两位。

8086CPU没有额外的寄存器来存储栈的边界单元，所以栈顶超界（栈满时使用`push`入栈或栈空时使用`pop`出栈）的问题需要我们自己来管理，要根据可能用到的最大栈空间来设计栈的大小。

```asm
例题：如果将10000H~1FFFFH这段空间当作栈段，初始状态是空的，此时，SS=1000H，SP=？
答案：SP=0000H。栈中只有一个元素的时候，SP=FFFEH。随后该元素出栈，SP=SP+2=0000H。
```

段的总结：可以把一段内存定义为一个段，而段的功能则由我们自己决定：一个段可以既是**栈段（对应`SS`和`SP`）**，又是**代码段（对应`CS`和`IP`）**，还可以是**数据段（对应`DS`和`IP`）**，完全取决于我们的安排。

## 实验2 用机器指令和汇编指令编程

Debug中，`d`命令的段地址从`DS`寄存器中得到，且`e、a、u、d`这些可以带有内存地址的命令中均可以使用段寄存器表示段地址。

在Debug中，当`t`命令在执行修改寄存器`SS`的指令时，下一条指令也紧接着被执行，原因是触发了**中断机制**。
```asm
mov ax,2000
mov ss,ax
mov sp,10   ;与上一步一起执行
```
![](https://hujiekang.top/images/uploads/big/ec8c9b38e544ca228e9fc002cb52d647.png)

### 实验任务

- (1) 使用Debug，将下面的程序段写入内存，逐条执行，根据指令执行后的实际运行情况填空。

![](https://hujiekang.top/images/uploads/big/fbc48483870f217cb4b5ea4ba2059799.png)

- (2) 仔细观察图中的实验过程，然后分析：为什么`2000:0~2000:f`中的内容会发生改变？

![](https://hujiekang.top/images/uploads/big/05c453dcc585f92bc7b43cbddbbd2890.png)

`t`命令是单步执行的，所以在执行的过程中触发了单步中断，而中断需要栈来保护原程序的数据，所以在中断时将数据写入了栈中。
现在还不太懂中断，先贴一张后面的图：

![](https://hujiekang.top/images/uploads/big/088950c0200ca639e9f40e4aa7e10733.png)

# 第四章 第一个程序

和其他语言类似，一个汇编源程序从写出到执行要经历**编写程序、编译连接得到可执行文件、执行可执行文件**三个步骤。
汇编语言编译程序将编写好的汇编源程序进行编译，产生目标文件；随后连接程序将目标文件进行连接，生成可执行文件。可执行文件包含有**程序机器码、程序中定义的数据以及一些描述信息**，当可执行文件被执行时，系统会将文件中的机器码和数据载入内存，并进行初始化（如将`CS:IP`指向程序入口第一条指令），随后让CPU执行。

```asm
;一段简单的源程序
assume cs:code

code segment
    mov ax,0123H
    mov bx,0456H
    add ax,bx
    add ax,ax

    mov ax,4c00H
    int 21H
code ends

end
```

上述程序中的三个伪指令：
1. `xxx segment  ……  xxx ends`：成对使用的伪指令，用于标记一个段。一个源程序中**至少要有一个段**，通过段的名称来进行标识，段的名称将被编译连接后处理为段地址。
2. `end`：汇编程序结束的标记，没有`end`，CPU将无法知道程序在何处结束。
3. `assume`：意为“假设”，假设程序中的某一个段和某一个段寄存器相关联。

一个程序要想运行，必须要有另一个正在运行的程序P，P将程序载入到内存中，并把CPU的控制权交给要运行的程序，自己暂停运行，于是这个程序就运行起来了；当这个程序运行结束后，需要把CPU的控制权交还给程序P，随后程序P继续运行。这个**交还CPU控制权**的过程叫做程序返回。上述程序使用`mov ax,4c00H`、`int 21H`实现程序的返回。
当我们使用命令行来运行程序的时候，这个程序P就是操作系统的Shell（外壳）。每个系统都有自己的Shell，如DOS有`command.com`，Windows有`cmd.exe`等。

可以使用任意文本编辑器来编写汇编源程序，最终保存为`.asm`文件。
可以使用masm5.0汇编编译器（Microsoft Macro Assembler Version 5.00）来对源程序进行编译。在命令行窗口输入`masm`后回车，程序会提示输入源程序路径、输出目标文件路径、列表文件路径和交叉引用文件路径（这两个文件是编译的中间结果，不是必须要生成的文件），随后就可以生成目标文件，并提示是否有错误。

![](https://hujiekang.top/images/uploads/big/d2a409f248b5be37bdce24a99ad80287.png)

接下来可以使用Microsoft Overlay Linker对目标文件进行连接。同样输入输入目标文件路径、输出可执行文件路径、映像文件路径（中间结果，可以不用生成）和库文件路径（无子程序调用，可以不用输入）：

![](https://hujiekang.top/images/uploads/big/9081fd881bb00e61cf6cc02463d5062e.png)

编译和连接也可以简化操作：输入`masm 源程序文件路径;`则直接在当前目录生成目标文件；输入`link 目标文件路径;`则直接在当前目录生成可执行文件。

![](https://hujiekang.top/images/uploads/big/7517cc2e0ed6411b7367903338328e2c.png)

连接的作用：
1. 源程序过大时，可以**分为多个源程序编译**，编译后连接到一起成为一个可执行文件；
2. 如果程序调用了库文件中的子程序，那么需要**将库文件和目标文件连接到一起**；
3. 目标文件的**某些内容还不能直接用来生成可执行文件**，需要连接程序进一步的处理。

至此，一个汇编源程序从编写到执行的完整过程可以进行如下表示：

![](https://hujiekang.top/images/uploads/big/fddd734480e02ec8b8b8453d4106ec0e.png)

同样可以使用Debug程序来对一个程序进行逐步的追踪。使用`debug 程序路径`即可通过Debug将程序加载入内存并进行初始化，同时Debug仍然可以对CPU进行控制。
Debug加载程序后，会将程序的长度送入`CX`寄存器中。

DOS加载一个可执行程序时，会先找到一段空闲、容量足够的内存区域，并在这个区域的前256个字节中创建一个程序段前缀（PSP）。DOS利用PSP来和被加载的程序进行通信。
于是，假设这段内存区域的起始地址为`SA:0`，那么程序区的起始地址为`SA+10H:0`。程序初始化时，`CS:IP`也会指向`SA+10H:0`。

这种加载方式可以直观的体现在Debug中，表现为`DS`和`CS`寄存器的数值差异。当一个程序被Debug加载时，可以看见初始状态`CS`的值比`DS`的值要大`10H`：

![](https://hujiekang.top/images/uploads/big/2e263f774dde5d829dad41f4e1686e9e.png)

## 实验3 编程、编译、连接、跟踪

- (1) 将下面的程序保存为`t1.asm`文件，将其生成可执行文件`t1.exe`。

```asm
assume cs:codesg

codesg segment
    mov ax,2000H
    mov ss,ax
    mov sp,0
    add sp,10
    pop ax
    pop bx
    push ax
    push bx
    pop ax
    pop bx

    mov ax,4c00H
    int 21H
codesg ends

end
```

命令：`masm t1.asm;`、`link t1.obj;`

- (2) 用Debug跟踪t1.exe的执行过程，写出每一步执行后，相关寄存器中的内容和栈顶的内容。

汇编指令|寄存器内容|栈顶内容
:--:|:--:|:--:
`mov ax,2000H`|AX=2000H|00B8H
`mov ss,ax`|SS=2000H,AX=2000H|0000H
`mov sp,0`|SP=0000H|0000H
`add sp,10`|SP=000AH|0000H
`pop ax`|AX=0000H,SP=000CH|0000H
`pop bx`|BX=0000H,SP=000EH|0000H
`push ax`|AX=0000H,SP=000CH|0000H
`push bx`|BX=0000H,SP=000AH|0000H
`pop ax`|AX=0000H,SP=000CH|0000H
`pop bx`|BX=0000H,SP=000EH|0000H
`mov ax,4c00H`|AX=4C00H|0000H

- (3) PSP的头两个字节是`CD 20`，用Debug加载`t1.exe`，查看PSP的内容。

如下图：

![](https://hujiekang.top/images/uploads/big/bcf09887e699ee36bfa1cfdf83819692.png)

# 第五章 `[BX]`和`loop`指令

`[BX]`表示使用BX中存放的数据作为一个**偏移地址**，若单独出现则表示`DS:[BX]`中的数据，而也可以加其他的段前缀，表示对应单元的数据，如`CS:[BX]`。
举例：`mov ax,[bx]`
注：`[]`中**只允许使用通用寄存器中的`BX`**，是因为`[]`中必须是变址（Index，指`SI`, `DI`）或基址（Base，指`BX`, `BP`）寄存器，否则编译时会报`error A2048:Must be index or base register`错误。

`loop`指令的格式是`loop 标号`。CPU执行`loop`指令时，首先要将寄存器`CX`的内容减一，然后判断`CX`内容是否为0：若为0则向下执行，反之跳转至标号处执行程序。
也就是说，在`loop`指令中`CX`寄存器相当于起了一个**计数器**的作用，代表着这一段程序应该重复执行的次数。

```asm
;举例：计算2^11
assume cs:code
code segment
    mov ax,2
    mov cx,11
s:
    add ax,ax
    loop s

    mov ax,4c00H
    int 21H
code ends
end
```

可以看见，`loop`指令中的标号的标识地址要**在`loop`指令的前面**，要循环执行的程序段就放置在标识和`loop`指令之间。

使用Debug里逐步跟踪上述程序，可以看见`CX`在循环段执行时一直在递减，到了`CX`=1时，进入`loop`指令`CX`减为0，程序继续执行：

![](https://hujiekang.top/images/uploads/big/1818d5bfe0cbea9c6a9a229151c64a26.png)

若循环次数过多，逐步执行过于麻烦，可以使用`g`命令可以直接跳至某个地址开始执行：

![](https://hujiekang.top/images/uploads/big/f5e719acf7f292c08b99d449f9720d6d.png)

在Debug和编译器中，对`[常数]`的处理是不同的。Debug中把`[常数]`认为是`DS:[常数]`对应的单元数据，而编译器中把`[常数]`认为是一个常数。
所以，要让编译器认得`[常数]`是指一个偏移地址，需要在`[常数]`前面显式的给出对应的段前缀，如`ds:[0]`。

在8086CPU的模式下，随意向一段内存空间写入数据是非常危险的。向装有重要数据的内存单元写入数据会引发程序错误甚至死机：

![](https://hujiekang.top/images/uploads/big/68def18d9d0b807b4589dbd0ab680c8e.png)

为了保证重要数据的安全，我们通常需要寻找空闲的内存空间用于存储数据，或是让操作系统给程序分配空间用于存储数据。在DOS中，`0:200~0:2FF`这段内存空间通常是空闲的，直接使用这段内存是安全的。

## 实验4 `[bx]`和`loop`的使用

- (1) 编程，向内存`0:200~0:23F`一次传送数据`0~63(3FH)`。

```asm
assume cs:code
code segment
    mov ax, 0
    mov ds, ax
    mov ax, 0
    mov bx, 200h
    mov cx, 64

s:  mov [bx], ax
    inc ax
    inc bx
    loop s

    mov ax, 4c00h
    int 21h
code ends
end
```

- (2) 编程，向内存`0:200~0:23F`一次传送数据`0~63(3FH)`，程序中只能使用9条指令，包括`mov ax,4c00h`和`int 21h`。

使用同一个寄存器进行自增即可。
```asm
assume cs:code
code segment
    mov ax, 0
    mov ds, ax
    mov bx, 200h
    mov cx, 64

s:  mov [bx], bl
    inc bx
    loop s

    mov ax, 4c00h
    int 21h
code ends
end
```

- (3) 下面的程序功能是将mov ax,4c00h之前的指令复制到内存0:200处，补全程序，上机调试，跟踪运行结果。

```asm
assume cs:code
code segment
    mov ax,__cs__   ;填空
    mov ds,ax
    mov ax,0020h
    mov es,ax
    mov bx,0
    mov cx,__23__   ;填空
s:  mov al,[bx]
    mov es:[bx],al
    inc bx
    loop s
    mov ax,4c00h
    int 21h
code ends
end

1. 复制的是什么？从哪里到哪里？
复制的是数据，从第一条指令开始到`mov ax,4c00h`这条指令之前。
2. 复制的是什么？有多少个字节？如何知道要复制的字节数量？
复制的是数据，共23个字节，可以通过Debug中的u指令得知指令的长度，如下图：
```

![](https://hujiekang.top/images/uploads/big/6d5f23aa5c39d641c2661a8b65f52294.png)

# 第六章 包含多个段的程序

上一章提到了，我们不能够随意的向内存中写入数据，否则很可能会因为覆盖了系统关键数据而导致程序崩溃甚至死机，而应当选择一段安全、空闲的内存空间来存储我们的数据。

在DOS中，`0:200~0:2FF`这段内存空间是相对安全的，但是大小只有256个字节，所以当我们需要的空间大于256字节时，就无法使用这段空间，而应**当使用汇编指令向操作系统申请空间**。在操作系统环境下，**合法地通过操作系统取得的空间都是安全的**。

在程序中，有两种方式可以向系统取得空间：**加载程序时为程序分配**和**程序执行时向系统申请**。（后者此处暂时不讨论）

我们可以通过在程序中定义我们希望处理的数据来获取对应的空间，也就类似于高级语言当中的宏定义。在汇编语言中，使用**`dw`、`db`和`dd`指令来定义一个或一组数据**，其对应的英文全称分别为Define Word、Define Byte、Define DoubleWord，分别用于定义**字数据、字节数据和双字数据**。

定义了多少个数据，在加载程序时就会为这些数据分配对应的内存空间。数据处于哪段内存空间，取决于**数据的定义在程序中的位置**。比如下面的代码，我们分别在代码的前面和后面添加数据定义的语句，可以看到数据对应的内存位置发生了变化：

![](https://hujiekang.top/images/uploads/big/073f76611aed4fe58432435d08fafb71.png)

注：使用Debug的`u`指令来展示数据时，会把数据认成对应的指令，所以会出现一些与原程序无关的指令，但是查看其对应的字节数据，会发现其实就是被定义的数据。

而上面这种情况会使得程序在运行的时候也把数据当成指令来看待，会发现当数据的定义在代码前面的时候，后面代码的一些指令的意义也发生了改变，所以此时唯有通过改变`CS:IP`的位置到正确的指令位置，来使得程序可以正确的运行。但是当程序正常的运行过程中，除去读取指令会改动`IP`的值和修改`CS`、`IP`的指令以外，是不会随意修改`CS:IP`的位置的，所以此时必须要**给程序指定一个程序入口**，让CPU知道，应该从哪里开始执行指令，执行到哪里应该结束。

给程序添加入口的方法是使用一个标识标记程序的入口，并在程序结束的伪指令`end`后添加该标识。这里的`end`伪指令其实就起到了指明程序入口位置的作用：

```asm
assume cs:code
code segment
    ;data
    ;data
    ;data
start:
    ;code
    ;code
    ;code
code ends
end start
```

可以给一个汇编源程序添加多个段，用于存放不同的数据或指令。只需要每个段的标识不同即可：

```asm
assume cs:code,ds:data,ss:stack

data segment
    dw 0123h,0456h,0789h,0abch,0defh,0fedh,0cbah,0987h
data ends

stack segment
    dw 0,0,0,0,0,0,0,0
stack ends

code segment
start:
    mov ax,stack
    mov ss,ax
    mov sp,20h
    mov ax,data
    mov ds,ax
    ......
    mov ax,4c00h
    int 21h
code ends

end start
```

上述代码中使用了三个段，分别用于存放数据、设置栈和程序代码。由前面的知识，段的标识经过编译之后就是段的起始地址，所以实际上**可以直接用段的标识来代表段的起始地址**。也就是说，代码中的`mov ax,stack`、`mov ax,data`实际上就是把两个段的地址传送到`AX`寄存器中。

注：把一个段定义为数据段、栈段、代码段完全是我们人为的安排，是为了方便人们阅读而这么定义的，CPU并不知道这些定义的存在。

## 实验5 编写、调试具有多个段的程序

- (1) 将下面的程序编译、连接，用Debug加载、跟踪，然后回答问题。

```asm
assume cs:code,ds:data,ss:stack
data segment
    dw 0123h,0456h,0789h,0abch,0defh,0fedh,0cbah,0987h
data ends
stack segment
    dw 0,0,0,0,0,0,0,0
stack ends
code segment
start:  mov ax,stack
    mov ss,ax
    mov sp,16
    mov ax,data
    mov ds,ax
    push ds:[0]
    push ds:[2]
    pop ds:[2]
    pop ds:[0]
    mov ax,4c00h
    int 21h
code ends
end start
```

单从代码上来看，这段代码实现的是将数据段的前两个数据入栈再出栈的功能，最终的结果应该是数据段的数据不变。下图是执行结果，可以看见数据也并没有变化：

![](https://hujiekang.top/images/uploads/big/fba5b604c579db4d24a44be7c2365435.png)

1. CPU执行程序，程序返回前，`data`段的数据为多少？
   `data`段的数据和定义时一样，没有变化：`23 01 56 04 89 07 BC 0A EF 0D ED 0F BA 0C 87 09`。
2. CPU执行程序，程序返回前，CS=<code><u>0C3CH</u></code>，SS=<code><u>0C3BH</u></code>，DS=<code><u>0C3AH</u></code>。
3. 设程序加载后，`code`段的段地址为X，则`data`段的段地址为<code><u>X-2</u></code>，`stack`段的段地址为<code><u>X-1</u></code>。

- (2) 将下面的程序编译、连接，用Debug加载、跟踪，然后回答问题。

```asm
assume cs:code,ds:data,ss:stack
data segment
    dw 0123h,0456h
data ends
stack segment
    dw 0,0
stack ends
code segment
start:  mov ax,stack
    mov ss,ax
    mov sp,16
    mov ax,data
    mov ds,ax
    push ds:[0]
    push ds:[2]
    pop ds:[2]
    pop ds:[0]
    mov ax,4c00h
    int 21h
code ends
end start
```

这段代码实现的是将数据段的全部数据入栈再出栈的功能，最终的结果同样是数据段的数据不变。

1. CPU执行程序，程序返回前，`data`段的数据为多少？
   `data`段的数据和定义时一样，没有变化：`23 01 56 04`。
2. CPU执行程序，程序返回前，CS=<code><u>0C3CH</u></code>，SS=<code><u>0C3BH</u></code>，DS=<code><u>0C3AH</u></code>。
3. 设程序加载后，`code`段的段地址为X，则`data`段的段地址为<code><u>X-2</u></code>，`stack`段的段地址为<code><u>X-1</u></code>。
4. 对于如下定义的段：
```asm
name segment
    ...
name ends
```
如果段中的数据占N个字节，则程序加载后，该段实际占有的空间为？
先看看上面程序对两个`dw`指令的处理方式，使用Debug加载程序后使用`d`指令查看两个段：

![](https://hujiekang.top/images/uploads/big/27f3e4db61902f56dd757b335002d322.png)

可以发现，系统为这两个段中定义的数据各分配了16字节的空间，前四个字节是程序中定义的数据，后面的则用0来填充。
而如果把这两个`dw`指令放在一个段里呢？接下来是把两个`dw`指令都放在`data`段的结果（为了方便展示效果，两条`dw`指令均为`dw 0123h,0456h`）：

![](https://hujiekang.top/images/uploads/big/b96c210827ca47501e2e146abb60c564.png)

可以看见，两条指令的数据直接被连续的存储在一起，而由于仍然没有满16字节，所以剩余的用0来填充。
那么再看看数据大小超过16字节的情况，这次的`data`段如下：

```asm
data segment
    dw 0123h,0123h,0123h,0123h,0123h,0123h,0123h
    dw 0456h,0456h,0456h,0456h,0456h,0456h,0456h
data ends
```

![](https://hujiekang.top/images/uploads/big/2c6a9f85cea3023db47515c9b32448d3.png)

可以看见，由于两组数据没有把第二行填满，所以第二行的空余空间也用0进行了填充。

由此可以发现一个段占有内存空间大小的规律：
当数据大小为16字节的$n$倍时，段实际占有的大小也就是$n\times16$字节；而在数据大小不为16字节的$n$倍时，数据大小除以16字节后得到的整数部分为数据占满的16字节的行数，而剩下的最后一行并没有被占满，剩余的字节被0填充，也就是说，一个段所占空间，即为段数据大小除以16字节所得商向下取整后加1得到的值：
$$S=16Bytes\times(\lfloor{\frac{N}{16Bytes}}\rfloor+1)，S为段的实际占有空间，N为段中数据所占空间$$

- (3) 将下面的程序编译、连接，用Debug加载、跟踪，然后回答问题。

```asm
assume cs:code,ds:data,ss:stack
code segment
start:  mov ax,stack
    mov ss,ax
    mov sp,16
    mov ax,data
    mov ds,ax
    push ds:[0]
    push ds:[2]
    pop ds:[2]
    pop ds:[0]
    mov ax,4c00h
    int 21h
code ends
data segment
    dw 0123h,0456h
data ends
stack segment
    dw 0,0
stack ends
end start
```

这段代码和(2)中代码的区别就在于数据段和栈段的位置放在了代码段的后面，所以`DS`,`CS`,`SS`的寄存器内容会有所改变。

1. CPU执行程序，程序返回前，`data`段的数据为多少？
   `data`段的数据和定义时一样，没有变化：`23 01 56 04`。
2. CPU执行程序，程序返回前，CS=<code><u>0C3BH</u></code>，SS=<code><u>0C3FH</u></code>，DS=<code><u>0C3EH</u></code>。
3. 设程序加载后，`code`段的段地址为X，则`data`段的段地址为<code><u>X+3</u></code>，`stack`段的段地址为<code><u>X+4</u></code>。

- (4) 如果将(1)、(2)、(3)题中的最后一条伪指令`end start`改为`end`(也就是说不指明程序的入口)，则那个程序仍然可以正确执行？请说明原因。

之前已经提到，如果不指定程序的入口，那么位于真正代码段之前的数据也会被当作指令看待，因为`CS:IP`一开始只会指向整个程序的最开始位置。三段代码，只有(3)的数据段和栈段位于代码段的后面，所以三段代码都可以执行，但是真正正确执行的只有(3)，因为前两个由于没有指定程序入口，定义的数据相当于在程序中添加了额外的代码，逻辑上就不一定正确了。

- (5) 编写`code`段中的代码，将`a`段和`b`段数据依次相加，结果存入`c`段中。

```asm
assume cs:code
a segment
   db 1,2,3,4,5,6,7,8
a ends
b segment
   db 1,2,3,4,5,6,7,8
b ends
c segment
   db 0,0,0,0,0,0,0,0
c ends
code segment
start:
   
   ????????

   mov ax,4c00h
   int 21h
code ends
end start
```

这里有两种解决方案：设置三个段寄存器分别指向`a`,`b`,`c`段，然后设置一个寄存器用于存放偏移地址；设置两个段寄存器，一个固定指向`c`，另一个指向可变，而且使用一个临时的寄存器用于存放`a+b`的结果。
主要要注意**段寄存器的内容不能被直接改变，且`mov、add`等指令的两个对象的位数必须一致**。

这里我使用了第二种方案：

```asm
assume cs:code
a segment
    db 1,2,3,4,5,6,7,8
a ends
b segment
    db 1,2,3,4,5,6,7,8
b ends
c segment
    db 0,0,0,0,0,0,0,0
c ends
code segment
start: 
    mov ax,a      
    mov ds,ax        ;把a的起始地址传送给ds
    mov ax,c         
    mov es,ax        ;把c的起始地址传送给es
    mov bx,0         ;存储偏移地址
    mov cx,8         ;设置计数器
    mov dx,0         ;设置临时寄存器用于存储累加的结果
s:    
    mov dl,[bx]      ;先移动a中数据到dl（数据位匹配，所以使用dl）
    push ds          ;将ds的值压栈
    mov ax, b        
    mov ds, ax       ;把b的起始地址传送给ds
    add dl,[bx]      ;a和b中数据累加
    mov es:[bx],dl   ;将累加值存入c中
    inc bx           ;偏移地址自增一位
    pop ds           ;ds内容恢复至a的起始地址
    loop s         

    mov ax,4c00h
    int 21h
code ends
end start
```

- (6) 编写`code`段中代码，用push指令将`a`段中前8个字型数据逆序存储到`b`段中。

```asm
assume cs:code
a segment
   dw 1,2,3,4,5,6,7,8,9,0ah,0bh,0ch,0dh,0eh,0fh,0ffh
a ends
b segment
   dw 0,0,0,0,0,0,0,0
b ends
code segment
start:
    
    ????????

code ends
end start
```

这个挺简单，把`b`段当成栈，直接把`a`段数据压入即可。

```asm
assume cs:code
a segment
    dw 1,2,3,4,5,6,7,8,9,0ah,0bh, 0ch, 0dh, 0eh, 0fh, 0ffh
a ends
b segment
    dw 0,0,0,0,0,0,0,0
b ends
code segment
start:
    mov ax,a
    mov ds,ax
    mov ax,b
    mov ss,ax
    mov sp,16
    mov bx,0
    mov cx,8
s:
    push [bx]
    add bx,2
    loop s

    mov ax,4c00h
    int 21h
code ends
end start
```

# 第七章 更灵活的定位内存地址的方法

汇编语言中也可以像高级语言中一样，直接使用`and`和`or`指令来进行逐位的与运算和或运算。用法举例：

```asm
and al, 01100011B
or al, 00000001B
```

在定义数据的时候，除了给出数据的数值以外，还可以直接通过输入字符串定义数据，其用法是使用`''`将字符串包括起来：

```asm
data segment
	db 'Hello'
	db 'World'
data ends
```

综合上面两个用法，也就对应的可以针对字符串ASCII码的二进制表示，进行与或运算。

书上有个非常好的例子，即不使用条件块，直接通过与或运算进行字母的大小写转换。

> 可以找到大小写字母分别对应的ASCII码范围：大写41H～5AH（65～90）、小写61H～7AH（97～122）
>
> 通过16进制可以清晰的看到：大写字母对应二进制中，高4位的值只有两种情况`0100`和`0101`，而小写字母中高4位同样也只有两种情况`0110`和`0111`，大小写字母的差异在于第6位，所以只需要对第6位进行改变就可以实现改变大小写的操作，而不需要条件块。
>
> 示例程序：
>
> ```asm
> assume cs:code, ds:data
> data segment
> 	db 'Hello'
> 	db 'World'
> data ends
> 
> code segment
> start:
> 	mov ax, data
> 	mov ds, ax
> 	mov bx, 0
> 	mov cx, 5
> uppercase:
> 	mov al, [bx]
> 	mov ah, [bx+5]
> 	and al, 11011111B
> 	and ah, 11011111B
> 	mov [bx], al
> 	mov [bx+5], ah
> 	inc bx
> 	loop uppercase
> 	mov bx, 0
> 	mov cx, 5
> lowercase:
> 	mov al, [bx]
> 	mov ah, [bx+5]
> 	or al, 00100000B
> 	or ah, 00100000B
> 	mov [bx], al
> 	mov [bx+5], ah
> 	inc bx
> 	loop lowercase
> 	
> 	mov ax, 4c00h
> 	int 21h
> code ends
> end start
> ```
>
> 调试结果如下图：
>
> ![](https://hujiekang.top/images/uploads/big/ebf11b4f3b9dda8aece562cc1fa7f4c4.png)

然后学习了两个新的寄存器：`SI`和`DI`。查了一下，这两个寄存器属于变址寄存器，它们和`BX`的用法差不多，区别在于`SI`和`DI`只能够当成16位寄存器使用，不能够拆分成两个8位寄存器。

基于这两个寄存器，可以实现更加灵活的地址表示方式：

1. `[bx+常数]`：写法举例`[bx+5]`、`5[bx]`、`[bx].5`，意义相同
2. `[bx+si]`或`[bx+di]`：还可写成`[bx][si]`/`[bx][di]`
3. `[bx+si/di+常数]`

由上可发现其表示方法与高级语言的类似性：`a[i]`(高级语言)、`5[bx]`（汇编语言），也就是说，这些地址表示方式为高级语言中数组的实现提供了便利。

汇编语言中也可以实现嵌套循环。而循环计数器只有`CX`一个，所以进入内存循环时`CX`将被修改成内层循环的次数。为了保存外层循环的次数信息，需要在进入内层循环前，提前保存好`CX`寄存器的内容，然后再进入内层循环；当程序从内层循环退出后，再将`CX`的值还原。

保存`CX`的值有三种方法：

1. 保存到其他寄存器
2. 保存在一段内存空间中
3. 保存在栈里

上述三种方法，将`CX`保存在栈中是最好的做法。**一般来说，在需要暂存数据的时候，都应该使用栈。**

## 实验6 实践课程中的程序

- (1) 将课程中所有讲解过的程序上机调试，用Debug跟踪其执行过程，并在过程中进一步理解所讲内容。（略）

- (2) 编程，完成问题7.9中的程序。

  > 编程，将`datasg`段中每个单词的前4个字母改为大写字母。
  >
  > ```asm
  > assume cs:codesg, ss:stacksg, ds:datasg
  > 
  > stacksg segment
  > 	dw 0,0,0,0,0,0,0,0
  > stacksg ends
  > 
  > datasg segment
  > 	db '1. display      '
  > 	db '2. brows        '
  > 	db '3. replace      '
  > 	db '4. modify       '
  > datasg ends
  > 
  > codesg segment
  > start:
  > 	;code
  > codesg ends
  > 
  > end start
  > ```

  可以使用更加之前说到的更灵活的寻址方式以及双重循环来实现遍历，然后使用and、or指令来转换大小写，而栈则用来暂存`CX`。下面是`codesg`的代码：

  ```asm
  codesg segment
  start:
  	mov ax, stacksg
      mov ss, ax
      mov sp, 16
      mov ax, datasg
      mov ds, ax
      mov bx, 3
      mov cx, 4
  s0:
      push cx
      mov si, 0
      mov cx, 4
  s1:
      mov al, [bx+si]
      and al, 11011111b
      mov [bx+si], al
      inc si
      loop s1
  
      add bx, 16
      pop cx
      loop s0
  
      mov ax, 4c00h
      int 21h
  codesg ends
  ```

  程序运行截图：

  ![](https://hujiekang.top/images/uploads/big/dde9e036162ab59b10b0e8b83b58d4cf.png)



# 第八章 数据处理的两个基本问题

之前用到了寄存器`bx`,`si`,`di`，其实这三个寄存器外加寄存器`bp`都可以进行内存单元的寻址，也**只有**这四个寄存器可以进行内存单元的寻址，使用其他寄存器进行内存单元寻址都会报错。而且，使用这四个寄存器进行寻址的时候，它们要么单个出现，要么按照一定的组合出现：`bx`和`si`、`bx`和`di`、`bp`和`si`、`bp`和`di`。使用`[bx+bp]`或是`[si+di]`也是错误的。

除此之外，`bp`还和另外三个寄存器有所不同：若在`[]`中使用寄存器`bp`，且没有显式的给出段地址，那么段地址默认在**`ss`**中。

对之前的知识做一些总结：

在汇编指令中，指令中的数据可以在**寄存器、指令缓冲器和内存单元**中，如下表：

| 汇编指令      | 指令执行前数据的位置 | 对应表达         |
| :-----------: | :-----------: | :-----------: |
| `mov bx, [0]` | 内存单元`ds:[0]`     | 段地址、偏移地址 |
| `mov bx, ax`  | CPU内部的`ax`寄存器  | 寄存器           |
| `mov bx, 1`   | CPU内部的指令缓冲器  | 立即数(idata)    |

寻址方式总结：

| 寻址方式                  | 名称                    | 其他格式                                  |
| :-----------: | :-----------: | :-----------: |
| `idata`                   | 立即寻址                | N/A                                       |
| `[idata]`                 | 直接寻址                | N/A                                       |
| `[bx/bp/si/di]`           | 寄存器间接寻址          | N/A                                       |
| `[bx/bp/si/di + idata]`   | 寄存器相对寻址/基址寻址 | `[bx].idata`、`idata.[si]`、`[bx][idata]` |
| `[bx/bp + si/di]`         | 基址变址寻址            | `[bx][si]`                                |
| `[bx/bp + si/di + idata]` | 相对基址变址寻址        | `[bx].idata[si]`、`idata[bx][si]`         |

之前提到可以使用伪指令`db`、`dw`、`dd`来定义数据的长度，其实在某些指令中，也可以显式的指定要处理数据的长度，使用操作符`x ptr`，举例如下：

- `mov word ptr ds:[0], 1`表示指令访问的内存是一个字单元
- `mov byte ptr ds:[0], 1`表示指令访问的内存是一个字节单元

> 栈操作`push`、`pop`指令默认指定了访问字单元，所以再使用`x ptr`会报错。

使用`div`指令可以进行数据的除法。有以下两种情况：

1. 除数为8位，被除数为16位：被除数默认存储在`ax`中，计算得到的商存储在`al`，余数存储在`ah`；
2. 除数为16位，被除数为32位：被除数默认存储在`ax`和`dx`中，`dx`存放高16位，`ax`存放低16位。计算得到的商存储在`ax`，余数存储在`dx`。

对于除数，可以存储在内存单元或寄存器中。要使用`div`指令做除法时，只需要在指令中给出除数的位置，然后被除数放在`dx`和`ax`或`ax`中，就可以进行除法。

`div`指令**必须**使用`x ptr`运算符。

使用`dup`操作符可以进行数据的重复。具体用法：`db/dw/dd 重复次数 dup (重复的 字节/字/双字 数据)`

举例：定义一个200字节大小的栈段

```asm
; 不使用dup
stack segment
	dd 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
	dd 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
stack ends

; 使用dup
stack segment
	db 200 dup (0)
stack ends
```

## 实验7 寻址方式在结构化数据访问中的应用

下面的程序中，已经定义好了这些数据：

```asm
data segment
    db '1975','1976','1977','1978','1979','1980','1981'
    db '1982','1983','1984','1985','1986','1987','1988'
    db '1989','1990','1991','1992','1993','1994','1995'
    ; 表示21年的21个字符串
    
    dd 16,22,382,1356,2390,8000,16000
    dd 24486,50065,97479,140417,197514,345980,590827
    dd 803530,1183000,1843000,2759000,3753000,4649000,5937000
    ; 表示21年公司总收入的21个双字型数据
    
    dw 3,7,9,13,28,38,130
    dw 220,476,778,1001,1442,2258,2793
    dw 4037,5635,8226,11542,14430,15257,17800
    ; 表示21年公司雇员人数的21个字型数据
data ends 

table segment
    db 21 dup ('year summ ne ?? ')
table ends
```

编程，将`data`段中的数据按如下格式写入到`table`段中，并计算21年中的人均收入（取整），结果也按照下面的格式保存在`table`段中。

![](https://hujiekang.top/images/uploads/big/bda41050d4b438211a330c2f03b1d508.png)

这个题有两个思路：

首先把`data`想象成三个数组，`table`想象成一个结构体数组，那么第一个思路就是把`table`一行一行的填充；第二个思路就是把`table`按列来填充。我选择第一个方案，第二个类似，大体上是一样的。

首先观察数据格式，发现年份和收入两个数据的长度是一致的，都是4字节，然后雇员人数的数据长度是2字节。我一开始想着每一种数据给一个寄存器记录位置，但是发现寄存器好像8太够……

于是就用两个循环，先把年份和收入填入，再把雇员人数填入，同时计算平均收入。

三组数据的首地址分别为`0000h`、`0054h`、`00a8h`，所以可以直接用立即数来实现不同数组的读取。

```asm
assume cs:code, ds:data, ss:stack, es:table

data segment
    db '1975','1976','1977','1978','1979','1980','1981'
    db '1982','1983','1984','1985','1986','1987','1988'
    db '1989','1990','1991','1992','1993','1994','1995'
    
    dd 16,22,382,1356,2390,8000,16000
    dd 24486,50065,97479,140417,197514,345980,590827
    dd 803530,1183000,1843000,2759000,3753000,4649000,5937000
    
    dw 3,7,9,13,28,38,130
    dw 220,476,778,1001,1442,2258,2793
    dw 4037,5635,8226,11542,14430,15257,17800
data ends 

table segment
    db 21 dup ('year summ ne ?? ')
table ends

stack segment
    dd 0,0,0,0
stack ends

code segment
start:
    mov ax, data
    mov ds, ax
    mov ax, stack
    mov ss, ax
    mov sp, 0010h
    mov ax, table
    mov es, ax
    mov bx, 0000h
    mov si, 0000h
    mov di, 0000h
    mov cx, 0015h               ; 数据初始化
s0:
    push cx
    mov cx, 0002h
s1:
    mov ax, ds:[si][bx]
    mov es:[di][bx], ax
    mov ax, ds:[si+0054h][bx]
    mov es:[di][bx+0005h], ax   ; 处理前两组数据，双字型分两次处理
    add bx, 0002h
    loop s1

    mov bx, 0000h
    add si, 0004h               ; si di自增4
    add di, 0010h
    pop cx
    loop s0

    mov si, 00a8h               ; 前两组数据处理完毕，开始处理后面两组数据
    mov di, 0000h
    mov cx, 0015h
s3:
    mov ax, ds:[si]
    mov es:[di][000ah], ax      ; 雇员人数
    mov ax, es:[di][0005h]
    mov dx, es:[di][0007h]
    div word ptr es:[di][000ah] 
    mov es:[di][000dh], ax      ; 平均收入
    add si, 0002h
    add di, 0010h
    loop s3

    mov ax, 4c00h
    int 21h
code ends
end start
```

贴一个截图(后面的数字是以16进制直接存储的，所以不能以ASCII码显示出来)：

![](https://hujiekang.top/images/uploads/big/c1e46e09023c635a9153499c4d7cc0ce.png)

# 第九章 转移指令的原理

这一章介绍了几种不同的转移指令及对应的原理。**可以修改`IP`，或同时修改`CS`和`IP`的指令统称为转移指令**。

操作符`offset`用于取得某标号的偏移地址。举例如下：

```asm
assume cs:codesg
codesg segment
start:
	mov ax, offset start      ; 相当于mov ax, 0
s:
	mov ax, offset s          ; 相当于mov ax, 3
codesg ends
end start
```

下表对这一章中提到的转移指令和对应的功能进行了总结：

| 指令                         | 转移类型         | 修改寄存器 | 转移方式                                           | 功能                                                         |
| ---------------------------- | ---------------- | ---------- | -------------------------------------------------- | ------------------------------------------------------------ |
| `jmp short 标号`             | 段内短转移       | IP         | 指令中包含位移量                                   | (IP)+=8位位移                                                |
| `jmp near ptr 标号`          | 段内近转移       | IP         | 指令中包含位移量                                   | (IP)+=16位位移                                               |
| `jmp far ptr 标号`           | 段间转移/远转移  | CS、IP     | 指令中包含转移的段地址和偏移地址                   | (CS)=标号所在段的段地址<br>(IP)=标号在段中的偏移地址         |
| `jmp 16位寄存器`             | 段内转移         | IP         | 指令中包含存有偏移地址的寄存器                     | (IP)=寄存器内容                                              |
| `jmp word ptr 内存单元地址`  | 段内转移         | IP         | 指令中包含存有偏移地址的内存单元（字型）           | (IP)=内存单元内容                                            |
| `jmp dword ptr 内存单元地址` | 段间转移         | CS、IP     | 指令中包含存有段地址和偏移地址的内存单元（双字型） | (CS)=内存单元高位内容<br>(IP)=内存单元低位内容               |
| `jcxz 标号`                  | 条件转移、短转移 | IP         | 指令中包含位移量                                   | 当CX=0时转移，等价于<br>`if (cx == 0) jmp short 标号;`       |
| `loop 标号`                  | 短转移           | IP         | 指令中包含位移量                                   | 自减CX，当CX!=0时转移，等价于<br/>`cx--;`<br>`if (cx != 0) jmp short 标号;` |


> - 短转移和近转移的机器码中仅包含位移量，**不包含具体地址**；
> - 转移指令不得越界，否则将报错；
> - 短转移范围：-128 - 127，近转移范围：-32768 - 32767，均用**补码**表示；
> - **所有的循环指令和条件转移指令都是短转移**，在机器码中包含转移的位移；
> - 短转移/近转移的位移量由编译程序在编译时算出。

## 实验8 分析一个奇怪的程序

分析下面的程序，在运行前思考：这个程序可以正确返回吗？

```asm
assueme cs:codesg
codesg segment
        mov ax,4c00h
        int 21h
start:  mov ax,0
    s:  nop
        nop

        mov di,offset s
        mov si,offset s2
        mov ax,cs:[si]
        mov cs:[di],ax

    s0: jmp short s

    s1: mov ax,0
        int 21h
        mov ax,0

    s2: jmp short s1
        nop
codesg ends
end start
```

可以正确返回，具体分析如下：

首先将`ax`赋值为0，然后进入代码段`s`，`s`段的作用就是将`s2`段中的`jmp`指令复制到`s`段中的两个`nop`的位置上。随后执行`s0`段，通过`jmp`指令转移到`s`段开始执行。

但是`jmp short xxx`指令中是没有具体地址的，而是通过位移量来进行转移，那么复制到`s`段中的指令其实也不是转移到`s1`段，具体转移到哪里要看代码中的位移量，下面是Debug中给出的`jmp short s1`对应的机器码：

![](https://hujiekang.top/images/uploads/big/80cf31adf65436a47da0be43d275fec0.png)

可以看见对应的机器码为`EBF6`，即偏移的位移量为补码`F6`，对应数字`-10`。

将其放入`s`段，从`jmp`指令的下一个字节开始向前数`10`个字节，刚好位于整个代码段的开始位置，Debug中显示指令为`jmp 0000`：

![](https://hujiekang.top/images/uploads/big/100dc610063df85bb93a423477f7aaf9.png)

也就是说，执行了`s`段的`jmp`指令之后，会转移到代码段最开始的`mov ax, 4c00h`的位置，刚好是正确返回的标志，所以可以正确返回。

## 实验9 根据材料编程

编程，在屏幕中间分别显示绿色、绿底红色、白底蓝色的字符串`welcome to masm!`，编程所需知识从下面的材料获得：

![](https://hujiekang.top/images/uploads/big/0e83a628f858598263138eb91be85cee.png)

这个挺简单的，直接上代码：

```asm
assume cs:code, ds:data, ss:stack
stack segment
    dw 8 dup (0)    ; 定义栈
stack ends
data segment
    db 'welcome to masm!'    ; 定义字符串
    db 00000010b, 00100100b, 01110001b    ; 定义字符颜色属性
data ends
code segment
start:
    mov ax, data    ; 初始化寄存器
    mov ds, ax
    mov ax, stack
    mov ss, ax
    mov sp, 10h
    mov ax, 0b800h
    mov es, ax    ; es定位至显示缓冲区
    mov si, 0    ; si指向字符串
    mov di, 10h    ; di指向字符颜色属性
    mov bx, 0
    mov cx, 3h    ; 共显示3行
s0:
    push cx
    mov cx, 10h    ; 每行16个字符
s1:
    mov al, ds:[si]    ; 低位存放ASCII码
    mov ah, ds:[di]    ; 高位存放颜色属性
    ; 移入缓冲区，25x80的正中央，共3行，故上下各空出11行，左右各空出32个字符
    mov es:[720h+bx], ax
    add bx, 2h    ; 移动至下一个字符的位置
    inc si
    loop s1

    add bx, 0080h    ; 移动至下一行
    mov si, 0    ; 从头开始读取字符串
    inc di    ; 读取下一个颜色属性
    pop cx
    loop s0

    mov ax, 4c00h
    int 21h
code ends
end start
```

程序运行结果如下：

![](https://hujiekang.top/images/uploads/big/fe12ec317763227e24fb91ce8ce35e21.png)

<!--

# 第十章 `CALL`和`RET`指令

-->