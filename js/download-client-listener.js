/**
 * ---------------------------
 * 原生JS插件，监听浏览器下载事件的工具，也可单独用于文件下载，提供下载提示和下载完时的回调。
 * ---------------------------
 * 实现原理：前端生成一个唯一的token，以get方式随url传给后端。后端将token写进cookie中，而前端通过定时器获取，然后核对前端生成的token和通过cookie获取的token值是否一致。一致则表示“下载完成”，反之表示“正在下载”。若浏览器未启用cookie，则会触发“attempts”秒后，自动关闭提示。
 * ---------------------------
 * 使用方法：
 * 1、引入插件包中的css和js到页面，在a标签的href中写入文件下载地址。
 * 2、调用downloadClientListener.listen(ele, opt)方法。
 * 3、在文件下载接口，根据传入的“downloadTokenName”和“downloadTokenValue”更新相应的cookie值。
 * 比如java代码：
 * >>>>>>>>>>>>>>>>>>>>>>>>>>>
 * Cookie cookie = new Cookie(downloadTokenName, downloadTokenValue);
 * cookie.setPath("/");
 * cookie.setHttpOnly(false);
 * response.addCookie(cookie);
 * <<<<<<<<<<<<<<<<<<<<<<<<<<<
 */
;(function (window, document, undefined) {

    var Client = function (ele, opt) {
        this.options = {};
        this.nodeList = document.querySelectorAll(ele);
        this.defaluts = {
            'attempts': 30, // 当无cookie时定时几秒后关闭等待信息
            'tokenName': 'downloadToken', // cookie的属性名
            'message': '文件生成中...若生成时间过长，可稍后回来查看', // 等待下载时的提示信息
            'isDisabledFunc': function () {
                return false;
            }, // 什么情况下禁用插件，true-禁用; false-开启，默认为false
            'param': null, // 添加额外的请求参数对象，比如：{'name': 'wxj', 'age': 18}
            'callback': null // 文件下载完成时的回调函数
        };
        // 没有参数传入，直接返回默认参数
        if (!opt) {
            this.options = this.defaluts;
        } else {
            // 有参数传入，通过key将options的值更新为用户的值
            for (var key in this.defaluts) {
                if (this.defaluts.hasOwnProperty(key)) {
                    this.options[key] = this.defaluts[key];
                }
            }
            for (var key in opt) {
                if (opt.hasOwnProperty(key)) {
                    this.options[key] = opt[key];
                }
            }
        }
    };

    Client.prototype.getCookie = function (name) {
        var parts = document.cookie.split(name + '=');
        if (parts.length === 2) {
            return parts.pop().split(';').shift();
        }
    };

    Client.prototype.expireCookie = function (cName) {
        document.cookie = encodeURIComponent(cName + '=deleted; expires=' + new Date(0).toUTCString());
    };

    Client.prototype.setMask = function (isDisable) {
        if (isDisable) {
            var newDivNode = document.createElement('div');
            newDivNode.id = 'down-loading';
            var newSpanNode = document.createElement('span');
            newSpanNode.className = 'down-loading-msg';
            newSpanNode.appendChild(document.createTextNode(this.options.message));
            newDivNode.appendChild(newSpanNode);

            document.body.insertBefore(newDivNode, document.body.firstChild);
        } else if (document.getElementById('down-loading')) {
            document.getElementById('down-loading').remove();
        }
    };

    Client.prototype.updateQueryStringParameter = function (uri, key, value) {
        var re = new RegExp('([?&])' + key + '=.*?(&|$)', 'i');
        var separator = uri.indexOf('?') !== -1 ? '&' : '?';
        if (uri.match(re)) {
            return uri.replace(re, '$1' + key + '=' + value + '$2');
        } else {
            return uri + separator + key + '=' + value;
        }
    };

    Client.prototype.setFormToken = function (tokenName) {
        var downloadToken = new Date().getTime();
        for (var i = 0; i < this.nodeList.length; ++i) {
            var href = this.nodeList[i].href;
            if (href) {
                href = this.updateQueryStringParameter(href, 'downloadTokenName', tokenName);
                href = this.updateQueryStringParameter(href, 'downloadTokenValue', downloadToken);
            }
            this.nodeList[i].href = href;
        }
        return downloadToken + '';
    };

    Client.prototype.callback = function () {
        if (typeof this.options.callback === 'function') {
            this.options.callback(this);
        }
    };

    Client.prototype.unblockSubmit = function (downloadTimer, tokenName) {
        this.setMask(false);
        window.clearInterval(downloadTimer);
        this.expireCookie(tokenName);
        this.callback();
    };

    Client.prototype.isDisabledFunc = function () {
        if (typeof this.options.isDisabledFunc === 'function') {
            return this.options.isDisabledFunc(this);
        }
    };

    Client.prototype.param = function () {
        var param = this.options['param'];
        if (param !== null && typeof param === 'object') {
            for (var i = 0; i < this.nodeList.length; ++i) {
                var href = this.nodeList[i].href;
                if (href) {
                    for (var name in param) {
                        if (param.hasOwnProperty(name)) {
                            href = this.updateQueryStringParameter(href, name, param[name]);
                        }
                    }
                }
                this.nodeList[i].href = href;
            }
        }
    };

    var api = {
        /**
         * 启动监听器
         * @param ele class字符串，比如".className"
         * @param opt 配置项
         * {
         *  'attempts': int(当无cookie时定时几秒后关闭等待信息),
            'tokenName': string(cookie的属性名),
            'message': string(等待下载时的提示信息),
            'isDisabledFunc': function(什么情况下禁用插件，true-禁用; false-开启，默认为false),
            'param': object(添加额外的请求参数对象，比如：{'name': 'wxj', 'age': 18}),
            'callback': function(文件下载完成时的回调函数)
            }
         * @returns {api}
         */
        listen: function (ele, opt) {
            var that = this;
            var client = new Client(ele, opt);

            var options = client.options;
            // 初始化一个cookie
            document.cookie = options.tokenName + '=0; path=/;';

            var clientFunction = function () {
                client.param();
                var downloadToken = client.setFormToken(options.tokenName);
                client.setMask(true);

                var downloadTimer = window.setInterval(function () {
                    var token = client.getCookie(options.tokenName);

                    if ((token === downloadToken) || (!token && options.attempts === 0)) {
                        client.unblockSubmit(downloadTimer, options.tokenName);
                    }

                    options.attempts--;
                }, 1000);
            };

            if (client.isDisabledFunc()) {
                for (var i = 0; i < client.nodeList.length; ++i) {
                    client.nodeList[i].onclick = function () {
                        return false;
                    };
                }
            } else {
                for (var i = 0; i < client.nodeList.length; ++i) {
                    client.nodeList[i].onclick = clientFunction;
                }
            }
            return that;
        }

    };

    this.downloadClientListener = api;
})(window, document);