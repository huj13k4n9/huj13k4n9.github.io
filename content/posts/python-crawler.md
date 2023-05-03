---
title: Python爬虫学习总结
date: 2019-09-27 2:20:13
categories:
  - Summary
tags:
  - Scraping
  - Python
---

# 网络爬虫的流程和原理

整个网络爬虫的流程可以分为如下的三个步骤：

![](https://hujiekang.top/images/uploads/big/695becf10683920bbce3536cf8f19779.png)

整个爬虫的过程都可以使用 Python（本文使用 Python 3）来完成，每个步骤使用的模块大致如下：
- 获取网页：`requests`、`urllib`、`selenium`（模拟浏览器）
- 解析网页：`re`正则表达式、`BeautifulSoup`、HTML 解析器`lxml`等
- 存储数据：存储至 txt、csv 等文件或是存储至 MySQL、MongoDB 等数据库

<!-- more -->

---

# 使用 requests 模块发起 HTTP 请求与抓取静态网页

使用 pip 命令安装`requests`模块。

```bash
pip install requests
```

使用`requests.get()`可以向目标 URL 发送一个`GET`请求并返回页面内容与信息。

```python
import requests
r = requests.get('https://www.baidu.com')
```

此时我们就已经实现了一个静态网页的抓取。`requests.get()`方法返回的对象包含了关于本次请求的信息，通过它的一些实例变量和方法可以进行访问。下面列出了一些常用的变量和方法：

- `status_code` ：返回 HTTP 状态码
- `headers` ：返回请求头
- `encoding` ：返回编码类型
- `text` ：返回响应内容（Unicode）
- `content` ：返回响应内容（二进制数据）
- `json()` ：返回 JSON 响应内容
- `url` ：返回网页 URL

上面只是一个所有参数都为默认时的请求。有时候我们可以对`requests`进行定制，使得请求符合我们的需求。

## 设置 URL 参数

可以使用一个字典用于保存参数名称与其对应的值，然后通过`params`参数传入`requests.get()`方法中。在下面的代码中，将值为`value1`的参数`key1`和值为`value2`的参数`key2`传入网页[http://httpbin.org/get](http://httpbin.org/get)，发现 URL 已经正确编码：

```python
import requests
key = {'key1': 'value1', 'key2': 'value2'}
r = requests.get('http://httpbin.org/get', params = key)
print(r.url)
print(r.text)
```

运行结果如下：

```json
http://httpbin.org/get?key1=value1&key2=value2
{
  "args": {
    "key1": "value1",
    "key2": "value2"
  },
  "headers": {
    "Accept": "*/*",
    "Accept-Encoding": "gzip, deflate",
    "Host": "httpbin.org",
    "User-Agent": "python-requests/2.21.0"
  },
  "origin": "210.41.103.125, 210.41.103.125",
  "url": "https://httpbin.org/get?key1=value1&key2=value2"
}
```

## 定制请求头

同样使用字典存储自定义的请求头，然后通过`headers`参数传入。比较常用的一个用途是针对一些针对不同的设备返回不同内容的网站，可以自定义`User-Agent`值从而模拟不同类型的设备，从而获取不同的数据。除此之外，由于默认的`User-Agent`类似于`python-requests/2.21.0`，这种`User-Agent`很容易被服务器识别出来并进行反爬虫措施，此时可以修改成普通浏览器的`User-Agent`来顺利进行爬虫。以下是一个例子：

```python
import requests
key = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/77.0.3865.90 Safari/537.36',
       'Host': 'www.baidu.com'}
r = requests.get('https://www.baidu.com', headers = key)
```

## 发送其他类型的请求

事实上，`requests` 包可以发送所有类型的请求，如 `POST`、`PUT`、`DELETE`、`HEAD`、`OPTIONS` 等等，只需要将方法名改为请求类型即可。

```python
r = requests.put('https://httpbin.org/put', data = {'key':'value'})   # PUT method
r = requests.delete('https://httpbin.org/delete')                     # DELETE method
r = requests.head('https://www.baidu.com')                          # HEAD method
r = requests.options('https://www.baidu.com')                       # OPTIONS method
r = requests.post('https://httpbin.org/post', data = {'key':'value'}) # POST method
```

以 POST 请求为例：

```python
import requests
key = {'key1': 'value1', 'key2': 'value2'}
r = requests.post('https://httpbin.org/post', data = key)
print(r.text)
```

运行结果如下：

```json
{
  "args": {},
  "data": "",
  "files": {},
  "form": {
    "key1": "value1",
    "key2": "value2"
  },
  "headers": {
    "Accept": "*/*",
    "Accept-Encoding": "gzip, deflate",
    "Content-Length": "23",
    "Content-Type": "application/x-www-form-urlencoded",
    "Host": "httpbin.org",
    "User-Agent": "python-requests/2.21.0"
  },
  "json": null,
  "origin": "210.41.103.125, 210.41.103.125",
  "url": "https://httpbin.org/post"
}
```

## 设置超时

有时由于网络原因，服务器会长时间不返回内容，此时爬虫程序就会一直等待，这样就会影响爬虫的效率。因此，可以在请求的方法中设置 `timeout` 参数。其意义是，如果服务器在 `timeout` 秒内无应答，那么就会返回异常。

```python
import requests
r = requests.get('https://www.baidu.com', timeout = 0.001)
```

运行结果：

```python
ConnectTimeout: HTTPSConnectionPool(host='www.baidu.com', port=443): Max retries exceeded with url: / (Caused by ConnectTimeoutError(<urllib3.connection.VerifiedHTTPSConnection object at 0x122e19438>, 'Connection to www.baidu.com timed out. (connect timeout=0.001)'))
```

可以看到程序抛出了异常，因为在设定时间内，服务器没有返回内容。

---

# 抓取动态网页

首先需要了解一种异步更新技术：AJAX（Asynchronous JavaScript And XML，异步 `JavaScript` 和 `XML`）。这种技术可以在不重新加载网页的情况下对网页的某一部分进行更新，这样不仅节省了流量，而且减少了网页重载内容的下载。

但是问题来了：对于采用了这种技术的网页，有些信息并不会直接存在于`HTML`代码中，而是通过`JavaScript`代码来加载，这就使得爬虫比较麻烦。对于这种情况，可以通过以下两种方法实现：

## 解析真实地址抓取

有些网页中，虽然我们想要的数据并不在源代码中，但是我们也可以通过浏览器的“检查”功能来找到数据的真实地址，从而对数据进行爬取。

下面是某博客下的评论界面：

![](https://hujiekang.top/images/uploads/big/b2ef25c29346795212934a6f80c33c43.png)

查看源代码，发现评论所在的位置只有一段`JavaScript`代码：

![](https://hujiekang.top/images/uploads/big/f2d0a2e7ce43d4d8e169389cc449fab8.png)

此时使用浏览器的“检查”，选择`Network`选项后刷新网页，就可以在下面看见加载这个网站加载的所有文件：

![](https://hujiekang.top/images/uploads/big/d6b4db855146f6031a4968c35d2112b0.png)

待评论加载出来之后，就可以在这些文件里面找到评论数据文件：

![](https://hujiekang.top/images/uploads/big/9c292c9efd04c95642485fd284fe60e7.png)

下一步，就可以直接使用`requests`请求这个链接了：

```python
import requests
link = """https://api-zero.livere.com/v1/comments/list?callback=jQuery112403473268296510956_1531502963311&limit=10&repSeq=4272904&requestPath=%2Fv1%2Fcomments%2Flist&consumerSeq=1020&livereSeq=28583&smartloginSeq=5154&_=1531502963313"""
headers = {'User-Agent' : 'Mozilla/5.0 (Windows; U; Windows NT 6.1; en-US; rv:1.9.1.6) Gecko/20091201 Firefox/3.5.6'}
r = requests.get(link, headers= headers)
print (r.text)
```

运行结果是一段包含了`json`数据的字符串:

![](https://hujiekang.top/images/uploads/big/8eb6507d1398f03c2a8422cb322022b7.png)

为了解析出我们想要的数据，我们需要先去除那些无效的部分，只提取`json`的那部分数据。处理`json`数据需要用到`json`包：

```python
import json
json_string = r.text
json_string = json_string[json_string.find('{'):-2]     #find() 返回第一个被找到结果的索引
json_data = json.loads(json_string)                     #将字符串数据转换为json数据
comment_list = json_data['results']['parents']          #按照json的树形结构一层一层向内访问
for eachone in comment_list:                            #对获取到的数据逐个打印
    message = eachone['content']
    print (message)
```

输出结果如下：

![](https://hujiekang.top/images/uploads/big/cf40a6d0fd6e3640d5796c3600d02853.png)

这样就成功爬取了第一页评论内容，此时点击下一页同样可以在“检查”中找到。

![](https://hujiekang.top/images/uploads/big/1ba011efae991b8a3f69435dc2fd706c.png)

对比两个网页链接，发现只有 `offset` 参数和 `limit` 参数是变化的。很容易看出，`offset`代表的是页数，`limit`代表的是一页里的评论数。所以只需修改`offset`的值，就可以批量爬取评论了。

以下是完整代码：

```python
import requests
import json
def single_page_comment(link):
    headers = {'User-Agent' : 'Mozilla/5.0 (Windows; U; Windows NT 6.1; en-US; rv:1.9.1.6) Gecko/20091201 Firefox/3.5.6'}
    r = requests.get(link, headers= headers)
    # 获取 json 的 string
    json_string = r.text
    json_string = json_string[json_string.find('{'):-2]
    json_data = json.loads(json_string)
    comment_list = json_data['results']['parents']
for eachone in comment_list:
    message = eachone['content']
    print (message)
for page in range(1,4):
    link1 = "https://api-zero.livere.com/v1/comments/list?callback=jQuery112403473268296510956_1531502963311&limit=10&offset="
    link2 = "&repSeq=4272904&requestPath=%2Fv1%2Fcomments%2Flist&consumerSeq=1020&livereSeq=28583&smartloginSeq=5154&_=1531502963316"
    page_str = str(page)
    link = link1 + page_str + link2
    print (link)
    single_page_comment(link)
```

## 使用 Selenium 模拟浏览器抓取

对于一些无法找到真实地址的网页，或者能找到真实地址但是由于加密或是其他原因导致无法批量爬取数据时，就可以使用 Selenium 库模拟浏览器来进行爬取。

Selenium 库是一个用于 Web 应用程序测试的工具，它直接运行在浏览器中，使用脚本控制浏览器进行操作。借助它来爬虫的原理是使用浏览器的渲染引擎，将`JavaScript`中加载出来的内容转为静态网页代码，这样我们就可以像爬取静态网页一样爬取动态网页了。

### Selenium的安装和简单使用

Python 使用 `pip` 命令来安装 Selenium：

```bash
pip install selenium
```

Selenium 支持多种浏览器的调用，包括 IE、Firefox、Safari、Chrome、Opera 等。本文使用Chrome和Firefox进行操作。

首先使用 Selenium 打开浏览器，并打开一个网页：

```python
from selenium import webdriver
driver = webdriver.Chrome()
#Use the code below if you're using Firefox
#driver = webdriver.Firefox()
driver.get("https://www.baidu.com")
```

运行代码发现报错：

```python
#Chrome
WebDriverException: 'chromedriver' executable needs to be in PATH.

#Firefox
WebDriverException: 'geckodriver' executable needs to be in PATH. 
```

为什么会这样呢？因为在新版的Selenium中，要令其顺利的控制浏览器，还需要安装一个driver。这个driver专门用于Selenium操控浏览器，不同的浏览器也有不同的driver，都可以在浏览器的官方网站找到。这里给出Chrome和Firefox的driver下载地址：[chromedriver](https://sites.google.com/a/chromium.org/chromedriver/home) / [geckodriver](https://github.com/mozilla/geckodriver/releases/tag/v0.25.0)

安装好了之后，Windows系统需要将driver所在路径添加到系统环境变量`PATH`中，macOS系统只需要知道driver的存放路径即可。

接下来，在`webdriver.Chrome()`或`webdriver.Firefox()`方法中添加`executable_path`参数，填入driver所在的路径：

```python
from selenium import webdriver
driver = webdriver.Chrome(executable_path = '/Users/hujiekang/Documents/chromedriver')
#Use the code below if you're using Firefox
#driver = webdriver.Firefox(executable_path = '/Users/hujiekang/Documents/geckodriver')
driver.get("https://www.baidu.com")
```

这样就可以顺利打开网页了。可以看到在浏览器的地址栏有一行字“Chrome正受到自动测试软件的控制”，说明此时浏览器正在被Selenium控制。

![](https://hujiekang.top/images/uploads/big/b26eea65550408d7fcc03b5db2614ffb.png)

使用Selenium来打开刚才的博客网站，在检查中就可以看到经过渲染后的`HTML`代码。此时评论数据都变成了`HTML`数据，我们就可以直接进行爬取。

![](https://hujiekang.top/images/uploads/big/f3165ef1c5c0f264982d083930c8cf54.png)

### 使用Selenium选择和操作元素

除了打开网页外，Selenium还提供了很多选择元素的方法：

- `find_element_by_css_selector()`         通过`CSS`属性进行选择
- `find_element_by_xpath()`                通过`XPath`进行选择
- `find_element_by_id()`                   通过元素的`id`选择
- `find_element_by_name()`                 通过元素的`name`选择
- `find_element_by_link_text()`            通过超链接文字选择
- `find_element_by_partial_link_text()`    通过部分超链接文字选择
- `find_element_by_tag_name()`             通过元素的名称选择，如`h1`、`p`
- `find_element_by_class_name()`           通过元素的`class`选择

以上可以选择符合条件的单个元素。如果要选择多个元素，只需将`element`改为`elements`即可。

比如：`find_elements_by_css_selector()`

当然，还有一种更加简单粗暴的方法`find_element()` / `find_elements()`。使用此方法，只需将选择方法作为参数传入即可。

比如：`find_element_by_id` -> `find_element("id","")`

也可以使用Selenium来操作元素。下面列出了常用的操作方法：

- `clear` 清除元素内容
- `send_keys()` 模拟按键输入
- `click()` 单击元素
- `is_selected()` 用于检查多选或者单选框是否被选中

举例：

```python
user = driver.find_element_by_name("username")   # 寻找用户名输入框
user.clear                                       # 清除输入框内容
user.send_keys("1234567")                        # 输入用户名
pwd = driver.find_element_by_name("password")    # 寻找密码输入框
pwd.clear                                        # 清除输入框内容
pwd.send_keys("******")                          # 输入密码
driver.find_element_by_id("loginBtn").click()    # 找到登录按钮点击登录
```

### Selenium的高级操作

- 执行`JavaScript`代码

  可以使用`driver.execute_script()`方法来执行`JavaScript`代码。

  ```python
  driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")      # 下滑到页面底部
  ```

- 禁止CSS的加载
  
  Firefox：
  ```python
  from selenium import webdriver
  fp = webdriver.FirefoxOptions()
  fp.set_preference("permissions.default.stylesheet", 2)

  driver=webdriver.Firefox(executable_path=r'/Users/hujiekang/Documents/geckodriver',options = fp)
  driver.get("https://www.bilibili.com")
  ```
  Chrome：
  ```python
  from selenium import webdriver
  options = webdriver.chrome.options.Options()
  prefs = {'permissions.default.stylesheet':2}
  options.add_experimental_option("prefs", prefs)
  
  driver = webdriver.Chrome(executable_path='/Users/hujiekang/Documents/chromedriver',chrome_options=options)
  driver.get('https://www.bilibili.com/')
  ```

  加载网页效果：

  ![](https://hujiekang.top/images/uploads/big/8b4c1c0ebdd720d49a3e1dfd622af0bf.png)

- 禁止图片的显示
  
  Firefox：
  ```python
  from selenium import webdriver
  fp = webdriver.FirefoxOptions()
  fp.set_preference("permissions.default.image", 2)

  driver=webdriver.Firefox(executable_path=r'/Users/hujiekang/Documents/geckodriver',options = fp)
  driver.get("https://www.bilibili.com")
  ```
  Chrome：
  ```python
  from selenium import webdriver
  options=webdriver.chrome.options.Options()
  prefs={"profile.managed_default_content_settings.images": 2}
  options.add_experimental_option("prefs",prefs)
  driver = webdriver.Chrome(executable_path=r'/Users/hujiekang/Documents/chromedriver',chrome_options=options)
  driver.get("https://www.bilibili.com")
  ```

  加载网页效果：

  ![](https://hujiekang.top/images/uploads/big/738eea0b31778179cd4c59f458f977db.png)

- 禁用`JavaScript`的运行
  
  Firefox：
  ```python
  from selenium import webdriver

  fp = webdriver.FirefoxOptions()
  fp.set_preference("javascript.enabled", False)

  driver=webdriver.Firefox(executable_path=r'/Users/hujiekang/Documents/geckodriver',options = fp)
  driver.get("https://www.baidu.com")
  ```
  Chrome：
  ```python
  from selenium import webdriver
  options=webdriver.chrome.options.Options()
  prefs={"profile.managed_default_content_settings.javascript": 2}
  options.add_experimental_option("prefs",prefs)
  driver = webdriver.Chrome(executable_path=r'/Users/hujiekang/Documents/chromedriver',chrome_options=options)
  driver.get("https://www.baidu.com")
  ```

  可以看到，由于禁用了`JavaScript`，百度返回了不带有`JavaScript`的网页。

  ![](https://hujiekang.top/images/uploads/big/9970dd7094eec00e98e261545d6a5874.png)

因为很多时候，我们爬虫的数据只是一些文本，所以限制其他元素的加载可以明显提高网页加载速度，从而提高爬虫的效率。

更多信息，可以查看Selenium的[官方文档](https://selenium-python.readthedocs.io/index.html)。

---

# 页面的解析

爬取页面源代码之后，我们需要从源代码中提取出需要的数据。此时就需要解析页面。

## 使用正则表达式解析

>正则表达式（英語：Regular Expression，常简写为regex、regexp或RE），又称正規表示式、正規表示法、規則運算式、常規表示法，是计算机科学的一个概念。正则表达式使用单个字符串来描述、匹配一系列符合某个句法规则的字符串。在很多文本编辑器裡，正則表达式通常被用来检索、替换那些符合某个模式的文本。

| 模式  |           描述           | 模式  |                                  描述                                   |
| :---: | :----------------------: | :---: | :---------------------------------------------------------------------: |
|  `.`  | 匹配除了换行符的任意字符 | `\s`  |                              匹配空白字符                               |
|  `*`  | 匹配前一个字符0次或多次  | `\S`  |                           匹配任何非空白字符                            |
|  `+`  | 匹配前一个字符1次或多次  | `\d`  |                                匹配数字                                 |
|  `?`  |  匹配前一个字符0次或1次  | `\D`  |                               匹配非数字                                |
|  `^`  |      匹配字符串开头      | `\w`  |                             匹配字母和数字                              |
|  `$`  |      匹配字符串结尾      | `\W`  |                             匹配非字母数字                              |
| `()`  |    匹配括号内的表达式    | `[]`  | 用来表示一组字符（`[]`若以`^`开头，则匹配除去`[]`中字符的其他所有字符） |

<center style="color:gray;margin:10px">常见的正则字符及含义</center>
**PS：使用raw string来防止转义（在字符串前加字母r）**

[Python官方文档](https://docs.python.org/zh-cn/3/library/re.html)中有关于正则表达式更详尽的介绍。如果想要测试或调试正则表达式，请访问[此网站](https://regex101.com/)。

爬虫中常用的正则表达式匹配方法在`re`包中。以下是`re`包中的几个常用方法：

- `re.match()`
  从字符串起始位置匹配一个模式，如果无匹配，则返回`None`。

  ```python
  import re
  m = re.match('www','www.baidu.com')  # 从起始位置找到匹配
  n = re.match('com','www.baidu.com')  # 未从起始位置找到匹配
  print(m)
  print(n)
  ```

  程序运行结果为：

  ```python
  <re.Match object; span=(0, 3), match='www'>
  None
  ```

- `re.search()`
  
  扫描整个字符串，并返回第一个成功的匹配。

  ```python
  import re
  m = re.search('com','www.baidu.com')
  n = re.match('com','www.baidu.com')
  print(m)
  print(n)
  ```

  程序运行结果为：

  ```python
  <re.Match object; span=(10, 13), match='com'>
  None
  ```

- `re.findall()`
  
  找到字符串中的所有匹配。

  ```python
  import re
  m = re.findall('[0-9]+','123456,234567,abcdef,345678,456789')
  print(m)
  ```

  程序运行结果为：

  ```python
  ['123456', '234567', '345678', '456789']
  ```

  `findall()`与`match()`和`search()`有一点不同：`findall()`返回的是一个列表，而后两个方法返回的是`re.Match`对象。

  <br>

- `re.compile()`

  将正则表达式字符串编译为一个正则表达式对象。当一个正则表达式要多次使用时，使用对象会更加高效。

  ```python
  import re
  word = '123456,234567,abcdef,345678,456789'
  p = re.compile('[0-9]+')
  print(p.search(word))
  ```

  程序运行结果为：

  ```python
  <re.Match object; span=(0, 6), match='123456'>
  ```

- `re.split()`
  
  根据匹配分割字符串。 如果在正则表达式中捕获到括号，那么所有的组里的文字也会包含在列表里。如果参数 `maxsplit` 非零， 最多进行 `maxsplit` 次分隔， 剩下的字符全部返回到列表的最后一个元素。
  
  ```python
  >>> re.split(r'\W+', 'Words, words, words.')
  ['Words', 'words', 'words', '']
  >>> re.split(r'(\W+)', 'Words, words, words.')
  ['Words', ', ', 'words', ', ', 'words', '.', '']
  >>> re.split(r'\W+', 'Words, words, words.', maxsplit = 1)
  ['Words', 'words, words.']
  ```

## 使用 BeautifulSoup 模块解析

### 安装BeautifulSoup

```bash
pip install bs4
```

`BeautifulSoup`支持多种解析器，下表列出了主要解析器的一些信息：

|      解析器       |                              使用方法                               |                            优势                             |               劣势                |
| :---------------: | :-----------------------------------------------------------------: | :---------------------------------------------------------: | :-------------------------------: |
|   Python标准库    |                 `BeautifulSoup(html,"html.parser")`                 |    Python的内置标准库<br>执行速度适中<br>文档容错能力强     | 在Python3.2.2之前的版本容错能力差 |
| `lxml` HTML解析器 |                    `BeautifulSoup(html,"lxml")`                     |                  速度快<br>文档容错能力强                   |          需要安装C语言库          |
| `lxml` XML解析器  | `BeautifulSoup(html,"xml")`<br>`BeautifulSoup(html,["lxml","xml"])` |                速度快<br>唯一支持XML的解析器                |          需要安装C语言库          |
|    `html5lib`     |                  `BeautifulSoup(html,"html5lib")`                   | 容错性最好<br>以浏览器的方式解析文档<br>生成HTML5格式的文档 |     速度慢<br>不依赖外部扩展      |

### BeautifulSoup的使用

获取网页数据之后，需要先将网页源代码转换为`BeautifulSoup`对象。转换之后可以使用`soup.prettify()`方法输出经过美化的`HTML`代码。

```python
import requests
from bs4 import BeautifulSoup
link = "http://www.baidu.com"

r = requests.get(link)
r.encoding="utf-8"  # 转换网页编码
soup = BeautifulSoup(r.text, "lxml")
print(soup.prettify())
```

部分输出如下图：

![](https://hujiekang.top/images/uploads/big/0eff3e7734822390b4e02a576a23a53a.png)

`BeautifulSoup`对象是一个树形的结构，它的每一个节点都是一个`Python`对象，所以使用`BeautifulSoup`获取网页内容就是一个提取对象内容的过程。

提取对象的方法大体上分为3种：

- 遍历文档树
  
  遍历文档树就是对文档树的逐层访问。以百度为例，上面返回的`head`部分代码如下：

  ```html
  <head>
    <meta content="text/html;charset=utf-8" http-equiv="content-type"/>
    <meta content="IE=Edge" http-equiv="X-UA-Compatible"/>
    <meta content="always" name="referrer"/>
    <link href="http://s1.bdstatic.com/r/www/cache/bdorz/baidu.min.css" rel="stylesheet" type="text/css"/>
    <title>
    百度一下，你就知道
    </title>
  </head>
  ```

  若想获取标题内容，则需输入：

  ```python
  soup.head.title.text
  ```

  输出：`'百度一下，你就知道'`

  使用`.contents`获取子节点的**全部**内容（返回`list`）：

  ```python
  soup.body.div.contents   # 查看body标签下的所有div标签
  ```

  输出：
  ```python
  [' ', <div id="head"> <div class="head_wrapper"> <div class="s_form"> <div class="s_form_wrapper"> <div id="lg"> <img height="129" hidefocus="true" src="//www.baidu.com/img/bd_logo1.png" width="270"/> </div> <form action="//www.baidu.com/s" class="fm" id="form" name="f"> <input name="bdorz_come" type="hidden" value="1"/> <input name="ie" type="hidden" value="utf-8"/> <input name="f" type="hidden" value="8"/> <input name="rsv_bp" type="hidden" value="1"/> <input name="rsv_idx" type="hidden" value="1"/> <input name="tn" type="hidden" value="baidu"/><span class="bg s_ipt_wr"><input autocomplete="off" autofocus="" class="s_ipt" id="kw" maxlength="255" name="wd" value=""/></span><span class="bg s_btn_wr"><input class="bg s_btn" id="su" type="submit" value="百度一下"/></span> </form> </div> </div> <div id="u1"> <a class="mnav" href="http://news.baidu.com" name="tj_trnews">新闻</a> <a class="mnav" href="http://www.hao123.com" name="tj_trhao123">hao123</a> <a class="mnav" href="http://map.baidu.com" name="tj_trmap">地图</a> <a class="mnav" href="http://v.baidu.com" name="tj_trvideo">视频</a> <a class="mnav" href="http://tieba.baidu.com" name="tj_trtieba">贴吧</a> <noscript> <a class="lb" href="http://www.baidu.com/bdorz/login.gif?login&amp;tpl=mn&amp;u=http%3A%2F%2Fwww.baidu.com%2f%3fbdorz_come%3d1" name="tj_login">登录</a> </noscript> <script>document.write('<a href="http://www.baidu.com/bdorz/login.gif?login&tpl=mn&u='+ encodeURIComponent(window.location.href+ (window.location.search === "" ? "?" : "&")+ "bdorz_come=1")+ '" name="tj_login" class="lb">登录</a>');</script> <a class="bri" href="//www.baidu.com/more/" name="tj_briicon" style="display: block;">更多产品</a> </div> </div> </div>, ' ', <div id="ftCon"> <div id="ftConw"> <p id="lh"> <a href="http://home.baidu.com">关于百度</a> <a href="http://ir.baidu.com">About Baidu</a> </p> <p id="cp">©2017 Baidu <a href="http://www.baidu.com/duty/">使用百度前必读</a>  <a class="cp-feedback" href="http://jianyi.baidu.com/">意见反馈</a> 京ICP证030173号  <img src="//www.baidu.com/img/gs.gif"/> </p> </div> </div>, ' ']
  ```

  下面列出部分其他的属性：

  - `.parent`：获得父节点内容
  - `.parents`：获得所有父节点内容
  - `.children`：获得所有子标签的内容
  - `.descendants`：对所有tag的子孙节点进行递归循环
  - `.name`：获得标签名
  
- 搜索文档树

  搜索文档树最常用的两个方法：`find()`和`find_all()`。两个方法的用法类似，前者用于搜索单个节点，而后者用于搜索全部节点。

  下面还是以百度网页为例介绍这两个方法的使用：

  ```python
  import requests
  from bs4 import BeautifulSoup
  link = "http://www.baidu.com"
  r = requests.get(link)
  r.encoding = "utf-8"
  soup = BeautifulSoup(r.text, "lxml")

  links = soup.find_all("a",class_="mnav")
  for each in links:
      print(each['href'])
      
  divi = soup.find("div",id="lg")
  print(divi.contents)
  ```

  以上代码搜索了所有`class`为`mnav`的`a`标签，并打印出了标签的`href`属性内容；还搜索了`id`为`lg`的`div`标签，并输出了标签内的所有内容。程序输出结果如下：

  ```bash
  http://news.baidu.com
  http://www.hao123.com
  http://map.baidu.com
  http://v.baidu.com
  http://tieba.baidu.com
  [' ', <img height="129" hidefocus="true" src="//www.baidu.com/img/bd_logo1.png" width="270"/>, ' ']
  ```

  这两个方法的第一个参数用于查找标签，可传入字符串、正则表达式（需传入**正则表达式对象**）、列表、`True`；第二个参数用于查找属性，如`class`（为了防止和`Python`内部关键字冲突，故**写为`class_`**）、`id`等等。如果需要搜索包含多个属性的标签，可通过一个字典传入多个属性。此外，若过滤条件是标签是否有这个属性，只需让该属性的值为`True`或`False`。

- `CSS`选择器

  `CSS`选择器方法`soup.select()`可以使用上面两种方式（遍历文档树、搜索文档树）来提取数据。

  首先可以逐层查找，标签之间用空格隔开：

  ```python
  >>> soup.select(head title)
  [<title>百度一下，你就知道</title>]
  ```

  此外，也可以通过某标签的子标签进行直接遍历，标签间以 ` > ` 隔开：

  ```python
  >>> soup.select("head > title")  # 搜索head下所有的title标签（这里只有一个）
  [<title>百度一下，你就知道</title>]
  >>> soup.select("div > a")       # 搜索div标签下的所有a标签
  [<a class="mnav" href="http://news.baidu.com" name="tj_trnews">新闻</a>, <a class="mnav" href="http://www.hao123.com" name="tj_trhao123">hao123</a>, <a class="mnav" href="http://map.baidu.com" name="tj_trmap">地图</a>, <a class="mnav" href="http://v.baidu.com" name="tj_trvideo">视频</a>, <a class="mnav" href="http://tieba.baidu.com" name="tj_trtieba">贴吧</a>, <a class="bri" href="//www.baidu.com/more/" name="tj_briicon" style="display: block;">更多产品</a>]
  ```

  `CSS`选择器也支持直接搜索查找。

  - 按`class`：`soup.select(".mnav")` / `soup.select("[class~=mnav]")`
  - 按`id`：`soup.select("#link1")` / `soup.select("a#link2")`
  - 按多种`CSS`选择器：`soup.select("#link1,#link2")`
  - 按属性：`soup.select('a[href]')`
  - 按属性值：`soup.select('a[href="https://www.baidu.com"]')`
  - 按语言设置：`soup.select('p[lang|=en]')`
  - 按正则表达式：
    ```python
    >>> soup.select('a[href^="http://www.baidu.com"')  # 搜索链接以http://www.baidu.com/ 开头的a标签
    [<a class="lb" href="http://www.baidu.com/bdorz/login.gif?login&amp;tpl=mn&amp;u=http%3A%2F%2Fwww.baidu.com%2f%3fbdorz_come%3d1" name="tj_login">登录</a>, <a href="http://www.baidu.com/duty/">使用百度前必读</a>]
    ```

更多详细的介绍请查阅[BeautifulSoup官方文档](https://beautifulsoup.readthedocs.io)。

## 使用lxml解析

### 安装lxml

```bash
pip install bs4
```

### lxml的使用

使用`lxml`提取网页源代码数据有三种方法：`XPath`选择器、`CSS`选择器、`find()`方法。后两种方法前面已介绍，这里介绍第一种方法。

`XPath`是一门在`XML`文档中查找信息的语言，它使用路径表达式来选择节点或节点集，也可以用在获取HTML数据中。获取XPath非常简单，在浏览器的“检查”页面，选中要获取数据的标签，右键单击“Copy”项里的“Copy XPath”项就可以把`XPath`复制到剪贴板。如下图所示，获取百度首页的`title`标签对应的XPath，得到的结果为`/html/head/title`。

![](https://hujiekang.top/images/uploads/big/780cbf6f44d14ae719f4f35e81c9082a.png)

当然，也可以根据`XPath`的路径表达式来获得元素的`XPath`。

下表对`XPath`路径表达式进行了描述：

|   表达式   |                         描述                         |
| :--------: | :--------------------------------------------------: |
| `nodename` |                选取此节点的所有子节点                |
|    `/`     |                     从根节点选取                     |
|    `//`    | 从匹配选择的当前节点选择文档中的节点，而不考虑其位置 |
|    `.`     |                     选取当前节点                     |
|    `..`    |                 选取当前节点的父节点                 |
|    `@`     |                       选取属性                       |

举几个例子加深印象：

|  路径表达式   |                 结果                  |
| :-----------: | :-----------------------------------: |
|    `head`     |      选取`head`元素的所有子节点       |
|    `/head`    |           选取根元素`head`            |
| `head/title`  | 选取属于`head`子元素的所有`title`元素 |
|   `//title`   |  选取所有`title`元素，无论其位置在哪  |
| `head//title` |  选取`head`元素后代的所有`title`元素  |
|   `//@lang`   |          选取所有`lang`属性           |

下面使用`XPath`获取`title`标签内容：

```python
import requests
from lxml import etree

link = "https://www.baidu.com"
r = requests.get(link)
r.encoding = "utf-8"
html = etree.HTML(r.text)

title = html.xpath('/html/head/title/text()')
print(title)
```

运行结果如下：

```python
['百度一下，你就知道']
```

# 数据的存储

首先介绍基本的存储：将数据存储至文件中。

## 存储至txt文件

存储至txt非常简单，只需如下几行代码：

```python
text = "test"
with open('C:/Users/you/desktop/test.txt',"a+") as f:
    f.write(text)
    f.close()
```

运行程序，可以在桌面上发现多了一个`test.txt`，打开内容正是`text`字符串的内容。

![](https://hujiekang.top/images/uploads/big/cfcf79e9777570872a4648a89a8cd438.png)

这里介绍一下`Python`中的`with`关键字：

```python
# with 关键字的格式
with context [as var]:
    pass
```
其中的`context`是一个表达式，返回的是一个对象，`var`用来保存`context`表达式返回的对象，可以有单个或者多个返回值。`with`本身并没有异常捕获的功能，但是如果发生了运行时异常，它照样可以关闭文件释放资源。

`with` 语句实质是上下文管理。

- 上下文管理协议。包含方法`__enter__()` 和`__exit__()`，**支持该协议对象要实现这两个方法**。
- 上下文管理器，定义执行`with`语句时要建立的运行时上下文，负责执行`with`语句块上下文中的进入与退出操作。
- 进入上下文的时候执行`__enter__()`方法，如果设置`as var`语句，`var`变量接受`__enter__()`方法**返回值**。
- 如果运行时发生了异常，就退出上下文管理器。**调用管理器`__exit__()`方法**。

`open()`函数的第一个参数是文件的路径，填入的路径既可以是绝对路径也可以是相对路径。为了防止反斜杠`\`转义，下面有三种方法来填写路径：

- 使用原始字符串：
  `r'C:\Users\you\desktop\test.txt'`
- 使用正斜杠`/`：
  `'C:/Users/you/desktop/test.txt'`
- 使用转义后的反斜杠`\\`：
  `'C:\\Users\\you\\desktop\\test.txt'`

`open()`函数里面还有第二个参数，该参数用于设定打开文件的方式。还有几种打开文件的方式如下表：

读写方式|能否读写|若文件不存在|写入方式
:--:|:--:|:--:|:--:
w|写入|创建|覆盖写入
w+|读取+写入|创建|覆盖写入
r|读取|报错|不可写入
r+|读取+写入|报错|覆盖写入
a|写入|创建|追加写入
a+|读取+写入|创建|追加写入

有时候，我们还需要读取文件内容，此时只需要把`f.write(text)`改为`text = f.read()`即可。

## 存储至csv文件

对`csv`文件进行读写和`txt`文件类似，只不过需要使用到`csv`包。我们创建一个`test.csv`文件，填入如下内容，保存在桌面：

![](https://hujiekang.top/images/uploads/big/57336ba78ccfd52c7664fa80e3e280fc.png)

下面的例子对`test.csv`进行读取：

```python
import csv
with open('C:/Users/you/desktop/test.csv'，'r',encoding='UTF-8-sig') as csvf:
    csv_reader = csv.reader(csvf)
    for row in csv_reader:
        print(row)
        print(row[0])
```

得到结果如下：

![](https://hujiekang.top/images/uploads/big/a767ace6f7de09a81717597d72e2e0ca.png)

可以看到程序按行读取了`csv`文件，并每行用一个列表进行存储。

这里使用了`UTF-8-sig`字符编码，因为在Windows下用文本编辑器创建的文本文件，如果选择以`UTF-8`等`Unicode`格式保存，会在文件头（第一个字符）加入一个`BOM`（字节顺序标记，byte-order mark）标识。而`UTF-8`以字节为编码单元，它的字节顺序在所有系统中都是一样的，没有字节序的问题，也因此它实际上并不需要`BOM`。所以`UTF-8`会把`BOM`当成常规字符来读取并显示。下图是使用`UTF-8`编码的第一行输出：

![](https://hujiekang.top/images/uploads/big/9032e11e2933ff1a8b8eada0b3fec0bb.png)

写入`csv`文件与读取类似，使用的是`csv.writer()`方法：

```python
import csv
list = ['1','2','3','4']
with open('C:/Users/you/desktop/test.csv'，'a+',encoding='UTF-8-sig',newline='') as csvf:
    w = csv.writer(csvf)
    w.writerow(list)
```

上述代码在之前创建的`test.csv`中追加了一行，运行后的文件如下：

![](https://hujiekang.top/images/uploads/big/c1a8aab0fdc45a28c3bb06c99b245df2.png)

## 存储至MySQL数据库

MySQL是一种使用`SQL`语言的关系数据库管理系统，它的安装很简单，此处不再介绍。接下来介绍使用`Python`来操作MySQL数据库，进行一些基础的数据库操作。为了方便操作，数据库已经提前建立好，名为`scraping`，并创建了一个名为`top250_movie`的数据表。具体操作代码如下（以下代码在MySQL自带的shell中运行）：

```sql
CREATE DATABASE scraping;
USE scraping;
CREATE TABLE top250_movie(
  id INT NOT NULL AUTO_INCREMENT,
  title VARCHAR(200) NOT NULL,
  other_title VARCHAR(400) NOT NULL,
  rating VARCHAR(10) NOT NULL,
  main_actors VARCHAR(500) NOT NULL,
  year VARCHAR(10) NOT NULL,
  country VARCHAR(50) NOT NULL,
  catagory VARCHAR(200) NOT NULL,
  PRIMARY KEY (id)
);
```

接下来，使用一个例子来演示`Python`对MySQL的操作。下面的代码会爬取豆瓣电影前250的相关信息（标题、外文标题、评分、主要演员、上映时间、国家、分类），并存储至`top250_movie`表中。对MySQL的操作需要使用到`MySQLdb`包。代码如下：

```python
from selenium import webdriver
import time
import MySQLdb

# 这部分是selenium的设置
chrome_options = webdriver.ChromeOptions()
prefs = {"profile.managed_default_content_settings.images":2}     # 无图模式
chrome_options.add_experimental_option("prefs",prefs)
driver=webdriver.Chrome(options=chrome_options,executable_path=r'C:\Program Files\chromedriver.exe')
driver.implicitly_wait(20)                                        # 隐式等待，若在这20秒内产生了响应则直接向下执行

conn=MySQLdb.connect(host='localhost',user='root',passwd='root',db='scraping',charset='utf8')   # 创建数据库连接
cur=conn.cursor()   # 创建用于操作数据库的游标

# 这部分是爬取数据的过程
for i in range(0,10):
    url="https://movie.douban.com/top250?start="
    driver.get(url+str(25*i))
    time.sleep(3)
    movie_list=driver.find_elements_by_css_selector('div.info')
    for eachmovie in movie_list:
        title=eachmovie.find_element_by_css_selector('span.title')
        title=title.text
        other_title=eachmovie.find_element_by_css_selector('span.other')
        other_title=other_title.text
        rating=eachmovie.find_element_by_css_selector('span.rating_num')
        rating=rating.text
        detail_1=eachmovie.find_element_by_tag_name('p').text.split('\n')
        main_actors=detail_1[0]
        detail_2=detail_1[1].split('/')
        year=detail_2[0][:-1]
        country=detail_2[1][1:-1]
        catagory=detail_2[2][1:]
        print(title+"\t"+other_title+"\t"+rating+"\t"+main_actors+"\t"+year+"\t"+country+"\t"+catagory+"\n")
# 一组数据爬取完毕
        cur.execute("INSERT INTO top250_movie (title,other_title,rating,main_actors,year,country,catagory) \
            VALUES (%s,%s,%s,%s,%s,%s,%s)", \
            (title,other_title,rating,main_actors,year,country,catagory)) # 执行SQL语句，插入数据
cur.close()     # 操作完毕，关闭游标
conn.commit()   # 提交到数据库执行，不执行该句可能导致数据库不会产生任何修改
conn.close()    # 关闭数据库连接
```

页面的爬取使用了Selenium模拟浏览器，当然使用BeautifulSoup也可以实现。通过判断url的参数，可以实现自动翻页爬取。当数据爬取完毕后，使用`cur.execute()`方法来执行`SQL`语句，在这里是`INSERT`语句。为了将`Python`中的数据传入`SQL`语句中，需要把要传入的数据按顺序放于语句的后一个参数中，然后格式化的传入。

最终使用语句`SELECT * FROM top250_movie`查看爬取的结果：

![](https://hujiekang.top/images/uploads/big/5272b861d0886f4b63292cae1e44e3e8.png)

详细信息可访问`MySQLdb`包的官方文档：[https://mysqlclient.readthedocs.io/](https://mysqlclient.readthedocs.io/)

## 存储至MongoDB数据库

MongoDB是一种非关系型数据库（`NoSQL`）。和传统的`SQL`数据库相比，`NoSQL`数据库中数据之间没有关系，所以读写性能非常高。而就爬虫的使用场景来看，当存储了上万条数据后，想要更改表的结构就会变得十分困难，所以使用`NoSQL`也是一个比`SQL`更优的选择。

### MongoDB的下载、安装与初始化

下载MongoDB的官网链接：[https://www.mongodb.com/download-center](https://www.mongodb.com/download-center)安装过程较为简单，不做过多介绍。

安装好MongoDB之后，有两种方式可以启动MongoDB。

第一种是直接以程序启动。进入MongoDB的安装目录（默认为`C:/Program Files/MongoDB/Server/MongoDB的版本号`）里面的`bin`文件夹，找到`mongod.exe`双击打开，发现一个窗口闪了一下就消失了。接下来再双击`mongo.exe`运行，MongoDB就成功启动了。`mongod.exe`是启动程序，所以应该先运行它，随后再打开主程序`mongo.exe`。下图使用了PowerShell运行，效果也是一样的。这种启动方法有一个缺点，就是当程序被关闭时，数据库就会断开，所以每次想使用时都要重新启动程序，比较麻烦。

![](https://hujiekang.top/images/uploads/big/d46cbda56f8381accea2b1358e8bdc56.png)

第二种就解决了麻烦的问题。第二种方法使用Windows服务的方式打开，这样的话只要服务在运行，数据库就可以一直被连接而不会断开。

这个操作要在Windows下的命令提示符或是PowerShell下进行。以管理员身份运行`cmd.exe`或`powershell.exe`，输入`cd MongoDB的安装目录/bin`切换至MongoDB安装目录的`bin`文件夹。比如我的安装目录是`C:/Program Files/MongoDB/Server/4.2`，那么我就输入：

```bash
cd C:/Program Files/MongoDB/Server/4.2/bin
```

接下来输入以下代码，来建立Windows服务：

```bash
mongod.exe --logpath "C:/Program Files/MongoDB/Server/4.2/log/mongodb.log" --logappend --dbpath "C:/Program Files/MongoDB/Server/4.2/data/db" --serviceName "MongoDB" --install
```

需要注意的是，`--logpath`后面的字符串为日志文件的存储位置，默认在安装目录下的`log`文件夹中，可以修改为任意位置。`--dbpath`后面的字符串则为数据库的存储位置，这里我把它建立在安装目录的`data`文件夹中。

服务建立好了，接下来只需要启动服务，MongoDB就已经在运行了。接下来直接双击`mongo.exe`就可以键入命令对数据库进行操作。为了方便，还可以把`mongo.exe`的路径添加至系统的`PATH`环境变量，这样直接在命令提示符窗口中输入`mongo`，就可以打开了。

```bash
net start MongoDB
```

![](https://hujiekang.top/images/uploads/big/b72beed0e728913c36370bbe0273e16b.png)

接下来就可以对数据库进行操作了。可以输入`show dbs`来查看现有的所有数据库：

![](https://hujiekang.top/images/uploads/big/a65e23e61b15a50c1f466d0655c3d90e.png)

### NoSQL和SQL的一些区别

由于`NoSQL`和`SQL`有一定的区别，在部分定义上，MongoDB和`SQL`中的名称是不一样的，甚至MongoDB根本没有一些定义。下表进行了一些比较和解释：

`SQL`术语|MongoDB术语|解释
:--:|:--:|:--:
`database`|`database`|数据库
`table`|`collection`|数据库表
`row`|`document`|数据记录行
`column`|`field`|数据字段
`index`|`index`|索引
`table joins`|**N/A**|表连接，MongoDB不支持（表间无联系）
`primary key`|`primary key`|主键，MongoDB自动将`_id`字段设置为主键

除此之外，由于`NoSQL`的数据之间没有联系，MongoDB的数据行不需要设置相同的字段，而且相同的字段也不需要相同的数据类型。

### 使用Python操作MongoDB数据库

使用Python操作MongoDB数据库需要用到`PyMongo`库。同样使用`pip`安装：

```bash
pip install pymongo
```

然后就可以使用Python操作MongoDB了。下列代码连接了数据库，并创建了一个名为`scraping`的数据库，在其中创建了一个名为`movie`的数据表。和`SQL`不同的是，创建数据库或数据表就是选择数据库或数据表。当发现数据库或数据表不存在时，则会自动创建一个并选择。

```python
from pymongo import MongoClient
client = MongoClient('localhost', 27017)  # MongoDB的默认设置
db = client.scraping                      # 创建数据库scraping并选择
collection = db.movie                     # 创建数据表movie并选择
```

接下来，把豆瓣TOP250电影的信息存入`movie`这个数据表中：

```python
from selenium import webdriver
import time
from pymongo import MongoClient

# 这部分是selenium的设置
chrome_options = webdriver.ChromeOptions()
prefs = {"profile.managed_default_content_settings.images":2}
chrome_options.add_experimental_option("prefs",prefs)
driver=webdriver.Chrome(options=chrome_options,executable_path=r'C:\Program Files\chromedriver.exe')
driver.implicitly_wait(20)

# 连接数据库并选中数据表
client=MongoClient('localhost',27017)
db=client.scraping
collection=db.movie

# 数据爬取的过程
for i in range(0,10):
    url="https://movie.douban.com/top250?start="
    driver.get(url+str(25*i))
    time.sleep(2)  # 等待页面加载完成
    movie_list=driver.find_elements_by_css_selector('div.info')
    for eachmovie in movie_list:
        title=eachmovie.find_element_by_css_selector('span.title')
        title=title.text
        other_title=eachmovie.find_element_by_css_selector('span.other')
        other_title=other_title.text
        rating=eachmovie.find_element_by_css_selector('span.rating_num')
        rating=rating.text
        detail_1=eachmovie.find_element_by_tag_name('p').text.split('\n')
        main_actors=detail_1[0]
        detail_2=detail_1[1].split('/')
        year=detail_2[0][:-1]
        country=detail_2[1][1:-1]
        catagory=detail_2[2][1:]

# 将一组数据插入一个字典中并插入数据表
        post={"title":title,
              "other_title":other_title,
              "rating":rating,
              "main_actors":main_actors,
              "year":year,
              "country":country,
              "catagory":catagory}
        collection.insert_one(post)        # 将字典作为一组数据插入数据表
```

程序运行结束后，就可以在`mongo.exe`中查看爬取的数据，具体命令如下：

```bash
use scraping              # 选中数据库
db.movie.find().pretty()  # 选中movie数据表，find()用于查询数据，pretty()用于美化结果的显示
```

查看到的数据如下，MongoDB默认每次展示25条，输入`it`可以展示更多数据：

![](https://hujiekang.top/images/uploads/big/1708750bc937cf2028dd4c9645d0a073.png)

除了查询数据，下面列出了其他的一些操作命令：

- `db.collection.drop()`  从数据库中删除指定的数据表
- `db.collection.dataSize()`  返回数据表的大小
- `db.collection.deleteOne()` 删除数据表中的单条记录
- `db.collection.deleteMany()`  删除数据表中的多条记录
- `db.collection.findOne()`	执行查询并返回单条记录
- `db.collection.findOneAndDelete()`	查找单条记录并将其删除
- `db.collection.findOneAndReplace()`	查找单条记录并将其替换
- `db.collection.findOneAndUpdate()`	查找单条记录并进行更新
- `db.collection.insert()`	在数据表中创建一个新记录
- `db.collection.insertMany()`	在数据表中插入几条新纪录
- `db.collection.renameCollection()`	更改数据表的名称
- `db.collection.update()`	修改数据表中的记录

更多MongoDB的操作以及PyMongo的使用，可以查阅它们的官方文档：[PyMongo Documentation](https://api.mongodb.com/python/current/)&nbsp;&nbsp;&nbsp;&nbsp;[MongoDB Documentation](https://docs.mongodb.com)

# 反爬虫问题

## 反爬虫的方式

### 不返回网页内容或延迟返回时间

这种方式主要使用以下三种方法来反爬虫：

- **通过IP的访问量反爬虫**
  若一个IP在一段时间内访问速度远大于正常人浏览网页的速度，服务端就会实施反爬虫，比如要求输入验证码或是直接禁止该IP访问。
- **通过`session`的访问量反爬虫**
  `session`意为“会话控制”，`session`对象存储特定用户会话的属性及配置。当用户在网页之间跳转时，`session`中的变量将一直存在，所以服务端也可以通过判断`session`的访问量来禁止爬虫。
- **通过User-Agent反爬虫**
  由于Python中`requests`包发送`HTTP`请求的默认`User-Agent`为`python-requests/x.x.x`，服务端可以判断出这种非真正浏览器的`User-Agent`而予以封锁。当然也有在单个`User-Agent`访问量过大时对其进行封锁，但是这个方法很容易影响到其他正常的用户，所以一般不使用。

### 返回非目标网页
其具体表现为返回错误页、空白页以及爬取多页时只返回同一页。

### 设置登录才可查看和验证码

下面介绍处理登录表单和验证码的方法。

#### 发送POST请求登录

打开某博客登录页面，使用BurpSuite抓包，用户名填写`test`，密码填写`a12345`，勾选记住登录信息后提交，在BurpSuite中可以看到`POST`方法传出的参数信息：

![](https://hujiekang.top/images/uploads/big/d3463eb9f3b968e8f252529e79e34e36.png)

从中可以提取出我们想要的参数：用户名的参数为`log`；密码的参数为`pwd`；记住登录信息的参数为`rememberme`，值为`forever`；以及重定向到用户信息的界面等。借此，我们可以构造出一个`POST`数据的字典：

```python
postdata = {
  'pwd': 'a12345',
  'log': 'test',
  'rememberme': 'forever',
  'redirect_to': 'http://www.santostang.com/wp-login/',
  'testcookie': 1
}
```

下面创建一个`session`提交`POST`请求：

```python
import requests
session = requests.session()

url = 'http://www.santostang.com/wp-login.php'
headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/77.0.3865.90 Safari/537.36',
  'Host': 'www.santostang.com',
  'Origin': 'http://www.santostang.com',
  'Referer': 'http://www.santostang.com/wp-login.php'
}

postdata = {
  'pwd': 'a12345',
  'log': 'test',
  'rememberme': 'forever',
  'redirect_to': 'http://www.santostang.com/wp-login/',
  'testcookie': 1
}

login = session.post(url, data = postdata, headers = headers)
print(login.status_code)
```

打印的结果为`200`，说明登录成功。

#### 使用cookies登录

在上面登录成功之后，会在本地产生`cookies`。`cookies`保存有之前登录的信息，所以可以直接通过调用`cookies`来登录。

将上面的代码添加几行，就可以把这次登录信息的`cookies`保存在Python源文件的目录：

```python
import requests
import http.cookiejar   # 导入cookiejar库
session = requests.session()
# 初始化cookies对象，LWP实例化的cookie可直接调用save方法
session.cookies = http.cookiejar.LWPCookieJar("cookie") 

url = 'http://www.santostang.com/wp-login.php'
headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/77.0.3865.90 Safari/537.36',
  'Host': 'www.santostang.com',
  'Origin': 'http://www.santostang.com',
  'Referer': 'http://www.santostang.com/wp-login.php'
}

postdata = {
  'pwd': 'a12345',
  'log': 'test',
  'rememberme': 'forever',
  'redirect_to': 'http://www.santostang.com/wp-login/',
  'testcookie': 1
}

login = session.post(url, data = postdata, headers = headers)
session.cookies.save()   # 保存cookies
```

打开`cookie`文件，内容如下：

![](https://hujiekang.top/images/uploads/big/8b8b3ed31eaa728a060a2dff11d983ec.png)

每一个`cookie`大概会定义4个参数：

`Set-Cookie:`
- `name`：`cookie`的名称，一般被加密
- `expires`：`cookie`过期的时间
- `path`：`cookie`的路径
- `domain`：`cookie`的域名

接下来使用Python中的`cookiejar`包来加载`cookies`：

```python
import requests
import http.cookiejar
session = requests.session()
session.cookies = http.cookiejar.LWPCookieJar("cookie")

try:
  session.cookies.load(ignore_discard = True)
except:
  print("Failed to load cookies.")


url = 'http://www.santostang.com/wp-admin/profile.php'
headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/77.0.3865.90 Safari/537.36',
  'Host': 'www.santostang.com',
  'Origin': 'http://www.santostang.com',
  'Referer': 'http://www.santostang.com/wp-login.php'
}

login = session.post(url, headers = headers)
print(login.status_code)
```

上述代码打印的结果为`200`，说明登录成功。注意，这里请求的不是登录页面，而是登陆后的用户信息页面。

综合来看，就可以利用Python来对这个博客登录页面做一个完整的登录程序了。如果存在`cookies`，则直接使用`cookies`登录；否则使用用户名和密码登录。

代码如下：

```python
import requests
import http.cookiejar
session = requests.session()
session.cookies = http.cookiejar.LWPCookieJar("cookie")

try:
  session.cookies.load(ignore_discard = True)
except:
  print("Failed to load cookies.")

def isLogin():
  url = 'http://www.santostang.com/wp-admin/profile.php'
  login = session.post(url, headers = headers, allow_redirects = False)
  if login.status_code == 200:
    return True
  else:
    return False

def login(user, pwd):
  post_url = 'http://www.santostang.com/wp-login.php'
  postdata = {
    'pwd': 'a12345',
    'log': 'test',
    'rememberme': 'forever',
    'redirect_to': 'http://www.santostang.com/wp-login/',
    'testcookie': 1
  }
  
  try:
    login_p = session.post(post_url, data = postdata, headers = headers)
    print(login_p.status_code)
  except:
    pass
  session.cookies.save()

if __name__ == '__main__':
  headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/77.0.3865.90 Safari/537.36',
    'Host': 'www.santostang.com',
    'Origin': 'http://www.santostang.com',
    'Referer': 'http://www.santostang.com/wp-login.php'
  }

  if isLogin():
    print("Already logged in.")
  else:
    login('test', 'a12345')
```

#### 验证码的处理

处理验证码的原理很简单：通过`requests`获取到网页的源码，之后在源码中找到验证码图片网页链接并将其保存。保存之后有两种处理办法：人工处理和OCR处理。人工处理就是直接打开验证码图片，然后用户输入验证码后登录再继续；OCR则是将图片进行处理后通过OCR引擎识别出文本直接返回给程序。下面主要介绍OCR识别图片的方法。

OCR识别需要用到Python的`pytesseract`包、`pillow`包以及[Tesseract-ocr](https://github.com/tesseract-ocr/tesseract)软件。注意：需要修改源码`pytesseract.py`中的`tesseract_cmd`变量为`tesseract.exe`的路径，否则无法运行。如下图所示：

![](https://hujiekang.top/images/uploads/big/e057966ad35c2e676069c394cc281224.png)

在进行OCR之前，需要对图片进行灰度和阈值化处理，这样可以减少识别字符的干扰，从而提高识别的准确率。

```python
from PIL import Image

im = Image.open('captcha.png')
gr =im.convert('L')
threshold = 80
table = []
for i in range(256):
  if i < threshold:
    table.append(0)
  else:
    table.append(1)
out = gray.point(table,'1')

out.show()
out.save('captcha_OCR.png')
```

处理效果如下：

![](https://hujiekang.top/images/uploads/big/9541ecbab71e58ca27a019a1ccd55b25.png)

接下来就可以使用`pytesseract`来识别出文字了。

```python
from PIL import Image
import pytesseract

th = Image.open('captcha_OCR.png')
print(pytesseract.image_to_string(th))
```

可以看到程序运行的结果和图片内容一致，说明OCR识别正确。

![](https://hujiekang.top/images/uploads/big/096b8b382dacda75ac26022e60fa12e2.png)

当然这种方法只适合背景不是特别复杂、字符的辨识度较高的情况，有些网站的验证码背景会添加很多不同颜色的色块、小点，或是使用辨识度不高的字母来干扰OCR，如`5`和`S`、`o`和`0`、`1`和`I`等情况，这些情况下，还是使用人工辨别正确率会高一些。

## 如何“反反爬虫”

- **修改User-Agent**
  可以使用以下代码来查看使用`requests`发送请求的请求头：

  ```python
  import requests
  r = requests.get('https://www.baidu.com')
  print(r.request.headers)
  ```

  打印结果如下:

  ```python
  {'User-Agent': 'python-requests/2.19.1', 'Accept-Encoding': 'gzip, deflate', 'Accept': '*/*', 'Connection': 'keep-alive'}
  ```

  修改`User-Agent`为正常浏览器的格式，使用一个字典来存储新的请求头信息，然后传入`headers`参数即可。

  ```python
  import requests
  # 自定义请求头
  headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/77.0.3865.90 Safari/537.36'}
  #应用至requests请求
  r = requests.get('https://www.baidu.com',headers = headers)
  print(r.request.headers)
  ```

  打印结果如下:

  ```python
  {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/77.0.3865.90 Safari/537.36', 'Accept-Encoding': 'gzip, deflate', 'Accept': '*/*', 'Connection': 'keep-alive'}
  ```

- **修改爬虫的时间间隔**
  
  使用`time`包里的`time.sleep()`方法可以使程序暂停运行指定时间。

  ```python
  import time
  t1 = time.time()
  time.sleep(5)
  t2 = time.time()
  print(t2-t1,"s")
  ```

  打印的结果为：`5.001166582107544 s`

  为了能更真实的模拟真实用户的操作，不能让这个暂停的时间为一个固定且精确的值，于是可以使用随机数生成的办法来让程序暂停运行一个随机的时间。

  ```python
  import time
  import random

  sleep_time = random.randint(0,5)+random.random()
  print(sleep_time,"s")
  ```

  random包用于提供随机数。上面使用了`random.randint()`方法提供指定范围内的一个随机整数，`random.random()`方法用于生成一个0到1之间的随机数。
  运行5次，结果如下：

  ```python
  0.8260146189603876 s
  4.848380768859137 s
  3.8196842823676893 s
  2.4634772662338826 s
  3.5886359364884477 s
  ```

- **使用代理**
  可以使用代理来让爬虫程序隐藏自己的真实IP：

  ```python
  import requests

  proxies = {'http': 'http://xxx.xxx.xxx.xxx:xxxx'}
  r = requests.get('https://www.baidu.com', proxies = proxies)
  ```

