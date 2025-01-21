---
title: Git初探
date: 2020-02-16 13:19:58
categories:
  - Web
---

昨天花了两个小时，把[廖雪峰老师的Git教程](https://www.liaoxuefeng.com/wiki/896043488029600)看了一遍，然后再根据网上的一些资料，对Git的一些概念和常用命令做一个归纳。

# Git是什么？

[Git](https://git-scm.com/)是一个开源的分布式版本管理系统，由Linux之父Linus开发。相比于其他集中式版本管理系统（如SVN、CVS）将整个项目的抓取和提交过程集中在一台中心服务器中，Git中对项目提交修改的每一个开发者都具有一套完整的项目版本库，中心服务器也不再是项目开发的必须项（为了方便提交，很多时候依然会为Git设置中心服务器），开发者在本地对项目进行修改和开发，并将修改提交给其他开发者，其他开发者也各自将自己做的修改提交给其他人，这样就实现了实时的版本管理和修改提交。

常见的应用了Git的网站有[Github](https://github.com)、[Gitee](https://gitee.com)、[Gitlab](https://about.gitlab.com/)等，它们为开源项目提供免费的Git存储，开发团队可以使用它们来实现版本管理和团队协作。

<!-- more -->

# 一些概念

## 仓库 / 版本库（Repository）
仓库指的是受版本控制管理的文件目录，该目录下的所有文件都受Git的管理，能够查询变更、删除等记录。

## 工作区（Working tree）
工作区中包含了仓库的工作文件。开发者对工作区的文件进行修改和增删，使用`git add`命令将修改添加至暂存区，然后使用`git commit`命令将暂存区的修改提交至仓库。

## 暂存区（Staging area, 又称Index）
暂存区是工作区用来提交更改（commit）前可以暂存工作区的变化。使用`git add`命令将修改添加至暂存区。

上面三者之间的联系：
```code
[工作区]  >>git add>>  [暂存区]  >>git commit>>  [仓库]
```

## 头（HEAD）
头是一个象征性的参考，最常用以指向当前选择的分支，同时头也可以指向某个特定的版本。

## 签出（Checkout）
从仓库中将文件的最新修订版本复制到工作空间。使用`git checkout`命令，既可以指定特定的版本，也可以指定`HEAD`指针所在的版本。

## 分支（Branch）
从主线上分离开的副本，通常对项目的不同功能、不同情况下的开发，需要创建对应的不同的分支。默认分支叫`master`。

## 标记（Tags）
标记指的是某个分支某个特定时间点的状态。通过标记，可以很方便的切换到标记时的状态，也可以使用标记来标识某个版本。

# 常见命令

- `git init [directory]`：在目录`directory`生成一个Git仓库（`--bare`参数用于创建一个裸仓库）
- `git add <filename> ...`：添加文件，并将修改提交到暂存区
- `git rm <filename> ...`：删除文件，并将修改提交到暂存区
- `git commit -m <massage>`：将暂存区的修改提交到仓库（`git commit --allow-empty-message -m ''`用于不带message的提交，但不推荐使用）
- `git status`：查看当前状态
- `git diff <filename>`：查看当前工作区中文件和暂存区中对应文件的区别
- `git diff HEAD -- <filename>`：查看当前工作区中文件和仓库中对应文件的区别
- `git log`：查看提交历史（`--pretty=oneline`参数用于美化显示为每条记录一行、`--graph`参数使数据以图表形式展示）
- `git reflog`：查看命令历史
- `git reset`：回退到之前的某个版本（将HEAD指针指向某个版本，之后的所有版本都被删除）（`--hard`参数同时会清除暂存区和工作区的修改）
  用法：`git reset 0f4a`（版本对应的SHA1值）、`git reset HEAD^`（相对位置）、`git reset master~3`（数字表示的相对位置）后面可加文件名仅回退指定文件。
  `git reset HEAD <filename>`：撤销暂存区的修改至工作区
- `git revert -n <commit>`：撤销某一版本对当前版本的修改，并基于此生成一个新的版本（具体和`git reset`的区别参见[这篇文章](https://blog.csdn.net/yxlshk/article/details/79944535)）
- `git restore --staged <filename>`：撤销暂存区的修改至工作区
- `git checkout -- <filename>`：撤销工作区某文件的修改
- `git restore <filename>`：撤销工作区某文件的修改
- `git checkout <branch>`：切换到特定的分支（`-b`参数表示创建后切换）
- `git switch <branch>`：切换到特定的分支
- `git remote add <name> <url>`：添加一个名为name的远程仓库
- `git push <name> <branch>`：将本地仓库的数据推送到远程仓库上（`-u`用于建立上游引用，将远程仓库和本地仓库关联起来）
- `git pull`：从远程仓库抓取数据
- `git clone <url>`：从远程仓库克隆数据至本地
- `git branch`：查看所有分支
- `git branch <branch>`：创建一个分支
- `git branch -d <branch>`：删除一个分支（`-D`强制删除）
- `git switch -c <branch>`：创建一个分支并切换至该分支
- `git merge`：以`Fast-Forward`模式合并分支（`--no-ff`参数用于禁用`Fast-Forward`模式，两者的区别如下图）
  ![](https://pic.hujiekang.top/uploads/big/5fa76ef7b288bc9d1c92d6ded21cbc55.png)
- `git stash`：储存当时工作目录的状态（保护现场）
- `git stash list`：查看所有的stash内容
- `git stash apply <stash>`：恢复某个stash（stash内容保留）
- `git stash drop <stash>`：删除某个stash
- `git stash pop <stash>`：恢复某个stash并删除
- `git cherry-pick <commit>`：应用某些现有提交引入的更改
- `git rebase`：8太懂，贴一个链接慢慢琢磨<https://www.jianshu.com/p/f7ed3dd0d2d8>
- `git tag <tagname>`：用于新建一个标签，默认为HEAD，也可指定一个commit id
- `git tag -a <tagname> -m <message>`：指定标签信息
- `git tag -d <tagname>`：删除一个本地标签
- `git tag`：查看所有标签
- `git show <tagname>`：查看某个标签的信息
- `git push origin <tagname>`：推送一个本地标签至远程仓库
- `git push origin --tags`：推送所有未推送过的本地标签至远程仓库
- `git push origin :refs/tags/<tagname>`：删除一个远程标签
- `git config --global user.name "Your Name"`、`git config --global user.email "email@example.com"`设置全局的用户名和邮箱
- `git config --global alias.<alias> <command>`：为命令定制别名
- 使用`.gitignore`文件来忽略某些特殊文件的提交<https://github.com/github/gitignore>；`git add -f`来强制提交被忽略的文件
- 全局配置文件路径：`/.git/config`；当前用户配置文件路径：`~/.gitconfig`

# 参考资料

1. [Git分支模型](https://blog.csdn.net/ShuSheng0007/article/details/80791849)
2. [A successful Git branching model](https://nvie.com/posts/a-successful-git-branching-model/)
3. [Git Documentation](https://git-scm.com/docs/git-tag)
4. [Git教程 - 廖雪峰的官方网站](https://www.liaoxuefeng.com/wiki/896043488029600)
5. [Learn Git Branching](https://learngitbranching.js.org/)
6. [CS Visualized: Useful Git Commands](https://dev.to/lydiahallie/cs-visualized-useful-git-commands-37p1)
7. [CS Visualized: Useful Git Commands（中文版）](https://mp.weixin.qq.com/s?__biz=MzAxOTcxNTIwNQ==&mid=2457919169&idx=2&sn=7514209811adbd09b6161093e8ae3eb4)
