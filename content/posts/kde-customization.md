---
title: KDE终极美化指南
date: 2022-06-02 00:14:27
categories:
  - Tutorials
---



# 前言

近期在电脑上装了Windows+Linux双系统，日常学习和轻度办公类方面的东西都主要在Linux上进行，需要打游戏或者要用到Adobe全家桶等只有Windows才能干的事情的时候才切到Windows上去。用了也有大几个月了，Linux已经完全能够满足我的需求，包括编程、影音播放、Office文档处理、远程控制、IM软件等等在Linux上都已经拥有了较好的支持，用作主力系统完全不存在问题。既然都用作主力系统了，桌面一定得整的让自己看着舒服，于是就有了这篇文章。

<!-- more -->

桌面环境的选择上，选择了性能表现好、可自定义性高而且很好看的KDE。同样使用过国产的一些桌面环境（DDE、UKUI等），个人觉得国产桌面更偏向于给小白使用，可自定义的程度不够高，但界面也足够好看。还有其他桌面环境，如GNOME、Xfce，这些纯属是用腻了，而且同样是自定义程度不够高。

需要说明的是，本文的美化都是在Arch Linux下最新版本的KDE下进行的，老版本KDE可能部分功能存在差异（比如我用过的Kubuntu 20.04，KDE直接比同期的Arch Linux差一个大版本，不少功能都是缺失的）。先上两张效果图：

![](https://pic.hujiekang.top/uploads/big/f4d5f08678b1286261c58d5ba495a43e.png)

![](https://pic.hujiekang.top/uploads/big/d11f5969a8182b85cb87a04ca7d6e712.png)

KDE桌面环境拥有其自己的[主题商店](https://store.kde.org/)，包含了全局主题、图标包、小组件、配色方案等所有可自定义部分的主题资源。因为KDE主题商店网站在国内的速度属实不咋地而且还经常掉线，个人最推荐通过`ocs-url`来进行安装，能够直接通过浏览器来捕获下载文件的信息，并自动根据组件类型将主题包解包至指定的位置，基本上即装即用。当然除此之外，一些热门的主题资源也包含在了Arch Linux的AUR仓库中，可以直接通过yay安装。

Arch Linux系列可以通过yay直接安装`ocs-url`：

```bash
yay -S ocs-url
```

如果通过浏览器直接下载提示网络问题无法下载，还可以通过命令行代理，从命令行来启动`ocs-url`，使用方法即`ocs-url [OCS URL]`，对应的主题包URL（以`ocs://`开头）可以在主题组件下载页通过浏览器开发者工具抓取到：

![](https://pic.hujiekang.top/uploads/big/37ac8d4bbd726d42ed8ac22892788866.png)

# 桌面主题的更换

KDE中一个比较完整的全局主题包含以下三个部分：

1. 全局主题：包含了整体的配色风格、Plasma视觉风格、窗口样式、界面配色方案，有的还带有一套图标以及鼠标指针
2. Kvantum主题：Kvantum是一个基于Qt的主题引擎，能够修改应用程序风格（窗口的毛玻璃背景就是通过这个搞定的），若一些全局主题支持背景的毛玻璃特效通常都会建议安装其对应的Kvamtum主题。通过`yay -S kvantum`可以安装Kvantum Manager。
3. 其他：如欢迎屏幕的主题、Sddm主题、Konsole配色方案主题等。

全局主题我选择的是类Win10配色的[We10XOS-dark](https://store.kde.org/p/1368860)，曾经用过的[Layan](https://store.kde.org/p/1325243)主题也很好看。安装起来没啥技术含量，随后在设置里更换全局主题，并将应用程序风格设置为kvantum，这样Kvantum主题才能正常工作。

再打开Kvantum Manager即可以应用Kvantum主题，配置页面也可以对主题进行更进一步的个性化设置。在这里有一个小坑，若系统开启了缩放比例，需要在配置主题中将禁用非整数比例的半透明取消勾选（默认是勾选了的），否则无论怎么弄毛玻璃都没法生效。

<img src="https://pic.hujiekang.top/uploads/big/c9f609174bbfec58817d1b1eaa0a35a9.png" style="zoom:75%;" />

窗口样式上，个人更喜欢[breeze-blurred](https://aur.archlinux.org/packages/breeze-blurred-git)，是基于KDE默认的微风窗口样式魔改的，添加了毛玻璃的特效，与Kvantum设置的毛玻璃相结合，即可以实现整个窗口的无缝毛玻璃。举个例子，Konsole的无缝毛玻璃，只需要让Konsole配色方案的第一个背景色和系统颜色方案中的“活动标题栏”颜色一致，再让breeze-blurred的透明度和Konsole的背景透明度一致即可。

这些修改完成后，整个系统的界面效果已经很舒服了，这里我还更换了图标为[Fluent Icon Theme](https://store.kde.org/p/1477945)，搭配毛玻璃效果很不错。下一步是通过一些桌面组件来使得整个桌面的功能更完善，用起来更方便。

# 一些实用的桌面小组件

- [Latte Dock](https://archlinux.org/packages/community/x86_64/latte-dock/)：基本上是Linux上Dock栏的最优选了，功能相当强大，同样支持自定义的主题；
- [Tiled Menu](https://store.kde.org/p/1160672/)：一个模仿Windows 10磁贴样式的开始菜单。
- [Awesome Widgets](https://www.pling.com/p/998913)：一个简约的小组件集合，可以自定义将系统的状态信息展示在桌面上，里头修改的是HTML，所以也比较灵活。另一个替代品是Netspeed Widget，当然功能没有这个强大；
- [Panon](https://www.pling.com/p/1326546)：音频可视化组件，有一些默认样式，主题商店同样有其他人设计的样式（就是比较少），推荐[这个样式](https://www.pling.com/p/1748771)，放在桌面上很好看；
- [Clear Clock](https://www.pling.com/p/1666554)：一个放在桌面的时间组件；
- 全局菜单：系统自带的组件，将当前应用程序的菜单显示在任务栏上，搭配[Application title](https://www.pling.com/p/1199712/)可以实现类似macOS那样的顶栏，但其实不少应用都没有对应的菜单支持，相对鸡肋；
- 拾色器：这个是系统自带的，用于在屏幕上选取颜色，选完了可以复制其RGB值和Hex表示。

# 其他部分的优化

- KDE默认是单击打开文件或文件夹的，可以设置 工作区行为 常规行为 点击文件或文件夹时 为选中它们，这样就变成双击了；
- 工作区行为 桌面特效部分里面也有一些可以调节的选项，包括各种窗口动画等；
- 输入法可以使用fcitx5，Arch Linux上的使用体验应该是目前最佳的，推荐一个毛玻璃主题：<https://github.com/Reverier-Xu/FluentDark-fcitx5>。
