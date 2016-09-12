
define([
        "lib/classy",
        "core/math/Transform"
    ], function(Class, Transform) {

/**
    @class TransformInterpolator
*/
var TransformInterpolator = Class.$extend(
{
    __init__ : function()
    {
        this.jobs = [];
        this.serverUpdateInterval = (1.0 / 20.0);
        this.enabled = true;
        this.transformCache = [];

        this.tempTransform = new Transform();
        this.rotation =
        {
            q1 : new THREE.Quaternion(),
            q2 : new THREE.Quaternion()
        };

        Tundra.frame.onUpdate(this, this.onUpdate);
    },

    update : function(entity, placeable, sceneNode, attribute)
    {
        if (!attribute.interpolation.previous || entity.local || placeable.local || !this.enabled)
        {
            Tundra.client.renderer.updateSceneNode(sceneNode, attribute.interpolation.current);
            return;
        }

        var duration = this.serverUpdateInterval;
        var previous = this.end(entity, placeable);

        // Do full update on initial update. If the object is moving
        // more than once inside a timeframe the interpolation will kick in.
        if (previous === undefined)
            Tundra.client.renderer.updateSceneNode(sceneNode, attribute.interpolation.current);
        else
            duration = 0.5 * previous.duration +  0.5 * (0.001 * (performance.now() - previous.timeStart));

        // @todo Optimize this not to new up so much!
        var interpolation =
        {
            target    : placeable,
            start     : this.getTransform(),
            end       : this.getTransform(),
            timeStart : performance.now(),
            time      : (previous !== undefined ? 0.0 : duration + 0.0001),
            duration  : duration
        };

        interpolation.start.copy(attribute.interpolation.previous);
        interpolation.end.copy(attribute.interpolation.current);

        this.jobs.push(interpolation);
    },

    getTransform : function()
    {
        if (this.transformCache.length > 0)
            return this.transformCache.splice(0,1)[0];
        return new Transform();
    },

    _freeTransform : function(job)
    {
        if (this.transformCache.length <= 98 && job.end && job.start)
        {
            this.transformCache.push(job.end);
            this.transformCache.push(job.start);
        }
    },

    end : function(entity, placeable)
    {
        for (var i = this.jobs.length - 1; i >= 0; i--)
        {
            var job = this.jobs[i];
            if (!job.target || !job.target.parentEntity)
            {
                this._freeTransform(job);
                this.jobs.splice(i,1)
                continue;
            }
            if (job.target.parentEntity.id === entity.id && job.target.id === placeable.id)
            {
                this._freeTransform(job);
                return this.jobs.splice(i,1)[0];
            }
        }
        return undefined;
    },

    onUpdate : function(frametime)
    {
        for (var i = this.jobs.length - 1; i >= 0; i--)
        {
            var job = this.jobs[i];

            if (job.time < job.duration)
            {
                job.time += frametime;

                // [0,1]
                var t = (job.time / job.duration);
                if (t > 1) t = 1;

                // @todo Optimize this so that pos, scale and rot are only interpolated if
                // start and end values are not equal (check with MathUtils)

                // Skip property getters with _ for max perf
                this.tempTransform._pos.copy(job.start._pos).lerp(job.end._pos, t);
                this.tempTransform._scale.copy(job.start._scale).lerp(job.end._scale, t);

                // User Quaternion.slerp for rotation
                job.start.orientation(this.rotation.q1);
                job.end.orientation(this.rotation.q2);

                this.rotation.q1.slerp(this.rotation.q2, t);
                this.tempTransform.setRotation(this.rotation.q1);

                Tundra.client.renderer.updateSceneNode(job.target.sceneNode, this.tempTransform);
            }
            else
            {
                // The job is kep 2x the duration to continue previous movement.
                // See logic in transformChanged.
                job.time += frametime;
                if (job.time >= job.duration * 2)
                {
                    if (this.transformCache.length <= 98)
                    {
                        this.transformCache.push(job.end);
                        this.transformCache.push(job.start);
                    }

                    this.jobs.splice(i,1);
                }
            }
        };
    }
});

return TransformInterpolator;

}); // require js
