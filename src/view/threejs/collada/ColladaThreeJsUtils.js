
define([
        "lib/three",
        "core/framework/Tundra",
        "view/threejs/collada/WebTundraColladaWrapper"
], function(THREE, Tundra, WebTundraColladaWrapper) {

var ColladaThreeJsUtils =
{
    loadKeyFrameAnimations: function(animations)
    {
        var keyframeHandler = new WebTundraColladaWrapper.KeyFrameAnimationHandler();
        keyframeHandler.load(animations);
        return { "__keyframe_animation__" : keyframeHandler };
    },

    loadAnimations : function(animations)
    {
        var result = {};
        var posCache = new THREE.Vector3();
        var quatCache = new THREE.Quaternion();
        var scaleCache = new THREE.Vector3();

        for (var i = 0, iLen = animations.length; i < iLen; ++i)
        {
            var animation = animations[i];
            var animationData = THREE.AnimationHandler.init(animation);
            var hierarchy = THREE.AnimationHandler.parse(animation.node);
            var hierarchyData = animationData.hierarchy;
            var tracks = [];

            for (var j = 0, jLen = hierarchyData.length; j < jLen; ++j)
            {
                var threejsNode = hierarchy[j];
                var positionKeys = [];
                var quaternionKeys = [];
                var times = [];

                var keys = hierarchyData[j].keys,
                    sids = hierarchyData[j].sids,
                    node = hierarchyData[j].node;

                if (!keys || keys.length < 1 || !sids || sids.length < 1)
                    continue;

                posCache.copy(threejsNode.position);
                quatCache.copy(threejsNode.quaternion);
                scaleCache.copy(threejsNode.scale);

                for (var k = 0, kLen = keys.length; k < kLen; ++k)
                {
                    this.getTransformForSids(sids, keys, k, posCache, quatCache, scaleCache);
                    positionKeys.push(posCache.x, posCache.y, posCache.z);
                    quaternionKeys.push(quatCache.x, quatCache.y, quatCache.z, quatCache.w);
                    times.push(keys[k].time);
                }

                var path = this.getPathForNode(threejsNode);
                tracks.push(new THREE.VectorKeyframeTrack(path + "position", times, positionKeys));
                tracks.push(new THREE.QuaternionKeyframeTrack(path + "quaternion", times, quaternionKeys));
            }

            result[animation.name] = new THREE.AnimationClip(animation.name, animation.length, tracks);
        }

        return result;
    },

    getNextKeyWith : function(sid, key, keys)
    {
        key = key % keys.length;
        for (; key < keys.length; ++key)
        {
            if (keys[key].hasTarget(sid))
                return keys[key];
        }

        return keys[0];
    },

    getPathForNode : function(node)
    {
        var path = [];
        var n = node;
        while (n.parent && n.parent instanceof THREE.Object3D)
        {
            path.push(n.name);
            n = n.parent;
        }

        path.reverse();
        var res = path.join("/") + ".";
        return res;
    },

    getTransformForSids: function(sids, keys, idx, pos, quat, scale)
    {
        for (var i = 0; i < sids.length; ++i)
        {
            var key = this.getNextKeyWith(sids[i], idx, keys);
            var target = this.getTargetForSid(sids[i], key);
            if (!target)
                continue;

            this.extractTarget(target, pos, quat, scale);
        }
    },

    getTargetForSid: function(sid, key)
    {
        for (var i = 0; i < key.targets.length; ++i)
        {
            var target = key.targets[i];
            if (target.sid === sid)
                return target;
        }

        return null;
    },

    getTransformForKey: function(key, pos, quat, scale)
    {
        for (var i = 0, len = key.targets.length; i < len; ++i)
        {
            var target = key.targets[i];
            this.extractTarget(target, pos, quat, scale);
        }
    },

    extractTarget: function(target, pos, quat, scale)
    {
        var type = target.transform.type;
        var member = target.member;

        if (type === "translate" || type === "scale")
        {
            var src = (type === "translate" ? pos : scale);
            switch(member)
            {
            case "X":
                src.x = target.data;
                break;
            case "Y":
                src.y = target.data;
                break;
            case "Z":
                src.z = target.data;
                break;
            default:
                src.x = target.data[0];
                src.y = target.data[1];
                src.z = target.data[2];
                break;
            }
        }
        else if(type === "rotate")
        {
            var rot = new THREE.Quaternion().setFromAxisAngle(target.transform.obj, target.transform.angle);
            quat.multiply(rot);
        }
        else
        {
            console.warn("[ColladaThreeJsUtils]: Key frames do not contain any data! Animation will be garbled");
        }
    },

    loadSkinnedMeshAnimations: function(skinnedMesh)
    {
        var animation = skinnedMesh.geometry.animation;
        var bones = skinnedMesh.skeleton.bones;

        var result = {};
        result[animation.name] = THREE.AnimationClip.parseAnimation(animation, bones);
        return result;
    }
};

return ColladaThreeJsUtils;

});