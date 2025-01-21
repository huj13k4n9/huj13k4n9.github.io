---
title: CTFd平台搭建记录
date: 2020-04-26 11:45:21
categories:
  - Tutorials
---

最近搭建了一个CTFd平台，花了差不多一个星期叭（虽然最后发现在一个小问题上卡了好久），用CTFd-Whale实现了独立题目容器，记录一下安装过程，避免以后再踩坑。

部署用的是最简单的Docker+Docker Compose部署，系统环境Ubuntu 18.04。

官方项目地址：<https://github.com/CTFd/CTFd>

<!-- more -->

# Docker与Docker Compose安装

Docker使用阿里云镜像源安装：

1. 卸载老版本Docker：

   ```bash
   sudo apt-get remove docker docker-engine docker.io containerd runc
   ```

2. 更新软件

   ```bash
   sudo apt-get update
   ```

3. 安装必备软件包

   ```bash
   sudo apt-get install apt-transport-https ca-certificates curl gnupg-agent software-properties-common
   ```

4. 添加GPG密钥

   ```bash
   curl -fsSL http://mirrors.aliyun.com/docker-ce/linux/ubuntu/gpg | sudo apt-key add -
   ```

5. 查看密钥是否添加成功

   ```bash
   sudo apt-key fingerprint 0EBFCD88
   ```

   若添加成功，则将显示如下信息：

   ![](https://pic.hujiekang.top/uploads/big/100de9bf933b83620ccbfcfb9da329d2.png)

6. 添加阿里云的软件源

   ```
   sudo add-apt-repository "deb [arch=amd64] http://mirrors.aliyun.com/docker-ce/linux/ubuntu $(lsb_release -cs) stable"
   ```

   若添加成功，则在`/etc/apt/sources.list`中可看见类似如下的记录：

   `deb [arch=amd64] http://mirrors.aliyun.com/docker-ce/linux/ubuntu bionic stable`

7. 再次更新软件

   ```bash
   sudo apt-get update
   ```

8. 安装最新版的docker-ce

   ```bash
   sudo apt-get install docker-ce docker-ce-cli containerd.io
   ```

   安装完毕之后，通过`docker --version`来验证安装是否成功：

   ![](https://pic.hujiekang.top/uploads/big/bbdd287fc77a316f10f8e52c39c47da9.png)

9. 启动Docker服务并设置为开机启动

   ```bash
   sudo systemctl start docker
   sudo systemctl enable docker
   ```

10. 然后为Docker添加镜像加速，防止`docker pull`速度过慢

    修改`/etc/docker/daemon.json`文件（若不存在则自行创建），加入如下内容：

    ```json
    {
      "registry-mirrors": ["你的加速地址"]
    }
    ```

    里面更换为想要的镜像地址即可。下面有几个可选项：

    - 阿里云容器镜像服务（使用自己的阿里云账户申请）：<https://cr.console.aliyun.com/#/accelerator>
    - DaoCloud：<https://www.daocloud.io/mirror>
    - 网易：<https://hub-mirror.c.163.com/>

    修改文件后，执行命令重启docker服务：

    ```bash
    sudo systemctl daemon-reload
    sudo systemctl restart docker
    ```

接下来是安装Docker Compose。官方给的是从GitHub下载安装，依然速度很慢，所以采用DaoCloud的镜像源来安装。

1. 下载docker-compose

   ```bash
   curl -L https://get.daocloud.io/docker/compose/releases/download/1.25.5/docker-compose-`uname -s`-`uname -m` > /usr/local/bin/docker-compose
   ```

2. 为其添加可执行权限

   ```bash
   sudo chmod +x /usr/local/bin/docker-compose
   ```

   使用`docker-compose --version`验证安装：

   ![](https://pic.hujiekang.top/uploads/big/5343f8893310644d336b9011120b39c2.png)

# 安装配置CTFd和CTFd-Whale

> 配置过程包含CTFd-Whale的配置，若不需要配置CTFd-Whale，请移步官方教程。

1. 启用Docker Swarm，并为生成的Manager节点取一个别名

   ```bash
   docker swarm init  # 初始化
   docker node ls  # 查看节点ID
   docker node update --label-add name=linux-1 <节点 ID>  # 添加别名
   ```

2. 下载赵师傅的CTFd源码

   **（更新：后续仓库有更新，使用下面的方法可能出错，本文使用的版本为`9d8981a9808078a0634b13e61190cec4556782e4`）**

   ```bash
   git clone -b single https://github.com/glzjin/CTFd.git
   ```

3. 配置Frp Token，下载CTFd-Whale插件

   ```bash
   cd CTFd
   vi frp/frps.ini
   vi frp/frpc.ini  # token 一定要随机，两个文件的token相同
   git submodule update --init  # 初始化CTFd-Whale插件
   ```

4. （可选）修改CTFd平台运行端口

   打开`docker-compose.yml`，修改CTFd容器的端口信息：

   ```yaml
   ctfd:
       build: .
       user: root
       restart: always
       ports:
         - "80:8000"  # 意为将外部机器的80端口映射至CTFd容器的8000端口，只需修改前者即可
   ```

5. `docker-compose up -d`部署容器，部署完毕后就可以用`http://ip:指定的端口`访问CTFd进行设置。

## 邮箱配置

首先需要在Accounts里面启用Verify Emails：

![](https://pic.hujiekang.top/uploads/big/d1e8969daeef57af4d90d407a6f744a0.png)

然后在Email里面设置SMTP信息：（以QQ邮箱为例，其余邮箱类似）

![](https://pic.hujiekang.top/uploads/medium/4e75ce3fc9494fccce511117dfd406c4.png)

## 配置CTFd-Whale

> （本次配置中踩的最大的坑）下面提到的所有端口，都需要在**云服务器安全组+系统内防火墙**中开放！！！否则Frp API将无法访问，Frp客户端也无法连接上服务端！！！

|                      配置项                      |                        对应值                         |
| :----------------------------------------------: | :---------------------------------------------------: |
|                  Docker API URL                  |              unix://var/run/docker.sock               |
|                    Frp API IP                    |                       172.1.0.3                       |
|                   Frp API Port                   |                         7400                          |
|              Frp Http Domain Suffix              |                         None                          |
|                  Frp Http Port                   |                          80                           |
|              Frp Direct IP Address               |                   填入服务器公网IP                    |
|             Frp Direct Minimum Port              |                         28000                         |
|             Frp Direct Maximum Port              |                   容器最大的端口值                    |
|               Max Container Count                |                   最大允许容器数量                    |
|                Max Renewal Times                 |                   最大允许更新次数                    |
|               Frp config template                |                  填入frpc.ini的内容                   |
|          Docker Auto Connect Containers          |       ctfd_frpc_1（即docker里面frpc容器的名称）       |
|           Docker Auto Connect Network            | ctfd_frp_containers（即承载开启的题目容器的网络名称） |
|                Docker Dns Setting                |                       可有可无                        |
|                Docker Swarm Nodes                |                 填入一开始修改的别名                  |
|      Docker Multi-Container Network Subnet       |                     173.0.0.0/16                      |
| Docker Multi-Container Network Subnet New Prefix |                          24                           |
|             Docker Container Timeout             |              容器的存活时间（单位：秒）               |

填好之后点击Update更新数据，然后可以创建一个题目尝试是否生效：

- Challenge Type选dynamic_docker
- Docker Image填入要部署的题目镜像（可以直接是DockerHub上面的镜像）
- Frp Redirect Type：若有域名则选择HTTP，否则选Direct
- Frp Redirect Port：映射到容器中的端口

其余项按照普通的题目创建方式填写或使用默认值即可。

创建完成后在题目详情页预览题目，点击`Launch an Instance`即可部署一个靶机容器：

![](https://pic.hujiekang.top/uploads/big/f796979034493af8c7585204853bac0f.png)

## 报错情况总结

1. frpc容器频繁重启/自动退出

   具体表现为`docker ps -a`总是显示`Exited`或`Restarting`，可能是frpc容器无法连接frps，需要检查两者的连接，比如说我当时是没开放防火墙的对应端口。。。

2. Docker容器无法启动

   这个是在别的帖子里面看到的，自己没碰到过，检测方法如下：

   确保Docker API URL填写正确，如示例中为`unix://var/run/docker.sock`。你也可以使用端口形式的api如[官方示例](https://success.docker.com/article/how-do-i-enable-the-remote-api-for-dockerd)：可以用IP：端口指定API 然后使用如下命令进入CTFd容器，手动调用端口测试

   ```bash
   docker exec -it <ctfd容器的ID> /bin/sh
   /opt/CTFd# python

   >>>import docker
   >>>client=docker.DockerClient(base_url="unix:///var/run/docker.sock")
   >>>client.images.list()
   ```

   如果API正确会列出所有镜像。

3. frp端口无法映射

   可以使用如下命令进入ctfd容器，手动调用端口测试。若返回200则表示成功，否则可能会出现Connection Refused、Unreachable或者Timeout的情况，通常就是frpc容器无法连接到frps导致的，同样要检查两者的连接。

   ```bash
   docker exec -it <ctfd容器的ID> /bin/sh
   /opt/CTFd# python

   >>>import requests
   >>>requests.get("http://172.22.0.2:7400/api/reload")
   <Response [200]> #这个表示成功
   ```

4. CTFd网页无法访问

   这个原因就不一定了，我碰到的一种情况就是在之前`docker-compose.yml`中修改Ports将两个端口全都修改了，解决办法就是只需要修改外部机器的那个端口，映射至CTFd容器的始终是8000端口。

最后附一个防火墙开放端口的方法：

```bash
# Ubuntu
sudo ufw status  # 查看防火墙状态
sudo ufw allow xxx:yyy/udp  # 允许开放一个范围内的UDP端口
sudo ufw allow xxx:yyy/tcp  # 允许开放一个范围内的TCP端口
sudo ufw allow xxx  # 允许开放单个端口
# allow改成deny表示拒绝端口的访问

# CentOS
firewall-cmd --zone=public --add-port=xxx-yyy/tcp --permanent  # 允许开放一个范围内的TCP端口
```

# 参考资料

> - [CTFd-Whale 推荐部署实践 - 赵](https://www.zhaoj.in/read-6333.html)
> - [手把手教你如何建立一个支持ctf动态独立靶机的靶场](https://juejin.im/post/5dc5811ff265da4d02626e3c)
> - [ubuntu16.04安装docker和docker compose（使用阿里云镜像源安装）](https://www.jianshu.com/p/482d1eb4d9a2)
> - [Install Docker Engine | Docker Documentation](https://docs.docker.com/engine/install/)

