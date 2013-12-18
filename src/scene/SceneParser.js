/* jslint browser: true, globalstrict: true, devel: true, debug: true /

// For conditions of distribution and use, see copyright notice in LICENSE

/**
 * @author Toni Dahl
 * @author Erno Kuusela
 *
 */
"use strict";

var SceneParser = function(ecModel) {
    this.ecModel = ecModel;
    this.parser = this.initParser();
};

SceneParser.prototype.initParser = function() {
    var parser, xhttp;

    if (window.DOMParser !== undefined) {
        parser = function(xml) {
            return (new window.DOMParser()).parseFromString(xml, "text/xml");
        };
    } else if (window.ActiveXObject !== undefined &&
               new window.ActiveXObject("Microsoft.XMLDOM")) {
        parser = function(xml) {
            var xmlDoc = new window.ActiveXObject("Microsoft.XMLDOM");
            xmlDoc.async = "false";
            xmlDoc.loadXML(xml);
            return xmlDoc;
        };
    } else {
        throw new Error("No XML parser found");
    }

    
    xhttp = new XMLHttpRequest();

    // Temporarilly loading static xml
    xhttp.overrideMimeType('text/xml');

    // xhttp.open("GET", "scenes/avatar/scene.txml", false);
    // xhttp.open("GET", "scenes/avatar/kaup_11e.txml?123", false);
    // xhttp.open("GET", "scenes/avatar/RttDemoWorld.txml?123", false);
    xhttp.open("GET", "scenes/avatar/kaup_11part.txml?123", false);

    xhttp.send(null);
    parser = xhttp.responseXML;
    // console.log(parser);
    return parser;
};

SceneParser.prototype.parse = function(xml) {
    // console.log("________________________________________" );
    var entities = this.parser.getElementsByTagName("entity"),
    i, j, k, entity, id, components,
    type, attributes, attribute, name, value, ECEnt, ECComp;


    for (i = 0; i < entities.length; i++) {
        entity = entities[i];

        //does not work when the TXML file has overlapping IDs - the entities just won't get created and code borks
        //id = entity.getAttribute("id");
        id = i;

        ECEnt = this.ecModel.createEntity(id, 'notname');
        // console.log("ECEnt: " + ECEnt);
        this.ecModel.addEntity(ECEnt);

        components = entity.getElementsByTagName("component");

        for (j = 0; j < components.length; j++) {
            type = components[j].getAttribute("type");

            attributes = components[j].getElementsByTagName("attribute");

            // debugger;

            ECComp = this.ecModel.createComponent(type);

            for (k = 0; k < attributes.length; k++) {
                attribute = attributes[k];

                name = attribute.getAttribute("name");
                value = attribute.getAttribute("value");

                if (name.toLowerCase() === 'transform') {
                    value = value.split(',');
                    // console.log("name: " + name);
                    // console.log("value: " + value);
                }

                ECComp.updateAttribute(k, value, name);
            }

            try {
                // debugger;
                ECEnt.addComponent(ECComp, j);
                // console.log("success: " + type);
            } catch (e) {
                // console.log("fail: " + type);
                // console.log(e.fileName);
                // console.log(e.lineNumber);

            }

        }
    }

    return this.ecModel;
};

