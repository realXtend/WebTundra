
define([
        "lib/classy",
        "lib/three",
        "core/framework/CoreStringUtils",
        "core/asset/IAsset",
        "core/math/Transform"
    ], function(Class, THREE, CoreStringUtils, IAsset, Transform) {

/// @todo Find a better place for AvatarAttachement? Now can only be instantiated inside AvatarDescAsset.
var AvatarAttachement = Class.$extend(
/** @lends AvatarAttachement.prototype */
{
    /**
        @constructs
        @param {AvatarAttachement} source to clone from.
    */
    __init__ : function(src)
    {
        this.parentRef = (typeof src === "string" ? src : "");
        /**
            Base URL for relative asset references.
            @property baseRef
            @type String
        */
        this.baseRef = (this.parentRef.indexOf("/") != 0 ? this.parentRef.substring(0, this.parentRef.lastIndexOf("/")+1) : "");
        if (this.parentRef.indexOf(".zip#") != -1)
            this.baseRef = this.parentRef.substring(0, this.parentRef.lastIndexOf(".zip#")+5);
        /**
            @property name
            @type String
        */
        this.name     = "";
        /**
            @property category
            @type String
        */
        this.category = "";
        /**
            Contains keys 'mesh' String and 'materials' Array<String>.
            @property assets
            @type Object
        */
        this.assets =
        {
            mesh        : "",
            materials   : []
        };
        /**
            Transform offset, rotation and scale read from <avatar><bone/></avatar>.
            This transform as offsetting the attachement if boneName is not defined
            and the attachement is parented to the avatar/skeleton root.

            @property transform
            @type Transform
        */
        this.transform = new Transform();
        /**
            @property boneName
            @type String
        */
        this.boneName = "";
        /**
            @property linkSkeleton
            @type Boolean
        */
        this.linkSkeleton = false;
        /**
            @property verticesToHide
            @type Array<Number>
        */
        this.verticesToHide = [];

        // Internal
        this._completed =
        {
            all            : false,
            failed         : false,
            mesh           : undefined,
            meshAsset      : undefined,
            materials      : [],
            materialAssets : []
        };
        this._assetsRequested = false;
        this._cbContext = null;
        this._cbFunc    = null;

        if (src instanceof AvatarAttachement)
            this.cloneFrom(src);
    },

    clone : function()
    {
        return new AvatarAttachement(this);
    },

    cloneFrom : function(src)
    {
        this.parentRef          = src.parentRef;
        this.baseRef            = src.baseRef;

        this.name               = src.name;
        this.category           = this.category;

        this.assets.mesh        = src.assets.mesh;
        this.assets.materials   = [].concat(src.assets.materials);

        this.transform          = src.transform.clone();
        this.boneName           = src.boneName;
        this.linkSkeleton       = src.linkSkeleton;

        this.verticesToHide     = [].concat(src.verticesToHide);
    },

    validate : function()
    {
        if (this.boneName.toLowerCase() === "none")
            this.boneName = "";

        if (this.assets.mesh !== "" && !CoreStringUtils.startsWith(this.assets.mesh, "http", true))
            this.assets.mesh = this.baseRef + this.assets.mesh;

        for (var i = 0; i < this.assets.materials.length; i++)
        {
            var materialRef = this.assets.materials[i];
            if (materialRef !== "" && !CoreStringUtils.startsWith(materialRef, "http", true))
                this.assets.materials[i] = this.baseRef + materialRef;
        };
    },

    /**
        Returns if all asset transfer have completed. See also isCompleted.
    */
    isCompleted : function()
    {
        return this._completed.all;
    },

    /**
        Returns if all assets have been loaded successfully.
    */
    isLoaded : function()
    {
        return (this.isCompleted() && this._completed.failed === false);
    },

    /**
        Hook to completed signal. This callback will be called also when any sub asset requests
        fail. In the common case this means you should not instantiate this attachement.

        Note: If already completed, the callback will be invoked immediately.

        @example
        * attachement.onCompleted(this, function(succeeded, attachement) {
        *     console.log("Attachement", attachement.name, succeeded);
        *     if (succeeded)
        *         attachToSomething(attachement);
        * });

        @param {Object} context Context of in which the <code>callback</code> function is executed. Can be <code>null</code>.
        @param {Function} callback Function to be called.
    */
    onCompleted : function(context, func)
    {
        if (context == null && func == null)
            return;

        this._cbContext = (context !== null && context !== undefined ? context : null);
        this._cbFunc = (typeof context === "function" && typeof func !== "function" ? context : func);

        // Invoke the callback immediately if already completed
        if (this._completed.all === true && typeof this._cbFunc === "function")
        {
            // If context was not provided use this AvatarDescAsset as the context.
            this._cbFunc.call((this._cbContext !== undefined && this._cbContext !== null ? this._cbContext : this),
                this._completed.failed, this);
        }
    },

    /**
        Request assets. This must be called for onCompleted to fire, no matter if the assets are already loaded to AssetAPI or not.
    */
    requestAssets : function(context, func)
    {
        this.onCompleted(context, func);

        if (this._assetsRequested)
            return;
        this._assetsRequested = true;

        // Mesh
        if (this.assets.mesh !== "")
        {
            var transfer = Tundra.asset.requestAsset(this.assets.mesh);
            if (transfer != null)
            {
                transfer.onCompleted(this, this._onTransferCompleted);
                transfer.onFailed(this, this._onTransferFailed);
            }
        }

        // Materials
        for (var ami = 0; ami < this.assets.materials.length; ami++)
        {
            var ref = this.assets.materials[ami];
            if (ref !== "")
            {
                var transfer = Tundra.asset.requestAsset(ref);
                if (transfer != null)
                {
                    transfer.onCompleted(this, this._onTransferCompleted);
                    transfer.onFailed(this, this._onTransferFailed);
                }
            }
        }
    },

    markAssetCompleted : function(ref, success)
    {
        var allCompleted = true;

        /* @todo This originalName() is convoluted due to how AssetAPI names the cloned assets
           EC_Mesh handles this correctly, but as we are not using components here
           we need to handle it manually. */
        var asset = (typeof ref !== "string" ? ref : null);
        if (asset != null)
            ref = asset.originalName();

        if (this.assets.mesh === ref)
        {
            this._completed.meshAsset = asset;
            if (success === false)
                this._completed.failed = true;
        }
        else if (this._completed.meshAsset === undefined)
            allCompleted = false;

        for (var mi = 0; mi < this.assets.materials.length; mi++)
        {
            var materialRef = this.assets.materials[mi];
            if (materialRef === ref)
            {
                this._completed.materialAssets[mi] = asset;
                if (success === false)
                    this._completed.failed = true;
            }
            else if (materialRef !== "" && this._completed.materialAssets[mi] === undefined)
                allCompleted = false;
        }

        if (allCompleted)
        {
            this._completed.all = true;

            // If context was not provided use this AvatarDescAsset as the context.
            if (typeof this._cbFunc === "function")
            {
                this._cbFunc.call((this._cbContext !== undefined && this._cbContext !== null ? this._cbContext : this),
                    this._completed.failed, this);
            }
        }
    },

    _onTransferCompleted : function(asset)
    {
        this.markAssetCompleted(asset, true);
    },

    _onTransferFailed : function(transfer)
    {
        this.markAssetCompleted(transfer.ref, false);
    },

    findMeshParentObject : function(meshAsset, skeletonAsset)
    {
        if (this.boneName === "")
            return (meshAsset != null ? meshAsset.mesh : null);
        else
            return (skeletonAsset != null ? skeletonAsset.getBone(this.boneName) : null);
    },

    attach : function(meshAsset, skeletonAsset)
    {
        var attached = false;

        if (meshAsset == null && skeletonAsset == null)
            return attached;

        if (!this.isCompleted())
        {
            console.error("AvatarAttachement.attach: Transfer not completed yet", this.baseRef);
            return attached;
        }
        // Attachement failed to load all relevant assets, skip loading silently
        // This can be checked by the calling code as well if useful.
        if (!this.isLoaded())
            return attached;

        var attachementMeshAsset = (this.assets.mesh !== "" ? this._completed.meshAsset : null);
        if (attachementMeshAsset != null && attachementMeshAsset.mesh != null && meshAsset != null)
        {
            // Mark our asset as attachements. This may be useful for core and application logic.
            attachementMeshAsset.isAttachement = true;
            attachementMeshAsset.mesh.isAttachement = true;
            for(var mi=0,len=attachementMeshAsset.numSubmeshes(); mi<len; ++mi)
            {
                var submesh = attachementMeshAsset.getSubmesh(mi);
                if (submesh != null)
                    submesh.isAttachement = true;
            }

            // Parent to mesh, apply transform
            if (meshAsset != null && meshAsset.isLoaded())
            {
                var parentObject = this.findMeshParentObject(meshAsset, skeletonAsset);
                if (parentObject != null)
                {
                    if (attachementMeshAsset.parent == null)
                    {
                        parentObject.add(attachementMeshAsset.mesh);
                        this.transform.apply(attachementMeshAsset.mesh);
                    }
                    else if (attachementMeshAsset.parent.name !== parentObject.name)
                    {
                        attachementMeshAsset.parent.remove(attachementMeshAsset.mesh);
                        parentObject.add(attachementMeshAsset.mesh);
                        this.transform.apply(attachementMeshAsset.mesh);
                    }

                    attached = true;
                }
                else
                    console.error("AvatarAttachement.attach: Failed to find parent object with bone='" + this.boneName + "'" (meshAsset != null ? " from " + meshAsset.name : ""));
            }
            else
                console.error("AvatarAttachement.attach: Parent Mesh asset not loaded", this.baseRef);

            // Attach materials
            for(var mi=0,len=attachementMeshAsset.numSubmeshes(); mi<len; ++mi)
            {
                var materialRef = this.assets.materials[mi];
                if (typeof materialRef === "string" && materialRef !== "")
                {
                    var submesh = attachementMeshAsset.getSubmesh(mi);
                    if (submesh != null)
                    {
                        var submeshMaterialAsset = this._completed.materialAssets[mi];
                        if (submeshMaterialAsset != null && submeshMaterialAsset.material != null)
                            if (submesh.material.uuid !== submeshMaterialAsset.material.uuid)
                                submesh.material = submeshMaterialAsset.material;
                    }
                }
            }

            // Link to skeleton. Must be done post material set as linking will modify skinning properties of the Material.
            if (this.linkSkeleton === true)
            {
                if (skeletonAsset != null && skeletonAsset.isLoaded())
                    skeletonAsset.link(attachementMeshAsset);
                else
                    console.error("AvatarAttachement.attach: Linking to avatar skeleton is enabled but skeleton asset is not ready", (skeletonAsset != null ? skeletonAsset.name : ""));
            }
        }
        return attached;
    },

    detach : function()
    {
        /// @todo Implement skeleton unlink

        // Use unload() as it detaches from parent, does not destroy the geometry at them moment, but this might change.
        var attachementMeshAsset = (this.assets.mesh !== "" ? this._completed.meshAsset : null);
        if (attachementMeshAsset != null && attachementMeshAsset.mesh != null && attachementMeshAsset.mesh.parent != null)
            attachementMeshAsset.mesh.parent.remove(attachementMeshAsset.mesh);
    }
});

var AvatarDescAsset = IAsset.$extend(
/** @lends AvatarDescAsset.prototype */
{
    /**
        Represents a realXtend Tundra avatar description asset.
        @extends IAsset
        @constructs
        @param {String} name Unique name of the asset, usually this is the asset reference.
    */
    __init__ : function(name)
    {
        this.$super(name, "AvatarDescAsset");
        this.reset();
    },

    reset : function()
    {
        /**
            Assets map that contains the parsed asset references.
            <pre>{
                mesh        : String,
                skeleton    : String,
                materials   : [ String, ... ]
            }</pre>
            @property assets
            @type Object
        */
        this.assets =
        {
            mesh        : "",
            skeleton    : "",
            materials   : []
        };
        /**
            @property attachements
            @type Array<AvatarAttachement>
        */
        this.attachements = [];
        /**
            @property transform
            @type Transform
        */
        this.transform = new Transform();
    },

    cloneInstance : function()
    {
        var clone =
        {
            assets :
            {
                mesh        : this.assets.mesh,
                skeleton    : this.assets.skeleton,
                materials   : [].concat(this.assets.materials)
            },
            attachements    : [],
            transform       : this.transform.clone()
        };
        for (var ai = 0; ai < this.attachements.length; ai++)
            clone.attachements.push(this.attachements[ai].clone());
        return clone;
    },

    cloneAttachements : function()
    {
        var result = [];
        for (var ai = 0; ai < this.attachements.length; ai++)
            result.push(this.attachements[ai].clone());
        return result;
    },

    isLoaded : function()
    {
        return (this.assets.mesh !== "");
    },

    deserializeFromData : function(data, dataType, transfer)
    {
        this.reset();

        var that = this;
        var xml = $(data).find("avatar");

        // Mesh
        this.assets.mesh = this._readStringAttr(xml.children("base"), "mesh");
        if (this.assets.mesh === "")
        {
            var propElement = xml.children("property");
            propElement.each(function()
            {
                if (that.assets.mesh !== "")
                    return;
                var propName = that._readStringAttr($(this), "name");
                if (propName === "basemesh")
                    that.assets.mesh = that._readStringAttr($(this), "value");
            });
        }

        // Skeleton
        this.assets.skeleton = this._readStringAttr(xml.children("skeleton"), "name");

        // Materials
        this.assets.materials = this._readEach(xml.children("material"), "name");

        // Validate
        this.assets.mesh = this._validateAssetRef(this.assets.mesh, "mesh");
        this.assets.skeleton = this._validateAssetRef(this.assets.skeleton, "skeleton");
        this.assets.materials = this._validateAssetRefList(this.assets.materials, "material", true);

        // Transform
        this._readTransformAttrs(xml.children("transformation"), "position", "rotation", "scale", this.transform);

        var attachmentElement = xml.children("attachment");
        attachmentElement.each(function()
        {
            that.attachements.push(that._readAttachement($(this)));
        });
        return this.isLoaded();
    },

    _validateAssetRef : function(ref, desc)
    {
        if (ref !== "")
        {
            if (!CoreStringUtils.startsWith(ref, "http", true))
                return this.baseRef + ref;
        }
        else
            this.log.warn("Failed to parse", desc, "ref from", this.name);
        return ref;
    },

    _validateAssetRefList : function(refs, desc, allowEmpty)
    {
        if (refs.length === 0)
        {
            this.log.warn("No", desc, "assets declared in", this.name);
            return refs;
        }

        allowEmpty = (typeof allowEmpty === "boolean" ? allowEmpty : true);

        for (var mi = 0; mi < refs.length; mi++)
        {
            var ref = refs[mi];
            if (ref === "")
            {
                if (!allowEmpty)
                    this.log.warn("Empty", desc, "found at index", mi, "from", this.name);
                continue;
            }

            if (!CoreStringUtils.startsWith(ref, "http", true))
                refs[mi] = this.baseRef + ref;
        }
        return refs;
    },

    _readEach : function(nodes, name, type)
    {
        var that = this;
        var result = [];
        nodes.each(function()
        {
            var value = that._readStringAttr($(this), name);
            if (type === "boolean" || type === "bool")
                value = (value === "1" || value === "true" || value === "on");
            else if (type === "int")
                value = parseInt(value);
            else if (type === "float")
                value = parseFloat(value);
            result.push(value);
        });
        return result;
    },

    _readAttachement : function(elem)
    {
        var boneElement = elem.children("avatar").children("bone").first();

        var attachement              = new AvatarAttachement(this.name);
        attachement.name             = this._readStringAttr(elem.children("name"), "value");
        attachement.category         = this._readStringAttr(elem.children("category"), "name");
        attachement.boneName         = this._readStringAttr(boneElement, "name");
        attachement.linkSkeleton     = this._readBoolAttr(elem.children("mesh"), "linkskeleton");
        attachement.assets.mesh      = this._readStringAttr(elem.children("mesh"), "name");
        attachement.assets.materials = this._readEach(elem.children("material"), "name");
        attachement.verticesToHide   = this._readEach(elem.children("avatar").children("avatar_polygon"), "idx", "int");

        this._readTransformAttrs(boneElement, "offset", "rotation", "scale", attachement.transform);

        attachement.validate();
        return attachement;
    },

    _readStringAttr : function(elem, name)
    {
        var value = elem.attr(name);
        return (typeof value === "string" ? value : "");
    },

    _readBoolAttr : function(elem, name, valueIfEmpty)
    {
        var value = this._readStringAttr(elem, name).toLowerCase();
        if (value === "")
            return (typeof valueIfEmpty === "boolean" ? valueIfEmpty : false);
        return (value === "1" || value === "true" || value === "on");
    },

    _readTransformAttrs : function(elem, posName, rotName, scaleName, destTransform)
    {
        this._readTransformComponentAttr(elem, posName, destTransform.pos);
        this._readTransformComponentAttr(elem, rotName, destTransform);
        this._readTransformComponentAttr(elem, scaleName, destTransform.scale);
    },

    _readTransformComponentAttr : function(elem, name, dest)
    {
        var value = elem.attr(name);
        if (typeof value === "string")
        {
            var parts = value.split(" ");
            if (name !== "rotation")
            {
                if (parts.length >= 3)
                {
                    dest.x = parseFloat(parts[0]);
                    dest.y = parseFloat(parts[1]);
                    dest.z = parseFloat(parts[2]);
                }
                else
                    this.log.warn("Transform component '" + name + "' does not have enough data:", value, parts);
            }
            else
            {
                if (parts.length >= 4)
                {
                    var quat = new THREE.Quaternion();
                    quat.w = parseFloat(parts[0]);
                    quat.x = parseFloat(parts[1]);
                    quat.y = parseFloat(parts[2]);
                    quat.z = parseFloat(parts[3]);
                    dest.setRotation(quat);
                }
                else
                    this.log.warn("Transform component '" + name + "' does not have enough data:", value, parts);
            }
        }
    },

    unload : function()
    {
        this.reset();
    },
});

return AvatarDescAsset;

}); // require js
