/**
    webtundra.js plugin for jsdoc
    Handles the following tags:
        - ec_declare            - Declaration of EC class
        - ec_implements         - Implementation of an EC class (such as ThreeJs implementation)
        - ec_attribute          - Declaration of attribute
        - subscribes            - Convenient tag to document usage of event subscription functions
    @author Adminotech Ltd.
*/

var logger = require('jsdoc/util/logger');
var baseClass = "";
var doclets = {};

function ecImplementsIndexOf(doclet)
{
    if (!Array.isArray(doclet.tags))
        return -1;

    for (var i = 0; i < doclet.tags.length; ++i)
    {
        if (doclet.tags[i].originalTitle === "ec_implements")
            return i;
    }

    return -1;
}

function handleECImplements(doclet, tagIndex)
{
    var memberof = doclet.memberof;
    if (doclet.longname !== (memberof + "#__init__"))
        return;

    doclets[memberof] = doclet.tags[tagIndex].value;
}

function checkAndChangeMember(doclet)
{
    if (doclet.undocumented === true)
        return false;

    var memberof = doclet.memberof;
    if (!doclets[memberof])
        return false;

    doclet.setMemberof(doclets[memberof]);
    return true;
}

exports.handlers = {
    newDoclet : function(e)
    {
        var index = ecImplementsIndexOf(e.doclet);
        if (index !== -1)
        {
            handleECImplements(e.doclet, index);
            return;
        }

        if (checkAndChangeMember(e.doclet))
            return;

        if (e.doclet.kind === "class")
        {
            if (e.doclet.meta.filename.indexOf("EC_") === 0)
                baseClass = e.doclet.name;
            else
                baseClass = "";
        }
    }
}

exports.defineTags = function(dictionary) {

    dictionary.defineTag('ec_declare', {
        onTagged: function(doclet, tag)
        {
            doclet.addTag("kind", "class");
            doclet.addTag("private");
            doclet.addTag("constructs");
            doclet.addTag("extends", "IComponent");

            if (!doclet.description)
                doclet.description = "";

            doclet.description += "<br>" + [
                "This base implementation declares the static attribute structure of the component in the Tundra protocol.<br>",
                "Should you create your own functionality, provide the implementation by extending this class.",
                "<b>Important: Do not instantiate this class directly. To create a component, use {@link Scene#createEntity} or {@link Entity#createComponent}.</b>"
            ].join("<br>");
        }
    });

    dictionary.defineTag('ec_attribute', {
        canHaveType: true,
        canHaveName: true,
        mustHaveValue: true,
        onTagged: function(doclet, tag)
        {
            if (baseClass == "")
            {
                logger.warn("[Docs]: ec_attribute tag found outside EC_ declaration!");
                return;
            }

            doclet.scope = "instance";
            var varValue = "{" + tag.value.type.names.join("|") + "} " + tag.value.name;
            doclet.addTag('var', varValue);
            doclet.addTag('default', tag.value.description);
            doclet.addTag('memberof', baseClass + "#");

            if (!doclet.description)
                doclet.description = "";

            doclet.description += "<br>" + [
                "An {@link Attribute} declared with {@link IComponent#declareAttribute}. \
                You can access it directly from an {@link IComponent} instance (for example <code>component." + tag.value.name + "</code>)"
            ].join("<br>") + "<br>";
        }
    });

    dictionary.defineTag('subscribes', {
        onTagged: function(doclet, tag)
        {
            doclet.addTag("param", "{object} context Context of in which the <code>callback</code> function is executed. Can be <code>null</code>.");
            doclet.addTag("param", "{function} callback Function to be called.");
            doclet.addTag("return", "{EventSubscription|null} - Subscription data or <code>null</code>");

            if (!doclet.description)
                doclet.description = "";
            doclet.description += "<br>" + [
                "See {@link EventAPI#unsubscribe} on how to unsubscribe from this event."
            ].join("<br>")
        }
    });

    // dictionary.defineTag('ec_implements');
};
