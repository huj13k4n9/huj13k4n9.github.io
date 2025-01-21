---
title: Windows Terminal美化
date: 2019-11-27 14:14:15
categories:
  - Tutorials
---

Windows Terminal是微软新发布的一款Terminal产品（以下称WT）。对比之前传统的`cmd`和`Powershell`来说，WT对定制的支持更好，同时又支持GPU对页面的渲染、emoji表情、多标签等的特点。其项目地址为：[https://github.com/microsoft/terminal](https://github.com/microsoft/terminal)。

由于WT的可定制化非常之高，只需要很简单的步骤就可以调节各种界面元素以及操作习惯，所以把它打造成最适合自己的Windows终端程序是完全做得到的。

![](https://hujiekang.top/images/uploads/big/dd1b349437a75f62865844324420660b.png)

<!-- more -->

下面主要分为两个部分来美化WT：

## 安装<code style="font-size:20px">oh-my-posh</code>（类似于Linux上的<code style="font-size:20px">oh-my-zsh</code>）

1. 安装`scoop`

   首先在`Powershell`中输入以下代码来保证允许本地脚本的执行：
   ```bash
   set-executionpolicy remotesigned -scope currentuser
   ```

   然后就可以脚本安装`scoop`了：
   ```bash
   iex (new-object net.webclient).downloadstring('https://get.scoop.sh')
   ```

2. 更换`Powerline`字体

   `Powerline`字体有很多种，这里使用了`Fira Code`，项目地址为[https://github.com/tonsky/FiraCode](https://github.com/tonsky/FiraCode)，下载后安装在电脑上即可，其他字体可自行搜索。

   安装在电脑上之后，只需要在WT的配置文件`profiles.json`中修改显示字体就可以了，这个下面会讲到。

3. 安装`choco`

   ```bash
   Set-ExecutionPolicy Bypass -Scope Process -Force; iex ((New-Object System.Net.WebClient).DownloadString('https://chocolatey.org/install.ps1'))
   ```

4. 安装`ConEmu`

   ```bash
   choco install ConEmu
   ```

5. 安装 `posh-git`、`oh-my-posh` 和 `Get-ChildItemColor`

   前两个是`oh-my-posh`的必备组件，最后一个是美化`ls`命令的显示效果的插件，可以选装。
   ```bash
   Install-Module posh-git -Scope CurrentUser
   Install-Module oh-my-posh -Scope CurrentUser
   Install-Module Get-ChildItemColor -Scope CurrentUser
   ```

6. 设置 `Powershell` 的 `profile`

   ```bash
   if (!(Test-Path -Path $PROFILE )) { New-Item -Type File -Path $PROFILE -Force }
   ```

7. 打开`$PROFILE`文件并粘贴以下内容

   ```bash
   Import-Module posh-git
   Import-Module oh-my-posh
   Import-Module Get-ChildItemColor
   Set-Theme Paradox
   # Chocolatey profile
   $ChocolateyProfile = "$env:ChocolateyInstall\helpers\chocolateyProfile.psm1"
   if (Test-Path($ChocolateyProfile)) {
     Import-Module "$ChocolateyProfile"
   }
   ```

至此，`oh-my-posh`的安装就完成了，打开WT的效果如下：

![](https://hujiekang.top/images/uploads/big/1982b4fd2020beecc269ee8290d45195.png)

在其他教程中有看到使用`ColorTool`进行配色方案的修改，但是经尝试后发现只能一次性的修改，关闭后再打开还是原来的配色，项目里的issue中给出的解决方案也并没有解决问题。于是找到了另一种更改配色的解决方案，不需要依赖其他程序，在下文中会介绍到。

## 定制profiles.json（新版好像叫settings.json了）

关于配置文件的修改，[官方文档](https://github.com/microsoft/terminal/blob/master/doc/cascadia/SettingsSchema.md)提供了很详细的介绍，下面仅介绍常用部分。

全局选项中，`initialCols`和`initialRows`用于设置初始窗口大小，`defaultProfile`用于设置打开WT时默认启动什么终端程序，值是对应程序的guid。关于guid，这玩意大概的用途就是唯一标识程序，只要不和配置中其他的程序一样就可以，亲测可以自己乱写......
`keybindings`的值是一组数据，用于存储快捷键。如果要自定义快捷键，可以以这种形式添加进去：

```json
{
    "command": "copy",
    "keys": ["ctrl+shift+c"]
}
```
其余的一些选项都可以字面理解，就不做过多介绍。

在`profiles`的选项中，就可以单独为不同程序进行自定义设置了。

首先是毛玻璃效果，这个需要调节两个参数，第一个是把`useAcrylic`设置为`true`，这是必须的，第二个`acrylicOpacity`则是调节毛玻璃的透明度，取值范围为0-1，0为完全透明，1为完全不透明。

设置字体使用的是`fontFace`属性，只需要把字体名称填入进去就可以了。如果没有这个字体，则自动替换成`Consolas`。除此之外还可以调节字体大小，使用的是`fontSize`属性。

`background`属性可以设置背景颜色，`backgroundImage`则可以设置背景图片。注意：`backgroundImage`在毛玻璃特效打开时不起作用。

`cursorColor`用于设置闪动的光标颜色，`cursorShape`则可以调节光标的样式。

`commandLine`属性的值为命令行程序的路径，如`cmd`的路径为`cmd.exe`，Git Bash的路径为`/Git/bin/bash.exe`等等。对应的也可以设置程序的图标和标题名，对应属性为`icon`和`name`。

关于`colorScheme`属性，这个属性用于修改配色方案，默认的有五种，可以在`schemes`中找到。当然也可以自己定义新的配色方案，同样也是在`schemes`中添加。更多的配色方案可以在这里找到：[https://github.com/mbadolato/iTerm2-Color-Schemes/tree/master/windowsterminal](https://github.com/mbadolato/iTerm2-Color-Schemes/tree/master/windowsterminal)

更新：新版里面加入了标签页自定义颜色的选项，对应项为`tabColor`

这一波下来就算是大功告成了。贴一张图：

![](https://hujiekang.top/images/uploads/big/a4c9101dc4b26b5d8d3429ebd35a29c5.png)

## 将WT添加至右键菜单

更新：新版本的Windows已经默认安装了WT并且配置好了右键菜单，具体啥版本不清楚

将下列代码复制保存为`.reg`注册表文件（图标路径可以自行修改，WT的路径中用户名可能会不同也需要修改），然后双击导入注册表即可。

注意：在WT的设置文件中，需设置所有`startingDirectory`属性为`./`或`null`，才能实现启动时所在目录为对应的目录。

```
Windows Registry Editor Version 5.00

[HKEY_CLASSES_ROOT\Directory\Background\shell\wt]
@="Windows Terminal here (&T)"
"Icon"="C:\\Users\\Admin\\Pictures\\terminal.ico"

[HKEY_CLASSES_ROOT\Directory\Background\shell\wt\command]
@="C:\\Users\\Admin\\AppData\\Local\\Microsoft\\WindowsApps\\wt.exe"
```

效果图：

![](https://hujiekang.top/images/uploads/big/c0330d6bdfbced6831c96fdb995f59c1.png)

图标自取：

![](https://o.hujiekang.top/downloads/f5bed12bd7dde3097ba040db5dc8034a.ico)

## 添加管理员权限启动

很多时候需要用到管理员权限的Shell，但是Windows Terminal似乎并没有这个选项，所以还是只能通过系统自带的入口来启动，就很丑

然后我发现了一个可以模拟Linux中sudo命令的软件gsudo：[gerardog/gsudo: A Sudo for Windows](https://github.com/gerardog/gsudo/)

安装很简单，一条命令即可：

```powershell
Set-ExecutionPolicy RemoteSigned -scope Process; iwr -useb https://raw.githubusercontent.com/gerardog/gsudo/master/installgsudo.ps1 | iex
```

安装时会提示是否启用sudo作为gsudo的别名，根据个人喜好选择即可。

然后在profiles.json中新建一个项，对应命令为`"gsudo安装路径/gsudo.exe powershell.exe"`（PowerShell）`gsudo安装路径/gsudo.exe cmd.exe`（CMD）

## 一些Tricks

### 复古终端效果

先上效果图：

![](https://hujiekang.top/images/uploads/big/7958300f98c52de2651b848a2bd1d6d1.png)

要实现这个效果，只需要启用一个选项，并配置好一个主题：

```json
// Tab的配置里面添加如下选项
"experimental.retroTerminalEffect": true

// Retro主题
{
    "name": "Retro",
    "background": "#000000",
    "black": "#00ff00",
    "blue": "#00ff00",
    "brightBlack": "#00ff00",
    "brightBlue": "#00ff00",
    "brightCyan": "#00ff00",
    "brightGreen": "#00ff00",
    "brightPurple": "#00ff00",
    "brightRed": "#00ff00",
    "brightWhite": "#00ff00",
    "brightYellow": "#00ff00",
    "cyan": "#00ff00",
    "foreground": "#00ff00",
    "green": "#00ff00",
    "purple": "#00ff00",
    "red": "#00ff00",
    "white": "#00ff00",
    "yellow": "#00ff00"
}

// 设置主题为Retro
"colorScheme": "Retro"
```

当然如果想要更逼真，还可以找个复古字体：[The Ultimate Oldschool PC Font Pack](https://int10h.org/oldschool-pc-fonts/)

### 自定义图标保存位置

自定义图标若是保存在本地，很容易因为误删而丢失，且若重装系统后又要重新下载图标重新配置十分麻烦，所以为了搜索一个更好的解决方案，我在官方Github的issue下面看见了一个解决办法（找不到在哪了）——将icon保存在OneDrive里面。

有一个特殊的环境变量叫做`%OneDriveConsumer%`，通过这个路径可以直接指向你的OneDrive位置，所以只需要在其后面添加文件名即可实现图标的设置，不需要再去记住绝对地址了，方便了不少。举个例子：`"icon": "%OneDriveConsumer%/Ubuntu.png"`

## 参考链接

1. [https://blog.csdn.net/Jioho_chen/article/details/100624029](https://blog.csdn.net/Jioho_chen/article/details/100624029)
2. [https://www.jianshu.com/p/4b2b7074d9e2](https://www.jianshu.com/p/4b2b7074d9e2)
3. [https://www.cnblogs.com/enjoy233/p/simple_guide_to_beautify_powershells_in_Windows_Terminal.html](https://www.cnblogs.com/enjoy233/p/simple_guide_to_beautify_powershells_in_Windows_Terminal.html)
4. [https://www.jianshu.com/p/e24b62762a9a](https://www.jianshu.com/p/e24b62762a9a)
5. <https://devblogs.microsoft.com/commandline/windows-terminal-tips-and-tricks/>
