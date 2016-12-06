# download-client-listener

原生 JS 插件，监听浏览器下载事件的工具，也可单独用于文件下载，提供下载提示和下载完时的回调。

实现原理：前端生成一个唯一的 token，以 get 方式随 url 传给后端。后端将 token 写进 cookie 中，而前端通过定时器获取，然后核对前端生成的 token 和通过 cookie 获取的 token 值是否一致。一致则表示“下载完成”，反之表示“正在下载”。若浏览器未启用 cookie，则会触发 `attempts` 秒后，自动关闭提示。

***

## 使用方法

1. 引入插件包中的 css 和 js 到页面，在 a 标签的 href 中写入文件下载地址。
2. 调用 `downloadClientListener.listen(ele, opt)` 方法。
3. 在文件下载接口，根据传入的 `downloadTokenName` 和 `downloadTokenValue` 更新相应的 cookie 值。

## 示例

1）js 代码：

```javascript
downloadClientListener.listen('.btn_export',{
    'attempts': 30, // 当无cookie时定时几秒后关闭等待信息，默认值为30次，1次/秒
    'tokenName': 'downloadToken', // cookie的属性名，默认值为downloadToken
    'message': '提示信息', // 等待下载时的提示信息，默认值为'文件生成中...若生成时间过长，可稍后回来查看'
    'isDisabledFunc': function () {
                return false;
    }, // 什么情况下禁用插件，true-禁用; false-开启，默认为false
    'param': null, // 添加额外的请求参数对象，比如：{'name': 'wxj', 'age': 18}
    'callback': function(obj) {  // 文件下载完成时的回调函数
        console.log(obj);
    }
});
```

注意：**选择器传入的是`class` 字符串，比如 `.className`**。

2）服务器端设置 cookie，比如 java 代码：

```java
Cookie cookie = new Cookie(downloadTokenName, downloadTokenValue);
cookie.setPath("/");
cookie.setHttpOnly(false);
response.addCookie(cookie);
```