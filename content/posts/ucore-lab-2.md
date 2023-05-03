---
title: UCORE Lab 2
date: 2022-12-02 22:53:21
categories:
  - OS
---

# UCORE的段页式内存布局

从UCORE启动到物理内存管理的初始化结束，一共加载了3次GDT，实现了由单纯的分段到段页式内存管理的布局。

在内核链接脚本中，内核的加载地址由Lab1中的`0x100000`改为了`0xC0100000`：

```c
OUTPUT_FORMAT("elf32-i386", "elf32-i386", "elf32-i386")
OUTPUT_ARCH(i386)
ENTRY(kern_entry)

SECTIONS {
    /* Load the kernel at this address: "." means the current address */
    . = 0xC0100000;
		
		......
}
```

<!-- more -->

根据文档里提到的，这个地址为虚拟地址，后续通过分段和分页来映射到物理地址，实际内核还是放在`0x100000`的物理地址开始的。这个从`bootmain`函数中可以看得出来，在加载ELF段的时候对`va`进行了与操作，去除了地址中的高8位数据，也就是把`C0`给抹除了：

```c
// load each program segment (ignores ph flags)
ph = (struct proghdr *)((uintptr_t)ELFHDR + ELFHDR->e_phoff);
eph = ph + ELFHDR->e_phnum;
for (; ph < eph; ph ++) {
    readseg(ph->p_va & 0xFFFFFF, ph->p_memsz, ph->p_offset);
}

// call the entry point from the ELF header
// note: does not return
((void (*)(void))(ELFHDR->e_entry & 0xFFFFFF))();
```

## 1 - 准备进入内核代码

在boot/bootasm.S中，对GDT进行了第一次设置：

```nasm
gdt:
    SEG_NULLASM                               # null seg
    SEG_ASM(STA_X|STA_R, 0x0, 0xffffffff)     # code seg for bootloader and kernel
    SEG_ASM(STA_W, 0x0, 0xffffffff)           # data seg for bootloader and kernel
```

此时的内核段基址都为0，说明此时虚拟地址和物理地址是完全一致的，对虚拟地址的访问等同于直接访问到对应的物理内存单元。此时的内核代码和数据也是在`0x100000`开始的地址范围。

## 2 - 开始设置分页

在进入到内核代码执行之后，在kern/init/init.S中完成了对GDT的第二次设置，此时内核段拥有了一个基址，所有的虚拟地址对应的需要加上对应的基址之后才等于物理地址。

```nasm
#define KERNBASE            0xC0000000

__gdt:
    SEG_NULL
    SEG_ASM(STA_X | STA_R, - KERNBASE, 0xFFFFFFFF)      # code segment
    SEG_ASM(STA_W, - KERNBASE, 0xFFFFFFFF)              # data segment
```

如上所示，此时内核段的基址为`- KERNBASE`，也就是`0x40000000`。此次加载了GDT之后，内核链接脚本中的`0xC0100000`地址开始派上用场。

```nasm
kern_entry:
    # reload temperate gdt (second time) to remap all physical memory
    # virtual_addr 0~4G=linear_addr&physical_addr -KERNBASE~4G-KERNBASE 
    lgdt REALLOC(__gdtdesc)
    movl $KERNEL_DS, %eax
    movw %ax, %ds
    movw %ax, %es
    movw %ax, %ss

    ljmp $KERNEL_CS, $relocated
```

很容易理解最后一行的`ljmp`指令，最终跳转的虚拟地址为`0xC01xxxxx`，加上此时的基址`0x40000000`，最终访问的物理地址就是`0x1xxxxx`（高位产生了溢出，因此地址回卷到开头），对应到的就是内核加载的物理地址，这里通过分段，就把预先设计好的内核虚拟地址空间和对应的物理地址进行了正确的映射。

## 3 - 内核内存区域分页映射完成

在kern/mm/pmm.c中的`pmm_init()`中对分页数据结构初始化完毕之后，下面这一行对内核的虚拟基址和物理地址0开始的地址空间进行了一一映射。具体实现就是将页目录表中对应的页表项，将其对应页框的地址一一设置完毕：

