# Blog
Not only blog. Based on Vue2, Koa2, MongoDB and Redis

前后端分离 + 服务端渲染的博客系统, 前端SPA + 后端RESTful服务器

# Demo
[https://smallpath.me](https://smallpath.me)

# TODO
- [ ] 前台单页
  - [x] 开启H5模式
  - [x] disqus评论
  - [x] vue1.0升级至vue2.0
  - [x] vuex单向数据流
  - [x] server side rendering
  - [x] server side rendering部署文档
  - [x] 使用superagent替换vue-resource 
  - [x] 谷歌统计 
  - [x] 服务端sitemap定时任务
  - [x] rss
  - [x] 组件级缓存
  - [ ] Loading组件 #2 (进行中)
  - [ ] 服务端谷歌统计
  - [ ] 侧边栏图片
- [ ] 后台管理单页
  - [x] 添加升级模型的管理
  - [x] 使用axios替换vue-resource
  - [x] vue 1.0 => vue 2.0
  - [x] 使用element ui
  - [x] 七牛云图片上传
- [ ] RESTful服务器
  - [x] RESTful添加select字段过滤
  - [x] 标签及分类移至文章中 
  - [x] 七牛access_token下发及鉴权
  - [ ] 文章toc
  - [ ] OAuth1升级至OAuth2
- [x] 部署文档
- [x] API文档
- [ ] Docker
- [ ] 单元测试， 集成测试和系统测试用例
- [ ] 前端持续集成测试

# 构建与部署

## 前置

- Node v4
- MongoDB
- Redis

## server

博客的提供RESTful API的后端

修改 conf/config.js:

- `tokenSecret`
    - 改为任意字符串
- `defaultAdminPassword`
    - 默认密码, 必须修改, 否则服务器将拒绝启动

```
npm install
pm2 start entry.js
```

RESTful服务器在本机3000端口开启

## client/front
博客的前台单页, 支持服务端渲染

```
npm install
npm run build
pm2 start production.js
```

请将`logo.png`与`favicon.ico`放至`dist/static`目录中

再用nginx代理本机8080端口即可, 可以使用如下的模板

```
server{
    listen 80;                                      #如果是https, 则替换80为443
    server_name *.smallpath.me smallpath.me;        #替换域名
    root /alidata/www/Blog/client/front/dist;       #替换路径为构建出来的dist路径
    set $node_port 3000;
    set $ssr_port 8080;

    location ^~ / {
        proxy_http_version 1.1;
        proxy_set_header Connection "upgrade";
        proxy_pass http://127.0.0.1:$ssr_port;
        proxy_redirect off;
    }

    location ^~ /proxyPrefix/ {
        rewrite ^/proxyPrefix/(.*) /$1 break;
        proxy_http_version 1.1;
        proxy_set_header Connection "upgrade";
        proxy_pass http://127.0.0.1:$node_port;
        proxy_redirect off;
    }

    location ^~ /dist/ {
        rewrite ^/dist/(.*) /$1 break;
        etag         on;
        expires      max;
    }

    location ^~ /static/ {
        etag         on;
        expires      max;
    }
}
```


## client/back
博客的后台管理单页

```
npm install
npm run build
```

用nginx代理构建出来的`dist`文件夹即可, 可以使用如下的模板

```
server{
    listen 80;                                      #如果是https, 则替换80为443
    server_name admin.smallpath.me;                 #替换域名
    root /alidata/www/Blog/client/front/dist;       #替换路径为构建出来的dist路径
    set $node_port 3000;

    index index.js index.html index.htm;

    location / {
        try_files $uri $uri/ @rewrites;
    }

    location @rewrites {
        rewrite ^(.*)$ / last;
    }

    location ^~ /proxyPrefix/ {
        rewrite ^/proxyPrefix/(.*) /$1 break;
        proxy_http_version 1.1;
        proxy_set_header Connection "upgrade";
        proxy_pass http://127.0.0.1:$node_port;
        proxy_redirect off;
    }

    location ^~ /static/ {
        etag         on;
        expires      max;
    }
}
```

# 后端RESTful API

## 说明

后端服务器默认开启在3000端口, 如不愿意暴露IP, 可以自行设置nginx代理, 或者直接使用前端两个单页的代理前缀`/proxyPrefix`

例如, demo的API根目录如下:

> https://smallpath.me/proxyPrefix/api/:modelName/:id

其中, `:modelName`为模型名, 总计如下7个模型

```
post
menu
tag
category
option
user
version
```

`:id`为指定的文档ID, 用以对指定文档进行CRUD

## HTTP动词

支持如下五种:

```
GET     //查询
POST    //新建
PUT     //替换
PATCH   //更新部分属性
DELETE  //删除指定ID的文档
```

有如下两个规定:

- 对所有请求
  - header中必须将`Content-Type`设置为`application/json`, 需要`body`的则`body`必须是合法JSON格式
- 对所有回应
  - header中的`Content-Type`均为`application/json`, 且返回的数据也是JSON格式

## 权限验证

服务器直接允许对`user`模型外的所有模型的GET请求

`user`表的所有请求, 以及其他表的非GET请求, 都必须将header中的`authorization`设置为服务器下发的Token, 服务器验证通过后才会继续执行CRUD操作

### 获得Token
> POST https://smallpath.me/proxyPrefix/admin/login

`body`格式如下:

```
{
	"name": "admin",
	"password": "testpassword"
}
```

成功, 则返回带有`token`字段的JSON数据
```
{
  "status": "success",
  "token": "tokenExample"
}
```

失败, 则返回如下格式的JSON数据:
```
{
  "status": "fail",
  "description": "Get token failed. Check name and password"
}
```

获取到`token`后, 在上述需要token验证的请求中, 请将header中的`authorization`设置为服务器下发的Token, 否则请求将被服务器拒绝

### 撤销Token
> POST https://smallpath.me/proxyPrefix/admin/logout

将`header`中的`authorization`设置为服务器下发的token, 即可撤销此token

### Token说明
Token有效期为获得后的一小时, 超出时间后请重新请求Token

## 查询 

服务器直接允许对`user`模型外的所有模型的GET请求, 不需要验证Token

为了直接通过URI来进行mongoDB查询, 后台提供六种关键字的查询:
```
conditions,
select,
count,
sort,
skip,
limit
```

### conditions查询
类型为JSON, 被解析为对象后, 直接将其作为`mongoose.find`的查询条件

#### 查询所有文档
> GET https://smallpath.me/proxyPrefix/api/post

#### 查询title字段为'关于'的文档
> GET https://smallpath.me/proxyPrefix/api/post?conditions={"title":"关于"}

#### 查询指定id的文档的上一篇文档
> GET https://smallpath.me/proxyPrefix/api/post/?conditions={"_id":{"$lt":"580b3ff504f59b4cc27845f0"}}&sort=1&limit=1

#### select查询
类型为JSON, 用以拾取每条数据所需要的属性名, 以过滤输出来加快响应速度

#### 查询title字段为'关于'的文档的建立时间和更新时间
> GET https://smallpath.me/proxyPrefix/api/post?conditions={"title":"关于"}&select={"createdAt":1,"updatedAt":1}

### count查询
获得查询结果的数量

#### 查询文档的数量
> GET https://smallpath.me/proxyPrefix/api/post?conditions={"type":0}&count=1

### sort查询
为了查询方便, sort=1代表按时间倒序, 不使用sort则代表按时间正序

#### 查询所有文档并按时间倒序
> GET https://smallpath.me/proxyPrefix/api/post?sort=1

### skip查询和limit查询

#### 查询第2页的文档(每页10条)并按时间倒叙
> GET https://smallpath.me/proxyPrefix/api/post?limit=10&skip=10&sort=1


## 新建

需要验证Token

> POST https://smallpath.me/proxyPrefix/api/:modelName

Body中为用来新建文档的JSON数据

每个模型的具体字段, 可以查看该模型的[Schema定义](https://github.com/smallpath/blog/blob/develop/server/model/mongo.js#L24)来获得

## 替换

需要验证Token

> PUT https://smallpath.me/proxyPrefix/api/:modelName/:id

`:id`为查询到的文档的`_id`属性, Body中为用来替换该文档的JSON数据

## 更新

需要验证Token

> PATCH https://smallpath.me/proxyPrefix/api/:modelName/:id

`:id`为查询到的文档的`_id`属性, Body中为用来更新该文档的JSON数据

更新操作请使用`PATCH`而不是`PUT`

## 删除

需要验证Token

> DELETE https://smallpath.me/proxyPrefix/api/:modelName/:id

删除指定ID的文档

## vue-resource说明

vue-resource会将请求的URL进行格式化, 不允许URL中的JSON查询, 比如下面这种:

> GET https://smallpath.me/proxyPrefix/api/post?conditions={"title":"关于"}

会被`URI TEMPLATE`为:

> GET https://smallpath.me/proxyPrefix/api/post?conditions[title]=关于

后端会将其`conditions`解析为空对象. 

除此之外, vue-resource目前尚未支持vue2的服务端渲染, 因此不建议使用vue-resource.  
可以使用同时支持客户端和服务端的superagent作为代替

