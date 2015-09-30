
define([
    ], function() {
    return {

        query  :  "requirejs=1",
        qQuery : "?requirejs=1",

        load : function (name, req, onload, config) {
            var url = req.toUrl(name);

            var matchPos = url.length-this.qQuery.length;
            if (url.lastIndexOf(this.qQuery) === matchPos)
                url = url.substring(0, matchPos);

            if (url.indexOf("http") === 0)
            {
                var ok = false;
                try
                {
                    if (window.Tundra !== undefined && window.Tundra !== null)
                    {
                        var proxyResolver = window.Tundra.asset.getHttpProxyResolver();
                        if (proxyResolver !== undefined)
                        {
                            ok = true;
                            url = proxyResolver.resolve(url, "Text", "webtundrajs");
                        }
                    }
                }
                catch(e)
                {
                    ok = false;
                    console.error(e);
                    if (e.stack) console.error(e.stack);
                }

                if (!ok)
                    console.error("requirejs webtundrajs loader]: Found http module ref but global Tundra object count not be resolved!");
            }

            $.ajax({
                type        : "GET",
                timeout     : 30000,
                url         : url,
                dataType    : "text",
                success : function(data, textStatus, jqXHR) {
                    try {
                        onload.fromText(data);
                    } catch(e) {
                        console.error("RequireJS fromText evaluation failed:");
                        console.error(e.stack);
                    }
                },
                error : function(jqXHR, textStatus, errorThrown) {
                    onload.error("Failed to load require module: " + url);
                }
            });
        },

        normalize : function(name, norm)
        {
            if (name.toLowerCase().indexOf(".webtundrajs") === -1)
                name += ".webtundrajs";
            else
            {
                name += (name.indexOf('?') < 0)? '?' : '&';
                name += this.query;
            }
            return name;
        }
    };
});