```c
// map all physical memory to linear memory with base linear addr KERNBASE
//linear_addr KERNBASE~KERNBASE+KMEMSIZE = phy_addr 0~KMEMSIZE
//But shouldn't use this map until enable_paging() & gdt_init() finished.
boot_map_segment(boot_pgdir, KERNBASE, KMEMSIZE, 0, PTE_W);

static void
boot_map_segment(pde_t *pgdir, uintptr_t la, size_t size, uintptr_t pa, uint32_t perm) {
    assert(PGOFF(la) == PGOFF(pa));
    size_t n = ROUNDUP(size + PGOFF(la), PGSIZE) / PGSIZE;
    la = ROUNDDOWN(la, PGSIZE);
    pa = ROUNDDOWN(pa, PGSIZE);
    for (; n > 0; n --, la += PGSIZE, pa += PGSIZE) {
        pte_t *ptep = get_pte(pgdir, la, 1);
        assert(ptep != NULL);
        *ptep = pa | PTE_P | perm;
    }
}
```

这一步完成了之后，此时从`KERNBASE`开始的`KMEMSIZE`大小的内存页都被映射到从物理地址0开始的同等大小的地址。随后，下面这行代码，将页目录表的第一项赋值了内核基址的物理地址：

```c
//temporary map: 
//virtual_addr 3G~3G+4M = linear_addr 0~4M = linear_addr 3G~3G+4M = phy_addr 0~4M     
boot_pgdir[0] = boot_pgdir[PDX(KERNBASE)];
```

这一操作使得此时内存中0-4M的物理地址与0-4M的线性地址完全等同，相当于0-4M的物理地址有两个Reference，分别是线性地址的0-4M和3G-3G+4M。这一步的意义何在呢？先继续向下看。

随后是通过修改CR0的一些位和重新加载CR3的页目录表物理地址来开启分页，并且第三次（也是最后一次）加载GDT。

```c
enable_paging();
gdt_init();

static void
enable_paging(void) {
    lcr3(boot_cr3);

    // turn on paging
    uint32_t cr0 = rcr0();
    cr0 |= CR0_PE | CR0_PG | CR0_AM | CR0_WP | CR0_NE | CR0_TS | CR0_EM | CR0_MP;
    cr0 &= ~(CR0_TS | CR0_EM);
    lcr0(cr0);
}

/* gdt_init - initialize the default GDT and TSS */
static void
gdt_init(void) {
    // set boot kernel stack and default SS0
    load_esp0((uintptr_t)bootstacktop);
    ts.ts_ss0 = KERNEL_DS;

    // initialize the TSS filed of the gdt
    gdt[SEG_TSS] = SEGTSS(STS_T32A, (uintptr_t)&ts, sizeof(ts), DPL_KERNEL);

    // reload all segment registers
    lgdt(&gdt_pd);

    // load the TSS
    ltr(GD_TSS);
}
```

下面分析`boot_pgdir[0] = boot_pgdir[PDX(KERNBASE)];`这行代码的作用。尝试注释这一行后编译执行，在GDB中会发现在设置CR0的这一条指令中产生异常（对应的现象是内核一运行到这就重启）：

