---
title: Tor+Redsocks+iptables实现透明代理
date: 2021-04-15 22:28:45
categories:
  - Pentest
---

透明代理的意思是：**客户端根本不需要知道有代理服务器的存在**，只需要配置好网络即可实现代理功能，其经常用于渗透测试中，作用除去本文提到的Tor隐藏IP之外，还可以用于内网渗透，使得主机如同真正处于内网之中一样，使我们的渗透更加方便顺利。

本文的目标场景：一台主机作为网关，在该主机上搭建Tor服务并做好流量转发，实现所有以该主机网关的机器均可以直接访问Tor（不需要任何代理设置）。

由于Tor本质上是个SOCKS代理，所以理论上本文的内容对于所有的SOCKS代理均适用。

<!-- more -->

## Tor的安装&配置

安装Tor：

```shell
# CentOS
sudo yum install epel-release
sudo yum install tor

# Ubuntu, Kali
sudo apt install tor
```

修改Tor配置文件`/etc/tor/torrc`：

```shell
# 定义Tor监听的SOCKS端口
SOCKSPort 9050

# 屏蔽五眼联盟国家节点
ExcludeNodes {fr}
ExcludeExitNodes {us},{au},{ca},{nz},{gb},{fr}
```

启动Tor服务并设置为开机启动：

```shell
sudo systemctl start tor
sudo systemctl enable tor
```

## Redsocks的安装&配置

仓库：[GitHub - darkk/redsocks: transparent TCP-to-proxy redirector](https://github.com/darkk/redsocks)

```shell
sudo yum install libevent-devel git gcc   # 安装依赖
git clone darkk/redsocks
cd redsocks
make    # 编译源代码
cp redsocks/redsocks /sbin   # 放置在任意包含在环境变量的路径中即可，便于后续输入命令
```

创建配置文件`/etc/redsocks.conf`，填入配置（默认配置文件位于`redsocks/redsocks.conf.example`）：

```c++
base {
      	log_debug = off;
        log_info = on;
        log = stderr;
        daemon = off;
        redirector = iptables;
}
redsocks {
	local_ip = 0.0.0.0;   // 使用0.0.0.0即可允许其他主机流量进入，使用127.0.0.1只能本机流量进入
	local_port = 50080;   // Redsocks监听端口

	ip = 127.0.0.1;
	port = 9050;    // 填写Tor监听端口

	type = socks5;
    // 可选 自定义登录用户名和密码
	// login = "username";
	// password = "password";
}
```

使用`redsocks -c /etc/redsocks.conf`启动程序，也可以为其创建一个Systemd服务来使其可以开机自启。

创建文件`/usr/lib/systemd/system/redsocks.service`，内容如下：

```ini
[Unit]
Description=Redsocks Service

[Service]
Type=simple
ExecStart=/usr/sbin/redsocks -c /etc/redsocks.conf
Restart=on-failure
RestartSec=1

[Install]
WantedBy = multi-user.target
```

然后使用`systemctl`启动并设置开机自启：

```bash
sudo systemctl start redsocks
sudo systemctl enable redsocks
```

## Iptables规则的设置

注：CentOS 8中使用`firewall-cmd`取代了`iptables`，使得两者会产生冲突，所以务必先将`firewall-cmd`对应的服务`firewalld`关闭再进行操作。

```shell
# 清空nat链以便后续操作
iptables -t nat -F

# 创建新链REDSOCKS
iptables -t nat -N REDSOCKS -m comment --comment "Add new chain for redsocks"

# 本地网络地址放行不进行转发
iptables -t nat -A REDSOCKS -d 0.0.0.0/8 -j RETURN -m comment --comment "Skip for Intranet"
iptables -t nat -A REDSOCKS -d 10.0.0.0/8 -j RETURN -m comment --comment "Skip for Intranet"
iptables -t nat -A REDSOCKS -d 127.0.0.0/8 -j RETURN -m comment --comment "Skip for Intranet"
iptables -t nat -A REDSOCKS -d 169.254.0.0/16 -j RETURN -m comment --comment "Skip for Intranet"
iptables -t nat -A REDSOCKS -d 172.16.0.0/12 -j RETURN -m comment --comment "Skip for Intranet"
iptables -t nat -A REDSOCKS -d 192.168.0.0/16 -j RETURN -m comment --comment "Skip for Intranet"
iptables -t nat -A REDSOCKS -d 224.0.0.0/4 -j RETURN -m comment --comment "Skip for Intranet"
iptables -t nat -A REDSOCKS -d 240.0.0.0/4 -j RETURN -m comment --comment "Skip for Intranet"

# 将REDSOCKS链上的流量全部转发至Redsocks监听的端口
iptables -t nat -A REDSOCKS -p tcp -j REDIRECT --to-ports 50080 -m comment --comment "Redirect traffic to tor"

# 将Tor流量不进行转发（若全部流量都进行转发则Tor将无法正常运行）
# 使用UID进行流量的过滤，查看Tor进程的启动用户： ps -ef | grep tor
iptables -t nat -A OUTPUT -p tcp -m owner \! --uid-owner $(id -u toranon) -j REDSOCKS
# iptables -t nat -A OUTPUT -p tcp -j REDSOCKS -m comment --comment "From OUTPUT jump to REDSOCKS"

# 路由前的数据包也全部跳转到REDSOCKS链
iptables -t nat -A PREROUTING -p tcp -j REDSOCKS -m comment --comment "From PREROUTING jump to REDSOCKS"

# 设置域名白名单
whitelist_domains=("baidu.com" "zhihu.com" "csdn.net" "cnblogs.com")
for e in ${whitelist_domains[@]}
do
    iptables -t nat -I REDSOCKS -j RETURN -d $e -m comment --comment 'Whitelist domain: '"$e"
done
```

将上述命令保存为脚本，以root运行即可。

临时关闭/开启命令：

```shell
# 临时关闭
iptables -t nat -j RETURN -I REDSOCKS

# 重新开启
iptables -t nat -j RETURN -D REDSOCKS

# 查看Iptables链状态
iptables -t nat -nvL --line-number
```

## DNSCrypt搭建本地DNS服务器

参考教程[DNSCrypt简明教程](https://zhuanlan.zhihu.com/p/89498877)即可。（搭建完成后需要将网关机的系统DNS服务器修改为127.0.0.1）

## 测试是否成功

任意需要访问Tor服务的主机，将网关设置为该主机的IP地址即可，然后访问https://check.torproject.org，成功截图如下：

![](https://pic.hujiekang.top/uploads/big/86cd9082a22ff807d7ea564fd2189bbc.png)

## 参考资料

> - [GitHub - k0a1a/tor-router.sh](https://github.com/k0a1a/tor-router.sh/blob/master/tor-router.sh)
> - [Linux下 redsocks + iptables + socks5 实现全局代理](https://www.cnblogs.com/develon/p/11830726.html)
> - [Centos 7 下配置 redsocks 代理](https://zhuanlan.zhihu.com/p/80942720)
> - [How to install and configure Redsocks on Centos Linux](https://crosp.net/blog/administration/install-configure-redsocks-proxy-centos-linux)
> - [Linux透明代理在红队渗透中的应用](https://payloads.online/archivers/2020-11-13/1)