![](https://hujiekang.top/images/uploads/big/2f058f76c3885c121d6891c176238276.png)

抓了一下QEMU的终端Log（参数`-d int -D <logfile>`），发现是产生了缺页中断，具体信息如下：

```c
check_exception old: 0xffffffff new 0xe
     0: v=0e e=0000 i=0 cpl=0 IP=0008:c010506e pc=0010506e SP=0010:c011ff78 CR2=0010506e
```

通过此时的分段地址映射很容易发现问题所在。开启分页之后，对于一个虚拟地址，首先是根据分段机制来去到对应的线性地址，再根据页目录表中的地址进行翻译和转换最终得到物理地址。因为开启分页是在加载GDT之前的，所以此时的内核段基址还是`0x40000000`，所以以Log中的地址`0xc010506e`为例，通过分段机制可以得到线性地址`0x0010506e`；

拿到了线性地址之后，再通过页目录表去查找对应的页表。线性地址页表对应页目录项为线性地址的高10位，对这个地址而言也就是`0x0`；查找页目录的第0项，由于没有那行代码的赋值，页目录表的第0项就是0，也就意味着该页表不存在。

所以通过这个地址无法索引到对应的物理页，也自然没法取数据了。进一步查看内核反编译代码，发现这个地址`0x0010506e`，就是设置CR0指令的后面一条指令，也就意味着在开启分页后，后面的代码数据因为没有页映射无法被找到并执行，于是抛出异常。

```c
c010506b:	0f 22 c0             	mov    %eax,%cr0
    lcr0(cr0);
c010506e:	c9                   	leave  
c010506f:	c3                   	ret
```

通过上面的分析，发现设置页目录表的第0项的映射是对UCORE抛弃分段机制进而顺利转向分页机制的一个过渡手段，使得在设置分页之后，CPU仍然可以继续读取接下来的代码和数据顺利向下执行。

当然如文档中所述，只设置一个页目录项相当于把内核的大小限制在了3M（加载地址`0x100000`），若内核大于这个大小则需要设置更多的页目录项映射。

分页机制开启之后，立马开始设置GDT。此时的GDT：

```c
static struct segdesc gdt[] = {
    SEG_NULL,
    [SEG_KTEXT] = SEG(STA_X | STA_R, 0x0, 0xFFFFFFFF, DPL_KERNEL),
    [SEG_KDATA] = SEG(STA_W, 0x0, 0xFFFFFFFF, DPL_KERNEL),
    [SEG_UTEXT] = SEG(STA_X | STA_R, 0x0, 0xFFFFFFFF, DPL_USER),
    [SEG_UDATA] = SEG(STA_W, 0x0, 0xFFFFFFFF, DPL_USER),
    [SEG_TSS]   = SEG_NULL,
};
```

可见内核段和用户段的基址都被设置为了0，也就意味着此时分段不再对虚拟地址进行转换，直接交由分页机制进行处理。

## 参考

- [段页式管理基本概念](https://chyyuu.gitbooks.io/ucore_os_docs/content/lab2/lab2_3_3_5_1_segment_and_paging.html)
- [x86的分页机制和Linux实现](https://zhuanlan.zhihu.com/p/327860921)

# Ex.1 - Fi**rst-Fit内存分配算法**

First-Fit算法是一个连续内存分配算法，所有的空闲内存块按内存地址大小被组织进一个链表中。对每次内存分配请求，算法会将其搜索到的第一个符合条件的内存块，划分其对应空间用于此次分配。

- 对于单次分配，从空闲内存块链表头部开始遍历，检测每个内存块大小是否能够满足分配的大小。若符合要求，则从该块的头部开始划分指定的空间用于分配；否则继续搜索。若找不到符合要求的内存块则分配失败。
- 对于单次内存释放，需要根据要释放的内存地址来确定将该内存块插入到空闲链表的哪个位置（确保内存地址从小到大排列）。其次，还需要考虑要释放的内存块是否可以与其他空闲块合并。

UCORE中定义了空闲内存页管理的数据结构：

```c
/* free_area_t - maintains a doubly linked list to record free (unused) pages */
typedef struct {
    list_entry_t free_list;         // the list header
    unsigned int nr_free;           // # of free pages in this free list
} free_area_t;
```

在内核完成了对内存空间的探测以及对空闲内存空间的确定之后，就需要初始化这些空闲的内存空间，使得其可被分配（默认所有的内存页属性都是为内核保留的）。

kern/mm/memlayout.h中有对单个内存页数据结构的描述：

```c
struct Page {
    int ref;                        // page frame's reference counter
    uint32_t flags;                 // array of flags that describe the status of the page frame
    unsigned int property;          // the num of free block, used in first fit pm manager
    list_entry_t page_link;         // free list link
};

/* Flags describing the status of a page frame */
#define PG_reserved                 0       // if this bit=1: the Page is reserved for kernel, cannot be used in alloc/free_pages; otherwise, this bit=0 
#define PG_property                 1       // if this bit=1: the Page is the head page of a free memory block(contains some continuous_addrress pages), and can be used in alloc_pages; if this bit=0: if the Page is the the head page of a free memory block, then this Page and the memory block is alloced. Or this Page isn't the head page.
```

页结构有两个flag位：

- `PG_reserved`：表示页是否被内核保留。若该位为1，则对应页不可被分配，反之则可被标记；
- `PG_property`：
    - 若该位为1，则说明对应页是一个空闲块的头部页，该块可被分配；
    - 若该位为0，且该页是内存块的头部，说明整块内存已被分配；其他非头部的内存页该位均为0。

## 空闲块初始化

在kern/mm/pmm.c中的`page_init()`中，对系统内存大小探测完成后，下面这个循环对每个可用的空闲空间进行初始化：

```c
for (i = 0; i < memmap->nr_map; i ++) {
    uint64_t begin = memmap->map[i].addr, end = begin + memmap->map[i].size;
    // Memory block isn't reserved
		if (memmap->map[i].type == E820_ARM) {
        if (begin < freemem) {
            begin = freemem;
        }
        if (end > KMEMSIZE) {
            end = KMEMSIZE;
        }
        if (begin < end) {
            begin = ROUNDUP(begin, PGSIZE);
            end = ROUNDDOWN(end, PGSIZE);
            if (begin < end) {
                init_memmap(pa2page(begin), (end - begin) / PGSIZE);
            }
        }
    }
}
```

调用的`init_memmap()`函数对应kern/mm/default_pmm.c中的`default_init_memmap()`，函数主要进行了以下操作：

- 将整个空闲空间（长度为`n`）初始化为一整个空闲块，并加入空闲块链表：
    - 所有页去除`PG_Reserved`位，所有非头部页面去除`PG_Property`位；
    - 所有页的引用计数设置为0；
    - 头部页的`property`属性值设置为空闲块的页面数，其余页面该属性值为0。
- 总空闲页面计数增加`n`。

![](https://hujiekang.top/images/uploads/big/a5877d9b49699664533b1bfcf7021e67.png)

```c
static void
default_init_memmap(struct Page *base, size_t n) {    
    // n must be a positive number
    assert(n > 0);

    struct Page *ptr = base;
    for (; ptr < base + n; ptr++) {
        assert(PageReserved(ptr));
        // clear flags
        ClearPageProperty(ptr);
        ClearPageReserved(ptr);
        // no reference
        set_page_ref(ptr, 0);
        ptr->property = 0;
    }
    // set bit and property of the first page
    SetPageProperty(base);
    base->property = n;
    
    nr_free += n;
    list_add(&free_list, &(base->page_link));
}
```

## 内存块的分配

在进行内存块的分配时，需要从空闲链表表头开始遍历（也就是从低地址到高地址），寻找到第一个符合分配大小条件的内存块，从其头部开始划分空间用于分配使用，剩余的空闲块则重新插入链表中。

![](https://hujiekang.top/images/uploads/big/f83231b277a4dfeb25ceff0d5d438494.png)

```c
static struct Page *
default_alloc_pages(size_t n) {
		// check if the size n is legal
    assert(n > 0);
    if (n > nr_free) {
        return NULL;
    }
    struct Page *p = NULL;
    list_entry_t *le = &free_list;
    while ((le = list_next(le)) != &free_list) {
        p = le2page(le, page_link);
				// find the first block that can allocate n pages
        if (p->property >= n) {
            goto can_alloc;
        }
    }
    return NULL;
can_alloc:
    if (p != NULL) {
        list_entry_t *tmp = list_next(&(p->page_link));
        // adjust the free block list
        list_del(&(p->page_link));
        if (p->property > n) {
            // set head page of the new free block
            SetPageProperty(p + n);
            (p + n)->property = p->property - n;
            list_add_before(tmp, &((p+n)->page_link));
        }
        // set bits of the allocated pages
        ClearPageProperty(p);
        p->property -= n; 
        nr_free -= n;
    }
    return p;
}
```

## 内存块的释放

内存块的释放，即将指定的内存块设置为空闲，并按地址大小将其重新归位到空闲链表中的指定位置。需要考虑以下几种情况：

1. 该块与任何已有空闲块都不邻接：直接按地址大小插入；
2. 该块与某个空闲块的尾部邻接：直接修改对应空闲块页面数量即可；
3. 该块与某个空闲块的头部邻接：将对应空闲块从链表中删除，修改要释放内存块头部页的页面数量，将其重新插入链表；
4. 该块同时与两个块邻接：直接修改尾部邻接的空闲块的页面数量即可。

![](https://hujiekang.top/images/uploads/big/407e1ebd4c25751666f8a749485bc9fe.png)

其中2、3、4属于特殊情况，在遍历空闲链表的时候首先判断这三种情况。若三种情况都无法满足，根据一般情况，判断要释放块与空闲块的地址大小来确定插入位置。如果无法找到地址比要释放块大的空闲块，直接将其插入链表末尾。

```c
static void
default_free_pages(struct Page *base, size_t n) {
    assert(n > 0);
    struct Page *ptr = base, *next = NULL;
    for (; ptr < base + n; ptr++) {
        // reset all pages that needs to be free
        assert(!PageReserved(ptr) && !PageProperty(ptr));
        ClearPageProperty(ptr);
        ClearPageReserved(ptr);
        set_page_ref(ptr, 0);
    }
    // reset head page of the block
    base->property = n;
    SetPageProperty(base);
    // check if this block can be merged with another block
    list_entry_t *le = &free_list, *tmp = NULL;
    while ((le = list_next(le)) != &free_list) {
        ptr = le2page(le, page_link);
        if (ptr + ptr->property == base) {
            // merge after this block
            ptr->property += base->property;
            ClearPageProperty(base);
            // check if next block can also be merged
            tmp = list_next(&(ptr->page_link));
            next = le2page(tmp, page_link);
            if (tmp != &free_list && base + base->property == next) {
                ptr->property += next->property;
                ClearPageProperty(next);
                list_del(tmp);
            }
            goto done;
        } else if (base + base->property == ptr) {
            // merge before this block
            base->property += ptr->property;
            ClearPageProperty(ptr);
            // need to set up free_list
            tmp = list_next(&(ptr->page_link));
            list_del(&(ptr->page_link));
            list_add_before(tmp, &(base->page_link));
            goto done;
        } else if (ptr > base) {
            tmp = list_prev(&(ptr->page_link));
            // addr boundary check
            if (tmp == &free_list || tmp < ptr) {
                // independent block donot need to merge, just simply insert
                list_add_before(&(ptr->page_link), &(base->page_link));
                goto done;
            }
        }
    }
    // this block cannot be merged with any free blocks, and it has the biggest addr
    // then insert to the end of the list
    list_add_before(&free_list, &(base->page_link));
done:
    nr_free += n;
}
```

# Ex.2 - 寻找虚拟地址对应页表项

实现寻找虚拟地址对应的页表项。`get_pte()`函数的功能就是对于给定的逻辑地址，返回其对应页表项存放的地址。

基本逻辑：检查对应地址的页目录项是否存在，若存在则直接返回对应页表项地址，不存在则先为页表分配一个页，再返回分配的页中对应页表项地址。对于新分配的页，还需要设置页的属性，如引用计数，内存置0。（注释写的很清晰了）

```c
pte_t *
get_pte(pde_t *pgdir, uintptr_t la, bool create) {
    pde_t *pdep = &pgdir[PDX(la)];                    // (1) find page directory entry
    if (!(*pdep & PTE_P)) {                           // (2) check if entry is not present
        struct Page *p = NULL;
        if (!create || (p = alloc_page()) == NULL) {  // (3) check if creating is needed, then alloc page for page table
            return NULL;
        }
        set_page_ref(p, 1);                           // (4) set page reference
        uintptr_t pa = page2pa(p);                    // (5) get linear address of page
        memset(KADDR(pa), 0, PGSIZE);                 // (6) clear page content using memset
        *pdep = pa | PTE_P | PTE_W | PTE_U;           // (7) set page directory entry's permission
    }
    return KADDR(                                     // (8) return page table entry
        &((pte_t *)PDE_ADDR(*pdep))[PTX(la)]
    );
}
```

# Ex.3 - 取消二级页表项的映射

释放某虚地址所在的页并取消对应二级页表项的映射。`get_remove_pte()`函数即`get_pte()`的逆过程。对于给定的PTE，从页表中删除该项。最后还需刷新TLB以同步页表的更新。

基本逻辑：找到页表项对应的页地址，转换为对应页管理数据结构，将其引用计数减1。若之后该页的引用计数为0，则直接释放该页。

```c
static inline void
page_remove_pte(pde_t *pgdir, uintptr_t la, pte_t *ptep) {
    if (*ptep & PTE_P) {                      // (1) check if this page table entry is present
        struct Page *page = pte2page(*ptep);  // (2) find corresponding page to pte
        page_ref_dec(page);                   // (3) decrease page reference
        if (page->ref == 0) {                 // (4) and free this page when page reference reachs 0
            free_page(page);
        }
        *ptep = 0;                            // (5) clear second page table entry
        tlb_invalidate(pgdir, la);            // (6) flush tlb
    }
}
```

# Chal.1 - Buddy System分配算法

// TODO

# Chal.2 - SLUB分配算法

// TODO